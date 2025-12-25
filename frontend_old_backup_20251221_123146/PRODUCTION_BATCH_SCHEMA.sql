-- Production Batches Table Schema
-- This implements the Production-Batch centric architecture for multi-delivery orders

CREATE TABLE IF NOT EXISTS production_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_batch_number VARCHAR(50) UNIQUE NOT NULL,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,

    -- Production Details
    material_type VARCHAR(50) NOT NULL CHECK (material_type IN ('saree', 'dupatta', 'voni', 'running_material', 'blouse_material')),
    planned_quantity INTEGER NOT NULL CHECK (planned_quantity > 0),
    actual_quantity INTEGER CHECK (actual_quantity >= 0),

    -- Design Information
    design_status VARCHAR(50) NOT NULL DEFAULT 'pending_from_customer'
        CHECK (design_status IN ('pending_from_customer', 'design_received_from_customer', 'design_ready')),
    design_file_url TEXT,
    design_notes TEXT,

    -- Production Workflow Status
    production_status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (production_status IN ('pending', 'pre_treatment', 'printing', 'post_process', 'completed')),
    batch_status VARCHAR(50) NOT NULL DEFAULT 'planned'
        CHECK (batch_status IN ('planned', 'in_progress', 'completed', 'delivered', 'cancelled')),

    -- Stage Completion Tracking
    pre_treatment_started_at TIMESTAMP WITH TIME ZONE,
    pre_treatment_completed_at TIMESTAMP WITH TIME ZONE,
    pre_treatment_completed_by UUID REFERENCES auth.users(id),

    printing_started_at TIMESTAMP WITH TIME ZONE,
    printing_completed_at TIMESTAMP WITH TIME ZONE,
    printing_completed_by UUID REFERENCES auth.users(id),

    post_process_started_at TIMESTAMP WITH TIME ZONE,
    post_process_completed_at TIMESTAMP WITH TIME ZONE,
    post_process_completed_by UUID REFERENCES auth.users(id),

    -- Batch Management
    priority VARCHAR(20) NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    planned_start_date DATE NOT NULL,
    planned_completion_date DATE,
    actual_start_date DATE,
    actual_completion_date DATE,

    -- Quality & Notes
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    production_notes TEXT,
    issues_encountered TEXT,

    -- Delivery Tracking
    delivery_challan_id UUID REFERENCES delivery_challans(id),
    delivered_quantity INTEGER CHECK (delivered_quantity >= 0),
    delivery_date DATE,

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),

    -- Constraints
    CONSTRAINT valid_actual_quantity CHECK (actual_quantity IS NULL OR actual_quantity <= planned_quantity),
    CONSTRAINT valid_delivered_quantity CHECK (delivered_quantity IS NULL OR delivered_quantity <= COALESCE(actual_quantity, planned_quantity)),
    CONSTRAINT valid_completion_dates CHECK (actual_completion_date IS NULL OR actual_completion_date >= actual_start_date),
    CONSTRAINT valid_planned_dates CHECK (planned_completion_date IS NULL OR planned_completion_date >= planned_start_date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_production_batches_order_id ON production_batches(order_id);
CREATE INDEX IF NOT EXISTS idx_production_batches_order_item_id ON production_batches(order_item_id);
CREATE INDEX IF NOT EXISTS idx_production_batches_production_status ON production_batches(production_status);
CREATE INDEX IF NOT EXISTS idx_production_batches_batch_status ON production_batches(batch_status);
CREATE INDEX IF NOT EXISTS idx_production_batches_design_status ON production_batches(design_status);
CREATE INDEX IF NOT EXISTS idx_production_batches_priority ON production_batches(priority);
CREATE INDEX IF NOT EXISTS idx_production_batches_planned_start_date ON production_batches(planned_start_date);
CREATE INDEX IF NOT EXISTS idx_production_batches_delivery_challan_id ON production_batches(delivery_challan_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_production_batch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_production_batch_updated_at
    BEFORE UPDATE ON production_batches
    FOR EACH ROW
    EXECUTE FUNCTION update_production_batch_updated_at();

-- Add RLS (Row Level Security) policies
ALTER TABLE production_batches ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to see all production batches
CREATE POLICY "production_batches_select_policy" ON production_batches
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy for authenticated users to insert production batches
CREATE POLICY "production_batches_insert_policy" ON production_batches
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy for authenticated users to update production batches
CREATE POLICY "production_batches_update_policy" ON production_batches
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy for authenticated users to delete production batches
CREATE POLICY "production_batches_delete_policy" ON production_batches
    FOR DELETE USING (auth.role() = 'authenticated');

-- Function to calculate order status based on production batches
CREATE OR REPLACE FUNCTION calculate_order_status_from_batches(order_id_param UUID)
RETURNS TEXT AS $$
DECLARE
    total_order_quantity INTEGER;
    total_planned_quantity INTEGER;
    total_delivered_quantity INTEGER;
    batch_count INTEGER;
BEGIN
    -- Get total order quantity for all items
    SELECT COALESCE(SUM(quantity), 0) INTO total_order_quantity
    FROM order_items
    WHERE order_id = order_id_param;

    -- Get production batch statistics
    SELECT
        COUNT(*),
        COALESCE(SUM(planned_quantity), 0),
        COALESCE(SUM(delivered_quantity), 0)
    INTO batch_count, total_planned_quantity, total_delivered_quantity
    FROM production_batches
    WHERE order_id = order_id_param AND batch_status != 'cancelled';

    -- Determine status based on batch progress
    IF batch_count = 0 THEN
        RETURN 'pending';
    ELSIF total_delivered_quantity = 0 THEN
        RETURN 'in_progress';
    ELSIF total_delivered_quantity < total_planned_quantity THEN
        RETURN 'partially_delivered';
    ELSIF total_delivered_quantity >= total_order_quantity THEN
        RETURN 'completed';
    ELSE
        RETURN 'in_progress';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get production batch summary for an order
CREATE OR REPLACE FUNCTION get_order_production_summary(order_id_param UUID)
RETURNS TABLE (
    order_id UUID,
    total_order_quantity INTEGER,
    total_planned_quantity INTEGER,
    total_actual_quantity INTEGER,
    total_delivered_quantity INTEGER,
    batch_count INTEGER,
    completed_batches INTEGER,
    delivered_batches INTEGER,
    calculated_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        order_id_param,
        COALESCE((SELECT SUM(quantity) FROM order_items WHERE order_id = order_id_param), 0)::INTEGER,
        COALESCE(SUM(pb.planned_quantity), 0)::INTEGER,
        COALESCE(SUM(pb.actual_quantity), 0)::INTEGER,
        COALESCE(SUM(pb.delivered_quantity), 0)::INTEGER,
        COUNT(*)::INTEGER,
        COUNT(CASE WHEN pb.batch_status = 'completed' THEN 1 END)::INTEGER,
        COUNT(CASE WHEN pb.batch_status = 'delivered' THEN 1 END)::INTEGER,
        calculate_order_status_from_batches(order_id_param)
    FROM production_batches pb
    WHERE pb.order_id = order_id_param AND pb.batch_status != 'cancelled'
    GROUP BY order_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update order status when batch status changes
CREATE OR REPLACE FUNCTION update_order_status_on_batch_change()
RETURNS TRIGGER AS $$
DECLARE
    new_order_status TEXT;
BEGIN
    -- Calculate new order status based on production batches
    SELECT calculate_order_status_from_batches(NEW.order_id) INTO new_order_status;

    -- Update the order status (VARCHAR field, no enum casting needed)
    UPDATE orders
    SET
        status = new_order_status,
        updated_at = NOW()
    WHERE id = NEW.order_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update order status when batch status changes
CREATE TRIGGER trigger_update_order_status_on_batch_change
    AFTER INSERT OR UPDATE OF batch_status, delivered_quantity ON production_batches
    FOR EACH ROW
    EXECUTE FUNCTION update_order_status_on_batch_change();

-- Update order status handling (compatible with VARCHAR status field)
-- Note: Based on analysis, orders.status appears to be VARCHAR, not enum
-- This is safer and more flexible than enum constraints

-- Add a comment explaining the expected status values
COMMENT ON COLUMN orders.status IS 'Order status: pending, in_progress, completed, cancelled, partially_delivered, in_production';

-- Add sample data function for testing
CREATE OR REPLACE FUNCTION create_sample_production_batches()
RETURNS VOID AS $$
DECLARE
    sample_order_id UUID;
    sample_order_item_id UUID;
BEGIN
    -- This function will be used for testing
    -- Implementation will be added during testing phase
    RAISE NOTICE 'Sample production batch creation function ready';
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE production_batches IS 'Production batches enable splitting orders into multiple production runs and deliveries. Each batch has its own complete lifecycle from design to delivery.';
COMMENT ON COLUMN production_batches.production_batch_number IS 'Human-readable batch identifier (e.g., PB-2024-001)';
COMMENT ON COLUMN production_batches.planned_quantity IS 'Number of units planned for production in this batch';
COMMENT ON COLUMN production_batches.actual_quantity IS 'Actual number of units produced (may differ from planned)';
COMMENT ON COLUMN production_batches.batch_status IS 'Overall batch status: planned → in_progress → completed → delivered';
COMMENT ON COLUMN production_batches.production_status IS 'Production stage: pending → pre_treatment → printing → post_process → completed';
COMMENT ON COLUMN production_batches.design_status IS 'Design workflow: pending_from_customer → design_received_from_customer → design_ready';