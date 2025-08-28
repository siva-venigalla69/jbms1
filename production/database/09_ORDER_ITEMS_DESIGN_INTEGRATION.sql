-- =====================================
-- ORDER ITEMS DESIGN INTEGRATION ENHANCEMENT  
-- Migration 09: Enhance order_items table for better design workflow integration
-- Compatible with existing data - Safe backward-compatible changes
-- =====================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================
-- ENHANCE ORDER ITEMS TABLE
-- ====================

-- Add design integration columns to existing order_items table
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS linked_design_id UUID REFERENCES design_submissions(id),
ADD COLUMN IF NOT EXISTS design_received BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS design_ready BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS design_file_url TEXT,
ADD COLUMN IF NOT EXISTS design_notes TEXT,
ADD COLUMN IF NOT EXISTS design_received_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS printing_can_start BOOLEAN GENERATED ALWAYS AS (
    CASE 
        WHEN design_ready = TRUE AND production_stage IN (
            SELECT id FROM production_stages WHERE name IN ('Pre-treatment', 'Printing', 'Post Processing')
        ) THEN TRUE
        ELSE FALSE
    END
) STORED;

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
-- CREATE ENHANCED VIEWS
-- ====================

-- Enhanced Order Items View with Design Information
CREATE OR REPLACE VIEW order_items_with_design_info AS
SELECT 
    oi.id,
    oi.order_id,
    oi.material_type,
    oi.quantity,
    oi.unit_price,
    oi.customization_details,
    
    -- Production Information
    ps.name as current_stage_name,
    ps.sequence_order as stage_sequence,
    oi.stage_completed_at,
    oi.actual_completion_date,
    
    -- Design Information  
    d.id as design_id,
    d.design_name,
    d.design_code,
    d.status as design_status,
    d.priority_level as design_priority,
    oi.design_received,
    oi.design_ready,
    oi.design_received_date,
    d.actual_ready_date as design_ready_date,
    
    -- Material Tracking
    oi.material_allocated_qty,
    oi.material_consumed_qty,
    oi.material_wastage_qty,
    mt.name as material_type_name,
    
    -- Customer Information
    c.id as customer_id,
    c.name as customer_name,
    
    -- Order Information
    o.order_number,
    o.order_date,
    o.status as order_status,
    
    -- Production Readiness
    CASE 
        WHEN d.status = 'ready' AND ms.current_stock >= oi.quantity THEN 'ready_to_proceed'
        WHEN d.status != 'ready' THEN 'waiting_design' 
        WHEN ms.current_stock < oi.quantity THEN 'insufficient_material'
        ELSE 'unknown'
    END as production_readiness,
    
    -- Quality Information
    oi.quality_rating,
    oi.quality_notes,
    oi.production_issues,
    
    -- Stock Information
    COALESCE(ms.current_stock, 0) as available_material_stock,
    
    -- Timestamps
    oi.created_at,
    oi.updated_at

FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN customers c ON o.customer_id = c.id
LEFT JOIN design_submissions d ON oi.linked_design_id = d.id
LEFT JOIN production_stages ps ON oi.production_stage = ps.id
LEFT JOIN material_types mt ON oi.material_type = mt.id
LEFT JOIN material_stock ms ON c.id = ms.customer_id AND mt.id = ms.material_type
WHERE o.is_deleted = FALSE;

-- Production Queue View - What can be worked on today
CREATE OR REPLACE VIEW production_queue AS
SELECT 
    oi.id as order_item_id,
    oi.order_id,
    o.order_number,
    
    -- Customer Information
    c.id as customer_id,
    c.name as customer_name,
    c.phone as customer_phone,
    
    -- Design Information
    d.id as design_id,
    d.design_name,
    d.design_code,
    d.status as design_status,
    d.priority_level,
    
    -- Material Information
    mt.name as material_type_name,
    oi.quantity as required_quantity,
    COALESCE(ms.current_stock, 0) as available_stock,
    
    -- Production Stage
    ps.name as current_stage,
    ps.sequence_order,
    
    -- Readiness Assessment
    CASE 
        WHEN ps.name = 'Pre-treatment' THEN 'ready' -- Pre-treatment doesn't need design
        WHEN ps.name IN ('Printing', 'Post Processing') AND d.status = 'ready' THEN 'ready'
        WHEN ps.name IN ('Printing', 'Post Processing') AND d.status != 'ready' THEN 'blocked_design'
        WHEN COALESCE(ms.current_stock, 0) < oi.quantity THEN 'blocked_material'
        ELSE 'ready'
    END as work_status,
    
    -- Priority Calculation (lower number = higher priority)
    (
        CASE o.status 
            WHEN 'pending' THEN 1
            WHEN 'in_progress' THEN 2  
            ELSE 3
        END +
        COALESCE(d.priority_level, 3) +
        CASE 
            WHEN o.created_at < NOW() - INTERVAL '7 days' THEN -2 -- Older orders get priority boost
            WHEN o.created_at < NOW() - INTERVAL '3 days' THEN -1
            ELSE 0
        END
    ) as calculated_priority,
    
    -- Timing
    o.order_date,
    o.created_at as order_created,
    d.actual_ready_date as design_ready_date,
    oi.estimated_completion_date,
    
    -- Notes
    oi.customization_details,
    d.design_notes

FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN customers c ON o.customer_id = c.id
LEFT JOIN design_submissions d ON oi.linked_design_id = d.id
LEFT JOIN production_stages ps ON oi.production_stage = ps.id
LEFT JOIN material_types mt ON oi.material_type = mt.id  
LEFT JOIN material_stock ms ON c.id = ms.customer_id AND mt.id = ms.material_type
WHERE o.is_deleted = FALSE
AND o.status IN ('pending', 'in_progress')
AND oi.stage_completed_at IS NULL -- Not yet completed
ORDER BY calculated_priority, o.created_at;

-- Design Workload Summary
CREATE OR REPLACE VIEW design_workload_summary AS
SELECT 
    -- Design Status Counts
    COUNT(*) as total_design_submissions,
    COUNT(CASE WHEN status = 'received' THEN 1 END) as received_count,
    COUNT(CASE WHEN status = 'reviewing' THEN 1 END) as reviewing_count,
    COUNT(CASE WHEN status = 'preparing' THEN 1 END) as preparing_count,
    COUNT(CASE WHEN status = 'ready' THEN 1 END) as ready_count,
    COUNT(CASE WHEN status = 'in_production' THEN 1 END) as in_production_count,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
    
    -- Priority Breakdown
    COUNT(CASE WHEN priority_level = 1 THEN 1 END) as urgent_count,
    COUNT(CASE WHEN priority_level = 2 THEN 1 END) as high_priority_count,
    COUNT(CASE WHEN priority_level = 3 THEN 1 END) as normal_priority_count,
    
    -- Timing Analysis
    AVG(
        CASE 
            WHEN actual_ready_date IS NOT NULL AND received_date IS NOT NULL
            THEN EXTRACT(EPOCH FROM (actual_ready_date - received_date)) / 3600 -- Hours
        END
    ) as avg_preparation_hours,
    
    -- Bottleneck Identification
    COUNT(CASE WHEN status IN ('received', 'reviewing') AND received_date < NOW() - INTERVAL '3 days' THEN 1 END) as overdue_review_count,
    COUNT(CASE WHEN status = 'preparing' AND received_date < NOW() - INTERVAL '7 days' THEN 1 END) as overdue_preparation_count,
    
    -- Today's Work
    COUNT(CASE WHEN status = 'ready' AND actual_ready_date::DATE = CURRENT_DATE THEN 1 END) as design_submissions_ready_today,
    COUNT(CASE WHEN status = 'received' AND received_date::DATE = CURRENT_DATE THEN 1 END) as design_submissions_received_today

FROM design_submissions 
WHERE is_deleted = FALSE;

-- ====================
-- BUSINESS LOGIC FUNCTIONS
-- ====================

-- Function: Get production queue for a specific date and stage
CREATE OR REPLACE FUNCTION get_production_queue(
    target_date DATE DEFAULT CURRENT_DATE,
    target_stage TEXT DEFAULT NULL,
    customer_filter UUID DEFAULT NULL
)
RETURNS TABLE (
    order_item_id UUID,
    order_number VARCHAR,
    customer_name VARCHAR,
    design_name VARCHAR,
    material_type VARCHAR,
    quantity DECIMAL,
    current_stage VARCHAR,
    work_status TEXT,
    priority INTEGER,
    can_start_immediately BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pq.order_item_id,
        pq.order_number,
        pq.customer_name,
        COALESCE(pq.design_name, 'No Design'),
        pq.material_type_name,
        pq.required_quantity,
        pq.current_stage,
        pq.work_status,
        pq.calculated_priority,
        (pq.work_status = 'ready') as can_start_immediately
    FROM production_queue pq
    WHERE (target_stage IS NULL OR pq.current_stage = target_stage)
    AND (customer_filter IS NULL OR pq.customer_id = customer_filter)
    ORDER BY pq.calculated_priority, pq.order_created;
END;
$$ LANGUAGE plpgsql;

-- Function: Update production stage with business logic
CREATE OR REPLACE FUNCTION update_order_item_stage(
    item_id UUID,
    new_stage_name TEXT,
    user_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    item_record RECORD;
    stage_record RECORD;
    design_record RECORD;
    material_available BOOLEAN := FALSE;
BEGIN
    -- Get order item details
    SELECT * INTO item_record FROM order_items WHERE id = item_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order item not found';
    END IF;
    
    -- Get target production stage
    SELECT * INTO stage_record FROM production_stages WHERE name = new_stage_name;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Production stage % not found', new_stage_name;
    END IF;
    
    -- Get linked design info
    IF item_record.linked_design_id IS NOT NULL THEN
        SELECT * INTO design_record FROM design_submissions WHERE id = item_record.linked_design_id;
    END IF;
    
    -- Business Logic Validation
    IF new_stage_name IN ('Printing', 'Post Processing') THEN
        -- Printing stages require ready design
        IF design_record.status IS NULL OR design_record.status != 'ready' THEN
            RAISE EXCEPTION 'Cannot proceed to % stage: Design must be ready (current: %)', 
                new_stage_name, COALESCE(design_record.status, 'No Design');
        END IF;
    END IF;
    
    -- Check material availability
    SELECT (COALESCE(ms.current_stock, 0) >= item_record.quantity) INTO material_available
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    LEFT JOIN material_stock ms ON c.id = ms.customer_id AND item_record.material_type = ms.material_type
    WHERE o.id = item_record.order_id;
    
    IF NOT material_available THEN
        RAISE EXCEPTION 'Insufficient material stock for order item';
    END IF;
    
    -- Update the stage
    UPDATE order_items 
    SET 
        production_stage = stage_record.id,
        stage_completed_at = NOW(),
        stage_completed_by = user_id,
        updated_at = NOW()
    WHERE id = item_id;
    
    -- Log the stage change
    INSERT INTO production_stage_progress (
        order_item_id,
        design_id, 
        production_stage,
        status,
        stage_start_date,
        assigned_operator,
        updated_by
    ) VALUES (
        item_id,
        item_record.linked_design_id,
        stage_record.id,
        'completed',
        NOW(),
        user_id,
        user_id
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function: Link design to order item
CREATE OR REPLACE FUNCTION link_design_to_order_item(
    item_id UUID,
    design_id_param UUID
) RETURNS BOOLEAN AS $$
DECLARE
    item_record RECORD;
    design_record RECORD;
BEGIN
    -- Validate order item exists
    SELECT * INTO item_record FROM order_items WHERE id = item_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order item not found';
    END IF;
    
    -- Validate design exists and belongs to same customer
    SELECT d.*, c.id as customer_id INTO design_record
    FROM design_submissions d
    JOIN customers c ON d.customer_id = c.id
    JOIN orders o ON o.customer_id = c.id
    WHERE d.id = design_id_param AND o.id = item_record.order_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Design not found or does not belong to the same customer';
    END IF;
    
    -- Update the order item
    UPDATE order_items 
    SET 
        linked_design_id = design_id_param,
        design_received = (design_record.status != 'received'),
        design_ready = (design_record.status = 'ready'),
        design_received_date = design_record.received_date,
        updated_at = NOW()
    WHERE id = item_id;
    
    -- Create material requirement link if not exists
    INSERT INTO design_material_requirements (
        design_id,
        customer_id,
        material_type,
        required_quantity,
        status
    ) VALUES (
        design_id_param,
        design_record.customer_id,
        item_record.material_type,
        item_record.quantity,
        'planned'
    ) ON CONFLICT DO NOTHING;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ====================
-- TRIGGERS FOR INTEGRATION
-- ====================

-- Trigger: Sync design status with order item flags
CREATE OR REPLACE FUNCTION sync_order_item_design_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update linked order items when design status changes
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        UPDATE order_items 
        SET 
            design_received = (NEW.status != 'received'),
            design_ready = (NEW.status = 'ready'),
            updated_at = NOW()
        WHERE linked_design_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_order_item_design_status
    AFTER UPDATE ON design_submissions
    FOR EACH ROW
    EXECUTE FUNCTION sync_order_item_design_status();

-- Trigger: Update material stock when order item stage changes
CREATE OR REPLACE FUNCTION update_material_consumption()
RETURNS TRIGGER AS $$
DECLARE
    customer_id UUID;
    consumption_qty DECIMAL;
BEGIN
    -- Only process when moving to 'completed' stages
    IF NEW.production_stage IS DISTINCT FROM OLD.production_stage THEN
        -- Get customer ID
        SELECT o.customer_id INTO customer_id
        FROM orders o 
        WHERE o.id = NEW.order_id;
        
        -- Check if this is a completion stage
        IF EXISTS (
            SELECT 1 FROM production_stages ps 
            WHERE ps.id = NEW.production_stage 
            AND ps.name IN ('Quality Check', 'Packing', 'Completed')
        ) THEN
            -- Calculate consumption (add some wastage)
            consumption_qty := NEW.quantity * 1.05; -- 5% wastage assumption
            
            -- Update material stock
            UPDATE material_stock 
            SET 
                total_delivered = total_delivered + consumption_qty,
                current_stock = current_stock - consumption_qty,
                last_updated = NOW()
            WHERE customer_id = customer_id 
            AND material_type = NEW.material_type;
            
            -- Update order item consumption tracking
            UPDATE order_items 
            SET 
                material_consumed_qty = NEW.quantity,
                material_wastage_qty = consumption_qty - NEW.quantity,
                actual_completion_date = NOW()
            WHERE id = NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_material_consumption
    AFTER UPDATE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_material_consumption();

-- ====================
-- PERFORMANCE INDEXES
-- ====================

-- Order Items Design Integration Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_linked_design ON order_items(linked_design_id) WHERE linked_design_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_design_ready ON order_items(design_ready, production_stage) WHERE design_ready = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_completion ON order_items(actual_completion_date) WHERE actual_completion_date IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_material_consumption ON order_items(material_type, material_consumed_qty);

-- Challan Items Design Integration
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_challan_items_design ON challan_items(design_id) WHERE design_id IS NOT NULL;

-- ====================
-- DATA MIGRATION HELPER
-- ====================

-- Function to migrate existing order items design data
CREATE OR REPLACE FUNCTION migrate_existing_design_data()
RETURNS TEXT AS $$
DECLARE
    updated_count INTEGER := 0;
    item_record RECORD;
BEGIN
    -- Update existing order items with design information from legacy fields
    FOR item_record IN 
        SELECT id, design_received_date, design_ready_date
        FROM order_items 
        WHERE design_received_date IS NOT NULL OR design_ready_date IS NOT NULL
    LOOP
        UPDATE order_items 
        SET 
            design_received = (item_record.design_received_date IS NOT NULL),
            design_ready = (item_record.design_ready_date IS NOT NULL)
        WHERE id = item_record.id;
        
        updated_count := updated_count + 1;
    END LOOP;
    
    RETURN 'Migrated design data for ' || updated_count || ' order items';
END;
$$ LANGUAGE plpgsql;

-- Run the migration
SELECT migrate_existing_design_data();

-- ====================
-- MIGRATION VALIDATION
-- ====================

DO $$
DECLARE
    column_count INTEGER;
    required_columns TEXT[] := ARRAY[
        'linked_design_id', 'design_received', 'design_ready',
        'material_allocated_qty', 'material_consumed_qty', 'actual_completion_date'
    ];
    column_name TEXT;
BEGIN
    FOREACH column_name IN ARRAY required_columns LOOP
        SELECT COUNT(*) INTO column_count
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'order_items' 
        AND column_name = column_name;
        
        IF column_count = 0 THEN
            RAISE EXCEPTION 'Required column % was not added to order_items', column_name;
        END IF;
        
        RAISE NOTICE 'Column order_items.% added successfully', column_name;
    END LOOP;
    
    RAISE NOTICE 'Order Items Design Integration completed successfully';
END $$;

-- Migration completion log
INSERT INTO deployment_history (
    deployment_type,
    script_name,
    status,
    description
) VALUES (
    'schema_enhancement',
    '09_ORDER_ITEMS_DESIGN_INTEGRATION.sql',
    'completed',
    'Enhanced order_items table with design integration, material tracking, and production workflow improvements'
);

-- Final summary
SELECT 
    'INTEGRATION COMPLETE' as status,
    'Order Items Design Integration Enhanced' as description,
    NOW() as completed_at;