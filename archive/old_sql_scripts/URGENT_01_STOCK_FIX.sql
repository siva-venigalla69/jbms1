-- =====================================
-- URGENT STOCK CALCULATION FIX
-- Run this IMMEDIATELY to fix -8 vs +8 issue
-- =====================================

-- 1. EMERGENCY BACKUP FIRST
CREATE TABLE IF NOT EXISTS material_stock_emergency_backup AS 
SELECT * FROM material_stock WHERE current_stock IS NOT NULL;

-- 2. DIAGNOSE THE PROBLEM
SELECT 
    '=== CURRENT BROKEN STOCK VALUES ===' as status,
    c.name as customer_name,
    CASE 
        WHEN ms.material_type::TEXT ~ '^[0-9a-fA-F-]{36}$' THEN 
            COALESCE(mt.name, 'Unknown Material Type')
        ELSE ms.material_type::TEXT
    END as material_type_name,
    ms.total_received,
    ms.total_delivered,
    ms.current_stock,
    CASE 
        WHEN ms.current_stock < 0 THEN '❌ NEGATIVE (BROKEN)'
        ELSE '✅ POSITIVE'
    END as status_check
FROM material_stock ms
JOIN customers c ON ms.customer_id = c.id
LEFT JOIN material_types mt ON ms.material_type::UUID = mt.id
WHERE c.name IN ('SIVA HANDLOOMS', 'SRINIVASA HANDLOOMS')
ORDER BY c.name, material_type_name;

-- 3. CHECK WHAT MATERIALS WERE ACTUALLY RECEIVED
SELECT 
    '=== ACTUAL MATERIAL RECEIPTS ===' as status,
    c.name as customer_name,
    CASE 
        WHEN mi.material_type::TEXT ~ '^[0-9a-fA-F-]{36}$' THEN 
            COALESCE(mt.name, 'Unknown Material Type')
        ELSE mi.material_type::TEXT
    END as material_type_name,
    mi.quantity,
    mi.received_date
FROM material_in mi
JOIN customers c ON mi.customer_id = c.id
LEFT JOIN material_types mt ON mi.material_type::UUID = mt.id
WHERE c.name IN ('SIVA HANDLOOMS', 'SRINIVASA HANDLOOMS')
ORDER BY c.name, mi.received_date DESC;

-- 4. CHECK WHAT WAS ACTUALLY DELIVERED
SELECT 
    '=== ACTUAL DELIVERIES ===' as status,
    c.name as customer_name,
    CASE 
        WHEN oi.material_type::TEXT ~ '^[0-9a-fA-F-]{36}$' THEN 
            COALESCE(mt.name, 'Unknown Material Type')
        ELSE oi.material_type::TEXT
    END as material_type_name,
    ci.quantity as delivered_quantity,
    dc.challan_date
FROM challan_items ci
JOIN delivery_challans dc ON ci.challan_id = dc.id
JOIN customers c ON dc.customer_id = c.id
JOIN order_items oi ON ci.order_item_id = oi.id
LEFT JOIN material_types mt ON oi.material_type::UUID = mt.id
WHERE c.name IN ('SIVA HANDLOOMS', 'SRINIVASA HANDLOOMS')
ORDER BY c.name, dc.challan_date DESC;

-- 5. RECALCULATE STOCK CORRECTLY
-- Clear the broken values first
UPDATE material_stock 
SET total_received = 0, total_delivered = 0, current_stock = 0, last_updated = NOW()
WHERE customer_id IN (
    SELECT id FROM customers WHERE name IN ('SIVA HANDLOOMS', 'SRINIVASA HANDLOOMS')
);

-- 6. RECALCULATE RECEIVED MATERIALS
-- Update total_received based on actual material_in records
WITH received_materials AS (
    SELECT 
        mi.customer_id,
        mi.material_type,
        SUM(mi.quantity) as total_received
    FROM material_in mi
    JOIN customers c ON mi.customer_id = c.id
    WHERE c.name IN ('SIVA HANDLOOMS', 'SRINIVASA HANDLOOMS')
    GROUP BY mi.customer_id, mi.material_type
)
UPDATE material_stock ms
SET 
    total_received = rm.total_received,
    current_stock = rm.total_received - ms.total_delivered,
    last_updated = NOW()
FROM received_materials rm
WHERE ms.customer_id = rm.customer_id
    AND ms.material_type = rm.material_type;

-- 7. RECALCULATE DELIVERED MATERIALS
-- Update total_delivered based on actual delivery records
WITH delivered_materials AS (
    SELECT 
        dc.customer_id,
        oi.material_type,
        SUM(ci.quantity) as total_delivered
    FROM challan_items ci
    JOIN delivery_challans dc ON ci.challan_id = dc.id
    JOIN order_items oi ON ci.order_item_id = oi.id
    JOIN customers c ON dc.customer_id = c.id
    WHERE c.name IN ('SIVA HANDLOOMS', 'SRINIVASA HANDLOOMS')
    GROUP BY dc.customer_id, oi.material_type
)
UPDATE material_stock ms
SET 
    total_delivered = dm.total_delivered,
    current_stock = ms.total_received - dm.total_delivered,
    last_updated = NOW()
FROM delivered_materials dm
WHERE ms.customer_id = dm.customer_id
    AND ms.material_type = dm.material_type;

-- 8. INSERT MISSING STOCK RECORDS (if any materials were received but no stock record exists)
INSERT INTO material_stock (customer_id, material_type, total_received, total_delivered, current_stock, last_updated, created_at)
SELECT DISTINCT
    mi.customer_id,
    mi.material_type,
    0, -- Will be updated in next step
    0, -- Will be updated in next step
    0, -- Will be updated in next step
    NOW(),
    NOW()
FROM material_in mi
JOIN customers c ON mi.customer_id = c.id
WHERE c.name IN ('SIVA HANDLOOMS', 'SRINIVASA HANDLOOMS')
    AND NOT EXISTS (
        SELECT 1 FROM material_stock ms 
        WHERE ms.customer_id = mi.customer_id 
        AND ms.material_type = mi.material_type
    );

-- 9. FINAL COMPREHENSIVE RECALCULATION
WITH comprehensive_stock AS (
    SELECT 
        COALESCE(received.customer_id, delivered.customer_id) as customer_id,
        COALESCE(received.material_type, delivered.material_type) as material_type,
        COALESCE(received.total_received, 0) as total_received,
        COALESCE(delivered.total_delivered, 0) as total_delivered,
        COALESCE(received.total_received, 0) - COALESCE(delivered.total_delivered, 0) as current_stock
    FROM (
        -- What was actually received
        SELECT 
            mi.customer_id,
            mi.material_type,
            SUM(mi.quantity) as total_received
        FROM material_in mi
        JOIN customers c ON mi.customer_id = c.id
        WHERE c.name IN ('SIVA HANDLOOMS', 'SRINIVASA HANDLOOMS')
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
        JOIN customers c ON dc.customer_id = c.id
        WHERE c.name IN ('SIVA HANDLOOMS', 'SRINIVASA HANDLOOMS')
        GROUP BY dc.customer_id, oi.material_type
    ) delivered ON received.customer_id = delivered.customer_id 
                AND received.material_type = delivered.material_type
)
UPDATE material_stock ms
SET 
    total_received = cs.total_received,
    total_delivered = cs.total_delivered,
    current_stock = cs.current_stock,
    last_updated = NOW()
FROM comprehensive_stock cs
WHERE ms.customer_id = cs.customer_id
    AND ms.material_type = cs.material_type;

-- 10. VERIFY THE FIX
SELECT 
    '=== FIXED STOCK VALUES ===' as status,
    c.name as customer_name,
    CASE 
        WHEN ms.material_type::TEXT ~ '^[0-9a-fA-F-]{36}$' THEN 
            COALESCE(mt.name, 'Unknown Material Type')
        ELSE ms.material_type::TEXT
    END as material_type_name,
    ms.total_received,
    ms.total_delivered,
    ms.current_stock,
    CASE 
        WHEN ms.current_stock >= 0 THEN '✅ FIXED - POSITIVE'
        ELSE '❌ STILL NEGATIVE'
    END as fix_status
FROM material_stock ms
JOIN customers c ON ms.customer_id = c.id
LEFT JOIN material_types mt ON ms.material_type::UUID = mt.id
WHERE c.name IN ('SIVA HANDLOOMS', 'SRINIVASA HANDLOOMS')
ORDER BY c.name, material_type_name;

-- 11. EXPECTED RESULTS
SELECT '=== EXPECTED RESULTS ===' as info;
SELECT 'SIVA HANDLOOMS should show: dupatta R:3 D:1 C:2, saree R:3 D:1 C:2' as expected;
SELECT 'SRINIVASA HANDLOOMS should show: dupatta R:4 D:0 C:4, saree R:2 D:2 C:0' as expected;