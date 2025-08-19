-- Database Schema Fixes for JBMS Frontend
-- Run these SQL commands in your Supabase SQL Editor

-- =====================================================
-- 1. Fix user_profiles table - Add missing email column
-- =====================================================

-- Check if email column exists (for verification)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' AND column_name = 'email';

-- Add email column if it doesn't exist
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS email VARCHAR UNIQUE;

-- Update existing records to populate email from auth.users
UPDATE user_profiles 
SET email = auth_users.email
FROM auth.users auth_users
WHERE user_profiles.id = auth_users.id
AND user_profiles.email IS NULL;

-- Add NOT NULL constraint after populating data
ALTER TABLE user_profiles 
ALTER COLUMN email SET NOT NULL;

-- =====================================================
-- 2. Fix order_items table - Add missing subtotal column
-- =====================================================

-- Check if subtotal column exists (for verification)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'order_items' AND column_name = 'subtotal';

-- Add subtotal column if it doesn't exist
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2);

-- Calculate and populate subtotal for existing records
UPDATE order_items 
SET subtotal = quantity * unit_price
WHERE subtotal IS NULL;

-- =====================================================
-- 3. Create trigger to auto-calculate subtotal for new records
-- =====================================================

-- Function to calculate subtotal
CREATE OR REPLACE FUNCTION calculate_order_item_subtotal()
RETURNS TRIGGER AS $$
BEGIN
    NEW.subtotal = NEW.quantity * NEW.unit_price;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for INSERT operations
DROP TRIGGER IF EXISTS trigger_calculate_subtotal_insert ON order_items;
CREATE TRIGGER trigger_calculate_subtotal_insert
    BEFORE INSERT ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_order_item_subtotal();

-- Trigger for UPDATE operations
DROP TRIGGER IF EXISTS trigger_calculate_subtotal_update ON order_items;
CREATE TRIGGER trigger_calculate_subtotal_update
    BEFORE UPDATE OF quantity, unit_price ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_order_item_subtotal();

-- =====================================================
-- 4. Update API code compatibility - ensure is_deleted column exists
-- =====================================================

-- Add is_deleted column to user_profiles if it doesn't exist
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Add is_deleted column to orders if it doesn't exist
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Add updated_at column to order_items if it doesn't exist
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =====================================================
-- 5. Verification queries (run to confirm fixes)
-- =====================================================

-- Verify user_profiles structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;

-- Verify order_items structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'order_items' 
ORDER BY ordinal_position;

-- Test data integrity
SELECT 
    COUNT(*) as total_order_items,
    COUNT(subtotal) as items_with_subtotal,
    SUM(CASE WHEN subtotal = quantity * unit_price THEN 1 ELSE 0 END) as correct_subtotals
FROM order_items;

-- =====================================================
-- 6. Index optimizations for performance
-- =====================================================

-- Index on user_profiles.email for auth lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Index on order_items.order_id for order lookups
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Index on orders.is_deleted for filtering
CREATE INDEX IF NOT EXISTS idx_orders_is_deleted ON orders(is_deleted);

-- =====================================================
-- 7. Update existing order totals (optional)
-- =====================================================

-- Recalculate order totals based on order items
UPDATE orders 
SET total_amount = order_totals.calculated_total
FROM (
    SELECT 
        order_id,
        SUM(subtotal) as calculated_total
    FROM order_items 
    GROUP BY order_id
) order_totals
WHERE orders.id = order_totals.order_id;

-- =====================================================
-- COMPLETED: Database schema fixes applied
-- =====================================================

-- After running these scripts:
-- 1. user_profiles.email column will exist and be populated
-- 2. order_items.subtotal column will exist and be auto-calculated
-- 3. Triggers will maintain data integrity for future inserts/updates
-- 4. Performance indexes will be in place
-- 5. All existing data will be migrated properly