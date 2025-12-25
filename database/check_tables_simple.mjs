#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://pvatfzwzfgioypdnqjay.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2YXRmend6Zmdpb3lwZG5xamF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjI1ODUsImV4cCI6MjA3MDkzODU4NX0.q3PgKkcsX5wXOys9aYwalhajH25uQ-gjCgVTZISi0Qs'
)

console.log('\n========================================')
console.log('DELIVERY CHALLAN SCHEMA CHECK')
console.log('========================================\n')

// Check delivery_challans
const { data: dc, error: dcErr } = await supabase
  .from('delivery_challans')
  .select('*')
  .limit(1)

if (!dcErr && dc && dc.length > 0) {
  console.log('✅ delivery_challans columns:')
  Object.keys(dc[0]).forEach(col => console.log(`   - ${col}`))
} else {
  console.log('⚠️  delivery_challans:', dcErr?.message || 'No data')
}

console.log('\n----------------------------------------\n')

// Check challan_items
const { data: ci, error: ciErr } = await supabase
  .from('challan_items')
  .select('*')
  .limit(1)

if (!ciErr && ci && ci.length > 0) {
  console.log('✅ challan_items columns:')
  Object.keys(ci[0]).forEach(col => console.log(`   - ${col}`))
} else {
  console.log('⚠️  challan_items:', ciErr?.message || 'No data')
}

console.log('\n----------------------------------------\n')

// Check order_items table
const { data: oi, error: oiErr } = await supabase
  .from('order_items')
  .select('*')
  .limit(1)

if (!oiErr && oi && oi.length > 0) {
  console.log('✅ order_items exists with columns:')
  Object.keys(oi[0]).forEach(col => console.log(`   - ${col}`))
} else {
  console.log('❌ order_items table:', oiErr?.message || 'No data')
}

console.log('\n----------------------------------------\n')

// Check if we need a simpler challan_items structure
console.log('📋 Current challan_items structure references order_items table')
console.log('📋 For simplified system, we need challan_items to directly store:')
console.log('   - challan_id (FK to delivery_challans)')
console.log('   - material_type (SAREE, VONI, DUPPATTA, etc.)')
console.log('   - quantity')
console.log('   - order_id (FK to orders)')
console.log('')

console.log('========================================\n')
