-- ANALYZE FABRIC_STAGE AND DESIGN_STAGE COLUMNS
-- Check if these columns exist and their current sync status

-- 1. Check if fabric_stage and design_stage columns exist
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'order_items' 
AND column_name IN ('fabric_stage', 'design_stage', 'design_status', 'production_status')
ORDER BY column_name;