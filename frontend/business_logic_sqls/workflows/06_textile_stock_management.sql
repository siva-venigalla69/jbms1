-- =========================================
-- TEXTILE STOCK MANAGEMENT - ADVANCED
-- Optimized for textile business with multiple material types
-- Handles complex receipt/delivery patterns
-- =========================================

-- 1. ENHANCED MATERIAL RECEIPT FUNCTION
-- Records material received from customers with detailed tracking
CREATE OR REPLACE FUNCTION record_material_receipt(
    p_customer_id UUID,
    p_receipt_date DATE DEFAULT CURRENT_DATE,
    p_receipt_number VARCHAR(100) DEFAULT NULL,
    p_materials JSONB, -- [{"material_type": "Sarees", "quantity": 10}, {...}]
    p_notes TEXT DEFAULT NULL,
    p_received_by VARCHAR(100) DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_receipt_id UUID;
    v_material JSONB;
    v_total_pieces INTEGER := 0;
    v_material_summary JSONB := '{}';
    v_receipt_number VARCHAR(100);
BEGIN
    -- Validate customer exists
    IF NOT EXISTS (SELECT 1 FROM customers WHERE id = p_customer_id AND is_deleted = FALSE) THEN
        RAISE EXCEPTION 'Customer not found: %', p_customer_id;
    END IF;

    -- Generate receipt number if not provided
    v_receipt_number := COALESCE(p_receipt_number, 'MR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || EXTRACT(EPOCH FROM NOW())::INTEGER);
    
    -- Create material receipt header
    INSERT INTO material_receipts (
        customer_id,
        receipt_number,
        receipt_date,
        notes,
        received_by,
        status
    ) VALUES (
        p_customer_id,
        v_receipt_number,
        p_receipt_date,
        p_notes,
        p_received_by,
        'completed'
    ) RETURNING id INTO v_receipt_id;
    
    -- Process each material type
    FOR v_material IN SELECT * FROM jsonb_array_elements(p_materials)
    LOOP
        -- Insert individual material receipt item
        INSERT INTO material_in (
            customer_id,
            receipt_id,
            material_type,
            quantity,
            received_date,
            unit_cost,
            notes
        ) VALUES (
            p_customer_id,
            v_receipt_id,
            v_material->>'material_type',
            (v_material->>'quantity')::DECIMAL,
            p_receipt_date,
            COALESCE((v_material->>'unit_cost')::DECIMAL, 0),
            v_material->>'notes'
        );
        
        -- Update or create material stock record
        INSERT INTO material_stock (
            customer_id,
            material_type,
            total_received,
            total_delivered,
            current_stock,
            last_received_date,
            last_updated
        ) VALUES (
            p_customer_id,
            v_material->>'material_type',
            (v_material->>'quantity')::DECIMAL,
            0,
            (v_material->>'quantity')::DECIMAL,
            p_receipt_date,
            NOW()
        )
        ON CONFLICT (customer_id, material_type)
        DO UPDATE SET
            total_received = material_stock.total_received + (v_material->>'quantity')::DECIMAL,
            current_stock = material_stock.current_stock + (v_material->>'quantity')::DECIMAL,
            last_received_date = p_receipt_date,
            last_updated = NOW();
        
        -- Add to summary
        v_total_pieces := v_total_pieces + (v_material->>'quantity')::INTEGER;
        v_material_summary := jsonb_set(
            v_material_summary,
            ARRAY[v_material->>'material_type'],
            to_jsonb((v_material->>'quantity')::INTEGER)
        );
    END LOOP;
    
    -- Update receipt header with totals
    UPDATE material_receipts SET
        total_pieces = v_total_pieces,
        material_summary = v_material_summary
    WHERE id = v_receipt_id;
    
    -- Return receipt summary
    RETURN json_build_object(
        'receipt_id', v_receipt_id,
        'receipt_number', v_receipt_number,
        'customer_id', p_customer_id,
        'total_pieces', v_total_pieces,
        'material_summary', v_material_summary,
        'receipt_date', p_receipt_date
    );
END;
$$ LANGUAGE plpgsql;

-- 2. ADVANCED DELIVERY CHALLAN WITH MULTI-ORDER SUPPORT
-- Creates delivery challans that can span multiple orders
CREATE OR REPLACE FUNCTION create_multi_order_delivery_challan(
    p_customer_id UUID,
    p_challan_number VARCHAR(100) DEFAULT NULL,
    p_challan_date DATE DEFAULT CURRENT_DATE,
    p_delivery_items JSONB, -- [{"order_item_id": "uuid", "quantity_delivered": 35}, {...}]
    p_transport_details JSONB DEFAULT NULL, -- {"mode": "truck", "vehicle": "KA01AB1234", "driver": "Name"}
    p_notes TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_challan_id UUID;
    v_item JSONB;
    v_challan_number VARCHAR(100);
    v_total_pieces INTEGER := 0;
    v_material_summary JSONB := '{}';
    v_order_item RECORD;
    v_material_type TEXT;
    v_quantity DECIMAL;
    v_affected_orders UUID[];
BEGIN
    -- Generate challan number if not provided
    v_challan_number := COALESCE(p_challan_number, 'DC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || EXTRACT(EPOCH FROM NOW())::INTEGER);
    
    -- Create delivery challan header
    INSERT INTO delivery_challans (
        customer_id,
        challan_number,
        challan_date,
        delivery_status,
        transport_details,
        notes
    ) VALUES (
        p_customer_id,
        v_challan_number,
        p_challan_date,
        'prepared',
        p_transport_details,
        p_notes
    ) RETURNING id INTO v_challan_id;
    
    -- Process each delivery item
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_delivery_items)
    LOOP
        -- Get order item details
        SELECT oi.*, mt.name as material_type_name, o.id as order_id
        INTO v_order_item
        FROM order_items oi
        LEFT JOIN material_types mt ON oi.material_type = mt.id
        LEFT JOIN orders o ON oi.order_id = o.id
        WHERE oi.id = (v_item->>'order_item_id')::UUID;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Order item not found: %', v_item->>'order_item_id';
        END IF;
        
        -- Validate production status
        IF COALESCE(v_order_item.production_status, 'pending') != 'post_process' THEN
            RAISE EXCEPTION 'Order item % not ready for delivery. Current status: %', 
                            v_item->>'order_item_id', 
                            COALESCE(v_order_item.production_status, 'pending');
        END IF;
        
        v_material_type := COALESCE(v_order_item.material_type_name, v_order_item.material_type::TEXT);
        v_quantity := (v_item->>'quantity_delivered')::DECIMAL;
        
        -- Create challan item
        INSERT INTO challan_items (
            challan_id,
            order_item_id,
            quantity_delivered,
            unit_price,
            material_type,
            line_total
        ) VALUES (
            v_challan_id,
            (v_item->>'order_item_id')::UUID,
            v_quantity,
            v_order_item.unit_price,
            v_material_type,
            v_quantity * v_order_item.unit_price
        );
        
        -- Track affected orders
        IF NOT (v_order_item.order_id = ANY(v_affected_orders)) THEN
            v_affected_orders := array_append(v_affected_orders, v_order_item.order_id);
        END IF;
        
        -- Update material stock
        UPDATE material_stock SET
            total_delivered = total_delivered + v_quantity,
            current_stock = current_stock - v_quantity,
            last_delivered_date = p_challan_date,
            last_updated = NOW()
        WHERE customer_id = p_customer_id AND material_type = v_material_type;
        
        -- If no stock record exists, create one with negative stock
        INSERT INTO material_stock (
            customer_id,
            material_type,
            total_received,
            total_delivered,
            current_stock,
            last_delivered_date,
            last_updated
        )
        SELECT 
            p_customer_id,
            v_material_type,
            0,
            v_quantity,
            -v_quantity,
            p_challan_date,
            NOW()
        WHERE NOT EXISTS (
            SELECT 1 FROM material_stock 
            WHERE customer_id = p_customer_id AND material_type = v_material_type
        );
        
        -- Add to summary
        v_total_pieces := v_total_pieces + v_quantity::INTEGER;
        v_material_summary := jsonb_set(
            v_material_summary,
            ARRAY[v_material_type],
            COALESCE(v_material_summary->v_material_type, '0'::jsonb)::INTEGER + v_quantity::INTEGER
        );
    END LOOP;
    
    -- Update challan header with totals
    UPDATE delivery_challans SET
        total_quantity = v_total_pieces,
        material_summary = v_material_summary,
        affected_orders = v_affected_orders
    WHERE id = v_challan_id;
    
    -- Return challan summary
    RETURN json_build_object(
        'challan_id', v_challan_id,
        'challan_number', v_challan_number,
        'customer_id', p_customer_id,
        'total_pieces', v_total_pieces,
        'material_summary', v_material_summary,
        'affected_orders', v_affected_orders,
        'challan_date', p_challan_date
    );
END;
$$ LANGUAGE plpgsql;

-- 3. COMPREHENSIVE CUSTOMER STOCK SNAPSHOT
-- Gets complete current stock for a customer with movement history
CREATE OR REPLACE FUNCTION get_customer_stock_snapshot(
    p_customer_id UUID,
    p_include_history BOOLEAN DEFAULT FALSE,
    p_history_days INTEGER DEFAULT 30
) RETURNS JSON AS $$
DECLARE
    v_customer RECORD;
    v_stock_summary JSONB := '{}';
    v_movement_history JSONB := '[]';
    v_material RECORD;
BEGIN
    -- Get customer details
    SELECT * INTO v_customer FROM customers WHERE id = p_customer_id AND is_deleted = FALSE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer not found: %', p_customer_id;
    END IF;
    
    -- Get current stock for all materials
    FOR v_material IN 
        SELECT 
            material_type,
            total_received,
            total_delivered,
            current_stock,
            last_received_date,
            last_delivered_date,
            last_updated
        FROM material_stock 
        WHERE customer_id = p_customer_id
        ORDER BY material_type
    LOOP
        v_stock_summary := jsonb_set(
            v_stock_summary,
            ARRAY[v_material.material_type],
            json_build_object(
                'total_received', v_material.total_received,
                'total_delivered', v_material.total_delivered,
                'current_stock', v_material.current_stock,
                'last_received_date', v_material.last_received_date,
                'last_delivered_date', v_material.last_delivered_date,
                'last_updated', v_material.last_updated
            )::jsonb
        );
    END LOOP;
    
    -- Get movement history if requested
    IF p_include_history THEN
        WITH movement_history AS (
            -- Material receipts
            SELECT 
                received_date as movement_date,
                'received' as movement_type,
                material_type,
                quantity,
                'Material Receipt: ' || COALESCE(mr.receipt_number, 'Unknown') as reference
            FROM material_in mi
            LEFT JOIN material_receipts mr ON mi.receipt_id = mr.id
            WHERE mi.customer_id = p_customer_id
            AND mi.received_date >= CURRENT_DATE - p_history_days
            
            UNION ALL
            
            -- Deliveries
            SELECT 
                dc.challan_date as movement_date,
                'delivered' as movement_type,
                ci.material_type,
                ci.quantity_delivered as quantity,
                'Delivery Challan: ' || dc.challan_number as reference
            FROM challan_items ci
            JOIN delivery_challans dc ON ci.challan_id = dc.id
            WHERE dc.customer_id = p_customer_id
            AND dc.challan_date >= CURRENT_DATE - p_history_days
        )
        SELECT jsonb_agg(
            json_build_object(
                'date', movement_date,
                'type', movement_type,
                'material_type', material_type,
                'quantity', quantity,
                'reference', reference
            ) ORDER BY movement_date DESC
        ) INTO v_movement_history
        FROM movement_history;
    END IF;
    
    -- Return comprehensive snapshot
    RETURN json_build_object(
        'customer_id', p_customer_id,
        'customer_name', v_customer.name,
        'customer_phone', v_customer.phone,
        'customer_email', v_customer.email,
        'snapshot_date', CURRENT_DATE,
        'stock_summary', COALESCE(v_stock_summary, '{}'::jsonb),
        'movement_history', COALESCE(v_movement_history, '[]'::jsonb),
        'total_materials', (SELECT COUNT(*) FROM material_stock WHERE customer_id = p_customer_id),
        'total_current_stock', (SELECT COALESCE(SUM(current_stock), 0) FROM material_stock WHERE customer_id = p_customer_id)
    );
END;
$$ LANGUAGE plpgsql;

-- 4. MATERIAL STOCK RECONCILIATION
-- Helps reconcile physical stock with system stock
CREATE OR REPLACE FUNCTION reconcile_material_stock(
    p_customer_id UUID,
    p_physical_counts JSONB, -- [{"material_type": "Sarees", "physical_count": 25}, {...}]
    p_reconciliation_reason TEXT DEFAULT 'Physical stock verification',
    p_reconciled_by VARCHAR(100) DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_reconciliation_id UUID;
    v_material JSONB;
    v_adjustments JSONB := '[]';
    v_total_adjustments INTEGER := 0;
    v_system_stock DECIMAL;
    v_physical_count DECIMAL;
    v_adjustment DECIMAL;
BEGIN
    -- Create reconciliation record
    INSERT INTO stock_reconciliations (
        customer_id,
        reconciliation_date,
        reason,
        reconciled_by,
        status
    ) VALUES (
        p_customer_id,
        CURRENT_DATE,
        p_reconciliation_reason,
        p_reconciled_by,
        'in_progress'
    ) RETURNING id INTO v_reconciliation_id;
    
    -- Process each material count
    FOR v_material IN SELECT * FROM jsonb_array_elements(p_physical_counts)
    LOOP
        -- Get current system stock
        SELECT COALESCE(current_stock, 0) INTO v_system_stock
        FROM material_stock 
        WHERE customer_id = p_customer_id 
        AND material_type = (v_material->>'material_type');
        
        v_physical_count := (v_material->>'physical_count')::DECIMAL;
        v_adjustment := v_physical_count - COALESCE(v_system_stock, 0);
        
        -- Record adjustment if needed
        IF v_adjustment != 0 THEN
            INSERT INTO stock_adjustments (
                reconciliation_id,
                customer_id,
                material_type,
                system_stock,
                physical_count,
                adjustment_quantity,
                reason
            ) VALUES (
                v_reconciliation_id,
                p_customer_id,
                v_material->>'material_type',
                v_system_stock,
                v_physical_count,
                v_adjustment,
                'Physical count variance'
            );
            
            -- Update material stock
            INSERT INTO material_stock (
                customer_id,
                material_type,
                total_received,
                total_delivered,
                current_stock,
                last_updated
            ) VALUES (
                p_customer_id,
                v_material->>'material_type',
                GREATEST(v_physical_count, 0),
                GREATEST(-v_physical_count, 0),
                v_physical_count,
                NOW()
            )
            ON CONFLICT (customer_id, material_type)
            DO UPDATE SET
                current_stock = v_physical_count,
                last_updated = NOW();
            
            -- Add to adjustments summary
            v_adjustments := v_adjustments || json_build_object(
                'material_type', v_material->>'material_type',
                'system_stock', v_system_stock,
                'physical_count', v_physical_count,
                'adjustment', v_adjustment
            )::jsonb;
            
            v_total_adjustments := v_total_adjustments + 1;
        END IF;
    END LOOP;
    
    -- Update reconciliation status
    UPDATE stock_reconciliations SET
        status = 'completed',
        total_adjustments = v_total_adjustments,
        adjustments_summary = v_adjustments
    WHERE id = v_reconciliation_id;
    
    RETURN json_build_object(
        'reconciliation_id', v_reconciliation_id,
        'customer_id', p_customer_id,
        'total_adjustments', v_total_adjustments,
        'adjustments', v_adjustments
    );
END;
$$ LANGUAGE plpgsql;

-- 5. GET ALL CUSTOMER STOCK LEVELS
-- Returns stock levels for all customers
CREATE OR REPLACE FUNCTION get_all_customer_stock_levels()
RETURNS TABLE(
    customer_id UUID,
    customer_name VARCHAR(255),
    material_type VARCHAR(100),
    total_received DECIMAL(10,2),
    total_delivered DECIMAL(10,2),
    current_stock DECIMAL(10,2),
    stock_status VARCHAR(20),
    last_movement_date DATE,
    days_since_movement INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ms.customer_id,
        c.name as customer_name,
        ms.material_type,
        ms.total_received,
        ms.total_delivered,
        ms.current_stock,
        CASE 
            WHEN ms.current_stock < 0 THEN 'OVER_DELIVERED'
            WHEN ms.current_stock = 0 THEN 'EMPTY'
            WHEN ms.current_stock < 50 THEN 'LOW_STOCK'
            ELSE 'GOOD_STOCK'
        END as stock_status,
        GREATEST(ms.last_received_date, ms.last_delivered_date) as last_movement_date,
        CURRENT_DATE - GREATEST(ms.last_received_date, ms.last_delivered_date) as days_since_movement
    FROM material_stock ms
    JOIN customers c ON ms.customer_id = c.id
    WHERE c.is_deleted = FALSE
    ORDER BY c.name, ms.material_type;
END;
$$ LANGUAGE plpgsql;

-- USAGE EXAMPLES:
-- 1. Record material receipt from your example:
-- SELECT record_material_receipt(
--     'customer-uuid',
--     '2025-05-01',
--     'MR-001',
--     '[{"material_type": "Sarees", "quantity": 10}, {"material_type": "Duppatas", "quantity": 30}, {"material_type": "Blouses", "quantity": 40}]',
--     'Initial material receipt from customer'
-- );

-- 2. Create delivery challan:
-- SELECT create_multi_order_delivery_challan(
--     'customer-uuid',
--     'DC-001',
--     '2025-05-05',
--     '[{"order_item_id": "order-item-uuid", "quantity_delivered": 35}]'
-- );

-- 3. Get customer stock snapshot:
-- SELECT get_customer_stock_snapshot('customer-uuid', true, 30);

-- 4. Get all customer stock levels:
-- SELECT * FROM get_all_customer_stock_levels();