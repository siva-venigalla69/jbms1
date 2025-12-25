-- STEP 6: ADD BATCH TRACKING COLUMNS TO MATERIAL_STOCK
-- Enhances inventory tracking with proper lineage and batch tracking
-- Digital Textile Printing System
-- Created: 2025-12-22
-- RERUNNABLE: Safe to execute multiple times

-- This is NOT SCD Type 2 - it's Inventory Transaction Log with Batch Tracking
-- See STOCK_TRACKING_PATTERN_ANALYSIS.md for detailed explanation

-- Step 1: Add new columns
DO $$
BEGIN
  -- Add batch_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'material_stock' AND column_name = 'batch_id'
  ) THEN
    ALTER TABLE material_stock ADD COLUMN batch_id UUID;
    RAISE NOTICE 'Added batch_id column';
  ELSE
    RAISE NOTICE 'Column batch_id already exists';
  END IF;

  -- Add parent_stock_id column (lineage tracking)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'material_stock' AND column_name = 'parent_stock_id'
  ) THEN
    ALTER TABLE material_stock ADD COLUMN parent_stock_id UUID REFERENCES material_stock(id);
    RAISE NOTICE 'Added parent_stock_id column';
  ELSE
    RAISE NOTICE 'Column parent_stock_id already exists';
  END IF;

  -- Add movement_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'material_stock' AND column_name = 'movement_type'
  ) THEN
    ALTER TABLE material_stock ADD COLUMN movement_type VARCHAR(50);
    RAISE NOTICE 'Added movement_type column';
  ELSE
    RAISE NOTICE 'Column movement_type already exists';
  END IF;

  -- Add moved_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'material_stock' AND column_name = 'moved_at'
  ) THEN
    ALTER TABLE material_stock ADD COLUMN moved_at TIMESTAMP;
    RAISE NOTICE 'Added moved_at column';
  ELSE
    RAISE NOTICE 'Column moved_at already exists';
  END IF;
END $$;

-- Step 2: Add CHECK constraint for movement_type
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'chk_movement_type' AND table_name = 'material_stock'
  ) THEN
    ALTER TABLE material_stock DROP CONSTRAINT chk_movement_type;
  END IF;

  -- Add new constraint
  ALTER TABLE material_stock ADD CONSTRAINT chk_movement_type
    CHECK (movement_type IN (
      'initial_receipt',
      'moved',
      'split_remainder',
      'quality_check_pass',
      'quality_check_fail',
      'merged',
      'returned',
      'delivered',
      'adjustment'
    ));

  RAISE NOTICE 'Added CHECK constraint for movement_type';
END $$;

-- Step 3: Populate existing records with default values
DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Generate batch_id for existing records (group by customer, order, material, ownership)
  UPDATE material_stock
  SET batch_id = (
    SELECT gen_random_uuid()
    FROM material_stock ms2
    WHERE ms2.customer_id = material_stock.customer_id
      AND COALESCE(ms2.order_id::TEXT, 'null') = COALESCE(material_stock.order_id::TEXT, 'null')
      AND ms2.material_type = material_stock.material_type
      AND ms2.ownership = material_stock.ownership
    LIMIT 1
  )
  WHERE batch_id IS NULL;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % records with batch_id', v_updated_count;

  -- Set default movement_type for existing records
  UPDATE material_stock
  SET movement_type = CASE
    WHEN stage = 'received' AND parent_stock_id IS NULL THEN 'initial_receipt'
    WHEN stage = 'misprint' THEN 'quality_check_fail'
    WHEN stage = 'delivered' THEN 'delivered'
    ELSE 'moved'
  END
  WHERE movement_type IS NULL;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % records with movement_type', v_updated_count;

  -- Set moved_at from created_at for existing records
  UPDATE material_stock
  SET moved_at = created_at
  WHERE moved_at IS NULL;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % records with moved_at', v_updated_count;
END $$;

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_material_stock_batch ON material_stock(batch_id);
CREATE INDEX IF NOT EXISTS idx_material_stock_parent ON material_stock(parent_stock_id);
CREATE INDEX IF NOT EXISTS idx_material_stock_movement_type ON material_stock(movement_type);
CREATE INDEX IF NOT EXISTS idx_material_stock_moved_at ON material_stock(moved_at);

DO $$
BEGIN
  RAISE NOTICE 'Created indexes on new columns';
END $$;

-- Step 5: Update move_stock_to_stage function to use new columns
DROP FUNCTION IF EXISTS move_stock_to_stage(UUID, UUID, VARCHAR, VARCHAR, VARCHAR, INTEGER, VARCHAR);

CREATE OR REPLACE FUNCTION move_stock_to_stage(
  p_customer_id UUID,
  p_order_id UUID,
  p_material_type VARCHAR,
  p_from_stage VARCHAR,
  p_to_stage VARCHAR,
  p_quantity INTEGER,
  p_ownership VARCHAR
) RETURNS void AS $$
DECLARE
  v_from_record_id UUID;
  v_available_qty INTEGER;
  v_batch_id UUID;
BEGIN
  -- Find active stock in source stage
  SELECT id, quantity, batch_id INTO v_from_record_id, v_available_qty, v_batch_id
  FROM material_stock
  WHERE customer_id = p_customer_id
    AND COALESCE(order_id::TEXT, 'null') = COALESCE(p_order_id::TEXT, 'null')
    AND material_type = p_material_type
    AND stage = p_from_stage
    AND ownership = p_ownership
    AND is_active = true;

  IF v_from_record_id IS NULL THEN
    RAISE EXCEPTION 'No active stock found in % stage', p_from_stage;
  END IF;

  IF v_available_qty < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock in % stage. Available: %, Requested: %',
      p_from_stage, v_available_qty, p_quantity;
  END IF;

  -- Mark source record as inactive (preserve history)
  UPDATE material_stock
  SET is_active = false, updated_at = NOW()
  WHERE id = v_from_record_id;

  -- Create new record for remaining quantity in source stage (if any)
  IF v_available_qty > p_quantity THEN
    INSERT INTO material_stock (
      customer_id, order_id, material_type, stage, quantity, ownership,
      is_active, batch_id, parent_stock_id, movement_type, moved_at,
      created_at, updated_at
    )
    VALUES (
      p_customer_id, p_order_id, p_material_type, p_from_stage,
      v_available_qty - p_quantity, p_ownership,
      true, v_batch_id, v_from_record_id, 'split_remainder', NOW(),
      NOW(), NOW()
    );
  END IF;

  -- Create new active record in destination stage
  INSERT INTO material_stock (
    customer_id, order_id, material_type, stage, quantity, ownership,
    is_active, batch_id, parent_stock_id, movement_type, moved_at,
    created_at, updated_at
  )
  VALUES (
    p_customer_id, p_order_id, p_material_type, p_to_stage, p_quantity, p_ownership,
    true, v_batch_id, v_from_record_id, 'moved', NOW(),
    NOW(), NOW()
  );

  RAISE NOTICE 'Moved % units: % -> % (batch: %, lineage preserved)', p_quantity, p_from_stage, p_to_stage, v_batch_id;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  RAISE NOTICE 'Updated move_stock_to_stage function with batch tracking';
END $$;

-- Step 6: Create helper view for stock lineage
DROP VIEW IF EXISTS v_stock_lineage CASCADE;

CREATE VIEW v_stock_lineage AS
WITH RECURSIVE lineage AS (
  -- Current active stock
  SELECT
    id,
    parent_stock_id,
    customer_id,
    material_type,
    stage,
    quantity,
    movement_type,
    moved_at,
    batch_id,
    is_active,
    1 as depth
  FROM material_stock
  WHERE is_active = true

  UNION ALL

  -- Parent records
  SELECT
    ms.id,
    ms.parent_stock_id,
    ms.customer_id,
    ms.material_type,
    ms.stage,
    ms.quantity,
    ms.movement_type,
    ms.moved_at,
    ms.batch_id,
    ms.is_active,
    l.depth + 1
  FROM material_stock ms
  JOIN lineage l ON ms.id = l.parent_stock_id
  WHERE l.depth < 10  -- Prevent infinite recursion
)
SELECT * FROM lineage;

GRANT SELECT ON v_stock_lineage TO authenticated;

COMMENT ON VIEW v_stock_lineage IS 'Shows complete lineage of stock movements from origin to current state';

-- Step 7: Verification
SELECT
  'batch_id' as column_name,
  COUNT(*) as total_records,
  COUNT(batch_id) as populated_records,
  COUNT(DISTINCT batch_id) as unique_batches
FROM material_stock
UNION ALL
SELECT
  'parent_stock_id',
  COUNT(*),
  COUNT(parent_stock_id),
  COUNT(DISTINCT parent_stock_id)
FROM material_stock
UNION ALL
SELECT
  'movement_type',
  COUNT(*),
  COUNT(movement_type),
  COUNT(DISTINCT movement_type)
FROM material_stock;

SELECT '==== STEP 6 COMPLETE ====' as status;
SELECT 'Added batch tracking and lineage columns' as result;
SELECT 'Pattern: Inventory Transaction Log (NOT SCD Type 2)' as pattern;
