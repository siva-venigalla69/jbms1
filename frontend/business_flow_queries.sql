-- =====================================================
-- BUSINESS FLOW SQL QUERIES
-- Complete set of SELECT queries for textile business workflow
-- =====================================================

-- =====================================================
-- 1. MATERIAL RECEIVED FROM CUSTOMER
-- =====================================================

-- 1.1 Get all material receipts for a date range
SELECT 
    mi.id as receipt_id,
    mi.received_date,
    c.name as customer_name,
    c.phone as customer_phone,
    mi.material_type,
    mi.quantity as quantity_received,
    mi.supplier_name,
    mi.notes,
    mi.created_at
FROM material_in mi
JOIN customers c ON mi.customer_id = c.id
WHERE mi.received_date BETWEEN '2025-05-01' AND '2025-05-31'
ORDER BY mi.received_date DESC, c.name, mi.material_type;

-- 1.2 Material receipt summary by customer
SELECT 
    c.name as customer_name,
    mi.material_type,
    SUM(mi.quantity) as total_received,
    COUNT(mi.id) as number_of_receipts,
    MIN(mi.received_date) as first_receipt,
    MAX(mi.received_date) as last_receipt
FROM material_in mi
JOIN customers c ON mi.customer_id = c.id
WHERE mi.received_date BETWEEN '2025-05-01' AND '2025-05-31'
GROUP BY c.id, c.name, mi.material_type
ORDER BY c.name, total_received DESC;

-- 1.3 Daily material receipt summary
SELECT 
    mi.received_date,
    COUNT(DISTINCT mi.customer_id) as customers_count,
    COUNT(mi.id) as total_receipts,
    SUM(mi.quantity) as total_quantity,
    STRING_AGG(DISTINCT mi.material_type, ', ') as material_types
FROM material_in mi
WHERE mi.received_date BETWEEN '2025-05-01' AND '2025-05-31'
GROUP BY mi.received_date
ORDER BY mi.received_date DESC;

-- 1.4 Current stock levels after receipts
SELECT 
    c.name as customer_name,
    ms.material_type,
    ms.total_received,
    ms.total_delivered,
    ms.current_stock,
    CASE 
        WHEN ms.current_stock < 0 THEN 'OVER-DELIVERED'
        WHEN ms.current_stock = 0 THEN 'EMPTY'
        WHEN ms.current_stock < 10 THEN 'LOW STOCK'
        WHEN ms.current_stock < 50 THEN 'MEDIUM STOCK'
        ELSE 'GOOD STOCK'
    END as stock_status,
    ms.last_updated
FROM material_stock ms
JOIN customers c ON ms.customer_id = c.id
ORDER BY c.name, ms.material_type;

-- =====================================================
-- 2. DESIGN RECEIVED FROM CUSTOMER
-- =====================================================

-- 2.1 Orders with design received status
SELECT 
    o.id as order_id,
    o.order_number,
    o.order_date,
    c.name as customer_name,
    c.phone as customer_phone,
    o.design_status,
    o.production_status,
    COUNT(oi.id) as total_items,
    SUM(oi.quantity) as total_quantity
FROM orders o
JOIN customers c ON o.customer_id = c.id
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.design_status = 'design_received_from_customer'
GROUP BY o.id, o.order_number, o.order_date, c.name, c.phone, o.design_status, o.production_status
ORDER BY o.order_date DESC;

-- 2.2 Order items with design details
SELECT 
    o.order_number,
    c.name as customer_name,
    oi.id as order_item_id,
    oi.material_type,
    oi.quantity,
    oi.design_status,
    oi.production_status,
    ds.submission_date,
    ds.design_brief,
    ds.special_instructions
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN customers c ON o.customer_id = c.id
LEFT JOIN design_submissions ds ON o.id = ds.order_id
WHERE oi.design_status = 'design_received_from_customer'
ORDER BY o.order_date DESC, oi.material_type;

-- 2.3 Design files uploaded by customers
SELECT 
    o.order_number,
    c.name as customer_name,
    df.file_name,
    df.file_type,
    df.upload_date,
    df.file_size,
    ds.design_brief
FROM design_files df
JOIN orders o ON df.order_id = o.id
JOIN customers c ON o.customer_id = c.id
LEFT JOIN design_submissions ds ON o.id = ds.order_id
ORDER BY df.upload_date DESC;

-- 2.4 Design status tracking
SELECT 
    o.order_number,
    c.name as customer_name,
    oi.material_type,
    dst.current_status,
    dst.status_date,
    dst.notes,
    dst.assigned_designer
FROM design_status dst
JOIN order_items oi ON dst.order_item_id = oi.id
JOIN orders o ON oi.order_id = o.id
JOIN customers c ON o.customer_id = c.id
ORDER BY dst.status_date DESC;

-- =====================================================
-- 3. DESIGNS READIED
-- =====================================================

-- 3.1 Orders with designs ready for production
SELECT 
    o.id as order_id,
    o.order_number,
    o.order_date,
    c.name as customer_name,
    o.design_status,
    o.production_status,
    COUNT(oi.id) as items_ready,
    SUM(oi.quantity) as total_quantity
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN order_items oi ON o.id = oi.order_id
WHERE o.design_status = 'design_ready' AND oi.design_status = 'design_ready'
GROUP BY o.id, o.order_number, o.order_date, c.name, o.design_status, o.production_status
ORDER BY o.order_date;

-- 3.2 Items in printing queue
SELECT 
    dpq.id as queue_id,
    o.order_number,
    c.name as customer_name,
    oi.material_type,
    oi.quantity,
    dpq.queue_date,
    dpq.priority,
    dpq.estimated_completion_date,
    dpq.status
FROM design_printing_queue dpq
JOIN order_items oi ON dpq.order_item_id = oi.id
JOIN orders o ON oi.order_id = o.id
JOIN customers c ON o.customer_id = c.id
WHERE dpq.status IN ('queued', 'in_progress')
ORDER BY dpq.priority DESC, dpq.queue_date;

-- 3.3 Production queue status
SELECT 
    pq.id as queue_id,
    o.order_number,
    c.name as customer_name,
    oi.material_type,
    oi.quantity,
    pq.production_stage,
    pq.status,
    pq.queue_date,
    pq.estimated_start_date,
    pq.estimated_completion_date
FROM production_queue pq
JOIN order_items oi ON pq.order_item_id = oi.id
JOIN orders o ON oi.order_id = o.id
JOIN customers c ON o.customer_id = c.id
WHERE pq.status != 'completed'
ORDER BY pq.queue_date;

-- 3.4 Design status history
SELECT 
    o.order_number,
    c.name as customer_name,
    oi.material_type,
    dsh.from_status,
    dsh.to_status,
    dsh.changed_date,
    dsh.changed_by,
    dsh.notes
FROM design_status_history dsh
JOIN order_items oi ON dsh.order_item_id = oi.id
JOIN orders o ON oi.order_id = o.id
JOIN customers c ON o.customer_id = c.id
ORDER BY dsh.changed_date DESC;

-- =====================================================
-- 4. PRINTING COMPLETED
-- =====================================================

-- 4.1 Completed printing jobs
SELECT 
    o.order_number,
    c.name as customer_name,
    oi.material_type,
    oi.quantity,
    pq.production_stage,
    pq.status,
    pq.actual_start_date,
    pq.actual_completion_date,
    pq.notes
FROM production_queue pq
JOIN order_items oi ON pq.order_item_id = oi.id
JOIN orders o ON oi.order_id = o.id
JOIN customers c ON o.customer_id = c.id
WHERE pq.production_stage = 'printing' AND pq.status = 'completed'
ORDER BY pq.actual_completion_date DESC;

-- 4.2 Production stage progress
SELECT 
    o.order_number,
    c.name as customer_name,
    oi.material_type,
    psp.stage_name,
    psp.status,
    psp.start_date,
    psp.completion_date,
    psp.estimated_duration,
    psp.actual_duration
FROM production_stage_progress psp
JOIN order_items oi ON psp.order_item_id = oi.id
JOIN orders o ON oi.order_id = o.id
JOIN customers c ON o.customer_id = c.id
WHERE psp.stage_name = 'printing'
ORDER BY psp.completion_date DESC;

-- 4.3 Items ready for delivery (printing completed)
SELECT 
    o.id as order_id,
    o.order_number,
    c.name as customer_name,
    c.phone as customer_phone,
    oi.id as order_item_id,
    oi.material_type,
    oi.quantity,
    oi.production_status,
    o.production_status as order_production_status
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN customers c ON o.customer_id = c.id
WHERE oi.production_status IN ('completed', 'post_process')
  AND oi.delivery_status != 'delivered'
ORDER BY o.order_date, oi.material_type;

-- 4.4 Daily production completion summary
SELECT 
    pq.actual_completion_date::date as completion_date,
    COUNT(*) as completed_jobs,
    COUNT(DISTINCT pq.order_item_id) as unique_items,
    STRING_AGG(DISTINCT o.order_number, ', ') as orders_completed
FROM production_queue pq
JOIN order_items oi ON pq.order_item_id = oi.id
JOIN orders o ON oi.order_id = o.id
WHERE pq.status = 'completed' AND pq.production_stage = 'printing'
  AND pq.actual_completion_date IS NOT NULL
GROUP BY pq.actual_completion_date::date
ORDER BY completion_date DESC;

-- =====================================================
-- 5. ITEMS DELIVERED TO CUSTOMER
-- =====================================================

-- 5.1 All delivery challans with items
SELECT 
    dc.id as challan_id,
    dc.challan_number,
    dc.challan_date,
    c.name as customer_name,
    c.phone as customer_phone,
    oi.material_type,
    ci.quantity as quantity_delivered,
    o.order_number,
    dc.total_amount,
    dc.status as challan_status
FROM delivery_challans dc
JOIN customers c ON dc.customer_id = c.id
JOIN challan_items ci ON dc.id = ci.challan_id
JOIN order_items oi ON ci.order_item_id = oi.id
JOIN orders o ON oi.order_id = o.id
WHERE dc.challan_date BETWEEN '2025-05-01' AND '2025-05-31'
ORDER BY dc.challan_date DESC, c.name, oi.material_type;

-- 5.2 Stock deduction after deliveries
SELECT 
    dc.challan_date,
    dc.challan_number,
    c.name as customer_name,
    oi.material_type,
    ci.quantity as delivered_quantity,
    ms.total_received,
    ms.total_delivered,
    ms.current_stock,
    ms.last_updated
FROM delivery_challans dc
JOIN customers c ON dc.customer_id = c.id
JOIN challan_items ci ON dc.id = ci.challan_id
JOIN order_items oi ON ci.order_item_id = oi.id
JOIN material_stock ms ON (dc.customer_id = ms.customer_id AND oi.material_type = ms.material_type)
ORDER BY dc.challan_date DESC, c.name, oi.material_type;

-- 5.3 Customer delivery summary
SELECT 
    c.name as customer_name,
    oi.material_type,
    SUM(ci.quantity) as total_delivered,
    COUNT(DISTINCT dc.id) as number_of_challans,
    MIN(dc.challan_date) as first_delivery,
    MAX(dc.challan_date) as last_delivery,
    SUM(dc.total_amount) as total_value
FROM delivery_challans dc
JOIN customers c ON dc.customer_id = c.id
JOIN challan_items ci ON dc.id = ci.challan_id
JOIN order_items oi ON ci.order_item_id = oi.id
WHERE dc.challan_date BETWEEN '2025-05-01' AND '2025-05-31'
GROUP BY c.id, c.name, oi.material_type
ORDER BY c.name, total_delivered DESC;

-- 5.4 Orders completion status after deliveries
SELECT 
    o.id as order_id,
    o.order_number,
    c.name as customer_name,
    o.order_date,
    COUNT(oi.id) as total_items,
    COUNT(CASE WHEN oi.delivery_status = 'delivered' THEN 1 END) as delivered_items,
    COUNT(oi.id) - COUNT(CASE WHEN oi.delivery_status = 'delivered' THEN 1 END) as pending_items,
    CASE 
        WHEN COUNT(oi.id) = COUNT(CASE WHEN oi.delivery_status = 'delivered' THEN 1 END) THEN 'COMPLETED'
        WHEN COUNT(CASE WHEN oi.delivery_status = 'delivered' THEN 1 END) > 0 THEN 'PARTIALLY_DELIVERED'
        ELSE 'PENDING'
    END as order_status
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.order_number, c.name, o.order_date
ORDER BY o.order_date DESC;

-- =====================================================
-- COMPREHENSIVE STOCK TRACKING QUERIES
-- =====================================================

-- 6.1 Current stock snapshot (your main requirement)
SELECT 
    c.name as customer_name,
    c.phone as customer_phone,
    ms.material_type,
    ms.total_received,
    ms.total_delivered,
    ms.current_stock,
    CASE 
        WHEN ms.current_stock < 0 THEN 'OVER-DELIVERED'
        WHEN ms.current_stock = 0 THEN 'EMPTY'
        WHEN ms.current_stock < 10 THEN 'LOW STOCK'
        WHEN ms.current_stock < 50 THEN 'MEDIUM STOCK'
        ELSE 'GOOD STOCK'
    END as stock_status,
    ms.last_updated,
    ROUND((ms.current_stock * 100.0 / NULLIF(ms.total_received, 0)), 2) as remaining_percentage
FROM material_stock ms
JOIN customers c ON ms.customer_id = c.id
WHERE ms.current_stock != 0
ORDER BY c.name, ms.material_type;

-- 6.2 Stock movement history (receipts and deliveries)
WITH stock_movements AS (
    -- Material receipts (positive movements)
    SELECT 
        mi.customer_id,
        c.name as customer_name,
        mi.material_type,
        mi.received_date as movement_date,
        'RECEIVED' as movement_type,
        mi.quantity,
        'Material Receipt #' || mi.id as reference,
        mi.notes
    FROM material_in mi
    JOIN customers c ON mi.customer_id = c.id
    
    UNION ALL
    
    -- Deliveries (negative movements)
    SELECT 
        dc.customer_id,
        c.name as customer_name,
        oi.material_type,
        dc.challan_date as movement_date,
        'DELIVERED' as movement_type,
        -ci.quantity as quantity,
        'Delivery Challan ' || dc.challan_number as reference,
        dc.notes
    FROM delivery_challans dc
    JOIN customers c ON dc.customer_id = c.id
    JOIN challan_items ci ON dc.id = ci.challan_id
    JOIN order_items oi ON ci.order_item_id = oi.id
)
SELECT 
    customer_name,
    material_type,
    movement_date,
    movement_type,
    quantity,
    reference,
    notes,
    SUM(quantity) OVER (
        PARTITION BY customer_id, material_type 
        ORDER BY movement_date, movement_type
    ) as running_stock
FROM stock_movements
WHERE customer_name = 'ABC Textiles Pvt Ltd'  -- Replace with specific customer
ORDER BY customer_id, material_type, movement_date;

-- 6.3 Business scenario validation (your May example)
WITH may_transactions AS (
    SELECT 
        'ABC Textiles Pvt Ltd' as customer_name,
        'May 1st - Received' as transaction,
        'Sarees: 10, Duppatas: 30, Blouses: 40' as details
    UNION ALL
    SELECT 'ABC Textiles Pvt Ltd', 'May 3rd - Received', 'Sarees: 45, Duppatas: 50'
    UNION ALL
    SELECT 'ABC Textiles Pvt Ltd', 'May 5th - Delivered', 'Sarees: 35'
    UNION ALL
    SELECT 'ABC Textiles Pvt Ltd', 'May 7th - Received', 'Blouses: 100, Sarees: 20'
    UNION ALL
    SELECT 'ABC Textiles Pvt Ltd', 'May 9th - Delivered', 'Sarees: 40, Blouses: 20'
)
SELECT * FROM may_transactions;

-- Expected results:
-- Sarees: (10+45+20) - (35+40) = 75-75 = 0
-- Duppatas: (30+50) - 0 = 80
-- Blouses: (40+100) - 20 = 140-20 = 120

-- =====================================================
-- BUSINESS INTELLIGENCE QUERIES
-- =====================================================

-- 7.1 Top customers by material volume
SELECT 
    c.name as customer_name,
    SUM(ms.total_received) as total_materials_received,
    SUM(ms.total_delivered) as total_materials_delivered,
    SUM(ms.current_stock) as current_stock_holding,
    COUNT(DISTINCT ms.material_type) as material_types_count
FROM material_stock ms
JOIN customers c ON ms.customer_id = c.id
GROUP BY c.id, c.name
HAVING SUM(ms.total_received) > 0
ORDER BY total_materials_received DESC;

-- 7.2 Material type analysis
SELECT 
    material_type,
    COUNT(DISTINCT customer_id) as customers_using,
    SUM(total_received) as total_received,
    SUM(total_delivered) as total_delivered,
    SUM(current_stock) as current_stock,
    AVG(current_stock) as avg_stock_per_customer
FROM material_stock
GROUP BY material_type
ORDER BY total_received DESC;

-- 7.3 Daily business activity summary
SELECT 
    activity_date,
    materials_received,
    materials_delivered,
    net_stock_change,
    active_customers,
    challans_created,
    orders_completed
FROM (
    SELECT 
        CURRENT_DATE as activity_date,
        COALESCE(receipts.materials_received, 0) as materials_received,
        COALESCE(deliveries.materials_delivered, 0) as materials_delivered,
        COALESCE(receipts.materials_received, 0) - COALESCE(deliveries.materials_delivered, 0) as net_stock_change,
        COALESCE(receipts.customers + deliveries.customers, 0) as active_customers,
        COALESCE(deliveries.challans_created, 0) as challans_created,
        COALESCE(completions.orders_completed, 0) as orders_completed
    FROM (
        SELECT 
            SUM(quantity) as materials_received,
            COUNT(DISTINCT customer_id) as customers
        FROM material_in 
        WHERE received_date = CURRENT_DATE
    ) receipts
    FULL OUTER JOIN (
        SELECT 
            SUM(ci.quantity) as materials_delivered,
            COUNT(DISTINCT dc.customer_id) as customers,
            COUNT(DISTINCT dc.id) as challans_created
        FROM delivery_challans dc
        JOIN challan_items ci ON dc.id = ci.challan_id
        WHERE dc.challan_date = CURRENT_DATE
    ) deliveries ON true
    FULL OUTER JOIN (
        SELECT COUNT(DISTINCT o.id) as orders_completed
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE oi.delivery_status = 'delivered'
          AND oi.updated_at::date = CURRENT_DATE
    ) completions ON true
) daily_summary;

-- =====================================================
-- TROUBLESHOOTING QUERIES
-- =====================================================

-- 8.1 Stock discrepancies detection
SELECT 
    c.name as customer_name,
    ms.material_type,
    ms.total_received as stock_table_received,
    COALESCE(receipts.calculated_received, 0) as actual_received,
    ms.total_delivered as stock_table_delivered,
    COALESCE(deliveries.calculated_delivered, 0) as actual_delivered,
    ms.current_stock as stock_table_current,
    (COALESCE(receipts.calculated_received, 0) - COALESCE(deliveries.calculated_delivered, 0)) as calculated_current,
    ABS(ms.current_stock - (COALESCE(receipts.calculated_received, 0) - COALESCE(deliveries.calculated_delivered, 0))) as discrepancy
FROM material_stock ms
JOIN customers c ON ms.customer_id = c.id
LEFT JOIN (
    SELECT customer_id, material_type, SUM(quantity) as calculated_received
    FROM material_in
    GROUP BY customer_id, material_type
) receipts ON ms.customer_id = receipts.customer_id AND ms.material_type = receipts.material_type
LEFT JOIN (
    SELECT 
        dc.customer_id, 
        oi.material_type, 
        SUM(ci.quantity) as calculated_delivered
    FROM delivery_challans dc
    JOIN challan_items ci ON dc.id = ci.challan_id
    JOIN order_items oi ON ci.order_item_id = oi.id
    GROUP BY dc.customer_id, oi.material_type
) deliveries ON ms.customer_id = deliveries.customer_id AND ms.material_type = deliveries.material_type
WHERE ABS(ms.current_stock - (COALESCE(receipts.calculated_received, 0) - COALESCE(deliveries.calculated_delivered, 0))) > 0.01
ORDER BY discrepancy DESC;

-- 8.2 Missing stock records detection
SELECT 
    'Missing Receipt Records' as issue_type,
    dc.customer_id,
    c.name as customer_name,
    oi.material_type,
    SUM(ci.quantity) as delivered_without_receipt
FROM delivery_challans dc
JOIN customers c ON dc.customer_id = c.id
JOIN challan_items ci ON dc.id = ci.challan_id
JOIN order_items oi ON ci.order_item_id = oi.id
LEFT JOIN material_stock ms ON dc.customer_id = ms.customer_id AND oi.material_type = ms.material_type
WHERE ms.id IS NULL
GROUP BY dc.customer_id, c.name, oi.material_type
ORDER BY delivered_without_receipt DESC;

-- =====================================================
-- END OF BUSINESS FLOW QUERIES
-- Usage Instructions:
-- 1. Replace date ranges: '2025-05-01' AND '2025-05-31' with your dates
-- 2. Replace customer names: 'ABC Textiles Pvt Ltd' with actual customer
-- 3. Replace material types: 'Sarees' with actual material type
-- 4. Use CURRENT_DATE for today's data
-- 5. Use customer_id UUIDs for better performance where available
-- =====================================================