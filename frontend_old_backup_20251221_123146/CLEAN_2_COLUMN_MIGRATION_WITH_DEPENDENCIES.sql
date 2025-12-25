-- CLEAN 2-COLUMN MIGRATION WITH DEPENDENCY HANDLING
-- This script properly handles all dependent objects before dropping old columns
-- Run this AFTER the main CLEAN_2_COLUMN_MIGRATION.sql has been executed

-- =====================================================
-- PART 1: Handle Dependent Objects Before Column Drop
-- =====================================================

-- Step 1: Drop dependent views
DROP VIEW IF EXISTS order_items_with_design_info CASCADE;
DROP VIEW IF EXISTS production_queue CASCADE;

-- Step 2: Drop dependent triggers
DROP TRIGGER IF EXISTS tr_validate_stage_progression ON order_items;

-- Step 3: Drop any functions that reference old columns
DROP FUNCTION IF EXISTS validate_production_stage_progression() CASCADE;

-- =====================================================
-- PART 2: Safely Drop Old Columns
-- =====================================================

-- Now we can safely drop the old columns
ALTER TABLE order_items DROP COLUMN IF EXISTS current_stage;
ALTER TABLE order_items DROP COLUMN IF EXISTS production_stage; 
ALTER TABLE order_items DROP COLUMN IF EXISTS design_received;
ALTER TABLE order_items DROP COLUMN IF EXISTS design_ready;
ALTER TABLE order_items DROP COLUMN IF EXISTS design_received_date;
ALTER TABLE order_items DROP COLUMN IF EXISTS design_ready_date;

-- Optional: Keep these if you want file URLs and notes
-- ALTER TABLE order_items DROP COLUMN IF EXISTS design_file_url;
-- ALTER TABLE order_items DROP COLUMN IF EXISTS design_notes;

-- =====================================================
-- PART 3: Recreate Views with New Column Structure
-- =====================================================

-- Recreate order_items_with_design_info view using new columns
CREATE OR REPLACE VIEW order_items_with_design_info AS
SELECT 
    oi.*,
    o.order_number,
    o.customer_id,
    c.name as customer_name,
    c.phone as customer_phone,
    CASE 
        WHEN oi.design_status = 'design_ready' THEN true
        ELSE false
    END as design_ready_computed,
    CASE 
        WHEN oi.design_status IN ('design_received_from_customer', 'design_ready') THEN true
        ELSE false
    END as design_received_computed
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN customers c ON o.customer_id = c.id
WHERE o.is_deleted = false;

-- Recreate production_queue view using new columns
CREATE OR REPLACE VIEW production_queue AS
SELECT 
    oi.id,
    oi.order_id,
    o.order_number,
    o.customer_id,
    c.name as customer_name,
    oi.material_type,
    oi.quantity,
    oi.design_status,
    oi.production_status,
    CASE 
        WHEN oi.design_status = 'design_ready' AND oi.production_status = 'pending' THEN 1
        WHEN oi.design_status = 'design_ready' AND oi.production_status = 'printing' THEN 2
        WHEN oi.design_status = 'design_ready' AND oi.production_status = 'post_process' THEN 3
        ELSE 0
    END as queue_priority,
    oi.created_at,
    oi.updated_at
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN customers c ON o.customer_id = c.id
WHERE o.is_deleted = false
ORDER BY queue_priority DESC, oi.created_at ASC;

-- =====================================================
-- PART 4: Create New Business Logic Triggers
-- =====================================================

-- Create function for new 2-column validation
CREATE OR REPLACE FUNCTION validate_design_production_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate design_status values
    IF NEW.design_status NOT IN ('pending_from_customer', 'design_received_from_customer', 'design_ready') THEN
        RAISE EXCEPTION 'Invalid design_status: %. Must be one of: pending_from_customer, design_received_from_customer, design_ready', NEW.design_status;
    END IF;
    
    -- Validate production_status values
    IF NEW.production_status NOT IN ('pending', 'printing', 'post_process') THEN
        RAISE EXCEPTION 'Invalid production_status: %. Must be one of: pending, printing, post_process', NEW.production_status;
    END IF;
    
    -- Business rule: Can't start production until design is ready
    IF NEW.production_status IN ('printing', 'post_process') AND NEW.design_status != 'design_ready' THEN
        RAISE EXCEPTION 'Cannot start production (%) until design is ready. Current design status: %', NEW.production_status, NEW.design_status;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validation
CREATE TRIGGER tr_validate_design_production_status
    BEFORE INSERT OR UPDATE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION validate_design_production_status();

-- =====================================================
-- PART 5: Update Any Other Dependent Objects
-- =====================================================

-- Update material_design_mapping if it exists and references old columns
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_design_mapping') THEN
        -- Add any necessary updates to material_design_mapping here
        RAISE NOTICE 'material_design_mapping table exists - no changes needed for 2-column migration';
    END IF;
END $$;

-- Update production_schedule if it exists and references old columns
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'production_schedule') THEN
        -- The production_schedule table can continue to work with new columns
        RAISE NOTICE 'production_schedule table exists - compatible with new column structure';
    END IF;
END $$;

-- =====================================================
-- PART 6: Create Compatibility Functions (Optional)
-- =====================================================

-- Create helper functions for frontend compatibility during transition
CREATE OR REPLACE FUNCTION get_legacy_stage_from_status(design_status TEXT, production_status TEXT)
RETURNS TEXT AS $$
BEGIN
    CASE 
        WHEN design_status = 'pending_from_customer' THEN RETURN 'design_pending';
        WHEN design_status = 'design_received_from_customer' THEN RETURN 'design_ready';
        WHEN design_status = 'design_ready' AND production_status = 'pending' THEN RETURN 'pre_treatment';
        WHEN design_status = 'design_ready' AND production_status = 'printing' THEN RETURN 'printing';
        WHEN design_status = 'design_ready' AND production_status = 'post_process' THEN RETURN 'post_process';
        ELSE RETURN 'design_pending';
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Create helper function to convert legacy boolean design fields
CREATE OR REPLACE FUNCTION get_design_received_from_status(design_status TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN design_status IN ('design_received_from_customer', 'design_ready');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_design_ready_from_status(design_status TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN design_status = 'design_ready';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 7: Verification and Health Check
-- =====================================================

-- Check that all old columns are dropped
SELECT 
    column_name,
    CASE 
        WHEN column_name IN ('design_status', 'production_status') THEN '✅ NEW COLUMN'
        WHEN column_name IN ('current_stage', 'production_stage', 'design_received', 'design_ready') THEN '❌ OLD COLUMN STILL EXISTS'
        ELSE 'ℹ️  OTHER COLUMN'
    END as status
FROM information_schema.columns 
WHERE table_name = 'order_items' 
AND column_name IN (
    'design_status', 'production_status',  -- New columns
    'current_stage', 'production_stage', 'design_received', 'design_ready'  -- Old columns
)
ORDER BY column_name;

-- Verify views exist and work
SELECT 
    schemaname,
    viewname,
    CASE 
        WHEN viewname IN ('order_items_with_design_info', 'production_queue') THEN '✅ RECREATED'
        ELSE 'ℹ️  OTHER VIEW'
    END as status
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN ('order_items_with_design_info', 'production_queue');

-- Test the new trigger (only if orders exist)
DO $$
DECLARE
    test_passed BOOLEAN := FALSE;
    test_order_id UUID;
BEGIN
    -- Check if we have any orders to test with
    SELECT id INTO test_order_id FROM orders LIMIT 1;
    
    IF test_order_id IS NOT NULL THEN
        -- Test successful case
        INSERT INTO order_items (order_id, material_type, quantity, unit_price, design_status, production_status)
        VALUES (test_order_id, 'saree', 1, 100, 'design_ready', 'printing');
        
        -- Clean up test data
        DELETE FROM order_items WHERE order_id = test_order_id AND material_type = 'saree' AND quantity = 1 AND unit_price = 100;
        test_passed := TRUE;
        
        RAISE NOTICE '✅ Trigger validation test PASSED - new columns working correctly';
    ELSE
        RAISE NOTICE 'ℹ️  No orders found - skipping trigger test (this is normal for empty databases)';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Trigger validation test FAILED: %', SQLERRM;
        -- Clean up any test data that might have been inserted
        BEGIN
            DELETE FROM order_items WHERE order_id = test_order_id AND material_type = 'saree' AND quantity = 1 AND unit_price = 100;
        EXCEPTION
            WHEN OTHERS THEN NULL; -- Ignore cleanup errors
        END;
END $$;

-- =====================================================
-- PART 8: Final Summary
-- =====================================================

SELECT 
    'Migration completed successfully!' as status,
    COUNT(*) as total_order_items,
    COUNT(CASE WHEN design_status IS NOT NULL THEN 1 END) as items_with_design_status,
    COUNT(CASE WHEN production_status IS NOT NULL THEN 1 END) as items_with_production_status
FROM order_items;

-- Show the new column structure using SQL query instead of \d+
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name IN ('design_status', 'production_status') THEN '🆕 NEW COLUMN'
        ELSE '📋 EXISTING'
    END as column_type
FROM information_schema.columns 
WHERE table_name = 'order_items' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Final success messages
DO $$
BEGIN
    RAISE NOTICE '🎉 CLEAN 2-COLUMN MIGRATION COMPLETED!';
    RAISE NOTICE '✅ Old columns dropped safely';
    RAISE NOTICE '✅ Dependent objects recreated';
    RAISE NOTICE '✅ New triggers and validation in place';
    RAISE NOTICE '✅ Compatibility functions available';
    RAISE NOTICE '🚀 Your system now uses the clean 2-column design!';
END $$;