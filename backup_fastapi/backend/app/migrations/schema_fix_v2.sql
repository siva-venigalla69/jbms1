-- Schema Fix V2: Comprehensive database schema improvements
-- This migration fixes enum issues and improves database structure

-- Start transaction
BEGIN;

-- 1. Fix enum columns to use string types for better compatibility
-- Update users table role column
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_user_role;
ALTER TABLE users ADD CONSTRAINT check_user_role 
    CHECK (role IN ('admin', 'manager', 'employee'));

-- Update orders table status column  
ALTER TABLE orders DROP CONSTRAINT IF EXISTS check_order_status;
ALTER TABLE orders ADD CONSTRAINT check_order_status 
    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'));

-- Update order_items table material_type and production_stage columns
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS check_material_type;
ALTER TABLE order_items ADD CONSTRAINT check_material_type 
    CHECK (material_type IN ('saree', 'dupatta', 'voni', 'running_material', 'blouse_material'));

ALTER TABLE order_items DROP CONSTRAINT IF EXISTS check_production_stage;
ALTER TABLE order_items ADD CONSTRAINT check_production_stage 
    CHECK (production_stage IN ('pre_treatment', 'printing', 'post_process'));

-- Update material_in table material_type column
ALTER TABLE material_in DROP CONSTRAINT IF EXISTS check_material_in_type;
ALTER TABLE material_in ADD CONSTRAINT check_material_in_type 
    CHECK (material_type IN ('saree', 'dupatta', 'voni', 'running_material', 'blouse_material'));

-- Update material_out table material_type column
ALTER TABLE material_out DROP CONSTRAINT IF EXISTS check_material_out_type;
ALTER TABLE material_out ADD CONSTRAINT check_material_out_type 
    CHECK (material_type IN ('saree', 'dupatta', 'voni', 'running_material', 'blouse_material'));

-- Update payments table payment_method column
ALTER TABLE payments DROP CONSTRAINT IF EXISTS check_payment_method;
ALTER TABLE payments ADD CONSTRAINT check_payment_method 
    CHECK (payment_method IN ('cash', 'upi', 'bank_transfer', 'cheque'));

-- Update returns table reason column
ALTER TABLE returns DROP CONSTRAINT IF EXISTS check_return_reason;
ALTER TABLE returns ADD CONSTRAINT check_return_reason 
    CHECK (reason IN ('damaged', 'defective', 'wrong_design', 'customer_request'));

-- Update inventory_adjustments table adjustment_type column
ALTER TABLE inventory_adjustments DROP CONSTRAINT IF EXISTS check_adjustment_type;
ALTER TABLE inventory_adjustments ADD CONSTRAINT check_adjustment_type 
    CHECK (adjustment_type IN ('quantity_change', 'reason'));

-- Update expenses table payment_method column
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS check_expense_payment_method;
ALTER TABLE expenses ADD CONSTRAINT check_expense_payment_method 
    CHECK (payment_method IN ('cash', 'upi', 'bank_transfer', 'cheque'));

-- 2. Add missing indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_production_stage ON order_items(production_stage);

CREATE INDEX IF NOT EXISTS idx_material_in_customer_id ON material_in(customer_id);
CREATE INDEX IF NOT EXISTS idx_material_in_order_id ON material_in(order_id);
CREATE INDEX IF NOT EXISTS idx_material_in_received_date ON material_in(received_date);

CREATE INDEX IF NOT EXISTS idx_delivery_challans_customer_id ON delivery_challans(customer_id);
CREATE INDEX IF NOT EXISTS idx_delivery_challans_challan_date ON delivery_challans(challan_date);
CREATE INDEX IF NOT EXISTS idx_delivery_challans_is_delivered ON delivery_challans(is_delivered);

CREATE INDEX IF NOT EXISTS idx_gst_invoices_customer_id ON gst_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_gst_invoices_invoice_date ON gst_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_gst_invoices_outstanding_amount ON gst_invoices(outstanding_amount);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);

CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_current_stock ON inventory(current_stock);
CREATE INDEX IF NOT EXISTS idx_inventory_reorder_level ON inventory(reorder_level);

CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON audit_log(changed_at);

-- 3. Add database triggers for automatic audit logging
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, record_id, action, new_values, changed_at, changed_by_user_id)
        VALUES (TG_TABLE_NAME, NEW.id::text, 'INSERT', 
                row_to_json(NEW)::text, NOW(), 
                COALESCE(NEW.created_by_user_id, NEW.updated_by_user_id));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_at, changed_by_user_id)
        VALUES (TG_TABLE_NAME, NEW.id::text, 'UPDATE', 
                row_to_json(OLD)::text, row_to_json(NEW)::text, NOW(),
                COALESCE(NEW.updated_by_user_id, NEW.created_by_user_id));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values, changed_at, changed_by_user_id)
        VALUES (TG_TABLE_NAME, OLD.id::text, 'DELETE', 
                row_to_json(OLD)::text, NOW(), 
                COALESCE(OLD.updated_by_user_id, OLD.created_by_user_id));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to important tables
DROP TRIGGER IF EXISTS customers_audit_trigger ON customers;
CREATE TRIGGER customers_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON customers
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS orders_audit_trigger ON orders;
CREATE TRIGGER orders_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS gst_invoices_audit_trigger ON gst_invoices;
CREATE TRIGGER gst_invoices_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON gst_invoices
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS payments_audit_trigger ON payments;
CREATE TRIGGER payments_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- 4. Create database views for reporting
CREATE OR REPLACE VIEW v_pending_orders AS
SELECT 
    o.id,
    o.order_number,
    c.name as customer_name,
    o.order_date,
    o.status,
    COUNT(oi.id) as total_items,
    SUM(oi.quantity) as total_quantity,
    COUNT(CASE WHEN oi.production_stage = 'post_process' THEN 1 END) as post_process_items
FROM orders o
JOIN customers c ON o.customer_id = c.id
LEFT JOIN order_items oi ON o.id = oi.order_id AND oi.is_deleted = false
WHERE o.is_deleted = false 
    AND o.status IN ('pending', 'in_progress')
GROUP BY o.id, o.order_number, c.name, o.order_date, o.status;

CREATE OR REPLACE VIEW v_stock_items AS
SELECT 
    i.id,
    i.item_name,
    i.category,
    i.current_stock,
    i.reorder_level,
    i.unit,
    i.supplier_name,
    i.supplier_contact,
    CASE 
        WHEN i.current_stock <= i.reorder_level THEN 'LOW_STOCK'
        ELSE 'NORMAL'
    END as stock_status
FROM inventory i
WHERE i.is_deleted = false AND i.is_active = true;

CREATE OR REPLACE VIEW v_outstanding_receivables AS
SELECT 
    inv.id,
    inv.invoice_number,
    inv.invoice_date,
    c.name as customer_name,
    c.phone as customer_phone,
    c.gst_number as customer_gst,
    inv.total_amount as final_amount,
    inv.outstanding_amount,
    EXTRACT(days FROM (NOW() - inv.invoice_date)) as days_outstanding
FROM gst_invoices inv
JOIN customers c ON inv.customer_id = c.id
WHERE inv.is_deleted = false 
    AND inv.outstanding_amount > 0
ORDER BY inv.invoice_date DESC;

CREATE OR REPLACE VIEW v_material_flow_summary AS
SELECT 
    DATE(mi.received_date) as flow_date,
    'MATERIAL_IN' as flow_type,
    mi.material_type,
    SUM(mi.quantity) as total_quantity,
    c.name as customer_name
FROM material_in mi
JOIN customers c ON mi.customer_id = c.id
WHERE mi.is_deleted = false
GROUP BY DATE(mi.received_date), mi.material_type, c.name

UNION ALL

SELECT 
    DATE(mo.dispatch_date) as flow_date,
    'MATERIAL_OUT' as flow_type,
    mo.material_type,
    SUM(mo.quantity) as total_quantity,
    c.name as customer_name
FROM material_out mo
JOIN customers c ON mo.customer_id = c.id
WHERE mo.is_deleted = false
GROUP BY DATE(mo.dispatch_date), mo.material_type, c.name

ORDER BY flow_date DESC, flow_type, material_type;

-- 5. Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to tables that have updated_at column
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_order_items_updated_at ON order_items;
CREATE TRIGGER update_order_items_updated_at
    BEFORE UPDATE ON order_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_delivery_challans_updated_at ON delivery_challans;
CREATE TRIGGER update_delivery_challans_updated_at
    BEFORE UPDATE ON delivery_challans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_gst_invoices_updated_at ON gst_invoices;
CREATE TRIGGER update_gst_invoices_updated_at
    BEFORE UPDATE ON gst_invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Add data validation constraints
ALTER TABLE customers 
    ADD CONSTRAINT check_customer_name_length 
    CHECK (length(trim(name)) >= 2 AND length(trim(name)) <= 255);

ALTER TABLE customers 
    ADD CONSTRAINT check_phone_length 
    CHECK (phone IS NULL OR length(trim(phone)) >= 10);

ALTER TABLE orders 
    ADD CONSTRAINT check_total_amount_positive 
    CHECK (total_amount >= 0);

ALTER TABLE order_items 
    ADD CONSTRAINT check_quantity_positive 
    CHECK (quantity > 0);

ALTER TABLE order_items 
    ADD CONSTRAINT check_unit_price_positive 
    CHECK (unit_price >= 0);

ALTER TABLE gst_invoices 
    ADD CONSTRAINT check_invoice_amounts_positive 
    CHECK (subtotal >= 0 AND total_amount >= 0 AND outstanding_amount >= 0);

ALTER TABLE payments 
    ADD CONSTRAINT check_payment_amount_positive 
    CHECK (amount > 0);

-- 7. Set default values for better data consistency
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'employee';
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE order_items ALTER COLUMN production_stage SET DEFAULT 'pre_treatment';
ALTER TABLE delivery_challans ALTER COLUMN is_delivered SET DEFAULT false;
ALTER TABLE inventory ALTER COLUMN is_active SET DEFAULT true;

-- Commit transaction
COMMIT;

-- Vacuum and analyze for performance
VACUUM ANALYZE;