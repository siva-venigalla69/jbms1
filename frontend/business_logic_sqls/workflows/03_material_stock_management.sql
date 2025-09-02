-- =========================================
-- MATERIAL STOCK MANAGEMENT WORKFLOW SQLs
-- Complete material inventory operations
-- =========================================

-- 1. RECEIVE MATERIAL FROM CUSTOMER
CREATE OR REPLACE FUNCTION receive_material(
    p_customer_id UUID,
    p_order_id UUID DEFAULT NULL,
    p_material_type VARCHAR(100),
    p_quantity DECIMAL(10,2),
    p_received_date DATE DEFAULT CURRENT_DATE,
    p_quality_status VARCHAR(20) DEFAULT 'good',
    p_storage_location VARCHAR(100) DEFAULT NULL,
    p_batch_number VARCHAR(100) DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_material_in_id UUID;
    v_material_type_id UUID;
BEGIN
    -- Validate customer exists
    IF NOT EXISTS (SELECT 1 FROM customers WHERE id = p_customer_id AND is_deleted = FALSE) THEN
        RAISE EXCEPTION 'Customer not found or inactive: %', p_customer_id;
    END IF;
    
    -- Get or create material type
    SELECT id INTO v_material_type_id FROM material_types WHERE name = p_material_type;
    IF NOT FOUND THEN
        INSERT INTO material_types (name) VALUES (p_material_type) RETURNING id INTO v_material_type_id;
    END IF;
    
    -- Record material receipt
    INSERT INTO material_in (
        customer_id, order_id, material_type, quantity, received_date,
        quality_check_status, storage_location, batch_number, notes
    ) VALUES (
        p_customer_id, p_order_id, v_material_type_id, p_quantity, p_received_date,
        p_quality_status, p_storage_location, p_batch_number, p_notes
    ) RETURNING id INTO v_material_in_id;
    
    -- Update or create material stock record
    INSERT INTO material_stock (customer_id, material_type, total_received, last_transaction_date)
    VALUES (p_customer_id, p_material_type, p_quantity, NOW())
    ON CONFLICT (customer_id, material_type)
    DO UPDATE SET
        total_received = material_stock.total_received + p_quantity,
        last_transaction_date = NOW(),
        updated_at = NOW();
    
    -- Log material receipt
    INSERT INTO audit_trail (table_name, record_id, action, new_values, changed_at)
    VALUES ('material_in', v_material_in_id, 'INSERT',
            json_build_object('customer_id', p_customer_id, 'material_type', p_material_type, 'quantity', p_quantity),
            NOW());
    
    RETURN v_material_in_id;
END;
$$ LANGUAGE plpgsql;

-- 2. DELIVER MATERIAL TO CUSTOMER (Via Challan)
CREATE OR REPLACE FUNCTION deliver_material(
    p_challan_id UUID,
    p_customer_id UUID,
    p_material_type VARCHAR(100),
    p_quantity DECIMAL(10,2)
) RETURNS UUID AS $$
DECLARE
    v_material_out_id UUID;
    v_material_type_id UUID;
    v_current_stock DECIMAL(10,2);
BEGIN
    -- Get material type ID
    SELECT id INTO v_material_type_id FROM material_types WHERE name = p_material_type;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Material type not found: %', p_material_type;
    END IF;
    
    -- Check current stock
    SELECT current_stock INTO v_current_stock 
    FROM material_stock 
    WHERE customer_id = p_customer_id AND material_type = p_material_type;
    
    IF FOUND AND v_current_stock < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', v_current_stock, p_quantity;
    END IF;
    
    -- Record material delivery
    INSERT INTO material_out (challan_id, customer_id, material_type, quantity, delivery_date)
    VALUES (p_challan_id, p_customer_id, v_material_type_id, p_quantity, CURRENT_DATE)
    RETURNING id INTO v_material_out_id;
    
    -- Update material stock
    INSERT INTO material_stock (customer_id, material_type, total_delivered, last_transaction_date)
    VALUES (p_customer_id, p_material_type, p_quantity, NOW())
    ON CONFLICT (customer_id, material_type)
    DO UPDATE SET
        total_delivered = material_stock.total_delivered + p_quantity,
        last_transaction_date = NOW(),
        updated_at = NOW();
    
    -- Log material delivery
    INSERT INTO audit_trail (table_name, record_id, action, new_values, changed_at)
    VALUES ('material_out', v_material_out_id, 'INSERT',
            json_build_object('challan_id', p_challan_id, 'customer_id', p_customer_id, 'material_type', p_material_type, 'quantity', p_quantity),
            NOW());
    
    RETURN v_material_out_id;
END;
$$ LANGUAGE plpgsql;

-- 3. GET CUSTOMER STOCK SUMMARY
CREATE OR REPLACE FUNCTION get_customer_stock_summary(p_customer_id UUID)
RETURNS TABLE(
    customer_name VARCHAR(255),
    material_type VARCHAR(100),
    total_received DECIMAL(10,2),
    total_delivered DECIMAL(10,2),
    current_stock DECIMAL(10,2),
    stock_value DECIMAL(12,2),
    last_transaction_date TIMESTAMP WITH TIME ZONE,
    stock_status VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.name as customer_name,
        ms.material_type,
        ms.total_received,
        ms.total_delivered,
        ms.current_stock,
        COALESCE(ms.current_stock * AVG(oi.unit_price), 0) as stock_value,
        ms.last_transaction_date,
        CASE 
            WHEN ms.current_stock < 0 THEN 'NEGATIVE'
            WHEN ms.current_stock = 0 THEN 'EMPTY'
            WHEN ms.current_stock < 10 THEN 'LOW'
            ELSE 'OK'
        END as stock_status
    FROM material_stock ms
    JOIN customers c ON ms.customer_id = c.id
    LEFT JOIN order_items oi ON oi.material_type::TEXT = ms.material_type AND oi.order_id IN (
        SELECT o.id FROM orders o WHERE o.customer_id = ms.customer_id
    )
    WHERE ms.customer_id = p_customer_id
    GROUP BY c.name, ms.material_type, ms.total_received, ms.total_delivered, ms.current_stock, ms.last_transaction_date
    ORDER BY ms.material_type;
END;
$$ LANGUAGE plpgsql;

-- 4. GET LOW STOCK ALERTS
CREATE OR REPLACE FUNCTION get_low_stock_alerts(p_threshold DECIMAL(10,2) DEFAULT 10)
RETURNS TABLE(
    customer_id UUID,
    customer_name VARCHAR(255),
    material_type VARCHAR(100),
    current_stock DECIMAL(10,2),
    pending_orders INTEGER,
    required_stock DECIMAL(10,2),
    shortage DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ms.customer_id,
        c.name as customer_name,
        ms.material_type,
        ms.current_stock,
        COUNT(oi.id)::INTEGER as pending_orders,
        COALESCE(SUM(oi.quantity), 0) as required_stock,
        GREATEST(0, COALESCE(SUM(oi.quantity), 0) - ms.current_stock) as shortage
    FROM material_stock ms
    JOIN customers c ON ms.customer_id = c.id
    LEFT JOIN orders o ON o.customer_id = ms.customer_id AND o.is_deleted = FALSE
    LEFT JOIN order_items oi ON oi.order_id = o.id 
        AND oi.material_type::TEXT = ms.material_type
        AND oi.production_status != 'post_process'
    WHERE 
        ms.current_stock <= p_threshold
        OR (COALESCE(SUM(oi.quantity), 0) > ms.current_stock)
    GROUP BY ms.customer_id, c.name, ms.material_type, ms.current_stock
    HAVING ms.current_stock <= p_threshold OR COALESCE(SUM(oi.quantity), 0) > ms.current_stock
    ORDER BY shortage DESC, ms.current_stock ASC;
END;
$$ LANGUAGE plpgsql;

-- 5. MATERIAL TRANSACTION HISTORY
CREATE OR REPLACE FUNCTION get_material_transaction_history(
    p_customer_id UUID,
    p_material_type VARCHAR(100) DEFAULT NULL,
    p_from_date DATE DEFAULT NULL,
    p_to_date DATE DEFAULT NULL,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE(
    transaction_date DATE,
    transaction_type VARCHAR(10),
    material_type VARCHAR(100),
    quantity DECIMAL(10,2),
    reference_number VARCHAR(100),
    notes TEXT,
    running_balance DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH material_transactions AS (
        -- Material IN transactions
        SELECT 
            mi.received_date as transaction_date,
            'IN' as transaction_type,
            mt.name as material_type,
            mi.quantity,
            mi.batch_number as reference_number,
            mi.notes,
            ROW_NUMBER() OVER (PARTITION BY mt.name ORDER BY mi.received_date, mi.created_at) as row_num
        FROM material_in mi
        JOIN material_types mt ON mi.material_type = mt.id
        WHERE mi.customer_id = p_customer_id
        AND (p_material_type IS NULL OR mt.name = p_material_type)
        AND (p_from_date IS NULL OR mi.received_date >= p_from_date)
        AND (p_to_date IS NULL OR mi.received_date <= p_to_date)
        
        UNION ALL
        
        -- Material OUT transactions
        SELECT 
            mo.delivery_date as transaction_date,
            'OUT' as transaction_type,
            mt.name as material_type,
            -mo.quantity as quantity,
            dc.challan_number as reference_number,
            'Delivered via challan' as notes,
            ROW_NUMBER() OVER (PARTITION BY mt.name ORDER BY mo.delivery_date, mo.created_at) + 10000 as row_num
        FROM material_out mo
        JOIN material_types mt ON mo.material_type = mt.id
        JOIN delivery_challans dc ON mo.challan_id = dc.id
        WHERE mo.customer_id = p_customer_id
        AND (p_material_type IS NULL OR mt.name = p_material_type)
        AND (p_from_date IS NULL OR mo.delivery_date >= p_from_date)
        AND (p_to_date IS NULL OR mo.delivery_date <= p_to_date)
    ),
    transactions_with_balance AS (
        SELECT 
            *,
            SUM(quantity) OVER (
                PARTITION BY material_type 
                ORDER BY transaction_date, row_num 
                ROWS UNBOUNDED PRECEDING
            ) as running_balance
        FROM material_transactions
    )
    SELECT 
        t.transaction_date,
        t.transaction_type,
        t.material_type,
        t.quantity,
        t.reference_number,
        t.notes,
        t.running_balance
    FROM transactions_with_balance t
    ORDER BY t.material_type, t.transaction_date DESC, t.row_num DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 6. STOCK RECONCILIATION
CREATE OR REPLACE FUNCTION reconcile_stock(
    p_customer_id UUID,
    p_material_type VARCHAR(100),
    p_physical_count DECIMAL(10,2),
    p_adjustment_reason TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_system_stock DECIMAL(10,2);
    v_adjustment DECIMAL(10,2);
BEGIN
    -- Get current system stock
    SELECT current_stock INTO v_system_stock
    FROM material_stock
    WHERE customer_id = p_customer_id AND material_type = p_material_type;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No stock record found for customer % and material %', p_customer_id, p_material_type;
    END IF;
    
    v_adjustment := p_physical_count - v_system_stock;
    
    IF v_adjustment != 0 THEN
        -- Record adjustment as material IN or OUT
        IF v_adjustment > 0 THEN
            -- Positive adjustment - add to stock
            PERFORM receive_material(
                p_customer_id, NULL, p_material_type, v_adjustment,
                CURRENT_DATE, 'adjustment', 'RECONCILIATION', 
                'ADJ-' || to_char(NOW(), 'YYYYMMDD-HH24MI'),
                'Stock reconciliation adjustment: ' || p_adjustment_reason
            );
        ELSE
            -- Negative adjustment - create a special material_out record
            INSERT INTO material_out (challan_id, customer_id, material_type, quantity, delivery_date)
            SELECT NULL, p_customer_id, mt.id, ABS(v_adjustment), CURRENT_DATE
            FROM material_types mt WHERE mt.name = p_material_type;
            
            -- Update stock manually for negative adjustments
            UPDATE material_stock SET
                total_delivered = total_delivered + ABS(v_adjustment),
                last_transaction_date = NOW(),
                updated_at = NOW()
            WHERE customer_id = p_customer_id AND material_type = p_material_type;
        END IF;
        
        -- Log reconciliation
        INSERT INTO audit_trail (table_name, record_id, action, old_values, new_values, changed_at)
        VALUES ('material_stock', p_customer_id, 'RECONCILIATION',
                json_build_object('system_stock', v_system_stock, 'physical_count', p_physical_count),
                json_build_object('adjustment', v_adjustment, 'reason', p_adjustment_reason),
                NOW());
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- USAGE EXAMPLES:
-- 1. Receive material: SELECT receive_material('customer-uuid', 'order-uuid', 'saree', 50, '2025-09-02', 'good', 'RACK-A1', 'BATCH-001', 'Good quality cotton sarees');
-- 2. Get stock summary: SELECT * FROM get_customer_stock_summary('customer-uuid');
-- 3. Get low stock alerts: SELECT * FROM get_low_stock_alerts(5);
-- 4. Get transaction history: SELECT * FROM get_material_transaction_history('customer-uuid', 'saree', '2025-08-01', '2025-09-02', 50);
-- 5. Reconcile stock: SELECT reconcile_stock('customer-uuid', 'saree', 45.5, 'Physical count showed 45.5 pieces instead of system count');