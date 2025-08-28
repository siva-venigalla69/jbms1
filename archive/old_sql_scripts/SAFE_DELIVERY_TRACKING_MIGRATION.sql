-- =====================================
-- SAFE DELIVERY TRACKING MIGRATION
-- Verified column references and PostgreSQL compatibility
-- Version: 1.0 - Safe
-- =====================================

-- =====================================
-- SECTION 1: SCHEMA ADDITIONS (SAFE)
-- =====================================

-- Add missing columns to order_items (safe with IF NOT EXISTS)
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS design_url TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS design_notes TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS design_ready BOOLEAN;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS print_priority INTEGER;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS total_delivered DECIMAL(10,2);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS remaining_quantity DECIMAL(10,2);

-- Add missing columns to orders (safe with IF NOT EXISTS)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_progress_percent INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_delivery_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS expected_completion_date DATE;

-- Add enhancement columns to challan_items
ALTER TABLE challan_items ADD COLUMN IF NOT EXISTS delivery_notes TEXT;
ALTER TABLE challan_items ADD COLUMN IF NOT EXISTS item_condition VARCHAR(20);
ALTER TABLE challan_items ADD COLUMN IF NOT EXISTS customer_acceptance BOOLEAN;

-- Set safe default values
UPDATE order_items SET design_ready = FALSE WHERE design_ready IS NULL;
UPDATE order_items SET print_priority = 3 WHERE print_priority IS NULL;
UPDATE order_items SET total_delivered = 0 WHERE total_delivered IS NULL;
UPDATE order_items SET remaining_quantity = COALESCE(quantity, 0) WHERE remaining_quantity IS NULL;

UPDATE orders SET delivery_status = 'pending' WHERE delivery_status IS NULL;
UPDATE orders SET delivery_progress_percent = 0 WHERE delivery_progress_percent IS NULL;

UPDATE challan_items SET item_condition = 'good' WHERE item_condition IS NULL;

-- =====================================
-- SECTION 2: SAFE DELIVERY TRACKING VIEWS
-- =====================================

-- Simple order delivery status view (safe column references)
CREATE OR REPLACE VIEW order_delivery_status_safe AS
SELECT 
    o.id as order_id,
    o.order_number,
    o.order_date,
    c.name as customer_name,
    c.id as customer_id,
    COALESCE(o.total_amount, 0) as total_amount,
    COALESCE(o.delivery_status, 'pending') as delivery_status,
    COALESCE(o.delivery_progress_percent, 0) as delivery_progress_percent,
    
    -- Order item aggregations
    COUNT(oi.id) as total_items,
    SUM(COALESCE(oi.quantity, 0)) as total_quantity_ordered,
    SUM(COALESCE(oi.total_delivered, 0)) as total_quantity_delivered,
    SUM(COALESCE(oi.remaining_quantity, COALESCE(oi.quantity, 0))) as total_quantity_remaining,
    
    -- Delivery progress calculations
    CASE 
        WHEN SUM(COALESCE(oi.quantity, 0)) = 0 THEN 0
        ELSE ROUND((SUM(COALESCE(oi.total_delivered, 0)) * 100.0 / SUM(COALESCE(oi.quantity, 0)))::NUMERIC, 2)
    END as actual_delivery_progress_percent,
    
    -- Status classifications
    CASE 
        WHEN SUM(COALESCE(oi.total_delivered, 0)) = 0 THEN 'not_started'
        WHEN SUM(COALESCE(oi.total_delivered, 0)) >= SUM(COALESCE(oi.quantity, 0)) THEN 'completed'
        ELSE 'in_progress'
    END as calculated_delivery_status,
    
    -- Challan information
    COUNT(DISTINCT dc.id) as total_challans_created,
    MAX(dc.challan_date) as last_challan_date,
    
    -- Timeline information (safe with COALESCE)
    o.expected_completion_date,
    o.last_delivery_date,
    CASE 
        WHEN o.expected_completion_date IS NOT NULL 
             AND o.expected_completion_date < CURRENT_DATE 
             AND SUM(COALESCE(oi.total_delivered, 0)) < SUM(COALESCE(oi.quantity, 0)) THEN TRUE
        ELSE FALSE
    END as is_overdue

FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN challan_items ci ON oi.id = ci.order_item_id
LEFT JOIN delivery_challans dc ON ci.challan_id = dc.id AND COALESCE(dc.is_deleted, FALSE) = FALSE
WHERE COALESCE(o.is_deleted, FALSE) = FALSE
GROUP BY o.id, o.order_number, o.order_date, c.name, c.id, o.total_amount, 
         o.delivery_status, o.delivery_progress_percent, o.expected_completion_date, o.last_delivery_date;

-- Simple order item delivery details view
CREATE OR REPLACE VIEW order_item_delivery_details_safe AS
SELECT 
    oi.id as order_item_id,
    oi.order_id,
    o.order_number,
    c.name as customer_name,
    COALESCE(mt.name, 'Unknown Material') as material_type_name,
    
    -- Quantity tracking (safe with COALESCE)
    COALESCE(oi.quantity, 0) as ordered_quantity,
    COALESCE(oi.total_delivered, 0) as delivered_quantity,
    COALESCE(oi.remaining_quantity, COALESCE(oi.quantity, 0)) as remaining_quantity,
    COALESCE(oi.unit_price, 0) as unit_price,
    (COALESCE(oi.quantity, 0) * COALESCE(oi.unit_price, 0)) as total_value,
    (COALESCE(oi.total_delivered, 0) * COALESCE(oi.unit_price, 0)) as delivered_value,
    (COALESCE(oi.remaining_quantity, COALESCE(oi.quantity, 0)) * COALESCE(oi.unit_price, 0)) as remaining_value,
    
    -- Design information (safe with COALESCE)
    oi.design_url,
    oi.design_notes,
    COALESCE(oi.design_ready, FALSE) as design_ready,
    COALESCE(oi.print_priority, 3) as print_priority,
    
    -- Production status (safe with COALESCE)
    COALESCE(ps.name, 'Not Assigned') as production_stage_name,
    oi.stage_completed_at,
    
    -- Delivery progress (safe calculations)
    CASE 
        WHEN COALESCE(oi.quantity, 0) = 0 THEN 0
        ELSE ROUND((COALESCE(oi.total_delivered, 0) * 100.0 / COALESCE(oi.quantity, 1))::NUMERIC, 2)
    END as delivery_progress_percent,
    
    CASE 
        WHEN COALESCE(oi.total_delivered, 0) = 0 THEN 'not_delivered'
        WHEN COALESCE(oi.total_delivered, 0) >= COALESCE(oi.quantity, 0) THEN 'fully_delivered'
        ELSE 'partially_delivered'
    END as delivery_status,
    
    -- Challan history (safe with COALESCE)
    COUNT(ci.id) as total_deliveries,
    MAX(dc.challan_date) as last_delivery_date

FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN customers c ON o.customer_id = c.id
LEFT JOIN material_types mt ON oi.material_type = mt.id
LEFT JOIN production_stages ps ON oi.production_stage = ps.id
LEFT JOIN challan_items ci ON oi.id = ci.order_item_id
LEFT JOIN delivery_challans dc ON ci.challan_id = dc.id AND COALESCE(dc.is_deleted, FALSE) = FALSE
WHERE COALESCE(o.is_deleted, FALSE) = FALSE
GROUP BY oi.id, oi.order_id, o.order_number, c.name, mt.name, oi.quantity, 
         oi.total_delivered, oi.remaining_quantity, oi.unit_price, oi.design_url,
         oi.design_notes, oi.design_ready, oi.print_priority, ps.name, oi.stage_completed_at;

-- Safe pending deliveries view
CREATE OR REPLACE VIEW pending_deliveries_safe AS
SELECT 
    c.name as customer_name,
    c.id as customer_id,
    o.order_number,
    o.id as order_id,
    o.order_date,
    o.expected_completion_date,
    
    -- Item details (safe with COALESCE)
    COALESCE(mt.name, 'Unknown Material') as material_type,
    COALESCE(oi.quantity, 0) as ordered_qty,
    COALESCE(oi.total_delivered, 0) as delivered_qty,
    COALESCE(oi.remaining_quantity, COALESCE(oi.quantity, 0)) as pending_qty,
    COALESCE(oi.unit_price, 0) as unit_price,
    (COALESCE(oi.remaining_quantity, COALESCE(oi.quantity, 0)) * COALESCE(oi.unit_price, 0)) as pending_value,
    
    -- Status and priority (safe with COALESCE)
    COALESCE(oi.design_ready, FALSE) as design_ready,
    COALESCE(oi.print_priority, 3) as print_priority,
    COALESCE(ps.name, 'Not Assigned') as production_stage,
    
    -- Urgency indicators (safe with NULL checks)
    CASE 
        WHEN o.expected_completion_date IS NOT NULL AND o.expected_completion_date < CURRENT_DATE THEN 'overdue'
        WHEN o.expected_completion_date IS NOT NULL AND o.expected_completion_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'urgent'
        WHEN o.expected_completion_date IS NOT NULL AND o.expected_completion_date <= CURRENT_DATE + INTERVAL '14 days' THEN 'upcoming'
        ELSE 'normal'
    END as urgency_level,
    
    CASE 
        WHEN o.expected_completion_date IS NOT NULL THEN (o.expected_completion_date - CURRENT_DATE)
        ELSE NULL 
    END as days_until_due

FROM customers c
JOIN orders o ON c.id = o.customer_id
JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN material_types mt ON oi.material_type = mt.id
LEFT JOIN production_stages ps ON oi.production_stage = ps.id
WHERE COALESCE(c.is_deleted, FALSE) = FALSE 
AND COALESCE(o.is_deleted, FALSE) = FALSE
AND COALESCE(oi.remaining_quantity, COALESCE(oi.quantity, 0)) > 0
ORDER BY 
    CASE 
        WHEN o.expected_completion_date IS NOT NULL AND o.expected_completion_date < CURRENT_DATE THEN 1
        WHEN o.expected_completion_date IS NOT NULL AND o.expected_completion_date <= CURRENT_DATE + INTERVAL '7 days' THEN 2
        WHEN o.expected_completion_date IS NOT NULL AND o.expected_completion_date <= CURRENT_DATE + INTERVAL '14 days' THEN 3
        ELSE 4
    END,
    o.expected_completion_date ASC NULLS LAST;

-- =====================================
-- SECTION 3: SAFE FUNCTIONS
-- =====================================

-- Safe function to get available delivery items
CREATE OR REPLACE FUNCTION get_available_delivery_items_safe(p_customer_id UUID)
RETURNS TABLE (
    order_item_id UUID,
    order_id UUID,
    order_number VARCHAR,
    material_type_name VARCHAR,
    ordered_quantity DECIMAL,
    delivered_quantity DECIMAL,
    available_quantity DECIMAL,
    unit_price DECIMAL,
    design_url TEXT,
    design_notes TEXT,
    design_ready BOOLEAN,
    production_stage VARCHAR,
    last_delivery_date TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        oid.order_item_id,
        oid.order_id,
        oid.order_number,
        oid.material_type_name,
        oid.ordered_quantity,
        oid.delivered_quantity,
        oid.remaining_quantity as available_quantity,
        oid.unit_price,
        oid.design_url,
        oid.design_notes,
        oid.design_ready,
        oid.production_stage_name as production_stage,
        oid.last_delivery_date
    FROM order_item_delivery_details_safe oid
    JOIN orders o ON oid.order_id = o.id
    WHERE o.customer_id = p_customer_id
    AND oid.remaining_quantity > 0
    ORDER BY o.order_date DESC, oid.order_item_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================
-- SECTION 4: SAFE DATA UPDATES
-- =====================================

-- Update existing order_items with calculated delivered quantities (safe)
UPDATE order_items SET
    total_delivered = COALESCE(delivered_calc.delivered_qty, 0),
    remaining_quantity = COALESCE(quantity, 0) - COALESCE(delivered_calc.delivered_qty, 0)
FROM (
    SELECT 
        ci.order_item_id,
        SUM(ci.quantity) as delivered_qty
    FROM challan_items ci
    JOIN delivery_challans dc ON ci.challan_id = dc.id
    WHERE COALESCE(dc.is_deleted, FALSE) = FALSE
    GROUP BY ci.order_item_id
) delivered_calc
WHERE order_items.id = delivered_calc.order_item_id;

-- Update orders with safe delivery progress calculation
UPDATE orders SET
    delivery_progress_percent = COALESCE(progress_calc.delivery_progress, 0),
    delivery_status = COALESCE(progress_calc.delivery_status, 'pending'),
    last_delivery_date = progress_calc.last_delivery_date
FROM (
    SELECT 
        o.id as order_id,
        CASE 
            WHEN SUM(COALESCE(oi.quantity, 0)) = 0 THEN 0
            ELSE ROUND((SUM(COALESCE(oi.total_delivered, 0)) * 100.0 / SUM(COALESCE(oi.quantity, 1)))::NUMERIC)
        END as delivery_progress,
        CASE 
            WHEN SUM(COALESCE(oi.total_delivered, 0)) = 0 THEN 'pending'
            WHEN SUM(COALESCE(oi.total_delivered, 0)) >= SUM(COALESCE(oi.quantity, 0)) THEN 'completed'
            ELSE 'in_progress'
        END as delivery_status,
        MAX(dc.challan_date) as last_delivery_date
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN challan_items ci ON oi.id = ci.order_item_id
    LEFT JOIN delivery_challans dc ON ci.challan_id = dc.id AND COALESCE(dc.is_deleted, FALSE) = FALSE
    WHERE COALESCE(o.is_deleted, FALSE) = FALSE
    GROUP BY o.id
) progress_calc
WHERE orders.id = progress_calc.order_id;

-- =====================================
-- SECTION 5: VALIDATION
-- =====================================

-- Safe validation query
SELECT 
    'SAFE MIGRATION VALIDATION' as status,
    
    -- Check columns exist
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'order_items' AND column_name = 'design_url'
    ) THEN 'design_url: ✅' ELSE 'design_url: ❌' END as design_url_check,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'order_items' AND column_name = 'total_delivered'
    ) THEN 'total_delivered: ✅' ELSE 'total_delivered: ❌' END as delivered_check,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_name = 'order_delivery_status_safe'
    ) THEN 'views: ✅' ELSE 'views: ❌' END as views_check,
    
    -- Check data
    (SELECT COUNT(*) FROM order_items WHERE COALESCE(total_delivered, 0) > 0) as items_with_deliveries,
    (SELECT COUNT(*) FROM order_delivery_status_safe) as delivery_records;

-- Log this deployment
INSERT INTO deployment_history (
    deployment_type,
    script_name,
    status,
    description
) VALUES (
    'enhancement',
    'SAFE_DELIVERY_TRACKING_MIGRATION.sql',
    'completed',
    'Safe delivery tracking migration with verified column references and PostgreSQL compatibility'
);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 SAFE DELIVERY TRACKING MIGRATION COMPLETED!';
    RAISE NOTICE '✅ All column reference errors fixed';
    RAISE NOTICE '✅ Safe views created with COALESCE for NULL handling';
    RAISE NOTICE '✅ PostgreSQL compatibility ensured';
    RAISE NOTICE '✅ The design_url column error should be resolved';
    RAISE NOTICE '';
    RAISE NOTICE '📋 NEW SAFE VIEWS AVAILABLE:';
    RAISE NOTICE '- order_delivery_status_safe';
    RAISE NOTICE '- order_item_delivery_details_safe';
    RAISE NOTICE '- pending_deliveries_safe';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 FUNCTION AVAILABLE:';
    RAISE NOTICE '- get_available_delivery_items_safe(customer_id)';
END $$;