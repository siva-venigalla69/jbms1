-- Analyze actual data types in your existing database
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    CASE 
        WHEN c.column_name = 'id' THEN '🔑 PRIMARY KEY'
        WHEN c.column_name LIKE '%_id' THEN '🔗 FOREIGN KEY'
        ELSE ''
    END as key_type
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public' 
AND t.table_name IN ('production_stages', 'material_types', 'user_roles', 'order_statuses', 'payment_methods')
AND c.column_name IN ('id')
ORDER BY t.table_name, c.ordinal_position;

-- Check foreign key references
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    c.data_type as local_type,
    fc.data_type as foreign_type,
    CASE 
        WHEN c.data_type = fc.data_type THEN '✅ MATCH'
        ELSE '❌ TYPE MISMATCH'
    END as compatibility
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.columns c ON c.table_name = tc.table_name AND c.column_name = kcu.column_name
JOIN information_schema.columns fc ON fc.table_name = ccu.table_name AND fc.column_name = ccu.column_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
ORDER BY tc.table_name;