-- =====================================
-- VALIDATE DELIVERY TRACKING FIXES
-- Run this to verify both immediate fix and migration worked
-- =====================================

-- =====================================
-- SECTION 1: SCHEMA VALIDATION
-- =====================================

SELECT 
    'SCHEMA VALIDATION' as test_type,
    
    -- Check design_url column
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'order_items' AND column_name = 'design_url'
    ) THEN '✅ design_url exists' ELSE '❌ design_url missing' END as design_url_status,
    
    -- Check design_notes column
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'order_items' AND column_name = 'design_notes'
    ) THEN '✅ design_notes exists' ELSE '❌ design_notes missing' END as design_notes_status,
    
    -- Check total_delivered column
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'order_items' AND column_name = 'total_delivered'
    ) THEN '✅ total_delivered exists' ELSE '❌ total_delivered missing' END as total_delivered_status,
    
    -- Check remaining_quantity column
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'order_items' AND column_name = 'remaining_quantity'
    ) THEN '✅ remaining_quantity exists' ELSE '❌ remaining_quantity missing' END as remaining_quantity_status,
    
    -- Check delivery_status on orders
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'delivery_status'
    ) THEN '✅ delivery_status exists' ELSE '❌ delivery_status missing' END as order_delivery_status;

-- =====================================
-- SECTION 2: VIEWS VALIDATION
-- =====================================

SELECT 
    'VIEWS VALIDATION' as test_type,
    
    -- Check order_delivery_status view
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_name = 'order_delivery_status'
    ) THEN '✅ order_delivery_status view exists' ELSE '❌ order_delivery_status view missing' END as delivery_status_view,
    
    -- Check order_item_delivery_details view
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_name = 'order_item_delivery_details'
    ) THEN '✅ order_item_delivery_details view exists' ELSE '❌ order_item_delivery_details view missing' END as item_details_view,
    
    -- Check simple delivery summary view
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_name = 'order_delivery_summary'
    ) THEN '✅ order_delivery_summary view exists' ELSE '❌ order_delivery_summary view missing' END as delivery_summary_view;

-- =====================================
-- SECTION 3: FUNCTIONS VALIDATION
-- =====================================

SELECT 
    'FUNCTIONS VALIDATION' as test_type,
    
    -- Check get_available_delivery_items function
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'get_available_delivery_items'
    ) THEN '✅ get_available_delivery_items function exists' ELSE '❌ get_available_delivery_items function missing' END as available_items_function,
    
    -- Check update_delivery_progress function
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'update_delivery_progress'
    ) THEN '✅ update_delivery_progress function exists' ELSE '❌ update_delivery_progress function missing' END as delivery_progress_function;

-- =====================================
-- SECTION 4: TRIGGERS VALIDATION
-- =====================================

SELECT 
    'TRIGGERS VALIDATION' as test_type,
    
    -- Check challan_items_delivery_progress_trigger
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_trigger pt
        JOIN pg_class pc ON pt.tgrelid = pc.oid
        WHERE pc.relname = 'challan_items' AND pt.tgname = 'challan_items_delivery_progress_trigger'
    ) THEN '✅ delivery progress trigger exists' ELSE '⚠️ delivery progress trigger missing (step 2 needed)' END as progress_trigger,
    
    -- Check validate_challan_quantity_trigger
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_trigger pt
        JOIN pg_class pc ON pt.tgrelid = pc.oid
        WHERE pc.relname = 'challan_items' AND pt.tgname = 'validate_challan_quantity_trigger'
    ) THEN '✅ quantity validation trigger exists' ELSE '⚠️ quantity validation trigger missing (step 2 needed)' END as validation_trigger;

-- =====================================
-- SECTION 5: DATA VALIDATION
-- =====================================

-- Check if order_items have delivery data
SELECT 
    'DATA VALIDATION' as test_type,
    COUNT(*) as total_order_items,
    COUNT(CASE WHEN total_delivered IS NOT NULL THEN 1 END) as items_with_delivered_data,
    COUNT(CASE WHEN total_delivered > 0 THEN 1 END) as items_with_deliveries,
    COUNT(CASE WHEN remaining_quantity IS NOT NULL THEN 1 END) as items_with_remaining_data
FROM order_items;

-- Check if orders have delivery status
SELECT 
    'ORDER STATUS DATA' as test_type,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN delivery_status IS NOT NULL THEN 1 END) as orders_with_status,
    COUNT(CASE WHEN delivery_progress_percent > 0 THEN 1 END) as orders_with_progress
FROM orders;

-- =====================================
-- SECTION 6: SAMPLE DATA TEST
-- =====================================

-- Show sample delivery tracking data
SELECT 
    'SAMPLE DELIVERY DATA' as test_type,
    o.order_number,
    c.name as customer_name,
    COUNT(oi.id) as total_items,
    SUM(oi.quantity) as total_quantity,
    SUM(COALESCE(oi.total_delivered, 0)) as delivered_quantity,
    SUM(COALESCE(oi.remaining_quantity, oi.quantity)) as remaining_quantity,
    o.delivery_status,
    o.delivery_progress_percent
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN order_items oi ON o.id = oi.order_id
WHERE o.is_deleted = FALSE
GROUP BY o.id, o.order_number, c.name, o.delivery_status, o.delivery_progress_percent
ORDER BY o.order_date DESC
LIMIT 5;

-- =====================================
-- SECTION 7: ERROR TESTING
-- =====================================

-- Test the problematic query that was causing the error
SELECT 
    'ERROR FIX TEST' as test_type,
    'Testing the original failing query...' as description;

-- This should now work without errors
SELECT 
    ci.id,
    ci.quantity,
    oi.material_type,
    oi.quantity as order_quantity,
    oi.design_url,
    oi.design_notes,
    oi.total_delivered,
    oi.remaining_quantity
FROM challan_items ci
JOIN order_items oi ON ci.order_item_id = oi.id
LIMIT 5;

-- =====================================
-- SECTION 8: OVERALL STATUS
-- =====================================

DO $$
DECLARE
    immediate_fix_score INTEGER := 0;
    full_migration_score INTEGER := 0;
    schema_complete BOOLEAN;
    views_complete BOOLEAN;
    functions_complete BOOLEAN;
    triggers_complete BOOLEAN;
BEGIN
    -- Check immediate fix completeness (required columns)
    SELECT 
        CASE WHEN COUNT(*) >= 5 THEN TRUE ELSE FALSE END INTO schema_complete
    FROM information_schema.columns 
    WHERE table_name = 'order_items' 
    AND column_name IN ('design_url', 'design_notes', 'total_delivered', 'remaining_quantity', 'design_ready');
    
    IF schema_complete THEN
        immediate_fix_score := 100;
    END IF;
    
    -- Check full migration completeness (views and functions)
    SELECT 
        CASE WHEN COUNT(*) >= 2 THEN TRUE ELSE FALSE END INTO views_complete
    FROM information_schema.views 
    WHERE table_name IN ('order_delivery_status', 'order_item_delivery_details');
    
    SELECT 
        CASE WHEN COUNT(*) >= 1 THEN TRUE ELSE FALSE END INTO functions_complete
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_available_delivery_items';
    
    SELECT 
        CASE WHEN COUNT(*) >= 1 THEN TRUE ELSE FALSE END INTO triggers_complete
    FROM pg_trigger pt
    JOIN pg_class pc ON pt.tgrelid = pc.oid
    WHERE pc.relname = 'challan_items' AND pt.tgname LIKE '%delivery_progress%';
    
    IF views_complete AND functions_complete AND triggers_complete THEN
        full_migration_score := 100;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== DELIVERY TRACKING FIX STATUS ===';
    RAISE NOTICE '';
    RAISE NOTICE 'IMMEDIATE FIX (Step 1): % %', 
        immediate_fix_score || '%', 
        CASE WHEN immediate_fix_score = 100 THEN '✅ COMPLETE' ELSE '❌ INCOMPLETE' END;
    RAISE NOTICE '  - Fixes design_url column error';
    RAISE NOTICE '  - Adds basic delivery tracking columns';
    RAISE NOTICE '';
    RAISE NOTICE 'FULL MIGRATION (Step 2): % %', 
        full_migration_score || '%',
        CASE WHEN full_migration_score = 100 THEN '✅ COMPLETE' ELSE '⚠️ PENDING' END;
    RAISE NOTICE '  - Advanced delivery tracking views';
    RAISE NOTICE '  - Automated delivery progress calculation';
    RAISE NOTICE '  - Enhanced challan creation features';
    RAISE NOTICE '';
    
    IF immediate_fix_score = 100 AND full_migration_score = 100 THEN
        RAISE NOTICE '🎉 ALL FIXES COMPLETE!';
        RAISE NOTICE '✅ Delivery challan page should work perfectly';
        RAISE NOTICE '✅ Order tracking features are fully available';
        RAISE NOTICE '✅ Enhanced challan creation with delivery progress';
    ELSIF immediate_fix_score = 100 THEN
        RAISE NOTICE '✅ IMMEDIATE FIX COMPLETE - ERROR RESOLVED!';
        RAISE NOTICE '⚠️ Run Step 2 (07_DELIVERY_TRACKING_ENHANCEMENTS.sql) for full features';
        RAISE NOTICE '📋 Delivery challan page should now work without errors';
    ELSE
        RAISE NOTICE '❌ IMMEDIATE FIX INCOMPLETE';
        RAISE NOTICE '🔧 Run Step 1 (IMMEDIATE_DELIVERY_TRACKING_FIX.sql) first';
    END IF;
END $$;