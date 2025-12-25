-- ============================================================================
-- FIX DASHBOARD VIEW - Add missing pending_quantity column
-- Digital Textile Printing System
-- Created: 2025-12-21
-- ============================================================================

-- Recreate v_outstanding_orders with pending_quantity
DROP VIEW IF EXISTS v_outstanding_orders CASCADE;

CREATE VIEW v_outstanding_orders AS
SELECT
  c.id AS customer_id,
  c.name AS customer_name,
  o.id AS order_id,
  o.order_number,
  mi.material_type,
  COALESCE(SUM(mi.quantity), 0) AS total_quantity,
  COALESCE((
    SELECT SUM(ci.quantity)
    FROM delivery_challans dc
    JOIN challan_items ci ON dc.id = ci.challan_id
    WHERE dc.customer_id = c.id AND dc.order_id = o.id
  ), 0) AS delivered_quantity,
  -- THIS IS THE MISSING COLUMN:
  COALESCE(SUM(mi.quantity), 0) - COALESCE((
    SELECT SUM(ci.quantity)
    FROM delivery_challans dc
    JOIN challan_items ci ON dc.id = ci.challan_id
    WHERE dc.customer_id = c.id AND dc.order_id = o.id
  ), 0) AS pending_quantity
FROM orders o
JOIN customers c ON o.customer_id = c.id
LEFT JOIN material_in mi ON o.id = mi.order_id
WHERE o.status = 'active'
GROUP BY c.id, c.name, o.id, o.order_number, mi.material_type
HAVING COALESCE(SUM(mi.quantity), 0) - COALESCE((
  SELECT SUM(ci.quantity)
  FROM delivery_challans dc
  JOIN challan_items ci ON dc.id = ci.challan_id
  WHERE dc.customer_id = c.id AND dc.order_id = o.id
), 0) > 0;

GRANT SELECT ON v_outstanding_orders TO authenticated;

-- Test the fix
SELECT 'Dashboard view fixed! Run: SELECT * FROM v_outstanding_orders;' AS status;
