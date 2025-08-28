-- =====================================
-- COMPREHENSIVE DESIGN MANAGEMENT SYSTEM
-- Advanced workflow for textile printing with design tracking
-- =====================================

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================
-- 1. DESIGN SUBMISSIONS TABLE
-- Track all designs submitted by customers
-- =====================================
CREATE TABLE IF NOT EXISTS design_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    order_id UUID REFERENCES orders(id),
    design_name VARCHAR(255) NOT NULL,
    design_description TEXT,
    design_file_path TEXT, -- Path to design file storage
    design_type VARCHAR(50), -- 'customer_provided', 'custom_request', 'modification'
    submitted_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expected_completion_date DATE,
    design_complexity VARCHAR(20) DEFAULT 'medium', -- 'simple', 'medium', 'complex'
    special_requirements TEXT,
    submission_notes TEXT,
    created_by_user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================
-- 2. DESIGN STATUS TRACKING
-- Track design workflow progression
-- =====================================
CREATE TABLE IF NOT EXISTS design_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    design_submission_id UUID NOT NULL REFERENCES design_submissions(id),
    status VARCHAR(50) NOT NULL, 
    -- Status values: 'submitted', 'under_review', 'modifications_needed', 
    -- 'ready_for_production', 'in_printing_queue', 'completed', 'on_hold', 'cancelled'
    status_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status_notes TEXT,
    estimated_completion_date DATE,
    actual_completion_date DATE,
    assigned_designer_user_id UUID,
    priority_level INTEGER DEFAULT 3, -- 1=urgent, 2=high, 3=normal, 4=low, 5=backlog
    changed_by_user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================
-- 3. MATERIAL-DESIGN MAPPING
-- Link materials with designs for sophisticated tracking
-- =====================================
CREATE TABLE IF NOT EXISTS material_design_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_in_id UUID NOT NULL REFERENCES material_in(id),
    design_submission_id UUID REFERENCES design_submissions(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    material_type_id UUID, -- Reference to material_types table
    quantity_allocated DECIMAL(10,2) NOT NULL,
    allocation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    design_ready_date TIMESTAMP WITH TIME ZONE,
    printing_scheduled_date TIMESTAMP WITH TIME ZONE,
    printing_completed_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'material_with_design_pending',
    -- Status values: 'material_with_design_pending', 'design_ready_material_allocated', 
    -- 'ready_for_printing', 'in_printing', 'completed', 'material_returned'
    allocation_notes TEXT,
    created_by_user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================
-- 4. DESIGN PRINTING QUEUE
-- Manage printing workflow and scheduling
-- =====================================
CREATE TABLE IF NOT EXISTS design_printing_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_design_mapping_id UUID NOT NULL REFERENCES material_design_mapping(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    design_submission_id UUID NOT NULL REFERENCES design_submissions(id),
    queue_position INTEGER,
    scheduled_print_date DATE,
    actual_print_start_date TIMESTAMP WITH TIME ZONE,
    actual_print_completion_date TIMESTAMP WITH TIME ZONE,
    operator_user_id UUID,
    printing_status VARCHAR(50) DEFAULT 'queued',
    -- Status values: 'queued', 'in_progress', 'completed', 'on_hold', 'cancelled', 'rework_needed'
    print_quality_rating INTEGER, -- 1-5 rating
    rework_reason TEXT,
    completion_notes TEXT,
    machine_used VARCHAR(100),
    print_duration_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================
-- 5. STOCK DESIGN STATUS VIEW
-- Comprehensive view of material and design status
-- =====================================
CREATE OR REPLACE VIEW stock_design_status AS
SELECT 
    c.id as customer_id,
    c.name as customer_name,
    
    -- Material Summary
    COALESCE(ms.total_received, 0) as total_material_received,
    COALESCE(ms.total_delivered, 0) as total_material_delivered, 
    COALESCE(ms.current_stock, 0) as current_material_stock,
    
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
        WHEN COALESCE(ms.current_stock, 0) > 0 AND COALESCE(design_stats.designs_ready, 0) > 0 
        THEN 'CAN_PROCEED_PRINTING'
        WHEN COALESCE(ms.current_stock, 0) > 0 AND COALESCE(design_stats.designs_ready, 0) = 0
        THEN 'MATERIAL_READY_AWAITING_DESIGNS'
        WHEN COALESCE(ms.current_stock, 0) = 0 AND COALESCE(design_stats.designs_ready, 0) > 0
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
        SUM(current_stock) as current_stock
    FROM material_stock
    GROUP BY customer_id
) ms ON c.id = ms.customer_id

-- Design Statistics
LEFT JOIN (
    SELECT 
        ds.customer_id,
        COUNT(DISTINCT ds.id) as total_designs_submitted,
        COUNT(DISTINCT CASE WHEN dst.status = 'ready_for_production' THEN ds.id END) as designs_ready,
        COUNT(DISTINCT CASE WHEN dst.status IN ('submitted', 'under_review', 'modifications_needed') THEN ds.id END) as designs_pending,
        COUNT(DISTINCT CASE WHEN dst.status = 'in_printing_queue' THEN ds.id END) as designs_in_printing
    FROM design_submissions ds
    LEFT JOIN LATERAL (
        SELECT status 
        FROM design_status 
        WHERE design_submission_id = ds.id 
        ORDER BY created_at DESC 
        LIMIT 1
    ) dst ON true
    GROUP BY ds.customer_id
) design_stats ON c.id = design_stats.customer_id

-- Material-Design Allocation Statistics
LEFT JOIN (
    SELECT 
        customer_id,
        COUNT(CASE WHEN design_submission_id IS NOT NULL THEN 1 END) as material_with_designs,
        COUNT(CASE WHEN design_submission_id IS NULL THEN 1 END) as material_without_designs,
        COUNT(CASE WHEN status = 'ready_for_printing' THEN 1 END) as ready_for_printing,
        -- This is a simplified count - in reality we'd need more complex logic for designs without material
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

-- =====================================
-- 6. DESIGN WORKFLOW MANAGEMENT FUNCTIONS
-- =====================================

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
BEGIN
    -- Validate customer match
    SELECT customer_id INTO material_customer_id FROM material_in WHERE id = p_material_in_id;
    SELECT customer_id INTO design_customer_id FROM design_submissions WHERE id = p_design_submission_id;
    
    IF material_customer_id != design_customer_id THEN
        RAISE EXCEPTION 'Material and design must belong to the same customer';
    END IF;
    
    -- Create allocation mapping
    INSERT INTO material_design_mapping (
        material_in_id,
        design_submission_id,
        customer_id,
        quantity_allocated,
        status,
        created_by_user_id
    )
    VALUES (
        p_material_in_id,
        p_design_submission_id,
        material_customer_id,
        p_quantity,
        'material_with_design_pending',
        p_user_id
    )
    RETURNING id INTO mapping_id;
    
    RETURN mapping_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================
-- 7. INDEXES FOR PERFORMANCE
-- =====================================
CREATE INDEX IF NOT EXISTS idx_design_submissions_customer ON design_submissions(customer_id);
CREATE INDEX IF NOT EXISTS idx_design_submissions_order ON design_submissions(order_id);
CREATE INDEX IF NOT EXISTS idx_design_status_submission ON design_status(design_submission_id);
CREATE INDEX IF NOT EXISTS idx_design_status_status ON design_status(status);
CREATE INDEX IF NOT EXISTS idx_material_design_mapping_customer ON material_design_mapping(customer_id);
CREATE INDEX IF NOT EXISTS idx_material_design_mapping_material ON material_design_mapping(material_in_id);
CREATE INDEX IF NOT EXISTS idx_material_design_mapping_design ON material_design_mapping(design_submission_id);
CREATE INDEX IF NOT EXISTS idx_printing_queue_customer ON design_printing_queue(customer_id);
CREATE INDEX IF NOT EXISTS idx_printing_queue_status ON design_printing_queue(printing_status);

-- =====================================
-- 8. SAMPLE DATA FOR TESTING
-- =====================================

-- Insert sample design statuses (if not exists)
INSERT INTO design_status (design_submission_id, status, status_notes, changed_by_user_id)
SELECT 
    uuid_generate_v4(),
    'submitted',
    'Initial design submission',
    NULL
WHERE NOT EXISTS (SELECT 1 FROM design_status LIMIT 1);

-- =====================================
-- 9. VERIFICATION QUERIES
-- =====================================

-- Check if tables were created
SELECT 'DESIGN MANAGEMENT TABLES CREATED:' as status;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('design_submissions', 'design_status', 'material_design_mapping', 'design_printing_queue')
ORDER BY table_name;

-- Check view creation
SELECT 'STOCK-DESIGN STATUS VIEW:' as info;
SELECT COUNT(*) as customer_count FROM stock_design_status;