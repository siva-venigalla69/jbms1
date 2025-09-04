-- TARGETED FIXES FOR PROBLEMATIC FUNCTIONS
-- Only fixes the functions that reference old columns (production_stage, design_ready)

-- =====================================================
-- FIX 1: update_material_consumption function
-- =====================================================
CREATE OR REPLACE FUNCTION update_material_consumption()
RETURNS TRIGGER AS $$
BEGIN
    -- Update material consumption based on production_status (not production_stage)
    IF OLD.production_status IS DISTINCT FROM NEW.production_status THEN
        -- Calculate material consumption based on new production status
        CASE NEW.production_status
            WHEN 'printing' THEN
                NEW.material_consumed_qty = COALESCE(NEW.material_allocated_qty, 0);
            WHEN 'post_process' THEN
                -- Material fully consumed in post-process
                NEW.material_consumed_qty = COALESCE(NEW.material_allocated_qty, 0);
                -- Calculate wastage (example: 5% wastage)
                NEW.material_wastage_qty = COALESCE(NEW.material_allocated_qty * 0.05, 0);
            ELSE
                -- For pending and pre_treatment, no consumption yet
                NEW.material_consumed_qty = 0;
                NEW.material_wastage_qty = 0;
        END CASE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FIX 2: update_order_item_timestamp function  
-- =====================================================
CREATE OR REPLACE FUNCTION update_order_item_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    -- Update timestamp when production_status changes (not production_stage)
    IF OLD.production_status IS DISTINCT FROM NEW.production_status THEN
        NEW.stage_completed_at = NOW();
        -- Set actual completion date when reaching post_process
        IF NEW.production_status = 'post_process' THEN
            NEW.actual_completion_date = NOW();
        END IF;
    END IF;
    
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FIX 3: update_printing_readiness function
-- =====================================================
CREATE OR REPLACE FUNCTION update_printing_readiness()
RETURNS TRIGGER AS $$
BEGIN
    -- Set printing_can_start based on design_status (not design_ready)
    NEW.printing_can_start = (NEW.design_status = 'design_ready');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FIX 4: validate_design_production_status function
-- =====================================================
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

-- =====================================================
-- FIX 5: get_design_ready_from_status function
-- =====================================================
CREATE OR REPLACE FUNCTION get_design_ready_from_status(design_status TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (design_status = 'design_ready');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FIX 6: get_design_received_from_status function
-- =====================================================
CREATE OR REPLACE FUNCTION get_design_received_from_status(design_status TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (design_status IN ('design_received_from_customer', 'design_ready'));
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FIX 7: get_legacy_stage_from_status function
-- =====================================================
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
-- FIX 8: migrate_existing_design_data function
-- =====================================================
CREATE OR REPLACE FUNCTION migrate_existing_design_data()
RETURNS VOID AS $$
BEGIN
    -- Update any NULL design_status to default value
    UPDATE order_items 
    SET design_status = 'pending_from_customer' 
    WHERE design_status IS NULL;
    
    -- Update any NULL production_status to default value
    UPDATE order_items 
    SET production_status = 'pending' 
    WHERE production_status IS NULL;
    
    -- Set printing_can_start based on design_status
    UPDATE order_items 
    SET printing_can_start = (design_status = 'design_ready')
    WHERE printing_can_start IS NULL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FIX 9: sync_order_item_design_status function
-- =====================================================
CREATE OR REPLACE FUNCTION sync_order_item_design_status()
RETURNS VOID AS $$
BEGIN
    -- Sync design status across related tables if needed
    -- This function can be used for data consistency checks
    
    -- Example: Update printing_can_start based on current design_status
    UPDATE order_items 
    SET printing_can_start = (design_status = 'design_ready')
    WHERE printing_can_start != (design_status = 'design_ready');
END;
$$ LANGUAGE plpgsql;