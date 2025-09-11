-- CURRENT DATABASE SCHEMA SNAPSHOT
-- Generated on: 2025-09-11 17:28:44
-- Source: Live Supabase Database

-- Table: customers
-- Estimated rows: 0
CREATE TABLE customers (

);

-- Table: orders
-- Estimated rows: 0
CREATE TABLE orders (

);

-- Table: order_items
-- Estimated rows: 0
CREATE TABLE order_items (

);

-- Table: material_in
-- Estimated rows: 0
CREATE TABLE material_in (

);

-- Table: material_out
-- Estimated rows: 0
CREATE TABLE material_out (

);

-- Table: delivery_challans
-- Estimated rows: 0
CREATE TABLE delivery_challans (

);

-- Table: challan_items
-- Estimated rows: 0
CREATE TABLE challan_items (

);

-- Table: gst_invoices
-- Estimated rows: 0
CREATE TABLE gst_invoices (

);

-- Table: invoice_challans
-- Estimated rows: 0
CREATE TABLE invoice_challans (

);

-- Table: payments
-- Estimated rows: 0
CREATE TABLE payments (

);

-- Table: inventory
-- Estimated rows: 0
CREATE TABLE inventory (

);

-- Table: expenses
-- Estimated rows: 0
CREATE TABLE expenses (

);

-- Table: returns
-- Estimated rows: 0
CREATE TABLE returns (

);

-- Table: user_profiles
-- Estimated rows: 0
CREATE TABLE user_profiles (

);

-- Table: material_stock
-- Estimated rows: 0
CREATE TABLE material_stock (

);

-- Table: user_roles
-- Estimated rows: 0
CREATE TABLE user_roles (
    id INTEGER PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    description TEXT,
    is_active INTEGER
);

-- Table: order_statuses
-- Estimated rows: 0
CREATE TABLE order_statuses (
    id INTEGER PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    description TEXT,
    is_active INTEGER
);

-- Table: material_types
-- Estimated rows: 0
CREATE TABLE material_types (
    id INTEGER PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    description TEXT,
    is_active INTEGER
);

-- Table: production_stages
-- Estimated rows: 0
CREATE TABLE production_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    description TEXT,
    sequence_order INTEGER,
    is_active INTEGER
);

-- Table: payment_methods
-- Estimated rows: 0
CREATE TABLE payment_methods (
    id INTEGER PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    description TEXT,
    is_active INTEGER
);

-- Table: return_reasons
-- Estimated rows: 0
CREATE TABLE return_reasons (
    id INTEGER PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    description TEXT,
    is_active INTEGER
);
