/**
 * TEST DATA CLEANUP SCRIPT
 * =========================
 * Removes all test data created by automated tests
 * Test data is identified by "AUTOTEST-" prefix
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://pvatfzwzfgioypdnqjay.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2YXRmend6Zmdpb3lwZG5xamF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjI1ODUsImV4cCI6MjA3MDkzODU4NX0.q3PgKkcsX5wXOys9aYwalhajH25uQ-gjCgVTZISi0Qs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TEST_PREFIX = 'AUTOTEST-';

console.log('========================================================================');
console.log('TEST DATA CLEANUP SCRIPT');
console.log('========================================================================');
console.log(`Searching for test data with prefix: ${TEST_PREFIX}`);
console.log('========================================================================\n');

async function cleanup() {
  let totalDeleted = 0;

  // 1. Find and delete test invoice-challan links
  console.log('🔍 Searching for test invoice-challan links...');
  const { data: testInvoices } = await supabase
    .from('gst_invoices')
    .select('id')
    .ilike('notes', `%${TEST_PREFIX}%`);

  if (testInvoices && testInvoices.length > 0) {
    const invoiceIds = testInvoices.map(inv => inv.id);
    const { error: linkDeleteError } = await supabase
      .from('invoice_challans')
      .delete()
      .in('invoice_id', invoiceIds);

    if (!linkDeleteError) {
      console.log(`✅ Deleted invoice-challan links`);
    }
  }

  // 2. Delete test challan items
  console.log('🔍 Searching for test challan items...');
  const { data: testChallans } = await supabase
    .from('delivery_challans')
    .select('id')
    .ilike('notes', `%${TEST_PREFIX}%`);

  if (testChallans && testChallans.length > 0) {
    const challanIds = testChallans.map(ch => ch.id);
    const { data: deletedItems, error } = await supabase
      .from('challan_items')
      .delete()
      .in('challan_id', challanIds)
      .select();

    if (!error && deletedItems) {
      console.log(`✅ Deleted ${deletedItems.length} challan items`);
      totalDeleted += deletedItems.length;
    }
  }

  // 3. Delete test payments
  console.log('🔍 Searching for test payments...');
  const { data: deletedPayments, error: paymentsError } = await supabase
    .from('payments')
    .delete()
    .ilike('notes', `%${TEST_PREFIX}%`)
    .select();

  if (!paymentsError && deletedPayments) {
    console.log(`✅ Deleted ${deletedPayments.length} payments`);
    totalDeleted += deletedPayments.length;
  }

  // 4. Delete test credit notes
  console.log('🔍 Searching for test credit notes...');
  const { data: deletedCreditNotes, error: creditNotesError } = await supabase
    .from('credit_notes')
    .delete()
    .ilike('notes', `%${TEST_PREFIX}%`)
    .select();

  if (!creditNotesError && deletedCreditNotes) {
    console.log(`✅ Deleted ${deletedCreditNotes.length} credit notes`);
    totalDeleted += deletedCreditNotes.length;
  }

  // 5. Delete test invoices
  console.log('🔍 Searching for test invoices...');
  const { data: deletedInvoices, error: invoicesError } = await supabase
    .from('gst_invoices')
    .delete()
    .ilike('notes', `%${TEST_PREFIX}%`)
    .select();

  if (!invoicesError && deletedInvoices) {
    console.log(`✅ Deleted ${deletedInvoices.length} invoices`);
    totalDeleted += deletedInvoices.length;
  }

  // 6. Delete test delivery challans
  console.log('🔍 Searching for test delivery challans...');
  const { data: deletedChallans, error: challansError } = await supabase
    .from('delivery_challans')
    .delete()
    .ilike('notes', `%${TEST_PREFIX}%`)
    .select();

  if (!challansError && deletedChallans) {
    console.log(`✅ Deleted ${deletedChallans.length} delivery challans`);
    totalDeleted += deletedChallans.length;
  }

  // 7. Delete test misprint sales
  console.log('🔍 Searching for test misprint sales...');
  const { data: deletedMisprintSales, error: misprintError } = await supabase
    .from('misprint_sales')
    .delete()
    .ilike('notes', `%${TEST_PREFIX}%`)
    .select();

  if (!misprintError && deletedMisprintSales) {
    console.log(`✅ Deleted ${deletedMisprintSales.length} misprint sales`);
    totalDeleted += deletedMisprintSales.length;
  }

  // 8. Delete test returns
  console.log('🔍 Searching for test returns...');
  const { data: deletedReturns, error: returnsError } = await supabase
    .from('returns')
    .delete()
    .ilike('reason', `%${TEST_PREFIX}%`)
    .select();

  if (!returnsError && deletedReturns) {
    console.log(`✅ Deleted ${deletedReturns.length} returns`);
    totalDeleted += deletedReturns.length;
  }

  // 9. Delete test stock entries (by customer)
  console.log('🔍 Searching for test stock entries...');
  const { data: testCustomers } = await supabase
    .from('customers')
    .select('id')
    .ilike('name', `%${TEST_PREFIX}%`);

  if (testCustomers && testCustomers.length > 0) {
    const customerIds = testCustomers.map(c => c.id);
    const { data: deletedStock, error: stockError } = await supabase
      .from('material_stock')
      .delete()
      .in('customer_id', customerIds)
      .select();

    if (!stockError && deletedStock) {
      console.log(`✅ Deleted ${deletedStock.length} stock entries`);
      totalDeleted += deletedStock.length;
    }
  }

  // 10. Delete test material receipts
  console.log('🔍 Searching for test material receipts...');
  const { data: deletedReceipts, error: receiptsError } = await supabase
    .from('material_in')
    .delete()
    .ilike('notes', `%${TEST_PREFIX}%`)
    .select();

  if (!receiptsError && deletedReceipts) {
    console.log(`✅ Deleted ${deletedReceipts.length} material receipts`);
    totalDeleted += deletedReceipts.length;
  }

  // 11. Delete test orders
  console.log('🔍 Searching for test orders...');
  const { data: deletedOrders, error: ordersError } = await supabase
    .from('orders')
    .delete()
    .ilike('notes', `%${TEST_PREFIX}%`)
    .select();

  if (!ordersError && deletedOrders) {
    console.log(`✅ Deleted ${deletedOrders.length} orders`);
    totalDeleted += deletedOrders.length;
  }

  // 12. Delete test customers (LAST - due to foreign keys)
  console.log('🔍 Searching for test customers...');
  const { data: deletedCustomers, error: customersError } = await supabase
    .from('customers')
    .delete()
    .ilike('name', `%${TEST_PREFIX}%`)
    .select();

  if (!customersError && deletedCustomers) {
    console.log(`✅ Deleted ${deletedCustomers.length} customers`);
    totalDeleted += deletedCustomers.length;
  }

  // 13. Verify cleanup
  console.log('\n🔍 Verifying cleanup...');
  const { data: remainingCustomers } = await supabase
    .from('customers')
    .select('id, name')
    .ilike('name', `%${TEST_PREFIX}%`);

  const { data: remainingOrders } = await supabase
    .from('orders')
    .select('id, notes')
    .ilike('notes', `%${TEST_PREFIX}%`);

  const remaining = (remainingCustomers?.length || 0) + (remainingOrders?.length || 0);

  console.log('\n========================================================================');
  console.log('CLEANUP SUMMARY');
  console.log('========================================================================');
  console.log(`Total records deleted: ${totalDeleted}`);
  console.log(`Remaining test records: ${remaining}`);

  if (remaining === 0) {
    console.log('✅ All test data successfully cleaned up!');
  } else {
    console.log(`⚠️  Warning: ${remaining} test records still remain`);
    console.log('   Remaining customers:', remainingCustomers?.map(c => c.name).join(', '));
    console.log('   Remaining orders:', remainingOrders?.length || 0);
  }
  console.log('========================================================================\n');
}

cleanup()
  .then(() => {
    console.log('✅ Cleanup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  });
