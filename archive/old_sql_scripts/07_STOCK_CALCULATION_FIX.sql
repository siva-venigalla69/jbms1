-- =====================================
-- CRITICAL FIX: Stock Calculation Issues
-- This fixes the negative stock values
-- Run this FIRST to fix immediate issues
-- =====================================

-- 1. DIAGNOSE CURRENT PROBLEM
SELECT 
    'CURRENT STOCK ISSUES:' as status,
    c.name as customer_name,
    ms.material_type,
    ms.total_received,
    ms.total_delivered, 
    ms.current_stock,
    'SHOULD BE POSITIVE' as note
FROM material_stock ms
JOIN customers c ON ms.customer_id = c.id
WHERE ms.current_stock < 0
ORDER BY c.name;

-- 2. CHECK WHAT MATERIAL_IN ACTUALLY CONTAINS
SELECT 
    'MATERIAL RECEIPTS:' as status,
    c.name as customer_name,
    mt.name as material_type_name,
    mi.quantity,
    mi.received_date
FROM material_in mi
JOIN customers c ON mi.customer_id = c.id
LEFT JOIN material_types mt ON mi.material_type = mt.id
ORDER BY mi.received_date DESC;

-- 3. CHECK WHAT DELIVERIES HAPPENED
SELECT 
    'DELIVERIES:' as status,
    c.name as customer_name,
    mt.name as material_type_name,
    ci.quantity,
    dc.challan_date
FROM challan_items ci
JOIN delivery_challans dc ON ci.challan_id = dc.id
JOIN customers c ON dc.customer_id = c.id
JOIN order_items oi ON ci.order_item_id = oi.id
LEFT JOIN material_types mt ON oi.material_type = mt.id
ORDER BY dc.challan_date DESC;

-- 4. RECALCULATE STOCK VALUES CORRECTLY
-- First, clear the incorrect values
UPDATE material_stock 
SET total_received = 0, total_delivered = 0, current_stock = 0, last_updated = NOW()
WHERE customer_id IN (
    SELECT DISTINCT customer_id FROM material_stock WHERE current_stock < 0
);

-- 5. RECALCULATE RECEIVED MATERIALS
-- Update total_received based on actual material_in records
UPDATE material_stock ms
SET 
    total_received = COALESCE(received.total_qty, 0),
    current_stock = COALESCE(received.total_qty, 0) - total_delivered,
    last_updated = NOW()
FROM (
    SELECT 
        mi.customer_id,
        mi.material_type,
        SUM(mi.quantity) as total_qty
    FROM material_in mi
    GROUP BY mi.customer_id, mi.material_type
) received
WHERE ms.customer_id = received.customer_id
    AND ms.material_type = received.material_type;

-- 6. RECALCULATE DELIVERED MATERIALS  
-- Update total_delivered based on actual delivery records
UPDATE material_stock ms
SET 
    total_delivered = COALESCE(delivered.total_qty, 0),
    current_stock = total_received - COALESCE(delivered.total_qty, 0),
    last_updated = NOW()
FROM (
    SELECT 
        dc.customer_id,
        oi.material_type,
        SUM(ci.quantity) as total_qty
    FROM challan_items ci
    JOIN delivery_challans dc ON ci.challan_id = dc.id
    JOIN order_items oi ON ci.order_item_id = oi.id
    GROUP BY dc.customer_id, oi.material_type
) delivered
WHERE ms.customer_id = delivered.customer_id
    AND ms.material_type = delivered.material_type;

-- 7. INSERT MISSING STOCK RECORDS
-- For materials that were received but don't have stock records
INSERT INTO material_stock (customer_id, material_type, total_received, total_delivered, current_stock, last_updated, created_at)
SELECT DISTINCT
    mi.customer_id,
    mi.material_type,
    0, -- Will be updated below
    0, -- Will be updated below  
    0, -- Will be updated below
    NOW(),
    NOW()
FROM material_in mi
WHERE NOT EXISTS (
    SELECT 1 FROM material_stock ms 
    WHERE ms.customer_id = mi.customer_id 
    AND ms.material_type = mi.material_type
);

-- 8. FINAL RECALCULATION FOR ALL RECORDS
WITH received_summary AS (
    SELECT 
        mi.customer_id,
        mi.material_type,
        SUM(mi.quantity) as total_received
    FROM material_in mi
    GROUP BY mi.customer_id, mi.material_type
),
delivered_summary AS (
    SELECT 
        dc.customer_id,
        oi.material_type,
        SUM(ci.quantity) as total_delivered
    FROM challan_items ci
    JOIN delivery_challans dc ON ci.challan_id = dc.id
    JOIN order_items oi ON ci.order_item_id = oi.id
    GROUP BY dc.customer_id, oi.material_type
)
UPDATE material_stock ms
SET 
    total_received = COALESCE(rs.total_received, 0),
    total_delivered = COALESCE(ds.total_delivered, 0),
    current_stock = COALESCE(rs.total_received, 0) - COALESCE(ds.total_delivered, 0),
    last_updated = NOW()
FROM received_summary rs
FULL OUTER JOIN delivered_summary ds 
    ON rs.customer_id = ds.customer_id AND rs.material_type = ds.material_type
WHERE ms.customer_id = COALESCE(rs.customer_id, ds.customer_id)
    AND ms.material_type = COALESCE(rs.material_type, ds.material_type);

-- 9. VERIFY THE FIX
SELECT 
    'FIXED STOCK VALUES:' as status,
    c.name as customer_name,
    mt.name as material_type_name,
    ms.total_received,
    ms.total_delivered,
    ms.current_stock,
    CASE 
        WHEN ms.current_stock >= 0 THEN '✅ CORRECT'
        ELSE '❌ STILL NEGATIVE'
    END as validation
FROM material_stock ms
JOIN customers c ON ms.customer_id = c.id
LEFT JOIN material_types mt ON ms.material_type = mt.id
ORDER BY c.name, mt.name;