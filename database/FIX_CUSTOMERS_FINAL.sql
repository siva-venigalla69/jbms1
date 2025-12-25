-- Add is_active column to customers table
-- Super simple version - no variables, no complex logic

ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

UPDATE customers SET is_active = TRUE WHERE is_active IS NULL;

-- Verify it worked
SELECT
  COUNT(*) as total_customers,
  COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_customers,
  COUNT(CASE WHEN is_active = FALSE THEN 1 END) as inactive_customers
FROM customers;
