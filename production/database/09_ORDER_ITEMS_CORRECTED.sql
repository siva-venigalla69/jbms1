-- =====================================
-- CORRECTED ORDER ITEMS DESIGN INTEGRATION 
-- Migration 09: Using actual database schema data types
-- VARCHAR for: material_types, production_stages, user_roles, order_statuses, payment_methods
-- UUID for: customers, orders, order_items, gst_invoices, user_profiles
-- =====================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================
-- ORDER ITEMS ENHANCEMENTS
-- ====================

-- Add design workflow integration to order_items
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS linked_design_id UUID REFERENCES design_submissions(id),
ADD COLUMN IF NOT EXISTS design_received BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS design_ready BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS design_file_url TEXT,
ADD COLUMN IF NOT EXISTS design_notes TEXT,
ADD COLUMN IF NOT EXISTS design_received_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS printing_can_start BOOLEAN DEFAULT FALSE;

-- Add material consumption tracking
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS material_allocated_qty DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS material_consumed_qty DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS material_wastage_qty DECIMAL(10,2) DEFAULT 0;

-- Add completion tracking
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS actual_completion_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS quality_notes TEXT,
ADD COLUMN IF NOT EXISTS production_issues TEXT;

-- ====================
-- DELIVERY CHALLAN ENHANCEMENTS  
-- ====================

-- Add design reference to challan items
ALTER TABLE challan_items
ADD COLUMN IF NOT EXISTS design_id UUID REFERENCES design_submissions(id),
ADD COLUMN IF NOT EXISTS design_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS production_batch VARCHAR(100);

-- ====================
-- ENHANCED BUSINESS INTELLIGENCE VIEWS
-- ====================

-- Order Items with Design Information
CREATE OR REPLACE VIEW order_items_with_design_info AS
SELECT 
    oi.*,
    ds.design_name,
    ds.design_type,
    ds.design_complexity,
    ds.actual_ready_date as design_ready_date,
    ps.name as production_stage_name,
    ps.sequence_order as stage_sequence,
    c.name as customer_name,
    mt.name as material_type_name,
    
    -- Production Readiness Assessment
    CASE 
        WHEN oi.design_ready AND oi.material_allocated_qty > 0 THEN 'Ready for Production'
        WHEN NOT oi.design_ready THEN 'Waiting for Design'
        WHEN oi.material_allocated_qty = 0 THEN 'Waiting for Material Allocation'
        ELSE 'Assessment Pending'
    END as production_readiness_status,
    
    -- Progress Calculation
    CASE 
        WHEN oi.actual_completion_date IS NOT NULL THEN 100
        WHEN oi.stage_completed_at IS NOT NULL THEN 80
        WHEN oi.printing_can_start THEN 60
        WHEN oi.design_ready THEN 40
        WHEN oi.design_received THEN 20
        ELSE 0
    END as progress_percentage
    
FROM order_items oi
LEFT JOIN design_submissions ds ON oi.linked_design_id = ds.id
LEFT JOIN production_stages ps ON oi.production_stage = ps.id
LEFT JOIN orders o ON oi.order_id = o.id
LEFT JOIN customers c ON o.customer_id = c.id
LEFT JOIN material_types mt ON oi.material_type = mt.id;

-- Production Queue View
CREATE OR REPLACE VIEW production_queue AS
SELECT 
    oi.id as order_item_id,
    oi.order_id,
    o.order_number,
    c.name as customer_name,
    oi.quantity,
    mt.name as material_type,
    ds.design_name,
    ds.priority_level,
    ps.name as current_stage,
    ps.sequence_order,
    oi.printing_can_start,
    -- Progress Calculation (calculated here, not from table)
    CASE 
        WHEN oi.actual_completion_date IS NOT NULL THEN 100
        WHEN oi.stage_completed_at IS NOT NULL THEN 80
        WHEN oi.printing_can_start THEN 60
        WHEN oi.design_ready THEN 40
        WHEN oi.design_received THEN 20
        ELSE 0
    END as progress_percentage,
    
    -- Next stage calculation
    (SELECT ps2.name 
     FROM production_stages ps2 
     WHERE ps2.sequence_order = ps.sequence_order + 1
     LIMIT 1) as next_stage,
     
    -- Estimated completion
    CASE 
        WHEN oi.printing_can_start THEN 
            CURRENT_DATE + INTERVAL '3 days'
        WHEN oi.design_ready THEN 
            CURRENT_DATE + INTERVAL '5 days'
        ELSE 
            CURRENT_DATE + INTERVAL '7 days'
    END as estimated_completion,
    
    oi.created_at,
    oi.updated_at
    
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN customers c ON o.customer_id = c.id
LEFT JOIN design_submissions ds ON oi.linked_design_id = ds.id
LEFT JOIN production_stages ps ON oi.production_stage = ps.id
LEFT JOIN material_types mt ON oi.material_type = mt.id
WHERE oi.actual_completion_date IS NULL
ORDER BY 
    ds.priority_level ASC NULLS LAST,
    oi.created_at ASC;

-- Design Workload Summary
CREATE OR REPLACE VIEW design_workload_summary AS
SELECT 
    ds.assigned_designer,
    up.full_name as designer_name,
    COUNT(*) as total_designs,
    COUNT(*) FILTER (WHERE ds.actual_ready_date IS NULL) as pending_designs,
    COUNT(*) FILTER (WHERE ds.actual_ready_date IS NOT NULL) as completed_designs,
    AVG(ds.priority_level) as avg_priority,
    SUM(ds.estimated_prep_hours) as total_estimated_hours,
    SUM(ds.actual_prep_hours) as total_actual_hours,
    
    -- Efficiency calculation
    CASE 
        WHEN SUM(ds.estimated_prep_hours) > 0 THEN 
            ROUND((SUM(ds.actual_prep_hours) / SUM(ds.estimated_prep_hours)) * 100, 2)
        ELSE 0 
    END as efficiency_percentage
    
FROM design_submissions ds
LEFT JOIN user_profiles up ON ds.assigned_designer = up.id
WHERE ds.is_deleted = FALSE
GROUP BY ds.assigned_designer, up.full_name;

-- Material Consumption Analytics
CREATE OR REPLACE VIEW material_consumption_analytics AS
SELECT 
    c.id as customer_id,
    c.name as customer_name,
    mt.id as material_type_id,
    mt.name as material_type_name,
    
    -- Order Items Material Usage
    COUNT(oi.id) as total_order_items,
    SUM(oi.quantity) as total_ordered_qty,
    SUM(oi.material_allocated_qty) as total_allocated_qty,
    SUM(oi.material_consumed_qty) as total_consumed_qty,
    SUM(oi.material_wastage_qty) as total_wastage_qty,
    
    -- Efficiency Metrics
    CASE 
        WHEN SUM(oi.material_allocated_qty) > 0 THEN
            ROUND((SUM(oi.material_consumed_qty) / SUM(oi.material_allocated_qty)) * 100, 2)
        ELSE 0
    END as consumption_efficiency_pct,
    
    CASE 
        WHEN SUM(oi.material_consumed_qty) > 0 THEN
            ROUND((SUM(oi.material_wastage_qty) / SUM(oi.material_consumed_qty)) * 100, 2)
        ELSE 0
    END as wastage_percentage,
    
    -- Current stock
    ms.current_stock,
    ms.total_received,
    ms.total_delivered
    
FROM customers c
CROSS JOIN material_types mt
LEFT JOIN orders o ON c.id = o.customer_id
LEFT JOIN order_items oi ON o.id = oi.order_id AND oi.material_type = mt.id
LEFT JOIN material_stock ms ON c.id = ms.customer_id AND mt.id = ms.material_type
GROUP BY c.id, c.name, mt.id, mt.name, ms.current_stock, ms.total_received, ms.total_delivered
HAVING COUNT(oi.id) > 0
ORDER BY c.name, mt.name;

-- ====================
-- BUSINESS LOGIC FUNCTIONS
-- ====================

-- Sync order item design status with design submissions
CREATE OR REPLACE FUNCTION sync_order_item_design_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update linked order items when design status changes
    UPDATE order_items 
    SET 
        design_received = TRUE,
        design_ready = (EXISTS (
            SELECT 1 FROM design_status dst 
            WHERE dst.design_submission_id = NEW.id 
            AND dst.status = 'ready'
        )),
        updated_at = NOW()
    WHERE linked_design_id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for design status sync
DROP TRIGGER IF EXISTS tr_sync_design_status ON design_submissions;
CREATE TRIGGER tr_sync_design_status
    AFTER INSERT OR UPDATE ON design_submissions
    FOR EACH ROW
    EXECUTE FUNCTION sync_order_item_design_status();

-- Update printing readiness status
CREATE OR REPLACE FUNCTION update_printing_readiness()
RETURNS TRIGGER AS $$
BEGIN
    -- Update printing_can_start based on design_ready and production stage
    NEW.printing_can_start := (
        NEW.design_ready = TRUE AND 
        NEW.production_stage IN (
            SELECT id FROM production_stages 
            WHERE name IN ('Pre-treatment', 'Printing', 'Post Processing')
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create printing readiness trigger
DROP TRIGGER IF EXISTS tr_update_printing_readiness ON order_items;
CREATE TRIGGER tr_update_printing_readiness
    BEFORE INSERT OR UPDATE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_printing_readiness();

-- Update material consumption automatically
CREATE OR REPLACE FUNCTION update_material_consumption()
RETURNS TRIGGER AS $$
DECLARE
    production_stage_name VARCHAR;
    stage_order INTEGER;
BEGIN
    -- Get the current production stage details
    SELECT ps.name, ps.sequence_order INTO production_stage_name, stage_order
    FROM production_stages ps 
    WHERE ps.id = NEW.production_stage;
    
    -- Auto-allocate material when production starts
    IF OLD.production_stage IS DISTINCT FROM NEW.production_stage AND production_stage_name = 'Pre-treatment' THEN
        -- Allocate material equal to order quantity + 10% buffer
        NEW.material_allocated_qty := NEW.quantity * 1.1;
    END IF;
    
    -- Auto-calculate consumption when printing starts
    IF OLD.production_stage IS DISTINCT FROM NEW.production_stage AND production_stage_name = 'Printing' THEN
        -- Start consuming material
        NEW.material_consumed_qty := NEW.quantity;
    END IF;
    
    -- Calculate wastage when production completes
    IF NEW.actual_completion_date IS NOT NULL AND OLD.actual_completion_date IS NULL THEN
        NEW.material_wastage_qty := GREATEST(0, NEW.material_allocated_qty - NEW.material_consumed_qty);
        
        -- Update material stock
        UPDATE material_stock 
        SET 
            total_delivered = total_delivered + NEW.material_consumed_qty + NEW.material_wastage_qty,
            current_stock = current_stock - (NEW.material_consumed_qty + NEW.material_wastage_qty),
            updated_at = NOW()
        WHERE customer_id = (SELECT customer_id FROM orders WHERE id = NEW.order_id)
        AND material_type = NEW.material_type;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create material consumption trigger
DROP TRIGGER IF EXISTS tr_update_material_consumption ON order_items;
CREATE TRIGGER tr_update_material_consumption
    BEFORE UPDATE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_material_consumption();

-- Production stage progression validation
CREATE OR REPLACE FUNCTION validate_production_stage_progression()
RETURNS TRIGGER AS $$
DECLARE
    current_stage_order INTEGER;
    new_stage_order INTEGER;
    new_stage_name VARCHAR;
    design_record RECORD;
BEGIN
    -- Get stage orders
    SELECT sequence_order INTO current_stage_order 
    FROM production_stages WHERE id = OLD.production_stage;
    
    SELECT sequence_order, name INTO new_stage_order, new_stage_name
    FROM production_stages WHERE id = NEW.production_stage;
    
    -- Validate stage progression (can't skip stages)
    IF new_stage_order > current_stage_order + 1 THEN
        RAISE EXCEPTION 'Cannot skip production stages. Current: %, Trying to move to: %', 
                       current_stage_order, new_stage_order;
    END IF;
    
    -- Validate design readiness for printing stages
    IF new_stage_name IN ('Printing', 'Post Processing') AND NEW.linked_design_id IS NOT NULL THEN
        SELECT * INTO design_record FROM design_submissions WHERE id = NEW.linked_design_id;
        
        IF design_record.actual_ready_date IS NULL THEN
            RAISE EXCEPTION 'Cannot proceed to % stage: Design must be ready first', new_stage_name;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create stage progression trigger
DROP TRIGGER IF EXISTS tr_validate_stage_progression ON order_items;
CREATE TRIGGER tr_validate_stage_progression
    BEFORE UPDATE ON order_items
    FOR EACH ROW
    WHEN (OLD.production_stage IS DISTINCT FROM NEW.production_stage)
    EXECUTE FUNCTION validate_production_stage_progression();

-- Auto-update order item timestamps
CREATE OR REPLACE FUNCTION update_order_item_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    
    -- Set stage completion timestamp
    IF OLD.production_stage IS DISTINCT FROM NEW.production_stage THEN
        NEW.stage_completed_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create timestamp trigger
DROP TRIGGER IF EXISTS tr_order_item_timestamp ON order_items;
CREATE TRIGGER tr_order_item_timestamp
    BEFORE UPDATE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_order_item_timestamp();

-- ====================
-- DATA MIGRATION HELPERS
-- ====================

-- Function to migrate existing design data
CREATE OR REPLACE FUNCTION migrate_existing_design_data()
RETURNS TEXT AS $$
DECLARE
    migration_count INTEGER := 0;
BEGIN
    -- Link existing order items to design submissions where possible
    UPDATE order_items oi
    SET linked_design_id = ds.id,
        design_received = TRUE,
        design_ready = (ds.actual_ready_date IS NOT NULL)
    FROM design_submissions ds
    JOIN orders o ON ds.order_id = o.id
    WHERE oi.order_id = o.id
    AND oi.linked_design_id IS NULL
    AND ds.order_id IS NOT NULL;
    
    GET DIAGNOSTICS migration_count = ROW_COUNT;
    
    RETURN format('Successfully linked %s order items to design submissions', migration_count);
END;
$$ LANGUAGE plpgsql;

-- ====================
-- PERFORMANCE INDEXES
-- ====================

-- Order Items Enhancement Indexes
CREATE INDEX IF NOT EXISTS idx_order_items_linked_design ON order_items(linked_design_id) WHERE linked_design_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_items_design_ready ON order_items(design_ready) WHERE design_ready = TRUE;
CREATE INDEX IF NOT EXISTS idx_order_items_printing_ready ON order_items(printing_can_start) WHERE printing_can_start = TRUE;
CREATE INDEX IF NOT EXISTS idx_order_items_completion ON order_items(actual_completion_date) WHERE actual_completion_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_items_material_allocated ON order_items(material_allocated_qty) WHERE material_allocated_qty > 0;

-- Challan Items Indexes
CREATE INDEX IF NOT EXISTS idx_challan_items_design ON challan_items(design_id) WHERE design_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_challan_items_batch ON challan_items(production_batch) WHERE production_batch IS NOT NULL;

SELECT 'Migration 09 completed successfully with corrected data types!' as result;