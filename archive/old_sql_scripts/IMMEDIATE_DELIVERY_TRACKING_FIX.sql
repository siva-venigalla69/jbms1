-- =====================================
-- IMMEDIATE DELIVERY TRACKING FIX
-- Quick fix for current deployment issues
-- Run this immediately to fix the design_url error
-- =====================================

-- =====================================
-- SECTION 1: IMMEDIATE SCHEMA FIXES
-- =====================================

-- Fix the immediate error: Add missing columns to order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS design_url TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS design_notes TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS design_ready BOOLEAN DEFAULT FALSE;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS total_delivered DECIMAL(10,2) DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS remaining_quantity DECIMAL(10,2);

-- Add delivery status tracking to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_progress_percent INTEGER DEFAULT 0;

-- Set default values for new columns
UPDATE orders SET delivery_status = 'pending' WHERE delivery_status IS NULL;
UPDATE orders SET delivery_progress_percent = 0 WHERE delivery_progress_percent IS NULL;

-- =====================================
-- SECTION 2: QUICK DELIVERY TRACKING VIEW
-- =====================================

-- Simple view for immediate delivery tracking
CREATE OR REPLACE VIEW order_delivery_summary AS
SELECT 
    o.id as order_id,
    o.order_number,
    o.customer_id,
    c.name as customer_name,
    COUNT(oi.id) as total_items,
    SUM(oi.quantity) as total_quantity_ordered,
    SUM(COALESCE(delivered_calc.total_delivered, 0)) as total_quantity_delivered,
    SUM(oi.quantity) - SUM(COALESCE(delivered_calc.total_delivered, 0)) as total_quantity_remaining,
    
    CASE 
        WHEN SUM(oi.quantity) = 0 THEN 0
        ELSE ROUND((SUM(COALESCE(delivered_calc.total_delivered, 0)) * 100.0 / SUM(oi.quantity))::NUMERIC, 2)
    END as delivery_progress_percent,
    
    CASE 
        WHEN SUM(COALESCE(delivered_calc.total_delivered, 0)) = 0 THEN 'not_started'
        WHEN SUM(COALESCE(delivered_calc.total_delivered, 0)) >= SUM(oi.quantity) THEN 'completed'
        ELSE 'in_progress'
    END as delivery_status

FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN (
    SELECT 
        ci.order_item_id,
        SUM(ci.quantity) as total_delivered
    FROM challan_items ci
    JOIN delivery_challans dc ON ci.challan_id = dc.id
    WHERE dc.is_deleted = FALSE
    GROUP BY ci.order_item_id
) delivered_calc ON delivered_calc.order_item_id = oi.id
WHERE o.is_deleted = FALSE
GROUP BY o.id, o.order_number, o.customer_id, c.name;

-- =====================================
-- SECTION 3: UPDATE EXISTING DATA
-- =====================================

-- Update existing order_items with calculated delivered quantities
UPDATE order_items SET
    total_delivered = COALESCE(delivered_calc.total_delivered, 0),
    remaining_quantity = quantity - COALESCE(delivered_calc.total_delivered, 0)
FROM (
    SELECT 
        oi.id as order_item_id,
        SUM(ci.quantity) as total_delivered
    FROM order_items oi
    LEFT JOIN challan_items ci ON oi.id = ci.order_item_id
    LEFT JOIN delivery_challans dc ON ci.challan_id = dc.id
    WHERE dc.is_deleted IS NOT TRUE
    GROUP BY oi.id
) delivered_calc
WHERE order_items.id = delivered_calc.order_item_id;

-- Update orders with delivery progress
UPDATE orders SET
    delivery_progress_percent = COALESCE(progress_calc.delivery_progress, 0),
    delivery_status = COALESCE(progress_calc.delivery_status, 'pending')
FROM (
    SELECT 
        o.id as order_id,
        CASE 
            WHEN SUM(oi.quantity) = 0 THEN 0
            ELSE ROUND((SUM(oi.total_delivered) * 100.0 / SUM(oi.quantity))::NUMERIC)
        END as delivery_progress,
        CASE 
            WHEN SUM(oi.total_delivered) = 0 THEN 'pending'
            WHEN SUM(oi.total_delivered) >= SUM(oi.quantity) THEN 'completed'
            ELSE 'in_progress'
        END as delivery_status
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE o.is_deleted = FALSE
    GROUP BY o.id
) progress_calc
WHERE orders.id = progress_calc.order_id;

-- =====================================
-- SECTION 4: IMMEDIATE VALIDATION
-- =====================================

-- Check if the fix worked
SELECT 
    'IMMEDIATE FIX VALIDATION' as status,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'order_items' AND column_name = 'design_url'
    ) THEN '✅ design_url column added' ELSE '❌ design_url still missing' END as design_url_fix,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'order_items' AND column_name = 'total_delivered'
    ) THEN '✅ total_delivered column added' ELSE '❌ total_delivered still missing' END as delivered_fix,
    
    (SELECT COUNT(*) FROM order_items WHERE total_delivered > 0) as items_with_delivery_data,
    (SELECT COUNT(*) FROM order_delivery_summary) as delivery_summary_records;

-- Sample delivery data check
SELECT 
    'DELIVERY DATA SAMPLE' as report_type,
    order_number,
    customer_name,
    total_items,
    total_quantity_ordered,
    total_quantity_delivered,
    delivery_progress_percent || '%' as progress,
    delivery_status
FROM order_delivery_summary
ORDER BY delivery_progress_percent DESC
LIMIT 5;

-- Log this fix
INSERT INTO deployment_history (
    deployment_type,
    script_name,
    status,
    description
) VALUES (
    'hotfix',
    'IMMEDIATE_DELIVERY_TRACKING_FIX.sql',
    'completed',
    'Immediate fix for design_url column error and basic delivery tracking setup'
);

-- Success messages in DO block
DO $$
BEGIN
    RAISE NOTICE '🎉 IMMEDIATE FIX COMPLETED!';
    RAISE NOTICE '✅ The design_url column error should now be resolved';
    RAISE NOTICE '✅ Basic delivery tracking is now available';
    RAISE NOTICE '📋 You can now run the full migration script 07_DELIVERY_TRACKING_ENHANCEMENTS.sql for complete features';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 NEXT STEPS:';
    RAISE NOTICE '1. Test the delivery challan page - the error should be gone';
    RAISE NOTICE '2. Run migration script 07 for complete delivery tracking features';
    RAISE NOTICE '3. Use the new Order Tracking page for comprehensive delivery management';
END $$;