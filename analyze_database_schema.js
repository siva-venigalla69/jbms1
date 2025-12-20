// Database Schema Analysis Script
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pvatfzwzfgioypdnqjay.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2YXRmemd6Zmdpb3lwZG5xamF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjUxNjY3MTUsImV4cCI6MjA0MDc0MjcxNX0.iCymX3MslvhBPJNu3hzrKRVBHFk3zDONYx_JGAT8rVs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeDatabaseSchema() {
  console.log('\n='.repeat(80));
  console.log('DATABASE SCHEMA ANALYSIS FOR TEXTILE MANUFACTURING SYSTEM');
  console.log('='.repeat(80));

  try {
    // Get all tables with their row counts
    const { data: tables, error: tablesError } = await supabase.rpc('get_all_tables_info');

    // If RPC doesn't exist, query tables directly
    console.log('\n📊 QUERYING DATABASE TABLES...\n');

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
      'delivery_challan_items',
      'gst_invoices',
      'payments',
      'employees',
      'users',
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
        }
      } catch (e) {
        tableInfo.push({
          table: tableName,
          rows: 'N/A',
          status: '✗'
        });
      }
    }

    // Sort by table name
    tableInfo.sort((a, b) => a.table.localeCompare(b.table));

    console.log('┌─────────────────────────────────┬──────────┬────────┐');
    console.log('│ TABLE NAME                      │ ROWS     │ STATUS │');
    console.log('├─────────────────────────────────┼──────────┼────────┤');

    tableInfo.forEach(({ table, rows, status }) => {
      const tablePadded = table.padEnd(31);
      const rowsPadded = String(rows).padStart(8);
      console.log(`│ ${tablePadded} │ ${rowsPadded} │   ${status}    │`);
    });

    console.log('└─────────────────────────────────┴──────────┴────────┘');

    // Get sample data from key tables
    console.log('\n\n📋 SAMPLE DATA FROM KEY TABLES:\n');

    // Customers
    const { data: customers } = await supabase
      .from('customers')
      .select('*')
      .limit(3);

    console.log('CUSTOMERS (Sample):');
    console.log(JSON.stringify(customers, null, 2));

    // Orders
    const { data: orders } = await supabase
      .from('orders')
      .select('*, customers(name)')
      .limit(3);

    console.log('\n\nORDERS (Sample):');
    console.log(JSON.stringify(orders, null, 2));

    // Order Items with production status
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('id, order_id, material_type, quantity, design_status, production_status, current_stage')
      .limit(3);

    console.log('\n\nORDER ITEMS (Sample):');
    console.log(JSON.stringify(orderItems, null, 2));

    // Material Stock
    const { data: stock } = await supabase
      .from('material_stock')
      .select('*')
      .limit(3);

    console.log('\n\nMATERIAL STOCK (Sample):');
    console.log(JSON.stringify(stock, null, 2));

    // Get production status summary
    console.log('\n\n📊 PRODUCTION STATUS SUMMARY:\n');

    const { data: statusSummary } = await supabase
      .from('order_items')
      .select('design_status, production_status, current_stage, count')
      .limit(100);

    if (statusSummary) {
      // Group by status
      const grouped = {};
      statusSummary.forEach(item => {
        const key = `${item.design_status || 'N/A'} | ${item.production_status || 'N/A'} | ${item.current_stage || 'N/A'}`;
        grouped[key] = (grouped[key] || 0) + 1;
      });

      console.log('Design Status | Production Status | Current Stage | Count');
      console.log('-'.repeat(70));
      Object.entries(grouped).forEach(([key, count]) => {
        console.log(`${key} | ${count}`);
      });
    }

  } catch (error) {
    console.error('\n❌ Error analyzing database:', error);
    console.error(error.stack);
  }
}

// Run the analysis
analyzeDatabaseSchema().then(() => {
  console.log('\n' + '='.repeat(80));
  console.log('Analysis complete!');
  console.log('='.repeat(80) + '\n');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
