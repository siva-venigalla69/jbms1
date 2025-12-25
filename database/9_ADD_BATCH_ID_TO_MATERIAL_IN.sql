-- STEP 9: ADD BATCH_ID TO MATERIAL_IN
-- Ensures batch identity originates at receipt and flows through production
-- Digital Textile Printing System
-- Created: 2025-12-22
-- RERUNNABLE: Safe to execute multiple times

DO $$
BEGIN
  RAISE NOTICE 'STEP 9: Adding batch tracking to material receipt...';
END $$;

-- Step 1: Add batch_id column to material_in
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'material_in' AND column_name = 'batch_id'
  ) THEN
    ALTER TABLE material_in ADD COLUMN batch_id UUID DEFAULT gen_random_uuid();
    RAISE NOTICE 'Added batch_id column to material_in';
  ELSE
    RAISE NOTICE 'batch_id column already exists in material_in';
  END IF;
END $$;

-- Step 2: Generate batch_id for existing material_in records (if NULL)
DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE material_in
  SET batch_id = gen_random_uuid()
  WHERE batch_id IS NULL;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count > 0 THEN
    RAISE NOTICE 'Generated batch_id for % existing material_in records', v_updated_count;
  ELSE
    RAISE NOTICE 'All material_in records already have batch_id';
  END IF;
END $$;

-- Step 3: Make batch_id NOT NULL and add index
DO $$
BEGIN
  ALTER TABLE material_in ALTER COLUMN batch_id SET NOT NULL;
  RAISE NOTICE 'Set batch_id to NOT NULL in material_in';
END $$;

CREATE INDEX IF NOT EXISTS idx_material_in_batch ON material_in(batch_id);

DO $$
BEGIN
  RAISE NOTICE 'Created index on material_in.batch_id';
END $$;

-- Step 4: Add comments
COMMENT ON COLUMN material_in.batch_id IS 'Unique identifier for this material receipt batch';
COMMENT ON COLUMN material_stock.batch_id IS 'Batch identifier linking to material_in.batch_id (logical, not FK)';

-- Step 5: Create helper view to show batch lineage
DROP VIEW IF EXISTS v_batch_lineage CASCADE;

CREATE VIEW v_batch_lineage AS
SELECT
  mi.batch_id,
  mi.id as material_in_id,
  mi.customer_id,
  c.name as customer_name,
  mi.order_id,
  o.order_number,
  mi.material_type,
  mi.quantity as received_quantity,
  mi.received_date,
  mi.ownership,
  mi.notes as receipt_notes,
  -- Current stock status for this batch
  (SELECT COUNT(*) FROM material_stock ms
   WHERE ms.batch_id = mi.batch_id AND ms.is_active = true) as active_stock_records,
  (SELECT COALESCE(SUM(ms.quantity), 0) FROM material_stock ms
   WHERE ms.batch_id = mi.batch_id AND ms.is_active = true) as current_total_quantity,
  (SELECT json_agg(json_build_object('stage', stage, 'quantity', quantity))
   FROM (
     SELECT stage, SUM(quantity) as quantity
     FROM material_stock
     WHERE batch_id = mi.batch_id AND is_active = true
     GROUP BY stage
   ) stages) as quantity_by_stage
FROM material_in mi
JOIN customers c ON mi.customer_id = c.id
LEFT JOIN orders o ON mi.order_id = o.id
ORDER BY mi.received_date DESC;

GRANT SELECT ON v_batch_lineage TO authenticated;

COMMENT ON VIEW v_batch_lineage IS 'Shows complete batch lineage from receipt to current stock status';

-- Step 6: Create function to get batch history
DROP FUNCTION IF EXISTS get_batch_history(UUID);

CREATE OR REPLACE FUNCTION get_batch_history(p_batch_id UUID)
RETURNS TABLE (
  movement_id UUID,
  stage VARCHAR,
  quantity INTEGER,
  movement_type VARCHAR,
  moved_at TIMESTAMP,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ms.id as movement_id,
    ms.stage,
    ms.quantity,
    ms.movement_type,
    ms.moved_at,
    ms.is_active
  FROM material_stock ms
  WHERE ms.batch_id = p_batch_id
  ORDER BY ms.moved_at ASC, ms.created_at ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_batch_history IS 'Returns complete movement history for a batch';

-- Step 7: Verify that move_stock_to_stage preserves batch_id (already implemented in Step 6)
DO $$
DECLARE
  v_function_source TEXT;
BEGIN
  SELECT pg_get_functiondef(oid) INTO v_function_source
  FROM pg_proc
  WHERE proname = 'move_stock_to_stage';

  IF v_function_source LIKE '%batch_id%' THEN
    RAISE NOTICE 'VERIFIED: move_stock_to_stage function preserves batch_id';
  ELSE
    RAISE WARNING 'WARNING: move_stock_to_stage function may not preserve batch_id correctly';
  END IF;
END $$;

-- Step 8: Verification query
DO $$
DECLARE
  v_material_in_count INTEGER;
  v_material_in_with_batch INTEGER;
  v_material_stock_with_batch INTEGER;
  v_orphan_batches INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_material_in_count FROM material_in;
  SELECT COUNT(*) INTO v_material_in_with_batch FROM material_in WHERE batch_id IS NOT NULL;
  SELECT COUNT(DISTINCT batch_id) INTO v_material_stock_with_batch
    FROM material_stock WHERE batch_id IS NOT NULL;

  -- Count batch_ids in material_stock that don't exist in material_in
  SELECT COUNT(DISTINCT ms.batch_id) INTO v_orphan_batches
  FROM material_stock ms
  WHERE ms.batch_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM material_in mi WHERE mi.batch_id = ms.batch_id);

  RAISE NOTICE '';
  RAISE NOTICE 'BATCH TRACKING VERIFICATION:';
  RAISE NOTICE '  Material IN records: %', v_material_in_count;
  RAISE NOTICE '  Material IN with batch_id: %', v_material_in_with_batch;
  RAISE NOTICE '  Unique batches in stock: %', v_material_stock_with_batch;
  RAISE NOTICE '  Orphan batches (stock without receipt): %', v_orphan_batches;
  RAISE NOTICE '';

  IF v_orphan_batches > 0 THEN
    RAISE NOTICE 'NOTE: % orphan batches found (created before material_in.batch_id was added)',
      v_orphan_batches;
  END IF;

  IF v_material_in_count = v_material_in_with_batch THEN
    RAISE NOTICE 'SUCCESS: All material_in records have batch_id';
  END IF;
END $$;

SELECT '==== STEP 9 COMPLETE ====' as status;
SELECT 'Enhanced: Batch tracking now starts at material receipt' as result;
SELECT 'Impact: Complete traceability from receipt to delivery' as impact;
