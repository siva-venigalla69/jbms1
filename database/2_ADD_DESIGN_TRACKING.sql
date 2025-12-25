-- STEP 2: ADD DESIGN TRACKING SYSTEM
-- Track designs given by customer vs designs pending
-- Digital Textile Printing System
-- Created: 2025-12-21
-- RERUNNABLE: Safe to execute multiple times

-- Add design tracking columns (safe if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'material_stock' AND column_name = 'designs_given'
  ) THEN
    ALTER TABLE material_stock ADD COLUMN designs_given INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'material_stock' AND column_name = 'designs_pending'
  ) THEN
    ALTER TABLE material_stock ADD COLUMN designs_pending INTEGER DEFAULT 0;
  END IF;
END $$;

COMMENT ON COLUMN material_stock.designs_given IS 'Number of unique designs provided by customer for this batch';
COMMENT ON COLUMN material_stock.designs_pending IS 'Number of designs still pending from customer';

-- Update existing records (only if not already set)
UPDATE material_stock
SET designs_given = 0, designs_pending = quantity
WHERE designs_given IS NULL OR designs_pending IS NULL;

-- Create index (safe if already exists)
CREATE INDEX IF NOT EXISTS idx_material_stock_designs_pending
ON material_stock(designs_pending)
WHERE designs_pending > 0;

-- Drop and recreate helper function
DROP FUNCTION IF EXISTS update_design_count(UUID, VARCHAR, INTEGER, VARCHAR);

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

-- Drop and recreate view for pending designs
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

-- Drop and recreate stock movement function with design tracking
DROP FUNCTION IF EXISTS move_stock_to_stage(UUID, UUID, VARCHAR, VARCHAR, VARCHAR, INTEGER, VARCHAR);

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
  SELECT quantity, COALESCE(designs_given, 0) INTO v_available_qty, v_designs_given
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
  SET quantity = quantity - p_quantity, updated_at = NOW()
  WHERE customer_id = p_customer_id
    AND COALESCE(order_id, '00000000-0000-0000-0000-000000000000'::UUID) = COALESCE(p_order_id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND material_type = p_material_type
    AND stage = p_from_stage
    AND ownership = p_ownership;

  -- Add to destination stage with designs
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

-- Drop and recreate trigger to auto-calculate designs_pending
DROP TRIGGER IF EXISTS trigger_auto_designs_pending ON material_stock;

DROP FUNCTION IF EXISTS auto_calculate_designs_pending();

CREATE OR REPLACE FUNCTION auto_calculate_designs_pending()
RETURNS TRIGGER AS $$
BEGIN
  NEW.designs_pending := GREATEST(0, NEW.quantity - COALESCE(NEW.designs_given, 0));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_designs_pending
BEFORE INSERT OR UPDATE ON material_stock
FOR EACH ROW
EXECUTE FUNCTION auto_calculate_designs_pending();

SELECT 'STEP 2 COMPLETE - Design tracking added! (Rerunnable)' AS status;
