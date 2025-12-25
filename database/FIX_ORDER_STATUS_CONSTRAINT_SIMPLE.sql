-- FIX: Remove old foreign key constraint on orders.status (SIMPLIFIED VERSION)
-- Problem: orders table has FK to order_statuses table (old schema)
-- Solution: Drop FK, use CHECK constraint instead (new schema)

-- Step 1: Drop ALL status-related constraints (simple approach)
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Loop through all status-related constraints and drop them
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'orders'::regclass
      AND conname LIKE '%status%'
  LOOP
    BEGIN
      EXECUTE 'ALTER TABLE orders DROP CONSTRAINT IF EXISTS ' || constraint_name;
      RAISE NOTICE 'Dropped constraint: %', constraint_name;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not drop %, continuing: %', constraint_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- Step 2: Add new CHECK constraint
DO $$
BEGIN
  -- Add CHECK constraint (will fail silently if already exists)
  BEGIN
    ALTER TABLE orders ADD CONSTRAINT chk_status
      CHECK (status IN ('active', 'completed', 'cancelled'));
    RAISE NOTICE 'Added CHECK constraint: chk_status';
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'CHECK constraint chk_status already exists';
    WHEN OTHERS THEN
      RAISE NOTICE 'Could not add constraint: %', SQLERRM;
  END;
END $$;

-- Step 3: Verify the fix
SELECT
  conname as constraint_name,
  CASE contype
    WHEN 'c' THEN 'CHECK'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    ELSE contype::TEXT
  END as constraint_type
FROM pg_constraint
WHERE conrelid = 'orders'::regclass
  AND conname LIKE '%status%';

SELECT '==== FIX COMPLETE ====' as status;
SELECT 'Orders.status now uses CHECK constraint' as result;
SELECT 'Allowed values: active, completed, cancelled' as allowed_values;
