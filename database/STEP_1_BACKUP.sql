-- ============================================================================
-- STEP 1: COMPLETE DATABASE BACKUP
-- ============================================================================
-- CLEAN VERSION - All syntax errors fixed
-- Execute this FIRST to backup all existing data
-- ============================================================================

-- Drop backup schema if it exists (clean slate)
DROP SCHEMA IF EXISTS backup_schema CASCADE;

-- Create fresh backup schema
CREATE SCHEMA backup_schema;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'STEP 1: STARTING COMPLETE DATABASE BACKUP';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- Backup ALL tables from public schema
-- ============================================================================

DO $$
DECLARE
  table_record RECORD;
  backup_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Backing up all tables...';
  RAISE NOTICE '';

  -- Loop through all tables in public schema
  FOR table_record IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  LOOP
    -- Create backup table
    EXECUTE format('CREATE TABLE backup_schema.%I AS SELECT * FROM public.%I',
                   table_record.tablename,
                   table_record.tablename);

    backup_count := backup_count + 1;
    RAISE NOTICE '  [%] Backed up: %', backup_count, table_record.tablename;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'BACKUP COMPLETE!';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  - Total tables backed up: %', backup_count;
  RAISE NOTICE '  - Backup location: backup_schema';
  RAISE NOTICE '  - All data preserved safely';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT:';
  RAISE NOTICE '  - Backups are in backup_schema';
  RAISE NOTICE '  - To restore a table: ';
  RAISE NOTICE '    CREATE TABLE public.table_name AS SELECT * FROM backup_schema.table_name';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
END $$;

-- Verify backup
SELECT
  'backup_schema' as schema_name,
  tablename as table_name,
  schemaname
FROM pg_tables
WHERE schemaname = 'backup_schema'
ORDER BY tablename
LIMIT 10;
