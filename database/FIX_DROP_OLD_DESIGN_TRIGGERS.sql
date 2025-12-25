-- FIX: Drop old triggers that reference deprecated design columns
-- Problem: Triggers still trying to set designs_given/designs_pending on material_stock
-- Solution: Drop all design-related triggers from material_stock table

-- Step 1: Check existing triggers on material_stock
SELECT
  t.tgname as trigger_name,
  p.proname as function_name,
  t.tgenabled as enabled
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'material_stock'::regclass
  AND t.tgname LIKE '%design%';

-- Step 2: Drop the problematic trigger
DROP TRIGGER IF EXISTS trigger_auto_calculate_designs_pending ON material_stock;
DROP TRIGGER IF EXISTS auto_calculate_designs_pending ON material_stock;
DROP TRIGGER IF EXISTS trigger_calculate_designs ON material_stock;
DROP TRIGGER IF EXISTS calculate_designs_pending ON material_stock;

-- Step 3: Drop the trigger functions
DROP FUNCTION IF EXISTS auto_calculate_designs_pending() CASCADE;
DROP FUNCTION IF EXISTS calculate_designs_pending() CASCADE;
DROP FUNCTION IF EXISTS trigger_calculate_designs() CASCADE;

DO $$
BEGIN
  RAISE NOTICE '✅ Dropped design-related triggers and functions from material_stock';
END $$;

-- Step 4: Verify - show remaining triggers on material_stock
SELECT
  t.tgname as trigger_name,
  p.proname as function_name,
  CASE t.tgtype::int & 1
    WHEN 1 THEN 'ROW'
    ELSE 'STATEMENT'
  END as level,
  CASE t.tgtype::int & 66
    WHEN 2 THEN 'BEFORE'
    WHEN 64 THEN 'INSTEAD OF'
    ELSE 'AFTER'
  END as timing,
  CASE
    WHEN t.tgtype::int & 4 = 4 THEN 'INSERT'
    WHEN t.tgtype::int & 8 = 8 THEN 'DELETE'
    WHEN t.tgtype::int & 16 = 16 THEN 'UPDATE'
    ELSE 'OTHER'
  END as event
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'material_stock'::regclass
  AND NOT t.tgisinternal
ORDER BY t.tgname;

-- Step 5: Final verification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'material_stock'::regclass
      AND tgname LIKE '%design%'
  ) THEN
    RAISE WARNING 'Some design-related triggers still exist on material_stock';
  ELSE
    RAISE NOTICE '✅ All design-related triggers removed from material_stock';
  END IF;
END $$;

SELECT '==== FIX COMPLETE ====' as status;
SELECT 'Old design triggers dropped from material_stock' as result;
SELECT 'Now you can insert into material_stock without design columns' as usage;
