-- =====================================
-- DESIGN MANAGEMENT AND PRODUCTION SCHEDULING ENHANCEMENT
-- Migration 08: Design Tracking, Material-Design Correlation, Production Scheduling
-- Compatible with existing schema - Safe to run on any environment
-- =====================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================
-- DESIGN MANAGEMENT SYSTEM
-- ====================

-- ====================
-- ENHANCE EXISTING DESIGN TABLES
-- Working with existing design_submissions table
-- ====================

-- Add enhanced fields to existing design_submissions table
ALTER TABLE design_submissions 
ADD COLUMN IF NOT EXISTS design_code VARCHAR(100),
ADD COLUMN IF NOT EXISTS design_thumbnail_path TEXT,
ADD COLUMN IF NOT EXISTS material_type_id VARCHAR REFERENCES material_types(id),
ADD COLUMN IF NOT EXISTS estimated_material_usage DECIMAL(10,2) DEFAULT 0 CHECK (estimated_material_usage >= 0),
ADD COLUMN IF NOT EXISTS actual_material_usage DECIMAL(10,2) DEFAULT 0 CHECK (actual_material_usage >= 0),
ADD COLUMN IF NOT EXISTS priority_level INTEGER DEFAULT 3 CHECK (priority_level BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS estimated_prep_hours DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_prep_hours DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS target_ready_date DATE,
ADD COLUMN IF NOT EXISTS actual_ready_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completion_deadline DATE,
ADD COLUMN IF NOT EXISTS assigned_designer UUID REFERENCES user_profiles(id),
ADD COLUMN IF NOT EXISTS design_notes TEXT,
ADD COLUMN IF NOT EXISTS internal_notes TEXT,
ADD COLUMN IF NOT EXISTS client_requirements TEXT,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES user_profiles(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES user_profiles(id);

-- Design Files Table - Multiple files per design
CREATE TABLE IF NOT EXISTS design_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    design_id UUID NOT NULL REFERENCES design_submissions(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(50), -- jpg, png, pdf, ai, psd, etc.
    file_size_bytes BIGINT,
    is_primary BOOLEAN DEFAULT FALSE, -- Main design file
    is_approved BOOLEAN DEFAULT FALSE,
    uploaded_by UUID REFERENCES user_profiles(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================
-- MATERIAL-DESIGN CORRELATION
-- ====================

-- Design Material Requirements - What materials each design needs
CREATE TABLE IF NOT EXISTS design_material_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    design_id UUID NOT NULL REFERENCES design_submissions(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id),
    material_type VARCHAR REFERENCES material_types(id),
    
    -- Quantity Planning
    required_quantity DECIMAL(10,2) NOT NULL CHECK (required_quantity > 0),
    allocated_quantity DECIMAL(10,2) DEFAULT 0 CHECK (allocated_quantity >= 0),
    consumed_quantity DECIMAL(10,2) DEFAULT 0 CHECK (consumed_quantity >= 0),
    wastage_quantity DECIMAL(10,2) DEFAULT 0 CHECK (wastage_quantity >= 0),
    
    -- Status Tracking
    status VARCHAR(50) DEFAULT 'planned' CHECK (status IN (
        'planned',      -- Requirements identified
        'allocated',    -- Material reserved
        'in_use',       -- Currently being used
        'consumed',     -- Fully used
        'returned'      -- Material returned to stock
    )),
    
    -- Allocation Details
    allocation_date TIMESTAMP WITH TIME ZONE,
    consumption_start_date TIMESTAMP WITH TIME ZONE,
    consumption_end_date TIMESTAMP WITH TIME ZONE,
    
    -- Notes and Tracking
    notes TEXT,
    allocated_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    
    -- Customer material validation will be handled by triggers instead of CHECK constraint
);

-- ====================
-- PRODUCTION SCHEDULING SYSTEM
-- ====================

-- Production Schedule - Daily/Weekly production planning
CREATE TABLE IF NOT EXISTS production_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Scheduling Details
    schedule_date DATE NOT NULL,
    time_slot VARCHAR(20), -- morning, afternoon, evening, night
    estimated_start_time TIME,
    estimated_end_time TIME,
    
    -- Work Assignment
    design_id UUID NOT NULL REFERENCES design_submissions(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    order_id UUID REFERENCES orders(id), -- Optional: link to specific order
    production_stage UUID REFERENCES production_stages(id),
    
    -- Resource Allocation
    allocated_material_qty DECIMAL(10,2),
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    
    -- Priority and Management
    priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
    urgency_level VARCHAR(20) DEFAULT 'normal' CHECK (urgency_level IN ('low', 'normal', 'high', 'urgent')),
    
    -- Status Tracking
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN (
        'scheduled',    -- Planned for the date
        'confirmed',    -- Confirmed and ready
        'in_progress',  -- Currently being worked on
        'paused',       -- Temporarily stopped
        'completed',    -- Finished successfully
        'postponed',    -- Moved to another date
        'cancelled'     -- Cancelled
    )),
    
    -- Resource Assignment
    machine_assignment VARCHAR(100),
    operator_assignment UUID REFERENCES user_profiles(id),
    quality_checker UUID REFERENCES user_profiles(id),
    
    -- Timing
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    
    -- Notes and Issues
    notes TEXT,
    issues_encountered TEXT,
    quality_notes TEXT,
    
    -- Tracking
    created_by UUID REFERENCES user_profiles(id),
    updated_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Production Dependencies - Define what must complete before other work can start
CREATE TABLE IF NOT EXISTS production_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID NOT NULL REFERENCES production_schedule(id) ON DELETE CASCADE,
    depends_on_schedule_id UUID NOT NULL REFERENCES production_schedule(id),
    
    dependency_type VARCHAR(50) NOT NULL CHECK (dependency_type IN (
        'design_ready',         -- Design must be ready
        'material_available',   -- Material must be in stock
        'stage_completion',     -- Previous stage must complete
        'machine_availability', -- Machine must be free
        'operator_available',   -- Operator must be free
        'quality_approval'      -- Quality check must pass
    )),
    
    is_blocking BOOLEAN DEFAULT TRUE, -- Can work proceed without this dependency?
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================
-- ENHANCED PRODUCTION TRACKING
-- ====================

-- Design Status History - Track design workflow progression
CREATE TABLE IF NOT EXISTS design_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    design_id UUID NOT NULL REFERENCES design_submissions(id) ON DELETE CASCADE,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    status_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_in_status INTERVAL, -- How long it stayed in previous status
    changed_by UUID REFERENCES user_profiles(id),
    change_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Production Stage Progress - Detailed tracking per order item
CREATE TABLE IF NOT EXISTS production_stage_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    design_id UUID REFERENCES design_submissions(id),
    production_stage UUID NOT NULL REFERENCES production_stages(id),
    
    -- Progress Tracking
    status VARCHAR(50) DEFAULT 'not_started' CHECK (status IN (
        'not_started',
        'waiting_design',   -- Cannot start - design not ready
        'waiting_material', -- Cannot start - material not available
        'ready_to_start',   -- All dependencies met
        'in_progress',      -- Currently being worked on
        'completed',        -- Stage finished
        'on_hold',          -- Temporarily paused
        'cancelled'         -- Stage cancelled
    )),
    
    -- Timing
    stage_start_date TIMESTAMP WITH TIME ZONE,
    stage_end_date TIMESTAMP WITH TIME ZONE,
    estimated_duration_hours DECIMAL(5,2),
    actual_duration_hours DECIMAL(5,2),
    
    -- Assignment
    assigned_operator UUID REFERENCES user_profiles(id),
    machine_used VARCHAR(100),
    
    -- Quality and Notes
    quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
    quality_notes TEXT,
    stage_notes TEXT,
    issues_encountered TEXT,
    
    -- Material Consumption
    material_consumed DECIMAL(10,2) DEFAULT 0,
    wastage_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Tracking
    updated_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================
-- BUSINESS ANALYTICS VIEWS
-- ====================

-- Customer Stock vs Design Status Matrix
CREATE OR REPLACE VIEW customer_design_matrix AS
SELECT 
    c.id as customer_id,
    c.name as customer_name,
    mt.name as material_type_name,
    
    -- Stock Information
    COALESCE(ms.current_stock, 0) as current_stock,
    COALESCE(ms.total_received, 0) as total_received,
    COALESCE(ms.total_delivered, 0) as total_delivered,
    
    -- Design Counts
    COUNT(CASE WHEN d.status = 'received' THEN 1 END) as designs_received,
    COUNT(CASE WHEN d.status IN ('reviewing', 'preparing') THEN 1 END) as designs_preparing,
    COUNT(CASE WHEN d.status = 'ready' THEN 1 END) as designs_ready,
    COUNT(CASE WHEN d.status = 'in_production' THEN 1 END) as designs_in_production,
    COUNT(CASE WHEN d.status = 'completed' THEN 1 END) as designs_completed,
    
    -- Business Logic
    CASE 
        WHEN COALESCE(ms.current_stock, 0) > 0 
         AND COUNT(CASE WHEN d.status = 'ready' THEN 1 END) > 0 
        THEN TRUE 
        ELSE FALSE 
    END as ready_for_production,
    
    -- Alerts
    CASE 
        WHEN COALESCE(ms.current_stock, 0) = 0 THEN 'no_material'
        WHEN COUNT(CASE WHEN d.status = 'ready' THEN 1 END) = 0 THEN 'no_ready_designs'
        WHEN COUNT(CASE WHEN d.status IN ('received', 'reviewing', 'preparing') THEN 1 END) > 5 THEN 'design_backlog'
        ELSE 'ok'
    END as alert_status

FROM customers c
CROSS JOIN material_types mt
LEFT JOIN material_stock ms ON c.id = ms.customer_id AND mt.id = ms.material_type
LEFT JOIN designs d ON c.id = d.customer_id AND mt.id = d.material_type AND d.is_deleted = FALSE
WHERE c.is_deleted = FALSE
GROUP BY c.id, c.name, mt.id, mt.name, ms.current_stock, ms.total_received, ms.total_delivered;

-- Production Schedule View with Dependencies
CREATE OR REPLACE VIEW production_schedule_view AS
SELECT 
    ps.id,
    ps.schedule_date,
    ps.time_slot,
    ps.status,
    ps.priority,
    
    -- Design Information
    d.design_name,
    d.design_code,
    d.status as design_status,
    
    -- Customer Information
    c.name as customer_name,
    c.phone as customer_phone,
    
    -- Material Information
    mt.name as material_type_name,
    ps.allocated_material_qty,
    COALESCE(ms.current_stock, 0) as available_stock,
    
    -- Production Stage
    pstg.name as production_stage_name,
    pstg.sequence_order as stage_sequence,
    
    -- Assignments
    u_op.full_name as operator_name,
    ps.machine_assignment,
    
    -- Timing
    ps.estimated_hours,
    ps.actual_hours,
    ps.estimated_start_time,
    ps.estimated_end_time,
    
    -- Dependencies Check
    CASE 
        WHEN d.status != 'ready' THEN 'waiting_design'
        WHEN COALESCE(ms.current_stock, 0) < ps.allocated_material_qty THEN 'insufficient_material'
        WHEN EXISTS (
            SELECT 1 FROM production_dependencies pd 
            JOIN production_schedule ps2 ON pd.depends_on_schedule_id = ps2.id 
            WHERE pd.schedule_id = ps.id AND ps2.status != 'completed' AND pd.is_blocking = TRUE
        ) THEN 'waiting_dependency'
        ELSE 'ready_to_proceed'
    END as readiness_status,
    
    ps.notes,
    ps.created_at,
    ps.updated_at

FROM production_schedule ps
JOIN designs d ON ps.design_id = d.id
JOIN customers c ON ps.customer_id = c.id
LEFT JOIN material_types mt ON d.material_type = mt.id
LEFT JOIN material_stock ms ON c.id = ms.customer_id AND mt.id = ms.material_type
LEFT JOIN production_stages pstg ON ps.production_stage = pstg.id
LEFT JOIN users u_op ON ps.operator_assignment = u_op.id
WHERE d.is_deleted = FALSE;

-- ====================
-- PERFORMANCE INDEXES
-- ====================

-- Design Management Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_design_submissions_customer ON design_submissions(customer_id) WHERE is_deleted = FALSE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_design_submissions_material_type ON design_submissions(material_type_id) WHERE is_deleted = FALSE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_design_submissions_priority ON design_submissions(priority_level) WHERE is_deleted = FALSE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_design_submissions_ready_date ON design_submissions(actual_ready_date) WHERE actual_ready_date IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_design_submissions_assigned_designer ON design_submissions(assigned_designer) WHERE is_deleted = FALSE;

-- Design Files Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_design_files_design_id ON design_files(design_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_design_files_primary ON design_files(design_id) WHERE is_primary = TRUE;

-- Material Requirements Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_design_material_req_design ON design_material_requirements(design_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_design_material_req_customer ON design_material_requirements(customer_id, material_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_design_material_req_status ON design_material_requirements(status);

-- Production Schedule Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_production_schedule_date ON production_schedule(schedule_date, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_production_schedule_design ON production_schedule(design_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_production_schedule_customer ON production_schedule(customer_id, schedule_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_production_schedule_operator ON production_schedule(operator_assignment, schedule_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_production_schedule_priority ON production_schedule(priority, schedule_date);

-- Production Dependencies Indexes  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_production_deps_schedule ON production_dependencies(schedule_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_production_deps_depends_on ON production_dependencies(depends_on_schedule_id);

-- Progress Tracking Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_design_status_history_design ON design_status_history(design_id, status_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_production_progress_order_item ON production_stage_progress(order_item_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_production_progress_design ON production_stage_progress(design_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_production_progress_stage ON production_stage_progress(production_stage, status);

-- ====================
-- BUSINESS LOGIC FUNCTIONS
-- ====================

-- Function: Check if design can be scheduled for production
CREATE OR REPLACE FUNCTION can_schedule_design(design_id_param UUID, required_material_qty DECIMAL DEFAULT NULL)
RETURNS TABLE (
    can_schedule BOOLEAN,
    blockers TEXT[]
) AS $$
DECLARE
    design_record RECORD;
    material_stock_qty DECIMAL;
    required_qty DECIMAL;
    blocker_list TEXT[] := '{}';
BEGIN
    -- Get design information
    SELECT d.*, c.id as customer_id INTO design_record 
    FROM designs d 
    JOIN customers c ON d.customer_id = c.id 
    WHERE d.id = design_id_param AND d.is_deleted = FALSE;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, ARRAY['Design not found'];
        RETURN;
    END IF;
    
    -- Check design status
    IF design_record.status != 'ready' THEN
        blocker_list := array_append(blocker_list, 'Design status is ' || design_record.status || ' (must be ready)');
    END IF;
    
    -- Check material availability
    required_qty := COALESCE(required_material_qty, design_record.estimated_material_usage);
    IF required_qty > 0 THEN
        SELECT COALESCE(current_stock, 0) INTO material_stock_qty
        FROM material_stock 
        WHERE customer_id = design_record.customer_id 
        AND material_type = design_record.material_type;
        
        IF COALESCE(material_stock_qty, 0) < required_qty THEN
            blocker_list := array_append(blocker_list, 
                'Insufficient material: need ' || required_qty || ', have ' || COALESCE(material_stock_qty, 0));
        END IF;
    END IF;
    
    -- Check if already scheduled
    IF EXISTS (
        SELECT 1 FROM production_schedule 
        WHERE design_id = design_id_param 
        AND status IN ('scheduled', 'confirmed', 'in_progress')
    ) THEN
        blocker_list := array_append(blocker_list, 'Design already scheduled');
    END IF;
    
    RETURN QUERY SELECT (array_length(blocker_list, 1) IS NULL), blocker_list;
END;
$$ LANGUAGE plpgsql;

-- Function: Get schedulable designs for a date
CREATE OR REPLACE FUNCTION get_schedulable_designs(schedule_date_param DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    design_id UUID,
    design_name VARCHAR,
    customer_name VARCHAR,
    material_type_name VARCHAR,
    available_stock DECIMAL,
    estimated_usage DECIMAL,
    priority_level INTEGER,
    days_since_ready INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.design_name,
        c.name,
        mt.name,
        COALESCE(ms.current_stock, 0),
        d.estimated_material_usage,
        d.priority_level,
        CASE 
            WHEN d.actual_ready_date IS NOT NULL 
            THEN EXTRACT(DAY FROM (schedule_date_param - d.actual_ready_date::DATE))::INTEGER
            ELSE 0 
        END
    FROM designs d
    JOIN customers c ON d.customer_id = c.id
    LEFT JOIN material_types mt ON d.material_type = mt.id
    LEFT JOIN material_stock ms ON c.id = ms.customer_id AND mt.id = ms.material_type
    WHERE d.status = 'ready'
    AND d.is_deleted = FALSE
    AND c.is_deleted = FALSE
    AND COALESCE(ms.current_stock, 0) >= d.estimated_material_usage
    AND NOT EXISTS (
        SELECT 1 FROM production_schedule ps 
        WHERE ps.design_id = d.id 
        AND ps.status IN ('scheduled', 'confirmed', 'in_progress')
    )
    ORDER BY d.priority_level, d.actual_ready_date;
END;
$$ LANGUAGE plpgsql;

-- ====================
-- TRIGGERS FOR AUTOMATION
-- ====================

-- Trigger: Update design updated_at timestamp
CREATE OR REPLACE FUNCTION update_designs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_designs_updated_at
    BEFORE UPDATE ON designs
    FOR EACH ROW
    EXECUTE FUNCTION update_designs_timestamp();

-- Trigger: Log design status changes
CREATE OR REPLACE FUNCTION log_design_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO design_status_history (
            design_id, 
            from_status, 
            to_status, 
            status_date,
            duration_in_status,
            changed_by,
            change_reason
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            NOW(),
            CASE 
                WHEN OLD.updated_at IS NOT NULL 
                THEN NOW() - OLD.updated_at 
                ELSE NULL 
            END,
            NEW.updated_by,
            'Status changed from ' || COALESCE(OLD.status, 'NULL') || ' to ' || NEW.status
        );
        
        -- Set actual_ready_date when status becomes 'ready'
        IF NEW.status = 'ready' AND OLD.status != 'ready' THEN
            NEW.actual_ready_date = NOW();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_design_status_change
    BEFORE UPDATE ON designs
    FOR EACH ROW
    EXECUTE FUNCTION log_design_status_change();

-- Trigger: Auto-generate design code if not provided
CREATE OR REPLACE FUNCTION generate_design_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.design_code IS NULL OR NEW.design_code = '' THEN
        NEW.design_code = 'DES-' || EXTRACT(YEAR FROM NOW()) || '-' || 
                         LPAD(nextval('design_code_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for design codes
CREATE SEQUENCE IF NOT EXISTS design_code_seq START 1;

CREATE TRIGGER trigger_generate_design_code
    BEFORE INSERT ON designs
    FOR EACH ROW
    EXECUTE FUNCTION generate_design_code();

-- ====================
-- DATA VALIDATION
-- ====================

-- Ensure material requirements don't exceed available stock (warning only)
CREATE OR REPLACE FUNCTION validate_material_allocation()
RETURNS TRIGGER AS $$
DECLARE
    available_stock DECIMAL;
    total_allocated DECIMAL;
BEGIN
    -- Get current stock
    SELECT COALESCE(current_stock, 0) INTO available_stock
    FROM material_stock 
    WHERE customer_id = NEW.customer_id AND material_type = NEW.material_type;
    
    -- Get total allocated (including this new allocation)
    SELECT COALESCE(SUM(allocated_quantity), 0) INTO total_allocated
    FROM design_material_requirements 
    WHERE customer_id = NEW.customer_id 
    AND material_type = NEW.material_type 
    AND status IN ('planned', 'allocated', 'in_use')
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);
    
    total_allocated := total_allocated + NEW.allocated_quantity;
    
    -- Warn if over-allocated (but don't prevent - just log)
    IF total_allocated > available_stock THEN
        RAISE WARNING 'Material over-allocation detected: allocated % > available % for customer % material %', 
            total_allocated, available_stock, NEW.customer_id, NEW.material_type;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_material_allocation
    BEFORE INSERT OR UPDATE ON design_material_requirements
    FOR EACH ROW
    EXECUTE FUNCTION validate_material_allocation();

-- ====================
-- INITIAL DATA SETUP
-- ====================

-- Add design-related production stages if they don't exist
INSERT INTO production_stages (name, sequence_order, description) 
VALUES 
    ('Design Review', 0, 'Review and approve customer designs') 
ON CONFLICT (name) DO NOTHING;

INSERT INTO production_stages (name, sequence_order, description) 
VALUES 
    ('Design Preparation', 1, 'Prepare designs for production') 
ON CONFLICT (name) DO NOTHING;

-- Update sequence orders to accommodate new stages
UPDATE production_stages SET sequence_order = sequence_order + 2 
WHERE name IN ('Pre-treatment', 'Printing', 'Post Processing', 'Quality Check', 'Packing');

-- ====================
-- MIGRATION VALIDATION
-- ====================

-- Validate that all tables were created successfully
DO $$
DECLARE
    table_count INTEGER;
    required_tables TEXT[] := ARRAY[
        'designs', 'design_files', 'design_material_requirements',
        'production_schedule', 'production_dependencies', 
        'design_status_history', 'production_stage_progress'
    ];
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY required_tables LOOP
        SELECT COUNT(*) INTO table_count
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = table_name;
        
        IF table_count = 0 THEN
            RAISE EXCEPTION 'Required table % was not created', table_name;
        END IF;
        
        RAISE NOTICE 'Table % created successfully', table_name;
    END LOOP;
    
    RAISE NOTICE 'All design management and scheduling tables created successfully';
    RAISE NOTICE 'Migration 08_DESIGN_MANAGEMENT_AND_SCHEDULING completed successfully';
END $$;

-- Migration completion log
INSERT INTO deployment_history (
    deployment_type,
    script_name,
    status,
    description
) VALUES (
    'schema_enhancement',
    '08_DESIGN_MANAGEMENT_AND_SCHEDULING.sql',
    'completed',
    'Enhanced schema with comprehensive design management, material-design correlation, and production scheduling system'
);

-- Final summary
SELECT 
    'MIGRATION COMPLETE' as status,
    'Design Management and Production Scheduling Enhanced' as description,
    NOW() as completed_at;