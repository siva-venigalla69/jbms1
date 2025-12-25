-- FIX CHALLAN_ITEMS TABLE STRUCTURE
-- Problem: challan_items references order_items table which doesn't exist
-- Solution: Make challan_items directly store material_type and quantity
-- Digital Textile Printing System
-- Created: 2025-12-23
-- RERUNNABLE: Safe to execute multiple times

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FIX: Challan Items Structure';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- Step 1: Drop the problematic FK constraint to order_items
DO $$
BEGIN
  -- Check if constraint exists and drop it
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'challan_items_order_item_id_fkey'
    AND table_name = 'challan_items'
  ) THEN
    ALTER TABLE challan_items DROP CONSTRAINT challan_items_order_item_id_fkey;
    RAISE NOTICE 'Dropped FK constraint: challan_items_order_item_id_fkey';
  ELSE
    RAISE NOTICE 'FK constraint challan_items_order_item_id_fkey does not exist';
  END IF;
END $$;

-- Step 2: Rename order_item_id to material_type (or drop and recreate)
DO $$
BEGIN
  -- Drop order_item_id column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'challan_items' AND column_name = 'order_item_id'
  ) THEN
    ALTER TABLE challan_items DROP COLUMN order_item_id;
    RAISE NOTICE 'Dropped column: order_item_id';
  END IF;

  -- Add material_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'challan_items' AND column_name = 'material_type'
  ) THEN
    ALTER TABLE challan_items ADD COLUMN material_type VARCHAR(50) NOT NULL DEFAULT 'SAREE';
    RAISE NOTICE 'Added column: material_type';
  ELSE
    RAISE NOTICE 'Column material_type already exists';
  END IF;
END $$;

-- Step 3: Add order_id column (for reference)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'challan_items' AND column_name = 'order_id'
  ) THEN
    ALTER TABLE challan_items ADD COLUMN order_id UUID REFERENCES orders(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added column: order_id';
  ELSE
    RAISE NOTICE 'Column order_id already exists';
  END IF;
END $$;

-- Step 4: Drop unnecessary design columns (optional - they were likely never used)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'challan_items' AND column_name = 'design_id'
  ) THEN
    ALTER TABLE challan_items DROP COLUMN design_id;
    RAISE NOTICE 'Dropped column: design_id';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'challan_items' AND column_name = 'design_name'
  ) THEN
    ALTER TABLE challan_items DROP COLUMN design_name;
    RAISE NOTICE 'Dropped column: design_name';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'challan_items' AND column_name = 'production_batch'
  ) THEN
    ALTER TABLE challan_items DROP COLUMN production_batch;
    RAISE NOTICE 'Dropped column: production_batch';
  END IF;
END $$;

-- Step 5: Add notes column for additional info
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'challan_items' AND column_name = 'notes'
  ) THEN
    ALTER TABLE challan_items ADD COLUMN notes TEXT;
    RAISE NOTICE 'Added column: notes';
  ELSE
    RAISE NOTICE 'Column notes already exists';
  END IF;
END $$;

-- Step 6: Remove DEFAULT from material_type after data migration
DO $$
BEGIN
  ALTER TABLE challan_items ALTER COLUMN material_type DROP DEFAULT;
  RAISE NOTICE 'Removed DEFAULT from material_type';
END $$;

-- Step 7: Add index for better performance
CREATE INDEX IF NOT EXISTS idx_challan_items_challan_id ON challan_items(challan_id);
CREATE INDEX IF NOT EXISTS idx_challan_items_order_id ON challan_items(order_id);
CREATE INDEX IF NOT EXISTS idx_challan_items_material_type ON challan_items(material_type);

DO $$
BEGIN
  RAISE NOTICE 'Created indexes on challan_items';
END $$;

-- Step 8: Add comments
COMMENT ON TABLE challan_items IS 'Items delivered in each delivery challan - stores material type and quantity directly';
COMMENT ON COLUMN challan_items.challan_id IS 'Reference to delivery challan';
COMMENT ON COLUMN challan_items.material_type IS 'Type of material: SAREE, VONI, DUPPATTA, etc.';
COMMENT ON COLUMN challan_items.quantity IS 'Quantity of this material type delivered';
COMMENT ON COLUMN challan_items.order_id IS 'Reference to order (for traceability)';
COMMENT ON COLUMN challan_items.notes IS 'Additional notes about this item';

-- Step 9: Verify final structure
DO $$
DECLARE
  v_columns TEXT;
BEGIN
  SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) INTO v_columns
  FROM information_schema.columns
  WHERE table_name = 'challan_items';

  RAISE NOTICE '';
  RAISE NOTICE 'Final challan_items structure:';
  RAISE NOTICE '  Columns: %', v_columns;
  RAISE NOTICE '';
END $$;

-- Step 10: Create helper view for delivery challan details
DROP VIEW IF EXISTS v_delivery_challan_details CASCADE;

CREATE VIEW v_delivery_challan_details AS
SELECT
  dc.id as challan_id,
  dc.challan_number,
  dc.challan_date,
  c.id as customer_id,
  c.name as customer_name,
  o.id as order_id,
  o.order_number,
  ci.material_type,
  ci.quantity,
  ci.notes as item_notes,
  dc.notes as challan_notes,
  dc.delivery_status,
  dc.total_amount,
  dc.is_invoiced
FROM delivery_challans dc
JOIN customers c ON dc.customer_id = c.id
LEFT JOIN orders o ON dc.order_id = o.id
LEFT JOIN challan_items ci ON dc.id = ci.challan_id
WHERE COALESCE(dc.is_deleted, FALSE) = FALSE
ORDER BY dc.challan_date DESC, ci.material_type;

GRANT SELECT ON v_delivery_challan_details TO authenticated;

COMMENT ON VIEW v_delivery_challan_details IS 'Complete delivery challan details with customer, order, and items for printing';

DO $$
BEGIN
  RAISE NOTICE 'Created view: v_delivery_challan_details';
  RAISE NOTICE '';
END $$;

SELECT '==== CHALLAN ITEMS FIX COMPLETE ====' as status;
SELECT 'Structure: challan_items now directly stores material_type and quantity' as result;
SELECT 'View: v_delivery_challan_details created for printing delivery challans' as feature;

-- Example query to print delivery challan
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'TO PRINT DELIVERY CHALLAN:';
  RAISE NOTICE '';
  RAISE NOTICE 'SELECT * FROM v_delivery_challan_details';
  RAISE NOTICE 'WHERE challan_number = ''DC-001'';';
  RAISE NOTICE '';
  RAISE NOTICE 'This will show:';
  RAISE NOTICE '  - Customer name, Order number';
  RAISE NOTICE '  - Each material type and quantity';
  RAISE NOTICE '  - Challan date, status, amount';
  RAISE NOTICE '';
END $$;
