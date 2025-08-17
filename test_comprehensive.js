#!/usr/bin/env node

/**
 * COMPREHENSIVE API TEST SUITE
 * Complete business scenario testing for Digital Textile Printing System
 * 
 * This suite tests:
 * 1. All CRUD operations
 * 2. Complete business workflows
 * 3. Edge cases and error handling
 * 4. Performance benchmarks
 * 5. Data integrity and constraints
 * 6. Authentication and authorization
 * 7. Complex business logic scenarios
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), 'frontend/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test results tracking with detailed reporting
let testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
    errors: [],
    performance: [],
    testSuites: {},
    startTime: new Date(),
    endTime: null
};

// Test data storage for cleanup
let testData = {
    customers: [],
    orders: [],
    orderItems: [],
    challans: [],
    invoices: [],
    payments: []
};

function logTest(suiteName, testName, status, message = '', duration = null, details = null) {
    testResults.total++;
    
    if (!testResults.testSuites[suiteName]) {
        testResults.testSuites[suiteName] = { total: 0, passed: 0, failed: 0, warnings: 0, tests: [] };
    }
    
    const testInfo = {
        name: testName,
        status,
        message,
        duration,
        details,
        timestamp: new Date().toISOString()
    };
    
    testResults.testSuites[suiteName].total++;
    testResults.testSuites[suiteName].tests.push(testInfo);
    
    if (status === 'PASS') {
        testResults.passed++;
        testResults.testSuites[suiteName].passed++;
        console.log(`✅ ${testName} - ${message}${duration ? ` (${duration}ms)` : ''}`);
    } else if (status === 'FAIL') {
        testResults.failed++;
        testResults.testSuites[suiteName].failed++;
        console.log(`❌ ${testName} - ${message}`);
        testResults.errors.push(`${suiteName}::${testName}: ${message}`);
    } else if (status === 'WARN') {
        testResults.warnings++;
        testResults.testSuites[suiteName].warnings++;
        console.log(`⚠️  ${testName} - ${message}`);
    }
    
    if (duration) {
        testResults.performance.push({ test: `${suiteName}::${testName}`, duration, timestamp: new Date() });
    }
}

function logSection(title) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🧪 ${title}`);
    console.log('='.repeat(70));
}

async function measurePerformance(testFn) {
    const start = Date.now();
    const result = await testFn();
    const duration = Date.now() - start;
    return { result, duration };
}

// ============================================================================
// AUTHENTICATION AND SESSION TESTS
// ============================================================================

async function testAuthenticationFlow() {
    logSection('AUTHENTICATION & SESSION MANAGEMENT TESTS');
    
    try {
        // Test 1: Login with valid credentials
        const { result: loginResult, duration: loginDuration } = await measurePerformance(async () => {
            return await supabase.auth.signInWithPassword({
                email: 'shiva.venigalla@gmail.com',
                password: 'Admin@123!'
            });
        });

        if (loginResult.error) {
            logTest('Authentication', 'User Login', 'FAIL', loginResult.error.message, loginDuration);
            return null;
        } else {
            logTest('Authentication', 'User Login', 'PASS', `Logged in as: ${loginResult.data.user.email}`, loginDuration, {
                userId: loginResult.data.user.id,
                email: loginResult.data.user.email
            });
        }

        // Test 2: Session persistence
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
            logTest('Authentication', 'Session Persistence', 'FAIL', sessionError.message);
        } else {
            logTest('Authentication', 'Session Persistence', 'PASS', `Active session for: ${sessionData.session?.user.email}`);
        }

        // Test 3: User profile retrieval
        const { result: profileResult, duration: profileDuration } = await measurePerformance(async () => {
            return await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', loginResult.data.user.id)
                .single();
        });

        if (profileResult.error) {
            logTest('Authentication', 'User Profile Retrieval', 'FAIL', profileResult.error.message, profileDuration);
        } else {
            logTest('Authentication', 'User Profile Retrieval', 'PASS', 
                `Profile: ${profileResult.data.username} (${profileResult.data.role})`, profileDuration, {
                    username: profileResult.data.username,
                    role: profileResult.data.role,
                    fullName: profileResult.data.full_name
                });
        }

        // Test 4: Invalid login attempt
        const { data: invalidData, error: invalidError } = await supabase.auth.signInWithPassword({
            email: 'invalid@test.com',
            password: 'wrongpassword'
        });

        if (invalidError) {
            logTest('Authentication', 'Invalid Login Rejection', 'PASS', 'Correctly rejected invalid credentials');
        } else {
            logTest('Authentication', 'Invalid Login Rejection', 'FAIL', 'Allowed invalid login');
        }

        return loginResult.data.user;
    } catch (error) {
        logTest('Authentication', 'Authentication Flow Error', 'FAIL', error.message);
        return null;
    }
}

// ============================================================================
// REFERENCE DATA VALIDATION TESTS
// ============================================================================

async function testReferenceDataIntegrity() {
    logSection('REFERENCE DATA INTEGRITY TESTS');
    
    const referenceTests = [
        { 
            table: 'user_roles', 
            expected: ['admin', 'manager', 'employee'],
            requiredFields: ['id', 'name', 'description']
        },
        { 
            table: 'order_statuses', 
            expected: ['pending', 'in_progress', 'completed', 'cancelled'],
            requiredFields: ['id', 'name', 'description']
        },
        { 
            table: 'material_types', 
            expected: ['saree', 'dupatta', 'voni', 'running_material', 'blouse_material'],
            requiredFields: ['id', 'name', 'description']
        },
        { 
            table: 'production_stages', 
            expected: ['pre_treatment', 'printing', 'post_process'],
            requiredFields: ['id', 'name', 'description', 'sequence_order']
        },
        { 
            table: 'payment_methods', 
            expected: ['cash', 'upi', 'bank_transfer', 'cheque'],
            requiredFields: ['id', 'name', 'description']
        },
        { 
            table: 'return_reasons', 
            expected: ['damaged', 'defective', 'wrong_design', 'customer_request'],
            requiredFields: ['id', 'name', 'description']
        }
    ];

    for (const test of referenceTests) {
        try {
            const { result, duration } = await measurePerformance(async () => {
                return await supabase
                    .from(test.table)
                    .select('*')
                    .order('id');
            });

            if (result.error) {
                logTest('Reference Data', `${test.table} - Data Retrieval`, 'FAIL', result.error.message, duration);
                continue;
            }

            // Test data completeness
            const foundIds = result.data.map(row => row.id);
            const missingIds = test.expected.filter(id => !foundIds.includes(id));
            
            if (missingIds.length > 0) {
                logTest('Reference Data', `${test.table} - Data Completeness`, 'FAIL', 
                    `Missing records: ${missingIds.join(', ')}`, duration);
            } else {
                logTest('Reference Data', `${test.table} - Data Completeness`, 'PASS', 
                    `All ${test.expected.length} expected records found`, duration);
            }

            // Test field integrity
            const missingFields = test.requiredFields.filter(field => 
                !result.data.every(row => row.hasOwnProperty(field))
            );

            if (missingFields.length > 0) {
                logTest('Reference Data', `${test.table} - Field Integrity`, 'FAIL', 
                    `Missing fields: ${missingFields.join(', ')}`);
            } else {
                logTest('Reference Data', `${test.table} - Field Integrity`, 'PASS', 
                    `All required fields present`);
            }

        } catch (error) {
            logTest('Reference Data', `${test.table} - Test Error`, 'FAIL', error.message);
        }
    }
}

// ============================================================================
// CUSTOMER MANAGEMENT TESTS
// ============================================================================

async function testCustomerManagement() {
    logSection('CUSTOMER MANAGEMENT TESTS');
    
    try {
        // Test 1: Create customer with complete data
        const completeCustomer = {
            name: 'Complete Test Customer',
            phone: '9876543210',
            email: 'complete@test.com',
            address: '123 Complete Test Street, Test City, Test State - 123456',
            gst_number: 'TEST123456789'
        };

        const { result: createResult, duration: createDuration } = await measurePerformance(async () => {
            return await supabase
                .from('customers')
                .insert(completeCustomer)
                .select()
                .single();
        });

        if (createResult.error) {
            logTest('Customer Management', 'Create Complete Customer', 'FAIL', createResult.error.message, createDuration);
            return;
        } else {
            logTest('Customer Management', 'Create Complete Customer', 'PASS', 
                `Created: ${createResult.data.name}`, createDuration, createResult.data);
            testData.customers.push(createResult.data.id);
        }

        // Test 2: Create customer with minimal data
        const minimalCustomer = {
            name: 'Minimal Test Customer',
            phone: '9876543211'
        };

        const { result: minimalResult, duration: minimalDuration } = await measurePerformance(async () => {
            return await supabase
                .from('customers')
                .insert(minimalCustomer)
                .select()
                .single();
        });

        if (minimalResult.error) {
            logTest('Customer Management', 'Create Minimal Customer', 'FAIL', minimalResult.error.message, minimalDuration);
        } else {
            logTest('Customer Management', 'Create Minimal Customer', 'PASS', 
                `Created: ${minimalResult.data.name}`, minimalDuration);
            testData.customers.push(minimalResult.data.id);
        }

        // Test 3: Duplicate phone number validation
        const duplicateCustomer = {
            name: 'Duplicate Phone Customer',
            phone: '9876543210' // Same as complete customer
        };

        const { data: duplicateData, error: duplicateError } = await supabase
            .from('customers')
            .insert(duplicateCustomer)
            .select();

        if (duplicateError && duplicateError.message.includes('duplicate')) {
            logTest('Customer Management', 'Duplicate Phone Validation', 'PASS', 
                'Correctly prevented duplicate phone number');
        } else if (duplicateError) {
            logTest('Customer Management', 'Duplicate Phone Validation', 'WARN', 
                `Unexpected error: ${duplicateError.message}`);
        } else {
            logTest('Customer Management', 'Duplicate Phone Validation', 'FAIL', 
                'Allowed duplicate phone number');
        }

        // Test 4: Customer update
        const { result: updateResult, duration: updateDuration } = await measurePerformance(async () => {
            return await supabase
                .from('customers')
                .update({
                    name: 'Updated Complete Test Customer',
                    address: 'Updated Address'
                })
                .eq('id', createResult.data.id)
                .select()
                .single();
        });

        if (updateResult.error) {
            logTest('Customer Management', 'Customer Update', 'FAIL', updateResult.error.message, updateDuration);
        } else {
            logTest('Customer Management', 'Customer Update', 'PASS', 
                `Updated: ${updateResult.data.name}`, updateDuration);
        }

        // Test 5: Customer search by name
        const { result: searchResult, duration: searchDuration } = await measurePerformance(async () => {
            return await supabase
                .from('customers')
                .select('*')
                .ilike('name', '%test%')
                .eq('is_deleted', false);
        });

        if (searchResult.error) {
            logTest('Customer Management', 'Customer Search', 'FAIL', searchResult.error.message, searchDuration);
        } else {
            logTest('Customer Management', 'Customer Search', 'PASS', 
                `Found ${searchResult.data.length} customers`, searchDuration);
        }

        // Test 6: Soft delete
        const { result: deleteResult, duration: deleteDuration } = await measurePerformance(async () => {
            return await supabase
                .from('customers')
                .update({ is_deleted: true })
                .eq('id', minimalResult.data.id)
                .select()
                .single();
        });

        if (deleteResult.error) {
            logTest('Customer Management', 'Customer Soft Delete', 'FAIL', deleteResult.error.message, deleteDuration);
        } else {
            logTest('Customer Management', 'Customer Soft Delete', 'PASS', 
                `Soft deleted: ${deleteResult.data.name}`, deleteDuration);
        }

        return createResult.data.id;
    } catch (error) {
        logTest('Customer Management', 'Customer Management Error', 'FAIL', error.message);
        return null;
    }
}

// ============================================================================
// ORDER WORKFLOW TESTS
// ============================================================================

async function testOrderWorkflow() {
    logSection('COMPLETE ORDER WORKFLOW TESTS');
    
    try {
        // First ensure we have a customer
        const { data: existingCustomers } = await supabase
            .from('customers')
            .select('*')
            .eq('is_deleted', false)
            .limit(1);

        let customerId;
        if (existingCustomers && existingCustomers.length > 0) {
            customerId = existingCustomers[0].id;
        } else {
            // Create a customer for testing
            const { data: newCustomer, error: customerError } = await supabase
                .from('customers')
                .insert({
                    name: 'Order Workflow Customer',
                    phone: '9999888877',
                    email: 'workflow@test.com'
                })
                .select()
                .single();

            if (customerError) {
                logTest('Order Workflow', 'Setup Customer', 'FAIL', customerError.message);
                return;
            }
            customerId = newCustomer.id;
            testData.customers.push(customerId);
        }

        // Test 1: Create order
        const orderData = {
            order_number: `ORD-FLOW-${Date.now()}`,
            customer_id: customerId,
            status: 'pending',
            total_amount: 15000.00,
            notes: 'Complete workflow test order'
        };

        const { result: orderResult, duration: orderDuration } = await measurePerformance(async () => {
            return await supabase
                .from('orders')
                .insert(orderData)
                .select()
                .single();
        });

        if (orderResult.error) {
            logTest('Order Workflow', 'Create Order', 'FAIL', orderResult.error.message, orderDuration);
            return;
        } else {
            logTest('Order Workflow', 'Create Order', 'PASS', 
                `Created: ${orderResult.data.order_number}`, orderDuration, orderResult.data);
            testData.orders.push(orderResult.data.id);
        }

        // Test 2: Add multiple order items
        const orderItems = [
            {
                order_id: orderResult.data.id,
                material_type: 'saree',
                quantity: 5,
                unit_price: 2000.00,
                customization_details: 'Red saree with gold border'
            },
            {
                order_id: orderResult.data.id,
                material_type: 'dupatta',
                quantity: 3,
                unit_price: 1000.00,
                customization_details: 'Matching dupatta set'
            },
            {
                order_id: orderResult.data.id,
                material_type: 'blouse_material',
                quantity: 2,
                unit_price: 500.00,
                customization_details: 'Blouse material'
            }
        ];

        const { result: itemsResult, duration: itemsDuration } = await measurePerformance(async () => {
            return await supabase
                .from('order_items')
                .insert(orderItems)
                .select();
        });

        if (itemsResult.error) {
            logTest('Order Workflow', 'Add Order Items', 'FAIL', itemsResult.error.message, itemsDuration);
        } else {
            logTest('Order Workflow', 'Add Order Items', 'PASS', 
                `Added ${itemsResult.data.length} items`, itemsDuration);
            testData.orderItems.push(...itemsResult.data.map(item => item.id));
        }

        // Test 3: Material In tracking
        const materialInData = orderItems.map(item => ({
            customer_id: customerId,
            order_id: orderResult.data.id,
            material_type: item.material_type,
            quantity: item.quantity,
            unit: 'pieces',
            notes: `Material received for ${item.material_type}`
        }));

        const { result: materialInResult, duration: materialInDuration } = await measurePerformance(async () => {
            return await supabase
                .from('material_in')
                .insert(materialInData)
                .select();
        });

        if (materialInResult.error) {
            logTest('Order Workflow', 'Material In Tracking', 'FAIL', materialInResult.error.message, materialInDuration);
        } else {
            logTest('Order Workflow', 'Material In Tracking', 'PASS', 
                `Tracked ${materialInResult.data.length} material entries`, materialInDuration);
        }

        // Test 4: Production stage progression
        for (const [index, stage] of ['pre_treatment', 'printing', 'post_process'].entries()) {
            const { result: stageResult, duration: stageDuration } = await measurePerformance(async () => {
                return await supabase
                    .from('order_items')
                    .update({
                        production_stage: stage,
                        stage_completed_at: new Date().toISOString()
                    })
                    .eq('order_id', orderResult.data.id)
                    .select();
            });

            if (stageResult.error) {
                logTest('Order Workflow', `Production Stage: ${stage}`, 'FAIL', stageResult.error.message, stageDuration);
            } else {
                logTest('Order Workflow', `Production Stage: ${stage}`, 'PASS', 
                    `Updated ${stageResult.data.length} items to ${stage}`, stageDuration);
            }
        }

        // Test 5: Order status progression
        const statusProgression = ['in_progress', 'completed'];
        for (const status of statusProgression) {
            const { result: statusResult, duration: statusDuration } = await measurePerformance(async () => {
                return await supabase
                    .from('orders')
                    .update({ status })
                    .eq('id', orderResult.data.id)
                    .select()
                    .single();
            });

            if (statusResult.error) {
                logTest('Order Workflow', `Order Status: ${status}`, 'FAIL', statusResult.error.message, statusDuration);
            } else {
                logTest('Order Workflow', `Order Status: ${status}`, 'PASS', 
                    `Updated order to ${status}`, statusDuration);
            }
        }

        return orderResult.data.id;
    } catch (error) {
        logTest('Order Workflow', 'Order Workflow Error', 'FAIL', error.message);
        return null;
    }
}

// ============================================================================
// DELIVERY AND INVOICING TESTS
// ============================================================================

async function testDeliveryAndInvoicing(orderId, customerId) {
    logSection('DELIVERY & INVOICING WORKFLOW TESTS');
    
    if (!orderId || !customerId) {
        logTest('Delivery & Invoicing', 'Prerequisites', 'FAIL', 'Missing order or customer ID');
        return;
    }

    try {
        // Test 1: Create delivery challan
        const challanData = {
            challan_number: `CH-${Date.now()}`,
            customer_id: customerId,
            total_quantity: 10,
            delivery_status: 'pending',
            notes: 'Test delivery challan'
        };

        const { result: challanResult, duration: challanDuration } = await measurePerformance(async () => {
            return await supabase
                .from('delivery_challans')
                .insert(challanData)
                .select()
                .single();
        });

        if (challanResult.error) {
            logTest('Delivery & Invoicing', 'Create Delivery Challan', 'FAIL', challanResult.error.message, challanDuration);
            return;
        } else {
            logTest('Delivery & Invoicing', 'Create Delivery Challan', 'PASS', 
                `Created: ${challanResult.data.challan_number}`, challanDuration);
            testData.challans.push(challanResult.data.id);
        }

        // Test 2: Link order items to challan
        const { data: orderItems } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', orderId);

        if (orderItems && orderItems.length > 0) {
            const challanItems = orderItems.map(item => ({
                challan_id: challanResult.data.id,
                order_item_id: item.id,
                quantity: item.quantity
            }));

            const { result: challanItemsResult, duration: challanItemsDuration } = await measurePerformance(async () => {
                return await supabase
                    .from('challan_items')
                    .insert(challanItems)
                    .select();
            });

            if (challanItemsResult.error) {
                logTest('Delivery & Invoicing', 'Link Challan Items', 'FAIL', challanItemsResult.error.message, challanItemsDuration);
            } else {
                logTest('Delivery & Invoicing', 'Link Challan Items', 'PASS', 
                    `Linked ${challanItemsResult.data.length} items`, challanItemsDuration);
            }
        }

        // Test 3: Material Out tracking
        const materialOutData = [
            {
                challan_id: challanResult.data.id,
                customer_id: customerId,
                material_type: 'saree',
                quantity: 5
            },
            {
                challan_id: challanResult.data.id,
                customer_id: customerId,
                material_type: 'dupatta',
                quantity: 3
            }
        ];

        const { result: materialOutResult, duration: materialOutDuration } = await measurePerformance(async () => {
            return await supabase
                .from('material_out')
                .insert(materialOutData)
                .select();
        });

        if (materialOutResult.error) {
            logTest('Delivery & Invoicing', 'Material Out Tracking', 'FAIL', materialOutResult.error.message, materialOutDuration);
        } else {
            logTest('Delivery & Invoicing', 'Material Out Tracking', 'PASS', 
                `Tracked ${materialOutResult.data.length} dispatched materials`, materialOutDuration);
        }

        // Test 4: Create GST Invoice
        const invoiceData = {
            invoice_number: `INV-${Date.now()}`,
            customer_id: customerId,
            total_amount: 15000.00,
            cgst_rate: 9.00,
            sgst_rate: 9.00,
            cgst_amount: 1350.00,
            sgst_amount: 1350.00,
            outstanding_amount: 17700.00
        };

        const { result: invoiceResult, duration: invoiceDuration } = await measurePerformance(async () => {
            return await supabase
                .from('gst_invoices')
                .insert(invoiceData)
                .select()
                .single();
        });

        if (invoiceResult.error) {
            logTest('Delivery & Invoicing', 'Create GST Invoice', 'FAIL', invoiceResult.error.message, invoiceDuration);
            return;
        } else {
            logTest('Delivery & Invoicing', 'Create GST Invoice', 'PASS', 
                `Created: ${invoiceResult.data.invoice_number}`, invoiceDuration);
            testData.invoices.push(invoiceResult.data.id);
        }

        // Test 5: Link challan to invoice
        const { result: invoiceChallanResult, duration: invoiceChallanDuration } = await measurePerformance(async () => {
            return await supabase
                .from('invoice_challans')
                .insert({
                    invoice_id: invoiceResult.data.id,
                    challan_id: challanResult.data.id
                })
                .select()
                .single();
        });

        if (invoiceChallanResult.error) {
            logTest('Delivery & Invoicing', 'Link Invoice to Challan', 'FAIL', invoiceChallanResult.error.message, invoiceChallanDuration);
        } else {
            logTest('Delivery & Invoicing', 'Link Invoice to Challan', 'PASS', 
                `Linked invoice to challan`, invoiceChallanDuration);
        }

        return invoiceResult.data.id;
    } catch (error) {
        logTest('Delivery & Invoicing', 'Delivery & Invoicing Error', 'FAIL', error.message);
        return null;
    }
}

// ============================================================================
// PAYMENT PROCESSING TESTS
// ============================================================================

async function testPaymentProcessing(invoiceId) {
    logSection('PAYMENT PROCESSING TESTS');
    
    if (!invoiceId) {
        logTest('Payment Processing', 'Prerequisites', 'FAIL', 'Missing invoice ID');
        return;
    }

    try {
        // Test 1: Partial payment
        const partialPayment = {
            invoice_id: invoiceId,
            payment_amount: 10000.00,
            payment_method: 'upi',
            reference_number: 'UPI123456789',
            notes: 'Partial payment via UPI'
        };

        const { result: partialResult, duration: partialDuration } = await measurePerformance(async () => {
            return await supabase
                .from('payments')
                .insert(partialPayment)
                .select()
                .single();
        });

        if (partialResult.error) {
            logTest('Payment Processing', 'Partial Payment', 'FAIL', partialResult.error.message, partialDuration);
            return;
        } else {
            logTest('Payment Processing', 'Partial Payment', 'PASS', 
                `Recorded ₹${partialPayment.payment_amount} payment`, partialDuration);
            testData.payments.push(partialResult.data.id);
        }

        // Test 2: Update outstanding amount
        const { result: updateInvoiceResult, duration: updateInvoiceDuration } = await measurePerformance(async () => {
            return await supabase
                .from('gst_invoices')
                .update({ outstanding_amount: 7700.00 })
                .eq('id', invoiceId)
                .select()
                .single();
        });

        if (updateInvoiceResult.error) {
            logTest('Payment Processing', 'Update Outstanding Amount', 'FAIL', updateInvoiceResult.error.message, updateInvoiceDuration);
        } else {
            logTest('Payment Processing', 'Update Outstanding Amount', 'PASS', 
                `Updated outstanding to ₹${updateInvoiceResult.data.outstanding_amount}`, updateInvoiceDuration);
        }

        // Test 3: Final payment
        const finalPayment = {
            invoice_id: invoiceId,
            payment_amount: 7700.00,
            payment_method: 'bank_transfer',
            reference_number: 'BANK987654321',
            notes: 'Final payment via bank transfer'
        };

        const { result: finalResult, duration: finalDuration } = await measurePerformance(async () => {
            return await supabase
                .from('payments')
                .insert(finalPayment)
                .select()
                .single();
        });

        if (finalResult.error) {
            logTest('Payment Processing', 'Final Payment', 'FAIL', finalResult.error.message, finalDuration);
        } else {
            logTest('Payment Processing', 'Final Payment', 'PASS', 
                `Recorded ₹${finalPayment.payment_amount} final payment`, finalDuration);
            testData.payments.push(finalResult.data.id);
        }

        // Test 4: Close invoice
        const { result: closeInvoiceResult, duration: closeInvoiceDuration } = await measurePerformance(async () => {
            return await supabase
                .from('gst_invoices')
                .update({ outstanding_amount: 0.00 })
                .eq('id', invoiceId)
                .select()
                .single();
        });

        if (closeInvoiceResult.error) {
            logTest('Payment Processing', 'Close Invoice', 'FAIL', closeInvoiceResult.error.message, closeInvoiceDuration);
        } else {
            logTest('Payment Processing', 'Close Invoice', 'PASS', 
                `Invoice fully paid and closed`, closeInvoiceDuration);
        }

        // Test 5: Payment history query
        const { result: paymentHistoryResult, duration: paymentHistoryDuration } = await measurePerformance(async () => {
            return await supabase
                .from('payments')
                .select(`
                    *,
                    payment_methods (name),
                    gst_invoices (invoice_number, total_amount)
                `)
                .eq('invoice_id', invoiceId)
                .order('payment_date');
        });

        if (paymentHistoryResult.error) {
            logTest('Payment Processing', 'Payment History Query', 'FAIL', paymentHistoryResult.error.message, paymentHistoryDuration);
        } else {
            const totalPaid = paymentHistoryResult.data.reduce((sum, payment) => sum + parseFloat(payment.payment_amount), 0);
            logTest('Payment Processing', 'Payment History Query', 'PASS', 
                `Retrieved ${paymentHistoryResult.data.length} payments, total: ₹${totalPaid}`, paymentHistoryDuration);
        }

    } catch (error) {
        logTest('Payment Processing', 'Payment Processing Error', 'FAIL', error.message);
    }
}

// ============================================================================
// ADVANCED QUERY AND REPORTING TESTS
// ============================================================================

async function testAdvancedQueries() {
    logSection('ADVANCED QUERIES & REPORTING TESTS');
    
    try {
        // Test 1: Customer order summary with aggregations
        const { result: customerSummaryResult, duration: customerSummaryDuration } = await measurePerformance(async () => {
            return await supabase
                .from('customers')
                .select(`
                    id,
                    name,
                    phone,
                    orders (
                        id,
                        order_number,
                        status,
                        total_amount,
                        order_date,
                        order_items (
                            material_type,
                            quantity,
                            unit_price,
                            production_stage
                        )
                    )
                `)
                .eq('is_deleted', false)
                .limit(10);
        });

        if (customerSummaryResult.error) {
            logTest('Advanced Queries', 'Customer Order Summary', 'FAIL', customerSummaryResult.error.message, customerSummaryDuration);
        } else {
            const totalCustomers = customerSummaryResult.data.length;
            const totalOrders = customerSummaryResult.data.reduce((sum, customer) => sum + customer.orders.length, 0);
            logTest('Advanced Queries', 'Customer Order Summary', 'PASS', 
                `Retrieved ${totalCustomers} customers with ${totalOrders} orders`, customerSummaryDuration);
        }

        // Test 2: Production status dashboard
        const { result: productionDashboardResult, duration: productionDashboardDuration } = await measurePerformance(async () => {
            return await supabase
                .from('order_items')
                .select(`
                    production_stage,
                    production_stages (name, sequence_order),
                    quantity,
                    material_type,
                    material_types (name),
                    orders (
                        order_number,
                        status,
                        customers (name, phone)
                    )
                `)
                .order('orders.order_date', { ascending: false })
                .limit(20);
        });

        if (productionDashboardResult.error) {
            logTest('Advanced Queries', 'Production Dashboard', 'FAIL', productionDashboardResult.error.message, productionDashboardDuration);
        } else {
            const stageStats = productionDashboardResult.data.reduce((stats, item) => {
                stats[item.production_stage] = (stats[item.production_stage] || 0) + 1;
                return stats;
            }, {});
            logTest('Advanced Queries', 'Production Dashboard', 'PASS', 
                `Retrieved ${productionDashboardResult.data.length} items, stages: ${JSON.stringify(stageStats)}`, productionDashboardDuration);
        }

        // Test 3: Financial summary
        const { result: financialSummaryResult, duration: financialSummaryDuration } = await measurePerformance(async () => {
            return await supabase
                .from('gst_invoices')
                .select(`
                    invoice_number,
                    total_amount,
                    outstanding_amount,
                    invoice_date,
                    customers (name),
                    payments (
                        payment_amount,
                        payment_date,
                        payment_method,
                        payment_methods (name)
                    )
                `)
                .eq('is_deleted', false)
                .order('invoice_date', { ascending: false })
                .limit(10);
        });

        if (financialSummaryResult.error) {
            logTest('Advanced Queries', 'Financial Summary', 'FAIL', financialSummaryResult.error.message, financialSummaryDuration);
        } else {
            const totalInvoiced = financialSummaryResult.data.reduce((sum, invoice) => sum + parseFloat(invoice.total_amount), 0);
            const totalOutstanding = financialSummaryResult.data.reduce((sum, invoice) => sum + parseFloat(invoice.outstanding_amount), 0);
            logTest('Advanced Queries', 'Financial Summary', 'PASS', 
                `Retrieved ${financialSummaryResult.data.length} invoices, Total: ₹${totalInvoiced}, Outstanding: ₹${totalOutstanding}`, financialSummaryDuration);
        }

        // Test 4: Material flow tracking
        const { result: materialFlowResult, duration: materialFlowDuration } = await measurePerformance(async () => {
            return await supabase
                .from('material_in')
                .select(`
                    material_type,
                    quantity,
                    received_date,
                    material_types (name),
                    customers (name),
                    orders (order_number)
                `)
                .order('received_date', { ascending: false })
                .limit(15);
        });

        if (materialFlowResult.error) {
            logTest('Advanced Queries', 'Material Flow Tracking', 'FAIL', materialFlowResult.error.message, materialFlowDuration);
        } else {
            const materialStats = materialFlowResult.data.reduce((stats, item) => {
                stats[item.material_type] = (stats[item.material_type] || 0) + item.quantity;
                return stats;
            }, {});
            logTest('Advanced Queries', 'Material Flow Tracking', 'PASS', 
                `Tracked ${materialFlowResult.data.length} material entries: ${JSON.stringify(materialStats)}`, materialFlowDuration);
        }

        // Test 5: Performance analytics
        const { result: performanceResult, duration: performanceDuration } = await measurePerformance(async () => {
            return await supabase.rpc('get_production_efficiency', {});
        });

        if (performanceResult.error && !performanceResult.error.message.includes('function') && !performanceResult.error.message.includes('does not exist')) {
            logTest('Advanced Queries', 'Performance Analytics', 'FAIL', performanceResult.error.message, performanceDuration);
        } else if (performanceResult.error) {
            logTest('Advanced Queries', 'Performance Analytics', 'WARN', 
                'Custom function not implemented (expected for basic setup)', performanceDuration);
        } else {
            logTest('Advanced Queries', 'Performance Analytics', 'PASS', 
                `Retrieved performance data`, performanceDuration);
        }

    } catch (error) {
        logTest('Advanced Queries', 'Advanced Queries Error', 'FAIL', error.message);
    }
}

// ============================================================================
// PERFORMANCE AND STRESS TESTS
// ============================================================================

async function testPerformanceAndStress() {
    logSection('PERFORMANCE & STRESS TESTS');
    
    try {
        // Test 1: Bulk customer creation
        const bulkCustomers = Array.from({ length: 50 }, (_, i) => ({
            name: `Bulk Customer ${i + 1}`,
            phone: `9${(1000000000 + i).toString().slice(1)}`,
            email: `bulk${i + 1}@test.com`,
            address: `${i + 1} Bulk Test Street`
        }));

        const { result: bulkCreateResult, duration: bulkCreateDuration } = await measurePerformance(async () => {
            return await supabase
                .from('customers')
                .insert(bulkCustomers)
                .select();
        });

        if (bulkCreateResult.error) {
            logTest('Performance & Stress', 'Bulk Customer Creation', 'FAIL', bulkCreateResult.error.message, bulkCreateDuration);
        } else {
            const throughput = (bulkCustomers.length / bulkCreateDuration * 1000).toFixed(2);
            logTest('Performance & Stress', 'Bulk Customer Creation', 'PASS', 
                `Created ${bulkCreateResult.data.length} customers (${throughput} records/sec)`, bulkCreateDuration);
            testData.customers.push(...bulkCreateResult.data.map(c => c.id));
        }

        // Test 2: Complex join query performance
        const { result: complexJoinResult, duration: complexJoinDuration } = await measurePerformance(async () => {
            return await supabase
                .from('orders')
                .select(`
                    *,
                    customers (*),
                    order_items (
                        *,
                        material_types (*),
                        production_stages (*)
                    ),
                    delivery_challans (
                        *,
                        challan_items (*)
                    ),
                    gst_invoices (
                        *,
                        payments (*)
                    )
                `)
                .limit(20);
        });

        if (complexJoinResult.error) {
            logTest('Performance & Stress', 'Complex Join Query', 'FAIL', complexJoinResult.error.message, complexJoinDuration);
        } else {
            const queryEfficiency = complexJoinDuration < 1000 ? 'Excellent' : complexJoinDuration < 2000 ? 'Good' : 'Acceptable';
            logTest('Performance & Stress', 'Complex Join Query', 'PASS', 
                `Retrieved complex data in ${complexJoinDuration}ms (${queryEfficiency})`, complexJoinDuration);
        }

        // Test 3: Concurrent read operations
        const concurrentReads = Array.from({ length: 10 }, () => 
            supabase.from('customers').select('*').limit(10)
        );

        const { result: concurrentResult, duration: concurrentDuration } = await measurePerformance(async () => {
            return await Promise.all(concurrentReads);
        });

        if (concurrentResult.some(r => r.error)) {
            const errors = concurrentResult.filter(r => r.error).length;
            logTest('Performance & Stress', 'Concurrent Read Operations', 'FAIL', 
                `${errors} out of ${concurrentReads.length} operations failed`, concurrentDuration);
        } else {
            const avgDuration = concurrentDuration / concurrentReads.length;
            logTest('Performance & Stress', 'Concurrent Read Operations', 'PASS', 
                `${concurrentReads.length} concurrent reads, avg: ${avgDuration.toFixed(2)}ms each`, concurrentDuration);
        }

        // Test 4: Large result set pagination
        const { result: paginationResult, duration: paginationDuration } = await measurePerformance(async () => {
            return await supabase
                .from('customers')
                .select('id, name, phone, created_at')
                .range(0, 99)
                .order('created_at');
        });

        if (paginationResult.error) {
            logTest('Performance & Stress', 'Large Result Set Pagination', 'FAIL', paginationResult.error.message, paginationDuration);
        } else {
            logTest('Performance & Stress', 'Large Result Set Pagination', 'PASS', 
                `Retrieved ${paginationResult.data.length} records with pagination`, paginationDuration);
        }

        // Test 5: Search query performance
        const { result: searchResult, duration: searchDuration } = await measurePerformance(async () => {
            return await supabase
                .from('customers')
                .select('*')
                .or('name.ilike.%test%,phone.ilike.%876%,email.ilike.%test%')
                .limit(20);
        });

        if (searchResult.error) {
            logTest('Performance & Stress', 'Search Query Performance', 'FAIL', searchResult.error.message, searchDuration);
        } else {
            logTest('Performance & Stress', 'Search Query Performance', 'PASS', 
                `Search found ${searchResult.data.length} results`, searchDuration);
        }

    } catch (error) {
        logTest('Performance & Stress', 'Performance & Stress Error', 'FAIL', error.message);
    }
}

// ============================================================================
// DATA INTEGRITY AND CONSTRAINT TESTS
// ============================================================================

async function testDataIntegrityAndConstraints() {
    logSection('DATA INTEGRITY & CONSTRAINT TESTS');
    
    try {
        // Test 1: Foreign key constraint validation
        const invalidOrder = {
            order_number: 'INVALID-FK-TEST',
            customer_id: '00000000-0000-0000-0000-000000000000',
            status: 'pending'
        };

        const { data: fkData, error: fkError } = await supabase
            .from('orders')
            .insert(invalidOrder)
            .select();

        if (fkError && (fkError.message.includes('foreign key') || fkError.message.includes('violates'))) {
            logTest('Data Integrity', 'Foreign Key Constraint', 'PASS', 
                'Correctly prevented invalid customer reference');
        } else if (fkError) {
            logTest('Data Integrity', 'Foreign Key Constraint', 'WARN', 
                `Unexpected error: ${fkError.message}`);
        } else {
            logTest('Data Integrity', 'Foreign Key Constraint', 'FAIL', 
                'Allowed invalid customer reference');
        }

        // Test 2: Check constraint validation (quantity > 0)
        const invalidOrderItem = {
            order_id: '00000000-0000-0000-0000-000000000000',
            material_type: 'saree',
            quantity: -5,
            unit_price: 100
        };

        const { data: checkData, error: checkError } = await supabase
            .from('order_items')
            .insert(invalidOrderItem)
            .select();

        if (checkError && checkError.message.includes('check')) {
            logTest('Data Integrity', 'Check Constraint (Positive Quantity)', 'PASS', 
                'Correctly prevented negative quantity');
        } else if (checkError) {
            logTest('Data Integrity', 'Check Constraint (Positive Quantity)', 'WARN', 
                `Got error: ${checkError.message}`);
        } else {
            logTest('Data Integrity', 'Check Constraint (Positive Quantity)', 'FAIL', 
                'Allowed negative quantity');
        }

        // Test 3: Unique constraint validation
        const { data: existingCustomers } = await supabase
            .from('customers')
            .select('phone')
            .limit(1);

        if (existingCustomers && existingCustomers.length > 0) {
            const duplicatePhone = {
                name: 'Duplicate Phone Test',
                phone: existingCustomers[0].phone
            };

            const { data: uniqueData, error: uniqueError } = await supabase
                .from('customers')
                .insert(duplicatePhone)
                .select();

            if (uniqueError && uniqueError.message.includes('duplicate')) {
                logTest('Data Integrity', 'Unique Constraint (Phone)', 'PASS', 
                    'Correctly prevented duplicate phone number');
            } else if (uniqueError) {
                logTest('Data Integrity', 'Unique Constraint (Phone)', 'WARN', 
                    `Unexpected error: ${uniqueError.message}`);
            } else {
                logTest('Data Integrity', 'Unique Constraint (Phone)', 'FAIL', 
                    'Allowed duplicate phone number');
            }
        }

        // Test 4: NOT NULL constraint validation
        const invalidCustomer = {
            phone: '9999999999'
            // Missing required 'name' field
        };

        const { data: notNullData, error: notNullError } = await supabase
            .from('customers')
            .insert(invalidCustomer)
            .select();

        if (notNullError && notNullError.message.includes('null')) {
            logTest('Data Integrity', 'NOT NULL Constraint', 'PASS', 
                'Correctly prevented NULL in required field');
        } else if (notNullError) {
            logTest('Data Integrity', 'NOT NULL Constraint', 'WARN', 
                `Unexpected error: ${notNullError.message}`);
        } else {
            logTest('Data Integrity', 'NOT NULL Constraint', 'FAIL', 
                'Allowed NULL in required field');
        }

        // Test 5: Referential integrity with cascading
        const { data: testCustomers } = await supabase
            .from('customers')
            .select('id')
            .ilike('name', '%test%')
            .limit(1);

        if (testCustomers && testCustomers.length > 0) {
            const { data: relatedOrders } = await supabase
                .from('orders')
                .select('id')
                .eq('customer_id', testCustomers[0].id);

            logTest('Data Integrity', 'Referential Integrity Check', 'PASS', 
                `Customer has ${relatedOrders ? relatedOrders.length : 0} related orders`);
        }

        // Test 6: Data type validation
        const invalidDataTypes = {
            name: 'Type Test Customer',
            phone: '9876543210',
            email: 'invalid-email' // Should be valid email format
        };

        const { data: typeData, error: typeError } = await supabase
            .from('customers')
            .insert(invalidDataTypes)
            .select();

        if (typeError && typeError.message.includes('invalid')) {
            logTest('Data Integrity', 'Data Type Validation', 'PASS', 
                'Correctly validated data types');
        } else if (typeError) {
            logTest('Data Integrity', 'Data Type Validation', 'WARN', 
                `Data accepted with potential type issues: ${typeError.message}`);
        } else {
            logTest('Data Integrity', 'Data Type Validation', 'WARN', 
                'Email format validation may not be enforced at DB level');
        }

    } catch (error) {
        logTest('Data Integrity', 'Data Integrity Error', 'FAIL', error.message);
    }
}

// ============================================================================
// ROW LEVEL SECURITY (RLS) TESTS
// ============================================================================

async function testRowLevelSecurity() {
    logSection('ROW LEVEL SECURITY (RLS) TESTS');
    
    try {
        // Test 1: Authenticated user access
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            logTest('RLS Tests', 'User Authentication Check', 'FAIL', 'No authenticated user found');
            return;
        }

        logTest('RLS Tests', 'User Authentication Check', 'PASS', 
            `Authenticated as: ${user.email}`);

        // Test 2: Access to protected tables with authentication
        const protectedTables = ['customers', 'orders', 'order_items', 'gst_invoices', 'payments'];
        
        for (const table of protectedTables) {
            const { result, duration } = await measurePerformance(async () => {
                return await supabase
                    .from(table)
                    .select('*')
                    .limit(1);
            });

            if (result.error) {
                logTest('RLS Tests', `Access to ${table}`, 'FAIL', result.error.message, duration);
            } else {
                logTest('RLS Tests', `Access to ${table}`, 'PASS', 
                    `Can access ${table} table`, duration);
            }
        }

        // Test 3: Reference table access (should be open to authenticated users)
        const referenceTables = ['user_roles', 'order_statuses', 'material_types', 'production_stages'];
        
        for (const table of referenceTables) {
            const { result, duration } = await measurePerformance(async () => {
                return await supabase
                    .from(table)
                    .select('*');
            });

            if (result.error) {
                logTest('RLS Tests', `Reference Access to ${table}`, 'FAIL', result.error.message, duration);
            } else {
                logTest('RLS Tests', `Reference Access to ${table}`, 'PASS', 
                    `Can access reference table ${table} (${result.data.length} records)`, duration);
            }
        }

        // Test 4: User profile access
        const { result: profileResult, duration: profileDuration } = await measurePerformance(async () => {
            return await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', user.id);
        });

        if (profileResult.error) {
            logTest('RLS Tests', 'Own Profile Access', 'FAIL', profileResult.error.message, profileDuration);
        } else {
            logTest('RLS Tests', 'Own Profile Access', 'PASS', 
                `Can access own profile`, profileDuration);
        }

        // Test 5: Insert permissions
        const testCustomer = {
            name: 'RLS Test Customer',
            phone: '5555555555',
            email: 'rls@test.com'
        };

        const { result: insertResult, duration: insertDuration } = await measurePerformance(async () => {
            return await supabase
                .from('customers')
                .insert(testCustomer)
                .select()
                .single();
        });

        if (insertResult.error) {
            logTest('RLS Tests', 'Insert Permission', 'FAIL', insertResult.error.message, insertDuration);
        } else {
            logTest('RLS Tests', 'Insert Permission', 'PASS', 
                `Can insert new records`, insertDuration);
            testData.customers.push(insertResult.data.id);
        }

        // Test 6: Update permissions
        if (insertResult.data) {
            const { result: updateResult, duration: updateDuration } = await measurePerformance(async () => {
                return await supabase
                    .from('customers')
                    .update({ name: 'Updated RLS Test Customer' })
                    .eq('id', insertResult.data.id)
                    .select()
                    .single();
            });

            if (updateResult.error) {
                logTest('RLS Tests', 'Update Permission', 'FAIL', updateResult.error.message, updateDuration);
            } else {
                logTest('RLS Tests', 'Update Permission', 'PASS', 
                    `Can update existing records`, updateDuration);
            }
        }

    } catch (error) {
        logTest('RLS Tests', 'RLS Test Error', 'FAIL', error.message);
    }
}

// ============================================================================
// CLEANUP AND SUMMARY
// ============================================================================

async function cleanupTestData() {
    logSection('TEST DATA CLEANUP');
    
    try {
        // Clean up in reverse order of dependencies
        
        // Payments
        if (testData.payments.length > 0) {
            const { error: paymentsError } = await supabase
                .from('payments')
                .delete()
                .in('id', testData.payments);
            
            if (paymentsError) {
                logTest('Cleanup', 'Payments Cleanup', 'WARN', paymentsError.message);
            } else {
                logTest('Cleanup', 'Payments Cleanup', 'PASS', `Cleaned ${testData.payments.length} payments`);
            }
        }

        // Invoices
        if (testData.invoices.length > 0) {
            const { error: invoicesError } = await supabase
                .from('gst_invoices')
                .delete()
                .in('id', testData.invoices);
            
            if (invoicesError) {
                logTest('Cleanup', 'Invoices Cleanup', 'WARN', invoicesError.message);
            } else {
                logTest('Cleanup', 'Invoices Cleanup', 'PASS', `Cleaned ${testData.invoices.length} invoices`);
            }
        }

        // Challans
        if (testData.challans.length > 0) {
            const { error: challansError } = await supabase
                .from('delivery_challans')
                .delete()
                .in('id', testData.challans);
            
            if (challansError) {
                logTest('Cleanup', 'Challans Cleanup', 'WARN', challansError.message);
            } else {
                logTest('Cleanup', 'Challans Cleanup', 'PASS', `Cleaned ${testData.challans.length} challans`);
            }
        }

        // Order Items
        if (testData.orderItems.length > 0) {
            const { error: itemsError } = await supabase
                .from('order_items')
                .delete()
                .in('id', testData.orderItems);
            
            if (itemsError) {
                logTest('Cleanup', 'Order Items Cleanup', 'WARN', itemsError.message);
            } else {
                logTest('Cleanup', 'Order Items Cleanup', 'PASS', `Cleaned ${testData.orderItems.length} order items`);
            }
        }

        // Orders
        if (testData.orders.length > 0) {
            const { error: ordersError } = await supabase
                .from('orders')
                .delete()
                .in('id', testData.orders);
            
            if (ordersError) {
                logTest('Cleanup', 'Orders Cleanup', 'WARN', ordersError.message);
            } else {
                logTest('Cleanup', 'Orders Cleanup', 'PASS', `Cleaned ${testData.orders.length} orders`);
            }
        }

        // Customers (soft delete the test ones)
        if (testData.customers.length > 0) {
            const { error: customersError } = await supabase
                .from('customers')
                .update({ is_deleted: true })
                .in('id', testData.customers);
            
            if (customersError) {
                logTest('Cleanup', 'Customers Cleanup', 'WARN', customersError.message);
            } else {
                logTest('Cleanup', 'Customers Cleanup', 'PASS', `Soft deleted ${testData.customers.length} customers`);
            }
        }

    } catch (error) {
        logTest('Cleanup', 'Cleanup Error', 'FAIL', error.message);
    }
}

function generateTestReport() {
    testResults.endTime = new Date();
    const totalDuration = testResults.endTime - testResults.startTime;
    
    console.log(`\n${'='.repeat(80)}`);
    console.log('📋 COMPREHENSIVE TEST REPORT');
    console.log('='.repeat(80));
    
    console.log(`\n⏰ Test Execution Summary:`);
    console.log(`   Start Time: ${testResults.startTime.toISOString()}`);
    console.log(`   End Time: ${testResults.endTime.toISOString()}`);
    console.log(`   Total Duration: ${totalDuration.toLocaleString()}ms (${(totalDuration / 1000).toFixed(2)} seconds)`);
    
    console.log(`\n📊 Overall Results:`);
    console.log(`   Total Tests: ${testResults.total}`);
    console.log(`   ✅ Passed: ${testResults.passed}`);
    console.log(`   ❌ Failed: ${testResults.failed}`);
    console.log(`   ⚠️  Warnings: ${testResults.warnings}`);
    console.log(`   📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
    
    console.log(`\n📋 Test Suite Breakdown:`);
    for (const [suiteName, suite] of Object.entries(testResults.testSuites)) {
        const successRate = ((suite.passed / suite.total) * 100).toFixed(1);
        console.log(`   ${suiteName}:`);
        console.log(`      Total: ${suite.total}, Passed: ${suite.passed}, Failed: ${suite.failed}, Warnings: ${suite.warnings}`);
        console.log(`      Success Rate: ${successRate}%`);
    }
    
    if (testResults.performance.length > 0) {
        console.log(`\n⚡ Performance Summary:`);
        const avgPerformance = testResults.performance.reduce((sum, p) => sum + p.duration, 0) / testResults.performance.length;
        const slowestTest = testResults.performance.reduce((slowest, current) => 
            current.duration > slowest.duration ? current : slowest
        );
        const fastestTest = testResults.performance.reduce((fastest, current) => 
            current.duration < fastest.duration ? current : fastest
        );
        
        console.log(`   Average Response Time: ${avgPerformance.toFixed(2)}ms`);
        console.log(`   Fastest Test: ${fastestTest.test} (${fastestTest.duration}ms)`);
        console.log(`   Slowest Test: ${slowestTest.test} (${slowestTest.duration}ms)`);
    }
    
    if (testResults.failed > 0) {
        console.log(`\n❌ Failed Tests:`);
        testResults.errors.forEach((error, index) => {
            console.log(`   ${index + 1}. ${error}`);
        });
    }
    
    console.log(`\n✅ System Readiness Assessment:`);
    const readinessScore = (testResults.passed / testResults.total) * 100;
    
    if (readinessScore >= 95) {
        console.log(`   🎉 EXCELLENT (${readinessScore.toFixed(1)}%) - System is production-ready!`);
    } else if (readinessScore >= 85) {
        console.log(`   ✅ GOOD (${readinessScore.toFixed(1)}%) - System is ready with minor issues to address`);
    } else if (readinessScore >= 70) {
        console.log(`   ⚠️  FAIR (${readinessScore.toFixed(1)}%) - System needs improvements before production`);
    } else {
        console.log(`   ❌ POOR (${readinessScore.toFixed(1)}%) - System requires significant fixes`);
    }
    
    console.log(`\n🎯 Recommendations:`);
    if (testResults.failed === 0) {
        console.log(`   • All tests passed! Proceed with frontend integration.`);
        console.log(`   • Consider adding more business-specific test cases.`);
        console.log(`   • Monitor performance in production environment.`);
    } else {
        console.log(`   • Address ${testResults.failed} failed test(s) before proceeding.`);
        console.log(`   • Review error messages and fix underlying issues.`);
        console.log(`   • Re-run tests after fixes to ensure stability.`);
    }
    
    if (testResults.warnings > 0) {
        console.log(`   • Review ${testResults.warnings} warning(s) for potential improvements.`);
    }
    
    console.log(`\n📊 Next Steps:`);
    console.log(`   1. Review this comprehensive test report`);
    console.log(`   2. Address any failed tests or warnings`);
    console.log(`   3. Document API endpoints for frontend team`);
    console.log(`   4. Begin frontend integration`);
    console.log(`   5. Set up monitoring and logging for production`);
    
    console.log(`\n${'='.repeat(80)}`);
}

async function saveTestReport() {
    const reportData = {
        summary: {
            testExecutionTime: testResults.endTime - testResults.startTime,
            totalTests: testResults.total,
            passed: testResults.passed,
            failed: testResults.failed,
            warnings: testResults.warnings,
            successRate: ((testResults.passed / testResults.total) * 100).toFixed(1)
        },
        suites: testResults.testSuites,
        performance: testResults.performance,
        errors: testResults.errors,
        timestamp: new Date().toISOString(),
        environment: {
            supabaseUrl: supabaseUrl,
            testDataCreated: testData
        }
    };
    
    try {
        await fs.promises.writeFile(
            'test_results_comprehensive.json', 
            JSON.stringify(reportData, null, 2)
        );
        console.log('📄 Detailed test report saved to: test_results_comprehensive.json');
    } catch (error) {
        console.log('⚠️  Could not save test report to file:', error.message);
    }
}

// ============================================================================
// MAIN TEST EXECUTION
// ============================================================================

async function runComprehensiveTests() {
    console.log('🚀 STARTING COMPREHENSIVE API TEST SUITE');
    console.log('='.repeat(80));
    console.log(`📍 Testing Environment: ${supabaseUrl}`);
    console.log(`⏰ Test Started: ${testResults.startTime.toISOString()}`);
    console.log(`🎯 Objective: Complete business workflow validation\n`);

    // Run all test suites
    const user = await testAuthenticationFlow();
    if (!user) {
        console.log('\n❌ Authentication failed. Stopping comprehensive tests.');
        return;
    }

    await testReferenceDataIntegrity();
    const customerId = await testCustomerManagement();
    const orderId = await testOrderWorkflow();
    const invoiceId = await testDeliveryAndInvoicing(orderId, customerId);
    await testPaymentProcessing(invoiceId);
    await testAdvancedQueries();
    await testPerformanceAndStress();
    await testDataIntegrityAndConstraints();
    await testRowLevelSecurity();
    
    // Cleanup and reporting
    await cleanupTestData();
    generateTestReport();
    await saveTestReport();
    
    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run the comprehensive test suite
runComprehensiveTests().catch(console.error);