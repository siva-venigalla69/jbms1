// Customer 409 Error Diagnostic Script
const https = require('https');

const CONFIG = {
    API_BASE_URL: 'https://pvatfzwzfgioypdnqjay.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2YXRmend6Zmdpb3lwZG5xamF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjI1ODUsImV4cCI6MjA3MDkzODU4NX0.q3PgKkcsX5wXOys9aYwalhajH25uQ-gjCgVTZISi0Qs'
};

function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                'apikey': CONFIG.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
                ...options.headers
            }
        };

        const req = https.request(requestOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const jsonData = data ? JSON.parse(data) : {};
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: jsonData
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: data
                    });
                }
            });
        });

        req.on('error', reject);
        
        if (options.body) {
            req.write(JSON.stringify(options.body));
        }
        
        req.end();
    });
}

async function diagnoseProblem() {
    console.log('🔍 DIAGNOSING CUSTOMER 409 ERROR...\n');

    // 1. Check existing customers
    console.log('📊 Checking existing customers...');
    try {
        const response = await makeRequest(`${CONFIG.API_BASE_URL}/rest/v1/customers?select=*`);
        console.log(`✅ Status: ${response.status}`);
        console.log(`📈 Customer Count: ${Array.isArray(response.data) ? response.data.length : 0}`);
        
        if (Array.isArray(response.data) && response.data.length > 0) {
            console.log('🔍 Sample customers:');
            response.data.slice(0, 3).forEach((customer, i) => {
                console.log(`   ${i+1}. Email: ${customer.email}, Phone: ${customer.phone}, Name: ${customer.name}`);
            });
        }
    } catch (error) {
        console.log(`❌ Error checking customers: ${error.message}`);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 2. Try creating a test customer to see the exact error
    console.log('🧪 Testing customer creation...');
    const testCustomer = {
        name: 'Test Customer ' + Date.now(),
        email: `test${Date.now()}@example.com`,
        phone: `+1234567${String(Date.now()).slice(-3)}`,
        address: 'Test Address',
        gst_number: null
    };

    console.log('📝 Attempting to create:', {
        name: testCustomer.name,
        email: testCustomer.email,
        phone: testCustomer.phone
    });

    try {
        const createResponse = await makeRequest(`${CONFIG.API_BASE_URL}/rest/v1/customers`, {
            method: 'POST',
            body: testCustomer
        });

        console.log(`✅ Create Status: ${createResponse.status}`);
        
        if (createResponse.status === 201) {
            console.log('✅ SUCCESS: Customer created successfully');
            console.log('📋 Created customer:', createResponse.data);
        } else if (createResponse.status === 409) {
            console.log('❌ CONFLICT (409): Customer creation failed');
            console.log('📋 Error details:', createResponse.data);
            
            // Check if it's a duplicate constraint issue
            if (typeof response.data === 'object' && response.data.message) {
                console.log('💡 Error message:', createResponse.data.message);
            }
        } else {
            console.log(`❌ Unexpected status: ${createResponse.status}`);
            console.log('📋 Response:', createResponse.data);
        }
    } catch (error) {
        console.log(`❌ Error testing customer creation: ${error.message}`);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 3. Check database constraints
    console.log('🔧 Checking database constraints...');
    try {
        // Try to get table info (may not work due to RLS)
        const schemaResponse = await makeRequest(`${CONFIG.API_BASE_URL}/rest/v1/customers?select=*&limit=0`);
        console.log(`✅ Schema check status: ${schemaResponse.status}`);
    } catch (error) {
        console.log(`❌ Schema check error: ${error.message}`);
    }

    console.log('\n📋 DIAGNOSTIC SUMMARY:');
    console.log('1. If customers exist with duplicate emails/phones, that could cause 409');
    console.log('2. Check database constraints (unique constraints on email/phone)');
    console.log('3. Ensure all required fields are provided');
    console.log('4. Check Row Level Security policies');
    
    console.log('\n🔧 SOLUTIONS:');
    console.log('• Use unique email addresses when creating customers');
    console.log('• Check if customer already exists before creating');
    console.log('• Ensure all required database fields are provided');
    console.log('• Check Supabase RLS policies allow INSERT operations');
}

// Run diagnostic
diagnoseProblem().catch(console.error);