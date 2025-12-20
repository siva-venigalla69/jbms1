// Database Schema Analysis Script
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pvatfzwzfgioypdnqjay.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2YXRmend6Zmdpb3lwZG5xamF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjI1ODUsImV4cCI6MjA3MDkzODU4NX0.q3PgKkcsX5wXOys9aYwalhajH25uQ-gjCgVTZISi0Qs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeDatabaseSchema() {
  console.log('\n' + '='.repeat(100));
  console.log('DATABASE SCHEMA ANALYSIS FOR TEXTILE MANUFACTURING SYSTEM');
  console.log('='.repeat(100));

  try {
    console.log('\n📊 QUERYING DATABASE TABLES AND ROW COUNTS...\n');

    // List of all expected tables based on the schema
    const tableNames = [
      'customers',
      'orders',
      'order_items',
      'production_batches',
      'material_in',
      'material_out',
      'material_stock',
      'delivery_challans',
      'challan_items',
      'gst_invoices',
      'invoice_challans',
      'payments',
      'employees',
      'user_profiles',
      'inventory',
      'expenses',
      'purchases',
      'purchase_items',
      'customer_designs',
      'design_library',
      'design_assignments',
      'salary_payments'
    ];

    const tableInfo = [];

    for (const tableName of tableNames) {
      try {
        // Get row count
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (!error) {
          tableInfo.push({
            table: tableName,
            rows: count || 0,
            status: '✓'
          });
        } else {
          tableInfo.push({
            table: tableName,
            rows: 'N/A',
            status: '✗',
            error: error.message
          });
        }
      } catch (e) {
        tableInfo.push({
          table: tableName,
          rows: 'N/A',
          status: '✗',
          error: e.message
        });
      }
    }

    // Sort by table name
    tableInfo.sort((a, b) => a.table.localeCompare(b.table));

    console.log('┌─────────────────────────────────┬──────────┬────────┐');
    console.log('│ TABLE NAME                      │ ROWS     │ STATUS │');
    console.log('├─────────────────────────────────┼──────────┼────────┤');

    let totalRows = 0;
    tableInfo.forEach(({ table, rows, status }) => {
      const tablePadded = table.padEnd(31);
      const rowsPadded = String(rows).padStart(8);
      console.log(`│ ${tablePadded} │ ${rowsPadded} │   ${status}    │`);
      if (typeof rows === 'number') totalRows += rows;
    });

    console.log('└─────────────────────────────────┴──────────┴────────┘');
    console.log(`\nTotal rows across all tables: ${totalRows}`);

    // Show errors if any
    const errors = tableInfo.filter(t => t.status === '✗');
    if (errors.length > 0) {
      console.log('\n⚠️  Tables with errors:');
      errors.forEach(({ table, error }) => {
        console.log(`   ${table}: ${error}`);
      });
    }

    // Get sample data from key tables
    console.log('\n\n📋 SAMPLE DATA FROM KEY TABLES:\n');

    // Customers
    console.log('1. CUSTOMERS (Sample):');
    const { data: customers } = await supabase
      .from('customers')
      .select('*')
      .limit(2);

    if (customers && customers.length > 0) {
      console.log(`   Total: ${tableInfo.find(t => t.table === 'customers')?.rows || 0} customers`);
      console.log('   Sample:', JSON.stringify(customers[0], null, 2));
    } else {
      console.log('   No data found');
    }

    // Orders
    console.log('\n2. ORDERS (Sample):');
    const { data: orders } = await supabase
      .from('orders')
      .select('*, customers(name)')
      .limit(2);

    if (orders && orders.length > 0) {
      console.log(`   Total: ${tableInfo.find(t => t.table === 'orders')?.rows || 0} orders`);
      console.log('   Sample:', JSON.stringify(orders[0], null, 2));
    } else {
      console.log('   No data found');
    }

    // Order Items with production status
    console.log('\n3. ORDER ITEMS (Sample with Production Status):');
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('id, order_id, material_type, quantity, design_status, production_status, current_stage')
      .limit(2);

    if (orderItems && orderItems.length > 0) {
      console.log(`   Total: ${tableInfo.find(t => t.table === 'order_items')?.rows || 0} order items`);
      console.log('   Sample:', JSON.stringify(orderItems[0], null, 2));
    } else {
      console.log('   No data found');
    }

    // Material Stock
    console.log('\n4. MATERIAL STOCK (Sample):');
    const { data: stock } = await supabase
      .from('material_stock')
      .select('*')
      .limit(2);

    if (stock && stock.length > 0) {
      console.log(`   Total: ${tableInfo.find(t => t.table === 'material_stock')?.rows || 0} stock records`);
      console.log('   Sample:', JSON.stringify(stock[0], null, 2));
    } else {
      console.log('   No data found');
    }

    // Production Batches
    console.log('\n5. PRODUCTION BATCHES (Sample):');
    const { data: batches } = await supabase
      .from('production_batches')
      .select('*')
      .limit(2);

    if (batches && batches.length > 0) {
      console.log(`   Total: ${tableInfo.find(t => t.table === 'production_batches')?.rows || 0} production batches`);
      console.log('   Sample:', JSON.stringify(batches[0], null, 2));
    } else {
      console.log('   No data found');
    }

    // Get production status summary
    console.log('\n\n📊 PRODUCTION STATUS DISTRIBUTION:\n');

    const { data: allItems } = await supabase
      .from('order_items')
      .select('design_status, production_status, current_stage');

    if (allItems && allItems.length > 0) {
      // Group by status combinations
      const statusGroups = {};
      allItems.forEach(item => {
        const key = `Design: ${item.design_status || 'N/A'} | Production: ${item.production_status || 'N/A'} | Stage: ${item.current_stage || 'N/A'}`;
        statusGroups[key] = (statusGroups[key] || 0) + 1;
      });

      console.log('Status Combination                                                        | Count');
      console.log('-'.repeat(85));
      Object.entries(statusGroups)
        .sort((a, b) => b[1] - a[1])
        .forEach(([key, count]) => {
          console.log(`${key.padEnd(77)} | ${count}`);
        });
    } else {
      console.log('No order items found');
    }

    // Get financial summary
    console.log('\n\n💰 FINANCIAL SUMMARY:\n');

    const { data: invoices } = await supabase
      .from('gst_invoices')
      .select('total_amount, status');

    if (invoices && invoices.length > 0) {
      const totalInvoiced = invoices.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);
      const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
      console.log(`   Total Invoices: ${invoices.length}`);
      console.log(`   Total Invoiced Amount: ₹${totalInvoiced.toFixed(2)}`);
      console.log(`   Paid Invoices: ${paidInvoices}/${invoices.length}`);
    } else {
      console.log('   No invoices found');
    }

    const { data: payments } = await supabase
      .from('payments')
      .select('payment_amount');

    if (payments && payments.length > 0) {
      const totalPayments = payments.reduce((sum, pay) => sum + (parseFloat(pay.payment_amount) || 0), 0);
      console.log(`   Total Payments Received: ₹${totalPayments.toFixed(2)}`);
    }

  } catch (error) {
    console.error('\n❌ Error analyzing database:', error);
    console.error(error.stack);
  }
}

// Run the analysis
analyzeDatabaseSchema().then(() => {
  console.log('\n' + '='.repeat(100));
  console.log('✅ Analysis complete!');
  console.log('='.repeat(100) + '\n');
  process.exit(0);
}).catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
