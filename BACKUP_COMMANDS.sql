-- ==========================================
-- DATABASE BACKUP COMMANDS
-- Complete backup strategies for crash recovery
-- ==========================================

/*
IMPORTANT: These are COMMAND LINE commands, not SQL queries
Copy and paste these commands in your terminal/command prompt
Replace the connection details with your actual database information
*/

-- ==========================================
-- CONNECTION DETAILS TEMPLATE
-- Replace these values with your actual database details
-- ==========================================

/*
YOUR DATABASE CONNECTION DETAILS:
- Host: db.your-project-ref.supabase.co (for Supabase)
- Port: 5432 (default PostgreSQL port)
- Database: postgres (default for Supabase)
- Username: postgres (default for Supabase)
- Password: your-database-password
*/

-- ==========================================
-- 1. COMPLETE DATABASE BACKUP (RECOMMENDED)
-- ==========================================

/*
FULL BACKUP - Schema + Data (RECOMMENDED FOR CRASH RECOVERY):

pg_dump -h db.your-project-ref.supabase.co -p 5432 -U postgres -d postgres --verbose --format=custom --file=backup_full_$(date +%Y%m%d_%H%M%S).backup

OR with plain SQL format:

pg_dump -h db.your-project-ref.supabase.co -p 5432 -U postgres -d postgres --verbose --format=plain --file=backup_full_$(date +%Y%m%d_%H%M%S).sql

EXAMPLE:
pg_dump -h db.abcdefghijk.supabase.co -p 5432 -U postgres -d postgres --verbose --format=custom --file=backup_full_20250916_143000.backup
*/

-- ==========================================
-- 2. DIFFERENT BACKUP TYPES
-- ==========================================

/*
DATA-ONLY BACKUP (No schema, just data):
pg_dump -h db.your-project-ref.supabase.co -p 5432 -U postgres -d postgres --data-only --format=custom --file=backup_data_$(date +%Y%m%d_%H%M%S).backup

SCHEMA-ONLY BACKUP (No data, just structure):
pg_dump -h db.your-project-ref.supabase.co -p 5432 -U postgres -d postgres --schema-only --format=custom --file=backup_schema_$(date +%Y%m%d_%H%M%S).backup

COMPRESSED BACKUP (Smaller file size):
pg_dump -h db.your-project-ref.supabase.co -p 5432 -U postgres -d postgres --format=custom --compress=9 --file=backup_compressed_$(date +%Y%m%d_%H%M%S).backup

SPECIFIC TABLES ONLY:
pg_dump -h db.your-project-ref.supabase.co -p 5432 -U postgres -d postgres --table=customers --table=orders --table=production_batches --format=custom --file=backup_specific_tables_$(date +%Y%m%d_%H%M%S).backup
*/

-- ==========================================
-- 3. AUTOMATED BACKUP SCRIPT (Save as backup.sh)
-- ==========================================

/*
Create a file called 'backup.sh' with this content:

#!/bin/bash

# Database connection details
DB_HOST="db.your-project-ref.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"
export PGPASSWORD="your-database-password"

# Create backup directory
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup filename
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.backup"

# Create backup
echo "Creating backup: $BACKUP_FILE"
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
    --verbose \
    --format=custom \
    --compress=9 \
    --file=$BACKUP_FILE

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "✅ Backup created successfully: $BACKUP_FILE"

    # Show backup file size
    ls -lh $BACKUP_FILE

    # Keep only last 7 backups (optional)
    find $BACKUP_DIR -name "backup_*.backup" -type f -mtime +7 -delete
    echo "Old backups cleaned (kept last 7 days)"
else
    echo "❌ Backup failed!"
    exit 1
fi

Make executable with: chmod +x backup.sh
Run with: ./backup.sh
*/

-- ==========================================
-- 4. BACKUP VERIFICATION QUERIES
-- Run these AFTER creating backup to verify
-- ==========================================

-- Check database size and table counts
SELECT
    'DATABASE BACKUP VERIFICATION' as "Report Type",
    current_database() as "Database Name",
    current_user as "Connected User",
    NOW() as "Backup Time",
    pg_size_pretty(pg_database_size(current_database())) as "Database Size";

-- Get table counts for verification
SELECT
    'Table Counts for Backup Verification' as "Info",
    tablename as "Table Name",
    n_live_tup as "Row Count",
    pg_size_pretty(pg_total_relation_size(tablename)) as "Table Size"
FROM pg_stat_user_tables
WHERE schemaname = 'public'
    AND n_live_tup > 0
ORDER BY n_live_tup DESC;

-- Total records across all tables
SELECT
    'TOTAL RECORDS' as "Metric",
    SUM(n_live_tup) as "Count"
FROM pg_stat_user_tables
WHERE schemaname = 'public';

-- Critical business tables check
SELECT
    'CRITICAL TABLES CHECK' as "Section",
    table_name,
    row_count
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
) backup_check
ORDER BY row_count DESC;

-- ==========================================
-- 5. ENVIRONMENT VARIABLE SETUP (Recommended)
-- ==========================================

/*
For security, set password as environment variable instead of hardcoding:

LINUX/MAC:
export PGPASSWORD="your-database-password"
export PGHOST="db.your-project-ref.supabase.co"
export PGPORT="5432"
export PGUSER="postgres"
export PGDATABASE="postgres"

Then you can run simpler commands:
pg_dump --format=custom --file=backup_$(date +%Y%m%d_%H%M%S).backup

WINDOWS:
set PGPASSWORD=your-database-password
set PGHOST=db.your-project-ref.supabase.co
set PGPORT=5432
set PGUSER=postgres
set PGDATABASE=postgres

Then run: pg_dump --format=custom --file=backup_20250916.backup
*/

-- ==========================================
-- 6. BACKUP TESTING COMMANDS
-- ==========================================

/*
TEST YOUR BACKUP (Don't run on production!):

1. Create a test database:
createdb -h localhost -U postgres test_restore

2. Restore backup to test database:
pg_restore -h localhost -U postgres -d test_restore backup_full_20250916_143000.backup

3. Verify restore worked:
psql -h localhost -U postgres -d test_restore -c "SELECT COUNT(*) FROM customers;"

4. Clean up test database:
dropdb -h localhost -U postgres test_restore
*/

-- Show backup completion status
SELECT
    '🎯 BACKUP COMMANDS READY!' as "Status",
    'Copy the pg_dump commands above to your terminal' as "Next Step",
    'Replace connection details with your actual database info' as "Important Note";