-- =====================================
-- COMPLETE DATABASE BACKUP SCRIPT
-- This generates SQL to recreate your EXACT current database
-- Run this FIRST to get complete backup
-- =====================================

DO $$
DECLARE
    rec RECORD;
    backup_sql TEXT := '';
    table_name TEXT;
    column_def TEXT;
BEGIN
    backup_sql := '-- =====================================' || E'\n';
    backup_sql := backup_sql || '-- COMPLETE DATABASE RECREATION SCRIPT' || E'\n';
    backup_sql := backup_sql || '-- Generated from current database state' || E'\n';
    backup_sql := backup_sql || '-- Date: ' || NOW()::date || E'\n';
    backup_sql := backup_sql || '-- =====================================' || E'\n\n';

    -- 1. CREATE EXTENSIONS
    backup_sql := backup_sql || '-- Extensions' || E'\n';
    backup_sql := backup_sql || 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";' || E'\n\n';

    -- 2. CREATE ALL REFERENCE TABLES FIRST
    backup_sql := backup_sql || '-- =====================================' || E'\n';
    backup_sql := backup_sql || '-- REFERENCE TABLES (Create First)' || E'\n';
    backup_sql := backup_sql || '-- =====================================' || E'\n\n';

    -- Reference tables list
    FOR table_name IN VALUES ('user_roles'), ('material_types'), ('order_statuses'), ('payment_methods'), ('production_stages'), ('return_reasons')
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = table_name) THEN
            backup_sql := backup_sql || '-- Table: ' || table_name || E'\n';
            
            -- Get CREATE TABLE statement
            SELECT INTO column_def
                string_agg(
                    column_name || ' ' || 
                    CASE 
                        WHEN data_type = 'character varying' THEN 
                            'VARCHAR' || CASE WHEN character_maximum_length IS NOT NULL 
                                         THEN '(' || character_maximum_length || ')' 
                                         ELSE '' END
                        WHEN data_type = 'timestamp with time zone' THEN 'TIMESTAMP WITH TIME ZONE'
                        WHEN data_type = 'uuid' THEN 'UUID'
                        WHEN data_type = 'boolean' THEN 'BOOLEAN'
                        WHEN data_type = 'integer' THEN 'INTEGER'
                        WHEN data_type = 'numeric' THEN 'DECIMAL(10,2)'
                        WHEN data_type = 'text' THEN 'TEXT'
                        ELSE UPPER(data_type)
                    END ||
                    CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
                    CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
                    ',' || E'\n    '
                ORDER BY ordinal_position)
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = table_name;
            
            backup_sql := backup_sql || 'CREATE TABLE ' || table_name || ' (' || E'\n    ';
            backup_sql := backup_sql || column_def || E'\n';
            backup_sql := backup_sql || ');' || E'\n\n';
        END IF;
    END LOOP;

    -- 3. CREATE MAIN TABLES
    backup_sql := backup_sql || '-- =====================================' || E'\n';
    backup_sql := backup_sql || '-- MAIN TABLES' || E'\n';
    backup_sql := backup_sql || '-- =====================================' || E'\n\n';

    -- Main tables list
    FOR table_name IN VALUES ('customers'), ('orders'), ('order_items'), ('material_in'), ('delivery_challans'), 
                              ('challan_items'), ('material_out'), ('material_stock'), ('gst_invoices'), 
                              ('invoice_challans'), ('payments'), ('returns'), ('inventory'), ('expenses'), 
                              ('user_profiles'), ('audit_trail')
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = table_name) THEN
            backup_sql := backup_sql || '-- Table: ' || table_name || E'\n';
            
            -- Get CREATE TABLE statement
            SELECT INTO column_def
                string_agg(
                    column_name || ' ' || 
                    CASE 
                        WHEN data_type = 'character varying' THEN 
                            'VARCHAR' || CASE WHEN character_maximum_length IS NOT NULL 
                                         THEN '(' || character_maximum_length || ')' 
                                         ELSE '' END
                        WHEN data_type = 'timestamp with time zone' THEN 'TIMESTAMP WITH TIME ZONE'
                        WHEN data_type = 'uuid' THEN 'UUID'
                        WHEN data_type = 'boolean' THEN 'BOOLEAN'
                        WHEN data_type = 'integer' THEN 'INTEGER'
                        WHEN data_type = 'numeric' THEN 'DECIMAL(10,2)'
                        WHEN data_type = 'text' THEN 'TEXT'
                        ELSE UPPER(data_type)
                    END ||
                    CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
                    CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
                    ',' || E'\n    '
                ORDER BY ordinal_position)
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = table_name;
            
            backup_sql := backup_sql || 'CREATE TABLE ' || table_name || ' (' || E'\n    ';
            backup_sql := backup_sql || column_def || E'\n';
            backup_sql := backup_sql || ');' || E'\n\n';
        END IF;
    END LOOP;

    -- 4. PRIMARY KEYS
    backup_sql := backup_sql || '-- =====================================' || E'\n';
    backup_sql := backup_sql || '-- PRIMARY KEYS' || E'\n';
    backup_sql := backup_sql || '-- =====================================' || E'\n\n';
    
    FOR rec IN 
        SELECT tc.table_name, kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
        ORDER BY tc.table_name
    LOOP
        backup_sql := backup_sql || 'ALTER TABLE ' || rec.table_name || ' ADD PRIMARY KEY (' || rec.column_name || ');' || E'\n';
    END LOOP;
    backup_sql := backup_sql || E'\n';

    -- 5. FOREIGN KEYS
    backup_sql := backup_sql || '-- =====================================' || E'\n';
    backup_sql := backup_sql || '-- FOREIGN KEYS' || E'\n';
    backup_sql := backup_sql || '-- =====================================' || E'\n\n';
    
    FOR rec IN 
        SELECT tc.table_name, tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
        ORDER BY tc.table_name, kcu.column_name
    LOOP
        backup_sql := backup_sql || 'ALTER TABLE ' || rec.table_name || ' ADD CONSTRAINT ' || rec.constraint_name || 
                     ' FOREIGN KEY (' || rec.column_name || ') REFERENCES ' || rec.foreign_table || '(' || rec.foreign_column || ');' || E'\n';
    END LOOP;
    backup_sql := backup_sql || E'\n';

    -- 6. INDEXES
    backup_sql := backup_sql || '-- =====================================' || E'\n';
    backup_sql := backup_sql || '-- INDEXES' || E'\n';
    backup_sql := backup_sql || '-- =====================================' || E'\n\n';
    
    FOR rec IN 
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public' AND indexname NOT LIKE '%_pkey'
        ORDER BY tablename, indexname
    LOOP
        backup_sql := backup_sql || rec.indexdef || ';' || E'\n';
    END LOOP;
    backup_sql := backup_sql || E'\n';

    -- Output the backup SQL
    RAISE NOTICE '%', backup_sql;
    
    -- Also save to temp table
    DROP TABLE IF EXISTS temp_database_backup;
    CREATE TEMP TABLE temp_database_backup AS SELECT backup_sql as backup_script;
    
END $$;

-- Get the backup script
SELECT backup_script FROM temp_database_backup;