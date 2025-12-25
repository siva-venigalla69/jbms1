#!/usr/bin/env node
// Execute Database Fix - Add is_active column to customers table
// Created: 2025-12-21

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('='.repeat(80));
console.log('🔧 EXECUTING DATABASE FIX - Add is_active to customers table');
console.log('='.repeat(80));
console.log('');

async function executeFix() {
  try {
    console.log('📝 Step 1: Checking current customers table structure...');

    // Try to query with is_active to see if it exists
    const { data: testData, error: testError } = await supabase
      .from('customers')
      .select('id, name, is_active')
      .limit(1);

    if (!testError) {
      console.log('✅ is_active column already exists! No fix needed.');
      console.log(`   Found ${testData?.length || 0} customer records with is_active column.`);
      return;
    }

    if (testError.code !== '42703') {
      console.log('⚠️  Unexpected error:', testError.message);
      console.log('   The column might already exist or there\'s another issue.');
      return;
    }

    console.log('⚠️  Confirmed: is_active column does not exist');
    console.log('');
    console.log('📝 Step 2: Fix Required - Manual SQL Execution Needed');
    console.log('');
    console.log('⚠️  IMPORTANT: This fix requires database admin privileges.');
    console.log('   The Supabase client cannot execute ALTER TABLE via the API.');
    console.log('');
    console.log('📋 INSTRUCTIONS:');
    console.log('   1. Open Supabase Dashboard: https://supabase.com/dashboard');
    console.log('   2. Navigate to: Your Project → SQL Editor');
    console.log('   3. Click "New Query"');
    console.log('   4. Copy and paste the SQL below:');
    console.log('');
    console.log('─'.repeat(80));
    console.log('-- SQL FIX FOR customers TABLE');
    console.log('');
    console.log('DO $$');
    console.log('BEGIN');
    console.log('  -- Add is_active column');
    console.log('  BEGIN');
    console.log('    ALTER TABLE customers ADD COLUMN is_active BOOLEAN DEFAULT TRUE;');
    console.log('    RAISE NOTICE \'✅ Added is_active column to customers table\';');
    console.log('  EXCEPTION');
    console.log('    WHEN duplicate_column THEN');
    console.log('      RAISE NOTICE \'⚠️ is_active column already exists - skipping\';');
    console.log('  END;');
    console.log('');
    console.log('  -- Set existing NULL values to TRUE');
    console.log('  UPDATE customers SET is_active = TRUE WHERE is_active IS NULL;');
    console.log('  RAISE NOTICE \'✅ Set all existing customers to active\';');
    console.log('');
    console.log('END $$;');
    console.log('');
    console.log('-- Verify the fix');
    console.log('SELECT');
    console.log('  COUNT(*) as total_customers,');
    console.log('  SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active,');
    console.log('  SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) as inactive');
    console.log('FROM customers;');
    console.log('─'.repeat(80));
    console.log('');
    console.log('   5. Click "Run" (or press F5)');
    console.log('   6. Verify you see success messages');
    console.log('   7. Re-run: node test_simplified_system.mjs');
    console.log('');
    console.log('📝 OR: Execute the pre-made SQL file:');
    console.log('   File: /home/siva/sandboxes/jbms1/database/FIX_CUSTOMERS_TABLE.sql');
    console.log('');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

executeFix().then(() => {
  console.log('='.repeat(80));
  console.log('✅ Script complete');
  console.log('='.repeat(80));
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
