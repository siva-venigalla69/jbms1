-- =====================================
-- QUICK STOCK DEBUG - Check the -8 issue
-- Run this in Supabase SQL Editor
-- =====================================

-- 1. Check what's in material_in table
SELECT 
    'MATERIAL_IN RECORDS:' as section,
    c.name as customer_name,
    mi.material_type,
    mi.quantity,
    mi.received_date
FROM material_in mi
JOIN customers c ON mi.customer_id = c.id
ORDER BY mi.received_date DESC;

-- 2. Check what's in material_stock table  
SELECT 
    'MATERIAL_STOCK TABLE:' as section,
    c.name as customer_name,
    ms.material_type,
    ms.total_received,
    ms.total_delivered,
    ms.current_stock,
    ms.last_updated
FROM material_stock ms
JOIN customers c ON ms.customer_id = c.id
ORDER BY c.name, ms.material_type;

-- 3. Check delivered items (what was taken out)
SELECT 
    'DELIVERIES:' as section,
    c.name as customer_name,
    oi.material_type,
    ci.quantity as delivered_quantity,
    dc.challan_date
FROM challan_items ci
JOIN delivery_challans dc ON ci.challan_id = dc.id
JOIN customers c ON dc.customer_id = c.id
JOIN order_items oi ON ci.order_item_id = oi.id
ORDER BY dc.challan_date DESC;

-- 4. Manual calculation check
SELECT 
    'EXPECTED CALCULATION:' as section,
    c.name as customer_name,
    COALESCE(received.material_type, delivered.material_type) as material_type,
    COALESCE(received.total_received, 0) as should_be_received,
    COALESCE(delivered.total_delivered, 0) as should_be_delivered,
    COALESCE(received.total_received, 0) - COALESCE(delivered.total_delivered, 0) as should_be_current_stock
FROM (
    -- What was actually received
    SELECT 
        mi.customer_id,
        mi.material_type,
        SUM(mi.quantity) as total_received
    FROM material_in mi
    GROUP BY mi.customer_id, mi.material_type
) received
FULL OUTER JOIN (
    -- What was actually delivered  
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
ORDER BY c.name, COALESCE(received.material_type, delivered.material_type);