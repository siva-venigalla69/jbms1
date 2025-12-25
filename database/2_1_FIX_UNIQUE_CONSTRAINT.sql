-- FIX: REMOVE unique constraint from material_stock
-- UPDATED: 2025-12-22 - This constraint PREVENTS Inventory Transaction Log pattern
-- Digital Textile Printing System
-- RERUNNABLE: Safe to execute multiple times

-- ============================================================================
-- EXPLANATION: Why we're REMOVING this constraint
-- ============================================================================
-- Previous version: This file ADDED a unique constraint
-- Problem: The constraint prevents multiple batches in the same stage
-- Solution: REMOVE the constraint to enable proper inventory flow
--
-- Pattern: Inventory Transaction Log (NOT SCD Type 2)
-- See: STOCK_TRACKING_PATTERN_ANALYSIS.md for detailed explanation
-- ============================================================================

-- Drop unique constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_material_stock_key'
      AND conrelid = 'material_stock'::regclass
  ) THEN
    ALTER TABLE material_stock DROP CONSTRAINT uq_material_stock_key;
    RAISE NOTICE '✓ Dropped UNIQUE constraint: uq_material_stock_key';
  ELSE
    RAISE NOTICE '✓ Constraint uq_material_stock_key does not exist';
  END IF;
END $$;

-- Drop unique index if it exists
DROP INDEX IF EXISTS uq_material_stock_key;

DO $$
BEGIN
  RAISE NOTICE '✓ Dropped UNIQUE index: uq_material_stock_key (if existed)';
END $$;

-- Drop any other similar unique constraints
DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  FOR v_constraint_name IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'material_stock'::regclass
      AND contype = 'u'
      AND conname LIKE '%customer_id%'
  LOOP
    EXECUTE 'ALTER TABLE material_stock DROP CONSTRAINT ' || v_constraint_name;
    RAISE NOTICE '✓ Dropped additional constraint: %', v_constraint_name;
  END LOOP;
END $$;

SELECT '✓ UNIQUE CONSTRAINT REMOVED - Multiple batches can now exist in same stage!' AS status;
