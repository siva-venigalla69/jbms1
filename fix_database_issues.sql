-- FIX DATABASE ISSUES CAUSING 500 ERRORS
-- Based on debugging analysis from 2025-06-27

-- =====================================================================
-- ISSUE 1: Fix pending receivables report SQL function error
-- =====================================================================

-- The error shows: pg_catalog.extract(unknown, integer) does not exist
-- This happens when trying to EXTRACT from a non-date field
-- Let's fix the pending receivables report query

-- First, let's check what's causing the SQL error in the reports

-- =====================================================================
-- ISSUE 2: Ensure inventory_adjustments table exists
-- =====================================================================

-- Create inventory_adjustments table if it doesn't exist
-- This might be missing and causing the inventory adjustment 500 errors

DO $$
BEGIN
    -- Check if adjustment_type enum exists, if not create it
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'adjustment_type') THEN
        CREATE TYPE adjustment_type AS ENUM ('quantity_change', 'reason');
    END IF;
END $$;

-- Create inventory_adjustments table if it doesn't exist
CREATE TABLE IF NOT EXISTS inventory_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID NOT NULL REFERENCES inventory(id),
    adjustment_type adjustment_type NOT NULL,
    quantity_change DECIMAL(10,2) NOT NULL,
    reason TEXT,
    notes TEXT,
    adjustment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id UUID REFERENCES users(id)
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_inventory_id 
ON inventory_adjustments(inventory_id);

CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_date 
ON inventory_adjustments(adjustment_date);

-- =====================================================================
-- ISSUE 3: Check and fix enum values for orders
-- =====================================================================

-- Ensure all enum types exist and have correct values
DO $$
BEGIN
    -- Check if order_status enum exists
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
    END IF;
    
    -- Check if material_type enum exists  
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'material_type') THEN
        CREATE TYPE material_type AS ENUM ('saree', 'dupatta', 'voni', 'running_material', 'blouse_material');
    END IF;
    
    -- Check if production_stage enum exists
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'production_stage') THEN
        CREATE TYPE production_stage AS ENUM ('pre_treatment', 'printing', 'post_process');
    END IF;
    
    -- Check if return_reason enum exists
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'return_reason') THEN
        CREATE TYPE return_reason AS ENUM ('damaged', 'defective', 'wrong_design', 'customer_request');
    END IF;
    
    -- Check if payment_method enum exists
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE payment_method AS ENUM ('cash', 'upi', 'bank_transfer', 'cheque');
    END IF;
END $$;

-- =====================================================================
-- ISSUE 4: Ensure order number generation function exists
-- =====================================================================

-- Create or replace the order number generation function
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    order_number TEXT;
BEGIN
    -- Get the next sequence number for current year
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 10) AS INTEGER)), 0) + 1
    INTO next_number
    FROM orders
    WHERE order_number LIKE 'ORD-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-%';
    
    -- Generate the order number
    order_number := 'ORD-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(next_number::TEXT, 4, '0');
    RETURN order_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- ISSUE 5: Fix constraints that might cause order creation issues
-- =====================================================================

-- Remove potentially problematic constraints and add correct ones
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_customer_id_fkey CASCADE;
ALTER TABLE orders ADD CONSTRAINT orders_customer_id_fkey 
    FOREIGN KEY (customer_id) REFERENCES customers(id);

ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_order_id_fkey CASCADE;
ALTER TABLE order_items ADD CONSTRAINT order_items_order_id_fkey 
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

-- Ensure NOT NULL constraints are properly set
ALTER TABLE orders ALTER COLUMN customer_id SET NOT NULL;
ALTER TABLE orders ALTER COLUMN order_number SET NOT NULL;
ALTER TABLE order_items ALTER COLUMN order_id SET NOT NULL;
ALTER TABLE order_items ALTER COLUMN quantity SET NOT NULL;
ALTER TABLE order_items ALTER COLUMN unit_price SET NOT NULL;

-- Add check constraints for positive values
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS chk_order_items_quantity_positive;
ALTER TABLE order_items ADD CONSTRAINT chk_order_items_quantity_positive 
    CHECK (quantity > 0);

ALTER TABLE order_items DROP CONSTRAINT IF EXISTS chk_order_items_unit_price_non_negative;
ALTER TABLE order_items ADD CONSTRAINT chk_order_items_unit_price_non_negative 
    CHECK (unit_price >= 0);

-- =====================================================================
-- ISSUE 6: Update column types if needed
-- =====================================================================

-- Ensure UUID columns are properly typed
-- (These should already be correct, but let's verify)

-- Check if we need to update any column types
DO $$
BEGIN
    -- Update any enum columns that might be using string types
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'status' 
        AND data_type = 'character varying'
    ) THEN
        -- Convert string status to enum if needed
        ALTER TABLE orders ALTER COLUMN status DROP DEFAULT;
        ALTER TABLE orders ALTER COLUMN status TYPE order_status USING status::order_status;
        ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending'::order_status;
    END IF;
END $$;

-- =====================================================================
-- ISSUE 7: Add missing indexes for performance
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_material_type ON order_items(material_type);

-- =====================================================================
-- ISSUE 8: Create audit triggers if missing
-- =====================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to orders
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply update trigger to order_items
DROP TRIGGER IF EXISTS update_order_items_updated_at ON order_items;
CREATE TRIGGER update_order_items_updated_at 
    BEFORE UPDATE ON order_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- VERIFICATION QUERIES
-- =====================================================================

-- Check that all required tables exist
SELECT 
    'orders' as table_name,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') as exists
UNION ALL
SELECT 
    'order_items' as table_name,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items') as exists
UNION ALL
SELECT 
    'inventory_adjustments' as table_name,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_adjustments') as exists;

-- Check that all required enums exist
SELECT 
    'order_status' as enum_name,
    EXISTS(SELECT 1 FROM pg_type WHERE typname = 'order_status') as exists
UNION ALL
SELECT 
    'material_type' as enum_name,
    EXISTS(SELECT 1 FROM pg_type WHERE typname = 'material_type') as exists
UNION ALL
SELECT 
    'adjustment_type' as enum_name,
    EXISTS(SELECT 1 FROM pg_type WHERE typname = 'adjustment_type') as exists;

-- Show current table constraints
SELECT 
    table_name,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name IN ('orders', 'order_items', 'inventory_adjustments')
ORDER BY table_name, constraint_type; 