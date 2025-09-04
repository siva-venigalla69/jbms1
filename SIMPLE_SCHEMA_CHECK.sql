-- SIMPLE SCHEMA CHECK - Returns actual result sets
-- Run these one by one to see the output

-- 1. Check ALL columns in order_items table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'order_items' 
ORDER BY ordinal_position;