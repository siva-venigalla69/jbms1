-- =========================================
-- INVENTORY & STOCK REPORTING SQLs
-- Comprehensive material management reports
-- =========================================

-- 1. COMPREHENSIVE STOCK REPORT
CREATE OR REPLACE FUNCTION get_comprehensive_stock_report()
RETURNS TABLE(
    customer_id UUID,
    customer_name VARCHAR(255),
    material_type VARCHAR(100),
    total_received DECIMAL(10,2),
    total_delivered DECIMAL(10,2),
    current_stock DECIMAL(10,2),
    stock_value DECIMAL(12,2),
    pending_orders DECIMAL(10,2),
    available_after_orders DECIMAL(10,2),
    last_received_date DATE,
    last_delivered_date DATE,
    stock_turnover_days INTEGER,
    stock_status VARCHAR(20),
    reorder_priority INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH stock_analytics AS (
        SELECT 
            ms.customer_id,
            c.name as customer_name,
            ms.material_type,
            ms.total_received,
            ms.total_delivered,
            ms.current_stock,
            ms.current_stock * COALESCE(avg_prices.avg_price, 100) as stock_value,
            COALESCE(pending.pending_quantity, 0) as pending_orders,
            ms.current_stock - COALESCE(pending.pending_quantity, 0) as available_after_orders,
            received.last_date as last_received_date,
            delivered.last_date as last_delivered_date,
            CASE 
                WHEN ms.total_delivered > 0 AND ms.total_received > 0
                THEN (ms.current_stock::DECIMAL / (ms.total_delivered / GREATEST(1, 
                    EXTRACT(days FROM (NOW() - COALESCE(received.first_date, NOW())))))::INTEGER
                ELSE NULL
            END as stock_turnover_days
        FROM material_stock ms
        JOIN customers c ON ms.customer_id = c.id
        LEFT JOIN (
            -- Average pricing per material type
            SELECT 
                material_type::TEXT as material_type,
                AVG(unit_price) as avg_price
            FROM order_items
            GROUP BY material_type::TEXT
        ) avg_prices ON ms.material_type = avg_prices.material_type
        LEFT JOIN (
            -- Pending order quantities
            SELECT 
                o.customer_id,
                mt.name as material_type,
                SUM(oi.quantity) as pending_quantity
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN material_types mt ON oi.material_type = mt.id
            WHERE oi.production_status != 'post_process'
            AND o.is_deleted = FALSE
            GROUP BY o.customer_id, mt.name
        ) pending ON ms.customer_id = pending.customer_id AND ms.material_type = pending.material_type
        LEFT JOIN (
            -- Last received dates
            SELECT 
                mi.customer_id,
                mt.name as material_type,
                MAX(mi.received_date) as last_date,
                MIN(mi.received_date) as first_date
            FROM material_in mi
            JOIN material_types mt ON mi.material_type = mt.id
            GROUP BY mi.customer_id, mt.name
        ) received ON ms.customer_id = received.customer_id AND ms.material_type = received.material_type
        LEFT JOIN (
            -- Last delivered dates
            SELECT 
                mo.customer_id,
                mt.name as material_type,
                MAX(mo.delivery_date) as last_date
            FROM material_out mo
            JOIN material_types mt ON mo.material_type = mt.id
            GROUP BY mo.customer_id, mt.name
        ) delivered ON ms.customer_id = delivered.customer_id AND ms.material_type = delivered.material_type
        WHERE c.is_deleted = FALSE
    )
    SELECT 
        sa.*,
        CASE 
            WHEN sa.current_stock < 0 THEN 'NEGATIVE'
            WHEN sa.current_stock = 0 THEN 'OUT_OF_STOCK'
            WHEN sa.available_after_orders <= 0 THEN 'SHORTAGE'
            WHEN sa.current_stock < 10 THEN 'LOW_STOCK'
            WHEN sa.current_stock < 50 THEN 'ADEQUATE'
            ELSE 'HEALTHY'
        END as stock_status,
        CASE 
            WHEN sa.available_after_orders <= 0 THEN 1  -- Critical
            WHEN sa.current_stock < 10 THEN 2           -- High
            WHEN sa.current_stock < 25 THEN 3           -- Medium
            ELSE 4                                      -- Low
        END as reorder_priority
    FROM stock_analytics sa
    ORDER BY reorder_priority ASC, sa.customer_name, sa.material_type;
END;
$$ LANGUAGE plpgsql;

-- 2. STOCK MOVEMENT ANALYSIS
CREATE OR REPLACE FUNCTION get_stock_movement_analysis(
    p_customer_id UUID DEFAULT NULL,
    p_material_type VARCHAR(100) DEFAULT NULL,
    p_from_date DATE DEFAULT CURRENT_DATE - INTERVAL '90 days',
    p_to_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    period_month VARCHAR(7),
    customer_name VARCHAR(255),
    material_type VARCHAR(100),
    opening_stock DECIMAL(10,2),
    total_received DECIMAL(10,2),
    total_delivered DECIMAL(10,2),
    closing_stock DECIMAL(10,2),
    stock_turnover DECIMAL(5,2),
    movement_trend VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    WITH monthly_periods AS (
        SELECT 
            to_char(generate_series(
                date_trunc('month', p_from_date),
                date_trunc('month', p_to_date),
                '1 month'::interval
            ), 'YYYY-MM') as period_month
    ),
    stock_movements AS (
        SELECT 
            p.period_month,
            c.name as customer_name,
            mt.name as material_type,
            -- Calculate opening stock (stock at beginning of month)
            COALESCE(
                (SELECT ms.current_stock 
                 FROM material_stock ms 
                 WHERE ms.customer_id = c.id 
                 AND ms.material_type = mt.name), 0
            ) - COALESCE(current_received.received, 0) + COALESCE(current_delivered.delivered, 0) as opening_stock,
            COALESCE(current_received.received, 0) as total_received,
            COALESCE(current_delivered.delivered, 0) as total_delivered,
            COALESCE(
                (SELECT ms.current_stock 
                 FROM material_stock ms 
                 WHERE ms.customer_id = c.id 
                 AND ms.material_type = mt.name), 0
            ) as closing_stock
        FROM monthly_periods p
        CROSS JOIN customers c
        CROSS JOIN material_types mt
        LEFT JOIN (
            -- Received in current month
            SELECT 
                to_char(mi.received_date, 'YYYY-MM') as month,
                mi.customer_id,
                mat.name as material_type,
                SUM(mi.quantity) as received
            FROM material_in mi
            JOIN material_types mat ON mi.material_type = mat.id
            WHERE mi.received_date BETWEEN p_from_date AND p_to_date
            GROUP BY to_char(mi.received_date, 'YYYY-MM'), mi.customer_id, mat.name
        ) current_received ON p.period_month = current_received.month 
                         AND c.id = current_received.customer_id 
                         AND mt.name = current_received.material_type
        LEFT JOIN (
            -- Delivered in current month
            SELECT 
                to_char(mo.delivery_date, 'YYYY-MM') as month,
                mo.customer_id,
                mat.name as material_type,
                SUM(mo.quantity) as delivered
            FROM material_out mo
            JOIN material_types mat ON mo.material_type = mat.id
            WHERE mo.delivery_date BETWEEN p_from_date AND p_to_date
            GROUP BY to_char(mo.delivery_date, 'YYYY-MM'), mo.customer_id, mat.name
        ) current_delivered ON p.period_month = current_delivered.month 
                           AND c.id = current_delivered.customer_id 
                           AND mt.name = current_delivered.material_type
        WHERE c.is_deleted = FALSE
        AND (p_customer_id IS NULL OR c.id = p_customer_id)
        AND (p_material_type IS NULL OR mt.name = p_material_type)
        AND (current_received.received > 0 OR current_delivered.delivered > 0 OR 
             EXISTS (SELECT 1 FROM material_stock ms WHERE ms.customer_id = c.id AND ms.material_type = mt.name))
    )
    SELECT 
        sm.period_month,
        sm.customer_name,
        sm.material_type,
        sm.opening_stock,
        sm.total_received,
        sm.total_delivered,
        sm.closing_stock,
        CASE 
            WHEN (sm.opening_stock + sm.closing_stock) > 0 
            THEN ROUND((sm.total_delivered * 2.0) / (sm.opening_stock + sm.closing_stock), 2)
            ELSE 0 
        END as stock_turnover,
        CASE 
            WHEN sm.total_received > sm.total_delivered THEN 'BUILDING_UP'
            WHEN sm.total_delivered > sm.total_received THEN 'CONSUMING'
            WHEN sm.total_received = sm.total_delivered AND sm.total_received > 0 THEN 'STABLE'
            ELSE 'NO_MOVEMENT'
        END as movement_trend
    FROM stock_movements sm
    ORDER BY sm.period_month DESC, sm.customer_name, sm.material_type;
END;
$$ LANGUAGE plpgsql;

-- 3. STOCK AGING REPORT
CREATE OR REPLACE FUNCTION get_stock_aging_report(p_customer_id UUID DEFAULT NULL)
RETURNS TABLE(
    customer_name VARCHAR(255),
    material_type VARCHAR(100),
    current_stock DECIMAL(10,2),
    stock_value DECIMAL(12,2),
    oldest_batch_date DATE,
    newest_batch_date DATE,
    avg_age_days INTEGER,
    aging_category VARCHAR(20),
    last_movement_date DATE,
    days_since_last_movement INTEGER,
    movement_status VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    WITH stock_aging AS (
        SELECT 
            c.name as customer_name,
            ms.material_type,
            ms.current_stock,
            ms.current_stock * COALESCE(avg_prices.avg_price, 100) as stock_value,
            MIN(mi.received_date) as oldest_batch_date,
            MAX(mi.received_date) as newest_batch_date,
            ROUND(AVG(CURRENT_DATE - mi.received_date))::INTEGER as avg_age_days,
            MAX(GREATEST(mi.received_date, COALESCE(mo.delivery_date, '1900-01-01'::DATE))) as last_movement_date
        FROM material_stock ms
        JOIN customers c ON ms.customer_id = c.id
        LEFT JOIN material_in mi ON ms.customer_id = mi.customer_id 
            AND ms.material_type = (SELECT name FROM material_types WHERE id = mi.material_type)
        LEFT JOIN material_out mo ON ms.customer_id = mo.customer_id 
            AND ms.material_type = (SELECT name FROM material_types WHERE id = mo.material_type)
        LEFT JOIN (
            SELECT 
                material_type::TEXT as material_type,
                AVG(unit_price) as avg_price
            FROM order_items
            GROUP BY material_type::TEXT
        ) avg_prices ON ms.material_type = avg_prices.material_type
        WHERE ms.current_stock > 0
        AND c.is_deleted = FALSE
        AND (p_customer_id IS NULL OR c.id = p_customer_id)
        GROUP BY c.name, ms.material_type, ms.current_stock, avg_prices.avg_price
    )
    SELECT 
        sa.customer_name,
        sa.material_type,
        sa.current_stock,
        sa.stock_value,
        sa.oldest_batch_date,
        sa.newest_batch_date,
        sa.avg_age_days,
        CASE 
            WHEN sa.avg_age_days <= 30 THEN 'FRESH'
            WHEN sa.avg_age_days <= 90 THEN 'GOOD'
            WHEN sa.avg_age_days <= 180 THEN 'AGING'
            WHEN sa.avg_age_days <= 365 THEN 'OLD'
            ELSE 'VERY_OLD'
        END as aging_category,
        sa.last_movement_date,
        (CURRENT_DATE - sa.last_movement_date)::INTEGER as days_since_last_movement,
        CASE 
            WHEN (CURRENT_DATE - sa.last_movement_date) <= 7 THEN 'ACTIVE'
            WHEN (CURRENT_DATE - sa.last_movement_date) <= 30 THEN 'RECENT'
            WHEN (CURRENT_DATE - sa.last_movement_date) <= 90 THEN 'SLOW'
            ELSE 'STAGNANT'
        END as movement_status
    FROM stock_aging sa
    ORDER BY sa.avg_age_days DESC, sa.stock_value DESC;
END;
$$ LANGUAGE plpgsql;

-- 4. STOCK SHORTAGE PREDICTION
CREATE OR REPLACE FUNCTION get_stock_shortage_prediction(
    p_prediction_days INTEGER DEFAULT 30
)
RETURNS TABLE(
    customer_id UUID,
    customer_name VARCHAR(255),
    material_type VARCHAR(100),
    current_stock DECIMAL(10,2),
    daily_consumption_rate DECIMAL(10,2),
    pending_orders DECIMAL(10,2),
    predicted_shortage_date DATE,
    days_until_shortage INTEGER,
    recommended_order_quantity DECIMAL(10,2),
    priority_level VARCHAR(10)
) AS $$
BEGIN
    RETURN QUERY
    WITH consumption_rates AS (
        SELECT 
            mo.customer_id,
            mt.name as material_type,
            AVG(mo.quantity) as daily_consumption_rate,
            COUNT(*) as delivery_days
        FROM material_out mo
        JOIN material_types mt ON mo.material_type = mt.id
        WHERE mo.delivery_date >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY mo.customer_id, mt.name
        HAVING COUNT(*) >= 3  -- Need at least 3 data points
    ),
    stock_prediction AS (
        SELECT 
            ms.customer_id,
            c.name as customer_name,
            ms.material_type,
            ms.current_stock,
            COALESCE(cr.daily_consumption_rate, 0) as daily_consumption_rate,
            COALESCE(pending.pending_quantity, 0) as pending_orders,
            CASE 
                WHEN cr.daily_consumption_rate > 0 
                THEN CURRENT_DATE + ((ms.current_stock - COALESCE(pending.pending_quantity, 0)) / cr.daily_consumption_rate)::INTEGER
                ELSE NULL 
            END as predicted_shortage_date
        FROM material_stock ms
        JOIN customers c ON ms.customer_id = c.id
        LEFT JOIN consumption_rates cr ON ms.customer_id = cr.customer_id AND ms.material_type = cr.material_type
        LEFT JOIN (
            SELECT 
                o.customer_id,
                mt.name as material_type,
                SUM(oi.quantity) as pending_quantity
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN material_types mt ON oi.material_type = mt.id
            WHERE oi.production_status != 'post_process'
            AND o.is_deleted = FALSE
            GROUP BY o.customer_id, mt.name
        ) pending ON ms.customer_id = pending.customer_id AND ms.material_type = pending.material_type
        WHERE c.is_deleted = FALSE
        AND (ms.current_stock > 0 OR pending.pending_quantity > 0)
    )
    SELECT 
        sp.customer_id,
        sp.customer_name,
        sp.material_type,
        sp.current_stock,
        sp.daily_consumption_rate,
        sp.pending_orders,
        sp.predicted_shortage_date,
        CASE 
            WHEN sp.predicted_shortage_date IS NOT NULL 
            THEN (sp.predicted_shortage_date - CURRENT_DATE)::INTEGER
            ELSE NULL 
        END as days_until_shortage,
        CASE 
            WHEN sp.daily_consumption_rate > 0 
            THEN ROUND(sp.daily_consumption_rate * (p_prediction_days + 15), 1)  -- 15 days buffer
            ELSE 50  -- Default recommendation
        END as recommended_order_quantity,
        CASE 
            WHEN sp.predicted_shortage_date IS NULL THEN 'LOW'
            WHEN sp.predicted_shortage_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'CRITICAL'
            WHEN sp.predicted_shortage_date <= CURRENT_DATE + INTERVAL '15 days' THEN 'HIGH'
            WHEN sp.predicted_shortage_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'MEDIUM'
            ELSE 'LOW'
        END as priority_level
    FROM stock_prediction sp
    WHERE sp.predicted_shortage_date IS NOT NULL 
    AND sp.predicted_shortage_date <= CURRENT_DATE + p_prediction_days
    ORDER BY 
        CASE priority_level 
            WHEN 'CRITICAL' THEN 1 
            WHEN 'HIGH' THEN 2 
            WHEN 'MEDIUM' THEN 3 
            ELSE 4 
        END,
        sp.predicted_shortage_date ASC;
END;
$$ LANGUAGE plpgsql;

-- 5. INVENTORY VALUATION REPORT
CREATE OR REPLACE FUNCTION get_inventory_valuation_report()
RETURNS TABLE(
    customer_name VARCHAR(255),
    total_stock_value DECIMAL(12,2),
    material_breakdown JSON,
    stock_categories JSON,
    valuation_method VARCHAR(20),
    last_updated TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    WITH customer_valuations AS (
        SELECT 
            c.id as customer_id,
            c.name as customer_name,
            SUM(ms.current_stock * COALESCE(avg_prices.avg_price, 100)) as total_stock_value,
            json_agg(
                json_build_object(
                    'material_type', ms.material_type,
                    'quantity', ms.current_stock,
                    'unit_price', COALESCE(avg_prices.avg_price, 100),
                    'total_value', ms.current_stock * COALESCE(avg_prices.avg_price, 100)
                )
            ) as material_breakdown,
            MAX(ms.updated_at) as last_updated
        FROM customers c
        JOIN material_stock ms ON c.id = ms.customer_id
        LEFT JOIN (
            SELECT 
                material_type::TEXT as material_type,
                AVG(unit_price) as avg_price
            FROM order_items
            GROUP BY material_type::TEXT
        ) avg_prices ON ms.material_type = avg_prices.material_type
        WHERE ms.current_stock > 0
        AND c.is_deleted = FALSE
        GROUP BY c.id, c.name
    ),
    stock_categories AS (
        SELECT 
            cv.customer_id,
            json_build_object(
                'high_value', SUM(CASE WHEN item_value.value > 1000 THEN item_value.value ELSE 0 END),
                'medium_value', SUM(CASE WHEN item_value.value BETWEEN 500 AND 1000 THEN item_value.value ELSE 0 END),
                'low_value', SUM(CASE WHEN item_value.value < 500 THEN item_value.value ELSE 0 END),
                'fast_moving', COUNT(CASE WHEN fast_moving.material_type IS NOT NULL THEN 1 END),
                'slow_moving', COUNT(CASE WHEN fast_moving.material_type IS NULL THEN 1 END)
            ) as categories
        FROM customer_valuations cv
        CROSS JOIN LATERAL (
            SELECT 
                (breakdown->>'material_type')::TEXT as material_type,
                (breakdown->>'total_value')::DECIMAL as value
            FROM json_array_elements(cv.material_breakdown) as breakdown
        ) item_value
        LEFT JOIN (
            -- Identify fast-moving items (delivered in last 30 days)
            SELECT DISTINCT 
                mt.name as material_type
            FROM material_out mo
            JOIN material_types mt ON mo.material_type = mt.id
            WHERE mo.delivery_date >= CURRENT_DATE - INTERVAL '30 days'
        ) fast_moving ON item_value.material_type = fast_moving.material_type
        GROUP BY cv.customer_id
    )
    SELECT 
        cv.customer_name,
        cv.total_stock_value,
        cv.material_breakdown,
        sc.categories as stock_categories,
        'WEIGHTED_AVERAGE'::VARCHAR(20) as valuation_method,
        cv.last_updated
    FROM customer_valuations cv
    LEFT JOIN stock_categories sc ON cv.customer_id = sc.customer_id
    ORDER BY cv.total_stock_value DESC;
END;
$$ LANGUAGE plpgsql;

-- USAGE EXAMPLES:
-- 1. Comprehensive stock report: SELECT * FROM get_comprehensive_stock_report() WHERE stock_status IN ('SHORTAGE', 'LOW_STOCK');
-- 2. Stock movement analysis: SELECT * FROM get_stock_movement_analysis('customer-uuid', 'saree', '2025-06-01', '2025-09-02');
-- 3. Stock aging report: SELECT * FROM get_stock_aging_report() WHERE aging_category IN ('OLD', 'VERY_OLD');
-- 4. Stock shortage prediction: SELECT * FROM get_stock_shortage_prediction(45) WHERE priority_level IN ('CRITICAL', 'HIGH');
-- 5. Inventory valuation: SELECT * FROM get_inventory_valuation_report();