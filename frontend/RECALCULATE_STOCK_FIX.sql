-- =====================================
-- FIX MATERIAL STOCK CALCULATION
-- This will recalculate all stock values correctly
-- =====================================

-- 1. Clear current material_stock table to start fresh
DELETE FROM material_stock;

-- 2. Recalculate and insert correct stock values
INSERT INTO material_stock (customer_id, material_type, total_received, total_delivered, current_stock, last_updated)
SELECT 
    COALESCE(received.customer_id, delivered.customer_id) as customer_id,
    COALESCE(received.material_type, delivered.material_type) as material_type,
    COALESCE(received.total_received, 0) as total_received,
    COALESCE(delivered.total_delivered, 0) as total_delivered,
    COALESCE(received.total_received, 0) - COALESCE(delivered.total_delivered, 0) as current_stock,
    NOW() as last_updated
FROM (
    -- Calculate actual total received per customer-material
    SELECT 
        customer_id,
        material_type,
        SUM(quantity) as total_received
    FROM material_in
    GROUP BY customer_id, material_type
) received
FULL OUTER JOIN (
    -- Calculate actual total delivered per customer-material
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
WHERE COALESCE(received.customer_id, delivered.customer_id) IS NOT NULL;

-- 3. Verify the fix - should show correct positive values
SELECT 
    'CORRECTED STOCK:' as status,
    c.name as customer_name,
    ms.material_type,
    ms.total_received,
    ms.total_delivered,
    ms.current_stock
FROM material_stock ms
JOIN customers c ON ms.customer_id = c.id
ORDER BY c.name, ms.material_type;