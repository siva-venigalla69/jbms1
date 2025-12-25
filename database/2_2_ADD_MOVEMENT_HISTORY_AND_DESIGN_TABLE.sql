-- STEP 2.2: ADD MOVEMENT HISTORY AND SEPARATE DESIGN TRACKING
-- Creates audit trail for stock movements and dedicated design tracking table
-- Digital Textile Printing System
-- Created: 2025-12-22
-- RERUNNABLE: Safe to execute multiple times

-- Add is_active column to material_stock for movement history
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'material_stock' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE material_stock ADD COLUMN is_active BOOLEAN DEFAULT true;
    CREATE INDEX idx_material_stock_active ON material_stock(is_active) WHERE is_active = true;
  END IF;
END $$;

COMMENT ON COLUMN material_stock.is_active IS 'true = current active stock, false = historical movement record';

-- Create separate design tracking table (single source of truth)
CREATE TABLE IF NOT EXISTS material_design_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  material_type VARCHAR(50) NOT NULL,
  material_in_id UUID REFERENCES material_in(id) ON DELETE CASCADE,
  batch_identifier VARCHAR(100),
  total_quantity INTEGER NOT NULL DEFAULT 0,
  designs_given INTEGER NOT NULL DEFAULT 0,
  designs_pending INTEGER NOT NULL DEFAULT 0,
  design_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT chk_designs_non_negative CHECK (designs_given >= 0 AND designs_pending >= 0)
);

CREATE INDEX IF NOT EXISTS idx_design_tracking_customer ON material_design_tracking(customer_id);
CREATE INDEX IF NOT EXISTS idx_design_tracking_pending ON material_design_tracking(designs_pending) WHERE designs_pending > 0;

COMMENT ON TABLE material_design_tracking IS 'Tracks design status per material batch (separate from stock movements)';
COMMENT ON COLUMN material_design_tracking.batch_identifier IS 'Identifies related batches (e.g., challan number, receipt date)';
COMMENT ON COLUMN material_design_tracking.total_quantity IS 'Total quantity in this batch across all stages';
COMMENT ON COLUMN material_design_tracking.designs_given IS 'Number of designs provided by customer';
COMMENT ON COLUMN material_design_tracking.designs_pending IS 'Number of designs still pending from customer';

-- Grant permissions
GRANT ALL ON material_design_tracking TO authenticated;

-- Drop old move function and recreate with movement history
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
  v_from_record_id UUID;
BEGIN
  -- Check available stock in source stage (only active records)
  SELECT id, quantity INTO v_from_record_id, v_available_qty
  FROM material_stock
  WHERE customer_id = p_customer_id
    AND COALESCE(order_id, '00000000-0000-0000-0000-000000000000'::UUID) = COALESCE(p_order_id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND material_type = p_material_type
    AND stage = p_from_stage
    AND ownership = p_ownership
    AND is_active = true;

  IF v_available_qty IS NULL OR v_available_qty < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock in % stage. Available: %, Requested: %',
      p_from_stage, COALESCE(v_available_qty, 0), p_quantity;
  END IF;

  -- Mark source record as inactive (preserve history)
  UPDATE material_stock
  SET is_active = false, updated_at = NOW()
  WHERE id = v_from_record_id;

  -- Create new record for remaining quantity in source stage (if any)
  IF v_available_qty > p_quantity THEN
    INSERT INTO material_stock (
      customer_id, order_id, material_type, stage, quantity, ownership, is_active, created_at, updated_at
    )
    VALUES (
      p_customer_id, p_order_id, p_material_type, p_from_stage, v_available_qty - p_quantity, p_ownership, true, NOW(), NOW()
    );
  END IF;

  -- Create new active record in destination stage
  INSERT INTO material_stock (
    customer_id, order_id, material_type, stage, quantity, ownership, is_active, created_at, updated_at
  )
  VALUES (
    p_customer_id, p_order_id, p_material_type, p_to_stage, p_quantity, p_ownership, true, NOW(), NOW()
  );

  RAISE NOTICE 'Moved % units: % -> % (history preserved)', p_quantity, p_from_stage, p_to_stage;
END;
$$ LANGUAGE plpgsql;

-- Update design count function to use design tracking table
DROP FUNCTION IF EXISTS update_design_count(UUID, VARCHAR, INTEGER, VARCHAR);

CREATE OR REPLACE FUNCTION update_design_count(
  p_customer_id UUID,
  p_material_type VARCHAR,
  p_designs_to_add INTEGER,
  p_batch_identifier VARCHAR DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_total_qty INTEGER;
  v_current_designs INTEGER;
  v_tracking_id UUID;
BEGIN
  -- Get total quantity for this customer and material type (from active stock)
  SELECT SUM(quantity) INTO v_total_qty
  FROM material_stock
  WHERE customer_id = p_customer_id
    AND material_type = p_material_type
    AND is_active = true;

  IF v_total_qty IS NULL OR v_total_qty = 0 THEN
    RAISE EXCEPTION 'No active stock found for customer % with material type %', p_customer_id, p_material_type;
  END IF;

  -- Check if design tracking record exists
  SELECT id, designs_given INTO v_tracking_id, v_current_designs
  FROM material_design_tracking
  WHERE customer_id = p_customer_id
    AND material_type = p_material_type
    AND (p_batch_identifier IS NULL OR batch_identifier = p_batch_identifier)
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_tracking_id IS NULL THEN
    -- Create new tracking record
    INSERT INTO material_design_tracking (
      customer_id, material_type, batch_identifier, total_quantity, designs_given, designs_pending, created_at, updated_at
    )
    VALUES (
      p_customer_id, p_material_type, p_batch_identifier, v_total_qty, p_designs_to_add, GREATEST(0, v_total_qty - p_designs_to_add), NOW(), NOW()
    );
    RAISE NOTICE 'Created design tracking: % designs given out of % total', p_designs_to_add, v_total_qty;
  ELSE
    -- Update existing tracking record
    UPDATE material_design_tracking
    SET
      designs_given = designs_given + p_designs_to_add,
      designs_pending = GREATEST(0, total_quantity - (designs_given + p_designs_to_add)),
      updated_at = NOW()
    WHERE id = v_tracking_id;
    RAISE NOTICE 'Updated design tracking: % designs given (was %), % pending',
      v_current_designs + p_designs_to_add, v_current_designs, GREATEST(0, v_total_qty - (v_current_designs + p_designs_to_add));
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Recreate pending designs view to use design tracking table
DROP VIEW IF EXISTS v_pending_designs CASCADE;

CREATE VIEW v_pending_designs AS
SELECT
  c.id as customer_id,
  c.name as customer_name,
  c.phone as customer_phone,
  dt.material_type,
  dt.total_quantity,
  dt.designs_given,
  dt.designs_pending,
  ROUND((dt.designs_given::DECIMAL / NULLIF(dt.total_quantity, 0)) * 100, 1) as design_completion_pct,
  dt.design_notes,
  dt.created_at as tracking_started,
  dt.updated_at as last_updated
FROM material_design_tracking dt
JOIN customers c ON dt.customer_id = c.id
WHERE dt.designs_pending > 0
ORDER BY dt.designs_pending DESC, c.name;

GRANT SELECT ON v_pending_designs TO authenticated;

-- Create view for stock movement history
DROP VIEW IF EXISTS v_stock_movement_history CASCADE;

CREATE VIEW v_stock_movement_history AS
SELECT
  ms.id,
  c.name as customer_name,
  ms.customer_id,
  o.order_number,
  ms.order_id,
  ms.material_type,
  ms.stage,
  ms.quantity,
  ms.ownership,
  ms.is_active,
  ms.created_at as moved_at,
  ms.updated_at
FROM material_stock ms
JOIN customers c ON ms.customer_id = c.id
LEFT JOIN orders o ON ms.order_id = o.id
ORDER BY ms.customer_id, ms.material_type, ms.created_at DESC;

GRANT SELECT ON v_stock_movement_history TO authenticated;

COMMENT ON VIEW v_stock_movement_history IS 'Complete audit trail of all stock movements (active and historical)';

-- Remove design columns from material_stock (will be migrated to design_tracking)
-- Note: We keep them for now but will populate design_tracking from existing data
DO $$
DECLARE
  v_customer_id UUID;
  v_material_type VARCHAR;
  v_designs_given INTEGER;
  v_total_qty INTEGER;
BEGIN
  -- Migrate existing design data to design_tracking table
  FOR v_customer_id, v_material_type, v_designs_given, v_total_qty IN
    SELECT customer_id, material_type, COALESCE(designs_given, 0), SUM(quantity)
    FROM material_stock
    WHERE designs_given > 0 AND is_active = true
    GROUP BY customer_id, material_type, designs_given
  LOOP
    INSERT INTO material_design_tracking (
      customer_id, material_type, total_quantity, designs_given, designs_pending, created_at, updated_at
    )
    VALUES (
      v_customer_id, v_material_type, v_total_qty, v_designs_given, GREATEST(0, v_total_qty - v_designs_given), NOW(), NOW()
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Migrated existing design data to material_design_tracking table';
END $$;

-- Create function to get current design status for a stock item
DROP FUNCTION IF EXISTS get_design_status(UUID, VARCHAR);

CREATE OR REPLACE FUNCTION get_design_status(
  p_customer_id UUID,
  p_material_type VARCHAR
) RETURNS TABLE (
  designs_given INTEGER,
  designs_pending INTEGER,
  design_completion_pct DECIMAL,
  design_notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dt.designs_given,
    dt.designs_pending,
    ROUND((dt.designs_given::DECIMAL / NULLIF(dt.total_quantity, 0)) * 100, 1) as design_completion_pct,
    dt.design_notes
  FROM material_design_tracking dt
  WHERE dt.customer_id = p_customer_id
    AND dt.material_type = p_material_type
  ORDER BY dt.updated_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

SELECT 'STEP 2.2 COMPLETE - Movement history and design tracking table added!' AS status;
