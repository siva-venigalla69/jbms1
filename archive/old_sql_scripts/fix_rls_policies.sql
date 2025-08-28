-- Fix RLS Policies for Digital Textile Printing System
-- Run this in Supabase SQL Editor to fix row-level security issues

-- ============================================================
-- DROP EXISTING PROBLEMATIC POLICIES
-- ============================================================

-- Drop existing policies that may be too restrictive
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON customers;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON customers;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON customers;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON orders;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON orders;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON orders;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON order_items;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON order_items;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON order_items;

-- ============================================================
-- CREATE FIXED RLS POLICIES
-- ============================================================

-- Customers table policies
CREATE POLICY "customers_select_policy" ON customers 
    FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "customers_insert_policy" ON customers 
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "customers_update_policy" ON customers 
    FOR UPDATE 
    USING (auth.role() = 'authenticated');

CREATE POLICY "customers_delete_policy" ON customers 
    FOR DELETE 
    USING (auth.role() = 'authenticated');

-- Orders table policies
CREATE POLICY "orders_select_policy" ON orders 
    FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "orders_insert_policy" ON orders 
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "orders_update_policy" ON orders 
    FOR UPDATE 
    USING (auth.role() = 'authenticated');

CREATE POLICY "orders_delete_policy" ON orders 
    FOR DELETE 
    USING (auth.role() = 'authenticated');

-- Order Items table policies
CREATE POLICY "order_items_select_policy" ON order_items 
    FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "order_items_insert_policy" ON order_items 
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "order_items_update_policy" ON order_items 
    FOR UPDATE 
    USING (auth.role() = 'authenticated');

CREATE POLICY "order_items_delete_policy" ON order_items 
    FOR DELETE 
    USING (auth.role() = 'authenticated');

-- Material In table policies
CREATE POLICY "material_in_select_policy" ON material_in 
    FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "material_in_insert_policy" ON material_in 
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "material_in_update_policy" ON material_in 
    FOR UPDATE 
    USING (auth.role() = 'authenticated');

-- Delivery Challans table policies
CREATE POLICY "delivery_challans_select_policy" ON delivery_challans 
    FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "delivery_challans_insert_policy" ON delivery_challans 
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "delivery_challans_update_policy" ON delivery_challans 
    FOR UPDATE 
    USING (auth.role() = 'authenticated');

-- Material Out table policies
CREATE POLICY "material_out_select_policy" ON material_out 
    FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "material_out_insert_policy" ON material_out 
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- GST Invoices table policies
CREATE POLICY "gst_invoices_select_policy" ON gst_invoices 
    FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "gst_invoices_insert_policy" ON gst_invoices 
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "gst_invoices_update_policy" ON gst_invoices 
    FOR UPDATE 
    USING (auth.role() = 'authenticated');

-- Payments table policies
CREATE POLICY "payments_select_policy" ON payments 
    FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "payments_insert_policy" ON payments 
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- Returns table policies
CREATE POLICY "returns_select_policy" ON returns 
    FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "returns_insert_policy" ON returns 
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- Inventory table policies
CREATE POLICY "inventory_select_policy" ON inventory 
    FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "inventory_insert_policy" ON inventory 
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "inventory_update_policy" ON inventory 
    FOR UPDATE 
    USING (auth.role() = 'authenticated');

-- Expenses table policies
CREATE POLICY "expenses_select_policy" ON expenses 
    FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "expenses_insert_policy" ON expenses 
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- ENABLE RLS ON JUNCTION TABLES
-- ============================================================

ALTER TABLE challan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_challans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "challan_items_select_policy" ON challan_items 
    FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "challan_items_insert_policy" ON challan_items 
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "invoice_challans_select_policy" ON invoice_challans 
    FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "invoice_challans_insert_policy" ON invoice_challans 
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- ENABLE RLS ON REFERENCE TABLES
-- ============================================================

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_reasons ENABLE ROW LEVEL SECURITY;

-- Reference tables - allow read access to all authenticated users
CREATE POLICY "user_roles_select_policy" ON user_roles 
    FOR SELECT 
    USING (true); -- Allow all users to read

CREATE POLICY "order_statuses_select_policy" ON order_statuses 
    FOR SELECT 
    USING (true);

CREATE POLICY "material_types_select_policy" ON material_types 
    FOR SELECT 
    USING (true);

CREATE POLICY "production_stages_select_policy" ON production_stages 
    FOR SELECT 
    USING (true);

CREATE POLICY "payment_methods_select_policy" ON payment_methods 
    FOR SELECT 
    USING (true);

CREATE POLICY "return_reasons_select_policy" ON return_reasons 
    FOR SELECT 
    USING (true);

-- ============================================================
-- VERIFY POLICIES ARE WORKING
-- ============================================================

-- Check all policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;