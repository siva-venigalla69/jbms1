-- Fix RLS Policies for Frontend Access
-- This script creates permissive policies for authenticated users
-- Run this in Supabase SQL Editor if you're getting "no rows returned" errors

-- ============================================================================
-- DISABLE RLS for testing (Option 1 - Quick but less secure)
-- ============================================================================
-- Uncomment these lines if you want to disable RLS completely for testing
-- This is OK for development, but NOT recommended for production

-- ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE material_in DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE material_stock DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE delivery_challans DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE challan_items DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE gst_invoices DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE invoice_challans DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE returns DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE credit_notes DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE misprint_sales DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE material_types DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE PERMISSIVE POLICIES (Option 2 - Secure)
-- ============================================================================
-- This is the recommended approach - keeps RLS enabled but allows authenticated users

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated read customers" ON customers;
DROP POLICY IF EXISTS "Allow authenticated write customers" ON customers;
DROP POLICY IF EXISTS "Allow authenticated read orders" ON orders;
DROP POLICY IF EXISTS "Allow authenticated write orders" ON orders;
DROP POLICY IF EXISTS "Allow authenticated read material_in" ON material_in;
DROP POLICY IF EXISTS "Allow authenticated write material_in" ON material_in;
DROP POLICY IF EXISTS "Allow authenticated read material_stock" ON material_stock;
DROP POLICY IF EXISTS "Allow authenticated write material_stock" ON material_stock;
DROP POLICY IF EXISTS "Allow authenticated read delivery_challans" ON delivery_challans;
DROP POLICY IF EXISTS "Allow authenticated write delivery_challans" ON delivery_challans;
DROP POLICY IF EXISTS "Allow authenticated read challan_items" ON challan_items;
DROP POLICY IF EXISTS "Allow authenticated write challan_items" ON challan_items;
DROP POLICY IF EXISTS "Allow authenticated read gst_invoices" ON gst_invoices;
DROP POLICY IF EXISTS "Allow authenticated write gst_invoices" ON gst_invoices;
DROP POLICY IF EXISTS "Allow authenticated read invoice_challans" ON invoice_challans;
DROP POLICY IF EXISTS "Allow authenticated write invoice_challans" ON invoice_challans;
DROP POLICY IF EXISTS "Allow authenticated read payments" ON payments;
DROP POLICY IF EXISTS "Allow authenticated write payments" ON payments;
DROP POLICY IF EXISTS "Allow authenticated read returns" ON returns;
DROP POLICY IF EXISTS "Allow authenticated write returns" ON returns;
DROP POLICY IF EXISTS "Allow authenticated read credit_notes" ON credit_notes;
DROP POLICY IF EXISTS "Allow authenticated write credit_notes" ON credit_notes;
DROP POLICY IF EXISTS "Allow authenticated read misprint_sales" ON misprint_sales;
DROP POLICY IF EXISTS "Allow authenticated write misprint_sales" ON misprint_sales;
DROP POLICY IF EXISTS "Allow authenticated read material_types" ON material_types;

-- CUSTOMERS table
CREATE POLICY "Allow authenticated read customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated write customers"
  ON customers FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ORDERS table
CREATE POLICY "Allow authenticated read orders"
  ON orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated write orders"
  ON orders FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- MATERIAL_IN table
CREATE POLICY "Allow authenticated read material_in"
  ON material_in FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated write material_in"
  ON material_in FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- MATERIAL_STOCK table
CREATE POLICY "Allow authenticated read material_stock"
  ON material_stock FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated write material_stock"
  ON material_stock FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELIVERY_CHALLANS table
CREATE POLICY "Allow authenticated read delivery_challans"
  ON delivery_challans FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated write delivery_challans"
  ON delivery_challans FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- CHALLAN_ITEMS table
CREATE POLICY "Allow authenticated read challan_items"
  ON challan_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated write challan_items"
  ON challan_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- GST_INVOICES table
CREATE POLICY "Allow authenticated read gst_invoices"
  ON gst_invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated write gst_invoices"
  ON gst_invoices FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- INVOICE_CHALLANS table
CREATE POLICY "Allow authenticated read invoice_challans"
  ON invoice_challans FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated write invoice_challans"
  ON invoice_challans FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- PAYMENTS table
CREATE POLICY "Allow authenticated read payments"
  ON payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated write payments"
  ON payments FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RETURNS table
CREATE POLICY "Allow authenticated read returns"
  ON returns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated write returns"
  ON returns FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- CREDIT_NOTES table
CREATE POLICY "Allow authenticated read credit_notes"
  ON credit_notes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated write credit_notes"
  ON credit_notes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- MISPRINT_SALES table
CREATE POLICY "Allow authenticated read misprint_sales"
  ON misprint_sales FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated write misprint_sales"
  ON misprint_sales FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- MATERIAL_TYPES table (read-only master data)
CREATE POLICY "Allow authenticated read material_types"
  ON material_types FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- VERIFY POLICIES
-- ============================================================================

-- Check which tables have RLS enabled
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'customers', 'orders', 'material_in', 'material_stock',
  'delivery_challans', 'challan_items', 'gst_invoices',
  'invoice_challans', 'payments', 'returns', 'credit_notes',
  'misprint_sales', 'material_types'
)
ORDER BY tablename;

-- List all policies
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- RESULT
-- ============================================================================
-- After running this script, all authenticated users will be able to:
-- - Read all data from all tables
-- - Insert, update, delete data in all tables
--
-- This is appropriate for a business application where all authenticated
-- users are employees who need full access to the system.
--
-- For more granular control (e.g., admin vs employee roles), you would
-- need to create a users table with roles and modify the policies to
-- check the user's role.
-- ============================================================================
