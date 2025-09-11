-- TEST SCRIPT TO VERIFY FIXES
-- Run this to test if the database functions work

-- 1. Test if the API functions exist
SELECT 
    proname as function_name,
    'Available' as status
FROM pg_proc 
WHERE proname IN (
    'get_available_challans_for_invoice',
    'generate_invoice_from_challans', 
    'perform_quality_check',
    'get_qc_dashboard'
);

-- 2. Test if required columns exist in order_items
SELECT 
    column_name,
    data_type,
    'Available' as status
FROM information_schema.columns 
WHERE table_name = 'order_items' 
AND column_name IN (
    'design_status', 'production_status', 'qc_pass_status',
    'quality_checked_by', 'quality_check_date', 'qc_notes'
);

-- 3. Test if invoice-related columns exist
SELECT 
    table_name,
    column_name,
    'Available' as status
FROM information_schema.columns 
WHERE (table_name = 'delivery_challans' AND column_name IN ('is_invoiced', 'invoice_id'))
   OR (table_name = 'gst_invoices' AND column_name IN ('invoice_status', 'revision_number'));

-- 4. Check if we have delivered challans that can be invoiced
SELECT 
    COUNT(*) as available_for_invoice,
    'Challans ready for invoicing' as description
FROM delivery_challans 
WHERE delivery_status = 'delivered' 
AND COALESCE(is_invoiced, false) = false 
AND COALESCE(is_deleted, false) = false;

-- 5. Sample query to test the corrected challan items query
SELECT 
    'challan_items_query_test' as test_name,
    COUNT(*) as total_items
FROM challan_items ci
JOIN order_items oi ON ci.order_item_id = oi.id
WHERE oi.design_status IS NOT NULL
  AND oi.production_status IS NOT NULL;