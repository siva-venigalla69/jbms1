-- Digital Textile Printing System - PostgreSQL Database Schema
-- This file contains the complete database schema for the textile printing workflow system

-- Step 1: Create Database Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Step 2: Create Enum Types
CREATE TYPE order_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE production_stage AS ENUM ('pre_treatment', 'printing', 'post_process');
CREATE TYPE material_type AS ENUM ('saree', 'dupatta', 'voni', 'running_material', 'blouse_material');
CREATE TYPE payment_method AS ENUM ('cash', 'upi', 'bank_transfer', 'cheque');
CREATE TYPE return_reason AS ENUM ('damaged', 'defective', 'wrong_design', 'customer_request');
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'employee');
CREATE TYPE adjustment_type AS ENUM ('quantity_change', 'reason');

-- Step 3: Core Tables

-- Users table for authentication and auditing
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'employee',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    gst_number VARCHAR(15),
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id UUID REFERENCES users(id),
    updated_by_user_id UUID REFERENCES users(id)
);

-- Orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    order_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status order_status DEFAULT 'pending',
    total_amount DECIMAL(10,2) DEFAULT 0.00,
    notes TEXT,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id UUID REFERENCES users(id),
    updated_by_user_id UUID REFERENCES users(id)
);

-- Order Items table
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    material_type material_type NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) DEFAULT 0.00,
    customization_details TEXT,
    production_stage production_stage DEFAULT 'pre_treatment',
    stage_completed_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by_user_id UUID REFERENCES users(id)
);

-- Material In table (materials received)
CREATE TABLE material_in (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id),
    customer_id UUID REFERENCES customers(id),
    material_type material_type,
    quantity INTEGER NOT NULL,
    unit VARCHAR(20) DEFAULT 'pieces',
    received_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id UUID REFERENCES users(id)
);

-- Delivery Challans table
CREATE TABLE delivery_challans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challan_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    challan_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_quantity INTEGER DEFAULT 0,
    notes TEXT,
    is_delivered BOOLEAN DEFAULT false,
    delivered_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id UUID REFERENCES users(id),
    updated_by_user_id UUID REFERENCES users(id)
);

-- Challan Items table (many-to-many: challans to order_items)
CREATE TABLE challan_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challan_id UUID NOT NULL REFERENCES delivery_challans(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES order_items(id),
    quantity INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Material Out table
CREATE TABLE material_out (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challan_id UUID NOT NULL REFERENCES delivery_challans(id),
    customer_id UUID REFERENCES customers(id),
    material_type material_type,
    quantity INTEGER NOT NULL,
    unit VARCHAR(20) DEFAULT 'pieces',
    dispatch_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id UUID REFERENCES users(id)
);

-- GST Invoices table
CREATE TABLE gst_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    invoice_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    cgst_rate DECIMAL(5,2) DEFAULT 9.00,
    sgst_rate DECIMAL(5,2) DEFAULT 9.00,
    igst_rate DECIMAL(5,2) DEFAULT 0.00,
    cgst_amount DECIMAL(12,2) DEFAULT 0.00,
    sgst_amount DECIMAL(12,2) DEFAULT 0.00,
    igst_amount DECIMAL(12,2) DEFAULT 0.00,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    outstanding_amount DECIMAL(12,2) DEFAULT 0.00,
    notes TEXT,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id UUID REFERENCES users(id),
    updated_by_user_id UUID REFERENCES users(id)
);

-- Invoice Challans (many-to-many relationship)
CREATE TABLE invoice_challans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES gst_invoices(id) ON DELETE CASCADE,
    challan_id UUID NOT NULL REFERENCES delivery_challans(id),
    challan_amount DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES gst_invoices(id),
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    amount DECIMAL(12,2) NOT NULL,
    payment_method payment_method NOT NULL,
    reference_number VARCHAR(100),
    notes TEXT,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id UUID REFERENCES users(id)
);

-- Returns table (damaged/defective returns)
CREATE TABLE returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_item_id UUID NOT NULL REFERENCES order_items(id),
    return_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    quantity INTEGER NOT NULL,
    reason return_reason NOT NULL,
    refund_amount DECIMAL(10,2) DEFAULT 0.00,
    is_adjustment BOOLEAN DEFAULT false,
    adjustment_amount DECIMAL(10,2) DEFAULT 0.00,
    notes TEXT,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id UUID REFERENCES users(id)
);

-- Inventory table
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    current_stock DECIMAL(10,2) DEFAULT 0.00,
    unit VARCHAR(20) NOT NULL,
    reorder_level DECIMAL(10,2) DEFAULT 0.00,
    cost_per_unit DECIMAL(10,2) DEFAULT 0.00,
    supplier_name VARCHAR(100),
    supplier_contact VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id UUID REFERENCES users(id),
    updated_by_user_id UUID REFERENCES users(id)
);

-- Inventory Adjustments table
CREATE TABLE inventory_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_id UUID NOT NULL REFERENCES inventory(id),
    adjustment_type adjustment_type NOT NULL,
    quantity_change DECIMAL(10,2) NOT NULL,
    reason TEXT,
    notes TEXT,
    adjustment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id UUID REFERENCES users(id)
);

-- Expenses table
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method payment_method NOT NULL,
    reference_number VARCHAR(100),
    notes TEXT,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id UUID REFERENCES users(id)
);

-- Audit Log table
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_values TEXT,
    new_values TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    changed_by_user_id UUID REFERENCES users(id)
);

-- Step 4: Create Indexes for Performance
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_is_deleted ON customers(is_deleted);

CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_order_date ON orders(order_date);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_is_deleted ON orders(is_deleted);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_production_stage ON order_items(production_stage);
CREATE INDEX idx_order_items_is_deleted ON order_items(is_deleted);

CREATE INDEX idx_material_in_order_id ON material_in(order_id);
CREATE INDEX idx_material_in_customer_id ON material_in(customer_id);
CREATE INDEX idx_material_in_received_date ON material_in(received_date);
CREATE INDEX idx_material_in_is_deleted ON material_in(is_deleted);

CREATE INDEX idx_delivery_challans_customer_id ON delivery_challans(customer_id);
CREATE INDEX idx_delivery_challans_challan_date ON delivery_challans(challan_date);
CREATE INDEX idx_delivery_challans_challan_number ON delivery_challans(challan_number);
CREATE INDEX idx_delivery_challans_is_deleted ON delivery_challans(is_deleted);

CREATE INDEX idx_challan_items_challan_id ON challan_items(challan_id);
CREATE INDEX idx_challan_items_order_item_id ON challan_items(order_item_id);

CREATE INDEX idx_material_out_challan_id ON material_out(challan_id);
CREATE INDEX idx_material_out_customer_id ON material_out(customer_id);
CREATE INDEX idx_material_out_dispatch_date ON material_out(dispatch_date);
CREATE INDEX idx_material_out_is_deleted ON material_out(is_deleted);

CREATE INDEX idx_gst_invoices_customer_id ON gst_invoices(customer_id);
CREATE INDEX idx_gst_invoices_invoice_date ON gst_invoices(invoice_date);
CREATE INDEX idx_gst_invoices_invoice_number ON gst_invoices(invoice_number);
CREATE INDEX idx_gst_invoices_outstanding_amount ON gst_invoices(outstanding_amount);
CREATE INDEX idx_gst_invoices_is_deleted ON gst_invoices(is_deleted);

CREATE INDEX idx_invoice_challans_invoice_id ON invoice_challans(invoice_id);
CREATE INDEX idx_invoice_challans_challan_id ON invoice_challans(challan_id);

CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);
CREATE INDEX idx_payments_is_deleted ON payments(is_deleted);

CREATE INDEX idx_returns_order_item_id ON returns(order_item_id);
CREATE INDEX idx_returns_return_date ON returns(return_date);
CREATE INDEX idx_returns_is_deleted ON returns(is_deleted);

CREATE INDEX idx_inventory_category ON inventory(category);
CREATE INDEX idx_inventory_is_active ON inventory(is_active);
CREATE INDEX idx_inventory_is_deleted ON inventory(is_deleted);
CREATE INDEX idx_inventory_current_stock ON inventory(current_stock);

CREATE INDEX idx_inventory_adjustments_inventory_id ON inventory_adjustments(inventory_id);
CREATE INDEX idx_inventory_adjustments_adjustment_date ON inventory_adjustments(adjustment_date);

CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_is_deleted ON expenses(is_deleted);

CREATE INDEX idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX idx_audit_log_record_id ON audit_log(record_id);
CREATE INDEX idx_audit_log_changed_at ON audit_log(changed_at);

-- Step 5: Create Functions
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    order_number TEXT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 9) AS INTEGER)), 0) + 1
    INTO next_number
    FROM orders
    WHERE order_number LIKE 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-%';
    
    order_number := 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(next_number::TEXT, 4, '0');
    RETURN order_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate challan numbers
CREATE OR REPLACE FUNCTION generate_challan_number()
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    challan_number TEXT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(challan_number FROM 8) AS INTEGER)), 0) + 1
    INTO next_number
    FROM delivery_challans
    WHERE challan_number LIKE 'CH-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-%';
    
    challan_number := 'CH-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(next_number::TEXT, 4, '0');
    RETURN challan_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    invoice_number TEXT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 9) AS INTEGER)), 0) + 1
    INTO next_number
    FROM gst_invoices
    WHERE invoice_number LIKE 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-%';
    
    invoice_number := 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(next_number::TEXT, 4, '0');
    RETURN invoice_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update order total amount
CREATE OR REPLACE FUNCTION update_order_total()
RETURNS TRIGGER AS $$
DECLARE
    order_total DECIMAL(10,2);
BEGIN
    IF TG_OP = 'DELETE' THEN
        SELECT COALESCE(SUM(quantity * unit_price), 0)
        INTO order_total
        FROM order_items
        WHERE order_id = OLD.order_id AND is_deleted = false;
        
        UPDATE orders
        SET total_amount = order_total
        WHERE id = OLD.order_id;
        
        RETURN OLD;
    ELSE
        SELECT COALESCE(SUM(quantity * unit_price), 0)
        INTO order_total
        FROM order_items
        WHERE order_id = NEW.order_id AND is_deleted = false;
        
        UPDATE orders
        SET total_amount = order_total
        WHERE id = NEW.order_id;
        
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update invoice outstanding amount
CREATE OR REPLACE FUNCTION update_invoice_outstanding()
RETURNS TRIGGER AS $$
DECLARE
    total_paid DECIMAL(12,2);
    invoice_total DECIMAL(12,2);
BEGIN
    IF TG_OP = 'DELETE' THEN
        SELECT COALESCE(SUM(amount), 0)
        INTO total_paid
        FROM payments
        WHERE invoice_id = OLD.invoice_id AND is_deleted = false;
        
        SELECT total_amount
        INTO invoice_total
        FROM gst_invoices
        WHERE id = OLD.invoice_id;
        
        UPDATE gst_invoices
        SET outstanding_amount = invoice_total - total_paid
        WHERE id = OLD.invoice_id;
        
        RETURN OLD;
    ELSE
        SELECT COALESCE(SUM(amount), 0)
        INTO total_paid
        FROM payments
        WHERE invoice_id = NEW.invoice_id AND is_deleted = false;
        
        SELECT total_amount
        INTO invoice_total
        FROM gst_invoices
        WHERE id = NEW.invoice_id;
        
        UPDATE gst_invoices
        SET outstanding_amount = invoice_total - total_paid
        WHERE id = NEW.invoice_id;
        
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create Triggers
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_items_updated_at 
    BEFORE UPDATE ON order_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_challans_updated_at 
    BEFORE UPDATE ON delivery_challans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gst_invoices_updated_at 
    BEFORE UPDATE ON gst_invoices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at 
    BEFORE UPDATE ON inventory 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Order total calculation trigger
CREATE TRIGGER trigger_update_order_total
    AFTER INSERT OR UPDATE OR DELETE ON order_items
    FOR EACH ROW EXECUTE FUNCTION update_order_total();

-- Invoice outstanding amount trigger
CREATE TRIGGER trigger_update_invoice_outstanding
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_invoice_outstanding();

-- Step 7: Create Views for Reporting
-- View for pending orders
CREATE VIEW v_pending_orders AS
SELECT 
    o.id,
    o.order_number,
    c.name as customer_name,
    o.order_date,
    o.status,
    COUNT(oi.id) as total_items,
    SUM(oi.quantity) as total_quantity,
    COUNT(CASE WHEN oi.production_stage = 'post_process' THEN 1 END) as post_process_items,
    o.total_amount,
    c.phone as customer_phone
FROM orders o
JOIN customers c ON o.customer_id = c.id
LEFT JOIN order_items oi ON o.id = oi.order_id AND oi.is_deleted = false
WHERE o.status IN ('pending', 'in_progress') 
    AND o.is_deleted = false
    AND c.is_deleted = false
GROUP BY o.id, o.order_number, c.name, o.order_date, o.status, o.total_amount, c.phone
ORDER BY o.order_date DESC;

-- View for low stock items
CREATE VIEW v_stock_items AS
SELECT 
    i.id,
    i.item_name,
    i.category,
    i.current_stock,
    i.reorder_level,
    i.unit,
    i.supplier_name,
    i.supplier_contact,
    i.cost_per_unit,
    CASE 
        WHEN i.current_stock <= i.reorder_level THEN true
        ELSE false
    END as is_low_stock
FROM inventory i
WHERE i.is_active = true AND i.is_deleted = false
ORDER BY i.category, i.item_name;

-- View for outstanding receivables
CREATE VIEW v_outstanding_receivables AS
SELECT 
    gi.id,
    gi.invoice_number,
    gi.invoice_date,
    c.name as customer_name,
    c.phone as customer_phone,
    c.gst_number as customer_gst,
    gi.total_amount as final_amount,
    gi.outstanding_amount,
    EXTRACT(DAYS FROM (CURRENT_DATE - gi.invoice_date::date)) as days_outstanding
FROM gst_invoices gi
JOIN customers c ON gi.customer_id = c.id
WHERE gi.outstanding_amount > 0 
    AND gi.is_deleted = false
    AND c.is_deleted = false
ORDER BY gi.invoice_date DESC;

-- View for material flow summary
CREATE VIEW v_material_flow_summary AS
SELECT 
    mi.received_date as flow_date,
    'Material In' as flow_type,
    mi.material_type::text as material_type,
    SUM(mi.quantity) as total_quantity,
    'Received' as new_values,
    mi.created_at as changed_at,
    u.full_name as changed_by
FROM material_in mi
LEFT JOIN users u ON mi.created_by_user_id = u.id
WHERE mi.is_deleted = false
GROUP BY mi.received_date, mi.material_type, mi.created_at, u.full_name

UNION ALL

SELECT 
    mo.dispatch_date as flow_date,
    'Material Out' as flow_type,
    mo.material_type::text as material_type,
    SUM(mo.quantity) as total_quantity,
    'Dispatched' as new_values,
    mo.created_at as changed_at,
    u.full_name as changed_by
FROM material_out mo
LEFT JOIN users u ON mo.created_by_user_id = u.id
WHERE mo.is_deleted = false
GROUP BY mo.dispatch_date, mo.material_type, mo.created_at, u.full_name

ORDER BY flow_date DESC, changed_at DESC;

-- Step 8: Create Unique Constraints and Additional Indexes
CREATE UNIQUE INDEX idx_customers_phone_unique 
    ON customers(phone) 
    WHERE phone IS NOT NULL AND is_deleted = false;

CREATE UNIQUE INDEX idx_customers_email_unique 
    ON customers(email) 
    WHERE email IS NOT NULL AND is_deleted = false;

-- Default admin user (password: admin123)
INSERT INTO users (username, email, full_name, password_hash, role, is_active) 
VALUES (
    'admin', 
    'admin@company.com', 
    'System Administrator',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewQMbqy4hgCCJOzu',  -- admin123
    'admin',
    true
) 
ON CONFLICT (username) DO NOTHING; 