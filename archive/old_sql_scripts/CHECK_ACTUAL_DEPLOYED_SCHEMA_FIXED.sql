-- =====================================
-- CHECK ACTUAL DEPLOYED DATABASE SCHEMA (FIXED)
-- Run this to see exactly what's in your database
-- =====================================

DO $$
DECLARE
    schema_report TEXT := '';
    rec RECORD;
    table_count INTEGER;
    table_names TEXT[] := ARRAY['material_types', 'order_statuses', 'user_roles', 'payment_methods', 'production_stages', 'return_reasons'];
    table_name TEXT;
BEGIN
    schema_report := '=== ACTUAL DEPLOYED DATABASE SCHEMA REPORT ===' || E'\n\n';
    
    -- 1. ALL TABLES WITH ROW COUNTS
    schema_report := schema_report || '--- 1. ALL TABLES AND DATA COUNTS ---' || E'\n';
    
    FOR rec IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
    LOOP
        BEGIN
            EXECUTE 'SELECT COUNT(*) FROM ' || quote_ident(rec.table_name) INTO table_count;
            schema_report := schema_report || '✅ ' || UPPER(rec.table_name) || ': ' || table_count || ' records' || E'\n';
        EXCEPTION
            WHEN OTHERS THEN
                schema_report := schema_report || '❌ ' || UPPER(rec.table_name) || ': ERROR reading count' || E'\n';
        END;
    END LOOP;
    schema_report := schema_report || E'\n';
    
    -- 2. CRITICAL TABLE STRUCTURES
    schema_report := schema_report || '--- 2. CRITICAL TABLE COLUMN STRUCTURES ---' || E'\n';
    
    -- material_stock structure
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'material_stock') THEN
        schema_report := schema_report || 'MATERIAL_STOCK columns:' || E'\n';
        FOR rec IN 
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'material_stock'
            ORDER BY ordinal_position
        LOOP
            schema_report := schema_report || '  - ' || rec.column_name || ' (' || rec.data_type || 
                            CASE WHEN rec.is_nullable = 'NO' THEN ' NOT NULL' ELSE ' NULL' END || ')' || E'\n';
        END LOOP;
        schema_report := schema_report || E'\n';
    ELSE
        schema_report := schema_report || '❌ MATERIAL_STOCK: TABLE DOES NOT EXIST' || E'\n\n';
    END IF;
    
    -- material_in structure
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'material_in') THEN
        schema_report := schema_report || 'MATERIAL_IN columns:' || E'\n';
        FOR rec IN 
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'material_in'
            ORDER BY ordinal_position
        LOOP
            schema_report := schema_report || '  - ' || rec.column_name || ' (' || rec.data_type || 
                            CASE WHEN rec.is_nullable = 'NO' THEN ' NOT NULL' ELSE ' NULL' END || ')' || E'\n';
        END LOOP;
        schema_report := schema_report || E'\n';
    ELSE
        schema_report := schema_report || '❌ MATERIAL_IN: TABLE DOES NOT EXIST' || E'\n\n';
    END IF;
    
    -- order_items structure
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_items') THEN
        schema_report := schema_report || 'ORDER_ITEMS columns:' || E'\n';
        FOR rec IN 
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'order_items'
            ORDER BY ordinal_position
        LOOP
            schema_report := schema_report || '  - ' || rec.column_name || ' (' || rec.data_type || 
                            CASE WHEN rec.is_nullable = 'NO' THEN ' NOT NULL' ELSE ' NULL' END || ')' || E'\n';
        END LOOP;
        schema_report := schema_report || E'\n';
    ELSE
        schema_report := schema_report || '❌ ORDER_ITEMS: TABLE DOES NOT EXIST' || E'\n\n';
    END IF;
    
    -- delivery_challans structure
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'delivery_challans') THEN
        schema_report := schema_report || 'DELIVERY_CHALLANS columns:' || E'\n';
        FOR rec IN 
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'delivery_challans'
            ORDER BY ordinal_position
        LOOP
            schema_report := schema_report || '  - ' || rec.column_name || ' (' || rec.data_type || 
                            CASE WHEN rec.is_nullable = 'NO' THEN ' NOT NULL' ELSE ' NULL' END || ')' || E'\n';
        END LOOP;
        schema_report := schema_report || E'\n';
    ELSE
        schema_report := schema_report || '❌ DELIVERY_CHALLANS: TABLE DOES NOT EXIST' || E'\n\n';
    END IF;
    
    -- 3. REFERENCE TABLES
    schema_report := schema_report || '--- 3. REFERENCE TABLES STATUS ---' || E'\n';
    
    FOREACH table_name IN ARRAY table_names
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = table_name) THEN
            BEGIN
                EXECUTE 'SELECT COUNT(*) FROM ' || quote_ident(table_name) INTO table_count;
                schema_report := schema_report || '✅ ' || UPPER(table_name) || ': EXISTS (' || table_count || ' records)' || E'\n';
            EXCEPTION
                WHEN OTHERS THEN
                    schema_report := schema_report || '❌ ' || UPPER(table_name) || ': EXISTS but error reading' || E'\n';
            END;
        ELSE
            schema_report := schema_report || '❌ ' || UPPER(table_name) || ': MISSING' || E'\n';
        END IF;
    END LOOP;
    schema_report := schema_report || E'\n';
    
    -- 4. FOREIGN KEY RELATIONSHIPS (first 15 only)
    schema_report := schema_report || '--- 4. FOREIGN KEY RELATIONSHIPS (sample) ---' || E'\n';
    FOR rec IN 
        SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
        ORDER BY tc.table_name, kcu.column_name
        LIMIT 15
    LOOP
        schema_report := schema_report || rec.table_name || '.' || rec.column_name || ' -> ' || 
                        rec.foreign_table || '.' || rec.foreign_column || E'\n';
    END LOOP;
    schema_report := schema_report || E'\n';
    
    -- 5. VIEWS
    schema_report := schema_report || '--- 5. VIEWS ---' || E'\n';
    FOR rec IN 
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_schema = 'public'
        ORDER BY table_name
        LIMIT 10
    LOOP
        schema_report := schema_report || '✅ VIEW: ' || rec.table_name || E'\n';
    END LOOP;
    schema_report := schema_report || E'\n';
    
    -- 6. SAMPLE DATA FROM KEY TABLES
    schema_report := schema_report || '--- 6. SAMPLE DATA ANALYSIS ---' || E'\n';
    
    -- Sample material_in data
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'material_in') THEN
        schema_report := schema_report || 'MATERIAL_IN sample data:' || E'\n';
        FOR rec IN 
            SELECT c.name, mi.material_type, mi.quantity, mi.received_date::date
            FROM material_in mi
            JOIN customers c ON mi.customer_id = c.id
            ORDER BY mi.received_date DESC
            LIMIT 5
        LOOP
            schema_report := schema_report || '  - ' || rec.name || ': ' || rec.material_type || 
                            ' (' || rec.quantity || ') on ' || rec.received_date || E'\n';
        END LOOP;
        schema_report := schema_report || E'\n';
    END IF;
    
    -- Sample material_stock data
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'material_stock') THEN
        schema_report := schema_report || 'MATERIAL_STOCK sample data:' || E'\n';
        FOR rec IN 
            SELECT c.name, ms.material_type, ms.total_received, ms.total_delivered, ms.current_stock
            FROM material_stock ms
            JOIN customers c ON ms.customer_id = c.id
            ORDER BY c.name
            LIMIT 10
        LOOP
            schema_report := schema_report || '  - ' || rec.name || ': ' || rec.material_type || 
                            ' (R:' || rec.total_received || ' D:' || rec.total_delivered || ' C:' || rec.current_stock || ')' || E'\n';
        END LOOP;
        schema_report := schema_report || E'\n';
    END IF;
    
    -- 7. SCHEMA TYPE ANALYSIS
    schema_report := schema_report || '--- 7. SCHEMA TYPE ANALYSIS ---' || E'\n';
    
    -- Check if using table-based or enum-based design
    SELECT COUNT(*) INTO table_count FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name IN ('material_types', 'order_statuses', 'user_roles');
    
    IF table_count >= 3 THEN
        schema_report := schema_report || '✅ SCHEMA TYPE: Reference Tables (material_types, order_statuses, etc.)' || E'\n';
        schema_report := schema_report || '📋 COMPATIBILITY: Using table-based design, not ENUMs' || E'\n';
        schema_report := schema_report || '⚠️ SCRIPT REQUIREMENTS: Need VARCHAR-compatible scripts' || E'\n';
    ELSE
        schema_report := schema_report || '✅ SCHEMA TYPE: ENUM-based design' || E'\n';
        schema_report := schema_report || '📋 COMPATIBILITY: Using ENUM values directly' || E'\n';
    END IF;
    schema_report := schema_report || E'\n';
    
    -- 8. CRITICAL ISSUES IDENTIFICATION
    schema_report := schema_report || '--- 8. CRITICAL ISSUES IDENTIFIED ---' || E'\n';
    
    -- Check for negative stock
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'material_stock') THEN
        SELECT COUNT(*) INTO table_count FROM material_stock WHERE current_stock < 0;
        IF table_count > 0 THEN
            schema_report := schema_report || '🚨 CRITICAL: ' || table_count || ' customers have negative stock values' || E'\n';
        ELSE
            schema_report := schema_report || '✅ STOCK VALUES: All positive, no calculation errors' || E'\n';
        END IF;
    ELSE
        schema_report := schema_report || '🚨 CRITICAL: material_stock table does not exist' || E'\n';
    END IF;
    
    -- Check for design management tables
    SELECT COUNT(*) INTO table_count FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name IN ('design_submissions', 'design_status', 'material_design_mapping');
    
    IF table_count = 0 THEN
        schema_report := schema_report || '📋 MISSING: Design management system not deployed' || E'\n';
    ELSE
        schema_report := schema_report || '✅ DESIGN SYSTEM: ' || table_count || '/3 design tables exist' || E'\n';
    END IF;
    schema_report := schema_report || E'\n';
    
    -- 9. NEXT STEPS RECOMMENDATION
    schema_report := schema_report || '--- 9. RECOMMENDED NEXT STEPS ---' || E'\n';
    
    IF EXISTS (SELECT 1 FROM material_stock WHERE current_stock < 0) THEN
        schema_report := schema_report || '1. 🚨 URGENT: Run URGENT_01_STOCK_FIX_CORRECTED.sql' || E'\n';
    ELSE
        schema_report := schema_report || '1. ✅ Stock calculations appear correct' || E'\n';
    END IF;
    
    SELECT COUNT(*) INTO table_count FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name IN ('design_submissions', 'design_status', 'material_design_mapping');
    
    IF table_count < 3 THEN
        schema_report := schema_report || '2. 📋 Deploy design management system' || E'\n';
    ELSE
        schema_report := schema_report || '2. ✅ Design management system deployed' || E'\n';
    END IF;
    
    schema_report := schema_report || '3. 🔧 Deploy API compatibility updates' || E'\n';
    schema_report := schema_report || '4. 📊 Run final system verification' || E'\n';
    
    -- Output the report
    RAISE NOTICE '%', schema_report;
    
    -- Save to temp table
    DROP TABLE IF EXISTS temp_schema_analysis;
    CREATE TEMP TABLE temp_schema_analysis AS SELECT schema_report as analysis;
    
END $$;

-- Get the schema analysis
SELECT analysis FROM temp_schema_analysis;

-- Quick health check summary
SELECT 
    '=== QUICK SYSTEM HEALTH SUMMARY ===' as status,
    (SELECT COUNT(*) FROM customers) as total_customers,
    (SELECT COUNT(*) FROM orders) as total_orders,
    (SELECT COUNT(*) FROM material_in) as material_receipts,
    (SELECT COUNT(*) FROM delivery_challans) as delivery_challans,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_stock') 
        THEN (SELECT COUNT(*) FROM material_stock WHERE current_stock < 0)
        ELSE -1 
    END as negative_stock_customers;