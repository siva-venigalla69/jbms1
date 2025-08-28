-- =====================================
-- DELIVERY TRACKING ENHANCEMENTS (MIGRATION SAFE)
-- Comprehensive delivery tracking with verified column references
-- Version: 1.0 - Migration Safe
-- =====================================

-- =====================================
-- SECTION 1: SCHEMA ENHANCEMENTS
-- =====================================

-- Add missing columns to order_items (safe with IF NOT EXISTS)
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS design_url TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS design_notes TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS design_ready BOOLEAN DEFAULT FALSE;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS print_priority INTEGER DEFAULT 3;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS total_delivered DECIMAL(10,2) DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS remaining_quantity DECIMAL(10,2);

-- Add delivery status tracking to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_progress_percent INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_delivery_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS expected_completion_date DATE;

-- Enhance challan_items with better tracking
ALTER TABLE challan_items ADD COLUMN IF NOT EXISTS delivery_notes TEXT;
ALTER TABLE challan_items ADD COLUMN IF NOT EXISTS item_condition VARCHAR(20);
ALTER TABLE challan_items ADD COLUMN IF NOT EXISTS customer_acceptance BOOLEAN;

-- Set default values for new columns
UPDATE orders SET delivery_status = 'pending' WHERE delivery_status IS NULL;
UPDATE orders SET delivery_progress_percent = 0 WHERE delivery_progress_percent IS NULL;
UPDATE challan_items SET item_condition = 'good' WHERE item_condition IS NULL;

-- =====================================
-- SECTION 2: DELIVERY TRACKING VIEWS
-- =====================================

-- Comprehensive order delivery status view (safe)
CREATE OR REPLACE VIEW order_delivery_status AS
SELECT 
    o.id as order_id,
    o.order_number,
    o.order_date,
    c.name as customer_name,
    c.id as customer_id,
    COALESCE(o.total_amount, 0) as total_amount,
    COALESCE(o.delivery_status, 'pending') as delivery_status,
    COALESCE(o.delivery_progress_percent, 0) as delivery_progress_percent,
    
    -- Order item aggregations (safe with COALESCE)
    COUNT(oi.id) as total_items,
    SUM(COALESCE(oi.quantity, 0)) as total_quantity_ordered,
    SUM(COALESCE(oi.total_delivered, 0)) as total_quantity_delivered,
    SUM(COALESCE(oi.remaining_quantity, COALESCE(oi.quantity, 0))) as total_quantity_remaining,
    
    -- Delivery progress calculations (safe)
    CASE 
        WHEN SUM(COALESCE(oi.quantity, 0)) = 0 THEN 0
        ELSE ROUND((SUM(COALESCE(oi.total_delivered, 0)) * 100.0 / SUM(COALESCE(oi.quantity, 0)))::NUMERIC, 2)
    END as actual_delivery_progress_percent,
    
    -- Status classifications (safe)
    CASE 
        WHEN SUM(COALESCE(oi.total_delivered, 0)) = 0 THEN 'not_started'
        WHEN SUM(COALESCE(oi.total_delivered, 0)) >= SUM(COALESCE(oi.quantity, 0)) THEN 'completed'
        ELSE 'in_progress'
    END as calculated_delivery_status,
    
    -- Challan information (safe)
    COUNT(DISTINCT dc.id) as total_challans_created,
    MAX(dc.challan_date) as last_challan_date,
    STRING_AGG(DISTINCT dc.challan_number, ', ') as challan_numbers,
    
    -- Timeline information (safe with NULL checks)
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

-- Order item delivery details view (safe)
CREATE OR REPLACE VIEW order_item_delivery_details AS
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
    
    -- Design information (safe)
    oi.design_url,
    oi.design_notes,
    COALESCE(oi.design_ready, FALSE) as design_ready,
    COALESCE(oi.print_priority, 3) as print_priority,
    
    -- Production status (safe)
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
    
    -- Challan history (safe)
    COUNT(ci.id) as total_deliveries,
    STRING_AGG(dc.challan_number || ' (' || ci.quantity || ')', ', ') as delivery_history,
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

-- Customer delivery summary view (safe)
CREATE OR REPLACE VIEW customer_delivery_summary AS
SELECT 
    c.id as customer_id,
    c.name as customer_name,
    
    -- Order statistics (safe)
    COUNT(DISTINCT o.id) as total_orders,
    COUNT(DISTINCT CASE WHEN ods.calculated_delivery_status = 'completed' THEN o.id END) as completed_orders,
    COUNT(DISTINCT CASE WHEN ods.calculated_delivery_status = 'in_progress' THEN o.id END) as in_progress_orders,
    COUNT(DISTINCT CASE WHEN ods.calculated_delivery_status = 'not_started' THEN o.id END) as pending_orders,
    
    -- Quantity statistics (safe)
    SUM(COALESCE(ods.total_quantity_ordered, 0)) as total_quantity_ordered,
    SUM(COALESCE(ods.total_quantity_delivered, 0)) as total_quantity_delivered,
    SUM(COALESCE(ods.total_quantity_remaining, 0)) as total_quantity_remaining,
    
    -- Financial statistics (safe)
    SUM(COALESCE(o.total_amount, 0)) as total_order_value,
    SUM(COALESCE(ods.total_quantity_delivered, 0) * COALESCE(oi_avg.avg_unit_price, 0)) as delivered_value,
    SUM(COALESCE(ods.total_quantity_remaining, 0) * COALESCE(oi_avg.avg_unit_price, 0)) as pending_value,
    
    -- Performance metrics (safe)
    CASE 
        WHEN SUM(COALESCE(ods.total_quantity_ordered, 0)) = 0 THEN 0
        ELSE ROUND((SUM(COALESCE(ods.total_quantity_delivered, 0)) * 100.0 / SUM(COALESCE(ods.total_quantity_ordered, 1)))::NUMERIC, 2)
    END as overall_delivery_progress_percent,
    
    COUNT(DISTINCT dc.id) as total_challans_issued,
    MAX(dc.challan_date) as last_delivery_date,
    COUNT(DISTINCT CASE WHEN COALESCE(ods.is_overdue, FALSE) THEN o.id END) as overdue_orders

FROM customers c
JOIN orders o ON c.id = o.customer_id
JOIN order_delivery_status ods ON o.id = ods.order_id
LEFT JOIN delivery_challans dc ON o.customer_id = dc.customer_id AND COALESCE(dc.is_deleted, FALSE) = FALSE
LEFT JOIN (
    SELECT order_id, AVG(COALESCE(unit_price, 0)) as avg_unit_price
    FROM order_items 
    GROUP BY order_id
) oi_avg ON oi_avg.order_id = o.id
WHERE COALESCE(c.is_deleted, FALSE) = FALSE AND COALESCE(o.is_deleted, FALSE) = FALSE
GROUP BY c.id, c.name;

-- Pending deliveries summary (safe)
CREATE OR REPLACE VIEW pending_deliveries_summary AS
SELECT 
    c.name as customer_name,
    c.id as customer_id,
    o.order_number,
    o.id as order_id,
    o.order_date,
    o.expected_completion_date,
    
    -- Item details (safe)
    COALESCE(mt.name, 'Unknown Material') as material_type,
    COALESCE(oi.quantity, 0) as ordered_qty,
    COALESCE(oi.total_delivered, 0) as delivered_qty,
    COALESCE(oi.remaining_quantity, COALESCE(oi.quantity, 0)) as pending_qty,
    COALESCE(oi.unit_price, 0) as unit_price,
    (COALESCE(oi.remaining_quantity, COALESCE(oi.quantity, 0)) * COALESCE(oi.unit_price, 0)) as pending_value,
    
    -- Status and priority (safe)
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
-- SECTION 3: DELIVERY TRACKING FUNCTIONS
-- =====================================

-- Function to get delivery options for challan creation (safe)
CREATE OR REPLACE FUNCTION get_available_delivery_items(p_customer_id UUID)
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
    FROM order_item_delivery_details oid
    JOIN orders o ON oid.order_id = o.id
    WHERE o.customer_id = p_customer_id
    AND oid.remaining_quantity > 0
    ORDER BY o.order_date DESC, oid.order_item_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================
-- SECTION 4: DELIVERY PROGRESS TRIGGERS
-- =====================================

-- Function to update delivery progress when challan items are added (safe)
CREATE OR REPLACE FUNCTION update_delivery_progress()
RETURNS TRIGGER AS $$
DECLARE
    order_record RECORD;
BEGIN
    -- Handle challan item insertion/update/delete
    IF TG_TABLE_NAME = 'challan_items' THEN
        IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
            -- Update total_delivered and remaining_quantity for the order item (safe)
            UPDATE order_items SET
                total_delivered = (
                    SELECT COALESCE(SUM(ci.quantity), 0)
                    FROM challan_items ci
                    JOIN delivery_challans dc ON ci.challan_id = dc.id
                    WHERE ci.order_item_id = NEW.order_item_id
                    AND COALESCE(dc.is_deleted, FALSE) = FALSE
                ),
                remaining_quantity = COALESCE(quantity, 0) - (
                    SELECT COALESCE(SUM(ci.quantity), 0)
                    FROM challan_items ci
                    JOIN delivery_challans dc ON ci.challan_id = dc.id
                    WHERE ci.order_item_id = NEW.order_item_id
                    AND COALESCE(dc.is_deleted, FALSE) = FALSE
                )
            WHERE id = NEW.order_item_id;
            
            -- Get order information (safe)
            SELECT o.* INTO order_record
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            WHERE oi.id = NEW.order_item_id;
            
        ELSIF TG_OP = 'DELETE' THEN
            -- Update for deletion (safe)
            UPDATE order_items SET
                total_delivered = (
                    SELECT COALESCE(SUM(ci.quantity), 0)
                    FROM challan_items ci
                    JOIN delivery_challans dc ON ci.challan_id = dc.id
                    WHERE ci.order_item_id = OLD.order_item_id
                    AND COALESCE(dc.is_deleted, FALSE) = FALSE
                ),
                remaining_quantity = COALESCE(quantity, 0) - (
                    SELECT COALESCE(SUM(ci.quantity), 0)
                    FROM challan_items ci
                    JOIN delivery_challans dc ON ci.challan_id = dc.id
                    WHERE ci.order_item_id = OLD.order_item_id
                    AND COALESCE(dc.is_deleted, FALSE) = FALSE
                )
            WHERE id = OLD.order_item_id;
            
            -- Get order information (safe)
            SELECT o.* INTO order_record
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            WHERE oi.id = OLD.order_item_id;
        END IF;
        
        -- Update order-level delivery progress (safe)
        IF order_record.id IS NOT NULL THEN
            UPDATE orders SET
                delivery_progress_percent = (
                    SELECT CASE 
                        WHEN SUM(COALESCE(oi.quantity, 0)) = 0 THEN 0
                        ELSE ROUND((SUM(COALESCE(oi.total_delivered, 0)) * 100.0 / SUM(COALESCE(oi.quantity, 1)))::NUMERIC)
                    END
                    FROM order_items oi
                    WHERE oi.order_id = order_record.id
                ),
                delivery_status = (
                    SELECT CASE 
                        WHEN SUM(COALESCE(oi.total_delivered, 0)) = 0 THEN 'pending'
                        WHEN SUM(COALESCE(oi.total_delivered, 0)) >= SUM(COALESCE(oi.quantity, 0)) THEN 'completed'
                        ELSE 'in_progress'
                    END
                    FROM order_items oi
                    WHERE oi.order_id = order_record.id
                ),
                last_delivery_date = (
                    SELECT MAX(dc.challan_date)
                    FROM delivery_challans dc
                    JOIN challan_items ci ON dc.id = ci.challan_id
                    JOIN order_items oi ON ci.order_item_id = oi.id
                    WHERE oi.order_id = order_record.id
                    AND COALESCE(dc.is_deleted, FALSE) = FALSE
                ),
                updated_at = NOW()
            WHERE id = order_record.id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic delivery progress updates
DROP TRIGGER IF EXISTS challan_items_delivery_progress_trigger ON challan_items;
CREATE TRIGGER challan_items_delivery_progress_trigger
    AFTER INSERT OR UPDATE OR DELETE ON challan_items
    FOR EACH ROW EXECUTE FUNCTION update_delivery_progress();

-- =====================================
-- SECTION 5: INITIAL DATA UPDATES
-- =====================================

-- Update existing order_items with calculated delivered quantities (safe)
UPDATE order_items SET
    total_delivered = COALESCE(delivered_calc.total_delivered, 0),
    remaining_quantity = COALESCE(quantity, 0) - COALESCE(delivered_calc.total_delivered, 0)
FROM (
    SELECT 
        oi.id as order_item_id,
        SUM(ci.quantity) as total_delivered
    FROM order_items oi
    LEFT JOIN challan_items ci ON oi.id = ci.order_item_id
    LEFT JOIN delivery_challans dc ON ci.challan_id = dc.id
    WHERE COALESCE(dc.is_deleted, FALSE) = FALSE
    GROUP BY oi.id
) delivered_calc
WHERE order_items.id = delivered_calc.order_item_id;

-- Update existing orders with delivery progress (safe)
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
-- VALIDATION AND LOGGING
-- =====================================

-- Verify delivery tracking views
SELECT 
    'DELIVERY TRACKING VALIDATION' as status,
    (SELECT COUNT(*) FROM order_delivery_status) as order_delivery_records,
    (SELECT COUNT(*) FROM order_item_delivery_details) as item_delivery_records,
    (SELECT COUNT(*) FROM customer_delivery_summary) as customer_summary_records,
    (SELECT COUNT(*) FROM pending_deliveries_summary) as pending_deliveries;

-- Check schema additions
SELECT 
    'SCHEMA VALIDATION' as status,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'order_items' AND column_name = 'design_url'
    ) THEN 'design_url added ✅' ELSE 'design_url missing ❌' END as design_url_status,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'order_items' AND column_name = 'total_delivered'
    ) THEN 'total_delivered added ✅' ELSE 'total_delivered missing ❌' END as delivered_status;

-- Log this deployment
INSERT INTO deployment_history (
    deployment_type,
    script_name,
    status,
    description
) VALUES (
    'enhancement',
    '07_DELIVERY_TRACKING_ENHANCEMENTS.sql',
    'completed',
    'Safe delivery tracking enhancements with verified column references and PostgreSQL compatibility'
);

-- Display summary
SELECT 
    'DELIVERY TRACKING SUMMARY' as report_type,
    'Safe schema fixes applied for design_url and delivery tracking' as schema_status,
    'Comprehensive delivery views and functions created with NULL safety' as features_status,
    'Automatic delivery progress tracking enabled with safe triggers' as automation_status,
    'Ready for enhanced delivery management in new environments' as readiness_status;