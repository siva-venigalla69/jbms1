#!/usr/bin/env node
/**
 * COMPREHENSIVE END-TO-END API TEST
 * Tests complete workflow via Supabase API
 * Verifies: order_id, batch_id, design tracking, stock movement, delivery challans
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pvatfzwzfgioypdnqjay.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2YXRmend6Zmdpb3lwZG5xamF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjI1ODUsImV4cCI6MjA3MDkzODU4NX0.q3PgKkcsX5wXOys9aYwalhajH25uQ-gjCgVTZISi0Qs'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

let testResults = {
  passed: 0,
  failed: 0,
  errors: []
}

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`)
    testResults.passed++
  } else {
    console.log(`  ❌ ${message}`)
    testResults.failed++
    testResults.errors.push(message)
  }
}

function log(message) {
  console.log(`\n${message}`)
}

async function cleanup() {
  log('🧹 Cleaning up test data...')

  // Delete test customer and all related data (cascades)
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('phone', '9999999999')
    .single()

  if (customer) {
    await supabase
      .from('customers')
      .delete()
      .eq('id', customer.id)

    console.log('  ✅ Cleaned up test customer')
  }
}

async function runTests() {
  console.log('\n========================================')
  console.log('COMPREHENSIVE END-TO-END API TEST')
  console.log('========================================\n')

  let customerId, orderId, challanId

  try {
    // ========================================
    // TEST 1: Customer Creation
    // ========================================
    log('TEST 1: Customer Creation')

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({
        name: 'API Test Customer',
        phone: '9999999999',
        email: 'apitest@example.com'
      })
      .select()
      .single()

    if (customerError) {
      console.log('  ❌ Customer creation error:', JSON.stringify(customerError, null, 2))
    }
    assert(!customerError, 'Customer created without error')
    assert(customer?.id, 'Customer has ID')
    assert(customer?.name === 'API Test Customer', 'Customer name correct')

    customerId = customer.id

    // ========================================
    // TEST 2: Order Creation with order_id
    // ========================================
    log('TEST 2: Order Creation')

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_id: customerId,
        order_number: 'TEST-API-001',
        total_quantity: 100,
        ownership_type: 'customer_material',
        status: 'active'
      })
      .select()
      .single()

    assert(!orderError, 'Order created without error')
    assert(order?.id, 'Order has ID')
    assert(order?.order_number === 'TEST-API-001', 'Order number correct')
    assert(order?.customer_id === customerId, 'Order linked to customer')

    orderId = order.id

    // ========================================
    // TEST 3: Material Receipt with batch_id
    // ========================================
    log('TEST 3: Material Receipt with batch_id')

    const batchId = crypto.randomUUID()

    const { data: materialIn, error: materialInError } = await supabase
      .from('material_in')
      .insert({
        customer_id: customerId,
        order_id: orderId,
        material_type: 'SAREE',
        quantity: 50,
        ownership: 'customer',
        received_date: new Date().toISOString(),
        batch_id: batchId  // ✅ Ensure batch_id is set
      })
      .select()
      .single()

    assert(!materialInError, 'Material receipt created without error')
    assert(materialIn?.batch_id === batchId, 'Material has batch_id')
    assert(materialIn?.order_id === orderId, 'Material linked to order')

    // ========================================
    // TEST 4: Auto Stock Creation with batch_id
    // ========================================
    log('TEST 4: Auto Stock Creation with batch_id')

    // Create stock entry (normally done automatically, but we'll do it via API)
    const { data: stock, error: stockError } = await supabase
      .from('material_stock')
      .insert({
        customer_id: customerId,
        order_id: orderId,
        material_type: 'SAREE',
        stage: 'received',
        quantity: 50,
        ownership: 'customer',
        is_active: true,
        batch_id: batchId,  // ✅ Preserve batch_id from material_in
        movement_type: 'initial_receipt',
        moved_at: new Date().toISOString()
      })
      .select()
      .single()

    assert(!stockError, 'Stock created without error')
    assert(stock?.batch_id === batchId, 'Stock has same batch_id as material_in')
    assert(stock?.order_id === orderId, 'Stock linked to order')
    assert(stock?.stage === 'received', 'Stock in received stage')

    // ========================================
    // TEST 5: Design Tracking with order_id
    // ========================================
    log('TEST 5: Design Tracking with order_id')

    // Use RPC to add designs
    const { data: designResult, error: designError } = await supabase
      .rpc('update_design_count', {
        p_customer_id: customerId,
        p_order_id: orderId,  // ✅ Must include order_id
        p_material_type: 'SAREE',
        p_designs_to_add: 30,
        p_batch_identifier: 'TEST-BATCH-001'
      })

    assert(!designError, 'Design count updated without error')

    // Verify design tracking
    const { data: designs } = await supabase
      .from('material_design_tracking')
      .select('*')
      .eq('customer_id', customerId)
      .eq('order_id', orderId)  // ✅ Must filter by order_id
      .eq('material_type', 'SAREE')
      .single()

    assert(designs?.order_id === orderId, 'Design tracking has order_id')
    assert(designs?.designs_given === 30, 'Designs given = 30')
    assert(designs?.designs_pending === 20, 'Designs pending = 20 (50 - 30)')

    // ========================================
    // TEST 6: Stock Movement with batch_id preservation
    // ========================================
    log('TEST 6: Stock Movement with batch_id preservation')

    // Move stock from received to preprocessing
    const { error: moveError1 } = await supabase
      .rpc('move_stock_to_stage', {
        p_customer_id: customerId,
        p_order_id: orderId,
        p_material_type: 'SAREE',
        p_from_stage: 'received',
        p_to_stage: 'preprocessing',
        p_quantity: 30,
        p_ownership: 'customer'
      })

    assert(!moveError1, 'Stock moved to preprocessing')

    // Verify batch_id preserved
    const { data: preprocessingStock } = await supabase
      .from('material_stock')
      .select('*')
      .eq('customer_id', customerId)
      .eq('order_id', orderId)
      .eq('stage', 'preprocessing')
      .eq('is_active', true)
      .single()

    assert(preprocessingStock?.batch_id === batchId, 'Batch ID preserved after movement')
    assert(preprocessingStock?.quantity === 30, 'Correct quantity in preprocessing')

    // Verify remaining stock
    const { data: receivedStock } = await supabase
      .from('material_stock')
      .select('quantity')
      .eq('customer_id', customerId)
      .eq('stage', 'received')
      .eq('is_active', true)

    const receivedTotal = receivedStock?.reduce((sum, s) => sum + s.quantity, 0) || 0
    assert(receivedTotal === 20, 'Remaining stock in received = 20')

    // ========================================
    // TEST 7: Multiple Stage Movements
    // ========================================
    log('TEST 7: Multiple Stage Movements')

    // preprocessing -> printing
    const { error: moveError2 } = await supabase
      .rpc('move_stock_to_stage', {
        p_customer_id: customerId,
        p_order_id: orderId,
        p_material_type: 'SAREE',
        p_from_stage: 'preprocessing',
        p_to_stage: 'printing',
        p_quantity: 30,
        p_ownership: 'customer'
      })

    assert(!moveError2, 'Stock moved to printing')

    // printing -> postprocessing
    const { error: moveError3 } = await supabase
      .rpc('move_stock_to_stage', {
        p_customer_id: customerId,
        p_order_id: orderId,
        p_material_type: 'SAREE',
        p_from_stage: 'printing',
        p_to_stage: 'postprocessing',
        p_quantity: 30,
        p_ownership: 'customer'
      })

    assert(!moveError3, 'Stock moved to postprocessing')

    // postprocessing -> completed
    const { error: moveError4 } = await supabase
      .rpc('move_stock_to_stage', {
        p_customer_id: customerId,
        p_order_id: orderId,
        p_material_type: 'SAREE',
        p_from_stage: 'postprocessing',
        p_to_stage: 'completed',
        p_quantity: 30,
        p_ownership: 'customer'
      })

    assert(!moveError4, 'Stock moved to completed')

    // Verify batch_id still preserved
    const { data: completedStock } = await supabase
      .from('material_stock')
      .select('*')
      .eq('customer_id', customerId)
      .eq('stage', 'completed')
      .eq('is_active', true)
      .single()

    assert(completedStock?.batch_id === batchId, 'Batch ID preserved through all stages')

    // ========================================
    // TEST 8: Delivery Challan with Items (NEW STRUCTURE)
    // ========================================
    log('TEST 8: Delivery Challan with Items')

    // Create delivery challan
    const { data: challan, error: challanError } = await supabase
      .from('delivery_challans')
      .insert({
        customer_id: customerId,
        order_id: orderId,  // ✅ Must include order_id
        challan_date: new Date().toISOString(),
        notes: 'Test delivery challan'
      })
      .select()
      .single()

    assert(!challanError, 'Delivery challan created without error')
    assert(challan?.order_id === orderId, 'Challan linked to order')

    challanId = challan.id

    // Add challan items
    const { data: challanItems, error: itemsError } = await supabase
      .from('challan_items')
      .insert([
        {
          challan_id: challanId,
          order_id: orderId,  // ✅ Must include order_id
          material_type: 'SAREE',
          quantity: 20,
          notes: 'First batch delivery'
        },
        {
          challan_id: challanId,
          order_id: orderId,
          material_type: 'DUPPATTA',
          quantity: 10,
          notes: 'Matching duppattas'
        }
      ])
      .select()

    assert(!itemsError, 'Challan items created without error')
    assert(challanItems?.length === 2, 'Created 2 challan items')
    assert(challanItems[0]?.material_type === 'SAREE', 'First item is SAREE')
    assert(challanItems[0]?.order_id === orderId, 'Challan item linked to order')

    // ========================================
    // TEST 9: Move Stock to Delivered Stage
    // ========================================
    log('TEST 9: Move Stock to Delivered Stage')

    const { error: deliverError } = await supabase
      .rpc('move_stock_to_stage', {
        p_customer_id: customerId,
        p_order_id: orderId,
        p_material_type: 'SAREE',
        p_from_stage: 'completed',
        p_to_stage: 'delivered',  // ✅ Should work after Phase 1 fix
        p_quantity: 20,
        p_ownership: 'customer'
      })

    assert(!deliverError, 'Stock moved to delivered stage without error')

    const { data: deliveredStock } = await supabase
      .from('material_stock')
      .select('*')
      .eq('customer_id', customerId)
      .eq('stage', 'delivered')
      .eq('is_active', true)

    const deliveredTotal = deliveredStock?.reduce((sum, s) => sum + s.quantity, 0) || 0
    assert(deliveredTotal === 20, 'Delivered stock = 20')

    // ========================================
    // TEST 10: Verify v_delivery_challan_details View
    // ========================================
    log('TEST 10: Verify v_delivery_challan_details View')

    const { data: challanDetails, error: viewError } = await supabase
      .from('v_delivery_challan_details')
      .select('*')
      .eq('challan_id', challanId)

    assert(!viewError, 'Challan details view queried without error')
    assert(challanDetails?.length === 2, 'View returns 2 items')
    assert(challanDetails[0]?.customer_name === 'API Test Customer', 'Customer name in view')
    assert(challanDetails[0]?.order_number === 'TEST-API-001', 'Order number in view')

    // ========================================
    // TEST 11: Verify v_pending_designs View
    // ========================================
    log('TEST 11: Verify v_pending_designs View')

    const { data: pendingDesigns, error: pendingError } = await supabase
      .from('v_pending_designs')
      .select('*')
      .eq('customer_id', customerId)

    assert(!pendingError, 'Pending designs view queried without error')
    assert(pendingDesigns?.length > 0, 'View returns pending designs')
    assert(pendingDesigns[0]?.order_number === 'TEST-API-001', 'Order number in view')
    assert(pendingDesigns[0]?.designs_given === 30, 'Designs given shown in view')
    assert(pendingDesigns[0]?.designs_pending === 20, 'Designs pending shown in view')

    // ========================================
    // TEST 12: Batch Lineage Tracking
    // ========================================
    log('TEST 12: Batch Lineage Tracking')

    // Check if v_batch_lineage exists
    const { data: batchLineage, error: batchError } = await supabase
      .from('v_batch_lineage')
      .select('*')
      .eq('batch_id', batchId)
      .single()

    if (!batchError) {
      assert(batchLineage?.batch_id === batchId, 'Batch lineage view shows batch')
      assert(batchLineage?.received_quantity === 50, 'Received quantity correct')
    } else {
      console.log('  ⚠️  v_batch_lineage view not found (Phase 3 not executed)')
    }

    // ========================================
    // TEST 13: Invoice Creation (if schema allows)
    // ========================================
    log('TEST 13: Invoice Creation')

    const { data: invoice, error: invoiceError } = await supabase
      .from('gst_invoices')
      .insert({
        customer_id: customerId,
        order_id: orderId,  // ✅ order_id exists in schema
        invoice_date: new Date().toISOString(),
        subtotal: 2000.00,
        cgst_rate: 9.00,
        cgst_amount: 180.00,
        sgst_rate: 9.00,
        sgst_amount: 180.00,
        igst_rate: 0.00,
        igst_amount: 0.00,
        total_amount: 2360.00,
        internal_notes: 'Test invoice'  // ✅ Use internal_notes instead of notes
      })
      .select()
      .single()

    if (invoiceError) {
      console.log('  ❌ Invoice creation error:', JSON.stringify(invoiceError, null, 2))
    }
    assert(!invoiceError, 'Invoice created without error')
    assert(invoice?.customer_id === customerId, 'Invoice linked to customer')
    assert(invoice?.order_id === orderId, 'Invoice linked to order')
    assert(invoice?.total_amount === 2360.00, 'Invoice total amount correct')

    // ========================================
    // Cleanup
    // ========================================
    await cleanup()

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message)
    testResults.failed++
    testResults.errors.push(error.message)
  }

  // ========================================
  // Results Summary
  // ========================================
  console.log('\n========================================')
  console.log('TEST RESULTS SUMMARY')
  console.log('========================================')
  console.log(`✅ Passed: ${testResults.passed}`)
  console.log(`❌ Failed: ${testResults.failed}`)

  if (testResults.failed > 0) {
    console.log('\n❌ FAILED TESTS:')
    testResults.errors.forEach(err => console.log(`  - ${err}`))
    console.log('\n')
    process.exit(1)
  } else {
    console.log('\n✅ ALL TESTS PASSED!\n')
    process.exit(0)
  }
}

// Run tests
runTests().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
