-- PRODUCTION STAGE COLUMN FIX
-- Fixes the "record 'old' has no field 'production_stage'" error
-- This migration updates the database schema to use the new 2-column design system

-- =====================================================
-- PART 1: Drop Dependent Objects That Reference Old Columns
-- =====================================================

-- Drop views first
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
-- PART 2: Add New Columns
-- =====================================================

-- Add design_status column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'design_status') THEN
        ALTER TABLE order_items ADD COLUMN design_status TEXT DEFAULT 'pending_from_customer';
        RAISE NOTICE 'Added design_status column';
    ELSE
        RAISE NOTICE 'design_status column already exists';
    END IF;
END $$;

-- Add production_status column if it doesn't exist
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
-- PART 3: Migrate Data from Old Columns
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
        ELSE design_status
    END,
    production_status = CASE 
        WHEN customization_details LIKE '%Production Stage: PRINTING%' THEN 'printing'
        WHEN customization_details LIKE '%Production Stage: POST_PROCESS%' THEN 'post_process'
        WHEN customization_details LIKE '%Production Stage: PRE_TREATMENT%' THEN 'pre_treatment'
        ELSE production_status
    END
WHERE customization_details IS NOT NULL;

-- =====================================================
-- PART 4: Drop Old Columns
-- =====================================================

-- Drop old columns safely
ALTER TABLE order_items DROP COLUMN IF EXISTS current_stage;
ALTER TABLE order_items DROP COLUMN IF EXISTS production_stage;
ALTER TABLE order_items DROP COLUMN IF EXISTS design_received;
ALTER TABLE order_items DROP COLUMN IF EXISTS design_ready;
ALTER TABLE order_items DROP COLUMN IF EXISTS design_received_date;
ALTER TABLE order_items DROP COLUMN IF EXISTS design_ready_date;

-- =====================================================
-- PART 5: Add Constraints
-- =====================================================

-- Add constraints for valid enum values
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS chk_design_status;
ALTER TABLE order_items ADD CONSTRAINT chk_design_status 
CHECK (design_status IN ('pending_from_customer', 'design_received_from_customer', 'design_ready'));

ALTER TABLE order_items DROP CONSTRAINT IF EXISTS chk_production_status;
ALTER TABLE order_items ADD CONSTRAINT chk_production_status 
CHECK (production_status IN ('pending', 'pre_treatment', 'printing', 'post_process'));

-- =====================================================
-- PART 6: Create New Validation Function and Trigger
-- =====================================================

-- Create validation function for new columns
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

-- Create validation trigger
CREATE TRIGGER tr_validate_design_production_status
    BEFORE INSERT OR UPDATE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION validate_design_production_status();

-- =====================================================
-- PART 7: Create Audit Function (Safe Version)
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
            IF OLD.design_status IS DISTINCT FROM NEW.design_status THEN
                changes_made := changes_made || 'design_status: ' || COALESCE(OLD.design_status, 'null') || ' -> ' || COALESCE(NEW.design_status, 'null') || '; ';
            END IF;
            IF OLD.production_status IS DISTINCT FROM NEW.production_status THEN
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
-- PART 8: Recreate Views
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

-- Create update_design_status function
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

-- Create update_production_status function  
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
-- PART 10: Ensure Data Consistency
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
-- PART 11: Final Success Message
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ PRODUCTION STAGE COLUMN FIX COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '   • Fixed "record old has no field production_stage" error';
    RAISE NOTICE '   • Migrated to new 2-column design (design_status, production_status)';
    RAISE NOTICE '   • Updated triggers, views, and functions';
    RAISE NOTICE '   • Ready for production deployment';
END $$;