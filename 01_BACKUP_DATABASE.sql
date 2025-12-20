-- ==========================================
-- DATABASE BACKUP SCRIPT
-- Creates a complete backup before cleanup
-- ==========================================

-- This file contains backup commands that need to be run from command line
-- Copy and paste these commands in your terminal/command prompt

/*
BACKUP COMMANDS - RUN FROM COMMAND LINE:

1. Complete Database Backup:
pg_dump -h your_supabase_host -U postgres -d your_database_name --no-password > backup_full_$(date +%Y%m%d_%H%M%S).sql

2. Data-Only Backup (no schema):
pg_dump -h your_supabase_host -U postgres -d your_database_name --data-only --no-password > backup_data_only_$(date +%Y%m%d_%H%M%S).sql

3. Schema-Only Backup:
pg_dump -h your_supabase_host -U postgres -d your_database_name --schema-only --no-password > backup_schema_only_$(date +%Y%m%d_%H%M%S).sql

4. Compressed Backup:
pg_dump -h your_supabase_host -U postgres -d your_database_name --no-password | gzip > backup_compressed_$(date +%Y%m%d_%H%M%S).sql.gz

FOR SUPABASE USERS:
Replace your_supabase_host with your Supabase database URL
Replace your_database_name with your actual database name
You'll be prompted for password or set PGPASSWORD environment variable

Example for Supabase:
pg_dump -h db.your-project-ref.supabase.co -U postgres -d postgres --no-password > backup_$(date +%Y%m%d_%H%M%S).sql
*/

-- ==========================================
-- BACKUP VERIFICATION QUERIES (Run in SQL editor)
-- ==========================================

-- Check database size before backup
SELECT
    pg_size_pretty(pg_database_size(current_database())) as "Database Size",
    current_database() as "Database Name",
    current_user as "Current User",
    NOW() as "Backup Time";

-- Get table row counts for backup verification
SELECT
    schemaname,
    tablename,
    n_live_tup as "Live Rows",
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as "Table Size"
FROM pg_stat_user_tables
WHERE schemaname = 'public'
    AND n_live_tup > 0
ORDER BY n_live_tup DESC;

-- Check total number of records across all tables
SELECT
    SUM(n_live_tup) as "Total Records in Database"
FROM pg_stat_user_tables
WHERE schemaname = 'public';

-- Generate backup information summary
SELECT
    'BACKUP SUMMARY' as "Info Type",
    COUNT(*) as "Tables with Data"
FROM pg_stat_user_tables
WHERE schemaname = 'public' AND n_live_tup > 0

UNION ALL

SELECT
    'TOTAL RECORDS' as "Info Type",
    SUM(n_live_tup)::TEXT as "Tables with Data"
FROM pg_stat_user_tables
WHERE schemaname = 'public'

UNION ALL

SELECT
    'DATABASE SIZE' as "Info Type",
    pg_size_pretty(pg_database_size(current_database())) as "Tables with Data"

UNION ALL

SELECT
    'BACKUP DATE' as "Info Type",
    NOW()::TEXT as "Tables with Data";