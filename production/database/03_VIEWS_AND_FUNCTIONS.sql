-- =====================================
-- VIEWS AND FUNCTIONS CREATION
-- API compatibility and business logic
-- Version: 1.0
-- =====================================

-- =====================================
-- SECTION 1: API COMPATIBILITY VIEWS
-- =====================================

-- Delivery Challans API View (maps database fields to API expected fields)
CREATE OR REPLACE VIEW delivery_challans_api_view AS
SELECT 
    id,
    challan_number,
    customer_id,
    challan_date as delivery_date,  -- Map to API expected field name
    total_quantity,
    delivery_status as status,      -- Map to API expected field name
    order_id,
    total_amount,
    notes,
    is_deleted,
    created_by_user_id,
    created_at,
    updated_at
FROM delivery_challans;

-- Material Stock API View (converts foreign keys to names for API)
CREATE OR REPLACE VIEW material_stock_api_view AS
SELECT 
    ms.id,
    ms.customer_id,
    mt.name as material_type,  -- Convert foreign key to string
    ms.total_received,
    ms.total_delivered,
    ms.current_stock,
    ms.reserved_stock,
    ms.minimum_threshold,
    ms.last_updated,
    ms.created_at,
    ms.notes,
    c.name as customer_name,
    c.phone as customer_phone
FROM material_stock ms
LEFT JOIN material_types mt ON ms.material_type = mt.id
LEFT JOIN customers c ON ms.customer_id = c.id;

-- Material In API View (converts foreign keys to names)
CREATE OR REPLACE VIEW material_in_api_view AS
SELECT 
    mi.id,
    mi.customer_id,
    mi.order_id,
    mt.name as material_type,  -- Convert foreign key to string
    mi.quantity,
    mi.unit,
    mi.quality_rating,
    mi.received_date,
    mi.notes,
    mi.created_by_user_id,
    mi.created_at,
    c.name as customer_name,
    o.order_number
FROM material_in mi
LEFT JOIN material_types mt ON mi.material_type = mt.id
LEFT JOIN customers c ON mi.customer_id = c.id
LEFT JOIN orders o ON mi.order_id = o.id;

-- Orders API View (with status names and totals)
CREATE OR REPLACE VIEW orders_api_view AS
SELECT 
    o.id,
    o.order_number,
    o.customer_id,
    o.order_date,
    os.name as status,  -- Convert foreign key to string
    o.total_amount,
    o.notes,
    o.expected_completion_date,
    o.priority_level,
    o.is_deleted,
    o.created_by_user_id,
    o.updated_by_user_id,
    o.created_at,
    o.updated_at,
    c.name as customer_name,
    c.phone as customer_phone,
    (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as total_items
FROM orders o
LEFT JOIN order_statuses os ON o.status = os.id
LEFT JOIN customers c ON o.customer_id = c.id;

-- =====================================
-- SECTION 2: BUSINESS INTELLIGENCE VIEWS
-- =====================================

-- Stock Design Status View (comprehensive material and design status)
CREATE OR REPLACE VIEW stock_design_status AS
SELECT 
    c.id as customer_id,
    c.name as customer_name,
    c.phone as customer_phone,
    
    -- Material Summary
    COALESCE(ms_summary.total_received, 0) as total_material_received,
    COALESCE(ms_summary.total_delivered, 0) as total_material_delivered, 
    COALESCE(ms_summary.current_stock, 0) as current_material_stock,
    COALESCE(ms_summary.reserved_stock, 0) as reserved_material_stock,
    
    -- Design Summary
    COALESCE(design_stats.total_designs_submitted, 0) as total_designs_submitted,
    COALESCE(design_stats.designs_ready, 0) as designs_ready,
    COALESCE(design_stats.designs_pending, 0) as designs_pending,
    COALESCE(design_stats.designs_in_printing, 0) as designs_in_printing,
    
    -- Material-Design Allocation Summary
    COALESCE(allocation_stats.material_with_designs, 0) as material_allocated_with_designs,
    COALESCE(allocation_stats.material_without_designs, 0) as material_without_designs,
    COALESCE(allocation_stats.designs_without_material, 0) as designs_without_sufficient_material,
    COALESCE(allocation_stats.ready_for_printing, 0) as ready_for_printing_count,
    
    -- Business Intelligence
    CASE 
        WHEN COALESCE(ms_summary.current_stock, 0) > 0 AND COALESCE(design_stats.designs_ready, 0) > 0 
        THEN 'CAN_PROCEED_PRINTING'
        WHEN COALESCE(ms_summary.current_stock, 0) > 0 AND COALESCE(design_stats.designs_ready, 0) = 0
        THEN 'MATERIAL_READY_AWAITING_DESIGNS'
        WHEN COALESCE(ms_summary.current_stock, 0) = 0 AND COALESCE(design_stats.designs_ready, 0) > 0
        THEN 'DESIGNS_READY_AWAITING_MATERIAL'  
        ELSE 'PENDING_MATERIAL_AND_DESIGNS'
    END as workflow_status,
    
    NOW() as report_generated_at

FROM customers c

-- Material Stock Summary
LEFT JOIN (
    SELECT 
        customer_id,
        SUM(total_received) as total_received,
        SUM(total_delivered) as total_delivered,
        SUM(current_stock) as current_stock,
        SUM(reserved_stock) as reserved_stock
    FROM material_stock
    GROUP BY customer_id
) ms_summary ON c.id = ms_summary.customer_id

-- Design Statistics
LEFT JOIN (
    SELECT 
        ds.customer_id,
        COUNT(DISTINCT ds.id) as total_designs_submitted,
        COUNT(DISTINCT CASE WHEN latest_status.status = 'ready_for_production' THEN ds.id END) as designs_ready,
        COUNT(DISTINCT CASE WHEN latest_status.status IN ('submitted', 'under_review', 'modifications_needed') THEN ds.id END) as designs_pending,
        COUNT(DISTINCT CASE WHEN latest_status.status = 'in_printing_queue' THEN ds.id END) as designs_in_printing
    FROM design_submissions ds
    LEFT JOIN LATERAL (
        SELECT status 
        FROM design_status 
        WHERE design_submission_id = ds.id 
        ORDER BY created_at DESC 
        LIMIT 1
    ) latest_status ON true
    GROUP BY ds.customer_id
) design_stats ON c.id = design_stats.customer_id

-- Material-Design Allocation Statistics
LEFT JOIN (
    SELECT 
        customer_id,
        COUNT(CASE WHEN design_submission_id IS NOT NULL THEN 1 END) as material_with_designs,
        COUNT(CASE WHEN design_submission_id IS NULL THEN 1 END) as material_without_designs,
        COUNT(CASE WHEN status = 'ready_for_printing' THEN 1 END) as ready_for_printing,
        -- Simplified count for designs without material
        0 as designs_without_material
    FROM material_design_mapping
    GROUP BY customer_id
) allocation_stats ON c.id = allocation_stats.customer_id

WHERE EXISTS (
    SELECT 1 FROM material_in mi WHERE mi.customer_id = c.id
    UNION 
    SELECT 1 FROM design_submissions ds WHERE ds.customer_id = c.id
    UNION
    SELECT 1 FROM material_stock ms WHERE ms.customer_id = c.id
);

-- Customer Activity Summary View
CREATE OR REPLACE VIEW customer_activity_summary AS
SELECT 
    c.id,
    c.name,
    c.phone,
    c.email,
    c.created_at as customer_since,
    
    -- Order Statistics
    COALESCE(order_stats.total_orders, 0) as total_orders,
    COALESCE(order_stats.pending_orders, 0) as pending_orders,
    COALESCE(order_stats.completed_orders, 0) as completed_orders,
    COALESCE(order_stats.total_order_value, 0) as total_order_value,
    order_stats.last_order_date,
    
    -- Material Statistics
    COALESCE(material_stats.total_materials_received, 0) as total_materials_received,
    COALESCE(material_stats.current_stock_value, 0) as current_stock_value,
    material_stats.last_material_received_date,
    
    -- Financial Statistics
    COALESCE(financial_stats.total_invoiced, 0) as total_invoiced,
    COALESCE(financial_stats.total_paid, 0) as total_paid,
    COALESCE(financial_stats.outstanding_amount, 0) as outstanding_amount,
    COALESCE(financial_stats.overdue_amount, 0) as overdue_amount,
    
    -- Design Statistics
    COALESCE(design_stats.designs_submitted, 0) as designs_submitted,
    COALESCE(design_stats.designs_completed, 0) as designs_completed,
    
    -- Activity Score (1-100)
    GREATEST(1, LEAST(100, 
        (COALESCE(order_stats.total_orders, 0) * 10) +
        (COALESCE(material_stats.total_materials_received, 0) * 5) +
        (COALESCE(design_stats.designs_submitted, 0) * 8) +
        CASE WHEN order_stats.last_order_date > CURRENT_DATE - INTERVAL '30 days' THEN 20 ELSE 0 END
    )) as activity_score

FROM customers c

-- Order Statistics
LEFT JOIN (
    SELECT 
        customer_id,
        COUNT(*) as total_orders,
        COUNT(CASE WHEN os.name IN ('pending', 'in_progress') THEN 1 END) as pending_orders,
        COUNT(CASE WHEN os.name = 'completed' THEN 1 END) as completed_orders,
        SUM(total_amount) as total_order_value,
        MAX(order_date) as last_order_date
    FROM orders o
    LEFT JOIN order_statuses os ON o.status = os.id
    WHERE o.is_deleted = FALSE
    GROUP BY customer_id
) order_stats ON c.id = order_stats.customer_id

-- Material Statistics
LEFT JOIN (
    SELECT 
        customer_id,
        COUNT(*) as total_materials_received,
        SUM(quantity) as current_stock_value,
        MAX(received_date) as last_material_received_date
    FROM material_in
    GROUP BY customer_id
) material_stats ON c.id = material_stats.customer_id

-- Financial Statistics
LEFT JOIN (
    SELECT 
        customer_id,
        SUM(grand_total) as total_invoiced,
        SUM(grand_total - outstanding_amount) as total_paid,
        SUM(outstanding_amount) as outstanding_amount,
        SUM(CASE WHEN payment_due_date < CURRENT_DATE THEN outstanding_amount ELSE 0 END) as overdue_amount
    FROM gst_invoices
    WHERE is_deleted = FALSE
    GROUP BY customer_id
) financial_stats ON c.id = financial_stats.customer_id

-- Design Statistics
LEFT JOIN (
    SELECT 
        customer_id,
        COUNT(*) as designs_submitted,
        COUNT(CASE WHEN latest_status.status = 'completed' THEN 1 END) as designs_completed
    FROM design_submissions ds
    LEFT JOIN LATERAL (
        SELECT status FROM design_status 
        WHERE design_submission_id = ds.id 
        ORDER BY created_at DESC LIMIT 1
    ) latest_status ON true
    GROUP BY customer_id
) design_stats ON c.id = design_stats.customer_id

WHERE c.is_deleted = FALSE;

-- Daily Business Summary View
CREATE OR REPLACE VIEW daily_business_summary AS
SELECT 
    CURRENT_DATE as report_date,
    
    -- Today's Activity
    (SELECT COUNT(*) FROM orders WHERE order_date::date = CURRENT_DATE) as orders_today,
    (SELECT COUNT(*) FROM material_in WHERE received_date::date = CURRENT_DATE) as materials_received_today,
    (SELECT COUNT(*) FROM delivery_challans WHERE challan_date::date = CURRENT_DATE) as deliveries_today,
    (SELECT COUNT(*) FROM gst_invoices WHERE invoice_date::date = CURRENT_DATE) as invoices_today,
    (SELECT COALESCE(SUM(payment_amount), 0) FROM payments WHERE payment_date::date = CURRENT_DATE) as payments_received_today,
    
    -- Pending Work
    (SELECT COUNT(*) FROM orders o JOIN order_statuses os ON o.status = os.id WHERE os.name IN ('pending', 'in_progress') AND o.is_deleted = FALSE) as pending_orders,
    (SELECT COUNT(*) FROM design_submissions ds WHERE EXISTS (SELECT 1 FROM design_status dst WHERE dst.design_submission_id = ds.id AND dst.status IN ('submitted', 'under_review', 'modifications_needed') ORDER BY dst.created_at DESC LIMIT 1)) as pending_designs,
    (SELECT COUNT(*) FROM design_printing_queue WHERE printing_status = 'queued') as printing_queue_count,
    
    -- Financial Summary
    (SELECT COALESCE(SUM(outstanding_amount), 0) FROM gst_invoices WHERE outstanding_amount > 0 AND is_deleted = FALSE) as total_outstanding,
    (SELECT COALESCE(SUM(outstanding_amount), 0) FROM gst_invoices WHERE outstanding_amount > 0 AND payment_due_date < CURRENT_DATE AND is_deleted = FALSE) as overdue_amount,
    
    -- Stock Alerts
    (SELECT COUNT(*) FROM material_stock WHERE current_stock <= minimum_threshold) as low_stock_alerts,
    (SELECT COUNT(*) FROM material_stock WHERE current_stock < 0) as negative_stock_alerts,
    
    NOW() as generated_at;

-- =====================================
-- SECTION 3: UTILITY FUNCTIONS
-- =====================================

-- Function to get material type ID from name (for API compatibility)
CREATE OR REPLACE FUNCTION get_material_type_id(type_name TEXT)
RETURNS UUID AS $$
DECLARE
    type_id UUID;
BEGIN
    SELECT id INTO type_id 
    FROM material_types 
    WHERE name = type_name;
    
    IF type_id IS NULL THEN
        -- If material type doesn't exist, create it
        INSERT INTO material_types (name, created_at)
        VALUES (type_name, NOW())
        RETURNING id INTO type_id;
    END IF;
    
    RETURN type_id;
END;
$$ LANGUAGE plpgsql;

-- Function to insert material_in with string type (API compatibility)
CREATE OR REPLACE FUNCTION insert_material_in_with_string_type(
    p_customer_id UUID,
    p_order_id UUID,
    p_material_type_name TEXT,
    p_quantity DECIMAL(10,2),
    p_unit TEXT DEFAULT NULL,
    p_quality_rating INTEGER DEFAULT NULL,
    p_received_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    p_notes TEXT DEFAULT NULL,
    p_created_by_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    material_type_id UUID;
    new_record_id UUID;
BEGIN
    -- Get or create material type
    material_type_id := get_material_type_id(p_material_type_name);
    
    -- Insert the record
    INSERT INTO material_in (
        customer_id, order_id, material_type, quantity, unit, quality_rating,
        received_date, notes, created_by_user_id, created_at
    )
    VALUES (
        p_customer_id, p_order_id, material_type_id, p_quantity, p_unit, p_quality_rating,
        p_received_date, p_notes, p_created_by_user_id, NOW()
    )
    RETURNING id INTO new_record_id;
    
    RETURN new_record_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update design status
CREATE OR REPLACE FUNCTION update_design_status(
    p_design_submission_id UUID,
    p_new_status VARCHAR(50),
    p_notes TEXT DEFAULT NULL,
    p_assigned_user_id UUID DEFAULT NULL,
    p_priority_level INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    status_record_id UUID;
BEGIN
    -- Insert new status record
    INSERT INTO design_status (
        design_submission_id,
        status,
        status_notes,
        assigned_designer_user_id,
        priority_level,
        changed_by_user_id
    )
    VALUES (
        p_design_submission_id,
        p_new_status,
        p_notes,
        p_assigned_user_id,
        p_priority_level,
        p_assigned_user_id
    )
    RETURNING id INTO status_record_id;
    
    -- Update design submission timestamp
    UPDATE design_submissions 
    SET updated_at = NOW()
    WHERE id = p_design_submission_id;
    
    -- If status is ready_for_production, update material mappings
    IF p_new_status = 'ready_for_production' THEN
        UPDATE material_design_mapping
        SET design_ready_date = NOW(),
            status = 'design_ready_material_allocated'
        WHERE design_submission_id = p_design_submission_id
            AND status = 'material_with_design_pending';
    END IF;
    
    RETURN status_record_id;
END;
$$ LANGUAGE plpgsql;

-- Function to allocate material to design
CREATE OR REPLACE FUNCTION allocate_material_to_design(
    p_material_in_id UUID,
    p_design_submission_id UUID,
    p_quantity DECIMAL(10,2),
    p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
    mapping_id UUID;
    material_customer_id UUID;
    design_customer_id UUID;
    material_type_id UUID;
BEGIN
    -- Validate customer match
    SELECT customer_id, material_type INTO material_customer_id, material_type_id 
    FROM material_in WHERE id = p_material_in_id;
    
    SELECT customer_id INTO design_customer_id 
    FROM design_submissions WHERE id = p_design_submission_id;
    
    IF material_customer_id != design_customer_id THEN
        RAISE EXCEPTION 'Material and design must belong to the same customer';
    END IF;
    
    -- Create allocation mapping
    INSERT INTO material_design_mapping (
        material_in_id,
        design_submission_id,
        customer_id,
        material_type_id,
        quantity_allocated,
        status,
        created_by_user_id
    )
    VALUES (
        p_material_in_id,
        p_design_submission_id,
        material_customer_id,
        material_type_id,
        p_quantity,
        'material_with_design_pending',
        p_user_id
    )
    RETURNING id INTO mapping_id;
    
    RETURN mapping_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate customer stock (dynamic calculation)
CREATE OR REPLACE FUNCTION calculate_customer_stock(p_customer_id UUID)
RETURNS TABLE(
    material_type_name TEXT,
    total_received DECIMAL(10,2),
    total_delivered DECIMAL(10,2),
    current_stock DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mt.name,
        COALESCE(received.total_received, 0),
        COALESCE(delivered.total_delivered, 0),
        COALESCE(received.total_received, 0) - COALESCE(delivered.total_delivered, 0)
    FROM (
        -- Calculate received materials
        SELECT 
            mi.material_type,
            SUM(mi.quantity) as total_received
        FROM material_in mi
        WHERE mi.customer_id = p_customer_id
        GROUP BY mi.material_type
    ) received
    FULL OUTER JOIN (
        -- Calculate delivered materials
        SELECT 
            oi.material_type,
            SUM(ci.quantity) as total_delivered
        FROM challan_items ci
        JOIN delivery_challans dc ON ci.challan_id = dc.id
        JOIN order_items oi ON ci.order_item_id = oi.id
        WHERE dc.customer_id = p_customer_id
        GROUP BY oi.material_type
    ) delivered ON received.material_type = delivered.material_type
    LEFT JOIN material_types mt ON COALESCE(received.material_type, delivered.material_type) = mt.id
    WHERE COALESCE(received.material_type, delivered.material_type) IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- =====================================
-- SECTION 4: TRIGGER FUNCTIONS
-- =====================================

-- Function for updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function for audit trail trigger
CREATE OR REPLACE FUNCTION audit_trail_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_trail (table_name, record_id, action, old_values, changed_at)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD), NOW());
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_trail (table_name, record_id, action, old_values, new_values, changed_at)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW), NOW());
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_trail (table_name, record_id, action, new_values, changed_at)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW), NOW());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- =====================================
-- Log this deployment
-- =====================================

INSERT INTO deployment_history (
    deployment_type,
    script_name,
    status,
    description
) VALUES (
    'views_functions',
    '03_VIEWS_AND_FUNCTIONS.sql',
    'completed',
    'API compatibility views and business logic functions created'
);

-- Verification query
SELECT 
    'VIEWS AND FUNCTIONS CREATED' as status,
    (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public') as views_count,
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public') as functions_count;