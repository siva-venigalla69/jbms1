-- CLEANUP OLD TRIGGERS AND FUNCTIONS
-- This fixes the "record 'old' has no field 'production_stage'" error
-- Your schema is already migrated, just need to clean up old references

-- =====================================================
-- PART 1: Drop All Old Triggers and Functions
-- =====================================================

-- Drop triggers that might reference old columns
DROP TRIGGER IF EXISTS tr_validate_stage_progression ON order_items;
DROP TRIGGER IF EXISTS tr_update_production_stage ON order_items;
DROP TRIGGER IF EXISTS tr_audit_order_item_changes ON order_items;
DROP TRIGGER IF EXISTS tr_order_item_audit ON order_items;
DROP TRIGGER IF EXISTS tr_production_stage_audit ON order_items;

-- Drop functions that reference old columns
DROP FUNCTION IF EXISTS validate_production_stage_progression() CASCADE;
DROP FUNCTION IF EXISTS update_production_stage_trigger() CASCADE;
DROP FUNCTION IF EXISTS audit_order_item_changes() CASCADE;
DROP FUNCTION IF EXISTS log_order_item_audit() CASCADE;
DROP FUNCTION IF EXISTS production_stage_audit() CASCADE;
DROP FUNCTION IF EXISTS get_production_stage_from_status(TEXT, TEXT) CASCADE;

-- Drop old RPC functions
DROP FUNCTION IF EXISTS update_design_status(UUID, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_production_status(UUID, TEXT, TEXT, BOOLEAN, TEXT) CASCADE;

-- =====================================================
-- PART 2: Create New Clean Audit Function
-- =====================================================

-- Create audit function that works with existing columns
CREATE OR REPLACE FUNCTION audit_order_item_changes()
RETURNS TRIGGER AS $$
DECLARE
    changes_made TEXT := '';
BEGIN
    -- Only log if audit_logs table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        -- Build change description for existing columns
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

-- Create clean audit trigger
CREATE TRIGGER tr_audit_order_item_changes
    AFTER INSERT OR UPDATE OR DELETE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION audit_order_item_changes();

-- =====================================================
-- PART 3: Create Validation Function
-- =====================================================

-- Create validation function for existing columns
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
-- PART 4: Create RPC Functions for Frontend
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
        quality_notes = COALESCE(p_production_notes, quality_notes),
        updated_at = NOW()
    WHERE id = p_order_item_id
    RETURNING * INTO result_item;
    
    RETURN to_jsonb(result_item);
END;
$$ LANGUAGE plpgsql;