-- Check current table structures for missing features

-- 1. Check if orders has unique order_number
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if material_in has receipt_number
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'material_in' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check if gst_invoices has challan reference
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'gst_invoices' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check delivery_challans structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'delivery_challans' AND table_schema = 'public'
ORDER BY ordinal_position;
