// Database structure checker utility
import { supabase } from '../lib/supabase';

export async function checkDatabaseStructure() {
  console.log('🔍 Checking current database structure...');
  
  try {
    // Check what tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');

    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError);
      return { success: false, error: tablesError };
    }

    console.log('📋 Existing tables:', tables?.map(t => t.table_name) || []);

    // Check if employees table exists and its structure
    const { data: employeeColumns, error: employeeError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'employees')
      .order('ordinal_position');

    if (employeeError) {
      console.log('⚠️  Employees table does not exist or error:', employeeError);
    } else {
      console.log('👥 Employees table columns:', employeeColumns);
    }

    // Check other important tables
    const tablesToCheck = ['salary_payments', 'expenses', 'purchases', 'payments', 'customers'];
    
    for (const tableName of tablesToCheck) {
      const { data: columns, error } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_schema', 'public')
        .eq('table_name', tableName)
        .limit(5);

      if (error || !columns || columns.length === 0) {
        console.log(`❌ Table '${tableName}' does not exist`);
      } else {
        console.log(`✅ Table '${tableName}' exists with columns:`, columns.map(c => c.column_name));
      }
    }

    return { 
      success: true, 
      tables: tables?.map(t => t.table_name) || [],
      employeeColumns 
    };
  } catch (error) {
    console.error('❌ Database check failed:', error);
    return { success: false, error };
  }
}

export async function testBasicConnection() {
  console.log('🧪 Testing basic database connection...');
  
  try {
    // Try a simple query that should work on any Supabase instance
    const { data, error } = await supabase
      .from('information_schema.schemata')
      .select('schema_name')
      .limit(1);

    if (error) {
      console.error('❌ Connection test failed:', error);
      return { success: false, error };
    }

    console.log('✅ Database connection successful');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Connection test error:', error);
    return { success: false, error };
  }
}