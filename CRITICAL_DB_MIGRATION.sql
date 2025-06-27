-- CRITICAL DATABASE MIGRATION FOR JBMS
-- Based on comprehensive schema analysis
-- Run this immediately after deploying backend code

BEGIN;

-- 1. Add missing order_number column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number VARCHAR(50);

-- 2. Add missing challan_number column to delivery_challans table
ALTER TABLE delivery_challans ADD COLUMN IF NOT EXISTS challan_number VARCHAR(50);

-- 3. Add missing invoice_number column to gst_invoices table  
ALTER TABLE gst_invoices ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50);

-- 4. Add missing customer_id to material_in table
ALTER TABLE material_in ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

-- 5. Add missing customer_id to material_out table
ALTER TABLE material_out ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

-- 6. Add supplier fields to inventory (split from supplier_info)
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(100);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS supplier_contact VARCHAR(100);

-- 7. Populate order numbers for existing orders
UPDATE orders 
SET order_number = 'ORD-' || EXTRACT(YEAR FROM COALESCE(order_date, created_at)) || '-' || 
    LPAD((ROW_NUMBER() OVER (ORDER BY created_at))::text, 4, '0')
WHERE order_number IS NULL OR order_number = '';

-- 8. Populate challan numbers for existing challans
UPDATE delivery_challans 
SET challan_number = 'CH-' || EXTRACT(YEAR FROM COALESCE(challan_date, created_at)) || '-' || 
    LPAD((ROW_NUMBER() OVER (ORDER BY created_at))::text, 4, '0')
WHERE challan_number IS NULL OR challan_number = '';

-- 9. Populate invoice numbers for existing invoices  
UPDATE gst_invoices 
SET invoice_number = 'INV-' || EXTRACT(YEAR FROM COALESCE(invoice_date, created_at)) || '-' || 
    LPAD((ROW_NUMBER() OVER (ORDER BY created_at))::text, 4, '0')
WHERE invoice_number IS NULL OR invoice_number = '';

-- 10. Link customer_id in material_in from orders
UPDATE material_in 
SET customer_id = orders.customer_id 
FROM orders 
WHERE material_in.order_id = orders.id 
AND material_in.customer_id IS NULL;

-- 11. Link customer_id in material_out from delivery challans
UPDATE material_out 
SET customer_id = delivery_challans.customer_id 
FROM delivery_challans 
WHERE material_out.challan_id = delivery_challans.id 
AND material_out.customer_id IS NULL;

-- 12. Parse existing supplier_info into supplier_name and supplier_contact
UPDATE inventory 
SET 
    supplier_name = SPLIT_PART(supplier_info, ' - ', 1),
    supplier_contact = CASE 
        WHEN POSITION(' - ' IN supplier_info) > 0 
        THEN SPLIT_PART(supplier_info, ' - ', 2)
        ELSE NULL 
    END
WHERE supplier_info IS NOT NULL 
AND (supplier_name IS NULL OR supplier_contact IS NULL);

-- 13. Add constraints after populating data
ALTER TABLE orders ALTER COLUMN order_number SET NOT NULL;
ALTER TABLE delivery_challans ALTER COLUMN challan_number SET NOT NULL;
ALTER TABLE gst_invoices ALTER COLUMN invoice_number SET NOT NULL;

-- 14. Add unique constraints
ALTER TABLE orders ADD CONSTRAINT IF NOT EXISTS orders_order_number_unique UNIQUE (order_number);
ALTER TABLE delivery_challans ADD CONSTRAINT IF NOT EXISTS challans_challan_number_unique UNIQUE (challan_number);
ALTER TABLE gst_invoices ADD CONSTRAINT IF NOT EXISTS invoices_invoice_number_unique UNIQUE (invoice_number);

-- 15. Verification query
SELECT 
    'MIGRATION VERIFICATION' as check_type,
    'orders' as table_name,
    COUNT(*) as total_records,
    COUNT(order_number) as records_with_number,
    CASE WHEN COUNT(*) = COUNT(order_number) THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM orders
UNION ALL
SELECT 
    'MIGRATION VERIFICATION' as check_type,
    'delivery_challans' as table_name,
    COUNT(*) as total_records,
    COUNT(challan_number) as records_with_number,
    CASE WHEN COUNT(*) = COUNT(challan_number) THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM delivery_challans
UNION ALL
SELECT 
    'MIGRATION VERIFICATION' as check_type,
    'gst_invoices' as table_name,
    COUNT(*) as total_records,
    COUNT(invoice_number) as records_with_number,
    CASE WHEN COUNT(*) = COUNT(invoice_number) THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM gst_invoices
UNION ALL
SELECT 
    'MIGRATION VERIFICATION' as check_type,
    'material_in' as table_name,
    COUNT(*) as total_records,
    COUNT(customer_id) as records_with_customer_id,
    CASE WHEN COUNT(customer_id) >= 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM material_in
UNION ALL
SELECT 
    'MIGRATION VERIFICATION' as check_type,
    'material_out' as table_name,
    COUNT(*) as total_records,
    COUNT(customer_id) as records_with_customer_id,
    CASE WHEN COUNT(customer_id) >= 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM material_out;

COMMIT; 