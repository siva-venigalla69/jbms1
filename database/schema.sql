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

-- Step 3: Core Tables

-- Users table for authentication and auditing
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role user_role DEFAULT 'employee',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15),
    email VARCHAR(100),
    address TEXT,
    gst_number VARCHAR(15),
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id UUID REFERENCES users(id),
    updated_by_user_id UUID REFERENCES users(id)
);

-- Orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status order_status DEFAULT 'pending',
    total_amount DECIMAL(12,2) DEFAULT 0.00,
    notes TEXT,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
    stage_completed_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by_user_id UUID REFERENCES users(id)
);

-- Material In table (materials received)
CREATE TABLE material_in (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id),
    material_type material_type,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) DEFAULT 'pieces',
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id UUID REFERENCES users(id)
);

-- Delivery Challans table
CREATE TABLE delivery_challans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challan_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    challan_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_quantity INTEGER DEFAULT 0,
    notes TEXT,
    is_delivered BOOLEAN DEFAULT false,
    delivered_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id UUID REFERENCES users(id),
    updated_by_user_id UUID REFERENCES users(id)
);

-- Challan Items table (many-to-many: challans to order_items)
CREATE TABLE challan_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challan_id UUID NOT NULL REFERENCES delivery_challans(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES order_items(id),
    quantity INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Material Out table
CREATE TABLE material_out (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challan_id UUID NOT NULL REFERENCES delivery_challans(id),
    material_type material_type,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) DEFAULT 'pieces',
    dispatch_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id UUID REFERENCES users(id)
);

-- GST Invoices table
CREATE TABLE gst_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    cgst_rate DECIMAL(5,2) DEFAULT 9.00,
    sgst_rate DECIMAL(5,2) DEFAULT 9.00,
    igst_rate DECIMAL(5,2) DEFAULT 18.00,
    cgst_amount DECIMAL(10,2) DEFAULT 0.00,
    sgst_amount DECIMAL(10,2) DEFAULT 0.00,
    igst_amount DECIMAL(10,2) DEFAULT 0.00,
    final_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    outstanding_amount DECIMAL(12,2) DEFAULT 0.00,
    notes TEXT,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id UUID REFERENCES users(id),
    updated_by_user_id UUID REFERENCES users(id)
);

-- Invoice Challans (many-to-many relationship)
CREATE TABLE invoice_challans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES gst_invoices(id) ON DELETE CASCADE,
    challan_id UUID NOT NULL REFERENCES delivery_challans(id),
    challan_amount DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES gst_invoices(id),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(12,2) NOT NULL,
    payment_method payment_method NOT NULL,
    reference_number VARCHAR(100),
    notes TEXT,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id UUID REFERENCES users(id)
);

-- Returns table (damaged/defective returns)
CREATE TABLE returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_item_id UUID NOT NULL REFERENCES order_items(id),
    return_date DATE NOT NULL DEFAULT CURRENT_DATE,
    quantity INTEGER NOT NULL,
    reason return_reason NOT NULL,
    refund_amount DECIMAL(10,2) DEFAULT 0.00,
    is_adjustment BOOLEAN DEFAULT false,
    adjustment_amount DECIMAL(10,2) DEFAULT 0.00,
    notes TEXT,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id UUID REFERENCES users(id)
);

-- Inventory table
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL, -- colors, chemicals, materials
    current_stock DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    unit VARCHAR(20) DEFAULT 'kg',
    reorder_level DECIMAL(10,2) DEFAULT 0.00,
    cost_per_unit DECIMAL(10,2) DEFAULT 0.00,
    supplier_name VARCHAR(100),
    supplier_contact VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id UUID REFERENCES users(id),
    updated_by_user_id UUID REFERENCES users(id)
);

-- Inventory Adjustments table (for tracking stock changes)
CREATE TABLE inventory_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_id UUID NOT NULL REFERENCES inventory(id),
    adjustment_type VARCHAR(20) NOT NULL, -- 'addition', 'deduction', 'correction'
    quantity_change DECIMAL(10,2) NOT NULL,
    reason VARCHAR(200),
    notes TEXT,
    adjustment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id UUID REFERENCES users(id)
);

-- Expenses table
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method payment_method,
    receipt_number VARCHAR(100),
    notes TEXT,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id UUID REFERENCES users(id)
);

-- Audit Log table (for tracking changes)
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(10) NOT NULL, -- INSERT, UPDATE, DELETE
    old_values JSONB,
    new_values JSONB,
    changed_by_user_id UUID REFERENCES users(id),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
CREATE INDEX idx_material_in_received_date ON material_in(received_date);
CREATE INDEX idx_material_in_is_deleted ON material_in(is_deleted);

CREATE INDEX idx_delivery_challans_customer_id ON delivery_challans(customer_id);
CREATE INDEX idx_delivery_challans_challan_date ON delivery_challans(challan_date);
CREATE INDEX idx_delivery_challans_challan_number ON delivery_challans(challan_number);
CREATE INDEX idx_delivery_challans_is_deleted ON delivery_challans(is_deleted);

CREATE INDEX idx_challan_items_challan_id ON challan_items(challan_id);
CREATE INDEX idx_challan_items_order_item_id ON challan_items(order_item_id);

CREATE INDEX idx_material_out_challan_id ON material_out(challan_id);
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

-- Step 5: Create Functions and Triggers

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to generate sequential numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    year_part TEXT;
BEGIN
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 9) AS INTEGER)), 0) + 1
    INTO next_number
    FROM orders
    WHERE order_number LIKE 'ORD-' || year_part || '-%';
    
    RETURN 'ORD-' || year_part || '-' || LPAD(next_number::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_challan_number()
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    year_part TEXT;
BEGIN
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(challan_number FROM 8) AS INTEGER)), 0) + 1
    INTO next_number
    FROM delivery_challans
    WHERE challan_number LIKE 'CH-' || year_part || '-%';
    
    RETURN 'CH-' || year_part || '-' || LPAD(next_number::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    year_part TEXT;
BEGIN
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 9) AS INTEGER)), 0) + 1
    INTO next_number
    FROM gst_invoices
    WHERE invoice_number LIKE 'INV-' || year_part || '-%';
    
    RETURN 'INV-' || year_part || '-' || LPAD(next_number::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to update order total amount
CREATE OR REPLACE FUNCTION update_order_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE orders 
    SET total_amount = (
        SELECT COALESCE(SUM(quantity * unit_price), 0)
        FROM order_items 
        WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
        AND is_deleted = false
    )
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to update invoice outstanding amount
CREATE OR REPLACE FUNCTION update_invoice_outstanding()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE gst_invoices 
    SET outstanding_amount = final_amount - (
        SELECT COALESCE(SUM(amount), 0)
        FROM payments 
        WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
        AND is_deleted = false
    )
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at columns
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

-- Triggers for business logic
CREATE TRIGGER trigger_update_order_total
    AFTER INSERT OR UPDATE OR DELETE ON order_items
    FOR EACH ROW EXECUTE FUNCTION update_order_total();

CREATE TRIGGER trigger_update_invoice_outstanding
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_invoice_outstanding();

-- Step 6: Create Views for Common Queries

-- View for pending orders with customer details
CREATE VIEW v_pending_orders AS
SELECT 
    o.id,
    o.order_number,
    o.order_date,
    o.status,
    o.total_amount,
    c.name as customer_name,
    c.phone as customer_phone,
    COUNT(oi.id) as total_items,
    COUNT(CASE WHEN oi.production_stage = 'pre_treatment' THEN 1 END) as pre_treatment_items,
    COUNT(CASE WHEN oi.production_stage = 'printing' THEN 1 END) as printing_items,
    COUNT(CASE WHEN oi.production_stage = 'post_process' THEN 1 END) as post_process_items
FROM orders o
JOIN customers c ON o.customer_id = c.id
LEFT JOIN order_items oi ON o.id = oi.order_id AND oi.is_deleted = false
WHERE o.status IN ('pending', 'in_progress') 
AND o.is_deleted = false
AND c.is_deleted = false
GROUP BY o.id, o.order_number, o.order_date, o.status, o.total_amount, c.name, c.phone;

-- View for low stock items
CREATE VIEW v_low_stock_items AS
SELECT 
    id,
    item_name,
    category,
    current_stock,
    reorder_level,
    unit,
    supplier_name,
    (current_stock - reorder_level) as stock_deficit
FROM inventory
WHERE current_stock <= reorder_level
AND is_active = true
AND is_deleted = false;

-- View for outstanding receivables
CREATE VIEW v_outstanding_receivables AS
SELECT 
    i.id,
    i.invoice_number,
    i.invoice_date,
    i.final_amount,
    i.outstanding_amount,
    c.name as customer_name,
    c.phone as customer_phone,
    c.gst_number as customer_gst,
    (CURRENT_DATE - i.invoice_date) as days_outstanding
FROM gst_invoices i
JOIN customers c ON i.customer_id = c.id
WHERE i.outstanding_amount > 0
AND i.is_deleted = false
AND c.is_deleted = false
ORDER BY i.invoice_date;

-- View for material flow summary
CREATE VIEW v_material_flow_summary AS
SELECT 
    DATE(created_at) as flow_date,
    'Material In' as flow_type,
    material_type,
    SUM(quantity) as total_quantity,
    unit
FROM material_in
WHERE is_deleted = false
GROUP BY DATE(created_at), material_type, unit

UNION ALL

SELECT 
    DATE(created_at) as flow_date,
    'Material Out' as flow_type,
    material_type,
    SUM(quantity) as total_quantity,
    unit
FROM material_out
WHERE is_deleted = false
GROUP BY DATE(created_at), material_type, unit;

-- Step 7: Insert Initial Configuration Data

-- Insert default admin user (password: admin123)
INSERT INTO users (username, email, password_hash, full_name, role) VALUES
('admin', 'admin@textile.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeUcUm1eTBQNrGsAS', 'System Administrator', 'admin');

-- Insert sample inventory categories
INSERT INTO inventory (item_name, category, current_stock, unit, reorder_level, cost_per_unit, created_by_user_id) VALUES
('Red Dye', 'colors', 25.00, 'kg', 5.00, 150.00, (SELECT id FROM users WHERE username = 'admin')),
('Blue Dye', 'colors', 20.00, 'kg', 5.00, 150.00, (SELECT id FROM users WHERE username = 'admin')),
('Fixing Agent', 'chemicals', 50.00, 'liters', 10.00, 80.00, (SELECT id FROM users WHERE username = 'admin')),
('Thickener', 'chemicals', 30.00, 'kg', 10.00, 120.00, (SELECT id FROM users WHERE username = 'admin'));

-- Insert sample expense categories (for reference)
INSERT INTO expenses (expense_date, category, description, amount, payment_method, created_by_user_id) VALUES
('2024-01-01', 'Setup', 'Initial system setup', 0.00, 'cash', (SELECT id FROM users WHERE username = 'admin'));

-- Step 8: Grant Permissions (if needed)
-- These would be set based on your specific user requirements
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO textile_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO textile_app_user;

-- Step 9: Create Constraints for Data Integrity

-- Ensure positive quantities and amounts
ALTER TABLE order_items ADD CONSTRAINT chk_order_items_quantity_positive CHECK (quantity > 0);
ALTER TABLE order_items ADD CONSTRAINT chk_order_items_unit_price_non_negative CHECK (unit_price >= 0);
ALTER TABLE material_in ADD CONSTRAINT chk_material_in_quantity_positive CHECK (quantity > 0);
ALTER TABLE material_out ADD CONSTRAINT chk_material_out_quantity_positive CHECK (quantity > 0);
ALTER TABLE payments ADD CONSTRAINT chk_payments_amount_positive CHECK (amount > 0);
ALTER TABLE returns ADD CONSTRAINT chk_returns_quantity_positive CHECK (quantity > 0);
ALTER TABLE inventory ADD CONSTRAINT chk_inventory_current_stock_non_negative CHECK (current_stock >= 0);
ALTER TABLE inventory ADD CONSTRAINT chk_inventory_reorder_level_non_negative CHECK (reorder_level >= 0);
ALTER TABLE expenses ADD CONSTRAINT chk_expenses_amount_positive CHECK (amount > 0);

-- Ensure GST rates are valid
ALTER TABLE gst_invoices ADD CONSTRAINT chk_gst_rates_valid CHECK (
    cgst_rate >= 0 AND cgst_rate <= 100 AND
    sgst_rate >= 0 AND sgst_rate <= 100 AND
    igst_rate >= 0 AND igst_rate <= 100
);

-- Ensure invoice amounts are consistent
ALTER TABLE gst_invoices ADD CONSTRAINT chk_invoice_amounts_consistent CHECK (
    final_amount >= total_amount AND
    outstanding_amount >= 0 AND
    outstanding_amount <= final_amount
);

-- Unique constraint to prevent duplicate phone numbers for active customers
CREATE UNIQUE INDEX idx_customers_phone_unique 
ON customers (phone) 
WHERE is_deleted = false AND phone IS NOT NULL;

-- Ensure challan items don't exceed order item quantities
-- This would be enforced in application logic rather than database constraints

COMMIT;

-- End of schema creation
-- Total tables created: 14
-- Total indexes created: 25+
-- Total triggers created: 8
-- Total views created: 4
-- Total functions created: 6 