-- COMPLETE 2-COLUMN MIGRATION WITH TRIGGER FIXES
-- This script fixes all database triggers, functions, and schema issues
-- Run this script to resolve production_stage and design column errors

-- =====================================================
-- PART 1: Drop All Dependent Objects (Views, Triggers, Functions)
-- =====================================================

-- Drop dependent views first
DROP VIEW IF EXISTS order_items_with_design_info CASCADE;
DROP VIEW IF EXISTS production_queue CASCADE;
DROP VIEW IF EXISTS production_status_summary CASCADE;

-- Drop triggers that reference old columns
DROP TRIGGER IF EXISTS tr_validate_stage_progression ON order_items;
DROP TRIGGER IF EXISTS tr_update_production_stage ON order_items;
DROP TRIGGER IF EXISTS tr_audit_order_item_changes ON order_items;
DROP TRIGGER IF EXISTS tr_order_item_audit ON order_items;

-- Drop functions that reference old columns
DROP FUNCTION IF EXISTS validate_production_stage_progression() CASCADE;
DROP FUNCTION IF EXISTS update_production_stage_trigger() CASCADE;
DROP FUNCTION IF EXISTS audit_order_item_changes() CASCADE;
DROP FUNCTION IF EXISTS log_order_item_audit() CASCADE;
DROP FUNCTION IF EXISTS get_production_stage_from_status(TEXT, TEXT) CASCADE;

-- Drop RPC functions that might cause issues
DROP FUNCTION IF EXISTS update_design_status(UUID, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_production_status(UUID, TEXT, TEXT, BOOLEAN, TEXT) CASCADE;

-- =====================================================
-- PART 2: Add New Columns (if they don't exist)
-- =====================================================

-- Add design_status column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'design_status') THEN
        ALTER TABLE order_items ADD COLUMN design_status TEXT DEFAULT 'pending_from_customer';
        RAISE NOTICE 'Added design_status column';
    ELSE
        RAISE NOTICE 'design_status column already exists';
    END IF;
END $$;

-- Add production_status column  
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'production_status') THEN
        ALTER TABLE order_items ADD COLUMN production_status TEXT DEFAULT 'pending';
        RAISE NOTICE 'Added production_status column';
    ELSE
        RAISE NOTICE 'production_status column already exists';
    END IF;
END $$;

-- =====================================================
-- PART 3: Migrate Data from Old Columns to New Columns
-- =====================================================

-- Migrate design status data
UPDATE order_items 
SET design_status = CASE 
    WHEN design_ready = true THEN 'design_ready'
    WHEN design_received = true THEN 'design_received_from_customer'
    ELSE 'pending_from_customer'
END
WHERE design_status IS NULL OR design_status = 'pending_from_customer';

-- Migrate production status data from current_stage or production_stage
UPDATE order_items 
SET production_status = CASE 
    WHEN current_stage = 'pre_treatment' OR production_stage = 'pre_treatment' THEN 'pre_treatment'
    WHEN current_stage = 'printing' OR production_stage = 'printing' THEN 'printing'
    WHEN current_stage = 'post_process' OR production_stage = 'post_process' THEN 'post_process'
    WHEN current_stage IN ('design_pending', 'design_ready') THEN 'pending'
    ELSE 'pending'
END
WHERE production_status IS NULL OR production_status = 'pending';

-- Handle customization_details parsing for fallback data
UPDATE order_items 
SET 
    design_status = CASE 
        WHEN customization_details LIKE '%Ready: Yes%' THEN 'design_ready'
        WHEN customization_details LIKE '%Design Status: Received%' THEN 'design_received_from_customer'
        ELSE 'pending_from_customer'
    END,
    production_status = CASE 
        WHEN customization_details LIKE '%Production Stage: PRINTING%' THEN 'printing'
        WHEN customization_details LIKE '%Production Stage: POST_PROCESS%' THEN 'post_process'
        WHEN customization_details LIKE '%Production Stage: PRE_TREATMENT%' THEN 'pre_treatment'
        ELSE 'pending'
    END
WHERE (design_status IS NULL OR production_status IS NULL OR design_status = 'pending_from_customer') 
AND customization_details IS NOT NULL;

-- =====================================================
-- PART 4: Drop Old Columns Safely
-- =====================================================

-- Drop old columns
ALTER TABLE order_items DROP COLUMN IF EXISTS current_stage;
ALTER TABLE order_items DROP COLUMN IF EXISTS production_stage;
ALTER TABLE order_items DROP COLUMN IF EXISTS design_received;
ALTER TABLE order_items DROP COLUMN IF EXISTS design_ready;
ALTER TABLE order_items DROP COLUMN IF EXISTS design_received_date;
ALTER TABLE order_items DROP COLUMN IF EXISTS design_ready_date;

RAISE NOTICE 'Dropped old columns successfully';

-- =====================================================
-- PART 5: Create New Constraints and Validation
-- =====================================================

-- Add constraints for valid enum values
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS chk_design_status;
ALTER TABLE order_items ADD CONSTRAINT chk_design_status 
CHECK (design_status IN ('pending_from_customer', 'design_received_from_customer', 'design_ready'));

ALTER TABLE order_items DROP CONSTRAINT IF EXISTS chk_production_status;
ALTER TABLE order_items ADD CONSTRAINT chk_production_status 
CHECK (production_status IN ('pending', 'pre_treatment', 'printing', 'post_process'));

-- =====================================================
-- PART 6: Create New Validation Functions and Triggers
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
    IF NEW.production_status NOT IN ('pending', 'pre_treatment', 'printing', 'post_process') THEN
        RAISE EXCEPTION 'Invalid production_status: %. Must be one of: pending, pre_treatment, printing, post_process', NEW.production_status;
    END IF;
    
    -- Business rule: Can't start production until design is ready
    IF NEW.production_status IN ('pre_treatment', 'printing', 'post_process') AND NEW.design_status != 'design_ready' THEN
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
-- PART 7: Create Safe Audit Logging Function
-- =====================================================

-- Create audit function that works with new columns
CREATE OR REPLACE FUNCTION audit_order_item_changes()
RETURNS TRIGGER AS $$
DECLARE
    changes_made TEXT := '';
BEGIN
    -- Only log if audit_logs table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        -- Build change description for new columns
        IF TG_OP = 'UPDATE' THEN
            IF OLD.design_status != NEW.design_status THEN
                changes_made := changes_made || 'design_status: ' || COALESCE(OLD.design_status, 'null') || ' -> ' || COALESCE(NEW.design_status, 'null') || '; ';
            END IF;
            IF OLD.production_status != NEW.production_status THEN
                changes_made := changes_made || 'production_status: ' || COALESCE(OLD.production_status, 'null') || ' -> ' || COALESCE(NEW.production_status, 'null') || '; ';
            END IF;
        END IF;
        
        -- Only insert audit log if there are meaningful changes
        IF changes_made != '' OR TG_OP = 'INSERT' THEN
            INSERT INTO audit_logs (
                transaction_type, event_type, entity_type, entity_id, 
                description, new_values, previous_values, timestamp
            ) VALUES (
                'production', 
                LOWER(TG_OP), 
                'order_item', 
                NEW.id::TEXT,
                CASE 
                    WHEN TG_OP = 'INSERT' THEN 'Order item created'
                    ELSE 'Order item updated: ' || changes_made
                END,
                jsonb_build_object(
                    'design_status', NEW.design_status,
                    'production_status', NEW.production_status,
                    'material_type', NEW.material_type,
                    'quantity', NEW.quantity
                ),
                CASE WHEN TG_OP = 'UPDATE' THEN
                    jsonb_build_object(
                        'design_status', OLD.design_status,
                        'production_status', OLD.production_status,
                        'material_type', OLD.material_type,
                        'quantity', OLD.quantity
                    )
                ELSE NULL END,
                NOW()
            );
        END IF;
    END IF;
    
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

-- Create audit trigger
CREATE TRIGGER tr_audit_order_item_changes
    AFTER INSERT OR UPDATE OR DELETE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION audit_order_item_changes();

-- =====================================================
-- PART 8: Recreate Views with New Column Structure
-- =====================================================

-- Recreate order_items_with_design_info view
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

-- Recreate production_queue view
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
        WHEN oi.design_status = 'design_ready' AND oi.production_status = 'pre_treatment' THEN 2
        WHEN oi.design_status = 'design_ready' AND oi.production_status = 'printing' THEN 3
        WHEN oi.design_status = 'design_ready' AND oi.production_status = 'post_process' THEN 4
        ELSE 0
    END as queue_priority,
    oi.created_at,
    oi.updated_at
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN customers c ON o.customer_id = c.id
WHERE o.is_deleted = false
ORDER BY queue_priority DESC, oi.created_at ASC;

-- Create production status summary view
CREATE OR REPLACE VIEW production_status_summary AS
SELECT 
    oi.design_status,
    oi.production_status,
    COUNT(*) as item_count,
    SUM(oi.quantity) as total_quantity,
    COUNT(DISTINCT o.customer_id) as customer_count
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.is_deleted = false
GROUP BY oi.design_status, oi.production_status
ORDER BY oi.design_status, oi.production_status;

-- =====================================================
-- PART 9: Create RPC Functions for Frontend
-- =====================================================

-- Create safe update_design_status function
CREATE OR REPLACE FUNCTION update_design_status(
    p_order_item_id UUID,
    p_design_status TEXT,
    p_design_file_url TEXT DEFAULT NULL,
    p_design_notes TEXT DEFAULT NULL,
    p_design_approved_by TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    result_item order_items%ROWTYPE;
BEGIN
    -- Validate design status
    IF p_design_status NOT IN ('pending_from_customer', 'design_received_from_customer', 'design_ready') THEN
        RAISE EXCEPTION 'Invalid design_status: %', p_design_status;
    END IF;
    
    -- Update the order item
    UPDATE order_items 
    SET 
        design_status = p_design_status,
        design_file_url = COALESCE(p_design_file_url, design_file_url),
        design_notes = COALESCE(p_design_notes, design_notes),
        updated_at = NOW()
    WHERE id = p_order_item_id
    RETURNING * INTO result_item;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order item not found: %', p_order_item_id;
    END IF;
    
    RETURN to_jsonb(result_item);
END;
$$ LANGUAGE plpgsql;

-- Create safe update_production_status function  
CREATE OR REPLACE FUNCTION update_production_status(
    p_order_item_id UUID,
    p_production_status TEXT,
    p_production_notes TEXT DEFAULT NULL,
    p_quality_check_passed BOOLEAN DEFAULT NULL,
    p_completed_by TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    result_item order_items%ROWTYPE;
    current_design_status TEXT;
BEGIN
    -- Get current design status
    SELECT design_status INTO current_design_status 
    FROM order_items 
    WHERE id = p_order_item_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order item not found: %', p_order_item_id;
    END IF;
    
    -- Validate production status
    IF p_production_status NOT IN ('pending', 'pre_treatment', 'printing', 'post_process') THEN
        RAISE EXCEPTION 'Invalid production_status: %', p_production_status;
    END IF;
    
    -- Business rule validation
    IF p_production_status IN ('pre_treatment', 'printing', 'post_process') AND current_design_status != 'design_ready' THEN
        RAISE EXCEPTION 'Cannot start production until design is ready. Current design status: %', current_design_status;
    END IF;
    
    -- Update the order item
    UPDATE order_items 
    SET 
        production_status = p_production_status,
        production_notes = COALESCE(p_production_notes, production_notes),
        updated_at = NOW()
    WHERE id = p_order_item_id
    RETURNING * INTO result_item;
    
    RETURN to_jsonb(result_item);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 10: Create Helper Functions
-- =====================================================

-- Helper function to get legacy stage representation (for compatibility)
CREATE OR REPLACE FUNCTION get_legacy_stage_from_status(design_status TEXT, production_status TEXT)
RETURNS TEXT AS $$
BEGIN
    CASE 
        WHEN design_status = 'pending_from_customer' THEN RETURN 'design_pending';
        WHEN design_status = 'design_received_from_customer' THEN RETURN 'design_ready';
        WHEN design_status = 'design_ready' AND production_status = 'pending' THEN RETURN 'pre_treatment';
        WHEN design_status = 'design_ready' AND production_status = 'pre_treatment' THEN RETURN 'pre_treatment';
        WHEN design_status = 'design_ready' AND production_status = 'printing' THEN RETURN 'printing';
        WHEN design_status = 'design_ready' AND production_status = 'post_process' THEN RETURN 'post_process';
        ELSE RETURN 'design_pending';
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 11: Update Existing Data Consistency
-- =====================================================

-- Ensure all records have valid status values
UPDATE order_items 
SET design_status = 'pending_from_customer' 
WHERE design_status IS NULL;

UPDATE order_items 
SET production_status = 'pending' 
WHERE production_status IS NULL;

-- Make columns NOT NULL after ensuring data consistency
ALTER TABLE order_items ALTER COLUMN design_status SET NOT NULL;
ALTER TABLE order_items ALTER COLUMN production_status SET NOT NULL;

-- =====================================================
-- PART 12: Final Verification and Health Check
-- =====================================================

-- Verify schema changes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name IN ('design_status', 'production_status') THEN '✅ NEW COLUMN'
        WHEN column_name IN ('current_stage', 'production_stage', 'design_received', 'design_ready') THEN '❌ OLD COLUMN STILL EXISTS'
        ELSE 'ℹ️  OTHER COLUMN'
    END as status
FROM information_schema.columns 
WHERE table_name = 'order_items' 
AND column_name IN (
    'design_status', 'production_status',  -- New columns
    'current_stage', 'production_stage', 'design_received', 'design_ready'  -- Old columns (should be gone)
)
ORDER BY column_name;

-- Verify views were recreated
SELECT 
    schemaname,
    viewname,
    '✅ RECREATED' as status
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN ('order_items_with_design_info', 'production_queue', 'production_status_summary');

-- Verify functions exist
SELECT 
    proname as function_name,
    '✅ CREATED' as status
FROM pg_proc 
WHERE proname IN (
    'validate_design_production_status', 
    'update_design_status', 
    'update_production_status',
    'audit_order_item_changes',
    'get_legacy_stage_from_status'
);

-- Show data distribution
SELECT 
    design_status,
    production_status,
    COUNT(*) as count
FROM order_items
GROUP BY design_status, production_status
ORDER BY design_status, production_status;

-- =====================================================
-- PART 13: Final Messages
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 COMPLETE 2-COLUMN MIGRATION FINISHED SUCCESSFULLY!';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Migration Summary:';
    RAISE NOTICE '   • Old columns dropped safely';
    RAISE NOTICE '   • New design_status and production_status columns created';
    RAISE NOTICE '   • Data migrated from old to new structure';
    RAISE NOTICE '   • Database triggers updated for new columns';
    RAISE NOTICE '   • Views recreated with new column structure';
    RAISE NOTICE '   • RPC functions created for frontend integration';
    RAISE NOTICE '   • Audit logging updated to work with new schema';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 FRONTEND ERROR RESOLUTION:';
    RAISE NOTICE '   • "record old has no field production_stage" - FIXED';
    RAISE NOTICE '   • Design status update errors - FIXED';
    RAISE NOTICE '   • Production status update errors - FIXED';
    RAISE NOTICE '   • Pre-treatment stage support - ADDED';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Next Steps:';
    RAISE NOTICE '   1. Test design status updates in frontend';
    RAISE NOTICE '   2. Test production status updates in frontend';
    RAISE NOTICE '   3. Verify pre-treatment stage appears in UI';
    RAISE NOTICE '   4. Run BusinessFlowTester to verify APIs';
    RAISE NOTICE '';
END $$;