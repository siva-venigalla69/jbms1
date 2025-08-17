#!/usr/bin/env node

/**
 * Comprehensive API Testing Suite for Digital Textile Printing System
 * Tests Supabase API endpoints, authentication, and business logic
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), 'frontend/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables');
    console.error('Make sure frontend/.env.local has NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test results tracking
let testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
};

// Utility functions
function logTest(name, status, message = '') {
    testResults.total++;
    if (status === 'PASS') {
        testResults.passed++;
        console.log(`✅ ${name} - ${message}`);
    } else {
        testResults.failed++;
        console.log(`❌ ${name} - ${message}`);
        testResults.errors.push(`${name}: ${message}`);
    }
}

function logSection(title) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 ${title}`);
    console.log('='.repeat(60));
}

async function testDatabaseConnection() {
    logSection('DATABASE CONNECTION TESTS');
    
    try {
        // Test basic connection
        const { data, error } = await supabase
            .from('user_roles')
            .select('count')
            .limit(1);
        
        if (error) {
            logTest('Database Connection', 'FAIL', `Connection failed: ${error.message}`);
            return false;
        } else {
            logTest('Database Connection', 'PASS', 'Successfully connected to Supabase');
        }

        // Test reference tables exist
        const tables = ['user_roles', 'order_statuses', 'material_types', 'production_stages', 'payment_methods', 'return_reasons'];
        
        for (const table of tables) {
            try {
                const { data, error } = await supabase
                    .from(table)
                    .select('*')
                    .limit(1);
                
                if (error) {
                    logTest(`Table: ${table}`, 'FAIL', error.message);
                } else {
                    logTest(`Table: ${table}`, 'PASS', `Found ${data.length} records`);
                }
            } catch (err) {
                logTest(`Table: ${table}`, 'FAIL', err.message);
            }
        }

        return true;
    } catch (error) {
        logTest('Database Connection', 'FAIL', error.message);
        return false;
    }
}

async function testAuthentication() {
    logSection('AUTHENTICATION TESTS');
    
    try {
        // Test login with admin credentials
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: 'shiva.venigalla@gmail.com',
            password: 'Admin@123!'
        });

        if (authError) {
            logTest('Admin Login', 'FAIL', authError.message);
            return null;
        } else {
            logTest('Admin Login', 'PASS', `Logged in as: ${authData.user.email}`);
        }

        // Test getting current session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
            logTest('Get Session', 'FAIL', sessionError.message);
            return null;
        } else {
            logTest('Get Session', 'PASS', `Session active for: ${sessionData.session?.user.email}`);
        }

        // Test user profile exists
        const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();

        if (profileError) {
            logTest('User Profile', 'FAIL', `Profile not found: ${profileError.message}`);
        } else {
            logTest('User Profile', 'PASS', `Profile found: ${profileData.username} (${profileData.role})`);
        }

        return authData.user;
    } catch (error) {
        logTest('Authentication Error', 'FAIL', error.message);
        return null;
    }
}

async function testReferenceData() {
    logSection('REFERENCE DATA TESTS');
    
    const referenceTests = [
        { table: 'user_roles', expectedMin: 3 },
        { table: 'order_statuses', expectedMin: 4 },
        { table: 'material_types', expectedMin: 5 },
        { table: 'production_stages', expectedMin: 3 },
        { table: 'payment_methods', expectedMin: 4 },
        { table: 'return_reasons', expectedMin: 4 }
    ];

    for (const test of referenceTests) {
        try {
            const { data, error } = await supabase
                .from(test.table)
                .select('*');

            if (error) {
                logTest(`Reference: ${test.table}`, 'FAIL', error.message);
            } else if (data.length < test.expectedMin) {
                logTest(`Reference: ${test.table}`, 'FAIL', `Expected at least ${test.expectedMin} records, found ${data.length}`);
            } else {
                logTest(`Reference: ${test.table}`, 'PASS', `Found ${data.length} records`);
            }
        } catch (error) {
            logTest(`Reference: ${test.table}`, 'FAIL', error.message);
        }
    }
}

async function testCustomerCRUD() {
    logSection('CUSTOMER CRUD TESTS');
    
    try {
        // CREATE - Add new customer
        const newCustomer = {
            name: 'Test Customer API',
            phone: '9999999999',
            email: 'test-api@example.com',
            address: '123 API Test Street',
            gst_number: 'TEST123456789'
        };

        const { data: createdCustomer, error: createError } = await supabase
            .from('customers')
            .insert(newCustomer)
            .select()
            .single();

        if (createError) {
            logTest('Customer CREATE', 'FAIL', createError.message);
            return;
        } else {
            logTest('Customer CREATE', 'PASS', `Created customer: ${createdCustomer.name}`);
        }

        // READ - Get customer
        const { data: readCustomer, error: readError } = await supabase
            .from('customers')
            .select('*')
            .eq('id', createdCustomer.id)
            .single();

        if (readError) {
            logTest('Customer READ', 'FAIL', readError.message);
        } else {
            logTest('Customer READ', 'PASS', `Retrieved customer: ${readCustomer.name}`);
        }

        // UPDATE - Modify customer
        const { data: updatedCustomer, error: updateError } = await supabase
            .from('customers')
            .update({ name: 'Updated Test Customer API' })
            .eq('id', createdCustomer.id)
            .select()
            .single();

        if (updateError) {
            logTest('Customer UPDATE', 'FAIL', updateError.message);
        } else {
            logTest('Customer UPDATE', 'PASS', `Updated customer name to: ${updatedCustomer.name}`);
        }

        // DELETE (soft delete)
        const { data: deletedCustomer, error: deleteError } = await supabase
            .from('customers')
            .update({ is_deleted: true })
            .eq('id', createdCustomer.id)
            .select()
            .single();

        if (deleteError) {
            logTest('Customer DELETE', 'FAIL', deleteError.message);
        } else {
            logTest('Customer DELETE', 'PASS', `Soft deleted customer: ${deletedCustomer.name}`);
        }

        return createdCustomer.id;
    } catch (error) {
        logTest('Customer CRUD Error', 'FAIL', error.message);
        return null;
    }
}

async function testOrderWorkflow() {
    logSection('ORDER WORKFLOW TESTS');
    
    try {
        // First create a customer for testing
        const { data: customer, error: customerError } = await supabase
            .from('customers')
            .insert({
                name: 'Order Test Customer',
                phone: '8888888888',
                email: 'order-test@example.com'
            })
            .select()
            .single();

        if (customerError) {
            logTest('Order Test Customer', 'FAIL', customerError.message);
            return;
        }

        // CREATE - Add new order
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                order_number: `ORD-TEST-${Date.now()}`,
                customer_id: customer.id,
                status: 'pending',
                total_amount: 5000.00,
                notes: 'API Test Order'
            })
            .select()
            .single();

        if (orderError) {
            logTest('Order CREATE', 'FAIL', orderError.message);
            return;
        } else {
            logTest('Order CREATE', 'PASS', `Created order: ${order.order_number}`);
        }

        // Add order items
        const { data: orderItem, error: itemError } = await supabase
            .from('order_items')
            .insert({
                order_id: order.id,
                material_type: 'saree',
                quantity: 5,
                unit_price: 1000.00,
                customization_details: 'Test saree with API design'
            })
            .select()
            .single();

        if (itemError) {
            logTest('Order Item CREATE', 'FAIL', itemError.message);
        } else {
            logTest('Order Item CREATE', 'PASS', `Added item: ${orderItem.material_type} x${orderItem.quantity}`);
        }

        // Update order status
        const { data: updatedOrder, error: statusError } = await supabase
            .from('orders')
            .update({ status: 'in_progress' })
            .eq('id', order.id)
            .select()
            .single();

        if (statusError) {
            logTest('Order Status UPDATE', 'FAIL', statusError.message);
        } else {
            logTest('Order Status UPDATE', 'PASS', `Updated status to: ${updatedOrder.status}`);
        }

        // Test production stage update
        const { data: updatedItem, error: stageError } = await supabase
            .from('order_items')
            .update({ 
                production_stage: 'printing',
                stage_completed_at: new Date().toISOString()
            })
            .eq('id', orderItem.id)
            .select()
            .single();

        if (stageError) {
            logTest('Production Stage UPDATE', 'FAIL', stageError.message);
        } else {
            logTest('Production Stage UPDATE', 'PASS', `Updated stage to: ${updatedItem.production_stage}`);
        }

        return order.id;
    } catch (error) {
        logTest('Order Workflow Error', 'FAIL', error.message);
        return null;
    }
}

async function testReportsAndQueries() {
    logSection('REPORTS AND QUERIES TESTS');
    
    try {
        // Test pending orders query
        const { data: pendingOrders, error: pendingError } = await supabase
            .from('orders')
            .select(`
                *,
                customers (name, phone),
                order_items (material_type, quantity, production_stage)
            `)
            .eq('status', 'pending')
            .eq('is_deleted', false);

        if (pendingError) {
            logTest('Pending Orders Query', 'FAIL', pendingError.message);
        } else {
            logTest('Pending Orders Query', 'PASS', `Found ${pendingOrders.length} pending orders`);
        }

        // Test customer orders summary
        const { data: customerSummary, error: summaryError } = await supabase
            .from('customers')
            .select(`
                name,
                orders (
                    order_number,
                    status,
                    total_amount
                )
            `)
            .eq('is_deleted', false)
            .limit(5);

        if (summaryError) {
            logTest('Customer Summary Query', 'FAIL', summaryError.message);
        } else {
            logTest('Customer Summary Query', 'PASS', `Retrieved summary for ${customerSummary.length} customers`);
        }

        // Test material types usage
        const { data: materialUsage, error: materialError } = await supabase
            .from('order_items')
            .select('material_type, material_types (name)')
            .limit(10);

        if (materialError) {
            logTest('Material Usage Query', 'FAIL', materialError.message);
        } else {
            logTest('Material Usage Query', 'PASS', `Retrieved ${materialUsage.length} material usage records`);
        }

        // Test production status query
        const { data: productionStatus, error: productionError } = await supabase
            .from('order_items')
            .select(`
                production_stage,
                production_stages (name),
                orders (
                    order_number,
                    customers (name)
                )
            `)
            .limit(10);

        if (productionError) {
            logTest('Production Status Query', 'FAIL', productionError.message);
        } else {
            logTest('Production Status Query', 'PASS', `Retrieved ${productionStatus.length} production records`);
        }

    } catch (error) {
        logTest('Reports Query Error', 'FAIL', error.message);
    }
}

async function testRLSPolicies() {
    logSection('ROW LEVEL SECURITY TESTS');
    
    try {
        // Test authenticated access (should work)
        const { data: authData, error: authError } = await supabase
            .from('customers')
            .select('count')
            .limit(1);

        if (authError) {
            logTest('RLS Authenticated Access', 'FAIL', authError.message);
        } else {
            logTest('RLS Authenticated Access', 'PASS', 'Can access data when authenticated');
        }

        // Test reference table access
        const { data: refData, error: refError } = await supabase
            .from('material_types')
            .select('*')
            .limit(1);

        if (refError) {
            logTest('RLS Reference Table Access', 'FAIL', refError.message);
        } else {
            logTest('RLS Reference Table Access', 'PASS', 'Can access reference tables');
        }

        // Test user profile access
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profileData, error: profileError } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', user.id);

            if (profileError) {
                logTest('RLS User Profile Access', 'FAIL', profileError.message);
            } else {
                logTest('RLS User Profile Access', 'PASS', 'Can access own user profile');
            }
        }

    } catch (error) {
        logTest('RLS Test Error', 'FAIL', error.message);
    }
}

async function testAPIPerformance() {
    logSection('API PERFORMANCE TESTS');
    
    try {
        // Test query performance
        const startTime = Date.now();
        
        const { data, error } = await supabase
            .from('customers')
            .select(`
                *,
                orders (
                    *,
                    order_items (*)
                )
            `)
            .limit(10);

        const endTime = Date.now();
        const duration = endTime - startTime;

        if (error) {
            logTest('Complex Query Performance', 'FAIL', error.message);
        } else {
            const status = duration < 2000 ? 'PASS' : 'FAIL'; // 2 second threshold
            logTest('Complex Query Performance', status, `Query took ${duration}ms (${data.length} records)`);
        }

        // Test bulk insert performance
        const bulkStartTime = Date.now();
        const bulkData = Array.from({ length: 5 }, (_, i) => ({
            name: `Bulk Test Customer ${i}`,
            phone: `555000${i.toString().padStart(4, '0')}`,
            email: `bulk${i}@test.com`
        }));

        const { data: bulkResult, error: bulkError } = await supabase
            .from('customers')
            .insert(bulkData)
            .select();

        const bulkEndTime = Date.now();
        const bulkDuration = bulkEndTime - bulkStartTime;

        if (bulkError) {
            logTest('Bulk Insert Performance', 'FAIL', bulkError.message);
        } else {
            const status = bulkDuration < 1000 ? 'PASS' : 'FAIL'; // 1 second threshold
            logTest('Bulk Insert Performance', status, `Inserted ${bulkResult.length} records in ${bulkDuration}ms`);
        }

    } catch (error) {
        logTest('Performance Test Error', 'FAIL', error.message);
    }
}

async function runAllTests() {
    console.log('🚀 Starting Comprehensive API Tests for Digital Textile Printing System');
    console.log(`📍 Testing against: ${supabaseUrl}`);
    console.log(`⏰ Test started at: ${new Date().toISOString()}\n`);

    // Run all test suites
    const dbConnected = await testDatabaseConnection();
    
    if (!dbConnected) {
        console.log('\n❌ Database connection failed. Stopping tests.');
        return;
    }

    const user = await testAuthentication();
    
    if (!user) {
        console.log('\n❌ Authentication failed. Some tests may fail.');
    }

    await testReferenceData();
    await testCustomerCRUD();
    await testOrderWorkflow();
    await testReportsAndQueries();
    await testRLSPolicies();
    await testAPIPerformance();

    // Print summary
    logSection('TEST SUMMARY');
    console.log(`📊 Total Tests: ${testResults.total}`);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

    if (testResults.failed > 0) {
        console.log('\n🔍 Failed Tests:');
        testResults.errors.forEach(error => console.log(`   • ${error}`));
    }

    console.log(`\n⏰ Test completed at: ${new Date().toISOString()}`);
    
    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(console.error);