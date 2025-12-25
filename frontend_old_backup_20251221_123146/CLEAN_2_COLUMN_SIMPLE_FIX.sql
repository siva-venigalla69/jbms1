-- SIMPLE 2-COLUMN FIX FOR DEPENDENCY ERRORS
-- This is a minimal script to fix the "cannot drop column" error
-- Use this if you just want to resolve the immediate dependency issue

-- =====================================================
-- STEP 1: Drop Dependent Objects That Block Column Removal
-- =====================================================

-- Drop views that depend on old columns
DROP VIEW IF EXISTS order_items_with_design_info CASCADE;
DROP VIEW IF EXISTS production_queue CASCADE;

-- Drop triggers that depend on old columns  
DROP TRIGGER IF EXISTS tr_validate_stage_progression ON order_items;

-- Drop functions that reference old columns
DROP FUNCTION IF EXISTS validate_production_stage_progression() CASCADE;

-- =====================================================
-- STEP 2: Now You Can Safely Drop Old Columns
-- =====================================================

-- These should now work without errors:
ALTER TABLE order_items DROP COLUMN IF EXISTS current_stage;
ALTER TABLE order_items DROP COLUMN IF EXISTS production_stage; 
ALTER TABLE order_items DROP COLUMN IF EXISTS design_received;
ALTER TABLE order_items DROP COLUMN IF EXISTS design_ready;
ALTER TABLE order_items DROP COLUMN IF EXISTS design_received_date;
ALTER TABLE order_items DROP COLUMN IF EXISTS design_ready_date;

-- =====================================================
-- STEP 3: Basic Verification
-- =====================================================

-- Verify old columns are gone
SELECT 
    'Old columns check:' as status,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ All old columns successfully removed'
        ELSE '❌ Some old columns still exist: ' || string_agg(column_name, ', ')
    END as result
FROM information_schema.columns 
WHERE table_name = 'order_items' 
AND column_name IN ('current_stage', 'production_stage', 'design_received', 'design_ready');

-- Verify new columns exist
SELECT 
    'New columns check:' as status,
    CASE 
        WHEN COUNT(*) = 2 THEN '✅ Both new columns (design_status, production_status) exist'
        ELSE '❌ Missing new columns. Run CLEAN_2_COLUMN_MIGRATION.sql first!'
    END as result
FROM information_schema.columns 
WHERE table_name = 'order_items' 
AND column_name IN ('design_status', 'production_status');

-- Show current column structure
SELECT 
    column_name,
    data_type,
    CASE 
        WHEN column_name IN ('design_status', 'production_status') THEN '🆕 NEW'
        WHEN column_name IN ('id', 'order_id', 'material_type', 'quantity', 'unit_price') THEN '📋 CORE'
        ELSE '📄 OTHER'
    END as type
FROM information_schema.columns 
WHERE table_name = 'order_items' 
ORDER BY ordinal_position;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '🎉 DEPENDENCY FIX COMPLETED!';
    RAISE NOTICE '✅ Dependent objects dropped';
    RAISE NOTICE '✅ Old columns removed safely';
    RAISE NOTICE '⚠️  Note: Views and triggers were removed - you may need to recreate them if needed';
    RAISE NOTICE '💡 For full migration with recreated objects, use CLEAN_2_COLUMN_MIGRATION_WITH_DEPENDENCIES.sql';
END $$;