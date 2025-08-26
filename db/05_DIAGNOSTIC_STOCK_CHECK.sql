-- Simple stock check to debug the -8 issue
-- Run this in Supabase SQL Editor

-- 1. What's actually in material_in?
SELECT 'MATERIAL_IN:' as type, customer_id, material_type, quantity, received_date
FROM material_in 
ORDER BY received_date DESC;

-- 2. What's in material_stock table?
SELECT 'MATERIAL_STOCK:' as type, customer_id, material_type, total_received, total_delivered, current_stock
FROM material_stock;

-- 3. What deliveries happened?
SELECT 'DELIVERIES:' as type, dc.customer_id, oi.material_type, ci.quantity, dc.challan_date
FROM challan_items ci
JOIN delivery_challans dc ON ci.challan_id = dc.id
JOIN order_items oi ON ci.order_item_id = oi.id
ORDER BY dc.challan_date DESC;