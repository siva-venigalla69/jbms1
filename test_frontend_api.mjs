import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pvatfzwzfgioypdnqjay.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2YXRmend6Zmdpb3lwZG5xamF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjI1ODUsImV4cCI6MjA3MDkzODU4NX0.q3PgKkcsX5wXOys9aYwalhajH25uQ-gjCgVTZISi0Qs';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🧪 Testing Frontend API Access\n');

// Test 1: Check if we can access customers table
console.log('📊 TEST 1: Fetching customers...');
try {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .limit(5);

  if (error) {
    console.error('❌ Error fetching customers:', error.message);
    console.error('   Details:', error);
  } else {
    console.log(`✅ Customers fetched: ${data.length} records`);
    if (data.length > 0) {
      console.log('   Sample:', data[0].name);
    }
  }
} catch (err) {
  console.error('❌ Exception:', err.message);
}

// Test 2: Check stock_by_customer view
console.log('\n📊 TEST 2: Fetching v_stock_by_customer view...');
try {
  const { data, error } = await supabase
    .from('v_stock_by_customer')
    .select('*')
    .limit(5);

  if (error) {
    console.error('❌ Error fetching stock view:', error.message);
    console.error('   Details:', error);
  } else {
    console.log(`✅ Stock by customer fetched: ${data.length} records`);
    if (data.length > 0) {
      console.log('   Sample:', data[0]);
    }
  }
} catch (err) {
  console.error('❌ Exception:', err.message);
}

// Test 3: Check outstanding payments view
console.log('\n📊 TEST 3: Fetching v_outstanding_payments view...');
try {
  const { data, error } = await supabase
    .from('v_outstanding_payments')
    .select('*')
    .limit(5);

  if (error) {
    console.error('❌ Error fetching outstanding payments:', error.message);
    console.error('   Details:', error);
  } else {
    console.log(`✅ Outstanding payments fetched: ${data.length} records`);
    if (data.length > 0) {
      console.log('   Sample:', data[0]);
    }
  }
} catch (err) {
  console.error('❌ Exception:', err.message);
}

// Test 4: Check orders table
console.log('\n📊 TEST 4: Fetching orders...');
try {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .limit(5);

  if (error) {
    console.error('❌ Error fetching orders:', error.message);
    console.error('   Details:', error);
  } else {
    console.log(`✅ Orders fetched: ${data.length} records`);
    if (data.length > 0) {
      console.log('   Sample:', data[0].order_number);
    }
  }
} catch (err) {
  console.error('❌ Exception:', err.message);
}

// Test 5: Check material_types table
console.log('\n📊 TEST 5: Fetching material_types...');
try {
  const { data, error } = await supabase
    .from('material_types')
    .select('*');

  if (error) {
    console.error('❌ Error fetching material types:', error.message);
    console.error('   Details:', error);
  } else {
    console.log(`✅ Material types fetched: ${data.length} records`);
    data.forEach(mt => console.log(`   - ${mt.name} (${mt.code})`));
  }
} catch (err) {
  console.error('❌ Exception:', err.message);
}

console.log('\n✅ Test complete!');
