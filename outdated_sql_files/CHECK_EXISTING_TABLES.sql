-- CHECK EXISTING TABLES IN DATABASE
-- Run this to see what tables we currently have

SELECT 
    table_name,
    CASE 
        WHEN table_name LIKE '%user%' THEN '👤 USER RELATED'
        WHEN table_name LIKE '%order%' THEN '📋 ORDER RELATED'
        WHEN table_name LIKE '%customer%' THEN '🏢 CUSTOMER RELATED'
        WHEN table_name LIKE '%invoice%' THEN '💰 INVOICE RELATED'
        WHEN table_name LIKE '%challan%' THEN '📦 DELIVERY RELATED'
        ELSE '📊 OTHER'
    END as category
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY category, table_name;