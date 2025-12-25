-- =========================================
-- DELIVERY MANAGEMENT WORKFLOW SQLs
-- Complete delivery challan operations
-- =========================================

-- 1. CREATE DELIVERY CHALLAN
CREATE OR REPLACE FUNCTION create_delivery_challan(
    p_customer_id UUID,
    p_order_id UUID DEFAULT NULL,
    p_challan_number VARCHAR(100),
    p_challan_date DATE DEFAULT CURRENT_DATE,
    p_delivery_date DATE DEFAULT NULL,
    p_transport_mode VARCHAR(50) DEFAULT NULL,
    p_vehicle_number VARCHAR(20) DEFAULT NULL,
    p_driver_name VARCHAR(100) DEFAULT NULL,
    p_driver_phone VARCHAR(20) DEFAULT NULL,
    p_delivery_address TEXT DEFAULT NULL,
    p_special_instructions TEXT DEFAULT NULL,
    p_items JSONB -- Array of {order_item_id, quantity_delivered}
) RETURNS UUID AS $$
DECLARE
    v_challan_id UUID;
    v_item JSONB;
    v_total_quantity DECIMAL(10,2) := 0;
    v_order_item RECORD;
    v_material_type_name VARCHAR(100);
BEGIN
    -- Validate customer exists
    IF NOT EXISTS (SELECT 1 FROM customers WHERE id = p_customer_id AND is_deleted = FALSE) THEN
        RAISE EXCEPTION 'Customer not found or inactive: %', p_customer_id;
    END IF;
    
    -- Create delivery challan
    INSERT INTO delivery_challans (
        customer_id, order_id, challan_number, challan_date, delivery_date,
        transport_mode, vehicle_number, driver_name, driver_phone, 
        delivery_address, special_instructions
    ) VALUES (
        p_customer_id, p_order_id, p_challan_number, p_challan_date, p_delivery_date,
        p_transport_mode, p_vehicle_number, p_driver_name, p_driver_phone,
        p_delivery_address, p_special_instructions
    ) RETURNING id INTO v_challan_id;
    
    -- Add challan items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- Get order item details
        SELECT oi.*, mt.name as material_type_name
        INTO v_order_item, v_material_type_name
        FROM order_items oi
        JOIN material_types mt ON oi.material_type = mt.id
        WHERE oi.id = (v_item->>'order_item_id')::UUID;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Order item not found: %', v_item->>'order_item_id';
        END IF;
        
        -- Validate quantity
        IF (v_item->>'quantity_delivered')::DECIMAL > v_order_item.quantity THEN
            RAISE EXCEPTION 'Cannot deliver more than ordered. Ordered: %, Attempting to deliver: %', 
                            v_order_item.quantity, v_item->>'quantity_delivered';
        END IF;
        
        -- Validate production status
        IF v_order_item.production_status != 'post_process' THEN
            RAISE EXCEPTION 'Cannot deliver item that is not completed. Current production status: %', 
                            v_order_item.production_status;
        END IF;
        
        -- Add challan item
        INSERT INTO challan_items (
            challan_id, 
            order_item_id, 
            quantity_delivered, 
            unit_price
        ) VALUES (
            v_challan_id,
            (v_item->>'order_item_id')::UUID,
            (v_item->>'quantity_delivered')::DECIMAL,
            v_order_item.unit_price
        );
        
        -- Update material out (stock reduction)
        PERFORM deliver_material(
            v_challan_id, 
            p_customer_id, 
            v_material_type_name, 
            (v_item->>'quantity_delivered')::DECIMAL
        );
        
        v_total_quantity := v_total_quantity + (v_item->>'quantity_delivered')::DECIMAL;
    END LOOP;
    
    -- Update challan total quantity
    UPDATE delivery_challans SET total_quantity = v_total_quantity WHERE id = v_challan_id;
    
    -- Log challan creation
    INSERT INTO audit_trail (table_name, record_id, action, new_values, changed_at)
    VALUES ('delivery_challans', v_challan_id, 'INSERT',
            json_build_object('customer_id', p_customer_id, 'challan_number', p_challan_number, 'total_quantity', v_total_quantity),
            NOW());
    
    RETURN v_challan_id;
END;
$$ LANGUAGE plpgsql;

-- 2. UPDATE DELIVERY STATUS
CREATE OR REPLACE FUNCTION update_delivery_status(
    p_challan_id UUID,
    p_delivery_status VARCHAR(20),
    p_actual_delivery_date DATE DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_old_status VARCHAR(20);
BEGIN
    -- Get current status
    SELECT delivery_status INTO v_old_status
    FROM delivery_challans WHERE id = p_challan_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Delivery challan not found: %', p_challan_id;
    END IF;
    
    -- Update delivery status
    UPDATE delivery_challans SET
        delivery_status = p_delivery_status,
        delivery_date = COALESCE(p_actual_delivery_date, delivery_date),
        updated_at = NOW()
    WHERE id = p_challan_id;
    
    -- Log status change
    INSERT INTO audit_trail (table_name, record_id, action, old_values, new_values, changed_at)
    VALUES ('delivery_challans', p_challan_id, 'STATUS_UPDATE',
            json_build_object('old_status', v_old_status),
            json_build_object('new_status', p_delivery_status, 'actual_delivery_date', p_actual_delivery_date, 'notes', p_notes),
            NOW());
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 3. GET DELIVERY CHALLAN WITH FULL DETAILS
CREATE OR REPLACE FUNCTION get_delivery_challan_details(p_challan_id UUID)
RETURNS TABLE(
    challan_info JSON,
    customer_info JSON,
    order_info JSON,
    items JSON,
    delivery_summary JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- Challan information
        json_build_object(
            'id', dc.id,
            'challan_number', dc.challan_number,
            'challan_date', dc.challan_date,
            'delivery_date', dc.delivery_date,
            'total_quantity', dc.total_quantity,
            'delivery_status', dc.delivery_status,
            'transport_mode', dc.transport_mode,
            'vehicle_number', dc.vehicle_number,
            'driver_name', dc.driver_name,
            'driver_phone', dc.driver_phone,
            'delivery_address', dc.delivery_address,
            'special_instructions', dc.special_instructions,
            'created_at', dc.created_at
        ) as challan_info,
        
        -- Customer information
        json_build_object(
            'id', c.id,
            'name', c.name,
            'phone', c.phone,
            'email', c.email,
            'address', c.address
        ) as customer_info,
        
        -- Order information
        CASE 
            WHEN o.id IS NOT NULL THEN 
                json_build_object(
                    'id', o.id,
                    'order_number', o.order_number,
                    'order_date', o.order_date,
                    'total_amount', o.total_amount
                )
            ELSE NULL
        END as order_info,
        
        -- Challan items
        COALESCE(
            json_agg(DISTINCT jsonb_build_object(
                'id', ci.id,
                'order_item_id', ci.order_item_id,
                'material_type', mt.name,
                'quantity_delivered', ci.quantity_delivered,
                'unit_price', ci.unit_price,
                'line_total', ci.line_total,
                'design_status', oi.design_status,
                'production_status', oi.production_status
            )) FILTER (WHERE ci.id IS NOT NULL),
            '[]'::json
        ) as items,
        
        -- Delivery summary
        json_build_object(
            'total_items', COUNT(ci.id),
            'total_quantity', dc.total_quantity,
            'total_value', SUM(ci.line_total),
            'delivery_status', dc.delivery_status,
            'is_invoiced', CASE WHEN ic.invoice_id IS NOT NULL THEN true ELSE false END
        ) as delivery_summary
        
    FROM delivery_challans dc
    JOIN customers c ON dc.customer_id = c.id
    LEFT JOIN orders o ON dc.order_id = o.id
    LEFT JOIN challan_items ci ON dc.id = ci.challan_id
    LEFT JOIN order_items oi ON ci.order_item_id = oi.id
    LEFT JOIN material_types mt ON oi.material_type = mt.id
    LEFT JOIN invoice_challans ic ON dc.id = ic.challan_id
    WHERE dc.id = p_challan_id
    GROUP BY dc.id, dc.challan_number, dc.challan_date, dc.delivery_date, dc.total_quantity,
             dc.delivery_status, dc.transport_mode, dc.vehicle_number, dc.driver_name,
             dc.driver_phone, dc.delivery_address, dc.special_instructions, dc.created_at,
             c.id, c.name, c.phone, c.email, c.address,
             o.id, o.order_number, o.order_date, o.total_amount,
             ic.invoice_id;
END;
$$ LANGUAGE plpgsql;

-- 4. GET PENDING DELIVERIES
CREATE OR REPLACE FUNCTION get_pending_deliveries()
RETURNS TABLE(
    challan_id UUID,
    challan_number VARCHAR(100),
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    challan_date DATE,
    scheduled_delivery_date DATE,
    total_quantity DECIMAL(10,2),
    total_value DECIMAL(12,2),
    delivery_status VARCHAR(20),
    days_pending INTEGER,
    priority_level VARCHAR(10)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dc.id as challan_id,
        dc.challan_number,
        c.name as customer_name,
        c.phone as customer_phone,
        dc.challan_date,
        dc.delivery_date as scheduled_delivery_date,
        dc.total_quantity,
        SUM(ci.line_total) as total_value,
        dc.delivery_status,
        (CURRENT_DATE - dc.challan_date)::INTEGER as days_pending,
        CASE 
            WHEN dc.delivery_date <= CURRENT_DATE THEN 'URGENT'
            WHEN dc.delivery_date <= CURRENT_DATE + INTERVAL '2 days' THEN 'HIGH'
            WHEN dc.delivery_date <= CURRENT_DATE + INTERVAL '5 days' THEN 'MEDIUM'
            ELSE 'LOW'
        END as priority_level
    FROM delivery_challans dc
    JOIN customers c ON dc.customer_id = c.id
    LEFT JOIN challan_items ci ON dc.id = ci.challan_id
    WHERE 
        dc.delivery_status IN ('prepared', 'in_transit')
        AND dc.is_deleted = FALSE
    GROUP BY dc.id, dc.challan_number, c.name, c.phone, dc.challan_date, 
             dc.delivery_date, dc.total_quantity, dc.delivery_status
    ORDER BY 
        CASE priority_level 
            WHEN 'URGENT' THEN 1 
            WHEN 'HIGH' THEN 2 
            WHEN 'MEDIUM' THEN 3 
            ELSE 4 
        END,
        dc.challan_date ASC;
END;
$$ LANGUAGE plpgsql;

-- 5. GET DELIVERY PERFORMANCE REPORT
CREATE OR REPLACE FUNCTION get_delivery_performance_report(
    p_from_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_to_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    total_deliveries INTEGER,
    on_time_deliveries INTEGER,
    late_deliveries INTEGER,
    on_time_percentage DECIMAL(5,2),
    avg_delivery_days DECIMAL(5,2),
    total_quantity_delivered DECIMAL(10,2),
    total_value_delivered DECIMAL(12,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(dc.id)::INTEGER as total_deliveries,
        COUNT(CASE WHEN dc.delivery_date <= dc.delivery_date THEN 1 END)::INTEGER as on_time_deliveries,
        COUNT(CASE WHEN dc.delivery_date > dc.delivery_date THEN 1 END)::INTEGER as late_deliveries,
        ROUND(
            (COUNT(CASE WHEN dc.delivery_date <= dc.delivery_date THEN 1 END) * 100.0) / 
            NULLIF(COUNT(dc.id), 0), 2
        ) as on_time_percentage,
        ROUND(AVG(dc.delivery_date - dc.challan_date), 2) as avg_delivery_days,
        SUM(dc.total_quantity) as total_quantity_delivered,
        SUM(ci_totals.total_value) as total_value_delivered
    FROM delivery_challans dc
    LEFT JOIN (
        SELECT 
            ci.challan_id,
            SUM(ci.line_total) as total_value
        FROM challan_items ci
        GROUP BY ci.challan_id
    ) ci_totals ON dc.id = ci_totals.challan_id
    WHERE 
        dc.challan_date BETWEEN p_from_date AND p_to_date
        AND dc.delivery_status = 'delivered'
        AND dc.is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql;

-- 6. GET ITEMS READY FOR DELIVERY
CREATE OR REPLACE FUNCTION get_items_ready_for_delivery(p_customer_id UUID DEFAULT NULL)
RETURNS TABLE(
    order_item_id UUID,
    order_number VARCHAR(50),
    customer_id UUID,
    customer_name VARCHAR(255),
    material_type VARCHAR(100),
    quantity INTEGER,
    unit_price DECIMAL(10,2),
    design_status VARCHAR(30),
    production_status VARCHAR(30),
    order_date DATE,
    expected_delivery_date DATE,
    days_ready INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        oi.id as order_item_id,
        o.order_number,
        c.id as customer_id,
        c.name as customer_name,
        mt.name as material_type,
        oi.quantity,
        oi.unit_price,
        oi.design_status,
        oi.production_status,
        o.order_date,
        o.expected_delivery_date,
        (CURRENT_DATE - 
         CASE 
             WHEN oi.updated_at::DATE > o.order_date THEN oi.updated_at::DATE 
             ELSE o.order_date 
         END
        )::INTEGER as days_ready
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN customers c ON o.customer_id = c.id
    JOIN material_types mt ON oi.material_type = mt.id
    WHERE 
        oi.production_status = 'post_process'  -- Completed production
        AND oi.design_status = 'design_ready'  -- Design approved
        AND o.is_deleted = FALSE
        AND (p_customer_id IS NULL OR c.id = p_customer_id)
        AND NOT EXISTS (
            -- Not already delivered
            SELECT 1 FROM challan_items ci 
            JOIN delivery_challans dc ON ci.challan_id = dc.id
            WHERE ci.order_item_id = oi.id 
            AND dc.is_deleted = FALSE
            AND ci.quantity_delivered >= oi.quantity
        )
    ORDER BY o.expected_delivery_date ASC, days_ready DESC;
END;
$$ LANGUAGE plpgsql;

-- USAGE EXAMPLES:
-- 1. Create delivery challan:
--    SELECT create_delivery_challan(
--        'customer-uuid', 'order-uuid', 'DC-001', '2025-09-02', '2025-09-05',
--        'TRUCK', 'KA01AB1234', 'Driver Name', '+91-9876543210', '123 Delivery Address',
--        'Handle with care',
--        '[{"order_item_id": "item-uuid", "quantity_delivered": 10}]'::jsonb
--    );
-- 2. Update delivery status: SELECT update_delivery_status('challan-uuid', 'delivered', '2025-09-05', 'Delivered successfully');
-- 3. Get challan details: SELECT * FROM get_delivery_challan_details('challan-uuid');
-- 4. Get pending deliveries: SELECT * FROM get_pending_deliveries();
-- 5. Get items ready for delivery: SELECT * FROM get_items_ready_for_delivery('customer-uuid');