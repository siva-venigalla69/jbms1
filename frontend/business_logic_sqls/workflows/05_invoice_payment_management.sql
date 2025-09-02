-- =========================================
-- INVOICE & PAYMENT MANAGEMENT WORKFLOW SQLs
-- Complete billing and payment operations
-- =========================================

-- 1. CREATE GST INVOICE FROM DELIVERIES
CREATE OR REPLACE FUNCTION create_gst_invoice(
    p_customer_id UUID,
    p_invoice_number VARCHAR(100),
    p_invoice_date DATE DEFAULT CURRENT_DATE,
    p_due_date DATE DEFAULT NULL,
    p_challan_ids UUID[], -- Array of challan IDs to include
    p_gst_treatment VARCHAR(20) DEFAULT 'taxable',
    p_place_of_supply VARCHAR(100) DEFAULT NULL,
    p_tax_rate DECIMAL(5,2) DEFAULT 18.00
) RETURNS UUID AS $$
DECLARE
    v_invoice_id UUID;
    v_challan_id UUID;
    v_subtotal DECIMAL(12,2) := 0;
    v_tax_amount DECIMAL(12,2);
    v_total_amount DECIMAL(12,2);
    v_challan_item RECORD;
BEGIN
    -- Validate customer
    IF NOT EXISTS (SELECT 1 FROM customers WHERE id = p_customer_id AND is_deleted = FALSE) THEN
        RAISE EXCEPTION 'Customer not found or inactive: %', p_customer_id;
    END IF;
    
    -- Create invoice header
    INSERT INTO gst_invoices (
        customer_id, invoice_number, invoice_date, due_date,
        gst_treatment, place_of_supply
    ) VALUES (
        p_customer_id, p_invoice_number, p_invoice_date, 
        COALESCE(p_due_date, p_invoice_date + INTERVAL '30 days'),
        p_gst_treatment, p_place_of_supply
    ) RETURNING id INTO v_invoice_id;
    
    -- Process each challan
    FOREACH v_challan_id IN ARRAY p_challan_ids
    LOOP
        -- Validate challan belongs to customer and is not already invoiced
        IF NOT EXISTS (
            SELECT 1 FROM delivery_challans dc 
            WHERE dc.id = v_challan_id 
            AND dc.customer_id = p_customer_id 
            AND dc.is_deleted = FALSE
        ) THEN
            RAISE EXCEPTION 'Challan not found or does not belong to customer: %', v_challan_id;
        END IF;
        
        -- Check if challan is already invoiced
        IF EXISTS (SELECT 1 FROM invoice_challans WHERE challan_id = v_challan_id) THEN
            RAISE EXCEPTION 'Challan % is already invoiced', v_challan_id;
        END IF;
        
        -- Link challan to invoice
        INSERT INTO invoice_challans (invoice_id, challan_id) VALUES (v_invoice_id, v_challan_id);
        
        -- Create invoice line items for each challan item
        FOR v_challan_item IN 
            SELECT ci.*, oi.order_id, mt.name as material_type_name
            FROM challan_items ci
            JOIN order_items oi ON ci.order_item_id = oi.id
            JOIN material_types mt ON oi.material_type = mt.id
            WHERE ci.challan_id = v_challan_id
        LOOP
            INSERT INTO invoice_line_items (
                invoice_id, order_id, order_item_id, challan_id,
                description, quantity, unit_price, line_total, tax_rate, tax_amount
            ) VALUES (
                v_invoice_id,
                v_challan_item.order_id,
                v_challan_item.order_item_id,
                v_challan_id,
                'Printing services for ' || v_challan_item.material_type_name,
                v_challan_item.quantity_delivered,
                v_challan_item.unit_price,
                v_challan_item.line_total,
                p_tax_rate,
                ROUND(v_challan_item.line_total * (p_tax_rate / 100), 2)
            );
            
            v_subtotal := v_subtotal + v_challan_item.line_total;
        END LOOP;
    END LOOP;
    
    -- Calculate totals
    v_tax_amount := ROUND(v_subtotal * (p_tax_rate / 100), 2);
    v_total_amount := v_subtotal + v_tax_amount;
    
    -- Update invoice totals
    UPDATE gst_invoices SET
        subtotal = v_subtotal,
        tax_amount = v_tax_amount,
        total_amount = v_total_amount,
        updated_at = NOW()
    WHERE id = v_invoice_id;
    
    -- Log invoice creation
    INSERT INTO audit_trail (table_name, record_id, action, new_values, changed_at)
    VALUES ('gst_invoices', v_invoice_id, 'INSERT',
            json_build_object('customer_id', p_customer_id, 'invoice_number', p_invoice_number, 'total_amount', v_total_amount),
            NOW());
    
    RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- 2. RECORD PAYMENT
CREATE OR REPLACE FUNCTION record_payment(
    p_invoice_id UUID,
    p_payment_amount DECIMAL(12,2),
    p_payment_date DATE DEFAULT CURRENT_DATE,
    p_payment_method VARCHAR(50),
    p_reference_number VARCHAR(100) DEFAULT NULL,
    p_bank_details TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_payment_id UUID;
    v_invoice RECORD;
    v_total_paid DECIMAL(12,2);
    v_new_status VARCHAR(20);
    v_payment_method_id UUID;
BEGIN
    -- Get invoice details
    SELECT * INTO v_invoice FROM gst_invoices WHERE id = p_invoice_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found: %', p_invoice_id;
    END IF;
    
    -- Get payment method ID
    SELECT id INTO v_payment_method_id FROM payment_methods WHERE name = p_payment_method;
    IF NOT FOUND THEN
        INSERT INTO payment_methods (name) VALUES (p_payment_method) RETURNING id INTO v_payment_method_id;
    END IF;
    
    -- Validate payment amount
    IF p_payment_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be positive: %', p_payment_amount;
    END IF;
    
    -- Check if payment exceeds outstanding amount
    SELECT COALESCE(SUM(payment_amount), 0) INTO v_total_paid
    FROM payments WHERE invoice_id = p_invoice_id;
    
    IF (v_total_paid + p_payment_amount) > v_invoice.total_amount THEN
        RAISE EXCEPTION 'Payment amount exceeds outstanding balance. Outstanding: %, Payment: %',
                        (v_invoice.total_amount - v_total_paid), p_payment_amount;
    END IF;
    
    -- Record payment
    INSERT INTO payments (
        invoice_id, customer_id, payment_amount, payment_date, payment_method,
        reference_number, bank_details, notes
    ) VALUES (
        p_invoice_id, v_invoice.customer_id, p_payment_amount, p_payment_date, v_payment_method_id,
        p_reference_number, p_bank_details, p_notes
    ) RETURNING id INTO v_payment_id;
    
    -- Update invoice payment status
    v_total_paid := v_total_paid + p_payment_amount;
    IF v_total_paid >= v_invoice.total_amount THEN
        v_new_status := 'paid';
    ELSIF v_total_paid > 0 THEN
        v_new_status := 'partial';
    ELSE
        v_new_status := 'pending';
    END IF;
    
    UPDATE gst_invoices SET
        payment_status = v_new_status,
        updated_at = NOW()
    WHERE id = p_invoice_id;
    
    -- Update customer balance
    UPDATE customers SET
        current_balance = current_balance - p_payment_amount,
        updated_at = NOW()
    WHERE id = v_invoice.customer_id;
    
    -- Log payment
    INSERT INTO audit_trail (table_name, record_id, action, new_values, changed_at)
    VALUES ('payments', v_payment_id, 'INSERT',
            json_build_object('invoice_id', p_invoice_id, 'amount', p_payment_amount, 'method', p_payment_method),
            NOW());
    
    RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql;

-- 3. GET INVOICE WITH FULL DETAILS
CREATE OR REPLACE FUNCTION get_invoice_details(p_invoice_id UUID)
RETURNS TABLE(
    invoice_info JSON,
    customer_info JSON,
    line_items JSON,
    challans JSON,
    payments JSON,
    payment_summary JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- Invoice information
        json_build_object(
            'id', gi.id,
            'invoice_number', gi.invoice_number,
            'invoice_date', gi.invoice_date,
            'due_date', gi.due_date,
            'subtotal', gi.subtotal,
            'tax_amount', gi.tax_amount,
            'total_amount', gi.total_amount,
            'payment_status', gi.payment_status,
            'gst_treatment', gi.gst_treatment,
            'place_of_supply', gi.place_of_supply,
            'created_at', gi.created_at
        ) as invoice_info,
        
        -- Customer information
        json_build_object(
            'id', c.id,
            'name', c.name,
            'phone', c.phone,
            'email', c.email,
            'address', c.address,
            'gst_number', c.gst_number
        ) as customer_info,
        
        -- Line items
        COALESCE(
            json_agg(DISTINCT jsonb_build_object(
                'id', ili.id,
                'description', ili.description,
                'quantity', ili.quantity,
                'unit_price', ili.unit_price,
                'line_total', ili.line_total,
                'tax_rate', ili.tax_rate,
                'tax_amount', ili.tax_amount,
                'order_number', o.order_number,
                'challan_number', dc.challan_number
            )) FILTER (WHERE ili.id IS NOT NULL),
            '[]'::json
        ) as line_items,
        
        -- Related challans
        COALESCE(
            json_agg(DISTINCT jsonb_build_object(
                'id', dc.id,
                'challan_number', dc.challan_number,
                'challan_date', dc.challan_date,
                'delivery_date', dc.delivery_date,
                'total_quantity', dc.total_quantity
            )) FILTER (WHERE dc.id IS NOT NULL),
            '[]'::json
        ) as challans,
        
        -- Payments
        COALESCE(
            json_agg(DISTINCT jsonb_build_object(
                'id', p.id,
                'payment_amount', p.payment_amount,
                'payment_date', p.payment_date,
                'payment_method', pm.name,
                'reference_number', p.reference_number,
                'notes', p.notes
            )) FILTER (WHERE p.id IS NOT NULL),
            '[]'::json
        ) as payments,
        
        -- Payment summary
        json_build_object(
            'total_amount', gi.total_amount,
            'total_paid', COALESCE(SUM(p.payment_amount), 0),
            'outstanding_amount', gi.total_amount - COALESCE(SUM(p.payment_amount), 0),
            'payment_status', gi.payment_status,
            'days_overdue', CASE 
                WHEN gi.due_date < CURRENT_DATE AND gi.payment_status != 'paid' 
                THEN (CURRENT_DATE - gi.due_date)::INTEGER 
                ELSE 0 
            END
        ) as payment_summary
        
    FROM gst_invoices gi
    JOIN customers c ON gi.customer_id = c.id
    LEFT JOIN invoice_line_items ili ON gi.id = ili.invoice_id
    LEFT JOIN orders o ON ili.order_id = o.id
    LEFT JOIN delivery_challans dc ON ili.challan_id = dc.id
    LEFT JOIN payments p ON gi.id = p.invoice_id
    LEFT JOIN payment_methods pm ON p.payment_method = pm.id
    WHERE gi.id = p_invoice_id
    GROUP BY gi.id, gi.invoice_number, gi.invoice_date, gi.due_date, gi.subtotal,
             gi.tax_amount, gi.total_amount, gi.payment_status, gi.gst_treatment,
             gi.place_of_supply, gi.created_at,
             c.id, c.name, c.phone, c.email, c.address, c.gst_number;
END;
$$ LANGUAGE plpgsql;

-- 4. GET OUTSTANDING INVOICES
CREATE OR REPLACE FUNCTION get_outstanding_invoices(p_customer_id UUID DEFAULT NULL)
RETURNS TABLE(
    invoice_id UUID,
    customer_id UUID,
    customer_name VARCHAR(255),
    invoice_number VARCHAR(100),
    invoice_date DATE,
    due_date DATE,
    total_amount DECIMAL(12,2),
    paid_amount DECIMAL(12,2),
    outstanding_amount DECIMAL(12,2),
    days_overdue INTEGER,
    payment_status VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gi.id as invoice_id,
        gi.customer_id,
        c.name as customer_name,
        gi.invoice_number,
        gi.invoice_date,
        gi.due_date,
        gi.total_amount,
        COALESCE(SUM(p.payment_amount), 0) as paid_amount,
        gi.total_amount - COALESCE(SUM(p.payment_amount), 0) as outstanding_amount,
        CASE 
            WHEN gi.due_date < CURRENT_DATE AND gi.payment_status != 'paid'
            THEN (CURRENT_DATE - gi.due_date)::INTEGER
            ELSE 0
        END as days_overdue,
        gi.payment_status
    FROM gst_invoices gi
    JOIN customers c ON gi.customer_id = c.id
    LEFT JOIN payments p ON gi.id = p.invoice_id
    WHERE 
        gi.payment_status IN ('pending', 'partial')
        AND gi.is_deleted = FALSE
        AND (p_customer_id IS NULL OR gi.customer_id = p_customer_id)
    GROUP BY gi.id, gi.customer_id, c.name, gi.invoice_number, gi.invoice_date,
             gi.due_date, gi.total_amount, gi.payment_status
    HAVING gi.total_amount - COALESCE(SUM(p.payment_amount), 0) > 0
    ORDER BY days_overdue DESC, gi.due_date ASC;
END;
$$ LANGUAGE plpgsql;

-- 5. GET PAYMENT HISTORY
CREATE OR REPLACE FUNCTION get_payment_history(
    p_customer_id UUID DEFAULT NULL,
    p_from_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_to_date DATE DEFAULT CURRENT_DATE,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE(
    payment_id UUID,
    invoice_number VARCHAR(100),
    customer_name VARCHAR(255),
    payment_amount DECIMAL(12,2),
    payment_date DATE,
    payment_method VARCHAR(50),
    reference_number VARCHAR(100),
    invoice_amount DECIMAL(12,2),
    outstanding_after_payment DECIMAL(12,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as payment_id,
        gi.invoice_number,
        c.name as customer_name,
        p.payment_amount,
        p.payment_date,
        pm.name as payment_method,
        p.reference_number,
        gi.total_amount as invoice_amount,
        gi.total_amount - (
            SELECT COALESCE(SUM(p2.payment_amount), 0)
            FROM payments p2 
            WHERE p2.invoice_id = gi.id 
            AND p2.payment_date <= p.payment_date
        ) as outstanding_after_payment
    FROM payments p
    JOIN gst_invoices gi ON p.invoice_id = gi.id
    JOIN customers c ON p.customer_id = c.id
    LEFT JOIN payment_methods pm ON p.payment_method = pm.id
    WHERE 
        (p_customer_id IS NULL OR p.customer_id = p_customer_id)
        AND p.payment_date BETWEEN p_from_date AND p_to_date
    ORDER BY p.payment_date DESC, p.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 6. GENERATE CUSTOMER STATEMENT
CREATE OR REPLACE FUNCTION generate_customer_statement(
    p_customer_id UUID,
    p_from_date DATE DEFAULT CURRENT_DATE - INTERVAL '90 days',
    p_to_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    transaction_date DATE,
    transaction_type VARCHAR(20),
    reference_number VARCHAR(100),
    description TEXT,
    debit_amount DECIMAL(12,2),
    credit_amount DECIMAL(12,2),
    running_balance DECIMAL(12,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH customer_transactions AS (
        -- Invoices (debit)
        SELECT 
            gi.invoice_date as transaction_date,
            'INVOICE' as transaction_type,
            gi.invoice_number as reference_number,
            'Invoice for delivered items' as description,
            gi.total_amount as debit_amount,
            0::DECIMAL(12,2) as credit_amount,
            1 as sort_order
        FROM gst_invoices gi
        WHERE gi.customer_id = p_customer_id
        AND gi.invoice_date BETWEEN p_from_date AND p_to_date
        AND gi.is_deleted = FALSE
        
        UNION ALL
        
        -- Payments (credit)
        SELECT 
            p.payment_date as transaction_date,
            'PAYMENT' as transaction_type,
            COALESCE(p.reference_number, 'PMT-' || p.id::TEXT) as reference_number,
            'Payment received - ' || pm.name as description,
            0::DECIMAL(12,2) as debit_amount,
            p.payment_amount as credit_amount,
            2 as sort_order
        FROM payments p
        JOIN payment_methods pm ON p.payment_method = pm.id
        WHERE p.customer_id = p_customer_id
        AND p.payment_date BETWEEN p_from_date AND p_to_date
        
        ORDER BY transaction_date, sort_order
    ),
    transactions_with_balance AS (
        SELECT 
            *,
            SUM(debit_amount - credit_amount) OVER (
                ORDER BY transaction_date, sort_order 
                ROWS UNBOUNDED PRECEDING
            ) as running_balance
        FROM customer_transactions
    )
    SELECT 
        t.transaction_date,
        t.transaction_type,
        t.reference_number,
        t.description,
        t.debit_amount,
        t.credit_amount,
        t.running_balance
    FROM transactions_with_balance t
    ORDER BY t.transaction_date, t.sort_order;
END;
$$ LANGUAGE plpgsql;

-- USAGE EXAMPLES:
-- 1. Create invoice: SELECT create_gst_invoice('customer-uuid', 'INV-001', '2025-09-02', '2025-10-02', ARRAY['challan-uuid1', 'challan-uuid2'], 'taxable', 'Karnataka', 18.00);
-- 2. Record payment: SELECT record_payment('invoice-uuid', 5900, '2025-09-02', 'UPI', 'TXN123456', 'HDFC Bank', 'Payment for Invoice INV-001');
-- 3. Get invoice details: SELECT * FROM get_invoice_details('invoice-uuid');
-- 4. Get outstanding invoices: SELECT * FROM get_outstanding_invoices('customer-uuid');
-- 5. Generate customer statement: SELECT * FROM generate_customer_statement('customer-uuid', '2025-08-01', '2025-09-02');