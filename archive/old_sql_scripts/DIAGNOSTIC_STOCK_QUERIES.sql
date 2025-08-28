-- =====================================
-- DIAGNOSTIC QUERIES FOR STOCK CALCULATION ISSUE
-- Run these in Supabase SQL Editor to debug the -8 stock issue
-- =====================================

-- 1. CHECK CURRENT MATERIAL_STOCK TABLE DATA
SELECT 
    ms.id,
    c.name as customer_name,
    ms.material_type,
    ms.total_received,
    ms.total_delivered,
    ms.current_stock,
    ms.last_updated
FROM material_stock ms
JOIN customers c ON ms.customer_id = c.id
ORDER BY c.name, ms.material_type;

-- 2. CHECK MATERIAL_IN RECORDS (What was actually recorded)
SELECT 
    mi.id,
    c.name as customer_name,
    mi.material_type,
    mi.quantity as recorded_quantity,
    mi.received_date,
    mi.notes
FROM material_in mi
JOIN customers c ON mi.customer_id = c.id
ORDER BY mi.received_date DESC;

-- 3. CHECK DELIVERY CHALLAN ITEMS (What was delivered)
SELECT 
    dc.challan_number,
    c.name as customer_name,
    oi.material_type,
    ci.quantity as delivered_quantity,
    dc.challan_date
FROM challan_items ci
JOIN delivery_challans dc ON ci.challan_id = dc.id
JOIN customers c ON dc.customer_id = c.id
JOIN order_items oi ON ci.order_item_id = oi.id
ORDER BY dc.challan_date DESC;

-- 4. COMPARE EXPECTED vs ACTUAL STOCK
SELECT 
    c.name as customer_name,
    received.material_type,
    COALESCE(received.total_received, 0) as should_be_received,
    COALESCE(delivered.total_delivered, 0) as should_be_delivered,
    COALESCE(received.total_received, 0) - COALESCE(delivered.total_delivered, 0) as should_be_stock,
    COALESCE(ms.total_received, 0) as actual_received_in_table,
    COALESCE(ms.total_delivered, 0) as actual_delivered_in_table,
    COALESCE(ms.current_stock, 0) as actual_stock_in_table,
    -- Identify the discrepancy
    CASE 
        WHEN ms.current_stock IS NULL THEN '❌ NO STOCK RECORD'
        WHEN ms.current_stock != (COALESCE(received.total_received, 0) - COALESCE(delivered.total_delivered, 0)) THEN '⚠️ CALCULATION ERROR'
        ELSE '✅ CORRECT'
    END as status
FROM (
    -- Get total received per customer-material
    SELECT 
        mi.customer_id,
        mi.material_type,
        SUM(mi.quantity) as total_received
    FROM material_in mi
    GROUP BY mi.customer_id, mi.material_type
) received
FULL OUTER JOIN (
    -- Get total delivered per customer-material  
    SELECT 
        dc.customer_id,
        oi.material_type,
        SUM(ci.quantity) as total_delivered
    FROM challan_items ci
    JOIN delivery_challans dc ON ci.challan_id = dc.id
    JOIN order_items oi ON ci.order_item_id = oi.id
    GROUP BY dc.customer_id, oi.material_type
) delivered ON received.customer_id = delivered.customer_id 
            AND received.material_type = delivered.material_type
LEFT JOIN customers c ON COALESCE(received.customer_id, delivered.customer_id) = c.id
LEFT JOIN material_stock ms ON ms.customer_id = c.id 
                            AND ms.material_type = COALESCE(received.material_type, delivered.material_type)
ORDER BY c.name, COALESCE(received.material_type, delivered.material_type);

-- 5. CHECK IF STOCK UPDATE FUNCTIONS WERE CALLED INCORRECTLY
-- Look for any patterns that might explain negative stock
SELECT 
    'PROBLEM ANALYSIS:' as analysis,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM material_stock 
            WHERE current_stock < 0
        ) THEN '❌ NEGATIVE STOCK EXISTS'
        ELSE '✅ NO NEGATIVE STOCK'
    END as negative_stock_check,
    
    CASE
        WHEN EXISTS (
            SELECT 1 FROM material_stock ms
            WHERE ms.total_received = 0 AND ms.total_delivered > 0
        ) THEN '❌ DELIVERIES WITHOUT RECEIPTS'
        ELSE '✅ DELIVERIES MATCH RECEIPTS'
    END as receipt_delivery_balance,
    
    CASE
        WHEN EXISTS (
            SELECT 1 FROM material_stock ms
            WHERE ms.current_stock != (ms.total_received - ms.total_delivered)
        ) THEN '❌ STOCK CALCULATION ERROR'
        ELSE '✅ STOCK CALCULATION CORRECT'
    END as calculation_check;

-- 6. CHECK RECENT ACTIVITY LOGS (if audit trail exists)
-- This might show what operations were performed
SELECT 
    'RECENT STOCK CHANGES:' as info,
    COUNT(*) as total_stock_records,
    MIN(last_updated) as oldest_update,
    MAX(last_updated) as newest_update
FROM material_stock;

-- 7. DETAILED BREAKDOWN FOR DEBUGGING
SELECT 
    'DETAILED BREAKDOWN FOR EACH CUSTOMER:' as section,
    c.name as customer,
    
    -- Material In Summary
    (SELECT COUNT(*) FROM material_in mi WHERE mi.customer_id = c.id) as material_in_entries,
    (SELECT COALESCE(SUM(quantity), 0) FROM material_in mi WHERE mi.customer_id = c.id) as total_materials_received,
    
    -- Delivery Summary  
    (SELECT COUNT(*) FROM challan_items ci 
     JOIN delivery_challans dc ON ci.challan_id = dc.id 
     WHERE dc.customer_id = c.id) as delivery_entries,
    
    -- Stock Table Summary
    (SELECT COUNT(*) FROM material_stock ms WHERE ms.customer_id = c.id) as stock_table_entries,
    (SELECT COALESCE(SUM(total_received), 0) FROM material_stock ms WHERE ms.customer_id = c.id) as stock_table_received,
    (SELECT COALESCE(SUM(total_delivered), 0) FROM material_stock ms WHERE ms.customer_id = c.id) as stock_table_delivered,
    (SELECT COALESCE(SUM(current_stock), 0) FROM material_stock ms WHERE ms.customer_id = c.id) as stock_table_current

FROM customers c
WHERE EXISTS (
    SELECT 1 FROM material_in mi WHERE mi.customer_id = c.id
    UNION
    SELECT 1 FROM material_stock ms WHERE ms.customer_id = c.id
)
ORDER BY c.name;

-- 8. CHECK FOR DUPLICATE STOCK ENTRIES
SELECT 
    customer_id,
    material_type,
    COUNT(*) as duplicate_count,
    string_agg(id::text, ', ') as duplicate_ids
FROM material_stock
GROUP BY customer_id, material_type
HAVING COUNT(*) > 1;