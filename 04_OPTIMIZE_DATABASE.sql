-- ==========================================
-- DATABASE OPTIMIZATION SCRIPT
-- Run this after cleanup to optimize database performance
-- ==========================================

-- ==========================================
-- PRE-OPTIMIZATION STATUS
-- ==========================================

SELECT 'DATABASE OPTIMIZATION STARTING' as "Status";

-- Show database size before optimization
SELECT
    'BEFORE OPTIMIZATION' as "Phase",
    pg_size_pretty(pg_database_size(current_database())) as "Database Size",
    NOW() as "Start Time";

-- Show table sizes before optimization
SELECT
    'TABLE SIZES BEFORE OPTIMIZATION' as "Info",
    tablename as "Table Name",
    pg_size_pretty(pg_total_relation_size(tablename)) as "Table Size",
    pg_size_pretty(pg_relation_size(tablename)) as "Data Size",
    pg_size_pretty(pg_total_relation_size(tablename) - pg_relation_size(tablename)) as "Index Size"
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename) DESC;

-- ==========================================
-- RECLAIM DISK SPACE (VACUUM FULL)
-- ==========================================

-- VACUUM FULL reclaims disk space from deleted rows
-- This can take time on large databases
SELECT 'STARTING VACUUM FULL - RECLAIMING DISK SPACE' as "Status";

VACUUM FULL;

SELECT 'VACUUM FULL COMPLETED' as "Status";

-- ==========================================
-- UPDATE TABLE STATISTICS (ANALYZE)
-- ==========================================

-- ANALYZE updates table statistics for the query planner
SELECT 'STARTING ANALYZE - UPDATING TABLE STATISTICS' as "Status";

ANALYZE;

SELECT 'ANALYZE COMPLETED' as "Status";

-- ==========================================
-- REINDEX ALL TABLES
-- ==========================================

-- Rebuild all indexes for optimal performance
SELECT 'STARTING REINDEX - REBUILDING ALL INDEXES' as "Status";

-- Reindex all tables in the public schema
DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOR table_name IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE 'REINDEX TABLE ' || table_name;
        RAISE NOTICE 'Reindexed table: %', table_name;
    END LOOP;
END $$;

SELECT 'REINDEX COMPLETED' as "Status";

-- ==========================================
-- POST-OPTIMIZATION STATUS
-- ==========================================

SELECT 'DATABASE OPTIMIZATION COMPLETED' as "Status";

-- Show database size after optimization
SELECT
    'AFTER OPTIMIZATION' as "Phase",
    pg_size_pretty(pg_database_size(current_database())) as "Database Size",
    NOW() as "End Time";

-- Show table sizes after optimization
SELECT
    'TABLE SIZES AFTER OPTIMIZATION' as "Info",
    tablename as "Table Name",
    pg_size_pretty(pg_total_relation_size(tablename)) as "Table Size",
    pg_size_pretty(pg_relation_size(tablename)) as "Data Size",
    pg_size_pretty(pg_total_relation_size(tablename) - pg_relation_size(tablename)) as "Index Size"
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename) DESC;

-- ==========================================
-- OPTIMIZATION SUMMARY REPORT
-- ==========================================

SELECT 'OPTIMIZATION SUMMARY' as "Report Section";

-- Database health check
SELECT
    'DATABASE HEALTH CHECK' as "Check Type",
    current_database() as "Database",
    pg_size_pretty(pg_database_size(current_database())) as "Current Size",
    current_user as "User",
    NOW() as "Optimization Completed";

-- Index health check
SELECT
    'INDEX HEALTH' as "Check Type",
    COUNT(*) as "Total Indexes",
    COUNT(CASE WHEN pg_relation_size(indexrelid) = 0 THEN 1 END) as "Empty Indexes",
    pg_size_pretty(SUM(pg_relation_size(indexrelid))) as "Total Index Size"
FROM pg_stat_user_indexes
WHERE schemaname = 'public';

-- Table statistics status
SELECT
    'TABLE STATISTICS' as "Check Type",
    COUNT(*) as "Total Tables",
    COUNT(CASE WHEN last_analyze IS NOT NULL THEN 1 END) as "Tables with Statistics",
    COUNT(CASE WHEN last_vacuum IS NOT NULL THEN 1 END) as "Tables Vacuumed"
FROM pg_stat_user_tables
WHERE schemaname = 'public';

-- ==========================================
-- PERFORMANCE RECOMMENDATIONS
-- ==========================================

SELECT 'PERFORMANCE RECOMMENDATIONS' as "Section";

-- Check for tables that might need attention
WITH table_stats AS (
    SELECT
        tablename,
        n_live_tup,
        n_dead_tup,
        CASE
            WHEN n_live_tup + n_dead_tup > 0
            THEN (n_dead_tup::float / (n_live_tup + n_dead_tup)) * 100
            ELSE 0
        END as dead_tuple_percent
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
)
SELECT
    'TABLE HEALTH' as "Recommendation Type",
    tablename as "Table",
    dead_tuple_percent::INT || '%' as "Dead Tuples",
    CASE
        WHEN dead_tuple_percent > 20 THEN 'Consider VACUUM'
        WHEN dead_tuple_percent > 50 THEN 'Needs VACUUM FULL'
        ELSE 'Healthy'
    END as "Recommendation"
FROM table_stats
WHERE n_live_tup + n_dead_tup > 0
ORDER BY dead_tuple_percent DESC;

-- ==========================================
-- FINAL STATUS MESSAGE
-- ==========================================

SELECT
    '🎉 DATABASE OPTIMIZATION COMPLETED SUCCESSFULLY! 🎉' as "FINAL STATUS",
    'Your database is now optimized for best performance' as "Message",
    pg_size_pretty(pg_database_size(current_database())) as "Final Database Size";

-- ==========================================
-- NEXT STEPS AFTER OPTIMIZATION
-- ==========================================

SELECT 'NEXT STEPS' as "Section";

SELECT
    '1. ✅ Database cleanup completed
2. ✅ Disk space reclaimed
3. ✅ Indexes rebuilt for optimal performance
4. ✅ Table statistics updated
5. ✅ Database ready for production use
6. ✅ Consider setting up regular maintenance schedule
7. ✅ Monitor database performance going forward' as "Recommendations";

SELECT
    'Optimization completed at:' as "Info",
    NOW()::TEXT as "Completion Time";