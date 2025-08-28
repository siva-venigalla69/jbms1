-- CORRECTED SCHEMA MIGRATION - Based on Exact Schema Diagram
-- This script aligns the database with the provided schema diagram
-- Run against jbms_db database

-- Step 1: Handle any aborted transactions
ROLLBACK;

-- Step 2: Create missing enum types (without schema prefix in CREATE TYPE)
BEGIN;

-- Create adjustment_type enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'adjustment_type') THEN
        CREATE TYPE adjustment_type AS ENUM ('quantity_change', 'reason');
    END IF;
END $$;

COMMIT;

-- Step 3: Main schema migration
BEGIN;

-- Fix order_items table to match schema diagram
-- Remove old production stage columns that don't match diagram
ALTER TABLE jbms_db.public.order_items DROP COLUMN IF EXISTS current_stage;
ALTER TABLE jbms_db.public.order_items DROP COLUMN IF EXISTS pre_treatment_completed_at;
ALTER TABLE jbms_db.public.order_items DROP COLUMN IF EXISTS printing_completed_at;
ALTER TABLE jbms_db.public.order_items DROP COLUMN IF EXISTS post_process_completed_at;
ALTER TABLE jbms_db.public.order_items DROP COLUMN IF EXISTS pre_treatment_completed_by;
ALTER TABLE jbms_db.public.order_items DROP COLUMN IF EXISTS printing_completed_by;
ALTER TABLE jbms_db.public.order_items DROP COLUMN IF EXISTS post_process_completed_by;

-- Add columns as shown in schema diagram
ALTER TABLE jbms_db.public.order_items ADD COLUMN IF NOT EXISTS production_stage production_stage DEFAULT 'pre_treatment';
ALTER TABLE jbms_db.public.order_items ADD COLUMN IF NOT EXISTS stage_completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE jbms_db.public.order_items ADD COLUMN IF NOT EXISTS updated_by_user_id UUID REFERENCES jbms_db.public.users(id);

-- Fix material_in table - add customer_id as shown in schema
ALTER TABLE jbms_db.public.material_in ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES jbms_db.public.customers(id);

-- Fix material_out table - add missing columns from schema
ALTER TABLE jbms_db.public.material_out ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES jbms_db.public.customers(id);
ALTER TABLE jbms_db.public.material_out ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'pieces';
ALTER TABLE jbms_db.public.material_out ADD COLUMN IF NOT EXISTS notes TEXT;

-- Fix delivery_challans structure to match schema
ALTER TABLE jbms_db.public.delivery_challans DROP COLUMN IF EXISTS delivery_status;
ALTER TABLE jbms_db.public.delivery_challans ADD COLUMN IF NOT EXISTS is_delivered BOOLEAN DEFAULT false;
ALTER TABLE jbms_db.public.delivery_challans ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- Fix inventory table - split supplier_info into separate columns as shown in schema
ALTER TABLE jbms_db.public.inventory DROP COLUMN IF EXISTS supplier_info;
ALTER TABLE jbms_db.public.inventory ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(100);
ALTER TABLE jbms_db.public.inventory ADD COLUMN IF NOT EXISTS supplier_contact VARCHAR(100);

-- Fix expenses table - rename receipt_number to reference_number as in schema
ALTER TABLE jbms_db.public.expenses DROP COLUMN IF EXISTS receipt_number;
ALTER TABLE jbms_db.public.expenses ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100);

-- Fix gst_invoices - add missing audit column
ALTER TABLE jbms_db.public.gst_invoices ADD COLUMN IF NOT EXISTS updated_by_user_id UUID REFERENCES jbms_db.public.users(id);

-- Fix payments table - add is_deleted column
ALTER TABLE jbms_db.public.payments ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Create inventory_adjustments table as shown in schema diagram
CREATE TABLE IF NOT EXISTS jbms_db.public.inventory_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_id UUID NOT NULL REFERENCES jbms_db.public.inventory(id),
    adjustment_type adjustment_type NOT NULL,
    quantity_change DECIMAL(10,2) NOT NULL,
    reason TEXT,
    notes TEXT,
    adjustment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id UUID REFERENCES jbms_db.public.users(id)
);

-- Update any NULL values to prevent constraint violations
UPDATE jbms_db.public.order_items SET production_stage = 'pre_treatment' WHERE production_stage IS NULL;
UPDATE jbms_db.public.material_in SET unit = 'pieces' WHERE unit IS NULL;
UPDATE jbms_db.public.material_out SET unit = 'pieces' WHERE unit IS NULL;

-- Create essential indexes for performance
CREATE INDEX IF NOT EXISTS idx_material_in_customer_id ON jbms_db.public.material_in(customer_id);
CREATE INDEX IF NOT EXISTS idx_material_out_customer_id ON jbms_db.public.material_out(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_production_stage ON jbms_db.public.order_items(production_stage);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_inventory_id ON jbms_db.public.inventory_adjustments(inventory_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON jbms_db.public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_challans_customer_id ON jbms_db.public.delivery_challans(customer_id);

-- Recreate constraints to ensure data integrity
ALTER TABLE jbms_db.public.order_items DROP CONSTRAINT IF EXISTS chk_order_items_quantity_positive;
ALTER TABLE jbms_db.public.order_items ADD CONSTRAINT chk_order_items_quantity_positive CHECK (quantity > 0);

ALTER TABLE jbms_db.public.order_items DROP CONSTRAINT IF EXISTS chk_order_items_unit_price_non_negative;
ALTER TABLE jbms_db.public.order_items ADD CONSTRAINT chk_order_items_unit_price_non_negative CHECK (unit_price >= 0);

-- Update triggers for audit trail
DROP TRIGGER IF EXISTS update_order_items_updated_at ON jbms_db.public.order_items;
CREATE TRIGGER update_order_items_updated_at 
    BEFORE UPDATE ON jbms_db.public.order_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for pending orders (from schema diagram: v_pending_orders)
DROP VIEW IF EXISTS jbms_db.public.v_pending_orders;
CREATE VIEW jbms_db.public.v_pending_orders AS
SELECT 
    o.id,
    o.order_number,
    c.name as customer_name,
    o.order_date,
    o.status,
    COUNT(oi.id) as total_items,
    SUM(oi.quantity) as total_quantity,
    COUNT(CASE WHEN oi.production_stage = 'post_process' THEN 1 END) as post_process_items,
    o.total_amount,
    c.phone as customer_phone
FROM jbms_db.public.orders o
JOIN jbms_db.public.customers c ON o.customer_id = c.id
LEFT JOIN jbms_db.public.order_items oi ON o.id = oi.order_id AND oi.is_deleted = false
WHERE o.status IN ('pending', 'in_progress') 
    AND o.is_deleted = false
    AND c.is_deleted = false
GROUP BY o.id, o.order_number, c.name, o.order_date, o.status, o.total_amount, c.phone
ORDER BY o.order_date DESC;

-- Create view for stock items (from schema diagram: v_stock_items)
DROP VIEW IF EXISTS jbms_db.public.v_stock_items;
CREATE VIEW jbms_db.public.v_stock_items AS
SELECT 
    id,
    item_name,
    category,
    current_stock,
    unit,
    reorder_level,
    cost_per_unit,
    supplier_name,
    supplier_contact,
    CASE 
        WHEN current_stock <= reorder_level THEN true
        ELSE false
    END as is_low_stock
FROM jbms_db.public.inventory
WHERE is_active = true AND is_deleted = false
ORDER BY item_name;

-- Create view for outstanding receivables (from schema diagram: v_outstanding_receivables)
DROP VIEW IF EXISTS jbms_db.public.v_outstanding_receivables;
CREATE VIEW jbms_db.public.v_outstanding_receivables AS
SELECT 
    i.id,
    i.invoice_number,
    i.invoice_date,
    i.total_amount as final_amount,
    i.outstanding_amount,
    c.name as customer_name,
    c.phone as customer_phone,
    c.gst_number as customer_gst,
    EXTRACT(days FROM (CURRENT_DATE - i.invoice_date::date)) as days_outstanding
FROM jbms_db.public.gst_invoices i
JOIN jbms_db.public.customers c ON i.customer_id = c.id
WHERE i.outstanding_amount > 0 
    AND i.is_deleted = false 
    AND c.is_deleted = false
ORDER BY i.invoice_date DESC;

-- Create view for material flow summary (from schema diagram: v_material_flow_summary)
DROP VIEW IF EXISTS jbms_db.public.v_material_flow_summary;
CREATE VIEW jbms_db.public.v_material_flow_summary AS
SELECT 
    'IN' as flow_type,
    material_type,
    received_date as flow_date,
    quantity as total_quantity,
    notes as new_values,
    created_at as changed_at,
    'Material Received' as changed_by
FROM jbms_db.public.material_in
WHERE is_deleted = false
UNION ALL
SELECT 
    'OUT' as flow_type,
    material_type,
    dispatch_date as flow_date,
    quantity as total_quantity,
    notes as new_values,
    created_at as changed_at,
    'Material Dispatched' as changed_by
FROM jbms_db.public.material_out
WHERE is_deleted = false
ORDER BY flow_date DESC;

COMMIT;

-- Step 4: Verify schema integrity
BEGIN;

-- Update table statistics for better query performance
ANALYZE jbms_db.public.customers;
ANALYZE jbms_db.public.orders;
ANALYZE jbms_db.public.order_items;
ANALYZE jbms_db.public.material_in;
ANALYZE jbms_db.public.material_out;
ANALYZE jbms_db.public.delivery_challans;
ANALYZE jbms_db.public.inventory;
ANALYZE jbms_db.public.inventory_adjustments;
ANALYZE jbms_db.public.gst_invoices;
ANALYZE jbms_db.public.payments;
ANALYZE jbms_db.public.expenses;

COMMIT;

-- Verification queries to confirm migration success
-- Run these to verify the migration worked:

-- Check if adjustment_type enum exists
-- SELECT typname FROM pg_type WHERE typname = 'adjustment_type';

-- Check order_items structure
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name = 'order_items' 
-- ORDER BY ordinal_position;

-- Check material_in has customer_id
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name = 'material_in' AND column_name = 'customer_id';

-- Check inventory_adjustments table exists
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name = 'inventory_adjustments';

-- Check views were created
-- SELECT table_name FROM information_schema.views 
-- WHERE table_schema = 'public' AND table_name LIKE 'v_%';

PRINT 'Schema migration completed successfully. All tables should now match the schema diagram.'; 