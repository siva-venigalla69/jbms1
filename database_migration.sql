
-- JBMS Database Migration Script
-- Run this on the production database after deployment

-- Add customer_id to material_in table
ALTER TABLE material_in ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

-- Add customer_id to material_out table  
ALTER TABLE material_out ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

-- Update existing material_in records to link customer_id from orders
UPDATE material_in 
SET customer_id = orders.customer_id 
FROM orders 
WHERE material_in.order_id = orders.id 
AND material_in.customer_id IS NULL;

-- Update existing material_out records to link customer_id from challans
UPDATE material_out 
SET customer_id = delivery_challans.customer_id 
FROM delivery_challans 
WHERE material_out.challan_id = delivery_challans.id 
AND material_out.customer_id IS NULL;

-- Verify the changes
SELECT 'material_in' as table_name, COUNT(*) as records_with_customer_id 
FROM material_in WHERE customer_id IS NOT NULL
UNION ALL
SELECT 'material_out' as table_name, COUNT(*) as records_with_customer_id 
FROM material_out WHERE customer_id IS NOT NULL;
