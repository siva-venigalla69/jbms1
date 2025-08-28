-- CRITICAL SCHEMA MIGRATION FIX - SAFE VERSION
-- This script fixes the schema mismatches causing 500 errors
-- Can be run in parts if there are transaction issues

-- Part 1: Handle transaction state and create missing enum
-- Run this first if you get transaction errors
ROLLBACK;
BEGIN;

-- Create missing enum type
CREATE TYPE adjustment_type AS ENUM ('quantity_change', 'reason');

COMMIT;

-- Part 2: Fix order_items table structure
BEGIN;

-- Remove old conflicting columns and add correct ones
ALTER TABLE jbms_db.public.order_items DROP COLUMN IF EXISTS current_stage;
ALTER TABLE jbms_db.public.order_items DROP COLUMN IF EXISTS pre_treatment_completed_at;
ALTER TABLE jbms_db.public.order_items DROP COLUMN IF EXISTS printing_completed_at;
ALTER TABLE jbms_db.public.order_items DROP COLUMN IF EXISTS post_process_completed_at;
ALTER TABLE jbms_db.public.order_items DROP COLUMN IF EXISTS pre_treatment_completed_by;
ALTER TABLE jbms_db.public.order_items DROP COLUMN IF EXISTS printing_completed_by;
ALTER TABLE jbms_db.public.order_items DROP COLUMN IF EXISTS post_process_completed_by;

-- Add correct production stage columns
ALTER TABLE jbms_db.public.order_items ADD COLUMN IF NOT EXISTS production_stage production_stage DEFAULT 'pre_treatment';
ALTER TABLE jbms_db.public.order_items ADD COLUMN IF NOT EXISTS stage_completed_at TIMESTAMP WITH TIME ZONE;

COMMIT;

-- Part 3: Fix material_in table
BEGIN;

-- Ensure material_in has customer_id (as per functional requirements)
ALTER TABLE jbms_db.public.material_in ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES jbms_db.public.customers(id);

COMMIT;

-- Part 4: Fix delivery_challans structure
BEGIN;

ALTER TABLE jbms_db.public.delivery_challans DROP COLUMN IF EXISTS delivery_status;
ALTER TABLE jbms_db.public.delivery_challans ADD COLUMN IF NOT EXISTS is_delivered BOOLEAN DEFAULT false;
ALTER TABLE jbms_db.public.delivery_challans ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

COMMIT;

-- Part 5: Add missing fields to existing tables
BEGIN;

ALTER TABLE jbms_db.public.material_out ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'pieces';
ALTER TABLE jbms_db.public.material_out ADD COLUMN IF NOT EXISTS notes TEXT;

-- Ensure all tables have proper audit fields
ALTER TABLE jbms_db.public.gst_invoices ADD COLUMN IF NOT EXISTS updated_by_user_id UUID REFERENCES jbms_db.public.users(id);
ALTER TABLE jbms_db.public.payments ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

COMMIT;

-- Part 6: Fix inventory table for supplier fields
BEGIN;

ALTER TABLE jbms_db.public.inventory DROP COLUMN IF EXISTS supplier_info;
ALTER TABLE jbms_db.public.inventory ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(100);
ALTER TABLE jbms_db.public.inventory ADD COLUMN IF NOT EXISTS supplier_contact VARCHAR(100);

COMMIT;

-- Part 7: Add inventory_adjustments table
BEGIN;

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

COMMIT;

-- Part 8: Fix expenses table
BEGIN;

ALTER TABLE jbms_db.public.expenses DROP COLUMN IF EXISTS receipt_number;
ALTER TABLE jbms_db.public.expenses ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100);

COMMIT;

-- Part 9: Update existing data to fix any NULL issues
BEGIN;

UPDATE jbms_db.public.order_items SET production_stage = 'pre_treatment' WHERE production_stage IS NULL;
UPDATE jbms_db.public.material_in SET unit = 'pieces' WHERE unit IS NULL;
UPDATE jbms_db.public.material_out SET unit = 'pieces' WHERE unit IS NULL;

COMMIT;

-- Part 10: Add missing indexes for performance
BEGIN;

CREATE INDEX IF NOT EXISTS idx_material_in_customer_id ON jbms_db.public.material_in(customer_id);
CREATE INDEX IF NOT EXISTS idx_material_out_customer_id ON jbms_db.public.material_out(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_production_stage ON jbms_db.public.order_items(production_stage);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_inventory_id ON jbms_db.public.inventory_adjustments(inventory_id);

COMMIT;

-- Part 11: Update triggers
BEGIN;

DROP TRIGGER IF EXISTS update_order_items_updated_at ON jbms_db.public.order_items;
CREATE TRIGGER update_order_items_updated_at 
    BEFORE UPDATE ON jbms_db.public.order_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- Part 12: Fix constraints
BEGIN;

ALTER TABLE jbms_db.public.order_items DROP CONSTRAINT IF EXISTS chk_order_items_quantity_positive;
ALTER TABLE jbms_db.public.order_items ADD CONSTRAINT chk_order_items_quantity_positive CHECK (quantity > 0);

ALTER TABLE jbms_db.public.order_items DROP CONSTRAINT IF EXISTS chk_order_items_unit_price_non_negative;
ALTER TABLE jbms_db.public.order_items ADD CONSTRAINT chk_order_items_unit_price_non_negative CHECK (unit_price >= 0);

COMMIT;

-- Part 13: Create views
BEGIN;

CREATE OR REPLACE VIEW jbms_db.public.v_pending_orders AS
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

COMMIT;

-- Final: Update table statistics
ANALYZE; 