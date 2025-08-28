-- =====================================
-- SIMPLE IMMEDIATE FIX
-- Ultra-safe fix for the design_url column error
-- No complex syntax - just the essentials
-- =====================================

-- Fix the immediate error: Add missing columns to order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS design_url TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS design_notes TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS design_ready BOOLEAN;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS total_delivered DECIMAL(10,2);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS remaining_quantity DECIMAL(10,2);

-- Add delivery status tracking to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_progress_percent INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS expected_completion_date DATE;

-- Set default values (safe approach)
UPDATE order_items SET design_ready = FALSE WHERE design_ready IS NULL;
UPDATE order_items SET total_delivered = 0 WHERE total_delivered IS NULL;
UPDATE order_items SET remaining_quantity = quantity WHERE remaining_quantity IS NULL;

UPDATE orders SET delivery_status = 'pending' WHERE delivery_status IS NULL;
UPDATE orders SET delivery_progress_percent = 0 WHERE delivery_progress_percent IS NULL;

-- Update delivered quantities from existing challan data
UPDATE order_items SET
    total_delivered = COALESCE(delivered_calc.delivered_qty, 0)
FROM (
    SELECT 
        ci.order_item_id,
        SUM(ci.quantity) as delivered_qty
    FROM challan_items ci
    JOIN delivery_challans dc ON ci.challan_id = dc.id
    WHERE dc.is_deleted = FALSE
    GROUP BY ci.order_item_id
) delivered_calc
WHERE order_items.id = delivered_calc.order_item_id;

-- Update remaining quantities
UPDATE order_items 
SET remaining_quantity = quantity - total_delivered
WHERE total_delivered > 0;

-- Update order delivery progress
UPDATE orders SET
    delivery_progress_percent = CASE 
        WHEN order_totals.total_qty = 0 THEN 0
        ELSE ROUND((order_totals.delivered_qty * 100.0 / order_totals.total_qty)::NUMERIC)
    END,
    delivery_status = CASE 
        WHEN order_totals.delivered_qty = 0 THEN 'pending'
        WHEN order_totals.delivered_qty >= order_totals.total_qty THEN 'completed'
        ELSE 'in_progress'
    END
FROM (
    SELECT 
        oi.order_id,
        SUM(oi.quantity) as total_qty,
        SUM(oi.total_delivered) as delivered_qty
    FROM order_items oi
    GROUP BY oi.order_id
) order_totals
WHERE orders.id = order_totals.order_id;

-- Create simple view for delivery tracking
CREATE OR REPLACE VIEW order_delivery_simple AS
SELECT 
    o.id as order_id,
    o.order_number,
    o.customer_id,
    c.name as customer_name,
    o.delivery_status,
    o.delivery_progress_percent,
    COUNT(oi.id) as total_items,
    SUM(oi.quantity) as total_ordered,
    SUM(oi.total_delivered) as total_delivered,
    SUM(oi.remaining_quantity) as total_remaining
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN order_items oi ON o.id = oi.order_id
WHERE o.is_deleted = FALSE
GROUP BY o.id, o.order_number, o.customer_id, c.name, o.delivery_status, o.delivery_progress_percent;

-- Validation query
SELECT 
    'SIMPLE FIX VALIDATION' as status,
    
    -- Check columns exist
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'order_items' AND column_name = 'design_url'
    ) THEN 'design_url: OK' ELSE 'design_url: MISSING' END as design_url_check,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'order_items' AND column_name = 'total_delivered'
    ) THEN 'total_delivered: OK' ELSE 'total_delivered: MISSING' END as delivered_check,
    
    -- Check data
    (SELECT COUNT(*) FROM order_items WHERE total_delivered > 0) as items_with_deliveries,
    (SELECT COUNT(*) FROM order_delivery_simple) as delivery_view_records;

-- Log this fix
INSERT INTO deployment_history (
    deployment_type,
    script_name,
    status,
    description
) VALUES (
    'hotfix',
    'SIMPLE_IMMEDIATE_FIX.sql',
    'completed',
    'Simple immediate fix for design_url column error and basic delivery tracking'
);

-- Success notification
SELECT 
    '🎉 SIMPLE FIX COMPLETED!' as message,
    '✅ The design_url column error should be resolved' as status1,
    '✅ Basic delivery tracking columns added' as status2,
    '📋 Test the delivery challan page now' as next_step;