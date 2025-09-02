-- =========================================
-- BUSINESS DASHBOARD REPORTING SQLs
-- Key performance indicators and metrics
-- =========================================

-- 1. BUSINESS OVERVIEW DASHBOARD
CREATE OR REPLACE FUNCTION get_business_overview(
    p_from_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_to_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    total_customers INTEGER,
    active_customers INTEGER,
    total_orders INTEGER,
    active_orders INTEGER,
    total_revenue DECIMAL(12,2),
    pending_payments DECIMAL(12,2),
    total_stock_value DECIMAL(12,2),
    pending_deliveries INTEGER,
    production_items_ready INTEGER,
    design_pending_items INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM customers WHERE is_deleted = FALSE)::INTEGER as total_customers,
        (SELECT COUNT(*) FROM customers WHERE is_deleted = FALSE AND is_active = TRUE)::INTEGER as active_customers,
        (SELECT COUNT(*) FROM orders WHERE created_at BETWEEN p_from_date AND p_to_date AND is_deleted = FALSE)::INTEGER as total_orders,
        (SELECT COUNT(*) FROM orders WHERE is_deleted = FALSE)::INTEGER as active_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM gst_invoices WHERE invoice_date BETWEEN p_from_date AND p_to_date AND is_deleted = FALSE) as total_revenue,
        (SELECT COALESCE(SUM(gi.total_amount - COALESCE(payments.total_paid, 0)), 0)
         FROM gst_invoices gi
         LEFT JOIN (
            SELECT invoice_id, SUM(payment_amount) as total_paid 
            FROM payments GROUP BY invoice_id
         ) payments ON gi.id = payments.invoice_id
         WHERE gi.payment_status IN ('pending', 'partial') AND gi.is_deleted = FALSE) as pending_payments,
        (SELECT COALESCE(SUM(ms.current_stock * COALESCE(avg_price.price, 100)), 0)
         FROM material_stock ms
         LEFT JOIN (
            SELECT material_type::TEXT as material_type, AVG(unit_price) as price
            FROM order_items GROUP BY material_type::TEXT
         ) avg_price ON ms.material_type = avg_price.material_type
         WHERE ms.current_stock > 0) as total_stock_value,
        (SELECT COUNT(*) FROM delivery_challans WHERE delivery_status IN ('prepared', 'in_transit') AND is_deleted = FALSE)::INTEGER as pending_deliveries,
        (SELECT COUNT(*) FROM order_items WHERE production_status = 'post_process' AND design_status = 'design_ready')::INTEGER as production_items_ready,
        (SELECT COUNT(*) FROM order_items WHERE design_status = 'pending_from_customer')::INTEGER as design_pending_items;
END;
$$ LANGUAGE plpgsql;

-- 2. SALES PERFORMANCE REPORT
CREATE OR REPLACE FUNCTION get_sales_performance(
    p_from_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_to_date DATE DEFAULT CURRENT_DATE,
    p_group_by VARCHAR(10) DEFAULT 'month' -- 'day', 'week', 'month'
)
RETURNS TABLE(
    period_start DATE,
    period_end DATE,
    period_label VARCHAR(20),
    orders_count INTEGER,
    revenue DECIMAL(12,2),
    payments_received DECIMAL(12,2),
    items_delivered DECIMAL(10,2),
    new_customers INTEGER,
    avg_order_value DECIMAL(12,2)
) AS $$
DECLARE
    v_date_format TEXT;
    v_interval_text TEXT;
BEGIN
    -- Set date formatting based on grouping
    CASE p_group_by
        WHEN 'day' THEN 
            v_date_format := 'YYYY-MM-DD';
            v_interval_text := '1 day';
        WHEN 'week' THEN 
            v_date_format := 'YYYY-"W"WW';
            v_interval_text := '1 week';
        ELSE -- month
            v_date_format := 'YYYY-MM';
            v_interval_text := '1 month';
    END CASE;
    
    RETURN QUERY
    EXECUTE format('
    WITH date_series AS (
        SELECT generate_series($1::DATE, $2::DATE, $3::INTERVAL) as period_start
    ),
    periods AS (
        SELECT 
            period_start,
            period_start + $3::INTERVAL - INTERVAL ''1 day'' as period_end,
            to_char(period_start, $4) as period_label
        FROM date_series
    ),
    period_stats AS (
        SELECT 
            p.period_start,
            p.period_end,
            p.period_label,
            COUNT(DISTINCT o.id) as orders_count,
            COALESCE(SUM(gi.total_amount), 0) as revenue,
            COALESCE(SUM(pay.payment_amount), 0) as payments_received,
            COALESCE(SUM(ci.quantity_delivered), 0) as items_delivered,
            COUNT(DISTINCT c.id) FILTER (WHERE c.created_at BETWEEN p.period_start AND p.period_end) as new_customers
        FROM periods p
        LEFT JOIN orders o ON o.order_date BETWEEN p.period_start AND p.period_end AND o.is_deleted = FALSE
        LEFT JOIN gst_invoices gi ON gi.invoice_date BETWEEN p.period_start AND p.period_end AND gi.is_deleted = FALSE
        LEFT JOIN payments pay ON pay.payment_date BETWEEN p.period_start AND p.period_end
        LEFT JOIN delivery_challans dc ON dc.challan_date BETWEEN p.period_start AND p.period_end AND dc.is_deleted = FALSE
        LEFT JOIN challan_items ci ON dc.id = ci.challan_id
        LEFT JOIN customers c ON c.created_at BETWEEN p.period_start AND p.period_end AND c.is_deleted = FALSE
        GROUP BY p.period_start, p.period_end, p.period_label
    )
    SELECT 
        period_start,
        period_end,
        period_label,
        orders_count::INTEGER,
        revenue,
        payments_received,
        items_delivered,
        new_customers::INTEGER,
        CASE WHEN orders_count > 0 THEN ROUND(revenue / orders_count, 2) ELSE 0 END as avg_order_value
    FROM period_stats
    ORDER BY period_start
    ', v_interval_text, v_date_format) 
    USING p_from_date, p_to_date, v_interval_text::INTERVAL, v_date_format;
END;
$$ LANGUAGE plpgsql;

-- 3. CUSTOMER ANALYSIS REPORT
CREATE OR REPLACE FUNCTION get_customer_analysis()
RETURNS TABLE(
    customer_id UUID,
    customer_name VARCHAR(255),
    total_orders INTEGER,
    total_revenue DECIMAL(12,2),
    total_payments DECIMAL(12,2),
    outstanding_amount DECIMAL(12,2),
    last_order_date DATE,
    last_payment_date DATE,
    current_stock_value DECIMAL(12,2),
    customer_lifetime_value DECIMAL(12,2),
    payment_behavior VARCHAR(20),
    customer_status VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as customer_id,
        c.name as customer_name,
        COUNT(DISTINCT o.id)::INTEGER as total_orders,
        COALESCE(SUM(gi.total_amount), 0) as total_revenue,
        COALESCE(SUM(p.payment_amount), 0) as total_payments,
        COALESCE(SUM(gi.total_amount), 0) - COALESCE(SUM(p.payment_amount), 0) as outstanding_amount,
        MAX(o.order_date) as last_order_date,
        MAX(p.payment_date) as last_payment_date,
        COALESCE(stock_value.total_value, 0) as current_stock_value,
        COALESCE(SUM(gi.total_amount), 0) + COALESCE(stock_value.total_value, 0) as customer_lifetime_value,
        CASE 
            WHEN AVG(p.payment_date - gi.invoice_date) <= 15 THEN 'EXCELLENT'
            WHEN AVG(p.payment_date - gi.invoice_date) <= 30 THEN 'GOOD'
            WHEN AVG(p.payment_date - gi.invoice_date) <= 60 THEN 'AVERAGE'
            ELSE 'POOR'
        END as payment_behavior,
        CASE 
            WHEN MAX(o.order_date) >= CURRENT_DATE - INTERVAL '30 days' THEN 'ACTIVE'
            WHEN MAX(o.order_date) >= CURRENT_DATE - INTERVAL '90 days' THEN 'RECENT'
            WHEN MAX(o.order_date) >= CURRENT_DATE - INTERVAL '365 days' THEN 'INACTIVE'
            ELSE 'DORMANT'
        END as customer_status
    FROM customers c
    LEFT JOIN orders o ON c.id = o.customer_id AND o.is_deleted = FALSE
    LEFT JOIN gst_invoices gi ON c.id = gi.customer_id AND gi.is_deleted = FALSE
    LEFT JOIN payments p ON gi.id = p.invoice_id
    LEFT JOIN (
        SELECT 
            ms.customer_id,
            SUM(ms.current_stock * COALESCE(avg_price.price, 100)) as total_value
        FROM material_stock ms
        LEFT JOIN (
            SELECT material_type::TEXT as material_type, AVG(unit_price) as price
            FROM order_items GROUP BY material_type::TEXT
        ) avg_price ON ms.material_type = avg_price.material_type
        WHERE ms.current_stock > 0
        GROUP BY ms.customer_id
    ) stock_value ON c.id = stock_value.customer_id
    WHERE c.is_deleted = FALSE
    GROUP BY c.id, c.name, stock_value.total_value
    ORDER BY customer_lifetime_value DESC;
END;
$$ LANGUAGE plpgsql;

-- 4. PRODUCTION EFFICIENCY REPORT
CREATE OR REPLACE FUNCTION get_production_efficiency_report(
    p_from_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_to_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    material_type VARCHAR(100),
    total_items INTEGER,
    design_pending INTEGER,
    design_received INTEGER,
    design_ready INTEGER,
    production_pending INTEGER,
    production_printing INTEGER,
    production_completed INTEGER,
    avg_design_time_days DECIMAL(5,2),
    avg_production_time_days DECIMAL(5,2),
    efficiency_score INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mt.name as material_type,
        COUNT(oi.id)::INTEGER as total_items,
        COUNT(CASE WHEN oi.design_status = 'pending_from_customer' THEN 1 END)::INTEGER as design_pending,
        COUNT(CASE WHEN oi.design_status = 'design_received_from_customer' THEN 1 END)::INTEGER as design_received,
        COUNT(CASE WHEN oi.design_status = 'design_ready' THEN 1 END)::INTEGER as design_ready,
        COUNT(CASE WHEN oi.production_status = 'pending' THEN 1 END)::INTEGER as production_pending,
        COUNT(CASE WHEN oi.production_status = 'printing' THEN 1 END)::INTEGER as production_printing,
        COUNT(CASE WHEN oi.production_status = 'post_process' THEN 1 END)::INTEGER as production_completed,
        ROUND(AVG(
            CASE WHEN oi.design_status = 'design_ready' 
            THEN EXTRACT(days FROM oi.updated_at - o.order_date) 
            ELSE NULL END
        ), 2) as avg_design_time_days,
        ROUND(AVG(
            CASE WHEN oi.production_status = 'post_process' 
            THEN EXTRACT(days FROM oi.updated_at - o.order_date) 
            ELSE NULL END
        ), 2) as avg_production_time_days,
        ROUND(
            (COUNT(CASE WHEN oi.production_status = 'post_process' THEN 1 END) * 100.0) / 
            NULLIF(COUNT(oi.id), 0)
        )::INTEGER as efficiency_score
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN material_types mt ON oi.material_type = mt.id
    WHERE o.order_date BETWEEN p_from_date AND p_to_date
    AND o.is_deleted = FALSE
    GROUP BY mt.name
    ORDER BY efficiency_score DESC, total_items DESC;
END;
$$ LANGUAGE plpgsql;

-- 5. FINANCIAL SUMMARY REPORT
CREATE OR REPLACE FUNCTION get_financial_summary(
    p_from_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_to_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    total_invoiced DECIMAL(12,2),
    total_payments DECIMAL(12,2),
    outstanding_amount DECIMAL(12,2),
    overdue_amount DECIMAL(12,2),
    current_month_revenue DECIMAL(12,2),
    previous_month_revenue DECIMAL(12,2),
    revenue_growth_percentage DECIMAL(5,2),
    avg_payment_days DECIMAL(5,2),
    top_paying_customer VARCHAR(255),
    highest_outstanding_customer VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    WITH financial_data AS (
        SELECT 
            SUM(gi.total_amount) as total_invoiced,
            SUM(p.payment_amount) as total_payments,
            SUM(gi.total_amount) - SUM(p.payment_amount) as outstanding_amount,
            SUM(CASE 
                WHEN gi.due_date < CURRENT_DATE AND gi.payment_status != 'paid' 
                THEN gi.total_amount - COALESCE(p.payment_amount, 0)
                ELSE 0 
            END) as overdue_amount
        FROM gst_invoices gi
        LEFT JOIN payments p ON gi.id = p.invoice_id
        WHERE gi.invoice_date BETWEEN p_from_date AND p_to_date
        AND gi.is_deleted = FALSE
    ),
    monthly_revenue AS (
        SELECT 
            SUM(CASE 
                WHEN gi.invoice_date BETWEEN date_trunc('month', CURRENT_DATE) AND CURRENT_DATE 
                THEN gi.total_amount ELSE 0 
            END) as current_month,
            SUM(CASE 
                WHEN gi.invoice_date BETWEEN 
                    date_trunc('month', CURRENT_DATE - INTERVAL '1 month') AND 
                    (date_trunc('month', CURRENT_DATE) - INTERVAL '1 day')
                THEN gi.total_amount ELSE 0 
            END) as previous_month
        FROM gst_invoices gi
        WHERE gi.is_deleted = FALSE
    ),
    payment_behavior AS (
        SELECT AVG(p.payment_date - gi.invoice_date) as avg_payment_days
        FROM gst_invoices gi
        JOIN payments p ON gi.id = p.invoice_id
        WHERE gi.invoice_date BETWEEN p_from_date AND p_to_date
    ),
    top_customers AS (
        SELECT 
            c.name as top_paying_customer
        FROM customers c
        JOIN payments p ON c.id = p.customer_id
        WHERE p.payment_date BETWEEN p_from_date AND p_to_date
        GROUP BY c.id, c.name
        ORDER BY SUM(p.payment_amount) DESC
        LIMIT 1
    ),
    highest_outstanding AS (
        SELECT 
            c.name as highest_outstanding_customer
        FROM customers c
        JOIN gst_invoices gi ON c.id = gi.customer_id
        LEFT JOIN payments p ON gi.id = p.invoice_id
        WHERE gi.is_deleted = FALSE
        GROUP BY c.id, c.name
        HAVING SUM(gi.total_amount) - COALESCE(SUM(p.payment_amount), 0) > 0
        ORDER BY SUM(gi.total_amount) - COALESCE(SUM(p.payment_amount), 0) DESC
        LIMIT 1
    )
    SELECT 
        fd.total_invoiced,
        fd.total_payments,
        fd.outstanding_amount,
        fd.overdue_amount,
        mr.current_month as current_month_revenue,
        mr.previous_month as previous_month_revenue,
        CASE WHEN mr.previous_month > 0 
            THEN ROUND(((mr.current_month - mr.previous_month) * 100.0) / mr.previous_month, 2)
            ELSE 0 
        END as revenue_growth_percentage,
        pb.avg_payment_days,
        tc.top_paying_customer,
        ho.highest_outstanding_customer
    FROM financial_data fd
    CROSS JOIN monthly_revenue mr
    CROSS JOIN payment_behavior pb
    LEFT JOIN top_customers tc ON true
    LEFT JOIN highest_outstanding ho ON true;
END;
$$ LANGUAGE plpgsql;

-- USAGE EXAMPLES:
-- 1. Business overview: SELECT * FROM get_business_overview('2025-08-01', '2025-09-02');
-- 2. Sales performance by month: SELECT * FROM get_sales_performance('2025-01-01', '2025-09-02', 'month');
-- 3. Customer analysis: SELECT * FROM get_customer_analysis() LIMIT 20;
-- 4. Production efficiency: SELECT * FROM get_production_efficiency_report('2025-08-01', '2025-09-02');
-- 5. Financial summary: SELECT * FROM get_financial_summary('2025-08-01', '2025-09-02');