-- ============================================================================
-- CREATE SIMPLIFIED VIEWS FOR 13-TABLE SCHEMA
-- Digital Textile Printing System
-- Created: 2025-12-21
-- ============================================================================

-- Drop existing views if they exist
DROP VIEW IF EXISTS v_stock_by_customer CASCADE;
DROP VIEW IF EXISTS v_outstanding_payments CASCADE;
DROP VIEW IF EXISTS v_outstanding_orders CASCADE;
DROP VIEW IF EXISTS v_misprint_stock CASCADE;

-- ============================================================================
-- 1. STOCK BY CUSTOMER VIEW
-- Shows current stock summary grouped by customer and material type
-- ============================================================================
CREATE VIEW v_stock_by_customer AS
SELECT
    ms.customer_id,
    COALESCE(c.name, 'Own Stock') as customer_name,
    ms.material_type,
    ms.ownership,
    -- Stock by stage
    SUM(CASE WHEN ms.stage = 'received' THEN ms.quantity ELSE 0 END) as received,
    SUM(CASE WHEN ms.stage = 'preprocessing' THEN ms.quantity ELSE 0 END) as preprocessing,
    SUM(CASE WHEN ms.stage = 'printing' THEN ms.quantity ELSE 0 END) as printing,
    SUM(CASE WHEN ms.stage = 'postprocessing' THEN ms.quantity ELSE 0 END) as postprocessing,
    SUM(CASE WHEN ms.stage = 'completed' THEN ms.quantity ELSE 0 END) as completed,
    SUM(CASE WHEN ms.stage = 'misprint' THEN ms.quantity ELSE 0 END) as misprint,
    SUM(CASE WHEN ms.stage = 'damaged' THEN ms.quantity ELSE 0 END) as damaged,
    SUM(ms.quantity) as total_quantity
FROM material_stock ms
LEFT JOIN customers c ON ms.customer_id = c.id
WHERE ms.quantity > 0
GROUP BY ms.customer_id, c.name, ms.material_type, ms.ownership
ORDER BY customer_name, ms.material_type;

-- ============================================================================
-- 2. OUTSTANDING PAYMENTS VIEW
-- Shows customers with unpaid invoices
-- ============================================================================
CREATE VIEW v_outstanding_payments AS
SELECT
    c.id as customer_id,
    c.name as customer_name,
    COUNT(DISTINCT gi.id) as invoice_count,
    COALESCE(SUM(gi.total_amount), 0) as total_invoiced,
    COALESCE(SUM(p.amount), 0) as total_paid,
    COALESCE(SUM(gi.total_amount), 0) - COALESCE(SUM(p.amount), 0) as outstanding_amount
FROM customers c
LEFT JOIN gst_invoices gi ON c.id = gi.customer_id AND gi.status != 'cancelled'
LEFT JOIN payments p ON gi.id = p.invoice_id
WHERE c.is_active = true
GROUP BY c.id, c.name
HAVING (COALESCE(SUM(gi.total_amount), 0) - COALESCE(SUM(p.amount), 0)) > 0
ORDER BY outstanding_amount DESC;

-- ============================================================================
-- 3. OUTSTANDING ORDERS VIEW (PENDING DELIVERIES)
-- Shows orders with pending deliveries
-- For simplified schema: we track total material received vs delivered
-- ============================================================================
CREATE VIEW v_outstanding_orders AS
SELECT
    c.id as customer_id,
    c.name as customer_name,
    o.id as order_id,
    o.order_number,
    mi.material_type,
    SUM(mi.quantity) as total_quantity,
    -- Calculate delivered quantity from delivery challans
    COALESCE((
        SELECT SUM(ci.quantity)
        FROM delivery_challans dc
        JOIN challan_items ci ON dc.id = ci.challan_id
        WHERE dc.order_id = o.id
        AND ci.material_type = mi.material_type
    ), 0) as delivered_quantity,
    -- Pending = Total - Delivered
    SUM(mi.quantity) - COALESCE((
        SELECT SUM(ci.quantity)
        FROM delivery_challans dc
        JOIN challan_items ci ON dc.id = ci.challan_id
        WHERE dc.order_id = o.id
        AND ci.material_type = mi.material_type
    ), 0) as pending_quantity
FROM customers c
JOIN orders o ON c.id = o.customer_id
JOIN material_in mi ON o.id = mi.order_id
WHERE c.is_active = true
    AND o.status = 'active'
GROUP BY c.id, c.name, o.id, o.order_number, mi.material_type
HAVING SUM(mi.quantity) - COALESCE((
    SELECT SUM(ci.quantity)
    FROM delivery_challans dc
    JOIN challan_items ci ON dc.id = ci.challan_id
    WHERE dc.order_id = o.id
    AND ci.material_type = mi.material_type
), 0) > 0
ORDER BY c.name, o.order_number;

-- ============================================================================
-- 4. MISPRINT STOCK VIEW
-- Shows all misprint stock available for sale
-- ============================================================================
CREATE VIEW v_misprint_stock AS
SELECT
    ms.id,
    ms.material_type,
    ms.ownership,
    ms.quantity,
    COALESCE(c.name, 'Own Stock') as customer_name,
    ms.created_at,
    ms.design_notes
FROM material_stock ms
LEFT JOIN customers c ON ms.customer_id = c.id
WHERE ms.stage = 'misprint'
    AND ms.quantity > 0
ORDER BY ms.created_at DESC;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT SELECT ON v_stock_by_customer TO authenticated;
GRANT SELECT ON v_outstanding_payments TO authenticated;
GRANT SELECT ON v_outstanding_orders TO authenticated;
GRANT SELECT ON v_misprint_stock TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test the views
-- SELECT * FROM v_stock_by_customer;
-- SELECT * FROM v_outstanding_payments;
-- SELECT * FROM v_outstanding_orders;
-- SELECT * FROM v_misprint_stock;
