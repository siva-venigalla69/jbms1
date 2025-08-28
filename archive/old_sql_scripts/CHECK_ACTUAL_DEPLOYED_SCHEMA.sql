-- =====================================
-- CHECK ACTUAL DEPLOYED DATABASE SCHEMA
-- Run this to see exactly what's in your database
-- =====================================

DO $$
DECLARE
    schema_report TEXT := '';
    rec RECORD;
    table_count INTEGER;
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
    
    -- material_in structure
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
    
    -- order_items structure
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
    
    -- delivery_challans structure
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
    
    -- 3. REFERENCE TABLES (material_types, etc.)
    schema_report := schema_report || '--- 3. REFERENCE TABLES STATUS ---' || E'\n';
    
    FOR table_name IN VALUES ('material_types'), ('order_statuses'), ('user_roles'), 
                              ('payment_methods'), ('production_stages'), ('return_reasons')
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
    
    -- 4. FOREIGN KEY RELATIONSHIPS
    schema_report := schema_report || '--- 4. FOREIGN KEY RELATIONSHIPS ---' || E'\n';
    FOR rec IN 
        SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
        ORDER BY tc.table_name, kcu.column_name
        LIMIT 20  -- Limit to prevent too much output
    LOOP
        schema_report := schema_report || rec.table_name || '.' || rec.column_name || ' -> ' || 
                        rec.foreign_table || '.' || rec.foreign_column || E'\n';
    END LOOP;
    schema_report := schema_report || '... (showing first 20 relationships)' || E'\n\n';
    
    -- 5. VIEWS AND FUNCTIONS
    schema_report := schema_report || '--- 5. VIEWS ---' || E'\n';
    FOR rec IN 
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_schema = 'public'
        ORDER BY table_name
    LOOP
        schema_report := schema_report || '✅ VIEW: ' || rec.table_name || E'\n';
    END LOOP;
    schema_report := schema_report || E'\n';
    
    schema_report := schema_report || '--- 6. FUNCTIONS ---' || E'\n';
    FOR rec IN 
        SELECT routine_name, routine_type
        FROM information_schema.routines 
        WHERE routine_schema = 'public'
        ORDER BY routine_name
        LIMIT 10  -- Limit to prevent too much output
    LOOP
        schema_report := schema_report || '✅ ' || UPPER(rec.routine_type) || ': ' || rec.routine_name || E'\n';
    END LOOP;
    schema_report := schema_report || E'\n';
    
    -- 6. SAMPLE DATA FROM KEY TABLES
    schema_report := schema_report || '--- 7. SAMPLE DATA ANALYSIS ---' || E'\n';
    
    -- Sample material_in data
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
    
    -- Sample material_stock data
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
    
    -- 7. SCHEMA TYPE ANALYSIS
    schema_report := schema_report || '--- 8. SCHEMA TYPE ANALYSIS ---' || E'\n';
    
    -- Check if using table-based or enum-based design
    SELECT COUNT(*) INTO table_count FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name IN ('material_types', 'order_statuses', 'user_roles');
    
    IF table_count >= 3 THEN
        schema_report := schema_report || '✅ SCHEMA TYPE: Reference Tables (material_types, order_statuses, etc.)' || E'\n';
        schema_report := schema_report || '📋 COMPATIBILITY: Using table-based design, not ENUMs' || E'\n';
    ELSE
        schema_report := schema_report || '✅ SCHEMA TYPE: ENUM-based design' || E'\n';
        schema_report := schema_report || '📋 COMPATIBILITY: Using ENUM values directly' || E'\n';
    END IF;
    schema_report := schema_report || E'\n';
    
    -- 8. DEPLOYMENT READINESS ASSESSMENT
    schema_report := schema_report || '--- 9. DEPLOYMENT READINESS ASSESSMENT ---' || E'\n';
    
    -- Check critical tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_stock') THEN
        schema_report := schema_report || '✅ CRITICAL: material_stock table exists' || E'\n';
    ELSE
        schema_report := schema_report || '❌ CRITICAL: material_stock table MISSING' || E'\n';
    END IF;
    
    -- Check for design management tables
    SELECT COUNT(*) INTO table_count FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name IN ('design_submissions', 'design_status', 'material_design_mapping');
    
    IF table_count >= 3 THEN
        schema_report := schema_report || '✅ DESIGN SYSTEM: Design management tables exist' || E'\n';
    ELSE
        schema_report := schema_report || '❌ DESIGN SYSTEM: Design management tables missing (' || table_count || '/3)' || E'\n';
    END IF;
    
    -- Check for API views
    SELECT COUNT(*) INTO table_count FROM information_schema.views 
    WHERE table_schema = 'public' AND table_name IN ('material_stock_api_view', 'delivery_challans_api_view');
    
    IF table_count >= 2 THEN
        schema_report := schema_report || '✅ API COMPATIBILITY: API views exist' || E'\n';
    ELSE
        schema_report := schema_report || '❌ API COMPATIBILITY: API views missing (' || table_count || '/2)' || E'\n';
    END IF;
    schema_report := schema_report || E'\n';
    
    -- Output the report
    RAISE NOTICE '%', schema_report;
    
    -- Save to temp table
    DROP TABLE IF EXISTS temp_schema_analysis;
    CREATE TEMP TABLE temp_schema_analysis AS SELECT schema_report as analysis;
    
END $$;

-- Get the schema analysis
SELECT analysis FROM temp_schema_analysis;