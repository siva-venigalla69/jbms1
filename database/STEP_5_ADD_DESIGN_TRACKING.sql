-- ============================================================================
-- STEP 5: ADD DESIGN TRACKING SYSTEM
-- Track designs given by customer vs designs pending
-- Digital Textile Printing System
-- Created: 2025-12-21
-- ============================================================================

-- ============================================================================
-- 1. ADD DESIGN TRACKING COLUMNS TO MATERIAL_STOCK
-- ============================================================================

-- Add columns for design tracking
ALTER TABLE material_stock
ADD COLUMN IF NOT EXISTS designs_given INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS designs_pending INTEGER DEFAULT 0;

-- Add comments
COMMENT ON COLUMN material_stock.designs_given IS 'Number of unique designs provided by customer for this batch';
COMMENT ON COLUMN material_stock.designs_pending IS 'Number of designs still pending from customer (total_quantity - designs_given)';
COMMENT ON COLUMN material_stock.designs_available IS 'DEPRECATED: Use designs_given > 0 instead';

-- Update existing records to calculate pending designs
UPDATE material_stock
SET
  designs_given = 0,
  designs_pending = quantity
WHERE designs_given IS NULL;

-- Create index for design tracking queries
CREATE INDEX IF NOT EXISTS idx_material_stock_designs_pending
ON material_stock(designs_pending)
WHERE designs_pending > 0;

DO $$
BEGIN
  RAISE NOTICE '✓ Added design tracking columns: designs_given, designs_pending';
END $$;

-- ============================================================================
-- 2. CREATE HELPER FUNCTION TO UPDATE DESIGN STATUS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_design_count(
  p_customer_id UUID,
  p_material_type VARCHAR,
  p_designs_to_add INTEGER,
  p_stage VARCHAR DEFAULT 'received'
) RETURNS void AS $$
BEGIN
  UPDATE material_stock
  SET
    designs_given = designs_given + p_designs_to_add,
    designs_pending = GREATEST(0, designs_pending - p_designs_to_add),
    updated_at = NOW()
  WHERE customer_id = p_customer_id
    AND material_type = p_material_type
    AND stage = p_stage;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No stock found for customer % with material type % in stage %',
      p_customer_id, p_material_type, p_stage;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_design_count IS 'Update design count when customer provides new designs';

DO $$
BEGIN
  RAISE NOTICE '✓ Created function: update_design_count()';
END $$;

-- ============================================================================
-- 3. CREATE VIEW FOR PENDING DESIGNS (CUSTOMER FOLLOW-UP)
-- ============================================================================

DROP VIEW IF EXISTS v_pending_designs CASCADE;

CREATE VIEW v_pending_designs AS
SELECT
  c.id as customer_id,
  c.name as customer_name,
  c.phone as customer_phone,
  ms.material_type,
  ms.stage,
  ms.quantity as total_quantity,
  ms.designs_given,
  ms.designs_pending,
  ROUND((ms.designs_given::DECIMAL / NULLIF(ms.quantity, 0)) * 100, 1) as design_completion_pct,
  ms.design_notes,
  ms.created_at as stock_received_date,
  ms.updated_at as last_updated
FROM material_stock ms
JOIN customers c ON ms.customer_id = c.id
WHERE ms.designs_pending > 0
  AND ms.stage IN ('received', 'preprocessing')
  AND ms.quantity > 0
ORDER BY ms.designs_pending DESC, c.name;

GRANT SELECT ON v_pending_designs TO authenticated;

DO $$
BEGIN
  RAISE NOTICE '✓ Created view: v_pending_designs (for customer follow-up)';
END $$;

-- ============================================================================
-- 4. UPDATE STOCK MOVEMENT FUNCTION TO AUTO-CALCULATE DESIGNS_PENDING
-- ============================================================================

CREATE OR REPLACE FUNCTION move_stock_to_stage(
  p_customer_id UUID,
  p_order_id UUID,
  p_material_type VARCHAR,
  p_from_stage VARCHAR,
  p_to_stage VARCHAR,
  p_quantity INTEGER,
  p_ownership VARCHAR DEFAULT 'customer'
) RETURNS void AS $$
DECLARE
  v_available_qty INTEGER;
  v_designs_given INTEGER;
BEGIN
  -- Check available stock in source stage
  SELECT quantity, designs_given INTO v_available_qty, v_designs_given
  FROM material_stock
  WHERE customer_id = p_customer_id
    AND COALESCE(order_id, '00000000-0000-0000-0000-000000000000'::UUID) = COALESCE(p_order_id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND material_type = p_material_type
    AND stage = p_from_stage
    AND ownership = p_ownership;

  IF v_available_qty IS NULL OR v_available_qty < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock in % stage. Available: %, Requested: %',
      p_from_stage, COALESCE(v_available_qty, 0), p_quantity;
  END IF;

  -- Reduce quantity in source stage
  UPDATE material_stock
  SET quantity = quantity - p_quantity,
      updated_at = NOW()
  WHERE customer_id = p_customer_id
    AND COALESCE(order_id, '00000000-0000-0000-0000-000000000000'::UUID) = COALESCE(p_order_id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND material_type = p_material_type
    AND stage = p_from_stage
    AND ownership = p_ownership;

  -- Add/increase quantity in destination stage
  -- Carry forward designs_given to next stage
  INSERT INTO material_stock (
    customer_id, order_id, material_type, stage, quantity, ownership,
    designs_given, designs_pending, updated_at
  )
  VALUES (
    p_customer_id, p_order_id, p_material_type, p_to_stage, p_quantity, p_ownership,
    v_designs_given, GREATEST(0, p_quantity - v_designs_given), NOW()
  )
  ON CONFLICT (customer_id, COALESCE(order_id, '00000000-0000-0000-0000-000000000000'::UUID), material_type, stage, ownership)
  DO UPDATE SET
    quantity = material_stock.quantity + p_quantity,
    designs_given = GREATEST(material_stock.designs_given, v_designs_given),
    designs_pending = GREATEST(0, material_stock.quantity + p_quantity - GREATEST(material_stock.designs_given, v_designs_given)),
    updated_at = NOW();

  -- Clean up zero quantity records
  DELETE FROM material_stock WHERE quantity = 0;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  RAISE NOTICE '✓ Updated function: move_stock_to_stage() - now tracks designs';
END $$;

-- ============================================================================
-- 5. CREATE TRIGGER TO AUTO-CALCULATE DESIGNS_PENDING
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_calculate_designs_pending()
RETURNS TRIGGER AS $$
BEGIN
  NEW.designs_pending := GREATEST(0, NEW.quantity - NEW.designs_given);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_designs_pending ON material_stock;

CREATE TRIGGER trigger_auto_designs_pending
BEFORE INSERT OR UPDATE ON material_stock
FOR EACH ROW
EXECUTE FUNCTION auto_calculate_designs_pending();

DO $$
BEGIN
  RAISE NOTICE '✓ Created trigger: auto_calculate_designs_pending';
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  col_count INTEGER;
  func_exists BOOLEAN;
  view_exists BOOLEAN;
  trigger_exists BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'STEP 5 VERIFICATION';
  RAISE NOTICE '========================================================================';

  -- Check columns
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_name = 'material_stock'
    AND column_name IN ('designs_given', 'designs_pending');

  RAISE NOTICE '✓ Design tracking columns: % / 2', col_count;

  -- Check function
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_design_count'
  ) INTO func_exists;

  RAISE NOTICE '✓ Function update_design_count: %',
    CASE WHEN func_exists THEN 'EXISTS' ELSE 'MISSING' END;

  -- Check view
  SELECT EXISTS (
    SELECT 1 FROM pg_views WHERE viewname = 'v_pending_designs'
  ) INTO view_exists;

  RAISE NOTICE '✓ View v_pending_designs: %',
    CASE WHEN view_exists THEN 'EXISTS' ELSE 'MISSING' END;

  -- Check trigger
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_auto_designs_pending'
  ) INTO trigger_exists;

  RAISE NOTICE '✓ Trigger auto_designs_pending: %',
    CASE WHEN trigger_exists THEN 'EXISTS' ELSE 'MISSING' END;

  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'STEP 5 COMPLETE!';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Features Added:';
  RAISE NOTICE '  ✓ Track designs given by customer';
  RAISE NOTICE '  ✓ Track designs pending for follow-up';
  RAISE NOTICE '  ✓ Auto-calculate pending designs';
  RAISE NOTICE '  ✓ View for customer follow-up (v_pending_designs)';
  RAISE NOTICE '  ✓ Helper function to update design counts';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Run TEST_USE_CASE_CUSTOMER_99_UPDATED.sql';
  RAISE NOTICE '';
END $$;
