-- =========================================
-- BUSINESS INTELLIGENCE ADHOC QUERIES
-- On-demand analysis and insights
-- =========================================

-- 1. CUSTOMER PROFITABILITY ANALYSIS
-- Find most profitable customers by revenue, profit margins, and payment behavior
WITH customer_profitability AS (
    SELECT 
        c.id,
        c.name as customer_name,
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(gi.total_amount), 0) as total_revenue,
        COALESCE(SUM(p.payment_amount), 0) as total_payments,
        COALESCE(SUM(gi.total_amount - p.payment_amount), 0) as outstanding_amount,
        AVG(p.payment_date - gi.invoice_date) as avg_payment_days,
        COALESCE(SUM(gi.total_amount), 0) / NULLIF(COUNT(DISTINCT o.id), 0) as avg_order_value,
        MAX(o.order_date) as last_order_date,
        (CURRENT_DATE - MAX(o.order_date))::INTEGER as days_since_last_order
    FROM customers c
    LEFT JOIN orders o ON c.id = o.customer_id AND o.is_deleted = FALSE
    LEFT JOIN gst_invoices gi ON c.id = gi.customer_id AND gi.is_deleted = FALSE
    LEFT JOIN payments p ON gi.id = p.invoice_id
    WHERE c.is_deleted = FALSE
    GROUP BY c.id, c.name
    HAVING COUNT(DISTINCT o.id) > 0
)
SELECT 
    customer_name,
    total_orders,
    total_revenue,
    total_payments,
    outstanding_amount,
    avg_payment_days,
    avg_order_value,
    last_order_date,
    days_since_last_order,
    CASE 
        WHEN avg_payment_days <= 15 AND total_revenue > 10000 THEN 'PREMIUM'
        WHEN avg_payment_days <= 30 AND total_revenue > 5000 THEN 'GOLD'
        WHEN avg_payment_days <= 45 AND total_revenue > 1000 THEN 'SILVER'
        ELSE 'BRONZE'
    END as customer_tier,
    ROUND((total_payments / NULLIF(total_revenue, 0)) * 100, 2) as payment_reliability_percentage
FROM customer_profitability
ORDER BY total_revenue DESC, avg_payment_days ASC;

-- 2. SEASONAL DEMAND ANALYSIS
-- Identify patterns in order volumes and material types by season/month
WITH monthly_demand AS (
    SELECT 
        EXTRACT(month FROM o.order_date) as order_month,
        EXTRACT(quarter FROM o.order_date) as order_quarter,
        to_char(o.order_date, 'Month') as month_name,
        CASE 
            WHEN EXTRACT(month FROM o.order_date) IN (12, 1, 2) THEN 'Winter'
            WHEN EXTRACT(month FROM o.order_date) IN (3, 4, 5) THEN 'Spring'
            WHEN EXTRACT(month FROM o.order_date) IN (6, 7, 8) THEN 'Summer'
            ELSE 'Fall'
        END as season,
        mt.name as material_type,
        COUNT(DISTINCT o.id) as order_count,
        SUM(oi.quantity) as total_quantity,
        AVG(oi.unit_price) as avg_unit_price,
        SUM(oi.quantity * oi.unit_price) as total_value
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN material_types mt ON oi.material_type = mt.id
    WHERE o.order_date >= CURRENT_DATE - INTERVAL '2 years'
    AND o.is_deleted = FALSE
    GROUP BY order_month, order_quarter, month_name, season, mt.name
)
SELECT 
    season,
    month_name,
    material_type,
    order_count,
    total_quantity,
    ROUND(avg_unit_price, 2) as avg_unit_price,
    total_value,
    ROUND(
        total_quantity::DECIMAL / SUM(total_quantity) OVER (PARTITION BY season) * 100, 2
    ) as percentage_of_season,
    RANK() OVER (PARTITION BY season ORDER BY total_quantity DESC) as popularity_rank
FROM monthly_demand
ORDER BY season, popularity_rank;

-- 3. PRODUCTION BOTTLENECK ANALYSIS
-- Identify where production gets stuck and for how long
WITH production_bottlenecks AS (
    SELECT 
        oi.design_status,
        oi.production_status,
        mt.name as material_type,
        c.name as customer_name,
        COUNT(*) as item_count,
        AVG(CURRENT_DATE - o.order_date)::INTEGER as avg_days_in_status,
        MIN(CURRENT_DATE - o.order_date)::INTEGER as min_days_in_status,
        MAX(CURRENT_DATE - o.order_date)::INTEGER as max_days_in_status,
        SUM(oi.quantity * oi.unit_price) as total_value_stuck
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN customers c ON o.customer_id = c.id
    JOIN material_types mt ON oi.material_type = mt.id
    WHERE o.is_deleted = FALSE
    AND oi.production_status != 'post_process'  -- Not completed
    GROUP BY oi.design_status, oi.production_status, mt.name, c.name
    HAVING AVG(CURRENT_DATE - o.order_date) > 7  -- Stuck for more than a week
)
SELECT 
    design_status,
    production_status,
    material_type,
    customer_name,
    item_count,
    avg_days_in_status,
    min_days_in_status,
    max_days_in_status,
    total_value_stuck,
    CASE 
        WHEN avg_days_in_status > 30 THEN 'CRITICAL'
        WHEN avg_days_in_status > 14 THEN 'HIGH'
        WHEN avg_days_in_status > 7 THEN 'MEDIUM'
        ELSE 'LOW'
    END as bottleneck_severity,
    CONCAT(design_status, ' → ', production_status) as workflow_stage
FROM production_bottlenecks
ORDER BY avg_days_in_status DESC, total_value_stuck DESC;

-- 4. MATERIAL WASTE ANALYSIS
-- Calculate material utilization and potential waste
WITH material_utilization AS (
    SELECT 
        c.name as customer_name,
        ms.material_type,
        ms.total_received,
        ms.total_delivered,
        ms.current_stock,
        ROUND((ms.total_delivered / NULLIF(ms.total_received, 0)) * 100, 2) as utilization_percentage,
        ms.total_received - ms.total_delivered as material_in_pipeline,
        -- Calculate pending requirements
        COALESCE(pending_orders.pending_quantity, 0) as pending_orders_quantity,
        ms.current_stock - COALESCE(pending_orders.pending_quantity, 0) as excess_stock,
        -- Calculate days since last movement
        GREATEST(
            COALESCE(last_received.days_ago, 999),
            COALESCE(last_delivered.days_ago, 999)
        ) as days_since_last_movement
    FROM material_stock ms
    JOIN customers c ON ms.customer_id = c.id
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
    ) pending_orders ON ms.customer_id = pending_orders.customer_id 
                    AND ms.material_type = pending_orders.material_type
    LEFT JOIN (
        SELECT 
            mi.customer_id,
            mt.name as material_type,
            (CURRENT_DATE - MAX(mi.received_date))::INTEGER as days_ago
        FROM material_in mi
        JOIN material_types mt ON mi.material_type = mt.id
        GROUP BY mi.customer_id, mt.name
    ) last_received ON ms.customer_id = last_received.customer_id 
                   AND ms.material_type = last_received.material_type
    LEFT JOIN (
        SELECT 
            mo.customer_id,
            mt.name as material_type,
            (CURRENT_DATE - MAX(mo.delivery_date))::INTEGER as days_ago
        FROM material_out mo
        JOIN material_types mt ON mo.material_type = mt.id
        GROUP BY mo.customer_id, mt.name
    ) last_delivered ON ms.customer_id = last_delivered.customer_id 
                    AND ms.material_type = last_delivered.material_type
    WHERE c.is_deleted = FALSE
)
SELECT 
    customer_name,
    material_type,
    total_received,
    total_delivered,
    current_stock,
    utilization_percentage,
    material_in_pipeline,
    pending_orders_quantity,
    excess_stock,
    days_since_last_movement,
    CASE 
        WHEN utilization_percentage < 50 AND current_stock > 20 THEN 'HIGH_WASTE_RISK'
        WHEN utilization_percentage < 70 AND excess_stock > 10 THEN 'MEDIUM_WASTE_RISK'
        WHEN days_since_last_movement > 90 AND current_stock > 5 THEN 'STAGNANT_STOCK'
        WHEN excess_stock > pending_orders_quantity * 2 THEN 'OVER_STOCKED'
        ELSE 'HEALTHY'
    END as waste_risk_category,
    CASE 
        WHEN excess_stock > 0 AND days_since_last_movement > 60 
        THEN excess_stock * 0.1  -- Assume 10% depreciation for old stock
        ELSE 0 
    END as estimated_waste_value
FROM material_utilization
WHERE total_received > 0
ORDER BY 
    CASE waste_risk_category
        WHEN 'HIGH_WASTE_RISK' THEN 1
        WHEN 'OVER_STOCKED' THEN 2
        WHEN 'MEDIUM_WASTE_RISK' THEN 3
        WHEN 'STAGNANT_STOCK' THEN 4
        ELSE 5
    END,
    estimated_waste_value DESC;

-- 5. CASH FLOW PREDICTION
-- Predict cash inflows and outflows based on current orders and payment patterns
WITH cash_flow_prediction AS (
    SELECT 
        future_dates.prediction_date,
        -- Predicted invoicing (from pending deliveries)
        COALESCE(SUM(
            CASE WHEN dc.delivery_date <= future_dates.prediction_date
            THEN ci.line_total * 1.18  -- Add 18% GST
            ELSE 0 END
        ), 0) as predicted_invoicing,
        -- Predicted payments (based on payment patterns)
        COALESCE(SUM(
            CASE WHEN (gi.due_date <= future_dates.prediction_date AND gi.payment_status != 'paid')
            THEN gi.total_amount - COALESCE(existing_payments.paid_amount, 0)
            ELSE 0 END
        ), 0) as predicted_payments,
        -- Count of items ready for delivery
        COUNT(CASE WHEN oi.production_status = 'post_process' 
              AND dc.delivery_status != 'delivered' 
              THEN 1 END) as items_ready_for_delivery
    FROM (
        SELECT CURRENT_DATE + generate_series(1, 30) as prediction_date
    ) future_dates
    CROSS JOIN delivery_challans dc
    LEFT JOIN challan_items ci ON dc.id = ci.challan_id
    LEFT JOIN order_items oi ON ci.order_item_id = oi.id
    LEFT JOIN gst_invoices gi ON gi.customer_id = dc.customer_id
    LEFT JOIN (
        SELECT 
            invoice_id, 
            SUM(payment_amount) as paid_amount
        FROM payments 
        GROUP BY invoice_id
    ) existing_payments ON gi.id = existing_payments.invoice_id
    WHERE dc.is_deleted = FALSE
    GROUP BY future_dates.prediction_date
    ORDER BY future_dates.prediction_date
)
SELECT 
    prediction_date,
    predicted_invoicing,
    predicted_payments,
    predicted_payments - predicted_invoicing as net_cash_flow,
    SUM(predicted_payments - predicted_invoicing) OVER (
        ORDER BY prediction_date 
        ROWS UNBOUNDED PRECEDING
    ) as cumulative_cash_flow,
    items_ready_for_delivery,
    CASE 
        WHEN predicted_payments - predicted_invoicing > 1000 THEN 'POSITIVE'
        WHEN predicted_payments - predicted_invoicing < -1000 THEN 'NEGATIVE'
        ELSE 'NEUTRAL'
    END as cash_flow_indicator
FROM cash_flow_prediction
WHERE prediction_date <= CURRENT_DATE + INTERVAL '30 days'
ORDER BY prediction_date;

-- 6. DESIGN APPROVAL EFFICIENCY
-- Analyze design approval times and identify delays
WITH design_efficiency AS (
    SELECT 
        c.name as customer_name,
        mt.name as material_type,
        COUNT(*) as total_items,
        COUNT(CASE WHEN oi.design_status = 'design_ready' THEN 1 END) as approved_items,
        COUNT(CASE WHEN oi.design_status = 'design_received_from_customer' THEN 1 END) as pending_approval,
        COUNT(CASE WHEN oi.design_status = 'pending_from_customer' THEN 1 END) as awaiting_design,
        ROUND(AVG(
            CASE WHEN oi.design_status = 'design_ready'
            THEN EXTRACT(days FROM oi.updated_at - o.order_date)
            ELSE NULL END
        ), 1) as avg_approval_days,
        MIN(o.order_date) as oldest_pending_order,
        MAX(CASE WHEN oi.design_status != 'design_ready' THEN o.order_date END) as latest_pending_order
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN customers c ON o.customer_id = c.id
    JOIN material_types mt ON oi.material_type = mt.id
    WHERE o.order_date >= CURRENT_DATE - INTERVAL '90 days'
    AND o.is_deleted = FALSE
    GROUP BY c.name, mt.name
    HAVING COUNT(*) >= 3  -- Need at least 3 items for meaningful analysis
)
SELECT 
    customer_name,
    material_type,
    total_items,
    approved_items,
    pending_approval,
    awaiting_design,
    avg_approval_days,
    ROUND((approved_items::DECIMAL / total_items) * 100, 1) as approval_rate_percentage,
    oldest_pending_order,
    latest_pending_order,
    CASE 
        WHEN avg_approval_days <= 3 THEN 'EXCELLENT'
        WHEN avg_approval_days <= 7 THEN 'GOOD'
        WHEN avg_approval_days <= 14 THEN 'AVERAGE'
        ELSE 'POOR'
    END as approval_efficiency,
    CASE 
        WHEN awaiting_design > approved_items THEN 'DESIGN_BOTTLENECK'
        WHEN pending_approval > approved_items THEN 'APPROVAL_BOTTLENECK'
        ELSE 'HEALTHY_PIPELINE'
    END as pipeline_status
FROM design_efficiency
ORDER BY 
    CASE approval_efficiency
        WHEN 'POOR' THEN 1
        WHEN 'AVERAGE' THEN 2
        WHEN 'GOOD' THEN 3
        ELSE 4
    END,
    avg_approval_days DESC;

-- USAGE NOTES:
-- These are adhoc queries that can be run directly or converted to functions
-- Copy and paste any query into your SQL editor to run analysis
-- Modify date ranges and parameters as needed for your specific analysis needs