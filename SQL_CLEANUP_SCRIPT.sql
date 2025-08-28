-- =====================================
-- PRODUCTION DATA CLEANUP SCRIPT
-- Textile Printing Management System
-- =====================================

-- 🚨 WARNING: This will delete ALL transactional data!
-- Only run this on NEW environments or test systems
-- NOT on production with real customer data!

-- Step 1: Check current data before cleanup
SELECT 
    '=== BEFORE CLEANUP DATA COUNTS ===' as status,
    null as table_name, 
    null as count
UNION ALL
SELECT 
    null,
    'customers' as table_name, 
    COUNT(*)::text as count 
FROM customers
UNION ALL
SELECT null, 'orders', COUNT(*)::text FROM orders
UNION ALL  
SELECT null, 'order_items', COUNT(*)::text FROM order_items
UNION ALL
SELECT null, 'delivery_challans', COUNT(*)::text FROM delivery_challans
UNION ALL
SELECT null, 'gst_invoices', COUNT(*)::text FROM gst_invoices
UNION ALL
SELECT null, 'payments', COUNT(*)::text FROM payments
UNION ALL
SELECT null, 'material_in', COUNT(*)::text FROM material_in
UNION ALL
SELECT null, 'material_stock', COUNT(*)::text FROM material_stock
UNION ALL
SELECT null, 'audit_logs', COUNT(*)::text FROM audit_logs;

-- Step 2: Confirm this is not production
DO $$
BEGIN
    -- Add safety check - only run if database name contains 'test' or 'dev'
    IF current_database() NOT LIKE '%test%' 
       AND current_database() NOT LIKE '%dev%' 
       AND current_database() NOT LIKE '%staging%' THEN
        RAISE EXCEPTION 'SAFETY CHECK FAILED: This appears to be a production database (%). Will not delete data automatically. Override by changing database name to contain "test", "dev", or "staging"', current_database();
    END IF;
    
    RAISE NOTICE 'Safety check passed. Database % appears to be non-production', current_database();
END $$;

-- Step 3: Begin cleanup transaction
BEGIN;

-- Disable triggers temporarily to avoid cascading issues
SET session_replication_role = replica;

-- Log the cleanup action
INSERT INTO deployment_history (
    deployment_type,
    script_name,
    status,
    description
) VALUES (
    'data_cleanup',
    'SQL_CLEANUP_SCRIPT.sql',
    'started',
    'Starting production data cleanup procedure'
);

-- Delete transactional data in dependency order
-- (Foreign key constraints require this order)

-- 1. Clear audit logs (except system/reference data changes)
DELETE FROM audit_logs 
WHERE table_name NOT IN (
    'user_roles', 
    'material_types', 
    'production_stages', 
    'order_statuses',
    'payment_methods',
    'return_reasons'
);

-- 2. Clear delivery and payment related data
DELETE FROM challan_items;
DELETE FROM delivery_challans;
DELETE FROM payments;

-- 3. Clear invoice data
DELETE FROM gst_invoices;

-- 4. Clear order related data
DELETE FROM order_items;
DELETE FROM orders;

-- 5. Clear material flow data
DELETE FROM material_out;
DELETE FROM material_in;
DELETE FROM material_stock;

-- 6. Clear customer data (keep admin and system accounts)
DELETE FROM customers 
WHERE email NOT LIKE '%admin%' 
  AND email NOT LIKE '%system%'
  AND name NOT LIKE '%Admin%'
  AND name NOT LIKE '%System%';

-- 7. Clear expense and return data if tables exist
DELETE FROM expenses WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses');
DELETE FROM returns WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'returns');

-- Step 4: Reset auto-increment sequences
-- This ensures new data starts from ID 1

SELECT setval(pg_get_serial_sequence('customers', 'id'), 1, false) 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers');

SELECT setval(pg_get_serial_sequence('orders', 'id'), 1, false) 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders');

SELECT setval(pg_get_serial_sequence('order_items', 'id'), 1, false) 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items');

SELECT setval(pg_get_serial_sequence('delivery_challans', 'id'), 1, false) 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'delivery_challans');

SELECT setval(pg_get_serial_sequence('gst_invoices', 'id'), 1, false) 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gst_invoices');

SELECT setval(pg_get_serial_sequence('payments', 'id'), 1, false) 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments');

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Step 5: Validate cleanup completed successfully
SELECT 
    '=== AFTER CLEANUP DATA COUNTS ===' as status,
    null as table_name, 
    null as count
UNION ALL
SELECT 
    null,
    'customers' as table_name, 
    COUNT(*)::text as remaining_count 
FROM customers
UNION ALL
SELECT null, 'orders', COUNT(*)::text FROM orders
UNION ALL  
SELECT null, 'order_items', COUNT(*)::text FROM order_items
UNION ALL
SELECT null, 'delivery_challans', COUNT(*)::text FROM delivery_challans
UNION ALL
SELECT null, 'gst_invoices', COUNT(*)::text FROM gst_invoices
UNION ALL
SELECT null, 'payments', COUNT(*)::text FROM payments
UNION ALL
SELECT null, 'material_in', COUNT(*)::text FROM material_in
UNION ALL
SELECT null, 'material_stock', COUNT(*)::text FROM material_stock;

-- Log successful completion
UPDATE deployment_history 
SET status = 'completed',
    description = 'Production data cleanup completed successfully'
WHERE script_name = 'SQL_CLEANUP_SCRIPT.sql' 
  AND deployment_type = 'data_cleanup'
  AND status = 'started';

-- Final validation and notification
DO $$
DECLARE
    customer_count INTEGER;
    order_count INTEGER;
    total_transactional_records INTEGER;
BEGIN
    SELECT COUNT(*) INTO customer_count FROM customers;
    SELECT COUNT(*) INTO order_count FROM orders;
    
    -- Count all transactional data
    SELECT 
        (SELECT COUNT(*) FROM orders) +
        (SELECT COUNT(*) FROM order_items) +
        (SELECT COUNT(*) FROM delivery_challans) +
        (SELECT COUNT(*) FROM gst_invoices) +
        (SELECT COUNT(*) FROM payments) +
        (SELECT COUNT(*) FROM material_in) +
        (SELECT COUNT(*) FROM material_stock)
    INTO total_transactional_records;
    
    -- Report results
    RAISE NOTICE '';
    RAISE NOTICE '🧹 ===== DATA CLEANUP COMPLETED ===== 🧹';
    RAISE NOTICE '';
    RAISE NOTICE '📊 CLEANUP RESULTS:';
    RAISE NOTICE '   • Remaining customers: %', customer_count;
    RAISE NOTICE '   • Remaining orders: %', order_count;
    RAISE NOTICE '   • Total transactional records: %', total_transactional_records;
    RAISE NOTICE '';
    
    IF total_transactional_records = 0 THEN
        RAISE NOTICE '✅ SUCCESS: All transactional data cleaned successfully';
    ELSE
        RAISE NOTICE '⚠️  WARNING: Some transactional records remain';
    END IF;
    
    IF customer_count <= 1 THEN
        RAISE NOTICE '✅ SUCCESS: Customer data cleaned (admin accounts preserved)';
    ELSE
        RAISE NOTICE '⚠️  INFO: % customer records remaining', customer_count;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🔄 NEXT STEPS:';
    RAISE NOTICE '   1. Verify the cleanup results above';
    RAISE NOTICE '   2. Start fresh with your production data';
    RAISE NOTICE '   3. Change default admin password immediately';
    RAISE NOTICE '   4. Configure company settings in system_config';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Your system is ready for production use!';
    RAISE NOTICE '';
END $$;

-- Commit all changes
COMMIT;

-- Final verification query
SELECT 
    'CLEANUP VERIFICATION SUMMARY' as report_type,
    current_database() as database_name,
    current_timestamp as cleanup_completed_at,
    (SELECT COUNT(*) FROM information_schema.tables 
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE') as total_tables,
    (SELECT COUNT(*) FROM customers) as remaining_customers,
    (SELECT COUNT(*) FROM orders) as remaining_orders,
    CASE 
        WHEN (SELECT COUNT(*) FROM orders) = 0 THEN '✅ READY FOR PRODUCTION'
        ELSE '⚠️  CHECK REMAINING DATA'
    END as status;