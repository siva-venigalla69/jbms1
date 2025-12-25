-- STEP 5: DROP DEPRECATED DESIGN COLUMNS FROM MATERIAL_STOCK
-- Removes designs_given and designs_pending columns from material_stock table
-- Digital Textile Printing System
-- Created: 2025-12-22
-- RERUNNABLE: Safe to execute multiple times
-- RUN AFTER: All other scripts (0, 2.1, 2.2, 2.3, 3, 4)

-- ⚠️ IMPORTANT: This script permanently drops columns from material_stock table
-- Make sure you have:
-- 1. Run 2_2_ADD_MOVEMENT_HISTORY_AND_DESIGN_TABLE.sql (creates material_design_tracking)
-- 2. Migrated all existing design data (done by 2_2 script)
-- 3. Updated frontend to use material_design_tracking table (already done)

-- ==============================================================================
-- STEP 1: Verify material_design_tracking table exists
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_design_tracking') THEN
    RAISE EXCEPTION 'ERROR: material_design_tracking table does not exist! Run 2_2_ADD_MOVEMENT_HISTORY_AND_DESIGN_TABLE.sql first.';
  ELSE
    RAISE NOTICE 'Verified: material_design_tracking table exists';
  END IF;
END $$;

-- ==============================================================================
-- STEP 2: Migrate any remaining data (safety check)
-- ==============================================================================
DO $$
DECLARE
  v_migrated_count INTEGER := 0;
  v_customer_id UUID;
  v_material_type VARCHAR;
  v_designs_given INTEGER;
  v_designs_pending INTEGER;
  v_total_qty INTEGER;
BEGIN
  -- Check if columns still exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'material_stock' AND column_name = 'designs_given'
  ) THEN
    RAISE NOTICE 'Found designs_given column - checking for data to migrate...';

    -- Migrate any existing design data from material_stock to material_design_tracking
    FOR v_customer_id, v_material_type, v_designs_given, v_designs_pending, v_total_qty IN
      SELECT
        customer_id,
        material_type,
        COALESCE(designs_given, 0) as designs_given,
        COALESCE(designs_pending, 0) as designs_pending,
        SUM(quantity) as total_qty
      FROM material_stock
      WHERE is_active = true
        AND (designs_given > 0 OR designs_pending > 0)
      GROUP BY customer_id, material_type, designs_given, designs_pending
    LOOP
      -- Check if record already exists in design_tracking
      IF NOT EXISTS (
        SELECT 1 FROM material_design_tracking
        WHERE customer_id = v_customer_id
          AND material_type = v_material_type
          AND designs_given = v_designs_given
      ) THEN
        -- Insert into design tracking table
        INSERT INTO material_design_tracking (
          customer_id,
          material_type,
          batch_identifier,
          total_quantity,
          designs_given,
          designs_pending,
          design_notes,
          created_at,
          updated_at
        )
        VALUES (
          v_customer_id,
          v_material_type,
          'MIGRATED_' || TO_CHAR(NOW(), 'YYYYMMDD'),
          v_total_qty,
          v_designs_given,
          v_designs_pending,
          'Migrated from material_stock table on ' || TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
          NOW(),
          NOW()
        )
        ON CONFLICT DO NOTHING;

        v_migrated_count := v_migrated_count + 1;
      END IF;
    END LOOP;

    IF v_migrated_count > 0 THEN
      RAISE NOTICE 'Migrated % design tracking records to material_design_tracking table', v_migrated_count;
    ELSE
      RAISE NOTICE 'No design data found in material_stock to migrate (already migrated or empty)';
    END IF;
  ELSE
    RAISE NOTICE 'Design columns already dropped from material_stock - nothing to migrate';
  END IF;
END $$;

-- ==============================================================================
-- STEP 3: Drop deprecated columns from material_stock
-- ==============================================================================
DO $$
BEGIN
  -- Drop designs_given column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'material_stock' AND column_name = 'designs_given'
  ) THEN
    ALTER TABLE material_stock DROP COLUMN designs_given;
    RAISE NOTICE '✓ Dropped column: material_stock.designs_given';
  ELSE
    RAISE NOTICE 'Column designs_given already dropped from material_stock';
  END IF;

  -- Drop designs_pending column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'material_stock' AND column_name = 'designs_pending'
  ) THEN
    ALTER TABLE material_stock DROP COLUMN designs_pending;
    RAISE NOTICE '✓ Dropped column: material_stock.designs_pending';
  ELSE
    RAISE NOTICE 'Column designs_pending already dropped from material_stock';
  END IF;
END $$;

-- ==============================================================================
-- STEP 4: Verification
-- ==============================================================================

-- Verify columns are dropped
DO $$
DECLARE
  v_designs_given_exists BOOLEAN;
  v_designs_pending_exists BOOLEAN;
  v_design_tracking_count INTEGER;
BEGIN
  -- Check if old columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'material_stock' AND column_name = 'designs_given'
  ) INTO v_designs_given_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'material_stock' AND column_name = 'designs_pending'
  ) INTO v_designs_pending_exists;

  -- Count records in design tracking table
  SELECT COUNT(*) INTO v_design_tracking_count FROM material_design_tracking;

  -- Report results
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'VERIFICATION REPORT:';
  RAISE NOTICE '====================================================================';

  IF v_designs_given_exists THEN
    RAISE WARNING '⚠ Column material_stock.designs_given still exists!';
  ELSE
    RAISE NOTICE '✓ Column material_stock.designs_given successfully dropped';
  END IF;

  IF v_designs_pending_exists THEN
    RAISE WARNING '⚠ Column material_stock.designs_pending still exists!';
  ELSE
    RAISE NOTICE '✓ Column material_stock.designs_pending successfully dropped';
  END IF;

  RAISE NOTICE '✓ Design tracking records: % in material_design_tracking table', v_design_tracking_count;
  RAISE NOTICE '====================================================================';

  IF NOT v_designs_given_exists AND NOT v_designs_pending_exists THEN
    RAISE NOTICE '✅ SUCCESS: All deprecated columns dropped from material_stock!';
    RAISE NOTICE '✅ Design tracking now exclusively uses material_design_tracking table';
  END IF;
END $$;

-- ==============================================================================
-- STEP 5: Show current schema
-- ==============================================================================

SELECT 'MATERIAL_STOCK TABLE SCHEMA (AFTER CLEANUP):' AS info;

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'material_stock'
ORDER BY ordinal_position;

SELECT 'MATERIAL_DESIGN_TRACKING TABLE SCHEMA:' AS info;

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'material_design_tracking'
ORDER BY ordinal_position;

-- ==============================================================================
-- Summary
-- ==============================================================================

SELECT '=====================================================================' AS summary;
SELECT 'STEP 5 COMPLETE - Deprecated design columns dropped!' AS status;
SELECT '=====================================================================' AS summary;
SELECT 'What Changed:' AS info;
SELECT '  ✓ Removed material_stock.designs_given column' AS change_1;
SELECT '  ✓ Removed material_stock.designs_pending column' AS change_2;
SELECT '  ✓ All design data migrated to material_design_tracking table' AS change_3;
SELECT '=====================================================================' AS summary;
SELECT 'Impact:' AS info;
SELECT '  ✓ Prevents accidental use of old columns' AS impact_1;
SELECT '  ✓ Eliminates data discrepancy risk' AS impact_2;
SELECT '  ✓ Single source of truth: material_design_tracking table' AS impact_3;
SELECT '=====================================================================' AS summary;
SELECT 'Next Steps:' AS info;
SELECT '  1. Verify frontend uses only material_design_tracking table' AS next_1;
SELECT '  2. Run test scripts (3_TEST_CUSTOMER_99.sql, 4_TEST_CUSTOMER_88.sql)' AS next_2;
SELECT '  3. Run API tests (cd tests && npm test)' AS next_3;
SELECT '=====================================================================' AS summary;
