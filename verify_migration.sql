-- ===================================================================
-- MIGRATION VERIFICATION SCRIPT
-- ===================================================================
-- Run this script in Supabase SQL Editor to verify the migration
-- was applied successfully
-- ===================================================================

-- 1. Check if new validation function exists
SELECT
    'validate_design_production_status' as function_name,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_proc
            WHERE proname = 'validate_design_production_status'
        ) THEN '✅ EXISTS'
        ELSE '❌ NOT FOUND'
    END as status;

-- 2. Check if helper functions exist
SELECT
    routine_name,
    CASE
        WHEN routine_name IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ NOT FOUND'
    END as status
FROM (VALUES
    ('can_progress_to_next_stage'),
    ('get_production_status_summary'),
    ('update_production_status'),
    ('update_design_status')
) AS expected(routine_name)
LEFT JOIN information_schema.routines r
    ON r.routine_name = expected.routine_name
    AND r.routine_schema = 'public';

-- 3. Check if new views exist
SELECT
    table_name,
    CASE
        WHEN table_name IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ NOT FOUND'
    END as status
FROM (VALUES
    ('order_items_combined_status'),
    ('production_queue')
) AS expected(table_name)
LEFT JOIN information_schema.views v
    ON v.table_name = expected.table_name
    AND v.table_schema = 'public';

-- 4. Check if indexes were created
SELECT
    indexname,
    '✅ EXISTS' as status
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'order_items'
AND indexname IN (
    'idx_order_items_combined_status',
    'idx_order_items_blocked',
    'idx_order_items_ready_for_printing'
);

-- 5. Test validation logic - Get a sample order item
SELECT
    id,
    design_status,
    production_status,
    material_type,
    quantity
FROM order_items
WHERE production_status != 'completed'
LIMIT 1;

-- 6. Check current status distribution
SELECT
    design_status,
    production_status,
    COUNT(*) as count
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.is_deleted = false
GROUP BY design_status, production_status
ORDER BY design_status, production_status;

-- 7. Test status summary function
SELECT * FROM get_production_status_summary();

-- 8. Test combined status view
SELECT
    combined_status_code,
    combined_status_label,
    priority,
    is_blocked,
    COUNT(*) as count
FROM order_items_combined_status
GROUP BY combined_status_code, combined_status_label, priority, is_blocked
ORDER BY priority;

-- ===================================================================
-- EXPECTED RESULTS:
-- ===================================================================
-- All functions and views should show ✅ EXISTS
-- Status distribution should show various combinations
-- Combined status view should show labeled combinations
-- ===================================================================
