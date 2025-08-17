#!/usr/bin/env node

/**
 * COMMAND LINE RANDOM API TESTER
 * Quick CLI tool to test random APIs from command line
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), 'frontend/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing environment variables');
    console.error('Make sure frontend/.env.local has NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRandomAPIs() {
    console.log('🧪 CLI Random API Tester');
    console.log('========================');
    
    try {
        // Test 1: Authentication
        console.log('\n🔐 Testing Authentication...');
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: process.env.TEST_USER_EMAIL || 'shiva.venigalla@gmail.com',
            password: process.env.TEST_USER_PASSWORD || 'Admin@123!'
        });
        
        if (authError) {
            console.error('❌ Auth failed:', authError.message);
            return;
        }
        console.log('✅ Authentication successful');
        
        // Test 2: Random Customer API
        console.log('\n👥 Testing Customer API...');
        const { data: customers, error: customerError } = await supabase
            .from('customers')
            .select('*')
            .limit(3);
            
        if (customerError) {
            console.error('❌ Customer API failed:', customerError.message);
        } else {
            console.log(`✅ Retrieved ${customers.length} customers`);
            customers.forEach(c => console.log(`   📍 ${c.name} - ${c.phone}`));
        }
        
        // Test 3: Random Order API
        console.log('\n📦 Testing Order API...');
        const { data: orders, error: orderError } = await supabase
            .from('orders')
            .select(`
                *,
                customers (name),
                order_items (material_type, quantity)
            `)
            .limit(2);
            
        if (orderError) {
            console.error('❌ Order API failed:', orderError.message);
        } else {
            console.log(`✅ Retrieved ${orders.length} orders`);
            orders.forEach(o => console.log(`   📋 ${o.order_number} - ${o.customers?.name} - ${o.order_items?.length || 0} items`));
        }
        
        // Test 4: Random Production API
        console.log('\n🏭 Testing Production API...');
        const { data: production, error: prodError } = await supabase
            .from('order_items')
            .select(`
                *,
                orders (order_number),
                production_stages (name)
            `)
            .limit(3);
            
        if (prodError) {
            console.error('❌ Production API failed:', prodError.message);
        } else {
            console.log(`✅ Retrieved ${production.length} production items`);
            production.forEach(p => console.log(`   🔧 ${p.orders?.order_number} - ${p.material_type} - ${p.production_stage}`));
        }
        
        // Test 5: Random Financial API
        console.log('\n💰 Testing Financial API...');
        const { data: invoices, error: invoiceError } = await supabase
            .from('gst_invoices')
            .select(`
                *,
                customers (name),
                payments (payment_amount)
            `)
            .limit(2);
            
        if (invoiceError) {
            console.error('❌ Financial API failed:', invoiceError.message);
        } else {
            console.log(`✅ Retrieved ${invoices.length} invoices`);
            invoices.forEach(i => console.log(`   💳 ${i.invoice_number} - ₹${i.total_amount} - ${i.customers?.name}`));
        }
        
        console.log('\n🎉 Random API testing complete!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testRandomAPIs().then(() => process.exit(0)).catch(console.error);
}