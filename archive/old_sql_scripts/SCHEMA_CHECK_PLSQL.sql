-- =====================================
-- SCHEMA CHECK AS PROPER PL/SQL BLOCK
-- Single block execution for PostgreSQL
-- =====================================

DO $$
DECLARE
    schema_report TEXT := '';
    rec RECORD;
    table_count INTEGER;
    negative_stock_count INTEGER;
    design_table_count INTEGER;
BEGIN
    -- Initialize report
    schema_report := '=====================================' || E'\n';
    schema_report := schema_report || 'DATABASE DEPLOYMENT VALIDATION REPORT' || E'\n';
    schema_report := schema_report || 'Generated: ' || NOW()::TEXT || E'\n';
    schema_report := schema_report || '=====================================' || E'\n\n';

    -- 1. CORE TABLES STATUS
    schema_report := schema_report || '--- 1. CORE TABLES STATUS ---' || E'\n';
    
    -- Check each critical table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers') THEN
        SELECT COUNT(*) INTO table_count FROM customers;
        schema_report := schema_report || '✅ CUSTOMERS: ' || table_count || ' records' || E'\n';
    ELSE
        schema_report := schema_report || '❌ CUSTOMERS: TABLE MISSING' || E'\n';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
        SELECT COUNT(*) INTO table_count FROM orders;
        schema_report := schema_report || '✅ ORDERS: ' || table_count || ' records' || E'\n';
    ELSE
        schema_report := schema_report || '❌ ORDERS: TABLE MISSING' || E'\n';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'material_in') THEN
        SELECT COUNT(*) INTO table_count FROM material_in;
        schema_report := schema_report || '✅ MATERIAL_IN: ' || table_count || ' records' || E'\n';
    ELSE
        schema_report := schema_report || '❌ MATERIAL_IN: TABLE MISSING' || E'\n';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'material_stock') THEN
        SELECT COUNT(*) INTO table_count FROM material_stock;
        schema_report := schema_report || '✅ MATERIAL_STOCK: ' || table_count || ' records' || E'\n';
    ELSE
        schema_report := schema_report || '❌ MATERIAL_STOCK: TABLE MISSING (CRITICAL)' || E'\n';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'delivery_challans') THEN
        SELECT COUNT(*) INTO table_count FROM delivery_challans;
        schema_report := schema_report || '✅ DELIVERY_CHALLANS: ' || table_count || ' records' || E'\n';
    ELSE
        schema_report := schema_report || '❌ DELIVERY_CHALLANS: TABLE MISSING' || E'\n';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'challan_items') THEN
        SELECT COUNT(*) INTO table_count FROM challan_items;
        schema_report := schema_report || '✅ CHALLAN_ITEMS: ' || table_count || ' records' || E'\n';
    ELSE
        schema_report := schema_report || '❌ CHALLAN_ITEMS: TABLE MISSING' || E'\n';
    END IF;
    
    schema_report := schema_report || E'\n';

    -- 2. SCHEMA TYPE ANALYSIS
    schema_report := schema_report || '--- 2. SCHEMA TYPE ANALYSIS ---' || E'\n';
    
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('material_types', 'order_statuses', 'user_roles');
    
    IF table_count >= 3 THEN
        schema_report := schema_report || '✅ SCHEMA TYPE: Reference Tables Design' || E'\n';
        schema_report := schema_report || '📋 MATERIAL_TYPE STORAGE: Foreign Key to material_types table' || E'\n';
        schema_report := schema_report || '⚠️ SCRIPT COMPATIBILITY: Requires VARCHAR-compatible scripts' || E'\n';
    ELSIF table_count > 0 THEN
        schema_report := schema_report || '🔶 SCHEMA TYPE: Mixed (Some reference tables exist)' || E'\n';
        schema_report := schema_report || '📋 DETECTED TABLES: ' || table_count || '/3 reference tables' || E'\n';
    ELSE
        schema_report := schema_report || '✅ SCHEMA TYPE: ENUM-based Design' || E'\n';
        schema_report := schema_report || '📋 MATERIAL_TYPE STORAGE: Direct enum values' || E'\n';
    END IF;
    schema_report := schema_report || E'\n';

    -- 3. DATA TYPE ANALYSIS
    schema_report := schema_report || '--- 3. DATA TYPE ANALYSIS ---' || E'\n';
    
    -- Check material_type column types
    FOR rec IN 
        SELECT table_name, column_name, data_type
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND column_name = 'material_type'
        AND table_name IN ('material_in', 'material_stock', 'order_items')
        ORDER BY table_name
    LOOP
        schema_report := schema_report || rec.table_name || '.material_type: ' || rec.data_type || E'\n';
    END LOOP;
    schema_report := schema_report || E'\n';

    -- 4. CRITICAL ISSUES IDENTIFICATION
    schema_report := schema_report || '--- 4. CRITICAL ISSUES IDENTIFICATION ---' || E'\n';
    
    -- Check for negative stock
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'material_stock') THEN
        SELECT COUNT(*) INTO negative_stock_count FROM material_stock WHERE current_stock < 0;
        IF negative_stock_count > 0 THEN
            schema_report := schema_report || '🚨 CRITICAL: ' || negative_stock_count || ' customers with NEGATIVE STOCK' || E'\n';
            schema_report := schema_report || '💡 ACTION REQUIRED: Run URGENT_01_STOCK_FIX_CORRECTED.sql' || E'\n';
        ELSE
            schema_report := schema_report || '✅ STOCK CALCULATIONS: All values positive' || E'\n';
        END IF;
    ELSE
        schema_report := schema_report || '🚨 CRITICAL: material_stock table does not exist' || E'\n';
        schema_report := schema_report || '💡 ACTION REQUIRED: Create material_stock table first' || E'\n';
    END IF;
    
    -- Check for design management system
    SELECT COUNT(*) INTO design_table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('design_submissions', 'design_status', 'material_design_mapping', 'design_printing_queue');
    
    IF design_table_count = 0 THEN
        schema_report := schema_report || '📋 MISSING: Design management system not deployed (0/4 tables)' || E'\n';
        schema_report := schema_report || '💡 ENHANCEMENT: Deploy design workflow system' || E'\n';
    ELSIF design_table_count < 4 THEN
        schema_report := schema_report || '🔶 PARTIAL: Design management partially deployed (' || design_table_count || '/4 tables)' || E'\n';
    ELSE
        schema_report := schema_report || '✅ DESIGN SYSTEM: Complete design management deployed' || E'\n';
    END IF;
    schema_report := schema_report || E'\n';

    -- 5. SAMPLE DATA ANALYSIS
    schema_report := schema_report || '--- 5. SAMPLE DATA ANALYSIS ---' || E'\n';
    
    -- Recent material receipts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'material_in') THEN
        schema_report := schema_report || 'RECENT MATERIAL RECEIPTS:' || E'\n';
        FOR rec IN 
            SELECT c.name, mi.material_type, mi.quantity, mi.received_date::date
            FROM material_in mi
            JOIN customers c ON mi.customer_id = c.id
            ORDER BY mi.received_date DESC
            LIMIT 5
        LOOP
            schema_report := schema_report || '  - ' || rec.received_date || ': ' || rec.name || 
                           ' received ' || rec.quantity || ' ' || rec.material_type || E'\n';
        END LOOP;
    END IF;
    schema_report := schema_report || E'\n';
    
    -- Current stock status
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'material_stock') THEN
        schema_report := schema_report || 'CURRENT STOCK STATUS:' || E'\n';
        FOR rec IN 
            SELECT c.name, ms.material_type, ms.total_received, ms.total_delivered, ms.current_stock
            FROM material_stock ms
            JOIN customers c ON ms.customer_id = c.id
            WHERE c.name IN ('SIVA HANDLOOMS', 'SRINIVASA HANDLOOMS')
            ORDER BY c.name, ms.material_type
        LOOP
            schema_report := schema_report || '  - ' || rec.name || ': ' || rec.material_type || 
                           ' (Received:' || rec.total_received || 
                           ' Delivered:' || rec.total_delivered || 
                           ' Current:' || rec.current_stock || ')' ||
                           CASE WHEN rec.current_stock < 0 THEN ' ❌ NEGATIVE' ELSE ' ✅' END || E'\n';
        END LOOP;
    END IF;
    schema_report := schema_report || E'\n';

    -- 6. DEPLOYMENT READINESS ASSESSMENT
    schema_report := schema_report || '--- 6. DEPLOYMENT READINESS ASSESSMENT ---' || E'\n';
    
    -- Calculate overall readiness
    DECLARE
        core_tables_ready INTEGER := 0;
        stock_system_ready BOOLEAN := FALSE;
        design_system_ready BOOLEAN := FALSE;
        overall_readiness INTEGER;
    BEGIN
        -- Count core tables
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN core_tables_ready := core_tables_ready + 1; END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN core_tables_ready := core_tables_ready + 1; END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_in') THEN core_tables_ready := core_tables_ready + 1; END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'delivery_challans') THEN core_tables_ready := core_tables_ready + 1; END IF;
        
        -- Check stock system
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_stock') THEN
            IF NOT EXISTS (SELECT 1 FROM material_stock WHERE current_stock < 0) THEN
                stock_system_ready := TRUE;
            END IF;
        END IF;
        
        -- Check design system
        IF design_table_count >= 3 THEN
            design_system_ready := TRUE;
        END IF;
        
        -- Calculate overall percentage
        overall_readiness := (core_tables_ready * 15) + 
                           CASE WHEN stock_system_ready THEN 25 ELSE 0 END +
                           CASE WHEN design_system_ready THEN 15 ELSE 0 END;
        
        schema_report := schema_report || 'CORE TABLES: ' || core_tables_ready || '/4 (' || (core_tables_ready * 25) || '%)' || E'\n';
        schema_report := schema_report || 'STOCK SYSTEM: ' || CASE WHEN stock_system_ready THEN 'READY ✅' ELSE 'NEEDS FIXING ❌' END || E'\n';
        schema_report := schema_report || 'DESIGN SYSTEM: ' || CASE WHEN design_system_ready THEN 'READY ✅' ELSE 'NOT DEPLOYED ❌' END || E'\n';
        schema_report := schema_report || 'OVERALL READINESS: ' || overall_readiness || '% ';
        
        IF overall_readiness >= 80 THEN
            schema_report := schema_report || '🟢 EXCELLENT' || E'\n';
        ELSIF overall_readiness >= 60 THEN
            schema_report := schema_report || '🟡 GOOD' || E'\n';
        ELSIF overall_readiness >= 40 THEN
            schema_report := schema_report || '🟠 NEEDS WORK' || E'\n';
        ELSE
            schema_report := schema_report || '🔴 CRITICAL ISSUES' || E'\n';
        END IF;
    END;
    schema_report := schema_report || E'\n';

    -- 7. PRIORITIZED ACTION PLAN
    schema_report := schema_report || '--- 7. PRIORITIZED ACTION PLAN ---' || E'\n';
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_stock') THEN
        schema_report := schema_report || '🚨 PRIORITY 1: Create material_stock table' || E'\n';
    ELSIF negative_stock_count > 0 THEN
        schema_report := schema_report || '🚨 PRIORITY 1: Fix negative stock calculations' || E'\n';
        schema_report := schema_report || '   → Run: URGENT_01_STOCK_FIX_CORRECTED.sql' || E'\n';
    ELSE
        schema_report := schema_report || '✅ PRIORITY 1: Stock system working correctly' || E'\n';
    END IF;
    
    IF design_table_count = 0 THEN
        schema_report := schema_report || '📋 PRIORITY 2: Deploy design management system' || E'\n';
        schema_report := schema_report || '   → Run: MIGRATION_03_DESIGN_MANAGEMENT_SCHEMA.sql' || E'\n';
    ELSE
        schema_report := schema_report || '✅ PRIORITY 2: Design system deployed' || E'\n';
    END IF;
    
    schema_report := schema_report || '🔧 PRIORITY 3: Deploy API compatibility updates' || E'\n';
    schema_report := schema_report || '   → Run: 08_API_COMPATIBILITY_UPDATE.sql' || E'\n';
    schema_report := schema_report || '📊 PRIORITY 4: Run final deployment verification' || E'\n';
    schema_report := schema_report || '   → Run: FINAL_DEPLOYMENT_SUMMARY.sql' || E'\n';
    schema_report := schema_report || E'\n';

    -- 8. DEPLOYMENT LOG SUMMARY
    schema_report := schema_report || '--- 8. DEPLOYMENT LOG SUMMARY ---' || E'\n';
    schema_report := schema_report || 'Validation completed at: ' || NOW()::TEXT || E'\n';
    schema_report := schema_report || 'Database: ' || current_database() || E'\n';
    schema_report := schema_report || 'Schema: public' || E'\n';
    schema_report := schema_report || 'Total tables found: ' || (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') || E'\n';
    schema_report := schema_report || 'Total views found: ' || (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public') || E'\n';
    schema_report := schema_report || E'\n';
    
    schema_report := schema_report || '=====================================' || E'\n';
    schema_report := schema_report || 'END OF DEPLOYMENT VALIDATION REPORT' || E'\n';
    schema_report := schema_report || '=====================================' || E'\n';

    -- Output the complete report
    RAISE NOTICE '%', schema_report;
    
    -- Save to permanent table for logging
    DROP TABLE IF EXISTS deployment_validation_log;
    CREATE TABLE deployment_validation_log (
        id SERIAL PRIMARY KEY,
        validation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        report_content TEXT,
        overall_readiness INTEGER,
        critical_issues_count INTEGER,
        next_action VARCHAR(500)
    );
    
    INSERT INTO deployment_validation_log (
        report_content, 
        overall_readiness,
        critical_issues_count,
        next_action
    ) VALUES (
        schema_report,
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_stock')
                AND NOT EXISTS (SELECT 1 FROM material_stock WHERE current_stock < 0)
                AND design_table_count >= 3
            THEN 90
            WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_stock')
                AND NOT EXISTS (SELECT 1 FROM material_stock WHERE current_stock < 0)
            THEN 70
            WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_stock')
            THEN 50
            ELSE 30
        END,
        CASE 
            WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_stock') THEN 2
            WHEN EXISTS (SELECT 1 FROM material_stock WHERE current_stock < 0) THEN 1
            ELSE 0
        END,
        CASE 
            WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_stock')
            THEN 'Create material_stock table'
            WHEN EXISTS (SELECT 1 FROM material_stock WHERE current_stock < 0)
            THEN 'Fix negative stock calculations'
            ELSE 'Deploy design management system'
        END
    );
    
    -- Confirmation message
    RAISE NOTICE 'Deployment validation completed and logged to deployment_validation_log table';
    
END $$;

-- Query the saved log
SELECT 
    'DEPLOYMENT VALIDATION COMPLETED' as status,
    validation_date,
    overall_readiness || '%' as system_readiness,
    critical_issues_count,
    next_action
FROM deployment_validation_log 
ORDER BY validation_date DESC 
LIMIT 1;