#!/usr/bin/env node
/**
 * Detailed Schema Checker - Check actual column types and enums
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrdersTableStructure() {
    console.log('🔍 Checking orders table structure...');

    try {
        // Get a sample order to see the actual structure
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .limit(1);

        if (error) {
            console.log('❌ Error querying orders table:', error.message);
            return null;
        }

        console.log('✅ Orders table accessible');

        if (data && data.length > 0) {
            console.log('📋 Sample order structure:');
            const order = data[0];
            Object.keys(order).forEach(key => {
                const value = order[key];
                const type = typeof value;
                console.log(`   ${key}: ${type} = ${value}`);
            });
        } else {
            console.log('📋 Orders table is empty - checking with insert test...');

            // Try to insert a test order to see what status values are allowed
            try {
                const { data: insertData, error: insertError } = await supabase
                    .from('orders')
                    .insert({
                        order_number: 'TEST-' + Date.now(),
                        customer_id: '00000000-0000-0000-0000-000000000000', // placeholder
                        order_date: new Date().toISOString().split('T')[0],
                        status: 'pending', // test with basic status
                        total_amount: 100,
                        notes: 'Schema test order'
                    })
                    .select()
                    .single();

                if (insertError) {
                    console.log('⚠️  Insert test failed:', insertError.message);
                    if (insertError.message.includes('status')) {
                        console.log('🎯 This tells us about the status column requirements');
                    }
                } else {
                    console.log('✅ Insert test successful');
                    console.log('📋 Inserted order structure:');
                    Object.keys(insertData).forEach(key => {
                        const value = insertData[key];
                        const type = typeof value;
                        console.log(`   ${key}: ${type} = ${value}`);
                    });

                    // Clean up test data
                    await supabase.from('orders').delete().eq('id', insertData.id);
                    console.log('🧹 Test order cleaned up');
                }
            } catch (insertErr) {
                console.log('⚠️  Insert test error:', insertErr.message);
            }
        }

        return data;
    } catch (err) {
        console.log('❌ Error checking orders table:', err.message);
        return null;
    }
}

async function testStatusValues() {
    console.log('\n🧪 Testing different status values...');

    const statusesToTest = ['pending', 'in_progress', 'completed', 'cancelled', 'partially_delivered'];

    for (const status of statusesToTest) {
        try {
            const testOrderNumber = `STATUS-TEST-${status}-${Date.now()}`;

            const { data, error } = await supabase
                .from('orders')
                .insert({
                    order_number: testOrderNumber,
                    customer_id: '00000000-0000-0000-0000-000000000000',
                    order_date: new Date().toISOString().split('T')[0],
                    status: status,
                    total_amount: 100,
                    notes: `Testing status: ${status}`
                })
                .select()
                .single();

            if (error) {
                console.log(`❌ Status '${status}': ${error.message}`);
                if (error.message.includes('enum') || error.message.includes('type')) {
                    console.log(`   🎯 This suggests '${status}' is not a valid enum value`);
                }
            } else {
                console.log(`✅ Status '${status}': Accepted`);
                // Clean up
                await supabase.from('orders').delete().eq('id', data.id);
            }
        } catch (err) {
            console.log(`❌ Status '${status}': ${err.message}`);
        }
    }
}

async function checkOrderItemsStructure() {
    console.log('\n🔍 Checking order_items table structure...');

    try {
        const { data, error } = await supabase
            .from('order_items')
            .select('*')
            .limit(1);

        if (error) {
            console.log('❌ Error querying order_items:', error.message);
            return;
        }

        console.log('✅ Order_items table accessible');

        if (data && data.length > 0) {
            console.log('📋 Sample order_item structure:');
            const item = data[0];
            Object.keys(item).forEach(key => {
                const value = item[key];
                const type = typeof value;
                console.log(`   ${key}: ${type} = ${value}`);
            });
        } else {
            console.log('📋 Order_items table is empty');
        }
    } catch (err) {
        console.log('❌ Error checking order_items:', err.message);
    }
}

async function main() {
    console.log('🔬 Detailed Schema Analysis');
    console.log('='.repeat(50));

    await checkOrdersTableStructure();
    await testStatusValues();
    await checkOrderItemsStructure();

    console.log('\n🎯 Summary & Recommendations:');
    console.log('Based on the test results above:');
    console.log('1. If enum errors occurred, the orders.status field uses an enum type');
    console.log('2. We need to either:');
    console.log('   a) Use existing enum values only, OR');
    console.log('   b) Create the enum type first, OR');
    console.log('   c) Use VARCHAR instead of enum');
    console.log('3. Update PRODUCTION_BATCH_SCHEMA.sql accordingly');
}

main().catch(console.error);