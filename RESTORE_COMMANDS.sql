-- ==========================================
-- DATABASE RESTORE COMMANDS
-- Complete restore procedures for crash recovery
-- ==========================================

/*
IMPORTANT: These are COMMAND LINE commands, not SQL queries
Use these commands to restore from backup files created with pg_dump
*/

-- ==========================================
-- BEFORE RESTORE - PREPARATION STEPS
-- ==========================================

/*
STEP 1: STOP APPLICATION CONNECTIONS
- Stop your application/frontend to prevent new connections
- Close all active database connections
- Ensure no users are connected to the database
*/

-- Check active connections (run this SQL query first):
SELECT
    'ACTIVE CONNECTIONS CHECK' as "Status",
    COUNT(*) as "Active Connections",
    array_agg(DISTINCT usename) as "Connected Users"
FROM pg_stat_activity
WHERE datname = current_database()
    AND pid != pg_backend_pid();

-- Terminate active connections (if needed):
SELECT
    'TERMINATING CONNECTIONS' as "Action",
    pg_terminate_backend(pid) as "Terminated",
    usename as "User",
    application_name as "Application"
FROM pg_stat_activity
WHERE datname = current_database()
    AND pid != pg_backend_pid();

-- ==========================================
-- RESTORE METHODS
-- ==========================================

-- ==========================================
-- METHOD 1: COMPLETE DATABASE RESTORE (Most Common)
-- ==========================================

/*
FULL DATABASE RESTORE from .backup file:

pg_restore -h db.your-project-ref.supabase.co -p 5432 -U postgres -d postgres --verbose --clean --if-exists backup_full_20250916_143000.backup

FULL DATABASE RESTORE from .sql file:

psql -h db.your-project-ref.supabase.co -p 5432 -U postgres -d postgres -f backup_full_20250916_143000.sql

EXAMPLE WITH YOUR CONNECTION:
pg_restore -h db.abcdefghijk.supabase.co -p 5432 -U postgres -d postgres --verbose --clean --if-exists backup_full_20250916_143000.backup
*/

-- ==========================================
-- METHOD 2: RESTORE TO NEW DATABASE (Safer)
-- ==========================================

/*
STEP 1: Create new database for restore:
createdb -h db.your-project-ref.supabase.co -p 5432 -U postgres new_database_name

STEP 2: Restore to new database:
pg_restore -h db.your-project-ref.supabase.co -p 5432 -U postgres -d new_database_name --verbose backup_full_20250916_143000.backup

STEP 3: Verify restore worked, then rename databases:
-- This requires superuser access, may not work on Supabase
ALTER DATABASE postgres RENAME TO postgres_old;
ALTER DATABASE new_database_name RENAME TO postgres;
*/

-- ==========================================
-- METHOD 3: SELECTIVE RESTORE (Specific Tables)
-- ==========================================

/*
RESTORE ONLY SPECIFIC TABLES:

pg_restore -h db.your-project-ref.supabase.co -p 5432 -U postgres -d postgres --verbose --table=customers --table=orders backup_full_20250916_143000.backup

RESTORE EVERYTHING EXCEPT SPECIFIC TABLES:

pg_restore -h db.your-project-ref.supabase.co -p 5432 -U postgres -d postgres --verbose --exclude-table=test_data backup_full_20250916_143000.backup
*/

-- ==========================================
-- METHOD 4: DATA-ONLY RESTORE (Keep Current Schema)
-- ==========================================

/*
RESTORE ONLY DATA (keep existing schema):

pg_restore -h db.your-project-ref.supabase.co -p 5432 -U postgres -d postgres --verbose --data-only backup_full_20250916_143000.backup

OR from data-only backup:

pg_restore -h db.your-project-ref.supabase.co -p 5432 -U postgres -d postgres --verbose backup_data_20250916_143000.backup
*/

-- ==========================================
-- COMPLETE RESTORE SCRIPT (Save as restore.sh)
-- ==========================================

/*
Create a file called 'restore.sh' with this content:

#!/bin/bash

# Database connection details
DB_HOST="db.your-project-ref.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"
export PGPASSWORD="your-database-password"

# Backup file to restore
BACKUP_FILE="$1"

# Check if backup file provided
if [ -z "$BACKUP_FILE" ]; then
    echo "❌ Usage: ./restore.sh backup_file.backup"
    echo "Example: ./restore.sh backup_full_20250916_143000.backup"
    exit 1
fi

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "🔄 Starting database restore..."
echo "Host: $DB_HOST"
echo "Database: $DB_NAME"
echo "Backup file: $BACKUP_FILE"
echo ""

# Confirm before proceeding
read -p "⚠️  This will OVERWRITE your current database. Continue? (y/N): " confirm
if [[ $confirm != [yY] ]]; then
    echo "❌ Restore cancelled by user"
    exit 1
fi

# Perform restore
echo "🔄 Restoring database..."
pg_restore -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
    --verbose \
    --clean \
    --if-exists \
    $BACKUP_FILE

# Check if restore was successful
if [ $? -eq 0 ]; then
    echo "✅ Database restore completed successfully!"
    echo "🔄 Running verification..."

    # Quick verification
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
        SELECT
            'RESTORE VERIFICATION' as status,
            COUNT(*) as total_tables
        FROM information_schema.tables
        WHERE table_schema = 'public';
    "
else
    echo "❌ Database restore failed!"
    exit 1
fi

Make executable with: chmod +x restore.sh
Usage: ./restore.sh backup_full_20250916_143000.backup
*/

-- ==========================================
-- RESTORE VERIFICATION QUERIES
-- Run these AFTER restore to verify success
-- ==========================================

-- Basic restore verification
SELECT
    'DATABASE RESTORE VERIFICATION' as "Report Type",
    current_database() as "Database Name",
    current_user as "Connected User",
    NOW() as "Restore Verification Time",
    pg_size_pretty(pg_database_size(current_database())) as "Database Size";

-- Check table counts after restore
SELECT
    'Tables After Restore' as "Info",
    tablename as "Table Name",
    n_live_tup as "Row Count",
    pg_size_pretty(pg_total_relation_size(tablename)) as "Table Size"
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- Critical business tables verification
SELECT
    'CRITICAL TABLES VERIFICATION' as "Section",
    table_name,
    row_count,
    CASE
        WHEN row_count > 0 THEN '✅ Data Found'
        ELSE '⚠️ Empty Table'
    END as "Status"
FROM (
    SELECT 'customers' as table_name, COUNT(*) as row_count FROM customers
    UNION ALL
    SELECT 'orders' as table_name, COUNT(*) as row_count FROM orders
    UNION ALL
    SELECT 'production_batches' as table_name, COUNT(*) as row_count FROM production_batches
    UNION ALL
    SELECT 'employees' as table_name, COUNT(*) as row_count FROM employees
    UNION ALL
    SELECT 'gst_invoices' as table_name, COUNT(*) as row_count FROM gst_invoices
    UNION ALL
    SELECT 'payments' as table_name, COUNT(*) as row_count FROM payments
) restore_check
ORDER BY row_count DESC;

-- Check sequence values after restore
SELECT
    'SEQUENCE STATUS AFTER RESTORE' as "Info",
    sequence_name,
    last_value,
    start_value,
    increment_by
FROM information_schema.sequences
WHERE sequence_schema = 'public'
ORDER BY sequence_name;

-- ==========================================
-- DISASTER RECOVERY PROCEDURES
-- ==========================================

/*
DISASTER RECOVERY SCENARIO 1: Complete Database Loss

1. IMMEDIATE ACTIONS:
   - Stop all applications connecting to database
   - Assess extent of data loss
   - Locate most recent backup

2. RECOVERY STEPS:
   a) If database exists but corrupted:
      dropdb -h host -U user database_name
      createdb -h host -U user database_name

   b) Restore from most recent backup:
      pg_restore -h host -U user -d database_name backup_file.backup

   c) Verify data integrity:
      Run verification queries above

   d) Restart applications

   e) Notify users of recovery completion

DISASTER RECOVERY SCENARIO 2: Partial Data Loss

1. IDENTIFY AFFECTED TABLES:
   Compare current data with backup

2. SELECTIVE RESTORE:
   pg_restore --table=affected_table_name backup_file.backup

3. VERIFY DATA CONSISTENCY:
   Check foreign key relationships

DISASTER RECOVERY SCENARIO 3: Point-in-Time Recovery

If you have WAL files (advanced setup):
pg_basebackup + WAL replay
(This requires special PostgreSQL configuration)
*/

-- ==========================================
-- TROUBLESHOOTING COMMON RESTORE ISSUES
-- ==========================================

/*
PROBLEM 1: "database is being accessed by other users"
SOLUTION:
-- Force disconnect all users:
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'your_database' AND pid != pg_backend_pid();

PROBLEM 2: "relation already exists"
SOLUTION:
-- Use --clean --if-exists flags:
pg_restore --clean --if-exists backup_file.backup

PROBLEM 3: "permission denied"
SOLUTION:
-- Use superuser account or database owner
-- Check user permissions

PROBLEM 4: "backup file corrupted"
SOLUTION:
-- Verify backup file integrity:
pg_restore --list backup_file.backup
-- Use older backup if current one is corrupted

PROBLEM 5: "out of disk space"
SOLUTION:
-- Free up disk space before restore
-- Use compressed backup format
-- Restore to different location with more space
*/

-- ==========================================
-- POST-RESTORE MAINTENANCE
-- ==========================================

-- Run these queries after successful restore:

-- Update table statistics
ANALYZE;

-- Rebuild indexes for optimal performance
REINDEX DATABASE postgres;

-- Check for any constraint violations
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT conname, conrelid::regclass as table_name
        FROM pg_constraint
        WHERE contype = 'f'  -- foreign key constraints
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %s VALIDATE CONSTRAINT %s', rec.table_name, rec.conname);
            RAISE NOTICE 'Constraint % on % is valid', rec.conname, rec.table_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Constraint % on % failed validation: %', rec.conname, rec.table_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- Final verification summary
SELECT
    '🎉 DATABASE RESTORE COMPLETED! 🎉' as "FINAL STATUS",
    'Database successfully restored from backup' as "Message",
    NOW() as "Completion Time",
    pg_size_pretty(pg_database_size(current_database())) as "Restored Database Size";

-- Show restore completion checklist
SELECT
    'POST-RESTORE CHECKLIST' as "Section",
    '1. ✅ Verify critical tables have data
2. ✅ Check sequence values are correct
3. ✅ Validate foreign key constraints
4. ✅ Test application connectivity
5. ✅ Update table statistics (ANALYZE)
6. ✅ Restart applications
7. ✅ Monitor for any issues
8. ✅ Notify stakeholders of completion' as "Tasks";