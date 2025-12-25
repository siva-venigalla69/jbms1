-- ============================================================================
-- ADD ORDER ITEMS TABLE - Support Multiple Line Items Per Order
-- ============================================================================
-- This allows orders to have multiple material types with quantities
-- Example: Order #123 could have 90 SAREES + 20 DUPPATTAS + 5 VONIS
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'ADDING ORDER_ITEMS TABLE FOR MULTI-ITEM ORDERS';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- CREATE ORDER_ITEMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  material_type VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_material ON order_items(material_type);

-- Add foreign key to material_types if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_types') THEN
    -- Add constraint to ensure material_type exists in material_types table
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'fk_order_items_material_type'
    ) THEN
      ALTER TABLE order_items
        ADD CONSTRAINT fk_order_items_material_type
        FOREIGN KEY (material_type)
        REFERENCES material_types(type_code);
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE '[✓] Created order_items table';
  RAISE NOTICE '    - Supports multiple line items per order';
  RAISE NOTICE '    - Tracks material_type, quantity, and unit_price';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- CREATE FUNCTION TO AUTO-UPDATE ORDER TOTAL_QUANTITY
-- ============================================================================

CREATE OR REPLACE FUNCTION update_order_total_quantity()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the orders table with sum of all item quantities
  UPDATE orders
  SET
    total_quantity = (
      SELECT COALESCE(SUM(quantity), 0)
      FROM order_items
      WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update total_quantity
DROP TRIGGER IF EXISTS trg_update_order_total ON order_items;
CREATE TRIGGER trg_update_order_total
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_order_total_quantity();

DO $$
BEGIN
  RAISE NOTICE '[✓] Created trigger to auto-update order total_quantity';
  RAISE NOTICE '    - Automatically sums quantities from order_items';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- CREATE VIEW FOR ORDER DETAILS WITH ITEMS
-- ============================================================================

CREATE OR REPLACE VIEW v_order_details AS
SELECT
  o.id AS order_id,
  o.order_number,
  o.customer_id,
  c.name AS customer_name,
  c.phone AS customer_phone,
  o.ownership_type,
  o.total_quantity,
  o.status,
  o.order_date,
  o.expected_delivery_date,
  o.notes AS order_notes,
  o.created_at,
  o.updated_at,
  -- Aggregate order items
  COALESCE(
    json_agg(
      json_build_object(
        'id', oi.id,
        'material_type', oi.material_type,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price,
        'notes', oi.notes
      ) ORDER BY oi.created_at
    ) FILTER (WHERE oi.id IS NOT NULL),
    '[]'::json
  ) AS items
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY
  o.id, o.order_number, o.customer_id, c.name, c.phone,
  o.ownership_type, o.total_quantity, o.status, o.order_date,
  o.expected_delivery_date, o.notes, o.created_at, o.updated_at;

DO $$
BEGIN
  RAISE NOTICE '[✓] Created v_order_details view';
  RAISE NOTICE '    - Shows orders with their line items as JSON array';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- CREATE HELPER FUNCTIONS FOR ORDER ITEMS
-- ============================================================================

-- Function to add item to order
CREATE OR REPLACE FUNCTION add_order_item(
  p_order_id UUID,
  p_material_type VARCHAR(50),
  p_quantity INTEGER,
  p_unit_price DECIMAL(10, 2) DEFAULT 0,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_item_id UUID;
BEGIN
  -- Insert the order item
  INSERT INTO order_items (
    order_id,
    material_type,
    quantity,
    unit_price,
    notes
  ) VALUES (
    p_order_id,
    p_material_type,
    p_quantity,
    p_unit_price,
    p_notes
  )
  RETURNING id INTO v_item_id;

  -- Trigger will automatically update order total_quantity

  RETURN v_item_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update order item
CREATE OR REPLACE FUNCTION update_order_item(
  p_item_id UUID,
  p_quantity INTEGER DEFAULT NULL,
  p_unit_price DECIMAL(10, 2) DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE order_items
  SET
    quantity = COALESCE(p_quantity, quantity),
    unit_price = COALESCE(p_unit_price, unit_price),
    notes = COALESCE(p_notes, notes),
    updated_at = NOW()
  WHERE id = p_item_id;

  -- Trigger will automatically update order total_quantity

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to delete order item
CREATE OR REPLACE FUNCTION delete_order_item(p_item_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM order_items WHERE id = p_item_id;

  -- Trigger will automatically update order total_quantity

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  RAISE NOTICE '[✓] Created helper functions:';
  RAISE NOTICE '    - add_order_item()';
  RAISE NOTICE '    - update_order_item()';
  RAISE NOTICE '    - delete_order_item()';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- TEST THE SETUP
-- ============================================================================

DO $$
DECLARE
  v_test_customer_id UUID;
  v_test_order_id UUID;
  v_item1_id UUID;
  v_item2_id UUID;
  v_total_qty INTEGER;
BEGIN
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'TESTING ORDER_ITEMS FUNCTIONALITY';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';

  -- Create test customer
  INSERT INTO customers (name, phone, email, address)
  VALUES ('TEST_ORDER_ITEMS_CUSTOMER', '9999999999', 'test@example.com', 'Test Address')
  RETURNING id INTO v_test_customer_id;

  RAISE NOTICE '[1] Created test customer: %', v_test_customer_id;

  -- Create test order (total_quantity will be 0 initially)
  INSERT INTO orders (customer_id, ownership_type, status)
  VALUES (v_test_customer_id, 'customer_material', 'active')
  RETURNING id INTO v_test_order_id;

  RAISE NOTICE '[2] Created test order: %', v_test_order_id;

  -- Add first item (50 SAREES)
  SELECT add_order_item(
    v_test_order_id,
    'SAREE',
    50,
    100.00,
    'First batch'
  ) INTO v_item1_id;

  RAISE NOTICE '[3] Added 50 SAREES';

  -- Add second item (20 DUPPATTAS)
  SELECT add_order_item(
    v_test_order_id,
    'DUPATTA',
    20,
    50.00,
    'Second batch'
  ) INTO v_item2_id;

  RAISE NOTICE '[4] Added 20 DUPPATTAS';

  -- Verify total_quantity was auto-updated
  SELECT total_quantity INTO v_total_qty
  FROM orders
  WHERE id = v_test_order_id;

  IF v_total_qty = 70 THEN
    RAISE NOTICE '[5] ✓ Total quantity auto-updated correctly: % (expected 70)', v_total_qty;
  ELSE
    RAISE EXCEPTION 'Total quantity incorrect: % (expected 70)', v_total_qty;
  END IF;

  -- Test update item
  PERFORM update_order_item(v_item1_id, 60, NULL, 'Updated quantity');

  SELECT total_quantity INTO v_total_qty
  FROM orders
  WHERE id = v_test_order_id;

  IF v_total_qty = 80 THEN
    RAISE NOTICE '[6] ✓ Updated item quantity, total now: % (expected 80)', v_total_qty;
  ELSE
    RAISE EXCEPTION 'Total quantity after update incorrect: % (expected 80)', v_total_qty;
  END IF;

  -- Test delete item
  PERFORM delete_order_item(v_item2_id);

  SELECT total_quantity INTO v_total_qty
  FROM orders
  WHERE id = v_test_order_id;

  IF v_total_qty = 60 THEN
    RAISE NOTICE '[7] ✓ Deleted item, total now: % (expected 60)', v_total_qty;
  ELSE
    RAISE EXCEPTION 'Total quantity after delete incorrect: % (expected 60)', v_total_qty;
  END IF;

  -- Cleanup
  DELETE FROM orders WHERE id = v_test_order_id;
  DELETE FROM customers WHERE id = v_test_customer_id;

  RAISE NOTICE '[8] ✓ Cleanup complete';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'ALL TESTS PASSED ✓';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'ORDER_ITEMS TABLE SETUP COMPLETE';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables Created:';
  RAISE NOTICE '  ✓ order_items - Line items for each order';
  RAISE NOTICE '';
  RAISE NOTICE 'Views Created:';
  RAISE NOTICE '  ✓ v_order_details - Orders with items as JSON array';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions Created:';
  RAISE NOTICE '  ✓ add_order_item()';
  RAISE NOTICE '  ✓ update_order_item()';
  RAISE NOTICE '  ✓ delete_order_item()';
  RAISE NOTICE '  ✓ update_order_total_quantity() - Auto-update trigger';
  RAISE NOTICE '';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '  ✓ Multiple material types per order';
  RAISE NOTICE '  ✓ Auto-calculation of total_quantity';
  RAISE NOTICE '  ✓ Add items to existing orders';
  RAISE NOTICE '  ✓ Update/delete individual items';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
END $$;
