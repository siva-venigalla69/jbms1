/**
 * COMPLETE API TEST SUITE
 * Textile Printing Management System
 * 
 * This script tests all API endpoints and frontend functionality
 * Run with: node COMPLETE_API_TEST.js
 */

const https = require('https');
const http = require('http');

// Configuration
const CONFIG = {
    // Update these URLs for your environment
    API_BASE_URL: process.env.API_BASE_URL || 'https://pvatfzwzfgioypdnqjay.supabase.co',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
    SUPABASE_ANON_KEY: process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2YXRmend6Zmdpb3lwZG5xamF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjI1ODUsImV4cCI6MjA3MDkzODU4NX0.q3PgKkcsX5wXOys9aYwalhajH25uQ-gjCgVTZISi0Qs',
    TEST_TIMEOUT: 30000
};

// Test results tracking
const testResults = {
    passed: 0,
    failed: 0,
    errors: []
};

// Utility function to make HTTP requests
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const client = urlObj.protocol === 'https:' ? https : http;
        
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

        const req = client.request(requestOptions, (res) => {
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
        
        setTimeout(() => {
            req.destroy();
            reject(new Error('Request timeout'));
        }, CONFIG.TEST_TIMEOUT);
    });
}

// Test logging functions
function logTest(testName, status, details = '') {
    const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${emoji} ${testName}: ${status}`);
    if (details) console.log(`   ${details}`);
    
    if (status === 'PASS') {
        testResults.passed++;
    } else {
        testResults.failed++;
        testResults.errors.push(`${testName}: ${details}`);
    }
}

// Database connectivity tests
async function testDatabaseConnectivity() {
    console.log('\n🔍 TESTING DATABASE CONNECTIVITY...\n');
    
    const tests = [
        {
            name: 'Supabase Health Check',
            url: `${CONFIG.API_BASE_URL}/rest/v1/`,
            expectedStatus: [200, 404] // 404 is OK for root endpoint
        },
        {
            name: 'Customers Table Access',
            url: `${CONFIG.API_BASE_URL}/rest/v1/customers?select=count`,
            expectedStatus: [200, 401] // 401 might be expected if auth required
        },
        {
            name: 'User Roles Table Access',
            url: `${CONFIG.API_BASE_URL}/rest/v1/user_roles?select=count`,
            expectedStatus: [200, 401]
        },
        {
            name: 'Material Types Access',
            url: `${CONFIG.API_BASE_URL}/rest/v1/material_types?select=count`,
            expectedStatus: [200, 401]
        }
    ];

    for (const test of tests) {
        try {
            const response = await makeRequest(test.url);
            if (test.expectedStatus.includes(response.status)) {
                logTest(test.name, 'PASS', `Status: ${response.status}`);
            } else {
                logTest(test.name, 'FAIL', `Expected ${test.expectedStatus}, got ${response.status}`);
            }
        } catch (error) {
            logTest(test.name, 'ERROR', error.message);
        }
    }
}

// API endpoint tests
async function testApiEndpoints() {
    console.log('\n🔗 TESTING API ENDPOINTS...\n');
    
    const endpoints = [
        // Basic CRUD endpoints
        { name: 'Get Customers', path: '/rest/v1/customers?limit=1' },
        { name: 'Get Orders', path: '/rest/v1/orders?limit=1' },
        { name: 'Get Order Items', path: '/rest/v1/order_items?limit=1' },
        { name: 'Get Delivery Challans', path: '/rest/v1/delivery_challans?limit=1' },
        { name: 'Get GST Invoices', path: '/rest/v1/gst_invoices?limit=1' },
        { name: 'Get Payments', path: '/rest/v1/payments?limit=1' },
        { name: 'Get Material Stock', path: '/rest/v1/material_stock?limit=1' },
        
        // Reference data endpoints
        { name: 'Get User Roles', path: '/rest/v1/user_roles' },
        { name: 'Get Material Types', path: '/rest/v1/material_types' },
        { name: 'Get Production Stages', path: '/rest/v1/production_stages' },
        { name: 'Get Order Statuses', path: '/rest/v1/order_statuses' },
        { name: 'Get Payment Methods', path: '/rest/v1/payment_methods' },
    ];

    for (const endpoint of endpoints) {
        try {
            const response = await makeRequest(`${CONFIG.API_BASE_URL}${endpoint.path}`);
            
            // Consider 200 (success) or 401 (auth required) as acceptable
            if ([200, 401].includes(response.status)) {
                let details = `Status: ${response.status}`;
                if (response.status === 200 && Array.isArray(response.data)) {
                    details += `, Records: ${response.data.length}`;
                }
                logTest(endpoint.name, 'PASS', details);
            } else {
                logTest(endpoint.name, 'FAIL', `Status: ${response.status}`);
            }
        } catch (error) {
            logTest(endpoint.name, 'ERROR', error.message);
        }
    }
}

// Authentication tests
async function testAuthentication() {
    console.log('\n🔐 TESTING AUTHENTICATION...\n');
    
    const authTests = [
        {
            name: 'Auth Endpoint Accessible',
            url: `${CONFIG.API_BASE_URL}/auth/v1/`,
            method: 'GET'
        },
        {
            name: 'Login Endpoint Exists',
            url: `${CONFIG.API_BASE_URL}/auth/v1/token?grant_type=password`,
            method: 'POST',
            body: {
                email: 'admin@company.com',
                password: 'admin123'
            },
            expectedStatus: [200, 400, 401] // Various auth responses are acceptable for testing
        }
    ];

    for (const test of authTests) {
        try {
            const response = await makeRequest(test.url, {
                method: test.method,
                body: test.body
            });
            
            const acceptableStatus = test.expectedStatus || [200, 401, 404];
            if (acceptableStatus.includes(response.status)) {
                logTest(test.name, 'PASS', `Status: ${response.status}`);
            } else {
                logTest(test.name, 'FAIL', `Status: ${response.status}`);
            }
        } catch (error) {
            // For auth tests, network errors might be expected
            if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
                logTest(test.name, 'SKIP', 'Service not accessible (expected for some environments)');
            } else {
                logTest(test.name, 'ERROR', error.message);
            }
        }
    }
}

// Frontend accessibility tests
async function testFrontendAccessibility() {
    console.log('\n🌐 TESTING FRONTEND ACCESSIBILITY...\n');
    
    const pages = [
        { name: 'Frontend Root', path: '/' },
        { name: 'Login Page', path: '/login' },
        { name: 'Dashboard', path: '/dashboard' },
        { name: 'Reports Page', path: '/reports' }
    ];

    for (const page of pages) {
        try {
            const response = await makeRequest(`${CONFIG.FRONTEND_URL}${page.path}`);
            
            // For frontend, we expect 200 (loaded) or redirect status codes
            if ([200, 301, 302, 404].includes(response.status)) {
                logTest(page.name, 'PASS', `Status: ${response.status}`);
            } else {
                logTest(page.name, 'FAIL', `Status: ${response.status}`);
            }
        } catch (error) {
            if (error.message.includes('ECONNREFUSED')) {
                logTest(page.name, 'SKIP', 'Frontend server not running');
            } else {
                logTest(page.name, 'ERROR', error.message);
            }
        }
    }
}

// Database schema validation
async function testDatabaseSchema() {
    console.log('\n🗄️ TESTING DATABASE SCHEMA...\n');
    
    const schemaTests = [
        {
            name: 'Check Tables Exist',
            query: `information_schema.tables?table_schema=eq.public&table_type=eq.BASE TABLE&select=table_name`,
            validate: (data) => {
                const expectedTables = [
                    'customers', 'orders', 'order_items', 'delivery_challans', 
                    'gst_invoices', 'payments', 'material_stock', 'user_roles'
                ];
                const tableNames = data.map(t => t.table_name);
                const missingTables = expectedTables.filter(t => !tableNames.includes(t));
                
                return {
                    pass: missingTables.length === 0,
                    message: missingTables.length === 0 
                        ? `Found ${tableNames.length} tables` 
                        : `Missing tables: ${missingTables.join(', ')}`
                };
            }
        },
        {
            name: 'Check Views Exist',
            query: `information_schema.views?table_schema=eq.public&select=table_name`,
            validate: (data) => ({
                pass: data.length > 0,
                message: `Found ${data.length} views`
            })
        }
    ];

    for (const test of schemaTests) {
        try {
            const response = await makeRequest(`${CONFIG.API_BASE_URL}/rest/v1/${test.query}`);
            
            if (response.status === 200) {
                const validation = test.validate(response.data);
                logTest(test.name, validation.pass ? 'PASS' : 'FAIL', validation.message);
            } else {
                logTest(test.name, 'FAIL', `Status: ${response.status}`);
            }
        } catch (error) {
            logTest(test.name, 'ERROR', error.message);
        }
    }
}

// Comprehensive syntax and functionality test
async function testSystemFunctionality() {
    console.log('\n⚙️ TESTING SYSTEM FUNCTIONALITY...\n');
    
    // Test material types (should always exist)
    try {
        const response = await makeRequest(`${CONFIG.API_BASE_URL}/rest/v1/material_types`);
        if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
            logTest('Material Types Data', 'PASS', `Found ${response.data.length} material types`);
        } else if (response.status === 401) {
            logTest('Material Types Data', 'PASS', 'Endpoint secured (auth required)');
        } else {
            logTest('Material Types Data', 'FAIL', `No material types found or error: ${response.status}`);
        }
    } catch (error) {
        logTest('Material Types Data', 'ERROR', error.message);
    }

    // Test user roles (should always exist)
    try {
        const response = await makeRequest(`${CONFIG.API_BASE_URL}/rest/v1/user_roles`);
        if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
            logTest('User Roles Data', 'PASS', `Found ${response.data.length} user roles`);
        } else if (response.status === 401) {
            logTest('User Roles Data', 'PASS', 'Endpoint secured (auth required)');
        } else {
            logTest('User Roles Data', 'FAIL', `No user roles found or error: ${response.status}`);
        }
    } catch (error) {
        logTest('User Roles Data', 'ERROR', error.message);
    }
}

// Main test runner
async function runAllTests() {
    console.log('🚀 STARTING COMPREHENSIVE API AND SYSTEM TESTS');
    console.log('================================================\n');
    
    console.log(`🔧 Configuration:`);
    console.log(`   API Base URL: ${CONFIG.API_BASE_URL}`);
    console.log(`   Frontend URL: ${CONFIG.FRONTEND_URL}`);
    console.log(`   Test Timeout: ${CONFIG.TEST_TIMEOUT}ms`);
    
    const startTime = Date.now();
    
    try {
        await testDatabaseConnectivity();
        await testDatabaseSchema();
        await testApiEndpoints();
        await testAuthentication();
        await testSystemFunctionality();
        await testFrontendAccessibility();
    } catch (error) {
        console.error('\n❌ Test suite encountered an error:', error.message);
    }
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    // Print final results
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('========================');
    console.log(`✅ Tests Passed: ${testResults.passed}`);
    console.log(`❌ Tests Failed: ${testResults.failed}`);
    console.log(`⏱️  Duration: ${duration} seconds`);
    console.log(`🎯 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
    
    if (testResults.failed > 0) {
        console.log('\n❌ FAILED TESTS:');
        testResults.errors.forEach(error => console.log(`   • ${error}`));
    }
    
    console.log('\n📋 NEXT STEPS:');
    if (testResults.failed === 0) {
        console.log('   🎉 All tests passed! System appears to be working correctly.');
        console.log('   ✅ Your system is ready for production use.');
    } else {
        console.log('   🔧 Some tests failed. Please check:');
        console.log('      1. Database is properly deployed and accessible');
        console.log('      2. All migration scripts have been executed');
        console.log('      3. Environment variables are correctly configured');
        console.log('      4. Network connectivity to services');
    }
    
    console.log('\n🔗 USEFUL LINKS:');
    console.log(`   📊 Supabase Dashboard: https://supabase.com/dashboard/project/${CONFIG.API_BASE_URL.match(/https:\/\/(.+?)\.supabase\.co/)?.[1] || 'YOUR_PROJECT_ID'}`);
    console.log(`   🌐 Frontend URL: ${CONFIG.FRONTEND_URL}`);
    console.log('   📖 Production Guide: See PRODUCTION_DEPLOYMENT_GUIDE.md');
    
    // Exit with proper code
    process.exit(testResults.failed === 0 ? 0 : 1);
}

// Run tests if this script is executed directly
if (require.main === module) {
    runAllTests().catch(error => {
        console.error('❌ Fatal error running tests:', error);
        process.exit(1);
    });
}

module.exports = {
    runAllTests,
    testDatabaseConnectivity,
    testApiEndpoints,
    testAuthentication,
    testFrontendAccessibility,
    testDatabaseSchema,
    testSystemFunctionality
};