-- Simple fix for customers table
-- Just the essential SQL commands

ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

UPDATE customers SET is_active = TRUE WHERE is_active IS NULL;

SELECT COUNT(*) as total_customers FROM customers;
