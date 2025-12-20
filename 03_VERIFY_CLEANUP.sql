-- ==========================================
-- DATABASE CLEANUP VERIFICATION SCRIPT
-- Run this after cleanup to verify everything was cleaned properly
-- ==========================================

-- ==========================================
-- OVERALL DATABASE STATUS
-- ==========================================

SELECT 'DATABASE CLEANUP VERIFICATION REPORT' as "Report Type";

-- Database overview
SELECT
    current_database() as "Database Name",
    current_user as "Current User",
    NOW() as "Verification Time",
    pg_size_pretty(pg_database_size(current_database())) as "Database Size";

-- ==========================================
-- TABLE-BY-TABLE VERIFICATION
-- ==========================================

-- Check all tables for remaining data
SELECT
    'TABLE ROW COUNTS' as "Section",
    '' as "Table Name",
    '' as "Row Count",
    '' as "Status";

SELECT
    'Data Check' as "Section",
    tablename as "Table Name",
    n_live_tup::TEXT as "Row Count",
    CASE
        WHEN n_live_tup = 0 THEN '✅ CLEAN'
        ELSE '❌ HAS DATA'
    END as "Status"
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC, tablename;

-- ==========================================
-- CRITICAL BUSINESS TABLES CHECK
-- ==========================================

SELECT 'CRITICAL TABLES VERIFICATION' as "Section";

-- Check main business tables specifically
WITH critical_tables AS (
    SELECT 'customers' as table_name, (SELECT COUNT(*) FROM customers) as row_count
    UNION ALL
    SELECT 'orders' as table_name, (SELECT COUNT(*) FROM orders) as row_count
    UNION ALL
    SELECT 'order_items' as table_name, (SELECT COUNT(*) FROM order_items) as row_count
    UNION ALL
    SELECT 'production_batches' as table_name, (SELECT COUNT(*) FROM production_batches) as row_count
    UNION ALL
    SELECT 'delivery_challans' as table_name, (SELECT COUNT(*) FROM delivery_challans) as row_count
    UNION ALL
    SELECT 'gst_invoices' as table_name, (SELECT COUNT(*) FROM gst_invoices) as row_count
    UNION ALL
    SELECT 'payments' as table_name, (SELECT COUNT(*) FROM payments) as row_count
    UNION ALL
    SELECT 'employees' as table_name, (SELECT COUNT(*) FROM employees) as row_count
    UNION ALL
    SELECT 'materials' as table_name, (SELECT COUNT(*) FROM materials) as row_count
    UNION ALL
    SELECT 'inventory' as table_name, (SELECT COUNT(*) FROM inventory) as row_count
)
SELECT
    table_name as "Critical Table",
    row_count as "Row Count",
    CASE
        WHEN row_count = 0 THEN '✅ CLEANED'
        ELSE '❌ NOT CLEAN'
    END as "Status"
FROM critical_tables
ORDER BY row_count DESC;

-- ==========================================
-- SEQUENCE VERIFICATION
-- ==========================================

SELECT 'SEQUENCE STATUS' as "Section";

SELECT
    sequence_name as "Sequence Name",
    last_value as "Current Value",
    start_value as "Start Value",
    CASE
        WHEN last_value = start_value THEN '✅ RESET'
        ELSE '❌ NOT RESET'
    END as "Status"
FROM information_schema.sequences
WHERE sequence_schema = 'public'
ORDER BY sequence_name;

-- ==========================================
-- CLEANUP SUMMARY REPORT
-- ==========================================

SELECT 'CLEANUP SUMMARY' as "Section";

WITH summary AS (
    SELECT
        COUNT(*) as total_tables,
        COUNT(CASE WHEN n_live_tup = 0 THEN 1 END) as empty_tables,
        COUNT(CASE WHEN n_live_tup > 0 THEN 1 END) as tables_with_data,
        SUM(n_live_tup) as total_rows_remaining
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
)
SELECT
    total_tables as "Total Tables",
    empty_tables as "Empty Tables",
    tables_with_data as "Tables with Data",
    total_rows_remaining as "Total Rows Remaining",
    CASE
        WHEN tables_with_data = 0 THEN '✅ CLEANUP SUCCESSFUL'
        ELSE '❌ CLEANUP INCOMPLETE'
    END as "Overall Status"
FROM summary;

-- ==========================================
-- TABLES STILL CONTAINING DATA (IF ANY)
-- ==========================================

-- Show any tables that still have data
DO $$
DECLARE
    tables_with_data INTEGER;
BEGIN
    SELECT COUNT(*) INTO tables_with_data
    FROM pg_stat_user_tables
    WHERE schemaname = 'public' AND n_live_tup > 0;

    IF tables_with_data > 0 THEN
        RAISE NOTICE 'WARNING: % tables still contain data!', tables_with_data;
    ELSE
        RAISE NOTICE 'SUCCESS: All tables are clean!';
    END IF;
END $$;

-- List tables that still have data (if any)
SELECT
    'TABLES WITH REMAINING DATA' as "Section",
    tablename as "Table Name",
    n_live_tup as "Row Count",
    pg_size_pretty(pg_total_relation_size(tablename)) as "Table Size"
FROM pg_stat_user_tables
WHERE schemaname = 'public'
    AND n_live_tup > 0
ORDER BY n_live_tup DESC;

-- ==========================================
-- FINAL VERIFICATION STATUS
-- ==========================================

SELECT
    CASE
        WHEN (SELECT COUNT(*) FROM pg_stat_user_tables WHERE schemaname = 'public' AND n_live_tup > 0) = 0
        THEN '🎉 DATABASE CLEANUP COMPLETED SUCCESSFULLY! 🎉'
        ELSE '⚠️ DATABASE CLEANUP INCOMPLETE - SOME TABLES STILL HAVE DATA ⚠️'
    END as "FINAL VERIFICATION STATUS";

-- ==========================================
-- RECOMMENDED NEXT STEPS
-- ==========================================

SELECT 'RECOMMENDED NEXT STEPS' as "Section";

SELECT
    CASE
        WHEN (SELECT COUNT(*) FROM pg_stat_user_tables WHERE schemaname = 'public' AND n_live_tup > 0) = 0
        THEN '1. ✅ Database is clean and ready for fresh data
2. ✅ Run VACUUM FULL to reclaim disk space
3. ✅ Run ANALYZE to update table statistics
4. ✅ Your application can now create fresh test data
5. ✅ All sequences are reset and will start from 1'
        ELSE '1. ❌ Review tables with remaining data above
2. ❌ Run additional DELETE statements if needed
3. ❌ Check for foreign key constraints preventing deletion
4. ❌ Consider TRUNCATE CASCADE for stubborn tables
5. ❌ Re-run cleanup script if necessary'
    END as "Next Steps";

-- Show current timestamp for report
SELECT
    'Report Generated:' as "Info",
    NOW()::TEXT as "Timestamp";