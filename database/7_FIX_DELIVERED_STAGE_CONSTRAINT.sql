-- STEP 7: FIX DELIVERED STAGE CONSTRAINT
-- Adds 'delivered' to allowed stages in material_stock table
-- Digital Textile Printing System
-- Created: 2025-12-22
-- RERUNNABLE: Safe to execute multiple times

DO $$
BEGIN
  RAISE NOTICE 'STEP 7: Fixing delivered stage constraint...';
END $$;

-- Drop existing CHECK constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'material_stock_stage_check'
    AND table_name = 'material_stock'
  ) THEN
    ALTER TABLE material_stock DROP CONSTRAINT material_stock_stage_check;
    RAISE NOTICE 'Dropped existing stage CHECK constraint';
  ELSE
    RAISE NOTICE 'Stage CHECK constraint does not exist (may have been dropped already)';
  END IF;
END $$;

-- Add new CHECK constraint with 'delivered' stage
DO $$
BEGIN
  ALTER TABLE material_stock ADD CONSTRAINT material_stock_stage_check
    CHECK (stage IN (
      'received', 'preprocessing', 'printing', 'postprocessing',
      'completed', 'misprint', 'damaged', 'sold', 'delivered'
    ));
  RAISE NOTICE 'Added CHECK constraint with delivered stage';
END $$;

-- Verify the constraint
DO $$
DECLARE
  v_constraint_def TEXT;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO v_constraint_def
  FROM pg_constraint
  WHERE conname = 'material_stock_stage_check'
  AND conrelid = 'material_stock'::regclass;

  IF v_constraint_def LIKE '%delivered%' THEN
    RAISE NOTICE 'SUCCESS: delivered stage is now allowed';
  ELSE
    RAISE EXCEPTION 'FAILED: delivered stage not found in constraint';
  END IF;
END $$;

-- Update movement_type constraint to include 'delivered' if not already present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'chk_movement_type'
    AND table_name = 'material_stock'
  ) THEN
    -- Drop and recreate to ensure 'delivered' is included
    ALTER TABLE material_stock DROP CONSTRAINT chk_movement_type;

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

    RAISE NOTICE 'Updated movement_type constraint (already includes delivered)';
  END IF;
END $$;

SELECT '==== STEP 7 COMPLETE ====' as status;
SELECT 'Fixed: delivered stage now allowed in material_stock' as result;
SELECT 'Impact: Delivery challans can now move stock to delivered stage' as impact;
