/**
 * COMPREHENSIVE PRODUCTION WORKFLOW API TEST SUITE
 * ===================================================
 * Tests all production workflow scenarios with the new logic:
 * - Pre-treatment can start without design
 * - Printing requires BOTH pre-treatment AND design
 * - All validation rules
 * - All possible status combinations
 *
 * Run with: node test_production_workflow_api.js
 */

const https = require('https');

// ========================================
// CONFIGURATION
// ========================================

const SUPABASE_URL = 'https://pvatfzwzfgioypdnqjay.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2YXRmend6Zmdpb3lwZG5xamF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjI1ODUsImV4cCI6MjA3MDkzODU4NX0.q3PgKkcsX5wXOys9aYwalhajH25uQ-gjCgVTZISi0Qs';

// Test tracking
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// ========================================
// HELPER FUNCTIONS
// ========================================

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SUPABASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ statusCode: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    error: '\x1b[31m',   // Red
    warning: '\x1b[33m', // Yellow
    reset: '\x1b[0m'
  };

  console.log(`${colors[type]}${message}${colors.reset}`);
}

function assert(condition, testName, details = '') {
  if (condition) {
    testResults.passed++;
    testResults.tests.push({ name: testName, status: 'PASSED', details });
    log(`✅ PASSED: ${testName}`, 'success');
    if (details) log(`   ${details}`, 'info');
  } else {
    testResults.failed++;
    testResults.tests.push({ name: testName, status: 'FAILED', details });
    log(`❌ FAILED: ${testName}`, 'error');
    if (details) log(`   ${details}`, 'error');
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ========================================
// TEST DATA SETUP
// ========================================

let testCustomerId = null;
let testOrderId = null;
let testOrderItemId = null;

async function setupTestData() {
  log('\n========================================', 'info');
  log('SETTING UP TEST DATA', 'info');
  log('========================================\n', 'info');

  // 1. Create test customer
  log('Creating test customer...', 'info');
  const customerResponse = await makeRequest('/rest/v1/customers', 'POST', {
    name: `Test Customer ${Date.now()}`,
    phone: '1234567890',
    email: `test${Date.now()}@example.com`
  });

  if (customerResponse.statusCode === 201 && customerResponse.data) {
    testCustomerId = customerResponse.data[0].id;
    log(`✓ Customer created: ${testCustomerId}`, 'success');
  } else {
    log(`✗ Failed to create customer`, 'error');
    throw new Error('Failed to setup test data');
  }

  await sleep(1000);

  // 2. Create test order
  log('Creating test order...', 'info');
  const orderResponse = await makeRequest('/rest/v1/orders', 'POST', {
    customer_id: testCustomerId,
    order_number: `TEST-ORD-${Date.now()}`,
    order_date: new Date().toISOString().split('T')[0],
    status: 'pending',
    total_amount: 10000,
    notes: 'Test order for workflow testing'
  });

  if (orderResponse.statusCode === 201 && orderResponse.data) {
    testOrderId = orderResponse.data[0].id;
    log(`✓ Order created: ${testOrderId}`, 'success');
  } else {
    log(`✗ Failed to create order`, 'error');
    throw new Error('Failed to setup test data');
  }

  await sleep(1000);

  // 3. Create test order item
  log('Creating test order item...', 'info');
  const orderItemResponse = await makeRequest('/rest/v1/order_items', 'POST', {
    order_id: testOrderId,
    material_type: 'saree',
    quantity: 50,
    unit_price: 200.00,
    design_status: 'pending_from_customer',
    production_status: 'pending'
  });

  if (orderItemResponse.statusCode === 201 && orderItemResponse.data) {
    testOrderItemId = orderItemResponse.data[0].id;
    log(`✓ Order item created: ${testOrderItemId}`, 'success');
  } else {
    log(`✗ Failed to create order item`, 'error');
    throw new Error('Failed to setup test data');
  }

  log('\n✅ Test data setup complete!\n', 'success');
}

// ========================================
// TEST SCENARIO 1: Start Pre-treatment Without Design
// ========================================

async function testScenario1() {
  log('\n========================================', 'info');
  log('TEST SCENARIO 1: Start Pre-treatment Without Design', 'warning');
  log('========================================\n', 'info');

  log('Initial state: design_status=pending, production_status=pending', 'info');
  log('Action: Update production_status to pre_treatment', 'info');
  log('Expected: Should succeed (pre-treatment can start without design)\n', 'info');

  const response = await makeRequest(
    `/rest/v1/order_items?id=eq.${testOrderItemId}`,
    'PATCH',
    { production_status: 'pre_treatment' }
  );

  assert(
    response.statusCode === 200 || response.statusCode === 204,
    'Scenario 1: Start pre-treatment without design',
    `Status code: ${response.statusCode}`
  );

  // Verify the update
  await sleep(1000);
  const verifyResponse = await makeRequest(`/rest/v1/order_items?id=eq.${testOrderItemId}&select=*`);
  const item = verifyResponse.data[0];

  assert(
    item.production_status === 'pre_treatment',
    'Scenario 1: Verify production_status updated',
    `Current: ${item.production_status}, Expected: pre_treatment`
  );

  assert(
    item.design_status === 'pending_from_customer',
    'Scenario 1: Verify design_status unchanged',
    `Current: ${item.design_status}, Expected: pending_from_customer`
  );
}

// ========================================
// TEST SCENARIO 2: Block Printing Without Design
// ========================================

async function testScenario2() {
  log('\n========================================', 'info');
  log('TEST SCENARIO 2: Block Printing Without Design', 'warning');
  log('========================================\n', 'info');

  log('Current state: design_status=pending, production_status=pre_treatment', 'info');
  log('Action: Try to update production_status to printing', 'info');
  log('Expected: Should fail with validation error\n', 'info');

  const response = await makeRequest(
    `/rest/v1/order_items?id=eq.${testOrderItemId}`,
    'PATCH',
    { production_status: 'printing' }
  );

  assert(
    response.statusCode === 400 || response.statusCode === 500,
    'Scenario 2: Block printing without design',
    `Status code: ${response.statusCode} (should be 400 or 500)`
  );

  // Check error message
  const errorMessage = response.data?.message || response.data?.error || JSON.stringify(response.data);
  const hasDesignError = errorMessage.toLowerCase().includes('design');

  assert(
    hasDesignError,
    'Scenario 2: Error message mentions design',
    `Error: ${errorMessage}`
  );
}

// ========================================
// TEST SCENARIO 3: Update Design to Received
// ========================================

async function testScenario3() {
  log('\n========================================', 'info');
  log('TEST SCENARIO 3: Update Design to Received', 'warning');
  log('========================================\n', 'info');

  log('Current state: design_status=pending', 'info');
  log('Action: Update design_status to design_received_from_customer', 'info');
  log('Expected: Should succeed\n', 'info');

  const response = await makeRequest(
    `/rest/v1/order_items?id=eq.${testOrderItemId}`,
    'PATCH',
    { design_status: 'design_received_from_customer' }
  );

  assert(
    response.statusCode === 200 || response.statusCode === 204,
    'Scenario 3: Update design to received',
    `Status code: ${response.statusCode}`
  );

  // Verify
  await sleep(1000);
  const verifyResponse = await makeRequest(`/rest/v1/order_items?id=eq.${testOrderItemId}&select=*`);
  const item = verifyResponse.data[0];

  assert(
    item.design_status === 'design_received_from_customer',
    'Scenario 3: Verify design_status updated',
    `Current: ${item.design_status}`
  );
}

// ========================================
// TEST SCENARIO 4: Still Block Printing (Design Received But Not Ready)
// ========================================

async function testScenario4() {
  log('\n========================================', 'info');
  log('TEST SCENARIO 4: Still Block Printing (Design Received Not Ready)', 'warning');
  log('========================================\n', 'info');

  log('Current state: design_status=design_received, production_status=pre_treatment', 'info');
  log('Action: Try to update production_status to printing', 'info');
  log('Expected: Should still fail (design not ready yet)\n', 'info');

  const response = await makeRequest(
    `/rest/v1/order_items?id=eq.${testOrderItemId}`,
    'PATCH',
    { production_status: 'printing' }
  );

  assert(
    response.statusCode === 400 || response.statusCode === 500,
    'Scenario 4: Block printing when design received but not ready',
    `Status code: ${response.statusCode}`
  );
}

// ========================================
// TEST SCENARIO 5: Approve Design
// ========================================

async function testScenario5() {
  log('\n========================================', 'info');
  log('TEST SCENARIO 5: Approve Design (Set to Ready)', 'warning');
  log('========================================\n', 'info');

  log('Current state: design_status=design_received', 'info');
  log('Action: Update design_status to design_ready', 'info');
  log('Expected: Should succeed\n', 'info');

  const response = await makeRequest(
    `/rest/v1/order_items?id=eq.${testOrderItemId}`,
    'PATCH',
    { design_status: 'design_ready' }
  );

  assert(
    response.statusCode === 200 || response.statusCode === 204,
    'Scenario 5: Approve design',
    `Status code: ${response.statusCode}`
  );

  // Verify
  await sleep(1000);
  const verifyResponse = await makeRequest(`/rest/v1/order_items?id=eq.${testOrderItemId}&select=*`);
  const item = verifyResponse.data[0];

  assert(
    item.design_status === 'design_ready',
    'Scenario 5: Verify design_status updated to ready',
    `Current: ${item.design_status}`
  );
}

// ========================================
// TEST SCENARIO 6: Allow Printing When Both Ready
// ========================================

async function testScenario6() {
  log('\n========================================', 'info');
  log('TEST SCENARIO 6: Allow Printing When Both Ready', 'warning');
  log('========================================\n', 'info');

  log('Current state: design_status=design_ready, production_status=pre_treatment', 'info');
  log('Action: Update production_status to printing', 'info');
  log('Expected: Should succeed (both conditions met)\n', 'info');

  const response = await makeRequest(
    `/rest/v1/order_items?id=eq.${testOrderItemId}`,
    'PATCH',
    { production_status: 'printing' }
  );

  assert(
    response.statusCode === 200 || response.statusCode === 204,
    'Scenario 6: Allow printing when both ready',
    `Status code: ${response.statusCode}`
  );

  // Verify
  await sleep(1000);
  const verifyResponse = await makeRequest(`/rest/v1/order_items?id=eq.${testOrderItemId}&select=*`);
  const item = verifyResponse.data[0];

  assert(
    item.production_status === 'printing',
    'Scenario 6: Verify production_status updated to printing',
    `Current: ${item.production_status}`
  );
}

// ========================================
// TEST SCENARIO 7: Move to Post-processing
// ========================================

async function testScenario7() {
  log('\n========================================', 'info');
  log('TEST SCENARIO 7: Move to Post-processing', 'warning');
  log('========================================\n', 'info');

  const response = await makeRequest(
    `/rest/v1/order_items?id=eq.${testOrderItemId}`,
    'PATCH',
    { production_status: 'post_process' }
  );

  assert(
    response.statusCode === 200 || response.statusCode === 204,
    'Scenario 7: Move to post-processing',
    `Status code: ${response.statusCode}`
  );
}

// ========================================
// TEST SCENARIO 8: Mark as Completed
// ========================================

async function testScenario8() {
  log('\n========================================', 'info');
  log('TEST SCENARIO 8: Mark as Completed', 'warning');
  log('========================================\n', 'info');

  const response = await makeRequest(
    `/rest/v1/order_items?id=eq.${testOrderItemId}`,
    'PATCH',
    { production_status: 'completed' }
  );

  assert(
    response.statusCode === 200 || response.statusCode === 204,
    'Scenario 8: Mark as completed',
    `Status code: ${response.statusCode}`
  );
}

// ========================================
// TEST SCENARIO 9: Test RPC Function - can_progress_to_next_stage
// ========================================

async function testScenario9() {
  log('\n========================================', 'info');
  log('TEST SCENARIO 9: Test RPC Function - can_progress_to_next_stage', 'warning');
  log('========================================\n', 'info');

  const response = await makeRequest(
    `/rest/v1/rpc/can_progress_to_next_stage`,
    'POST',
    { p_order_item_id: testOrderItemId }
  );

  assert(
    response.statusCode === 200,
    'Scenario 9: RPC function callable',
    `Status code: ${response.statusCode}`
  );

  if (response.data) {
    log(`Response: ${JSON.stringify(response.data, null, 2)}`, 'info');
  }
}

// ========================================
// TEST SCENARIO 10: Test Status Summary Function
// ========================================

async function testScenario10() {
  log('\n========================================', 'info');
  log('TEST SCENARIO 10: Test get_production_status_summary Function', 'warning');
  log('========================================\n', 'info');

  const response = await makeRequest('/rest/v1/rpc/get_production_status_summary', 'POST', {});

  assert(
    response.statusCode === 200,
    'Scenario 10: Status summary function callable',
    `Status code: ${response.statusCode}`
  );

  if (response.data) {
    log(`Summary:`, 'info');
    response.data.forEach((row, idx) => {
      log(`  ${idx + 1}. ${row.status_label}: ${row.item_count} items`, 'info');
    });
  }
}

// ========================================
// TEST SCENARIO 11: Test Combined Status View
// ========================================

async function testScenario11() {
  log('\n========================================', 'info');
  log('TEST SCENARIO 11: Test order_items_combined_status View', 'warning');
  log('========================================\n', 'info');

  const response = await makeRequest(
    `/rest/v1/order_items_combined_status?id=eq.${testOrderItemId}&select=*`
  );

  assert(
    response.statusCode === 200,
    'Scenario 11: Combined status view accessible',
    `Status code: ${response.statusCode}`
  );

  if (response.data && response.data.length > 0) {
    const item = response.data[0];
    log(`Combined Status: ${item.combined_status_label}`, 'info');
    log(`Priority: ${item.priority}`, 'info');
    log(`Is Blocked: ${item.is_blocked}`, 'info');
  }
}

// ========================================
// CLEANUP
// ========================================

async function cleanup() {
  log('\n========================================', 'info');
  log('CLEANING UP TEST DATA', 'info');
  log('========================================\n', 'info');

  if (testOrderItemId) {
    await makeRequest(`/rest/v1/order_items?id=eq.${testOrderItemId}`, 'DELETE');
    log('✓ Deleted test order item', 'success');
  }

  if (testOrderId) {
    await makeRequest(`/rest/v1/orders?id=eq.${testOrderId}`, 'DELETE');
    log('✓ Deleted test order', 'success');
  }

  if (testCustomerId) {
    await makeRequest(`/rest/v1/customers?id=eq.${testCustomerId}`, 'DELETE');
    log('✓ Deleted test customer', 'success');
  }
}

// ========================================
// PRINT RESULTS
// ========================================

function printResults() {
  log('\n========================================', 'info');
  log('TEST RESULTS SUMMARY', 'info');
  log('========================================\n', 'info');

  log(`Total Tests: ${testResults.passed + testResults.failed}`, 'info');
  log(`Passed: ${testResults.passed}`, 'success');
  log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'error' : 'success');
  log(`Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2)}%\n`, 'info');

  if (testResults.failed > 0) {
    log('FAILED TESTS:', 'error');
    testResults.tests
      .filter(t => t.status === 'FAILED')
      .forEach(t => {
        log(`  ❌ ${t.name}`, 'error');
        if (t.details) log(`     ${t.details}`, 'error');
      });
  }

  log('\n========================================', 'info');
  log(testResults.failed === 0 ? '✅ ALL TESTS PASSED!' : '❌ SOME TESTS FAILED', testResults.failed === 0 ? 'success' : 'error');
  log('========================================\n', 'info');
}

// ========================================
// MAIN TEST RUNNER
// ========================================

async function runAllTests() {
  try {
    log('\n╔════════════════════════════════════════════════════════╗', 'info');
    log('║  PRODUCTION WORKFLOW API TEST SUITE                  ║', 'info');
    log('║  Testing New Production Workflow Logic               ║', 'info');
    log('╚════════════════════════════════════════════════════════╝\n', 'info');

    await setupTestData();

    await testScenario1();  // Start pre-treatment without design
    await testScenario2();  // Block printing without design
    await testScenario3();  // Update design to received
    await testScenario4();  // Still block printing
    await testScenario5();  // Approve design
    await testScenario6();  // Allow printing when both ready
    await testScenario7();  // Move to post-processing
    await testScenario8();  // Mark as completed
    await testScenario9();  // Test RPC function
    await testScenario10(); // Test status summary
    await testScenario11(); // Test combined status view

    await cleanup();

    printResults();

  } catch (error) {
    log(`\n❌ ERROR: ${error.message}`, 'error');
    log(error.stack, 'error');
    process.exit(1);
  }
}

// Run all tests
runAllTests();
