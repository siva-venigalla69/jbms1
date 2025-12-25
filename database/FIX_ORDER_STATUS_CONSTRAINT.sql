-- FIX: Remove old foreign key constraint on orders.status
-- Problem: orders table has FK to order_statuses table (old schema)
-- Solution: Drop FK, use CHECK constraint instead (new schema)

-- Step 1: Check what constraints exist on orders table
SELECT
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'orders'::regclass
  AND conname LIKE '%status%';

-- Step 2: Drop the old foreign key constraint
DO $$
DECLARE
  rec RECORD;
BEGIN
  -- Drop foreign key constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'orders'::regclass
      AND conname = 'orders_status_fkey'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT orders_status_fkey;
    RAISE NOTICE 'Dropped old foreign key constraint: orders_status_fkey';
  ELSE
    RAISE NOTICE 'Foreign key constraint orders_status_fkey does not exist';
  END IF;

  -- Drop any other status-related foreign keys
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'orders'::regclass
      AND conname LIKE '%status%'
      AND contype = 'f'  -- f = foreign key
  ) THEN
    -- Drop all status-related foreign keys
    FOR rec IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'orders'::regclass
        AND conname LIKE '%status%'
        AND contype = 'f'
    LOOP
      EXECUTE 'ALTER TABLE orders DROP CONSTRAINT ' || rec.conname;
      RAISE NOTICE 'Dropped constraint: %', rec.conname;
    END LOOP;
  END IF;
END $$;

-- Step 3: Ensure CHECK constraint exists (new schema)
DO $$
BEGIN
  -- Drop old CHECK constraint if exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'orders'::regclass
      AND conname = 'chk_status'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT chk_status;
    RAISE NOTICE 'Dropped old CHECK constraint to recreate';
  END IF;

  -- Add new CHECK constraint
  ALTER TABLE orders ADD CONSTRAINT chk_status
    CHECK (status IN ('active', 'completed', 'cancelled'));

  RAISE NOTICE 'Added CHECK constraint for status column';
END $$;

-- Step 4: Verify the fix
SELECT
  conname as constraint_name,
  contype as constraint_type,
  CASE contype
    WHEN 'c' THEN 'CHECK'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    ELSE contype::TEXT
  END as type_description,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'orders'::regclass
  AND conname LIKE '%status%';

-- Step 5: Test that 'active' status works now
DO $$
DECLARE
  test_customer_id UUID;
BEGIN
  -- Get any customer (or create a test one)
  SELECT id INTO test_customer_id FROM customers LIMIT 1;

  IF test_customer_id IS NULL THEN
    RAISE NOTICE 'No customers found - skipping test insert';
  ELSE
    -- Try to insert an order with 'active' status
    BEGIN
      INSERT INTO orders (customer_id, ownership_type, total_quantity, status, notes)
      VALUES (test_customer_id, 'customer_material', 1, 'active', 'Test order - will be rolled back')
      RETURNING order_number;

      RAISE NOTICE 'SUCCESS: Order with status=active inserted successfully';

      -- Rollback the test insert
      RAISE EXCEPTION 'Rolling back test insert';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM LIKE '%Rolling back%' THEN
          RAISE NOTICE 'Test insert rolled back (this is expected)';
        ELSE
          RAISE NOTICE 'Test insert failed with: %', SQLERRM;
        END IF;
    END;
  END IF;
END $$;

SELECT '==== FIX COMPLETE ====' as status;
SELECT 'Old FK constraint dropped, CHECK constraint added' as result;
SELECT 'You can now insert orders with status: active, completed, cancelled' as usage;
