-- Fix for customers table - Add missing is_active column
-- Created: 2025-12-21
-- Issue: customers.is_active column does not exist
-- Impact: Prevents filtering active customers

-- ============================================================================
-- ADD is_active COLUMN TO customers TABLE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'FIXING customers TABLE - Adding is_active column';
  RAISE NOTICE '========================================================================';

  -- Try to add is_active column
  BEGIN
    ALTER TABLE customers ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    RAISE NOTICE '✅ Added is_active column to customers table';
  EXCEPTION
    WHEN duplicate_column THEN
      RAISE NOTICE '⚠️  is_active column already exists - skipping';
  END;

  -- Set existing NULL values to TRUE (active by default)
  UPDATE customers SET is_active = TRUE WHERE is_active IS NULL;
  RAISE NOTICE '✅ Set all existing customers to active';

  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'FIX COMPLETE!';
  RAISE NOTICE '========================================================================';

END $$;

-- Verify the fix
SELECT
  COUNT(*) as total_customers,
  SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_customers,
  SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) as inactive_customers
FROM customers;
