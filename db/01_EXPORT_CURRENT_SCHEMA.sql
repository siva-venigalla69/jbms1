-- =====================================
-- EXPORT COMPLETE CURRENT DATABASE SCHEMA (PL/SQL FORMAT)
-- Run this single block in Supabase SQL Editor
-- =====================================

DO $$
DECLARE
    rec RECORD;
    output_text TEXT := '';
BEGIN
    -- Header
    output_text := output_text || E'\n' || '=== CURRENT DATABASE SCHEMA EXPORT ===' || E'\n\n';
    
    -- 1. TABLES SUMMARY
    output_text := output_text || '--- 1. ALL TABLES ---' || E'\n';
    FOR rec IN 
        SELECT table_name, table_type
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
    LOOP
        output_text := output_text || 'TABLE: ' || rec.table_name || ' (' || rec.table_type || ')' || E'\n';
    END LOOP;
    output_text := output_text || E'\n';

    -- 2. MATERIAL_STOCK TABLE CHECK
    output_text := output_text || '--- 2. CRITICAL TABLE CHECK ---' || E'\n';
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'material_stock') THEN
        output_text := output_text || '✅ material_stock table EXISTS' || E'\n';
    ELSE
        output_text := output_text || '❌ material_stock table MISSING' || E'\n';
    END IF;
    output_text := output_text || E'\n';

    -- 3. COLUMNS FOR KEY TABLES
    output_text := output_text || '--- 3. KEY TABLE STRUCTURES ---' || E'\n';
    
    -- Delivery Challans columns
    output_text := output_text || 'DELIVERY_CHALLANS columns:' || E'\n';
    FOR rec IN 
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'delivery_challans'
        ORDER BY ordinal_position
    LOOP
        output_text := output_text || '  - ' || rec.column_name || ' (' || rec.data_type || ')' || 
                      CASE WHEN rec.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END || E'\n';
    END LOOP;
    output_text := output_text || E'\n';

    -- Material Stock columns (if exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'material_stock') THEN
        output_text := output_text || 'MATERIAL_STOCK columns:' || E'\n';
        FOR rec IN 
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'material_stock'
            ORDER BY ordinal_position
        LOOP
            output_text := output_text || '  - ' || rec.column_name || ' (' || rec.data_type || ')' || 
                          CASE WHEN rec.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END || E'\n';
        END LOOP;
        output_text := output_text || E'\n';
    END IF;

    -- 4. ENUMS
    output_text := output_text || '--- 4. CUSTOM TYPES (ENUMS) ---' || E'\n';
    FOR rec IN 
        SELECT DISTINCT t.typname as enum_name
        FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid  
        JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
        ORDER BY t.typname
    LOOP
        output_text := output_text || 'ENUM: ' || rec.enum_name || E'\n';
    END LOOP;
    output_text := output_text || E'\n';

    -- 5. FOREIGN KEYS
    output_text := output_text || '--- 5. FOREIGN KEY RELATIONSHIPS ---' || E'\n';
    FOR rec IN 
        SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
        ORDER BY tc.table_name, kcu.column_name
    LOOP
        output_text := output_text || rec.table_name || '.' || rec.column_name || ' -> ' || 
                      rec.foreign_table || '.' || rec.foreign_column || E'\n';
    END LOOP;
    output_text := output_text || E'\n';

    -- 6. DATA COUNTS
    output_text := output_text || '--- 6. DATA COUNTS ---' || E'\n';
    
    -- Customers
    EXECUTE 'SELECT COUNT(*) FROM customers' INTO rec;
    output_text := output_text || 'customers: ' || rec.count || ' records' || E'\n';
    
    -- Material In
    EXECUTE 'SELECT COUNT(*) FROM material_in' INTO rec;
    output_text := output_text || 'material_in: ' || rec.count || ' records' || E'\n';
    
    -- Delivery Challans
    EXECUTE 'SELECT COUNT(*) FROM delivery_challans' INTO rec;
    output_text := output_text || 'delivery_challans: ' || rec.count || ' records' || E'\n';
    
    -- Challan Items
    EXECUTE 'SELECT COUNT(*) FROM challan_items' INTO rec;
    output_text := output_text || 'challan_items: ' || rec.count || ' records' || E'\n';
    
    -- Material Stock (if exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'material_stock') THEN
        EXECUTE 'SELECT COUNT(*) FROM material_stock' INTO rec;
        output_text := output_text || 'material_stock: ' || rec.count || ' records' || E'\n';
    ELSE
        output_text := output_text || 'material_stock: TABLE MISSING' || E'\n';
    END IF;
    output_text := output_text || E'\n';

    -- 7. SAMPLE STOCK DATA (if material_stock exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'material_stock') THEN
        output_text := output_text || '--- 7. CURRENT STOCK DATA ---' || E'\n';
        FOR rec IN 
            EXECUTE 'SELECT c.name, ms.material_type, ms.total_received, ms.total_delivered, ms.current_stock 
                     FROM material_stock ms 
                     JOIN customers c ON ms.customer_id = c.id 
                     ORDER BY c.name, ms.material_type 
                     LIMIT 10'
        LOOP
            output_text := output_text || rec.name || ': ' || rec.material_type || 
                          ' (R:' || rec.total_received || ' D:' || rec.total_delivered || ' C:' || rec.current_stock || ')' || E'\n';
        END LOOP;
        output_text := output_text || E'\n';
    END IF;

    -- 8. RECENT MATERIAL IN RECORDS
    output_text := output_text || '--- 8. RECENT MATERIAL RECEIPTS ---' || E'\n';
    FOR rec IN 
        SELECT c.name, mi.material_type, mi.quantity, mi.received_date::date
        FROM material_in mi 
        JOIN customers c ON mi.customer_id = c.id 
        ORDER BY mi.received_date DESC 
        LIMIT 5
    LOOP
        output_text := output_text || rec.received_date || ': ' || rec.name || ' - ' || 
                      rec.material_type || ' (' || rec.quantity || ')' || E'\n';
    END LOOP;
    output_text := output_text || E'\n';

    -- 9. RECENT DELIVERIES
    output_text := output_text || '--- 9. RECENT DELIVERIES ---' || E'\n';
    FOR rec IN 
        SELECT c.name, oi.material_type, ci.quantity, dc.challan_date::date
        FROM challan_items ci
        JOIN delivery_challans dc ON ci.challan_id = dc.id
        JOIN customers c ON dc.customer_id = c.id
        JOIN order_items oi ON ci.order_item_id = oi.id
        ORDER BY dc.challan_date DESC 
        LIMIT 5
    LOOP
        output_text := output_text || rec.challan_date || ': ' || rec.name || ' - ' || 
                      rec.material_type || ' (' || rec.quantity || ')' || E'\n';
    END LOOP;
    output_text := output_text || E'\n';

    -- Output everything
    RAISE NOTICE '%', output_text;
    
    -- Also return as a result
    DROP TABLE IF EXISTS temp_schema_export;
    CREATE TEMP TABLE temp_schema_export AS SELECT output_text as schema_export;
END $$;

-- Get the result
SELECT schema_export FROM temp_schema_export;