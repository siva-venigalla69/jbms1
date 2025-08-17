#!/usr/bin/env node

/**
 * API Testing Suite WITHOUT Authentication
 * Tests basic connectivity and database operations using service role
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), 'frontend/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2YXRmend6Zmdpb3lwZG5xamF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTM2MjU4NSwiZXhwIjoyMDcwOTM4NTg1fQ.-uiy3XdZ2mz8Md30Hk8xqh6686mA_H3ps3tLPgLdBtY'; // Service role key bypasses RLS

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test results tracking
let testResults = { total: 0, passed: 0, failed: 0, errors: [] };

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

async function testBasicConnectivity() {
    logSection('BASIC CONNECTIVITY TESTS');
    
    try {
        // Test service role connection
        const { data, error } = await supabase
            .from('user_roles')
            .select('*');
        
        if (error) {
            logTest('Service Role Connection', 'FAIL', error.message);
            return false;
        } else {
            logTest('Service Role Connection', 'PASS', `Connected with service role, found ${data.length} user roles`);
        }

        return true;
    } catch (error) {
        logTest('Connection Test', 'FAIL', error.message);
        return false;
    }
}

async function testReferenceTableData() {
    logSection('REFERENCE TABLE DATA TESTS');
    
    const tables = [
        { name: 'user_roles', expected: ['admin', 'manager', 'employee'] },
        { name: 'order_statuses', expected: ['pending', 'in_progress', 'completed', 'cancelled'] },
        { name: 'material_types', expected: ['saree', 'dupatta', 'voni', 'running_material', 'blouse_material'] },
        { name: 'production_stages', expected: ['pre_treatment', 'printing', 'post_process'] },
        { name: 'payment_methods', expected: ['cash', 'upi', 'bank_transfer', 'cheque'] },
        { name: 'return_reasons', expected: ['damaged', 'defective', 'wrong_design', 'customer_request'] }
    ];

    for (const table of tables) {
        try {
            const { data, error } = await supabase
                .from(table.name)
                .select('id, name')
                .order('id');

            if (error) {
                logTest(`${table.name} data`, 'FAIL', error.message);
            } else {
                const foundIds = data.map(row => row.id);
                const missingIds = table.expected.filter(id => !foundIds.includes(id));
                
                if (missingIds.length > 0) {
                    logTest(`${table.name} data`, 'FAIL', `Missing: ${missingIds.join(', ')}`);
                } else {
                    logTest(`${table.name} data`, 'PASS', `All ${table.expected.length} expected records found`);
                }
            }
        } catch (error) {
            logTest(`${table.name} data`, 'FAIL', error.message);
        }
    }
}

async function testTableOperations() {
    logSection('TABLE OPERATIONS TESTS (Service Role)');
    
    try {
        // Test customer CRUD with service role (bypasses RLS)
        const testCustomer = {
            name: 'Test Customer Service Role',
            phone: '7777777777',
            email: 'service-test@example.com',
            address: '123 Service Test Street'
        };

        // CREATE
        const { data: createdCustomer, error: createError } = await supabase
            .from('customers')
            .insert(testCustomer)
            .select()
            .single();

        if (createError) {
            logTest('Customer CREATE (Service Role)', 'FAIL', createError.message);
            return;
        } else {
            logTest('Customer CREATE (Service Role)', 'PASS', `Created: ${createdCustomer.name}`);
        }

        // READ
        const { data: readCustomer, error: readError } = await supabase
            .from('customers')
            .select('*')
            .eq('id', createdCustomer.id)
            .single();

        if (readError) {
            logTest('Customer READ (Service Role)', 'FAIL', readError.message);
        } else {
            logTest('Customer READ (Service Role)', 'PASS', `Retrieved: ${readCustomer.name}`);
        }

        // UPDATE
        const { data: updatedCustomer, error: updateError } = await supabase
            .from('customers')
            .update({ name: 'Updated Service Test Customer' })
            .eq('id', createdCustomer.id)
            .select()
            .single();

        if (updateError) {
            logTest('Customer UPDATE (Service Role)', 'FAIL', updateError.message);
        } else {
            logTest('Customer UPDATE (Service Role)', 'PASS', `Updated to: ${updatedCustomer.name}`);
        }

        // Test order creation
        const testOrder = {
            order_number: `SRV-TEST-${Date.now()}`,
            customer_id: createdCustomer.id,
            status: 'pending',
            total_amount: 1000.00,
            notes: 'Service role test order'
        };

        const { data: createdOrder, error: orderError } = await supabase
            .from('orders')
            .insert(testOrder)
            .select()
            .single();

        if (orderError) {
            logTest('Order CREATE (Service Role)', 'FAIL', orderError.message);
        } else {
            logTest('Order CREATE (Service Role)', 'PASS', `Created order: ${createdOrder.order_number}`);
        }

        // Test order item creation
        const testOrderItem = {
            order_id: createdOrder.id,
            material_type: 'saree',
            quantity: 2,
            unit_price: 500.00,
            customization_details: 'Test saree design'
        };

        const { data: createdItem, error: itemError } = await supabase
            .from('order_items')
            .insert(testOrderItem)
            .select()
            .single();

        if (itemError) {
            logTest('Order Item CREATE (Service Role)', 'FAIL', itemError.message);
        } else {
            logTest('Order Item CREATE (Service Role)', 'PASS', `Created item: ${createdItem.material_type}`);
        }

        return createdCustomer.id;
    } catch (error) {
        logTest('Table Operations Error', 'FAIL', error.message);
        return null;
    }
}

async function testComplexQueries() {
    logSection('COMPLEX QUERIES TESTS');
    
    try {
        // Test join queries
        const { data: customerOrders, error: joinError } = await supabase
            .from('customers')
            .select(`
                name,
                phone,
                orders (
                    order_number,
                    status,
                    total_amount,
                    order_items (
                        material_type,
                        quantity,
                        production_stage
                    )
                )
            `)
            .limit(5);

        if (joinError) {
            logTest('Complex Join Query', 'FAIL', joinError.message);
        } else {
            logTest('Complex Join Query', 'PASS', `Retrieved ${customerOrders.length} customers with orders`);
        }

        // Test aggregation
        const { data: orderStats, error: aggregateError } = await supabase
            .from('orders')
            .select('status')
            .eq('is_deleted', false);

        if (aggregateError) {
            logTest('Order Stats Query', 'FAIL', aggregateError.message);
        } else {
            const stats = orderStats.reduce((acc, order) => {
                acc[order.status] = (acc[order.status] || 0) + 1;
                return acc;
            }, {});
            logTest('Order Stats Query', 'PASS', `Status distribution: ${JSON.stringify(stats)}`);
        }

        // Test production stage queries
        const { data: productionData, error: productionError } = await supabase
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
            logTest('Production Status Query', 'PASS', `Retrieved ${productionData.length} production records`);
        }

    } catch (error) {
        logTest('Complex Queries Error', 'FAIL', error.message);
    }
}

async function testDatabaseConstraints() {
    logSection('DATABASE CONSTRAINTS TESTS');
    
    try {
        // Test unique constraint
        const duplicateCustomer = {
            name: 'Duplicate Test',
            phone: '7777777777', // Same phone as previous test
            email: 'duplicate@test.com'
        };

        const { data, error } = await supabase
            .from('customers')
            .insert(duplicateCustomer)
            .select();

        if (error && error.message.includes('duplicate')) {
            logTest('Unique Constraint (Phone)', 'PASS', 'Correctly prevented duplicate phone number');
        } else if (error) {
            logTest('Unique Constraint (Phone)', 'FAIL', `Unexpected error: ${error.message}`);
        } else {
            logTest('Unique Constraint (Phone)', 'FAIL', 'Allowed duplicate phone number');
        }

        // Test foreign key constraint
        const invalidOrder = {
            order_number: 'INVALID-TEST',
            customer_id: '00000000-0000-0000-0000-000000000000', // Non-existent customer
            status: 'pending'
        };

        const { data: invalidData, error: fkError } = await supabase
            .from('orders')
            .insert(invalidOrder)
            .select();

        if (fkError && (fkError.message.includes('foreign key') || fkError.message.includes('violates'))) {
            logTest('Foreign Key Constraint', 'PASS', 'Correctly prevented invalid customer reference');
        } else if (fkError) {
            logTest('Foreign Key Constraint', 'FAIL', `Unexpected error: ${fkError.message}`);
        } else {
            logTest('Foreign Key Constraint', 'FAIL', 'Allowed invalid customer reference');
        }

        // Test check constraint
        const invalidOrderItem = {
            order_id: '00000000-0000-0000-0000-000000000000',
            material_type: 'saree',
            quantity: -5, // Negative quantity should fail
            unit_price: 100
        };

        const { data: checkData, error: checkError } = await supabase
            .from('order_items')
            .insert(invalidOrderItem)
            .select();

        if (checkError && checkError.message.includes('check')) {
            logTest('Check Constraint (Quantity)', 'PASS', 'Correctly prevented negative quantity');
        } else if (checkError) {
            logTest('Check Constraint (Quantity)', 'UNKNOWN', `Error: ${checkError.message}`);
        } else {
            logTest('Check Constraint (Quantity)', 'FAIL', 'Allowed negative quantity');
        }

    } catch (error) {
        logTest('Database Constraints Error', 'FAIL', error.message);
    }
}

async function runServiceRoleTests() {
    console.log('🚀 Starting Service Role API Tests (No Auth Required)');
    console.log(`📍 Testing against: ${supabaseUrl}`);
    console.log(`⏰ Test started at: ${new Date().toISOString()}\n`);

    const connected = await testBasicConnectivity();
    
    if (!connected) {
        console.log('\n❌ Basic connectivity failed. Stopping tests.');
        return;
    }

    await testReferenceTableData();
    await testTableOperations();
    await testComplexQueries();
    await testDatabaseConstraints();

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
    
    process.exit(testResults.failed > 0 ? 1 : 0);
}

runServiceRoleTests().catch(console.error);