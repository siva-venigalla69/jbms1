#!/usr/bin/env node
/**
 * Check Delivery Challan Schema via Supabase API
 * Usage: node check_delivery_schema.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pvatfzwzfgioypdnqjay.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2YXRmend6Zmdpb3lwZG5xamF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjI1ODUsImV4cCI6MjA3MDkzODU4NX0.q3PgKkcsX5wXOys9aYwalhajH25uQ-gjCgVTZISi0Qs'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

console.log('========================================')
console.log('CHECKING DELIVERY CHALLAN SCHEMA')
console.log('========================================\n')

// 1. Check delivery_challans table structure
console.log('1. Checking delivery_challans table structure...\n')
const { data: deliveryChallans, error: dcError } = await supabase
  .from('delivery_challans')
  .select('*')
  .limit(1)

if (dcError) {
  console.error('❌ Error querying delivery_challans:', dcError.message)
} else {
  console.log('✅ delivery_challans table exists')
  if (deliveryChallans && deliveryChallans.length > 0) {
    console.log('📋 Sample record columns:', Object.keys(deliveryChallans[0]))
  } else {
    console.log('📋 Table is empty, checking schema via RPC...')
  }
}
console.log('')

// 2. Check challan_items table structure
console.log('2. Checking challan_items table structure...\n')
const { data: challanItems, error: ciError } = await supabase
  .from('challan_items')
  .select('*')
  .limit(1)

if (ciError) {
  console.error('❌ Error querying challan_items:', ciError.message)
} else {
  console.log('✅ challan_items table exists')
  if (challanItems && challanItems.length > 0) {
    console.log('📋 Sample record columns:', Object.keys(challanItems[0]))
  } else {
    console.log('📋 Table is empty')
  }
}
console.log('')

// 3. Query schema information using SQL
console.log('3. Querying table schema via SQL...\n')

const { data: dcSchema, error: dcSchemaError } = await supabase.rpc('exec_sql', {
  query: `
    SELECT
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_name = 'delivery_challans'
    ORDER BY ordinal_position;
  `
}).catch(() => {
  // If RPC doesn't exist, try direct query
  return { data: null, error: { message: 'exec_sql RPC not available' } }
})

if (!dcSchemaError) {
  console.log('✅ delivery_challans schema:')
  console.table(dcSchema)
} else {
  console.log('⚠️  Cannot query schema via RPC:', dcSchemaError.message)
  console.log('   Using alternative method...\n')

  // Alternative: Query actual data to see structure
  const { data: sampleDC, error: sampleError } = await supabase
    .from('delivery_challans')
    .select('*')
    .limit(1)

  if (!sampleError && sampleDC && sampleDC.length > 0) {
    console.log('📋 delivery_challans columns (from sample data):')
    Object.keys(sampleDC[0]).forEach(col => {
      console.log(`   - ${col}: ${typeof sampleDC[0][col]}`)
    })
  }
}
console.log('')

const { data: ciSchema, error: ciSchemaError } = await supabase.rpc('exec_sql', {
  query: `
    SELECT
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_name = 'challan_items'
    ORDER BY ordinal_position;
  `
}).catch(() => {
  return { data: null, error: { message: 'exec_sql RPC not available' } }
})

if (!ciSchemaError) {
  console.log('✅ challan_items schema:')
  console.table(ciSchema)
} else {
  console.log('⚠️  Cannot query schema via RPC:', ciSchemaError.message)
  console.log('   Using alternative method...\n')

  const { data: sampleCI, error: sampleError } = await supabase
    .from('challan_items')
    .select('*')
    .limit(1)

  if (!sampleError && sampleCI && sampleCI.length > 0) {
    console.log('📋 challan_items columns (from sample data):')
    Object.keys(sampleCI[0]).forEach(col => {
      console.log(`   - ${col}: ${typeof sampleCI[0][col]}`)
    })
  }
}
console.log('')

// 4. Check if order_id exists in delivery_challans
console.log('4. Checking for order_id column in delivery_challans...\n')
const { data: dcWithOrder, error: orderError } = await supabase
  .from('delivery_challans')
  .select('id, challan_number, order_id')
  .limit(1)

if (orderError) {
  if (orderError.message.includes('order_id')) {
    console.log('❌ order_id column does NOT exist in delivery_challans')
  } else {
    console.log('⚠️  Error:', orderError.message)
  }
} else {
  console.log('✅ order_id column EXISTS in delivery_challans')
  console.log('   Sample data:', dcWithOrder)
}
console.log('')

// 5. Check existing delivery challans
console.log('5. Checking existing delivery challans...\n')
const { data: existingDC, error: existingError } = await supabase
  .from('delivery_challans')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(5)

if (!existingError) {
  console.log(`✅ Found ${existingDC?.length || 0} recent delivery challans`)
  if (existingDC && existingDC.length > 0) {
    console.log('\n📋 Recent challans:')
    existingDC.forEach(dc => {
      console.log(`   - ${dc.challan_number}: ${dc.notes || 'No notes'}`)
    })
  }
} else {
  console.log('❌ Error fetching delivery challans:', existingError.message)
}
console.log('')

// 6. Check existing challan items
console.log('6. Checking existing challan items...\n')
const { data: existingCI, error: ciExistingError } = await supabase
  .from('challan_items')
  .select('*')
  .limit(5)

if (!ciExistingError) {
  console.log(`✅ Found ${existingCI?.length || 0} challan items`)
  if (existingCI && existingCI.length > 0) {
    console.log('\n📋 Sample challan items:')
    console.table(existingCI)
  }
} else {
  console.log('❌ Error fetching challan items:', ciExistingError.message)
}
console.log('')

console.log('========================================')
console.log('SCHEMA CHECK COMPLETE')
console.log('========================================')
