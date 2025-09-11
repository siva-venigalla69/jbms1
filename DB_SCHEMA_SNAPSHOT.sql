-- ============================================================================
-- COMPLETE DATABASE SCHEMA SNAPSHOT QUERIES
-- PostgreSQL Database Analysis
-- ============================================================================

-- 1. GET ALL TABLES WITH BASIC INFO
-- ============================================================================
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '=== DATABASE TABLES OVERVIEW ===';
    FOR rec IN 
        SELECT 
            schemaname,
            tablename,
            tableowner,
            hasindexes,
            hasrules,
            hastriggers,
            rowsecurity
        FROM pg_tables 
        WHERE schemaname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        ORDER BY schemaname, tablename
    LOOP
        RAISE NOTICE 'Schema: %, Table: %, Owner: %, Indexes: %, Rules: %, Triggers: %, Row Security: %', 
            rec.schemaname, rec.tablename, rec.tableowner, rec.hasindexes, rec.hasrules, rec.hastriggers, rec.rowsecurity;
    END LOOP;
END $$;

-- 2. DETAILED TABLE AND COLUMN INFORMATION
-- ============================================================================
SELECT 
    t.table_schema,
    t.table_name,
    t.table_type,
    c.column_name,
    c.ordinal_position,
    c.column_default,
    c.is_nullable,
    c.data_type,
    c.character_maximum_length,
    c.numeric_precision,
    c.numeric_scale,
    c.datetime_precision,
    c.udt_name,
    CASE 
        WHEN pk.column_name IS NOT NULL THEN 'YES'
        ELSE 'NO'
    END AS is_primary_key,
    CASE 
        WHEN fk.column_name IS NOT NULL THEN 'YES'
        ELSE 'NO'
    END AS is_foreign_key,
    fk.foreign_table_schema,
    fk.foreign_table_name,
    fk.foreign_column_name
FROM information_schema.tables t
LEFT JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
LEFT JOIN (
    SELECT ku.table_schema, ku.table_name, ku.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
    WHERE tc.constraint_type = 'PRIMARY KEY'
) pk ON c.table_schema = pk.table_schema AND c.table_name = pk.table_name AND c.column_name = pk.column_name
LEFT JOIN (
    SELECT 
        ku.table_schema,
        ku.table_name,
        ku.column_name,
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
) fk ON c.table_schema = fk.table_schema AND c.table_name = fk.table_name AND c.column_name = fk.column_name
WHERE t.table_schema NOT IN ('information_schema', 'pg_catalog')
ORDER BY t.table_schema, t.table_name, c.ordinal_position;

-- 3. ALL CONSTRAINTS (PRIMARY KEYS, FOREIGN KEYS, UNIQUE, CHECK)
-- ============================================================================
SELECT 
    tc.table_schema,
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    ku.column_name,
    CASE 
        WHEN tc.constraint_type = 'FOREIGN KEY' THEN ccu.table_name
        ELSE NULL
    END AS references_table,
    CASE 
        WHEN tc.constraint_type = 'FOREIGN KEY' THEN ccu.column_name
        ELSE NULL
    END AS references_column,
    rc.update_rule,
    rc.delete_rule,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
LEFT JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema NOT IN ('information_schema', 'pg_catalog')
ORDER BY tc.table_schema, tc.table_name, tc.constraint_type, tc.constraint_name;

-- 4. INDEXES ANALYSIS
-- ============================================================================
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '=== DATABASE INDEXES ===';
    FOR rec IN 
        SELECT 
            schemaname,
            tablename,
            indexname,
            indexdef
        FROM pg_indexes 
        WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
        ORDER BY schemaname, tablename, indexname
    LOOP
        RAISE NOTICE 'Schema: %, Table: %, Index: %', rec.schemaname, rec.tablename, rec.indexname;
        RAISE NOTICE 'Definition: %', rec.indexdef;
        RAISE NOTICE '---';
    END LOOP;
END $$;

-- 5. FUNCTIONS AND STORED PROCEDURES
-- ============================================================================
DO $$
DECLARE
    func_rec RECORD;
BEGIN
    RAISE NOTICE '=== DATABASE FUNCTIONS ===';
    FOR func_rec IN 
        SELECT 
            n.nspname as schema_name,
            p.proname as function_name,
            pg_catalog.pg_get_function_result(p.oid) as result_type,
            pg_catalog.pg_get_function_arguments(p.oid) as arguments,
            CASE p.prokind
                WHEN 'f' THEN 'function'
                WHEN 'p' THEN 'procedure'
                WHEN 'a' THEN 'aggregate'
                WHEN 'w' THEN 'window'
            END as function_type,
            p.prosrc as source_code
        FROM pg_proc p
        LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        ORDER BY n.nspname, p.proname
    LOOP
        RAISE NOTICE 'Schema: %, Function: %, Type: %', func_rec.schema_name, func_rec.function_name, func_rec.function_type;
        RAISE NOTICE 'Arguments: %', func_rec.arguments;
        RAISE NOTICE 'Returns: %', func_rec.result_type;
        RAISE NOTICE 'Source: %', func_rec.source_code;
        RAISE NOTICE '=====================================';
    END LOOP;
END $$;

-- 6. TRIGGERS ANALYSIS
-- ============================================================================
DO $$
DECLARE
    trig_rec RECORD;
BEGIN
    RAISE NOTICE '=== DATABASE TRIGGERS ===';
    FOR trig_rec IN 
        SELECT 
            t.trigger_schema,
            t.trigger_name,
            t.event_manipulation,
            t.event_object_schema,
            t.event_object_table,
            t.action_timing,
            t.action_condition,
            t.action_statement
        FROM information_schema.triggers t
        WHERE t.trigger_schema NOT IN ('information_schema', 'pg_catalog')
        ORDER BY t.trigger_schema, t.event_object_table, t.trigger_name
    LOOP
        RAISE NOTICE 'Schema: %, Table: %, Trigger: %', trig_rec.trigger_schema, trig_rec.event_object_table, trig_rec.trigger_name;
        RAISE NOTICE 'Event: % %, Timing: %', trig_rec.action_timing, trig_rec.event_manipulation, trig_rec.event_object_table;
        RAISE NOTICE 'Condition: %', COALESCE(trig_rec.action_condition, 'N/A');
        RAISE NOTICE 'Action: %', trig_rec.action_statement;
        RAISE NOTICE '=====================================';
    END LOOP;
END $$;

-- 7. VIEWS INFORMATION
-- ============================================================================
SELECT 
    table_schema,
    table_name as view_name,
    view_definition,
    check_option,
    is_updatable,
    is_insertable_into,
    is_trigger_updatable,
    is_trigger_deletable,
    is_trigger_insertable_into
FROM information_schema.views
WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
ORDER BY table_schema, table_name;

-- 8. SEQUENCES INFORMATION
-- ============================================================================
SELECT 
    sequence_schema,
    sequence_name,
    data_type,
    numeric_precision,
    numeric_scale,
    start_value,
    minimum_value,
    maximum_value,
    increment,
    cycle_option
FROM information_schema.sequences
WHERE sequence_schema NOT IN ('information_schema', 'pg_catalog')
ORDER BY sequence_schema, sequence_name;

-- 9. TABLE RELATIONSHIPS VISUALIZATION
-- ============================================================================
DO $$
DECLARE
    rel_rec RECORD;
BEGIN
    RAISE NOTICE '=== TABLE RELATIONSHIPS ===';
    FOR rel_rec IN 
        SELECT 
            tc.table_schema,
            tc.table_name,
            kcu.column_name,
            ccu.table_schema AS foreign_table_schema,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name,
            rc.update_rule,
            rc.delete_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema NOT IN ('information_schema', 'pg_catalog')
        ORDER BY tc.table_schema, tc.table_name
    LOOP
        RAISE NOTICE '% (%.%) --> % (%.%)', 
            rel_rec.table_name, rel_rec.table_schema, rel_rec.column_name,
            rel_rec.foreign_table_name, rel_rec.foreign_table_schema, rel_rec.foreign_column_name;
        RAISE NOTICE 'ON UPDATE: %, ON DELETE: %', rel_rec.update_rule, rel_rec.delete_rule;
        RAISE NOTICE '---';
    END LOOP;
END $$;

-- 10. DETAILED SCHEMA STATISTICS
-- ============================================================================
DO $$
DECLARE
    stats_rec RECORD;
BEGIN
    RAISE NOTICE '=== SCHEMA STATISTICS ===';
    
    -- Count tables per schema
    FOR stats_rec IN 
        SELECT 
            schemaname,
            COUNT(*) as table_count
        FROM pg_tables 
        WHERE schemaname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        GROUP BY schemaname
        ORDER BY schemaname
    LOOP
        RAISE NOTICE 'Schema: % has % tables', stats_rec.schemaname, stats_rec.table_count;
    END LOOP;
    
    RAISE NOTICE '---';
    
    -- Count functions per schema
    FOR stats_rec IN 
        SELECT 
            n.nspname as schema_name,
            COUNT(*) as function_count
        FROM pg_proc p
        LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        GROUP BY n.nspname
        ORDER BY n.nspname
    LOOP
        RAISE NOTICE 'Schema: % has % functions', stats_rec.schema_name, stats_rec.function_count;
    END LOOP;
END $$;

-- 11. ENUM TYPES
-- ============================================================================
SELECT 
    n.nspname as schema_name,
    t.typname as enum_name,
    e.enumlabel as enum_value,
    e.enumsortorder
FROM pg_type t 
JOIN pg_namespace n ON t.typnamespace = n.oid 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE n.nspname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
ORDER BY n.nspname, t.typname, e.enumsortorder;

-- 12. TABLE SIZES AND ROW COUNTS
-- ============================================================================
DO $$
DECLARE
    size_rec RECORD;
    row_count BIGINT;
BEGIN
    RAISE NOTICE '=== TABLE SIZES AND ROW COUNTS ===';
    FOR size_rec IN 
        SELECT 
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_tables 
        WHERE schemaname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I.%I', size_rec.schemaname, size_rec.tablename) INTO row_count;
        RAISE NOTICE 'Table: %.% | Size: % | Rows: %', 
            size_rec.schemaname, size_rec.tablename, size_rec.size, row_count;
    END LOOP;
END $$;