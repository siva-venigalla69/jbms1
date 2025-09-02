-- =========================================
-- ORDER MANAGEMENT WORKFLOW SQLs
-- Complete order lifecycle operations
-- =========================================

-- 1. CREATE NEW ORDER WITH ITEMS
CREATE OR REPLACE FUNCTION create_order_with_items(
    p_customer_id UUID,
    p_order_number VARCHAR(50),
    p_order_date DATE DEFAULT CURRENT_DATE,
    p_expected_delivery_date DATE DEFAULT NULL,
    p_special_instructions TEXT DEFAULT NULL,
    p_items JSONB -- Array of {material_type, quantity, unit_price, design_notes}
) RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_item JSONB;
    v_total_amount DECIMAL(12,2) := 0;
BEGIN
    -- Validate customer exists
    IF NOT EXISTS (SELECT 1 FROM customers WHERE id = p_customer_id AND is_deleted = FALSE) THEN
        RAISE EXCEPTION 'Customer not found or inactive: %', p_customer_id;
    END IF;
    
    -- Create order
    INSERT INTO orders (customer_id, order_number, order_date, expected_delivery_date, special_instructions)
    VALUES (p_customer_id, p_order_number, p_order_date, p_expected_delivery_date, p_special_instructions)
    RETURNING id INTO v_order_id;
    
    -- Add order items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO order_items (
            order_id, 
            material_type, 
            quantity, 
            unit_price,
            design_notes,
            design_status,
            production_status
        ) VALUES (
            v_order_id,
            (v_item->>'material_type')::UUID,
            (v_item->>'quantity')::INTEGER,
            (v_item->>'unit_price')::DECIMAL(10,2),
            v_item->>'design_notes',
            'pending_from_customer',
            'pending'
        );
        
        v_total_amount := v_total_amount + ((v_item->>'quantity')::INTEGER * (v_item->>'unit_price')::DECIMAL(10,2));
    END LOOP;
    
    -- Update order total
    UPDATE orders SET total_amount = v_total_amount WHERE id = v_order_id;
    
    -- Log order creation
    INSERT INTO audit_trail (table_name, record_id, action, new_values, changed_at)
    VALUES ('orders', v_order_id, 'INSERT', 
            json_build_object('customer_id', p_customer_id, 'order_number', p_order_number, 'total_amount', v_total_amount), 
            NOW());
    
    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;

-- 2. UPDATE ORDER STATUS
CREATE OR REPLACE FUNCTION update_order_status(
    p_order_id UUID,
    p_status VARCHAR(50),
    p_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_old_status VARCHAR(50);
BEGIN
    -- Get current status
    SELECT 
        COALESCE(os.name, 'unknown') INTO v_old_status
    FROM orders o
    LEFT JOIN order_statuses os ON o.status = os.id
    WHERE o.id = p_order_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found: %', p_order_id;
    END IF;
    
    -- Update status
    UPDATE orders SET 
        status = (SELECT id FROM order_statuses WHERE name = p_status),
        updated_at = NOW()
    WHERE id = p_order_id;
    
    -- Log status change
    INSERT INTO audit_trail (table_name, record_id, action, old_values, new_values, changed_at)
    VALUES ('orders', p_order_id, 'STATUS_UPDATE', 
            json_build_object('old_status', v_old_status, 'notes', p_notes),
            json_build_object('new_status', p_status, 'notes', p_notes),
            NOW());
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 3. GET ORDER WITH FULL DETAILS
CREATE OR REPLACE FUNCTION get_order_details(p_order_id UUID)
RETURNS TABLE(
    order_info JSON,
    customer_info JSON,
    items JSON,
    delivery_challans JSON,
    invoices JSON,
    payments JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- Order information
        json_build_object(
            'id', o.id,
            'order_number', o.order_number,
            'order_date', o.order_date,
            'expected_delivery_date', o.expected_delivery_date,
            'total_amount', o.total_amount,
            'status', os.name,
            'special_instructions', o.special_instructions,
            'created_at', o.created_at
        ) as order_info,
        
        -- Customer information
        json_build_object(
            'id', c.id,
            'name', c.name,
            'phone', c.phone,
            'email', c.email,
            'address', c.address
        ) as customer_info,
        
        -- Order items with design and production status
        COALESCE(
            json_agg(DISTINCT jsonb_build_object(
                'id', oi.id,
                'material_type', mt.name,
                'quantity', oi.quantity,
                'unit_price', oi.unit_price,
                'subtotal', oi.subtotal,
                'design_status', oi.design_status,
                'production_status', oi.production_status,
                'design_notes', oi.design_notes,
                'design_file_url', oi.design_file_url
            )) FILTER (WHERE oi.id IS NOT NULL),
            '[]'::json
        ) as items,
        
        -- Delivery challans
        COALESCE(
            json_agg(DISTINCT jsonb_build_object(
                'id', dc.id,
                'challan_number', dc.challan_number,
                'challan_date', dc.challan_date,
                'delivery_status', dc.delivery_status,
                'total_quantity', dc.total_quantity
            )) FILTER (WHERE dc.id IS NOT NULL),
            '[]'::json
        ) as delivery_challans,
        
        -- Invoices
        COALESCE(
            json_agg(DISTINCT jsonb_build_object(
                'id', gi.id,
                'invoice_number', gi.invoice_number,
                'invoice_date', gi.invoice_date,
                'total_amount', gi.total_amount,
                'payment_status', gi.payment_status
            )) FILTER (WHERE gi.id IS NOT NULL),
            '[]'::json
        ) as invoices,
        
        -- Payments
        COALESCE(
            json_agg(DISTINCT jsonb_build_object(
                'id', p.id,
                'payment_amount', p.payment_amount,
                'payment_date', p.payment_date,
                'payment_method', pm.name,
                'reference_number', p.reference_number
            )) FILTER (WHERE p.id IS NOT NULL),
            '[]'::json
        ) as payments
        
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    LEFT JOIN order_statuses os ON o.status = os.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN material_types mt ON oi.material_type = mt.id
    LEFT JOIN delivery_challans dc ON o.id = dc.order_id
    LEFT JOIN gst_invoices gi ON o.customer_id = gi.customer_id
    LEFT JOIN payments p ON gi.id = p.invoice_id
    LEFT JOIN payment_methods pm ON p.payment_method = pm.id
    WHERE o.id = p_order_id
    GROUP BY o.id, o.order_number, o.order_date, o.expected_delivery_date, o.total_amount, 
             o.special_instructions, o.created_at, os.name, c.id, c.name, c.phone, c.email, c.address;
END;
$$ LANGUAGE plpgsql;

-- 4. UPDATE ORDER ITEM DESIGN STATUS
CREATE OR REPLACE FUNCTION update_design_status(
    p_order_item_id UUID,
    p_design_status VARCHAR(30),
    p_design_file_url TEXT DEFAULT NULL,
    p_design_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_old_status VARCHAR(30);
BEGIN
    -- Validate design status
    IF p_design_status NOT IN ('pending_from_customer', 'design_received_from_customer', 'design_ready') THEN
        RAISE EXCEPTION 'Invalid design status: %. Must be one of: pending_from_customer, design_received_from_customer, design_ready', p_design_status;
    END IF;
    
    -- Get current status
    SELECT design_status INTO v_old_status FROM order_items WHERE id = p_order_item_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order item not found: %', p_order_item_id;
    END IF;
    
    -- Update design status
    UPDATE order_items SET
        design_status = p_design_status,
        design_file_url = COALESCE(p_design_file_url, design_file_url),
        design_notes = COALESCE(p_design_notes, design_notes),
        updated_at = NOW()
    WHERE id = p_order_item_id;
    
    -- Log status change
    INSERT INTO audit_trail (table_name, record_id, action, old_values, new_values, changed_at)
    VALUES ('order_items', p_order_item_id, 'DESIGN_STATUS_UPDATE',
            json_build_object('old_design_status', v_old_status),
            json_build_object('new_design_status', p_design_status, 'design_file_url', p_design_file_url, 'design_notes', p_design_notes),
            NOW());
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 5. UPDATE ORDER ITEM PRODUCTION STATUS
CREATE OR REPLACE FUNCTION update_production_status(
    p_order_item_id UUID,
    p_production_status VARCHAR(30)
) RETURNS BOOLEAN AS $$
DECLARE
    v_old_status VARCHAR(30);
    v_design_status VARCHAR(30);
BEGIN
    -- Validate production status
    IF p_production_status NOT IN ('pending', 'printing', 'post_process') THEN
        RAISE EXCEPTION 'Invalid production status: %. Must be one of: pending, printing, post_process', p_production_status;
    END IF;
    
    -- Get current statuses
    SELECT production_status, design_status 
    INTO v_old_status, v_design_status 
    FROM order_items WHERE id = p_order_item_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order item not found: %', p_order_item_id;
    END IF;
    
    -- Business rule: Cannot start production until design is ready
    IF p_production_status IN ('printing', 'post_process') AND v_design_status != 'design_ready' THEN
        RAISE EXCEPTION 'Cannot start production (%) until design is ready. Current design status: %', 
                        p_production_status, v_design_status;
    END IF;
    
    -- Update production status
    UPDATE order_items SET
        production_status = p_production_status,
        updated_at = NOW()
    WHERE id = p_order_item_id;
    
    -- Log status change
    INSERT INTO audit_trail (table_name, record_id, action, old_values, new_values, changed_at)
    VALUES ('order_items', p_order_item_id, 'PRODUCTION_STATUS_UPDATE',
            json_build_object('old_production_status', v_old_status),
            json_build_object('new_production_status', p_production_status),
            NOW());
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 6. GET PRODUCTION QUEUE (Items ready for production)
CREATE OR REPLACE FUNCTION get_production_queue()
RETURNS TABLE(
    order_item_id UUID,
    order_number VARCHAR(50),
    customer_name VARCHAR(255),
    material_type VARCHAR(100),
    quantity INTEGER,
    design_status VARCHAR(30),
    production_status VARCHAR(30),
    order_date DATE,
    expected_delivery_date DATE,
    priority_score INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        oi.id as order_item_id,
        o.order_number,
        c.name as customer_name,
        mt.name as material_type,
        oi.quantity,
        oi.design_status,
        oi.production_status,
        o.order_date,
        o.expected_delivery_date,
        -- Priority calculation: urgent orders + design ready items get higher priority
        CASE 
            WHEN o.expected_delivery_date <= CURRENT_DATE + INTERVAL '3 days' THEN 10
            WHEN o.expected_delivery_date <= CURRENT_DATE + INTERVAL '7 days' THEN 8
            WHEN oi.design_status = 'design_ready' AND oi.production_status = 'pending' THEN 7
            WHEN oi.design_status = 'design_ready' AND oi.production_status = 'printing' THEN 6
            ELSE 5
        END as priority_score
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN customers c ON o.customer_id = c.id
    JOIN material_types mt ON oi.material_type = mt.id
    WHERE 
        o.is_deleted = FALSE
        AND oi.production_status IN ('pending', 'printing') -- Not completed
        AND (
            oi.design_status = 'design_ready' OR  -- Design ready items
            o.expected_delivery_date <= CURRENT_DATE + INTERVAL '7 days' -- Urgent items
        )
    ORDER BY priority_score DESC, o.order_date ASC;
END;
$$ LANGUAGE plpgsql;

-- USAGE EXAMPLES:
-- 1. Create order with items:
--    SELECT create_order_with_items(
--        'customer-uuid', 'ORD-001', '2025-09-02', '2025-09-15', 'Rush order',
--        '[{"material_type": "material-uuid", "quantity": 10, "unit_price": 500, "design_notes": "Red color preferred"}]'::jsonb
--    );
-- 2. Update design status: SELECT update_design_status('order-item-uuid', 'design_ready', 'https://designs.com/file.pdf', 'Design approved');
-- 3. Update production status: SELECT update_production_status('order-item-uuid', 'printing');
-- 4. Get order details: SELECT * FROM get_order_details('order-uuid');
-- 5. Get production queue: SELECT * FROM get_production_queue();