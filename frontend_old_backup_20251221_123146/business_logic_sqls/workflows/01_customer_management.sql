-- =========================================
-- CUSTOMER MANAGEMENT WORKFLOW SQLs
-- Complete customer lifecycle operations
-- =========================================

-- 1. CREATE NEW CUSTOMER
CREATE OR REPLACE FUNCTION create_customer(
    p_name VARCHAR(255),
    p_phone VARCHAR(20) DEFAULT NULL,
    p_email VARCHAR(255) DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_gst_number VARCHAR(15) DEFAULT NULL,
    p_credit_limit DECIMAL(12,2) DEFAULT 0
) RETURNS UUID AS $$
DECLARE
    v_customer_id UUID;
BEGIN
    INSERT INTO customers (name, phone, email, address, gst_number, credit_limit)
    VALUES (p_name, p_phone, p_email, p_address, p_gst_number, p_credit_limit)
    RETURNING id INTO v_customer_id;
    
    -- Log customer creation
    INSERT INTO audit_trail (table_name, record_id, action, new_values, changed_at)
    VALUES ('customers', v_customer_id, 'INSERT', 
            json_build_object('name', p_name, 'phone', p_phone, 'email', p_email), NOW());
    
    RETURN v_customer_id;
END;
$$ LANGUAGE plpgsql;

-- 2. UPDATE CUSTOMER INFORMATION
CREATE OR REPLACE FUNCTION update_customer(
    p_customer_id UUID,
    p_name VARCHAR(255) DEFAULT NULL,
    p_phone VARCHAR(20) DEFAULT NULL,
    p_email VARCHAR(255) DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_gst_number VARCHAR(15) DEFAULT NULL,
    p_credit_limit DECIMAL(12,2) DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_old_record RECORD;
    v_updated BOOLEAN := FALSE;
BEGIN
    -- Get old record for audit
    SELECT * INTO v_old_record FROM customers WHERE id = p_customer_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer not found: %', p_customer_id;
    END IF;
    
    -- Update only provided fields
    UPDATE customers SET
        name = COALESCE(p_name, name),
        phone = COALESCE(p_phone, phone),
        email = COALESCE(p_email, email),
        address = COALESCE(p_address, address),
        gst_number = COALESCE(p_gst_number, gst_number),
        credit_limit = COALESCE(p_credit_limit, credit_limit),
        updated_at = NOW()
    WHERE id = p_customer_id;
    
    GET DIAGNOSTICS v_updated = ROW_COUNT > 0;
    
    IF v_updated THEN
        INSERT INTO audit_trail (table_name, record_id, action, old_values, new_values, changed_at)
        VALUES ('customers', p_customer_id, 'UPDATE', 
                row_to_json(v_old_record), 
                json_build_object('name', p_name, 'phone', p_phone), NOW());
    END IF;
    
    RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

-- 3. SOFT DELETE CUSTOMER
CREATE OR REPLACE FUNCTION delete_customer(p_customer_id UUID) RETURNS BOOLEAN AS $$
DECLARE
    v_has_active_orders INTEGER;
    v_has_pending_payments INTEGER;
BEGIN
    -- Check for active orders
    SELECT COUNT(*) INTO v_has_active_orders
    FROM orders o 
    WHERE o.customer_id = p_customer_id AND o.is_deleted = FALSE;
    
    -- Check for pending payments
    SELECT COUNT(*) INTO v_has_pending_payments
    FROM gst_invoices gi 
    WHERE gi.customer_id = p_customer_id AND gi.payment_status != 'paid';
    
    IF v_has_active_orders > 0 THEN
        RAISE EXCEPTION 'Cannot delete customer with active orders. Found % active orders.', v_has_active_orders;
    END IF;
    
    IF v_has_pending_payments > 0 THEN
        RAISE EXCEPTION 'Cannot delete customer with pending payments. Found % unpaid invoices.', v_has_pending_payments;
    END IF;
    
    -- Soft delete
    UPDATE customers SET 
        is_deleted = TRUE, 
        is_active = FALSE,
        updated_at = NOW()
    WHERE id = p_customer_id;
    
    -- Log deletion
    INSERT INTO audit_trail (table_name, record_id, action, changed_at)
    VALUES ('customers', p_customer_id, 'SOFT_DELETE', NOW());
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 4. GET CUSTOMER SUMMARY WITH STATS
CREATE OR REPLACE FUNCTION get_customer_summary(p_customer_id UUID) 
RETURNS TABLE(
    customer_info JSON,
    total_orders INTEGER,
    active_orders INTEGER,
    total_invoiced DECIMAL(12,2),
    total_paid DECIMAL(12,2),
    outstanding_amount DECIMAL(12,2),
    current_stock_value DECIMAL(12,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        row_to_json(c.*) as customer_info,
        COALESCE(stats.total_orders, 0) as total_orders,
        COALESCE(stats.active_orders, 0) as active_orders,
        COALESCE(stats.total_invoiced, 0) as total_invoiced,
        COALESCE(stats.total_paid, 0) as total_paid,
        COALESCE(stats.total_invoiced - stats.total_paid, 0) as outstanding_amount,
        COALESCE(stock.stock_value, 0) as current_stock_value
    FROM customers c
    LEFT JOIN (
        SELECT 
            o.customer_id,
            COUNT(o.id) as total_orders,
            COUNT(CASE WHEN o.is_deleted = FALSE THEN 1 END) as active_orders,
            SUM(gi.total_amount) as total_invoiced,
            SUM(p.payment_amount) as total_paid
        FROM orders o
        LEFT JOIN gst_invoices gi ON gi.customer_id = o.customer_id
        LEFT JOIN payments p ON p.invoice_id = gi.id
        WHERE o.customer_id = p_customer_id
        GROUP BY o.customer_id
    ) stats ON stats.customer_id = c.id
    LEFT JOIN (
        SELECT 
            ms.customer_id,
            SUM(ms.current_stock * oi.unit_price) as stock_value
        FROM material_stock ms
        JOIN order_items oi ON oi.material_type::TEXT = ms.material_type
        WHERE ms.customer_id = p_customer_id
        GROUP BY ms.customer_id
    ) stock ON stock.customer_id = c.id
    WHERE c.id = p_customer_id;
END;
$$ LANGUAGE plpgsql;

-- 5. SEARCH CUSTOMERS WITH FILTERS
CREATE OR REPLACE FUNCTION search_customers(
    p_search_term TEXT DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT NULL,
    p_has_outstanding BOOLEAN DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
) 
RETURNS TABLE(
    id UUID,
    name VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    current_balance DECIMAL(12,2),
    total_orders BIGINT,
    last_order_date DATE,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.phone,
        c.email,
        c.current_balance,
        COUNT(o.id) as total_orders,
        MAX(o.order_date) as last_order_date,
        c.created_at
    FROM customers c
    LEFT JOIN orders o ON o.customer_id = c.id AND o.is_deleted = FALSE
    WHERE 
        c.is_deleted = FALSE
        AND (p_search_term IS NULL OR (
            c.name ILIKE '%' || p_search_term || '%' OR
            c.phone ILIKE '%' || p_search_term || '%' OR
            c.email ILIKE '%' || p_search_term || '%'
        ))
        AND (p_is_active IS NULL OR c.is_active = p_is_active)
        AND (p_has_outstanding IS NULL OR (
            CASE WHEN p_has_outstanding THEN c.current_balance > 0 
                 ELSE c.current_balance = 0 END
        ))
    GROUP BY c.id, c.name, c.phone, c.email, c.current_balance, c.created_at
    ORDER BY c.name
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- USAGE EXAMPLES:
-- 1. Create customer: SELECT create_customer('ABC Textiles', '+91-9876543210', 'abc@textiles.com', '123 Market St', '29ABCDE1234F1Z5', 50000);
-- 2. Update customer: SELECT update_customer('customer-uuid', 'ABC Textiles Ltd', '+91-9876543211');
-- 3. Get summary: SELECT * FROM get_customer_summary('customer-uuid');
-- 4. Search customers: SELECT * FROM search_customers('ABC', TRUE, FALSE, 10, 0);