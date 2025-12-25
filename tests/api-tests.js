#!/usr/bin/env node
/**
 * Automated API Tests for Digital Textile Printing System
 * Tests all major API endpoints and RPC functions
 * Run: node api-tests.js
 */

const { createClient } = require('@supabase/supabase-js');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('Error: SUPABASE_ANON_KEY not found in .env file');
  console.error('Please copy .env.example to .env and fill in your Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test data storage
let testCustomerId;
let testOrderId;
let testStockId;
let testDesignTrackingId;

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('');
  log(colors.bold + colors.cyan, '═'.repeat(60));
  log(colors.bold + colors.cyan, `  ${title}`);
  log(colors.bold + colors.cyan, '═'.repeat(60));
}

function logTest(testNumber, testName) {
  log(colors.yellow, `\n▶ Test ${testNumber}: ${testName}`);
}

function logSuccess(message) {
  log(colors.green, `  ✓ ${message}`);
}

function logError(message) {
  log(colors.red, `  ✗ ${message}`);
}

function logInfo(message) {
  log(colors.blue, `  ℹ ${message}`);
}

// =============================================================================
// TEST CASES
// =============================================================================

async function test1_CreateCustomer() {
  logTest('1', 'Create Customer');

  const { data, error } = await supabase
    .from('customers')
    .insert({
      name: 'Automated Test Customer',
      phone: '9999999991',
      email: 'autotest@test.com',
      gst_number: '29AUTOTEST123Z',
      address: 'Automated Test Address',
      is_active: true
    })
    .select()
    .single();

  assert(!error, `Error creating customer: ${error?.message}`);
  assert(data.id, 'Customer ID should be generated');
  testCustomerId = data.id;

  logSuccess(`Customer created with ID: ${testCustomerId}`);
  logInfo(`Name: ${data.name}, Phone: ${data.phone}`);

  return data;
}

async function test2_CreateOrder() {
  logTest('2', 'Create Order with Auto-Generated Order Number');

  const { data, error } = await supabase
    .from('orders')
    .insert({
      customer_id: testCustomerId,
      ownership_type: 'customer_material',
      total_quantity: 60,
      status: 'active',
      order_date: new Date().toISOString(),
      notes: 'Automated test order - customer material'
    })
    .select()
    .single();

  assert(!error, `Error creating order: ${error?.message}`);
  assert(data.order_number, 'Order number should be auto-generated');
  assert(data.order_number.startsWith('ORD-'), 'Order number should start with ORD-');
  testOrderId = data.id;

  logSuccess(`Order created: ${data.order_number}`);
  logInfo(`Order ID: ${testOrderId}, Ownership: ${data.ownership_type}`);

  return data;
}

async function test3_ReceiveMaterial() {
  logTest('3', 'Receive Material (Customer Material)');

  const { data, error } = await supabase
    .from('material_in')
    .insert({
      customer_id: testCustomerId,
      order_id: testOrderId,
      material_type: 'SAREE',
      quantity: 60,
      ownership: 'customer',
      received_date: new Date().toISOString(),
      notes: 'Automated test - 60 sarees received'
    })
    .select()
    .single();

  assert(!error, `Error receiving material: ${error?.message}`);
  assert(data.quantity === 60, 'Quantity should be 60');

  logSuccess(`Material received: 60 SAREE`);
  logInfo(`Ownership: customer, Order linked: ${data.order_id ? 'Yes' : 'No'}`);

  return data;
}

async function test4_CreateStock() {
  logTest('4', 'Create Stock in Received Stage');

  const { data, error } = await supabase
    .from('material_stock')
    .insert({
      customer_id: testCustomerId,
      order_id: testOrderId,
      material_type: 'SAREE',
      stage: 'received',
      quantity: 60,
      ownership: 'customer',
      is_active: true
    })
    .select()
    .single();

  assert(!error, `Error creating stock: ${error?.message}`);
  assert(data.is_active === true, 'Stock should be active');
  assert(data.stage === 'received', 'Stock should be in received stage');
  testStockId = data.id;

  logSuccess(`Stock created in 'received' stage: 60 SAREE`);
  logInfo(`Stock ID: ${testStockId}, Active: ${data.is_active}`);

  return data;
}

async function test5_CreateDesignTracking() {
  logTest('5', 'Create Design Tracking Record');

  const { data, error } = await supabase
    .from('material_design_tracking')
    .insert({
      customer_id: testCustomerId,
      material_type: 'SAREE',
      total_quantity: 60,
      designs_given: 0,
      designs_pending: 60,
      batch_identifier: 'AUTO-TEST-BATCH'
    })
    .select()
    .single();

  assert(!error, `Error creating design tracking: ${error?.message}`);
  assert(data.designs_pending === 60, 'Should have 60 designs pending initially');
  testDesignTrackingId = data.id;

  logSuccess(`Design tracking created`);
  logInfo(`Given: 0, Pending: 60, Batch: AUTO-TEST-BATCH`);

  return data;
}

async function test6_UpdateDesignCount() {
  logTest('6', 'Update Design Count via RPC Function');

  const { data, error } = await supabase.rpc('update_design_count', {
    p_customer_id: testCustomerId,
    p_material_type: 'SAREE',
    p_designs_to_add: 35,
    p_batch_identifier: 'AUTO-TEST-BATCH'
  });

  assert(!error, `Error updating design count: ${error?.message}`);

  // Verify update
  const { data: tracking } = await supabase
    .from('material_design_tracking')
    .select('*')
    .eq('id', testDesignTrackingId)
    .single();

  assert(tracking.designs_given === 35, 'Should have 35 designs given');
  assert(tracking.designs_pending === 25, 'Should have 25 designs pending');

  logSuccess(`Design count updated successfully`);
  logInfo(`Given: ${tracking.designs_given}, Pending: ${tracking.designs_pending}`);

  return tracking;
}

async function test7_MoveStockToPreprocessing() {
  logTest('7', 'Move Stock via RPC Function (received → preprocessing)');

  const { data, error } = await supabase.rpc('move_stock_to_stage', {
    p_customer_id: testCustomerId,
    p_order_id: testOrderId,
    p_material_type: 'SAREE',
    p_from_stage: 'received',
    p_to_stage: 'preprocessing',
    p_quantity: 35,
    p_ownership: 'customer'
  });

  assert(!error, `Error moving stock: ${error?.message}`);

  // Verify movement
  const { data: activeStock } = await supabase
    .from('material_stock')
    .select('*')
    .eq('customer_id', testCustomerId)
    .eq('is_active', true)
    .order('stage');

  const receivedStock = activeStock.find(s => s.stage === 'received');
  const preprocessingStock = activeStock.find(s => s.stage === 'preprocessing');

  assert(receivedStock?.quantity === 25, 'Should have 25 remaining in received');
  assert(preprocessingStock?.quantity === 35, 'Should have 35 in preprocessing');

  logSuccess(`Stock moved: 35 SAREE from received to preprocessing`);
  logInfo(`Received: 25 (remaining), Preprocessing: 35 (new)`);
  logInfo(`Movement history preserved (old record marked inactive)`);

  return activeStock;
}

async function test8_VerifyMovementHistory() {
  logTest('8', 'Verify Movement History (All Records)');

  const { data: allStock } = await supabase
    .from('material_stock')
    .select('*')
    .eq('customer_id', testCustomerId)
    .eq('material_type', 'SAREE')
    .order('created_at', { ascending: false });

  assert(allStock.length > 2, 'Should have multiple records (active + history)');

  const activeRecords = allStock.filter(s => s.is_active);
  const inactiveRecords = allStock.filter(s => !s.is_active);

  assert(activeRecords.length === 2, 'Should have 2 active records');
  assert(inactiveRecords.length >= 1, 'Should have at least 1 inactive (historical) record');

  logSuccess(`Movement history verified`);
  logInfo(`Total records: ${allStock.length}`);
  logInfo(`Active records: ${activeRecords.length} (current stock)`);
  logInfo(`Inactive records: ${inactiveRecords.length} (historical movements)`);

  return allStock;
}

async function test9_GetOrderLifecycle() {
  logTest('9', 'Get Complete Order Lifecycle View');

  const { data, error } = await supabase
    .from('v_order_lifecycle')
    .select('*')
    .eq('customer_name', 'Automated Test Customer')
    .single();

  assert(!error, `Error getting order lifecycle: ${error?.message}`);
  assert(data.total_received === 60, 'Should show 60 total received');
  assert(data.stock_received === 25, 'Should show 25 in received stage');
  assert(data.stock_preprocessing === 35, 'Should show 35 in preprocessing stage');
  assert(data.total_designs_given === 35, 'Should show 35 designs given');
  assert(data.total_designs_pending === 25, 'Should show 25 designs pending');

  logSuccess(`Order lifecycle retrieved successfully`);
  logInfo(`Order Number: ${data.order_number}`);
  logInfo(`Total Received: ${data.total_received}`);
  logInfo(`Stock Breakdown:`);
  logInfo(`  - Received: ${data.stock_received}`);
  logInfo(`  - Preprocessing: ${data.stock_preprocessing}`);
  logInfo(`  - Printing: ${data.stock_printing}`);
  logInfo(`  - Postprocessing: ${data.stock_postprocessing}`);
  logInfo(`  - Completed: ${data.stock_completed}`);
  logInfo(`  - Delivered: ${data.stock_delivered}`);
  logInfo(`  - Misprint: ${data.stock_misprint}`);
  logInfo(`Design Status: ${data.total_designs_given} given, ${data.total_designs_pending} pending`);

  return data;
}

async function test10_GetPendingDesigns() {
  logTest('10', 'Get Pending Designs View');

  const { data, error } = await supabase
    .from('v_pending_designs')
    .select('*')
    .eq('customer_name', 'Automated Test Customer');

  assert(!error, `Error getting pending designs: ${error?.message}`);
  assert(data.length > 0, 'Should have records with pending designs');

  const pendingRecord = data[0];
  assert(pendingRecord.designs_pending === 25, 'Should show 25 designs pending');

  logSuccess(`Pending designs view retrieved`);
  logInfo(`Customer: ${pendingRecord.customer_name}`);
  logInfo(`Material: ${pendingRecord.material_type}`);
  logInfo(`Total Quantity: ${pendingRecord.total_quantity}`);
  logInfo(`Designs Given: ${pendingRecord.designs_given}`);
  logInfo(`Designs Pending: ${pendingRecord.designs_pending}`);
  logInfo(`Completion: ${pendingRecord.design_completion_pct}%`);

  return data;
}

async function test11_TestStockReconciliation() {
  logTest('11', 'Verify Stock Reconciliation');

  // Get total received
  const { data: materialIn } = await supabase
    .from('material_in')
    .select('quantity')
    .eq('customer_id', testCustomerId)
    .eq('material_type', 'SAREE');

  const totalReceived = materialIn.reduce((sum, item) => sum + item.quantity, 0);

  // Get total active stock across all stages
  const { data: activeStock } = await supabase
    .from('material_stock')
    .select('quantity, stage')
    .eq('customer_id', testCustomerId)
    .eq('material_type', 'SAREE')
    .eq('is_active', true);

  const totalInStock = activeStock.reduce((sum, item) => sum + item.quantity, 0);

  assert(totalReceived === totalInStock,
    `Reconciliation failed: Received (${totalReceived}) should equal Active Stock (${totalInStock})`);

  logSuccess(`Stock reconciliation passed`);
  logInfo(`Total Received: ${totalReceived}`);
  logInfo(`Total in Active Stock: ${totalInStock}`);
  logInfo(`Status: RECONCILED ✓`);

  return { totalReceived, totalInStock };
}

// =============================================================================
// CLEANUP
// =============================================================================

async function cleanup() {
  logSection('Cleanup: Removing Test Data');

  try {
    // Delete in reverse order of dependencies
    await supabase.from('material_stock').delete().eq('customer_id', testCustomerId);
    logInfo('Deleted material_stock records');

    await supabase.from('material_design_tracking').delete().eq('customer_id', testCustomerId);
    logInfo('Deleted material_design_tracking records');

    await supabase.from('material_in').delete().eq('customer_id', testCustomerId);
    logInfo('Deleted material_in records');

    await supabase.from('orders').delete().eq('customer_id', testCustomerId);
    logInfo('Deleted orders records');

    await supabase.from('customers').delete().eq('id', testCustomerId);
    logInfo('Deleted customer record');

    logSuccess('All test data cleaned up successfully');
  } catch (error) {
    logError(`Cleanup error: ${error.message}`);
  }
}

// =============================================================================
// TEST RUNNER
// =============================================================================

async function runAllTests() {
  const startTime = Date.now();

  try {
    logSection('🚀 Automated API Tests - Digital Textile Printing System');
    logInfo(`Supabase URL: ${SUPABASE_URL}`);
    logInfo(`Test Start Time: ${new Date().toLocaleString()}`);

    // Run all tests
    await test1_CreateCustomer();
    await test2_CreateOrder();
    await test3_ReceiveMaterial();
    await test4_CreateStock();
    await test5_CreateDesignTracking();
    await test6_UpdateDesignCount();
    await test7_MoveStockToPreprocessing();
    await test8_VerifyMovementHistory();
    await test9_GetOrderLifecycle();
    await test10_GetPendingDesigns();
    await test11_TestStockReconciliation();

    // Cleanup
    await cleanup();

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    logSection('✅ Test Results');
    log(colors.bold + colors.green, `  ALL TESTS PASSED!`);
    logInfo(`Total Tests: 11`);
    logInfo(`Duration: ${duration}s`);
    logInfo(`Test End Time: ${new Date().toLocaleString()}`);
    console.log('');

    // Generate test report
    const report = {
      timestamp: new Date().toISOString(),
      duration: `${duration}s`,
      totalTests: 11,
      passed: 11,
      failed: 0,
      status: 'SUCCESS'
    };

    fs.writeFileSync(
      path.join(__dirname, 'test-report.json'),
      JSON.stringify(report, null, 2)
    );

    logInfo('Test report saved to: tests/test-report.json');
    console.log('');

    process.exit(0);
  } catch (error) {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    logSection('❌ Test Failed');
    logError(`Error: ${error.message}`);
    log(colors.red, error.stack);

    // Attempt cleanup even on failure
    try {
      await cleanup();
    } catch (cleanupError) {
      logError(`Cleanup failed: ${cleanupError.message}`);
    }

    // Generate failure report
    const report = {
      timestamp: new Date().toISOString(),
      duration: `${duration}s`,
      totalTests: 11,
      passed: 0,
      failed: 1,
      status: 'FAILED',
      error: error.message
    };

    fs.writeFileSync(
      path.join(__dirname, 'test-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('');
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests };
