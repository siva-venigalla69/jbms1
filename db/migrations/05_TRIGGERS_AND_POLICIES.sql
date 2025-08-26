-- =====================================
-- TRIGGERS AND ROW LEVEL SECURITY POLICIES
-- Business logic automation and data security
-- Version: 1.0
-- =====================================

-- Enable Row Level Security on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_in ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_challans ENABLE ROW LEVEL SECURITY;
ALTER TABLE challan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_out ENABLE ROW LEVEL SECURITY;
ALTER TABLE gst_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_design_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_printing_queue ENABLE ROW LEVEL SECURITY;

-- =====================================
-- SECTION 1: AUDIT TRAIL TRIGGERS
-- =====================================

-- Function to capture audit trail
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_trail (
            table_name, 
            record_id, 
            action, 
            new_values, 
            changed_by, 
            ip_address
        ) VALUES (
            TG_TABLE_NAME,
            NEW.id,
            'INSERT',
            row_to_json(NEW),
            COALESCE(current_setting('app.current_user_id', true)::UUID, NEW.created_by_user_id),
            inet_client_addr()
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_trail (
            table_name, 
            record_id, 
            action, 
            old_values,
            new_values, 
            changed_by, 
            ip_address
        ) VALUES (
            TG_TABLE_NAME,
            NEW.id,
            'UPDATE',
            row_to_json(OLD),
            row_to_json(NEW),
            COALESCE(current_setting('app.current_user_id', true)::UUID, NEW.updated_by_user_id),
            inet_client_addr()
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_trail (
            table_name, 
            record_id, 
            action, 
            old_values, 
            changed_by, 
            ip_address
        ) VALUES (
            TG_TABLE_NAME,
            OLD.id,
            'DELETE',
            row_to_json(OLD),
            current_setting('app.current_user_id', true)::UUID,
            inet_client_addr()
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers for core tables
CREATE TRIGGER audit_customers_trigger
    AFTER INSERT OR UPDATE OR DELETE ON customers
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_orders_trigger
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_material_stock_trigger
    AFTER INSERT OR UPDATE OR DELETE ON material_stock
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_delivery_challans_trigger
    AFTER INSERT OR UPDATE OR DELETE ON delivery_challans
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_gst_invoices_trigger
    AFTER INSERT OR UPDATE OR DELETE ON gst_invoices
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- =====================================
-- SECTION 2: BUSINESS LOGIC TRIGGERS
-- =====================================

-- Function to update material stock automatically
CREATE OR REPLACE FUNCTION update_material_stock_trigger()
RETURNS TRIGGER AS $$
DECLARE
    stock_record RECORD;
BEGIN
    -- Handle material_in (receipt) events
    IF TG_TABLE_NAME = 'material_in' THEN
        IF TG_OP = 'INSERT' THEN
            -- Add to stock
            INSERT INTO material_stock (
                customer_id, 
                material_type, 
                total_received, 
                current_stock
            ) VALUES (
                NEW.customer_id,
                NEW.material_type,
                NEW.quantity,
                NEW.quantity
            )
            ON CONFLICT (customer_id, material_type) DO UPDATE SET
                total_received = material_stock.total_received + NEW.quantity,
                current_stock = material_stock.current_stock + NEW.quantity,
                last_updated = NOW();
                
            -- Log stock history
            INSERT INTO material_stock_history (
                material_stock_id,
                customer_id,
                material_type,
                previous_stock,
                quantity_change,
                new_stock,
                change_type,
                reference_type,
                reference_id,
                changed_by
            ) SELECT 
                ms.id,
                NEW.customer_id,
                NEW.material_type,
                ms.current_stock - NEW.quantity,
                NEW.quantity,
                ms.current_stock,
                'receipt',
                'material_in',
                NEW.id,
                NEW.created_by_user_id
            FROM material_stock ms 
            WHERE ms.customer_id = NEW.customer_id 
            AND ms.material_type = NEW.material_type;
        END IF;
    END IF;
    
    -- Handle material_out (delivery) events
    IF TG_TABLE_NAME = 'material_out' THEN
        IF TG_OP = 'INSERT' THEN
            -- Reduce from stock
            UPDATE material_stock SET
                total_delivered = total_delivered + NEW.quantity,
                current_stock = current_stock - NEW.quantity,
                last_updated = NOW()
            WHERE customer_id = NEW.customer_id 
            AND material_type = NEW.material_type;
            
            -- Log stock history
            INSERT INTO material_stock_history (
                material_stock_id,
                customer_id,
                material_type,
                previous_stock,
                quantity_change,
                new_stock,
                change_type,
                reference_type,
                reference_id,
                changed_by
            ) SELECT 
                ms.id,
                NEW.customer_id,
                NEW.material_type,
                ms.current_stock + NEW.quantity,
                -NEW.quantity,
                ms.current_stock,
                'delivery',
                'material_out',
                NEW.id,
                NEW.created_by_user_id
            FROM material_stock ms 
            WHERE ms.customer_id = NEW.customer_id 
            AND ms.material_type = NEW.material_type;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create stock update triggers
CREATE TRIGGER material_in_stock_trigger
    AFTER INSERT ON material_in
    FOR EACH ROW EXECUTE FUNCTION update_material_stock_trigger();

CREATE TRIGGER material_out_stock_trigger
    AFTER INSERT ON material_out
    FOR EACH ROW EXECUTE FUNCTION update_material_stock_trigger();

-- =====================================
-- SECTION 3: ORDER MANAGEMENT TRIGGERS
-- =====================================

-- Function to update order totals
CREATE OR REPLACE FUNCTION update_order_totals_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Update order total when order items change
    IF TG_TABLE_NAME = 'order_items' THEN
        UPDATE orders SET
            total_amount = (
                SELECT COALESCE(SUM(quantity * unit_price), 0)
                FROM order_items 
                WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
            ),
            updated_at = NOW()
        WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create order total update trigger
CREATE TRIGGER order_items_total_trigger
    AFTER INSERT OR UPDATE OR DELETE ON order_items
    FOR EACH ROW EXECUTE FUNCTION update_order_totals_trigger();

-- =====================================
-- SECTION 4: INVOICE MANAGEMENT TRIGGERS
-- =====================================

-- Function to update invoice calculations
CREATE OR REPLACE FUNCTION update_invoice_calculations_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Calculate tax amounts based on rates
        NEW.total_tax_amount := NEW.cgst_amount + NEW.sgst_amount + NEW.igst_amount;
        NEW.grand_total := NEW.total_amount + NEW.total_tax_amount;
        
        -- Set outstanding amount to grand total for new invoices
        IF TG_OP = 'INSERT' THEN
            NEW.outstanding_amount := NEW.grand_total;
        END IF;
        
        RETURN NEW;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create invoice calculation trigger
CREATE TRIGGER gst_invoices_calculation_trigger
    BEFORE INSERT OR UPDATE ON gst_invoices
    FOR EACH ROW EXECUTE FUNCTION update_invoice_calculations_trigger();

-- Function to update outstanding amounts on payment
CREATE OR REPLACE FUNCTION update_outstanding_on_payment_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Reduce outstanding amount
        UPDATE gst_invoices SET
            outstanding_amount = outstanding_amount - NEW.payment_amount,
            updated_at = NOW()
        WHERE id = NEW.invoice_id;
    ELSIF TG_OP = 'DELETE' THEN
        -- Increase outstanding amount (payment reversal)
        UPDATE gst_invoices SET
            outstanding_amount = outstanding_amount + OLD.payment_amount,
            updated_at = NOW()
        WHERE id = OLD.invoice_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create payment outstanding update trigger
CREATE TRIGGER payments_outstanding_trigger
    AFTER INSERT OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_outstanding_on_payment_trigger();

-- =====================================
-- SECTION 5: DELIVERY CHALLAN TRIGGERS
-- =====================================

-- Function to update challan totals
CREATE OR REPLACE FUNCTION update_challan_totals_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Update challan total when challan items change
    IF TG_TABLE_NAME = 'challan_items' THEN
        UPDATE delivery_challans SET
            total_quantity = (
                SELECT COALESCE(SUM(quantity), 0)
                FROM challan_items 
                WHERE challan_id = COALESCE(NEW.challan_id, OLD.challan_id)
            ),
            total_amount = (
                SELECT COALESCE(SUM(line_total), 0)
                FROM challan_items 
                WHERE challan_id = COALESCE(NEW.challan_id, OLD.challan_id)
            ),
            updated_at = NOW()
        WHERE id = COALESCE(NEW.challan_id, OLD.challan_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create challan total update trigger
CREATE TRIGGER challan_items_total_trigger
    AFTER INSERT OR UPDATE OR DELETE ON challan_items
    FOR EACH ROW EXECUTE FUNCTION update_challan_totals_trigger();

-- =====================================
-- SECTION 6: ROW LEVEL SECURITY POLICIES
-- =====================================

-- Admin policy (full access)
CREATE POLICY admin_all_access ON customers
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            JOIN user_roles ur ON u.role = ur.id 
            WHERE u.id::text = auth.uid()::text 
            AND ur.name = 'admin'
        )
    );

-- Manager policy (full business access)  
CREATE POLICY manager_business_access ON customers
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            JOIN user_roles ur ON u.role = ur.id 
            WHERE u.id::text = auth.uid()::text 
            AND ur.name IN ('admin', 'manager')
        )
    );

-- Apply similar policies to other tables
CREATE POLICY admin_orders_access ON orders FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            JOIN user_roles ur ON u.role = ur.id 
            WHERE u.id::text = auth.uid()::text 
            AND ur.name IN ('admin', 'manager', 'operator')
        )
    );

CREATE POLICY admin_material_access ON material_stock FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            JOIN user_roles ur ON u.role = ur.id 
            WHERE u.id::text = auth.uid()::text 
            AND ur.name IN ('admin', 'manager', 'operator')
        )
    );

CREATE POLICY admin_invoices_access ON gst_invoices FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            JOIN user_roles ur ON u.role = ur.id 
            WHERE u.id::text = auth.uid()::text 
            AND ur.name IN ('admin', 'manager', 'accounts')
        )
    );

-- Design system policies
CREATE POLICY design_access ON design_submissions FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            JOIN user_roles ur ON u.role = ur.id 
            WHERE u.id::text = auth.uid()::text 
            AND ur.name IN ('admin', 'manager', 'designer', 'operator')
        )
    );

-- =====================================
-- SECTION 7: UPDATED_AT TRIGGERS
-- =====================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables with updated_at column
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_items_updated_at BEFORE UPDATE ON order_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_challans_updated_at BEFORE UPDATE ON delivery_challans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gst_invoices_updated_at BEFORE UPDATE ON gst_invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_design_submissions_updated_at BEFORE UPDATE ON design_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_material_design_mapping_updated_at BEFORE UPDATE ON material_design_mapping
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_design_printing_queue_updated_at BEFORE UPDATE ON design_printing_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================
-- SECTION 8: NOTIFICATION TRIGGERS
-- =====================================

-- Function for low stock notifications
CREATE OR REPLACE FUNCTION check_low_stock_notification()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Check if stock fell below minimum threshold
        IF OLD.current_stock >= OLD.minimum_threshold 
           AND NEW.current_stock < NEW.minimum_threshold 
           AND NEW.minimum_threshold > 0 THEN
            
            -- Log as deployment issue for notification
            PERFORM log_deployment_issue(
                'warning',
                'inventory',
                'Low Stock Alert',
                'Material stock fell below minimum threshold: ' || NEW.current_stock || ' < ' || NEW.minimum_threshold,
                ARRAY['material_stock']
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create low stock notification trigger
CREATE TRIGGER low_stock_notification_trigger
    AFTER UPDATE ON material_stock
    FOR EACH ROW EXECUTE FUNCTION check_low_stock_notification();

-- =====================================
-- TRIGGERS AND POLICIES VALIDATION
-- =====================================

-- Verify all triggers are created
SELECT 
    'TRIGGERS VALIDATION' as status,
    COUNT(*) as total_triggers_created
FROM pg_trigger 
WHERE tgrelid IN (
    SELECT oid FROM pg_class 
    WHERE relname IN ('customers', 'orders', 'material_stock', 'gst_invoices', 'delivery_challans')
);

-- Verify RLS is enabled
SELECT 
    'RLS VALIDATION' as status,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('customers', 'orders', 'material_stock', 'gst_invoices')
ORDER BY tablename;

-- Log this deployment
INSERT INTO deployment_history (
    deployment_type,
    script_name,
    status,
    description
) VALUES (
    'triggers_policies',
    '05_TRIGGERS_AND_POLICIES.sql',
    'completed',
    'Business logic triggers and security policies created'
);

-- Display trigger summary
SELECT 
    'TRIGGER SUMMARY' as report_type,
    schemaname,
    tablename,
    COUNT(*) as trigger_count
FROM pg_triggers 
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;