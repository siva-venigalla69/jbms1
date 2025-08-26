-- =====================================
-- DATABASE MIGRATION STATUS CHECK
-- Run this after stock fix to see what migrations are needed
-- =====================================

DO $$
DECLARE
    migration_report TEXT := '';
    table_count INTEGER;
    column_count INTEGER;
    constraint_count INTEGER;
BEGIN
    migration_report := '=== DATABASE MIGRATION STATUS REPORT ===' || E'\n\n';
    
    -- 1. CHECK SCHEMA COMPATIBILITY
    migration_report := migration_report || '--- 1. SCHEMA TYPE ANALYSIS ---' || E'\n';
    
    -- Check if we're using ENUM-based or TABLE-based design
    SELECT COUNT(*) INTO table_count FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name IN ('material_types', 'order_statuses', 'user_roles');
    
    IF table_count > 0 THEN
        migration_report := migration_report || '✅ CURRENT SCHEMA: Reference Tables (material_types, order_statuses, etc.)' || E'\n';
        migration_report := migration_report || '📋 PROJECT SCHEMA: Uses ENUMs in original design' || E'\n';
        migration_report := migration_report || '⚠️ COMPATIBILITY: Need to maintain current table-based design' || E'\n\n';
    ELSE
        migration_report := migration_report || '✅ CURRENT SCHEMA: ENUM-based design' || E'\n';
        migration_report := migration_report || '✅ PROJECT SCHEMA: Matches ENUM design' || E'\n\n';
    END IF;
    
    -- 2. TABLE EXISTENCE CHECK
    migration_report := migration_report || '--- 2. CORE TABLES STATUS ---' || E'\n';
    
    -- Check critical tables
    FOR table_name IN VALUES ('customers'), ('orders'), ('order_items'), ('material_in'), 
                              ('delivery_challans'), ('challan_items'), ('material_stock'), 
                              ('gst_invoices'), ('payments'), ('returns'), ('inventory'), 
                              ('expenses'), ('audit_trail')
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = table_name) THEN
            SELECT COUNT(*) INTO column_count FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = table_name;
            migration_report := migration_report || '✅ ' || UPPER(table_name) || ': EXISTS (' || column_count || ' columns)' || E'\n';
        ELSE
            migration_report := migration_report || '❌ ' || UPPER(table_name) || ': MISSING' || E'\n';
        END IF;
    END LOOP;
    migration_report := migration_report || E'\n';
    
    -- 3. MISSING COLUMNS CHECK
    migration_report := migration_report || '--- 3. MISSING COLUMNS ANALYSIS ---' || E'\n';
    
    -- Check delivery_challans for API compatibility columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_challans' AND column_name = 'order_id') THEN
        migration_report := migration_report || '❌ delivery_challans.order_id: MISSING (API expects this)' || E'\n';
    ELSE
        migration_report := migration_report || '✅ delivery_challans.order_id: EXISTS' || E'\n';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_challans' AND column_name = 'total_amount') THEN
        migration_report := migration_report || '❌ delivery_challans.total_amount: MISSING (API expects this)' || E'\n';
    ELSE
        migration_report := migration_report || '✅ delivery_challans.total_amount: EXISTS' || E'\n';
    END IF;
    migration_report := migration_report || E'\n';
    
    -- 4. DESIGN MANAGEMENT TABLES CHECK
    migration_report := migration_report || '--- 4. DESIGN MANAGEMENT TABLES ---' || E'\n';
    
    FOR table_name IN VALUES ('design_submissions'), ('design_status'), ('design_approvals'), 
                              ('design_printing_queue'), ('material_design_mapping')
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = table_name) THEN
            migration_report := migration_report || '✅ ' || UPPER(table_name) || ': EXISTS' || E'\n';
        ELSE
            migration_report := migration_report || '❌ ' || UPPER(table_name) || ': MISSING (NEEDED FOR DESIGN WORKFLOW)' || E'\n';
        END IF;
    END LOOP;
    migration_report := migration_report || E'\n';
    
    -- 5. AUDIT AND TRACKING TABLES
    migration_report := migration_report || '--- 5. AUDIT & TRACKING TABLES ---' || E'\n';
    
    FOR table_name IN VALUES ('audit_trail'), ('material_stock_history'), ('production_log'), 
                              ('design_workflow_log'), ('stock_movements')
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = table_name) THEN
            migration_report := migration_report || '✅ ' || UPPER(table_name) || ': EXISTS' || E'\n';
        ELSE
            migration_report := migration_report || '❌ ' || UPPER(table_name) || ': MISSING' || E'\n';
        END IF;
    END LOOP;
    migration_report := migration_report || E'\n';
    
    -- 6. VIEWS AND FUNCTIONS STATUS
    migration_report := migration_report || '--- 6. VIEWS AND FUNCTIONS ---' || E'\n';
    
    FOR view_name IN VALUES ('material_stock_api_view'), ('delivery_challans_api_view'), 
                             ('customer_activity_summary'), ('daily_business_summary'),
                             ('material_stock_with_customer')
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = view_name) THEN
            migration_report := migration_report || '✅ VIEW ' || UPPER(view_name) || ': EXISTS' || E'\n';
        ELSE
            migration_report := migration_report || '❌ VIEW ' || UPPER(view_name) || ': MISSING' || E'\n';
        END IF;
    END LOOP;
    migration_report := migration_report || E'\n';
    
    -- 7. CRITICAL FUNCTIONS CHECK
    migration_report := migration_report || '--- 7. CRITICAL FUNCTIONS ---' || E'\n';
    
    FOR function_name IN VALUES ('get_material_type_id'), ('insert_material_in_with_string_type'), 
                                 ('update_material_stock_on_delivery'), ('calculate_customer_stock')
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = function_name) THEN
            migration_report := migration_report || '✅ FUNCTION ' || function_name || '(): EXISTS' || E'\n';
        ELSE
            migration_report := migration_report || '❌ FUNCTION ' || function_name || '(): MISSING' || E'\n';
        END IF;
    END LOOP;
    migration_report := migration_report || E'\n';
    
    -- 8. MIGRATION PRIORITY ASSESSMENT
    migration_report := migration_report || '--- 8. MIGRATION PRIORITY ---' || E'\n';
    migration_report := migration_report || '🚨 CRITICAL MISSING:' || E'\n';
    migration_report := migration_report || '   - Design management tables (for workflow)' || E'\n';
    migration_report := migration_report || '   - API compatibility views' || E'\n';
    migration_report := migration_report || '   - Stock calculation functions' || E'\n';
    migration_report := migration_report || E'\n';
    migration_report := migration_report || '⚡ HIGH PRIORITY:' || E'\n';
    migration_report := migration_report || '   - Audit trail enhancements' || E'\n';
    migration_report := migration_report || '   - Material stock history tracking' || E'\n';
    migration_report := migration_report || '   - Production workflow tables' || E'\n';
    migration_report := migration_report || E'\n';
    
    -- 9. RECOMMENDED MIGRATION ORDER
    migration_report := migration_report || '--- 9. RECOMMENDED MIGRATION ORDER ---' || E'\n';
    migration_report := migration_report || '1. Fix current stock issues (URGENT_01_STOCK_FIX.sql)' || E'\n';
    migration_report := migration_report || '2. Add missing API compatibility columns' || E'\n';
    migration_report := migration_report || '3. Create design management schema' || E'\n';
    migration_report := migration_report || '4. Add audit trail enhancements' || E'\n';
    migration_report := migration_report || '5. Create views and functions for API compatibility' || E'\n';
    migration_report := migration_report || E'\n';
    
    -- Output the report
    RAISE NOTICE '%', migration_report;
    
    -- Save to temp table
    DROP TABLE IF EXISTS temp_migration_report;
    CREATE TEMP TABLE temp_migration_report AS SELECT migration_report as report;
END $$;

-- Get the migration report
SELECT report FROM temp_migration_report;