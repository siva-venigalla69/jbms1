-- FIX: DROP INCORRECT UNIQUE CONSTRAINT ON MATERIAL_STOCK
-- This constraint prevents multiple batches in same stage
-- Digital Textile Printing System
-- Created: 2025-12-22
-- RERUNNABLE: Safe to execute multiple times

-- ============================================================================
-- PROBLEM: Unique constraint prevents Inventory Transaction Log pattern
-- ============================================================================
-- The constraint "material_stock_customer_id_order_id_material_type_stage_own_key"
-- assumes only ONE record can exist per (customer, order, material, stage, ownership)
--
-- This is WRONG because:
-- 1. When moving stock, we create a "split_remainder" record in SOURCE stage
-- 2. Multiple batches can be in the same stage at the same time
-- 3. This is Inventory Transaction Log, NOT SCD Type 2
--
-- See: STOCK_TRACKING_PATTERN_ANALYSIS.md for detailed explanation
-- ============================================================================

DO $$
BEGIN
  -- Drop the incorrect unique constraint
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'material_stock_customer_id_order_id_material_type_stage_own_key'
      AND conrelid = 'material_stock'::regclass
  ) THEN
    ALTER TABLE material_stock
      DROP CONSTRAINT material_stock_customer_id_order_id_material_type_stage_own_key;
    RAISE NOTICE '✓ Dropped incorrect UNIQUE constraint';
  ELSE
    RAISE NOTICE '✓ Constraint already removed';
  END IF;
END $$;

-- Verify primary key still exists (this should be the ONLY uniqueness constraint)
DO $$
DECLARE
  v_pk_name VARCHAR;
BEGIN
  SELECT conname INTO v_pk_name
  FROM pg_constraint
  WHERE conrelid = 'material_stock'::regclass AND contype = 'p';

  IF v_pk_name IS NOT NULL THEN
    RAISE NOTICE '✓ Primary key "%" is correct (id UUID)', v_pk_name;
  ELSE
    RAISE EXCEPTION 'ERROR: No primary key found on material_stock!';
  END IF;
END $$;

-- Verify no other unique constraints exist
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_constraint
  WHERE conrelid = 'material_stock'::regclass AND contype = 'u';

  IF v_count > 0 THEN
    RAISE NOTICE 'WARNING: Found % other UNIQUE constraints:', v_count;
    FOR v_constraint_name IN
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'material_stock'::regclass AND contype = 'u'
    LOOP
      RAISE NOTICE '  - %', v_constraint_name;
    END LOOP;
    RAISE NOTICE 'Consider removing these if they prevent multiple batches in same stage';
  ELSE
    RAISE NOTICE '✓ No other UNIQUE constraints found';
  END IF;
END $$;

SELECT '==== FIX COMPLETE ====' as status;
SELECT 'Dropped incorrect UNIQUE constraint' as result;
SELECT 'Multiple batches can now exist in same stage' as explanation;
SELECT 'This enables proper Inventory Transaction Log pattern' as pattern;
