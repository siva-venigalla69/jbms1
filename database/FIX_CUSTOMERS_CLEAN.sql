-- ============================================================================
-- Fix customers table: Add missing is_active column
-- Execute this in Supabase SQL Editor
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'Adding is_active column to customers table...';
  RAISE NOTICE '========================================================================';

  -- Try to add is_active column
  BEGIN
    ALTER TABLE customers ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    RAISE NOTICE '✅ Successfully added is_active column';
  EXCEPTION
    WHEN duplicate_column THEN
      RAISE NOTICE '⚠️  Column is_active already exists - skipping';
  END;

  -- Set existing NULL values to TRUE (all customers active by default)
  UPDATE customers SET is_active = TRUE WHERE is_active IS NULL;

  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  RAISE NOTICE '✅ Updated % existing customer records', updated_rows;

  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'Fix complete!';
  RAISE NOTICE '========================================================================';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error: %', SQLERRM;
    RAISE;
END $$;

-- Verify the fix worked
SELECT
  COUNT(*) as total_customers,
  SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_customers,
  SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) as inactive_customers
FROM customers;
