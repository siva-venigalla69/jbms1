-- STEP 8: ADD ORDER_ID TO DESIGN TRACKING
-- Changes design tracking from (customer_id, material_type) to (customer_id, order_id, material_type)
-- Digital Textile Printing System
-- Created: 2025-12-22
-- RERUNNABLE: Safe to execute multiple times

DO $$
BEGIN
  RAISE NOTICE 'STEP 8: Enhancing design tracking with order-level granularity...';
END $$;

-- Step 1: Add order_id column to material_design_tracking (allow NULL initially)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'material_design_tracking' AND column_name = 'order_id'
  ) THEN
    ALTER TABLE material_design_tracking ADD COLUMN order_id UUID REFERENCES orders(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added order_id column to material_design_tracking';
  ELSE
    RAISE NOTICE 'order_id column already exists in material_design_tracking';
  END IF;
END $$;

-- Step 2: Data Migration - Handle existing records without order_id
DO $$
DECLARE
  v_record RECORD;
  v_order_id UUID;
  v_order_number VARCHAR;
  v_migrated_count INTEGER := 0;
BEGIN
  -- Find all design tracking records without order_id
  FOR v_record IN
    SELECT id, customer_id, material_type, total_quantity, designs_given, designs_pending, design_notes
    FROM material_design_tracking
    WHERE order_id IS NULL
  LOOP
    -- Check if this customer already has an order with matching material in stock
    SELECT o.id INTO v_order_id
    FROM orders o
    WHERE o.customer_id = v_record.customer_id
    AND EXISTS (
      SELECT 1 FROM material_stock ms
      WHERE ms.customer_id = v_record.customer_id
      AND ms.order_id = o.id
      AND ms.material_type = v_record.material_type
      AND ms.is_active = true
    )
    ORDER BY o.created_at DESC
    LIMIT 1;

    -- If no matching order found, create a "migration order"
    IF v_order_id IS NULL THEN
      INSERT INTO orders (
        customer_id,
        order_number,
        ownership_type,
        total_quantity,
        status,
        order_date,
        notes
      )
      VALUES (
        v_record.customer_id,
        'MIGRATED-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || substring(v_record.id::text, 1, 8),
        'customer_material',
        v_record.total_quantity,
        'active',
        NOW(),
        'Auto-created during design tracking migration. Original material received before order tracking was implemented.'
      )
      RETURNING id, order_number INTO v_order_id, v_order_number;

      RAISE NOTICE 'Created migration order % for customer %', v_order_number, v_record.customer_id;
    END IF;

    -- Update the design tracking record with order_id
    UPDATE material_design_tracking
    SET order_id = v_order_id, updated_at = NOW()
    WHERE id = v_record.id;

    v_migrated_count := v_migrated_count + 1;
  END LOOP;

  IF v_migrated_count > 0 THEN
    RAISE NOTICE 'Migrated % design tracking records to link with orders', v_migrated_count;
  ELSE
    RAISE NOTICE 'No design tracking records needed migration';
  END IF;
END $$;

-- Step 3: Make order_id NOT NULL (after migration)
DO $$
BEGIN
  -- Check if any NULL values remain
  IF EXISTS (SELECT 1 FROM material_design_tracking WHERE order_id IS NULL) THEN
    RAISE EXCEPTION 'Cannot make order_id NOT NULL: % records still have NULL order_id',
      (SELECT COUNT(*) FROM material_design_tracking WHERE order_id IS NULL);
  END IF;

  -- Set NOT NULL constraint
  ALTER TABLE material_design_tracking ALTER COLUMN order_id SET NOT NULL;
  RAISE NOTICE 'Set order_id to NOT NULL in material_design_tracking';
END $$;

-- Step 4: Drop old index and create new composite index
DROP INDEX IF EXISTS idx_design_tracking_customer;

CREATE INDEX IF NOT EXISTS idx_design_tracking_customer_order
  ON material_design_tracking(customer_id, order_id);

CREATE INDEX IF NOT EXISTS idx_design_tracking_order
  ON material_design_tracking(order_id);

CREATE INDEX IF NOT EXISTS idx_design_tracking_pending_by_order
  ON material_design_tracking(order_id, designs_pending) WHERE designs_pending > 0;

DO $$
BEGIN
  RAISE NOTICE 'Updated indexes for order-level design tracking';
END $$;

-- Step 5: Update update_design_count function to require order_id
DROP FUNCTION IF EXISTS update_design_count(UUID, VARCHAR, INTEGER, VARCHAR);
DROP FUNCTION IF EXISTS update_design_count(UUID, UUID, VARCHAR, INTEGER, VARCHAR);

CREATE OR REPLACE FUNCTION update_design_count(
  p_customer_id UUID,
  p_order_id UUID,
  p_material_type VARCHAR,
  p_designs_to_add INTEGER,
  p_batch_identifier VARCHAR DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_total_qty INTEGER;
  v_current_designs INTEGER;
  v_tracking_id UUID;
BEGIN
  -- Validate order belongs to customer
  IF NOT EXISTS (
    SELECT 1 FROM orders WHERE id = p_order_id AND customer_id = p_customer_id
  ) THEN
    RAISE EXCEPTION 'Order % does not belong to customer %', p_order_id, p_customer_id;
  END IF;

  -- Get total quantity for this customer, order, and material type (from active stock)
  SELECT COALESCE(SUM(quantity), 0) INTO v_total_qty
  FROM material_stock
  WHERE customer_id = p_customer_id
    AND COALESCE(order_id::TEXT, 'null') = COALESCE(p_order_id::TEXT, 'null')
    AND material_type = p_material_type
    AND is_active = true;

  IF v_total_qty = 0 THEN
    RAISE EXCEPTION 'No active stock found for customer % order % material type %',
      p_customer_id, p_order_id, p_material_type;
  END IF;

  -- Check if design tracking record exists for this order
  SELECT id, designs_given INTO v_tracking_id, v_current_designs
  FROM material_design_tracking
  WHERE customer_id = p_customer_id
    AND order_id = p_order_id
    AND material_type = p_material_type
    AND (p_batch_identifier IS NULL OR batch_identifier = p_batch_identifier)
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_tracking_id IS NULL THEN
    -- Create new tracking record for this order
    INSERT INTO material_design_tracking (
      customer_id, order_id, material_type, batch_identifier,
      total_quantity, designs_given, designs_pending,
      created_at, updated_at
    )
    VALUES (
      p_customer_id, p_order_id, p_material_type, p_batch_identifier,
      v_total_qty, p_designs_to_add, GREATEST(0, v_total_qty - p_designs_to_add),
      NOW(), NOW()
    );
    RAISE NOTICE 'Created design tracking for order %: % designs given out of % total',
      p_order_id, p_designs_to_add, v_total_qty;
  ELSE
    -- Update existing tracking record
    UPDATE material_design_tracking
    SET
      designs_given = designs_given + p_designs_to_add,
      designs_pending = GREATEST(0, total_quantity - (designs_given + p_designs_to_add)),
      updated_at = NOW()
    WHERE id = v_tracking_id;
    RAISE NOTICE 'Updated design tracking for order %: % designs given (was %), % pending',
      p_order_id, v_current_designs + p_designs_to_add, v_current_designs,
      GREATEST(0, v_total_qty - (v_current_designs + p_designs_to_add));
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_design_count IS 'Updates design count for a specific order (order-level tracking)';

-- Step 6: Update v_pending_designs view to show order information
DROP VIEW IF EXISTS v_pending_designs CASCADE;

CREATE VIEW v_pending_designs AS
SELECT
  c.id as customer_id,
  c.name as customer_name,
  c.phone as customer_phone,
  o.id as order_id,
  o.order_number,
  o.order_date,
  dt.material_type,
  dt.total_quantity,
  dt.designs_given,
  dt.designs_pending,
  ROUND((dt.designs_given::DECIMAL / NULLIF(dt.total_quantity, 0)) * 100, 1) as design_completion_pct,
  dt.design_notes,
  dt.batch_identifier,
  dt.created_at as tracking_started,
  dt.updated_at as last_updated
FROM material_design_tracking dt
JOIN customers c ON dt.customer_id = c.id
JOIN orders o ON dt.order_id = o.id
WHERE dt.designs_pending > 0
ORDER BY dt.designs_pending DESC, o.order_date, c.name;

GRANT SELECT ON v_pending_designs TO authenticated;

COMMENT ON VIEW v_pending_designs IS 'Shows pending designs grouped by order (not customer)';

-- Step 7: Create new view for design status by order
DROP VIEW IF EXISTS v_order_design_summary CASCADE;

CREATE VIEW v_order_design_summary AS
SELECT
  o.id as order_id,
  o.order_number,
  o.customer_id,
  c.name as customer_name,
  o.order_date,
  o.status as order_status,
  COUNT(DISTINCT dt.material_type) as material_types_count,
  COALESCE(SUM(dt.total_quantity), 0) as total_quantity,
  COALESCE(SUM(dt.designs_given), 0) as total_designs_given,
  COALESCE(SUM(dt.designs_pending), 0) as total_designs_pending,
  CASE
    WHEN SUM(dt.total_quantity) > 0 THEN
      ROUND((SUM(dt.designs_given)::DECIMAL / SUM(dt.total_quantity)) * 100, 1)
    ELSE 0
  END as overall_design_completion_pct,
  MAX(dt.updated_at) as last_design_update
FROM orders o
JOIN customers c ON o.customer_id = c.id
LEFT JOIN material_design_tracking dt ON dt.order_id = o.id
WHERE o.status = 'active'
GROUP BY o.id, o.order_number, o.customer_id, c.name, o.order_date, o.status
HAVING COALESCE(SUM(dt.designs_pending), 0) > 0 OR COUNT(dt.id) = 0
ORDER BY o.order_date DESC;

GRANT SELECT ON v_order_design_summary TO authenticated;

COMMENT ON VIEW v_order_design_summary IS 'Summary of design status per order';

-- Step 8: Verification query
DO $$
DECLARE
  v_total_tracking_records INTEGER;
  v_records_with_order INTEGER;
  v_unique_orders INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_tracking_records FROM material_design_tracking;
  SELECT COUNT(*) INTO v_records_with_order FROM material_design_tracking WHERE order_id IS NOT NULL;
  SELECT COUNT(DISTINCT order_id) INTO v_unique_orders FROM material_design_tracking;

  RAISE NOTICE '';
  RAISE NOTICE 'VERIFICATION RESULTS:';
  RAISE NOTICE '  Total design tracking records: %', v_total_tracking_records;
  RAISE NOTICE '  Records with order_id: %', v_records_with_order;
  RAISE NOTICE '  Unique orders tracked: %', v_unique_orders;
  RAISE NOTICE '';

  IF v_total_tracking_records = v_records_with_order THEN
    RAISE NOTICE 'SUCCESS: All design tracking records linked to orders';
  ELSE
    RAISE WARNING 'ISSUE: % records not linked to orders',
      v_total_tracking_records - v_records_with_order;
  END IF;
END $$;

SELECT '==== STEP 8 COMPLETE ====' as status;
SELECT 'Enhanced: Design tracking now operates at order level' as result;
SELECT 'Impact: Each order tracks designs independently' as impact;
SELECT 'BREAKING CHANGE: update_design_count now requires order_id parameter' as warning;
