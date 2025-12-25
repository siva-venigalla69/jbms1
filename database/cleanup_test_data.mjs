#!/usr/bin/env node
/**
 * Cleanup test data from previous test runs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pvatfzwzfgioypdnqjay.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2YXRmend6Zmdpb3lwZG5xamF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjI1ODUsImV4cCI6MjA3MDkzODU4NX0.q3PgKkcsX5wXOys9aYwalhajH25uQ-gjCgVTZISi0Qs'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function cleanup() {
  console.log('🧹 Cleaning up test data...')

  // Find test customer
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('phone', '9999999999')
    .single()

  if (!customer) {
    console.log('  ℹ️  No test customer found')
    return
  }

  const customerId = customer.id

  // Delete in correct order to avoid FK violations

  // 1. Get all delivery challan IDs for this customer
  const { data: challans } = await supabase
    .from('delivery_challans')
    .select('id')
    .eq('customer_id', customerId)

  // 2. Delete challan items if challans exist
  if (challans && challans.length > 0) {
    const challanIds = challans.map(c => c.id)
    await supabase
      .from('challan_items')
      .delete()
      .in('challan_id', challanIds)
    console.log('  ✅ Deleted challan items')
  }

  // 3. Delete delivery challans
  await supabase
    .from('delivery_challans')
    .delete()
    .eq('customer_id', customerId)
  console.log('  ✅ Deleted delivery challans')

  // 4. Delete invoices
  await supabase
    .from('gst_invoices')
    .delete()
    .eq('customer_id', customerId)
  console.log('  ✅ Deleted invoices')

  // 3. Delete material stock
  await supabase
    .from('material_stock')
    .delete()
    .eq('customer_id', customerId)
  console.log('  ✅ Deleted material stock')

  // 4. Delete material in
  await supabase
    .from('material_in')
    .delete()
    .eq('customer_id', customerId)
  console.log('  ✅ Deleted material in')

  // 5. Delete design tracking
  await supabase
    .from('material_design_tracking')
    .delete()
    .eq('customer_id', customerId)
  console.log('  ✅ Deleted design tracking')

  // 6. Delete orders
  await supabase
    .from('orders')
    .delete()
    .eq('customer_id', customerId)
  console.log('  ✅ Deleted orders')

  // 7. Delete customer
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', customerId)

  if (error) {
    console.log('  ❌ Error deleting customer:', error.message)
  } else {
    console.log('  ✅ Deleted test customer')
  }
}

cleanup().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
