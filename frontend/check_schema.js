#!/usr/bin/env node
/**
 * Database Schema Checker
 * Uses the same Supabase client as the frontend to check current schema
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable(tableName) {
    try {
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(0);

        if (error) {
            return { exists: false, error: error.message };
        }
        return { exists: true, error: null };
    } catch (err) {
        return { exists: false, error: err.message };
    }
}

async function checkCurrentSchema() {
    console.log('🔍 Database Schema Analysis');
    console.log('=' * 50);
    console.log(`📡 Connected to: ${supabaseUrl}`);
    console.log('');

    // Check core tables
    const coreTables = [
        'customers',
        'orders',
        'order_items',
        'delivery_challans',
        'delivery_challan_items',
        'gst_invoices',
        'payments',
        'material_in',
        'employees'
    ];

    // Check new table
    const newTables = [
        'production_batches'
    ];

    console.log('📋 Core Tables Status:');
    for (const table of coreTables) {
        const result = await checkTable(table);
        const status = result.exists ? '✅' : '❌';
        console.log(`${status} ${table}`);
        if (!result.exists) {
            console.log(`   Error: ${result.error}`);
        }
    }

    console.log('');
    console.log('🏭 Production Batch Implementation:');
    for (const table of newTables) {
        const result = await checkTable(table);
        const status = result.exists ? '✅' : '❌';
        console.log(`${status} ${table}`);
        if (!result.exists) {
            console.log(`   ⚠️  Table missing - need to deploy PRODUCTION_BATCH_SCHEMA.sql`);
        } else {
            console.log(`   ✅ Table exists - ready for frontend integration`);
        }
    }

    console.log('');

    // Test sample data queries
    console.log('📊 Sample Data Check:');

    try {
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('id, order_number, status')
            .limit(3);

        if (!ordersError && orders) {
            console.log(`✅ orders: ${orders.length} records found`);
            if (orders.length > 0) {
                console.log(`   Sample: ${orders[0].order_number} (${orders[0].status})`);
            }
        }
    } catch (err) {
        console.log(`❌ orders: ${err.message}`);
    }

    try {
        const { data: orderItems, error: itemsError } = await supabase
            .from('order_items')
            .select('id, material_type, quantity')
            .limit(3);

        if (!itemsError && orderItems) {
            console.log(`✅ order_items: ${orderItems.length} records found`);
            if (orderItems.length > 0) {
                console.log(`   Sample: ${orderItems[0].material_type} (qty: ${orderItems[0].quantity})`);
            }
        }
    } catch (err) {
        console.log(`❌ order_items: ${err.message}`);
    }

    // Check if production_batches exists and has data
    try {
        const { data: batches, error: batchError } = await supabase
            .from('production_batches')
            .select('id, production_batch_number, batch_status')
            .limit(3);

        if (!batchError && batches) {
            console.log(`✅ production_batches: ${batches.length} records found`);
            if (batches.length > 0) {
                console.log(`   Sample: ${batches[0].production_batch_number} (${batches[0].batch_status})`);
            } else {
                console.log(`   ⚠️  Table exists but no data yet`);
            }
        }
    } catch (err) {
        console.log(`❌ production_batches: Table does not exist or access denied`);
    }

    console.log('');
    console.log('🎯 Analysis Summary:');

    const productionBatchExists = await checkTable('production_batches');

    if (productionBatchExists.exists) {
        console.log('✅ PRODUCTION BATCH SYSTEM: Ready');
        console.log('   - Schema is deployed');
        console.log('   - Can proceed with frontend development');
        console.log('   - Ready for end-to-end testing');
    } else {
        console.log('❌ PRODUCTION BATCH SYSTEM: Not Ready');
        console.log('   - Need to deploy PRODUCTION_BATCH_SCHEMA.sql');
        console.log('   - Go to Supabase Dashboard → SQL Editor');
        console.log('   - Paste and execute the schema SQL');
    }

    console.log('');
    console.log('📝 Next Steps:');
    if (!productionBatchExists.exists) {
        console.log('1. Deploy PRODUCTION_BATCH_SCHEMA.sql in Supabase Dashboard');
        console.log('2. Run this check again to verify deployment');
        console.log('3. Proceed with frontend component development');
    } else {
        console.log('1. ✅ Schema ready - proceed with frontend components');
        console.log('2. Create production batch management UI');
        console.log('3. Test end-to-end workflow with real data');
    }
}

// Run the check
checkCurrentSchema().catch(error => {
    console.error('💥 Error:', error.message);
    process.exit(1);
});