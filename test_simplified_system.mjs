#!/usr/bin/env node
// Comprehensive Test Script for Simplified Textile Printing System
// Tests: Database Schema, API Functions, Views, and Data Flow
// Created: 2025-12-21

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Required: REACT_APP_SUPABASE_URL or SUPABASE_URL');
  console.error('Required: REACT_APP_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('='.repeat(80));
console.log('🧪 SIMPLIFIED TEXTILE SYSTEM - COMPREHENSIVE TEST');
console.log('='.repeat(80));
console.log(`Supabase URL: ${SUPABASE_URL}`);
console.log(`Testing Date: ${new Date().toISOString()}`);
console.log('='.repeat(80));
console.log('');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function logTest(testName, passed, details = '') {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`✅ ${testName}`);
    if (details) console.log(`   ${details}`);
  } else {
    failedTests++;
    console.log(`❌ ${testName}`);
    if (details) console.log(`   ${details}`);
  }
}

// ============================================================================
// TEST 1: VERIFY CORE TABLES EXIST
// ============================================================================
console.log('\n📋 TEST 1: Verifying Core Tables Exist...');
console.log('-'.repeat(80));

const requiredTables = [
  'customers',
  'orders',
  'material_in',
  'material_stock',
  'delivery_challans',
  'challan_items',
  'gst_invoices',
  'payments',
  'returns',
  'credit_notes',
  'misprint_sales',
  'material_types',
  'invoice_challans'
];

for (const tableName of requiredTables) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows, which is OK
      logTest(`Table: ${tableName}`, false, `Error: ${error.message}`);
    } else {
      logTest(`Table: ${tableName}`, true, 'Table accessible');
    }
  } catch (err) {
    logTest(`Table: ${tableName}`, false, `Exception: ${err.message}`);
  }
}

// ============================================================================
// TEST 2: VERIFY REPORTING VIEWS EXIST
// ============================================================================
console.log('\n📊 TEST 2: Verifying Reporting Views...');
console.log('-'.repeat(80));

const requiredViews = [
  'v_stock_by_customer',
  'v_outstanding_payments',
  'v_outstanding_orders',
  'v_misprint_stock'
];

for (const viewName of requiredViews) {
  try {
    const { data, error } = await supabase
      .from(viewName)
      .select('*')
      .limit(1);

    if (error && error.code !== 'PGRST116') {
      logTest(`View: ${viewName}`, false, `Error: ${error.message}`);
    } else {
      logTest(`View: ${viewName}`, true, 'View accessible');
    }
  } catch (err) {
    logTest(`View: ${viewName}`, false, `Exception: ${err.message}`);
  }
}

// ============================================================================
// TEST 3: CHECK MATERIAL TYPES
// ============================================================================
console.log('\n🧵 TEST 3: Checking Material Types...');
console.log('-'.repeat(80));

try {
  const { data: materialTypes, error } = await supabase
    .from('material_types')
    .select('*')
    .order('type_name');

  if (error) {
    logTest('Material Types Query', false, `Error: ${error.message}`);
  } else if (!materialTypes || materialTypes.length === 0) {
    logTest('Material Types Query', false, 'No material types found');
  } else {
    logTest('Material Types Query', true, `Found ${materialTypes.length} material types`);
    materialTypes.forEach(type => {
      console.log(`   - ${type.type_name} (${type.type_code})`);
    });
  }
} catch (err) {
  logTest('Material Types Query', false, `Exception: ${err.message}`);
}

// ============================================================================
// TEST 4: CHECK CUSTOMERS
// ============================================================================
console.log('\n👥 TEST 4: Checking Customers...');
console.log('-'.repeat(80));

try {
  const { data: customers, error, count } = await supabase
    .from('customers')
    .select('id, name, phone', { count: 'exact' })
    .eq('is_active', true)
    .limit(5);

  if (error) {
    logTest('Customers Query', false, `Error: ${error.message}`);
  } else {
    logTest('Customers Query', true, `Found ${count || 0} active customers`);
    if (customers && customers.length > 0) {
      customers.forEach(customer => {
        console.log(`   - ${customer.name} (${customer.phone})`);
      });
    }
  }
} catch (err) {
  logTest('Customers Query', false, `Exception: ${err.message}`);
}

// ============================================================================
// TEST 5: CHECK ORDERS
// ============================================================================
console.log('\n📦 TEST 5: Checking Orders...');
console.log('-'.repeat(80));

try {
  const { data: orders, error, count } = await supabase
    .from('orders')
    .select('id, order_number, ownership_type, status', { count: 'exact' })
    .limit(5);

  if (error) {
    logTest('Orders Query', false, `Error: ${error.message}`);
  } else {
    logTest('Orders Query', true, `Found ${count || 0} orders`);
    if (orders && orders.length > 0) {
      orders.forEach(order => {
        console.log(`   - ${order.order_number} (${order.ownership_type}) - ${order.status}`);
      });
    }
  }
} catch (err) {
  logTest('Orders Query', false, `Exception: ${err.message}`);
}

// ============================================================================
// TEST 6: CHECK MATERIAL STOCK
// ============================================================================
console.log('\n📦 TEST 6: Checking Material Stock...');
console.log('-'.repeat(80));

try {
  const { data: stock, error, count } = await supabase
    .from('material_stock')
    .select('material_type, stage, quantity, ownership', { count: 'exact' })
    .gt('quantity', 0)
    .limit(10);

  if (error) {
    logTest('Material Stock Query', false, `Error: ${error.message}`);
  } else {
    logTest('Material Stock Query', true, `Found ${count || 0} stock entries`);
    if (stock && stock.length > 0) {
      // Group by stage
      const byStage = stock.reduce((acc, item) => {
        if (!acc[item.stage]) acc[item.stage] = 0;
        acc[item.stage] += item.quantity;
        return acc;
      }, {});

      console.log('   Stock by Stage:');
      Object.entries(byStage).forEach(([stage, qty]) => {
        console.log(`   - ${stage}: ${qty} units`);
      });
    }
  }
} catch (err) {
  logTest('Material Stock Query', false, `Exception: ${err.message}`);
}

// ============================================================================
// TEST 7: CHECK REPORTING VIEW - STOCK BY CUSTOMER
// ============================================================================
console.log('\n📊 TEST 7: Testing Stock by Customer Report...');
console.log('-'.repeat(80));

try {
  const { data: stockByCustomer, error } = await supabase
    .from('v_stock_by_customer')
    .select('*')
    .limit(5);

  if (error) {
    logTest('Stock by Customer Report', false, `Error: ${error.message}`);
  } else {
    logTest('Stock by Customer Report', true, `Found ${stockByCustomer?.length || 0} customer stock records`);
    if (stockByCustomer && stockByCustomer.length > 0) {
      stockByCustomer.forEach(record => {
        console.log(`   - ${record.customer_name}: ${record.total_quantity || 0} units`);
      });
    }
  }
} catch (err) {
  logTest('Stock by Customer Report', false, `Exception: ${err.message}`);
}

// ============================================================================
// TEST 8: CHECK REPORTING VIEW - OUTSTANDING PAYMENTS
// ============================================================================
console.log('\n💰 TEST 8: Testing Outstanding Payments Report...');
console.log('-'.repeat(80));

try {
  const { data: outstanding, error } = await supabase
    .from('v_outstanding_payments')
    .select('*')
    .limit(5);

  if (error) {
    logTest('Outstanding Payments Report', false, `Error: ${error.message}`);
  } else {
    logTest('Outstanding Payments Report', true, `Found ${outstanding?.length || 0} outstanding records`);
    if (outstanding && outstanding.length > 0) {
      outstanding.forEach(record => {
        console.log(`   - ${record.customer_name}: ₹${record.outstanding_amount || 0}`);
      });
    }
  }
} catch (err) {
  logTest('Outstanding Payments Report', false, `Exception: ${err.message}`);
}

// ============================================================================
// TEST 9: TEST RPC FUNCTIONS
// ============================================================================
console.log('\n⚙️  TEST 9: Testing RPC Functions...');
console.log('-'.repeat(80));

const rpcFunctions = [
  'move_stock_to_stage',
  'update_design_availability',
  'get_customer_stock_summary'
];

for (const funcName of rpcFunctions) {
  try {
    // Just check if function exists by calling with minimal params
    // We expect an error, but not "function does not exist"
    const { error } = await supabase.rpc(funcName, {});

    if (error) {
      if (error.message.includes('does not exist') || error.code === '42883') {
        logTest(`Function: ${funcName}`, false, 'Function does not exist');
      } else {
        // Function exists but params are wrong - this is OK for this test
        logTest(`Function: ${funcName}`, true, 'Function exists (expected param error)');
      }
    } else {
      logTest(`Function: ${funcName}`, true, 'Function exists');
    }
  } catch (err) {
    logTest(`Function: ${funcName}`, false, `Exception: ${err.message}`);
  }
}

// ============================================================================
// TEST 10: CHECK AUTO-GENERATED NUMBER FUNCTIONS
// ============================================================================
console.log('\n🔢 TEST 10: Testing Auto-Generated Number Functions...');
console.log('-'.repeat(80));

const numberFunctions = [
  'generate_order_number',
  'generate_receipt_number',
  'generate_challan_number',
  'generate_invoice_number',
  'generate_credit_note_number',
  'generate_misprint_sale_number'
];

for (const funcName of numberFunctions) {
  try {
    const { data, error } = await supabase.rpc(funcName, {});

    if (error) {
      logTest(`Function: ${funcName}`, false, `Error: ${error.message}`);
    } else {
      logTest(`Function: ${funcName}`, true, `Generated: ${data}`);
    }
  } catch (err) {
    logTest(`Function: ${funcName}`, false, `Exception: ${err.message}`);
  }
}

// ============================================================================
// FINAL SUMMARY
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(80));
console.log(`Total Tests: ${totalTests}`);
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);
console.log(`Success Rate: ${totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0}%`);
console.log('='.repeat(80));

if (failedTests === 0) {
  console.log('\n🎉 ALL TESTS PASSED! System is ready for use.');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${failedTests} TEST(S) FAILED. Please review the errors above.`);
  console.log('\n📝 Common Issues:');
  console.log('   1. Database migration not executed - Run STEP_2_CREATE_SCHEMA.sql');
  console.log('   2. Missing environment variables - Check .env file');
  console.log('   3. RLS (Row Level Security) enabled - Check Supabase policies');
  process.exit(1);
}
