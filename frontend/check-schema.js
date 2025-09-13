// Quick schema check script
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.REACT_APP_SUPABASE_URL, 
    process.env.REACT_APP_SUPABASE_ANON_KEY
);

async function checkSchema() {
    console.log('🔍 Checking database schema...\n');
    
    // Check customers table
    try {
        const { data, error } = await supabase.from('customers').select('*').limit(1);
        if (error) {
            console.log('❌ Customers table error:', error.message);
        } else {
            console.log('✅ Customers table accessible');
        }
    } catch (e) {
        console.log('❌ Customers table check failed:', e.message);
    }
    
    // Check designers table
    try {
        const { data, error } = await supabase.from('designers').select('*').limit(1);
        if (error) {
            console.log('❌ Designers table error:', error.message);
        } else {
            console.log('✅ Designers table accessible');
        }
    } catch (e) {
        console.log('❌ Designers table check failed:', e.message);
    }
    
    // Check designer_assignments table with new column
    try {
        const { data, error } = await supabase
            .from('designer_assignments')
            .select('id, assigned_design_quantity')
            .limit(1);
        if (error) {
            console.log('❌ Designer assignments table error:', error.message);
        } else {
            console.log('✅ Designer assignments table with assigned_design_quantity accessible');
        }
    } catch (e) {
        console.log('❌ Designer assignments table check failed:', e.message);
    }
    
    // Check design_assignment_summary view
    try {
        const { data, error } = await supabase
            .from('design_assignment_summary')
            .select('*')
            .limit(1);
        if (error) {
            console.log('❌ Design assignment summary view error:', error.message);
        } else {
            console.log('✅ Design assignment summary view accessible');
        }
    } catch (e) {
        console.log('❌ Design assignment summary view check failed:', e.message);
    }
    
    // Check orders and order_items tables
    try {
        const { data, error } = await supabase.from('orders').select('*').limit(1);
        if (error) {
            console.log('❌ Orders table error:', error.message);
        } else {
            console.log('✅ Orders table accessible');
        }
    } catch (e) {
        console.log('❌ Orders table check failed:', e.message);
    }
    
    try {
        const { data, error } = await supabase
            .from('order_items')
            .select('id, designs_provided_quantity, designs_approved_quantity')
            .limit(1);
        if (error) {
            console.log('❌ Order items table error:', error.message);
        } else {
            console.log('✅ Order items table with design quantities accessible');
        }
    } catch (e) {
        console.log('❌ Order items table check failed:', e.message);
    }
    
    // Check material_in table
    try {
        const { data, error } = await supabase.from('material_in').select('*').limit(1);
        if (error) {
            console.log('❌ Material_in table error:', error.message);
        } else {
            console.log('✅ Material_in table accessible');
        }
    } catch (e) {
        console.log('❌ Material_in table check failed:', e.message);
    }
    
    console.log('\n📊 Schema check complete');
}

checkSchema();