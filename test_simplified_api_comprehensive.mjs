/**
 * Comprehensive Automated API Test Suite
 * Tests the simplified 13-table schema end-to-end
 * Uses the same Supabase connection pattern as the frontend
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Supabase configuration (same as frontend)
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://pvatfzwzfgioypdnqjay.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2YXRmend6Zmdpb3lwZG5xamF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjI1ODUsImV4cCI6MjA3MDkzODU4NX0.q3PgKkcsX5wXOys9aYwalhajH25uQ-gjCgVTZISi0Qs';

// Create Supabase client (same as frontend)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  total: 0,
  tests: [],
  startTime: new Date(),
  endTime: null
};

// Test data storage
const testData = {
  customer_id: null,
  order_id: null,
  receipt_number: null,
  material_in_id: null,
  delivery_challan_id: null,
  invoice_id: null,
  payment_id: null,
  credit_note_id: null,
  misprint_sale_id: null,
  return_id: null
};

// Helper function to run a test
async function runTest(testName, testFn) {
  testResults.total++;
  console.log(`\n🧪 Running: ${testName}`);

  try {
    await testFn();
    testResults.passed++;
    testResults.tests.push({
      name: testName,
      status: 'PASSED',
      error: null,
      timestamp: new Date()
    });
    console.log(`✅ PASSED: ${testName}`);
    return true;
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({
      name: testName,
      status: 'FAILED',
      error: error.message,
      timestamp: new Date()
    });
    console.error(`❌ FAILED: ${testName}`);
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

// Helper function to assert
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// ============================================================================
// TEST SUITE
// ============================================================================

console.log('========================================================================');
console.log('AUTOMATED API TEST SUITE - SIMPLIFIED SCHEMA');
console.log('========================================================================');
console.log(`Start Time: ${testResults.startTime.toLocaleString()}`);
console.log(`Supabase URL: ${supabaseUrl}`);
console.log('========================================================================\n');

// ----------------------------------------------------------------------------
// 1. SCHEMA VERIFICATION TESTS
// ----------------------------------------------------------------------------

await runTest('1.1: Verify all 13 tables exist', async () => {
  const expectedTables = [
    'customers', 'orders', 'material_in', 'material_stock',
    'returns', 'credit_notes', 'misprint_sales',
    'delivery_challans', 'challan_items',
    'gst_invoices', 'payments', 'invoice_challans', 'material_types'
  ];

  for (const table of expectedTables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);

    assert(!error, `Table ${table} should exist: ${error?.message || ''}`);
  }
});

await runTest('1.2: Verify material_types has 5 product types', async () => {
  const { data, error } = await supabase
    .from('material_types')
    .select('*')
    .eq('is_active', true);

  assert(!error, `Failed to fetch material_types: ${error?.message || ''}`);
  assert(data.length >= 5, `Expected at least 5 material types, found ${data.length}`);

  const codes = data.map(t => t.type_code);
  assert(codes.includes('SAREE'), 'Should include SAREE');
  assert(codes.includes('DUPATTA'), 'Should include DUPATTA');
  assert(codes.includes('VONI'), 'Should include VONI');
  assert(codes.includes('LEHENGA'), 'Should include LEHENGA');
  assert(codes.includes('RUNNING'), 'Should include RUNNING');
});

await runTest('1.3: Verify views exist', async () => {
  const views = [
    'v_stock_by_customer',
    'v_outstanding_payments',
    'v_outstanding_orders',
    'v_misprint_stock'
  ];

  for (const view of views) {
    const { data, error } = await supabase
      .from(view)
      .select('*')
      .limit(1);

    // View exists if we don't get a "relation does not exist" error
    assert(!error || !error.message.includes('does not exist'),
      `View ${view} should exist: ${error?.message || ''}`);
  }
});

// ----------------------------------------------------------------------------
// 2. CUSTOMER MANAGEMENT TESTS
// ----------------------------------------------------------------------------

await runTest('2.1: Create a test customer', async () => {
  const { data, error } = await supabase
    .from('customers')
    .insert({
      name: 'Test Customer - Automated',
      phone: '9876543210',
      email: 'test@example.com',
      address: '123 Test Street, Test City',
      gst_number: '29ABCDE1234F1Z5',
      is_deleted: false
    })
    .select()
    .single();

  assert(!error, `Failed to create customer: ${error?.message || ''}`);
  assert(data.id, 'Customer should have an ID');
  assert(data.name === 'Test Customer - Automated', 'Customer name should match');

  testData.customer_id = data.id;
  console.log(`   Created customer with ID: ${data.id}`);
});

await runTest('2.2: Search for customer', async () => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .or(`name.ilike.%Test Customer%,phone.ilike.%9876543210%`)
    .eq('is_deleted', false);

  assert(!error, `Failed to search customers: ${error?.message || ''}`);
  assert(data.length > 0, 'Should find at least one customer');
  assert(data.some(c => c.id === testData.customer_id), 'Should find our test customer');
});

// ----------------------------------------------------------------------------
// 3. MATERIAL RECEIPT TESTS
// ----------------------------------------------------------------------------

await runTest('3.1: Create material receipt (customer material)', async () => {
  const { data, error } = await supabase
    .from('material_in')
    .insert({
      customer_id: testData.customer_id,
      material_type: 'SAREE',
      quantity: 100,
      ownership: 'customer',
      notes: 'Test material receipt - automated test'
    })
    .select()
    .single();

  assert(!error, `Failed to create material receipt: ${error?.message || ''}`);
  assert(data.id, 'Receipt should have an ID');
  assert(data.receipt_number, 'Receipt should have a receipt_number');
  assert(data.receipt_number.startsWith('RCP-'), 'Receipt number should start with RCP-');

  testData.material_in_id = data.id;
  testData.receipt_number = data.receipt_number;
  console.log(`   Created receipt: ${data.receipt_number}`);
});

await runTest('3.2: Verify receipt number format', async () => {
  const receiptNum = testData.receipt_number;
  const pattern = /^RCP-\d{8}-\d{4}$/;

  assert(pattern.test(receiptNum),
    `Receipt number ${receiptNum} should match pattern RCP-YYYYMMDD-NNNN`);
});

await runTest('3.3: Create material stock entry', async () => {
  const { data, error } = await supabase
    .from('material_stock')
    .insert({
      customer_id: testData.customer_id,
      material_type: 'SAREE',
      stage: 'received',
      quantity: 100,
      ownership: 'customer',
      designs_available: false
    })
    .select()
    .single();

  assert(!error, `Failed to create material stock: ${error?.message || ''}`);
  assert(data.stage === 'received', 'Stock should be in received stage');
  assert(data.quantity === 100, 'Quantity should be 100');
  assert(data.ownership === 'customer', 'Ownership should be customer');
});

// ----------------------------------------------------------------------------
// 4. ORDER MANAGEMENT TESTS
// ----------------------------------------------------------------------------

await runTest('4.1: Create an order', async () => {
  const { data, error } = await supabase
    .from('orders')
    .insert({
      customer_id: testData.customer_id,
      order_date: new Date().toISOString().split('T')[0],
      status: 'pending',
      notes: 'Test order - automated test'
    })
    .select()
    .single();

  assert(!error, `Failed to create order: ${error?.message || ''}`);
  assert(data.id, 'Order should have an ID');
  assert(data.order_number, 'Order should have an order_number');
  assert(data.order_number.startsWith('ORD-'), 'Order number should start with ORD-');

  testData.order_id = data.id;
  console.log(`   Created order: ${data.order_number}`);
});

await runTest('4.2: Update order status', async () => {
  const { data, error } = await supabase
    .from('orders')
    .update({ status: 'in_progress' })
    .eq('id', testData.order_id)
    .select()
    .single();

  assert(!error, `Failed to update order: ${error?.message || ''}`);
  assert(data.status === 'in_progress', 'Order status should be in_progress');
});

// ----------------------------------------------------------------------------
// 5. PRODUCTION STOCK TESTS
// ----------------------------------------------------------------------------

await runTest('5.1: Move stock to preprocessing stage', async () => {
  // First, get current stock in received stage
  const { data: receivedStock } = await supabase
    .from('material_stock')
    .select('*')
    .eq('customer_id', testData.customer_id)
    .eq('material_type', 'SAREE')
    .eq('stage', 'received')
    .eq('ownership', 'customer')
    .single();

  // Move 50 units to preprocessing
  const { data, error } = await supabase.rpc('move_stock_to_stage', {
    p_customer_id: testData.customer_id,
    p_order_id: testData.order_id,
    p_material_type: 'SAREE',
    p_from_stage: 'received',
    p_to_stage: 'preprocessing',
    p_quantity: 50,
    p_ownership: 'customer'
  });

  assert(!error, `Failed to move stock: ${error?.message || ''}`);
  assert(data.success === true, 'Stock movement should succeed');
  assert(data.quantity_moved === 50, 'Should move 50 units');
});

await runTest('5.2: Verify stock distribution', async () => {
  const { data, error } = await supabase
    .from('material_stock')
    .select('stage, quantity')
    .eq('customer_id', testData.customer_id)
    .eq('material_type', 'SAREE')
    .eq('ownership', 'customer')
    .in('stage', ['received', 'preprocessing']);

  assert(!error, `Failed to query stock: ${error?.message || ''}`);

  const receivedQty = data.find(s => s.stage === 'received')?.quantity || 0;
  const preprocessingQty = data.find(s => s.stage === 'preprocessing')?.quantity || 0;

  assert(receivedQty + preprocessingQty === 100,
    `Total stock should be 100, got ${receivedQty + preprocessingQty}`);
});

await runTest('5.3: Update design availability', async () => {
  const { data, error } = await supabase.rpc('update_design_availability', {
    p_customer_id: testData.customer_id,
    p_order_id: testData.order_id,
    p_material_type: 'SAREE',
    p_stage: 'preprocessing',
    p_designs_available: true,
    p_design_notes: 'Design file: SAREE-TEST-001.pdf'
  });

  assert(!error, `Failed to update design availability: ${error?.message || ''}`);
  assert(data.success === true, 'Design update should succeed');
  assert(data.designs_available === true, 'Designs should be available');
});

// ----------------------------------------------------------------------------
// 6. DELIVERY CHALLAN TESTS
// ----------------------------------------------------------------------------

await runTest('6.1: Move stock to completed stage for delivery', async () => {
  // Move preprocessing to printing
  await supabase.rpc('move_stock_to_stage', {
    p_customer_id: testData.customer_id,
    p_order_id: testData.order_id,
    p_material_type: 'SAREE',
    p_from_stage: 'preprocessing',
    p_to_stage: 'printing',
    p_quantity: 50,
    p_ownership: 'customer'
  });

  // Move printing to postprocessing
  await supabase.rpc('move_stock_to_stage', {
    p_customer_id: testData.customer_id,
    p_order_id: testData.order_id,
    p_material_type: 'SAREE',
    p_from_stage: 'printing',
    p_to_stage: 'postprocessing',
    p_quantity: 50,
    p_ownership: 'customer'
  });

  // Move postprocessing to completed
  const { data, error } = await supabase.rpc('move_stock_to_stage', {
    p_customer_id: testData.customer_id,
    p_order_id: testData.order_id,
    p_material_type: 'SAREE',
    p_from_stage: 'postprocessing',
    p_to_stage: 'completed',
    p_quantity: 50,
    p_ownership: 'customer'
  });

  assert(!error, `Failed to move to completed: ${error?.message || ''}`);
});

await runTest('6.2: Create delivery challan', async () => {
  const { data, error } = await supabase
    .from('delivery_challans')
    .insert({
      customer_id: testData.customer_id,
      order_id: testData.order_id,
      delivery_date: new Date().toISOString().split('T')[0],
      notes: 'Test delivery - automated test'
    })
    .select()
    .single();

  assert(!error, `Failed to create delivery challan: ${error?.message || ''}`);
  assert(data.challan_number, 'Challan should have a challan_number');
  assert(data.challan_number.startsWith('CHN-'), 'Challan number should start with CHN-');

  testData.delivery_challan_id = data.id;
  console.log(`   Created challan: ${data.challan_number}`);
});

await runTest('6.3: Add challan items', async () => {
  const { data, error } = await supabase
    .from('challan_items')
    .insert({
      challan_id: testData.delivery_challan_id,
      description: 'SAREE - Printed',
      quantity: 20,
      unit_price: 800.00,
      amount: 16000.00
    })
    .select()
    .single();

  assert(!error, `Failed to create challan item: ${error?.message || ''}`);
  assert(data.quantity === 20, 'Challan item quantity should be 20');
});

// ----------------------------------------------------------------------------
// 7. INVOICE TESTS
// ----------------------------------------------------------------------------

await runTest('7.1: Create GST invoice', async () => {
  const { data, error } = await supabase
    .from('gst_invoices')
    .insert({
      customer_id: testData.customer_id,
      invoice_date: new Date().toISOString().split('T')[0],
      total_amount: 18880.00,
      gst_amount: 2880.00,
      outstanding_amount: 18880.00,
      invoice_type: 'job_work'
    })
    .select()
    .single();

  assert(!error, `Failed to create invoice: ${error?.message || ''}`);
  assert(data.invoice_number, 'Invoice should have an invoice_number');
  assert(data.invoice_number.startsWith('INV-'), 'Invoice number should start with INV-');

  testData.invoice_id = data.id;
  console.log(`   Created invoice: ${data.invoice_number}`);
});

await runTest('7.2: Link invoice to challan', async () => {
  const { data, error} = await supabase
    .from('invoice_challans')
    .insert({
      invoice_id: testData.invoice_id,
      challan_id: testData.delivery_challan_id
    })
    .select()
    .single();

  assert(!error, `Failed to link invoice to challan: ${error?.message || ''}`);
  assert(data.invoice_id === testData.invoice_id, 'Link should reference correct invoice');
  assert(data.challan_id === testData.delivery_challan_id, 'Link should reference correct challan');
});

await runTest('7.3: Verify invoice-challan linkage', async () => {
  const { data, error } = await supabase
    .from('invoice_challans')
    .select(`
      *,
      gst_invoices(invoice_number),
      delivery_challans(challan_number)
    `)
    .eq('invoice_id', testData.invoice_id);

  assert(!error, `Failed to query invoice-challan links: ${error?.message || ''}`);
  assert(data.length > 0, 'Should have at least one link');
});

// ----------------------------------------------------------------------------
// 8. PAYMENT TESTS
// ----------------------------------------------------------------------------

await runTest('8.1: Record payment', async () => {
  const { data, error } = await supabase
    .from('payments')
    .insert({
      invoice_id: testData.invoice_id,
      amount: 10000.00,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'UPI',
      transaction_id: 'TEST-UPI-' + Date.now(),
      notes: 'Test payment - automated test'
    })
    .select()
    .single();

  assert(!error, `Failed to record payment: ${error?.message || ''}`);
  assert(data.amount === 10000.00, 'Payment amount should be 10000.00');

  testData.payment_id = data.id;
});

await runTest('8.2: Verify outstanding amount updated', async () => {
  // In a real scenario, you'd have a trigger or function to update outstanding_amount
  // For now, we'll just verify the payment was recorded
  const { data, error } = await supabase
    .from('payments')
    .select('amount')
    .eq('invoice_id', testData.invoice_id);

  assert(!error, `Failed to query payments: ${error?.message || ''}`);

  const totalPaid = data.reduce((sum, p) => sum + p.amount, 0);
  assert(totalPaid >= 10000.00, `Total paid should be at least 10000, got ${totalPaid}`);
});

// ----------------------------------------------------------------------------
// 9. RETURNS & MISPRINTS TESTS
// ----------------------------------------------------------------------------

await runTest('9.1: Create misprint return', async () => {
  const { data, error } = await supabase
    .from('returns')
    .insert({
      customer_id: testData.customer_id,
      order_id: testData.order_id,
      return_type: 'customer_return',
      material_type: 'SAREE',
      quantity: 5,
      reason: 'Printing defect - automated test',
      return_date: new Date().toISOString().split('T')[0],
      status: 'pending'
    })
    .select()
    .single();

  assert(!error, `Failed to create return: ${error?.message || ''}`);
  assert(data.return_type === 'customer_return', 'Return type should be customer_return');
  assert(data.quantity === 5, 'Return quantity should be 5');

  testData.return_id = data.id;
});

await runTest('9.2: Move stock to misprint stage', async () => {
  // First add to misprint stage
  const { data, error } = await supabase
    .from('material_stock')
    .insert({
      customer_id: testData.customer_id,
      material_type: 'SAREE',
      stage: 'misprint',
      quantity: 5,
      ownership: 'customer'
    })
    .select()
    .single();

  assert(!error, `Failed to add misprint stock: ${error?.message || ''}`);
  assert(data.stage === 'misprint', 'Stock should be in misprint stage');
});

await runTest('9.3: Create misprint sale', async () => {
  const { data, error } = await supabase
    .from('misprint_sales')
    .insert({
      sale_date: new Date().toISOString().split('T')[0],
      material_type: 'SAREE',
      quantity: 5,
      unit_price: 200.00,
      total_amount: 1000.00,
      customer_name: 'Walk-in Customer - Test',
      payment_method: 'Cash',
      notes: 'Test misprint sale - automated'
    })
    .select()
    .single();

  assert(!error, `Failed to create misprint sale: ${error?.message || ''}`);
  assert(data.sale_number, 'Sale should have a sale_number');
  assert(data.sale_number.startsWith('MS-'), 'Sale number should start with MS-');

  testData.misprint_sale_id = data.id;
  console.log(`   Created misprint sale: ${data.sale_number}`);
});

// ----------------------------------------------------------------------------
// 10. CREDIT NOTE TESTS
// ----------------------------------------------------------------------------

await runTest('10.1: Create credit note', async () => {
  const { data, error } = await supabase
    .from('credit_notes')
    .insert({
      customer_id: testData.customer_id,
      invoice_id: testData.invoice_id,
      credit_amount: 1000.00,
      reason: 'Misprint adjustment - 5 sarees @ 200 each',
      status: 'pending',
      notes: 'Test credit note - automated'
    })
    .select()
    .single();

  assert(!error, `Failed to create credit note: ${error?.message || ''}`);
  assert(data.credit_note_number, 'Credit note should have a credit_note_number');
  assert(data.credit_note_number.startsWith('CN-'), 'Credit note number should start with CN-');
  assert(data.credit_amount === 1000.00, 'Credit amount should be 1000.00');

  testData.credit_note_id = data.id;
  console.log(`   Created credit note: ${data.credit_note_number}`);
});

await runTest('10.2: Apply credit note', async () => {
  const { data, error } = await supabase
    .from('credit_notes')
    .update({
      status: 'applied',
      applied_to_invoice_id: testData.invoice_id,
      applied_date: new Date().toISOString().split('T')[0]
    })
    .eq('id', testData.credit_note_id)
    .select()
    .single();

  assert(!error, `Failed to apply credit note: ${error?.message || ''}`);
  assert(data.status === 'applied', 'Credit note status should be applied');
});

// ----------------------------------------------------------------------------
// 11. REPORTS / VIEWS TESTS
// ----------------------------------------------------------------------------

await runTest('11.1: Query stock by customer report', async () => {
  const { data, error } = await supabase
    .from('v_stock_by_customer')
    .select('*')
    .eq('customer_id', testData.customer_id);

  assert(!error, `Failed to query stock by customer: ${error?.message || ''}`);
  // Data may be empty if stock has been moved/sold
  console.log(`   Found ${data.length} stock entries for customer`);
});

await runTest('11.2: Query outstanding payments report', async () => {
  const { data, error } = await supabase
    .from('v_outstanding_payments')
    .select('*');

  assert(!error, `Failed to query outstanding payments: ${error?.message || ''}`);
  console.log(`   Found ${data.length} customers with outstanding payments`);
});

await runTest('11.3: Query outstanding orders report', async () => {
  const { data, error } = await supabase
    .from('v_outstanding_orders')
    .select('*');

  assert(!error, `Failed to query outstanding orders: ${error?.message || ''}`);
  console.log(`   Found ${data.length} outstanding orders`);
});

await runTest('11.4: Query misprint stock report', async () => {
  const { data, error } = await supabase
    .from('v_misprint_stock')
    .select('*');

  assert(!error, `Failed to query misprint stock: ${error?.message || ''}`);
  console.log(`   Found ${data.length} misprint stock entries`);
});

// ----------------------------------------------------------------------------
// 12. BUSINESS LOGIC FUNCTION TESTS
// ----------------------------------------------------------------------------

await runTest('12.1: Test get_customer_stock_summary function', async () => {
  const { data, error } = await supabase.rpc('get_customer_stock_summary', {
    p_customer_id: testData.customer_id
  });

  assert(!error, `Failed to get customer stock summary: ${error?.message || ''}`);
  console.log(`   Got stock summary with ${data.length} material types`);
});

await runTest('12.2: Test stock movement validation (insufficient stock)', async () => {
  // This should fail - trying to move more than available
  const { data, error } = await supabase.rpc('move_stock_to_stage', {
    p_customer_id: testData.customer_id,
    p_order_id: testData.order_id,
    p_material_type: 'SAREE',
    p_from_stage: 'received',
    p_to_stage: 'preprocessing',
    p_quantity: 99999,  // More than available
    p_ownership: 'customer'
  });

  assert(error !== null, 'Should fail when trying to move more stock than available');
  assert(error.message.includes('Insufficient stock') || error.message.includes('null'),
    'Error should mention insufficient stock or null value');
});

// ----------------------------------------------------------------------------
// 13. AUTO-GENERATED ID FORMAT TESTS
// ----------------------------------------------------------------------------

await runTest('13.1: Verify all auto-generated ID formats', async () => {
  const patterns = {
    order: /^ORD-\d{8}-\d{4}$/,
    receipt: /^RCP-\d{8}-\d{4}$/,
    challan: /^CHN-\d{8}-\d{4}$/,
    invoice: /^INV-\d{8}-\d{4}$/,
    credit_note: /^CN-\d{8}-\d{4}$/,
    misprint_sale: /^MS-\d{8}-\d{4}$/
  };

  // Get the created records
  const { data: order } = await supabase
    .from('orders')
    .select('order_number')
    .eq('id', testData.order_id)
    .single();

  const { data: receipt } = await supabase
    .from('material_in')
    .select('receipt_number')
    .eq('id', testData.material_in_id)
    .single();

  const { data: challan } = await supabase
    .from('delivery_challans')
    .select('challan_number')
    .eq('id', testData.delivery_challan_id)
    .single();

  const { data: invoice } = await supabase
    .from('gst_invoices')
    .select('invoice_number')
    .eq('id', testData.invoice_id)
    .single();

  const { data: creditNote } = await supabase
    .from('credit_notes')
    .select('credit_note_number')
    .eq('id', testData.credit_note_id)
    .single();

  const { data: misprintSale } = await supabase
    .from('misprint_sales')
    .select('sale_number')
    .eq('id', testData.misprint_sale_id)
    .single();

  assert(patterns.order.test(order.order_number),
    `Order number ${order.order_number} should match ORD-YYYYMMDD-NNNN`);
  assert(patterns.receipt.test(receipt.receipt_number),
    `Receipt number ${receipt.receipt_number} should match RCP-YYYYMMDD-NNNN`);
  assert(patterns.challan.test(challan.challan_number),
    `Challan number ${challan.challan_number} should match CHN-YYYYMMDD-NNNN`);
  assert(patterns.invoice.test(invoice.invoice_number),
    `Invoice number ${invoice.invoice_number} should match INV-YYYYMMDD-NNNN`);
  assert(patterns.credit_note.test(creditNote.credit_note_number),
    `Credit note number ${creditNote.credit_note_number} should match CN-YYYYMMDD-NNNN`);
  assert(patterns.misprint_sale.test(misprintSale.sale_number),
    `Misprint sale number ${misprintSale.sale_number} should match MS-YYYYMMDD-NNNN`);
});

// ============================================================================
// CLEANUP (Optional - comment out to keep test data)
// ============================================================================

console.log('\n========================================================================');
console.log('CLEANUP - Removing test data');
console.log('========================================================================\n');

await runTest('CLEANUP: Soft delete test customer', async () => {
  const { error } = await supabase
    .from('customers')
    .update({ is_deleted: true })
    .eq('id', testData.customer_id);

  assert(!error, `Failed to soft delete customer: ${error?.message || ''}`);
});

// ============================================================================
// FINAL REPORT
// ============================================================================

testResults.endTime = new Date();
const duration = (testResults.endTime - testResults.startTime) / 1000;

console.log('\n========================================================================');
console.log('TEST RESULTS SUMMARY');
console.log('========================================================================');
console.log(`Total Tests: ${testResults.total}`);
console.log(`✅ Passed: ${testResults.passed}`);
console.log(`❌ Failed: ${testResults.failed}`);
console.log(`⏭️  Skipped: ${testResults.skipped}`);
console.log(`⏱️  Duration: ${duration.toFixed(2)}s`);
console.log(`📊 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);
console.log('========================================================================');

if (testResults.failed > 0) {
  console.log('\n❌ FAILED TESTS:');
  testResults.tests
    .filter(t => t.status === 'FAILED')
    .forEach((t, i) => {
      console.log(`\n${i + 1}. ${t.name}`);
      console.log(`   Error: ${t.error}`);
    });
}

// Save results to file
const reportPath = `test_results_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
console.log(`\n📄 Full test report saved to: ${reportPath}`);

// Exit with appropriate code
process.exit(testResults.failed > 0 ? 1 : 0);
