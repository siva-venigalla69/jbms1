-- =====================================
-- CORRECTED DESIGN MANAGEMENT AND PRODUCTION SCHEDULING ENHANCEMENT
-- Migration 08: Using actual database schema data types
-- VARCHAR for: material_types, production_stages, user_roles, order_statuses, payment_methods
-- UUID for: customers, orders, order_items, gst_invoices, user_profiles
-- =====================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
    material_type VARCHAR REFERENCES material_types(id), -- VARCHAR not UUID
    
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
    production_stage VARCHAR REFERENCES production_stages(id), -- VARCHAR not UUID
    
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
    
    -- Completion Tracking
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    completion_notes TEXT,
    quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES user_profiles(id)
);

-- Production Dependencies - What needs to be completed before this can start
CREATE TABLE IF NOT EXISTS production_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dependent_schedule_id UUID NOT NULL REFERENCES production_schedule(id) ON DELETE CASCADE,
    prerequisite_schedule_id UUID NOT NULL REFERENCES production_schedule(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) DEFAULT 'sequential' CHECK (dependency_type IN ('sequential', 'parallel', 'conditional')),
    dependency_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent circular dependencies
    CONSTRAINT no_self_dependency CHECK (dependent_schedule_id != prerequisite_schedule_id)
);

-- Design Status History - Track all status changes
CREATE TABLE IF NOT EXISTS design_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    design_id UUID NOT NULL REFERENCES design_submissions(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    status_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    changed_by UUID REFERENCES user_profiles(id),
    change_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Production Stage Progress - Track progress through each stage
CREATE TABLE IF NOT EXISTS production_stage_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    design_id UUID NOT NULL REFERENCES design_submissions(id) ON DELETE CASCADE,
    production_stage VARCHAR REFERENCES production_stages(id), -- VARCHAR not UUID
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    operator UUID REFERENCES user_profiles(id),
    stage_notes TEXT,
    quality_check_passed BOOLEAN,
    rework_required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================
-- BUSINESS LOGIC FUNCTIONS
-- ====================

-- Function to check if a design can be scheduled
CREATE OR REPLACE FUNCTION can_schedule_design(design_id_param UUID, required_material_qty DECIMAL DEFAULT NULL)
RETURNS TABLE (
    can_schedule BOOLEAN,
    blockers TEXT[]
) AS $$
DECLARE
    design_record RECORD;
    material_available DECIMAL;
    blocker_list TEXT[] := '{}';
BEGIN
    -- Get design details
    SELECT * INTO design_record
    FROM design_submissions ds
    WHERE ds.id = design_id_param;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, ARRAY['Design not found'];
        RETURN;
    END IF;
    
    -- Check if design is ready
    IF design_record.actual_ready_date IS NULL THEN
        blocker_list := array_append(blocker_list, 'Design not ready');
    END IF;
    
    -- Check material availability if specified
    IF required_material_qty IS NOT NULL AND design_record.material_type_id IS NOT NULL THEN
        SELECT COALESCE(SUM(ms.current_stock), 0) INTO material_available
        FROM material_stock ms
        WHERE ms.customer_id = design_record.customer_id 
        AND ms.material_type = design_record.material_type_id;
        
        IF material_available < required_material_qty THEN
            blocker_list := array_append(blocker_list, 'Insufficient material stock');
        END IF;
    END IF;
    
    RETURN QUERY SELECT (array_length(blocker_list, 1) IS NULL), blocker_list;
END;
$$ LANGUAGE plpgsql;

-- Function to get schedulable designs
CREATE OR REPLACE FUNCTION get_schedulable_designs(schedule_date_param DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    design_id UUID,
    design_name VARCHAR,
    customer_name VARCHAR,
    priority_level INTEGER,
    estimated_hours DECIMAL,
    material_type_name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ds.id,
        ds.design_name,
        c.name,
        ds.priority_level,
        ds.estimated_prep_hours,
        mt.name
    FROM design_submissions ds
    JOIN customers c ON ds.customer_id = c.id
    LEFT JOIN material_types mt ON ds.material_type_id = mt.id
    WHERE ds.actual_ready_date IS NOT NULL
    AND ds.is_deleted = FALSE
    AND NOT EXISTS (
        SELECT 1 FROM production_schedule ps
        WHERE ps.design_id = ds.id
        AND ps.schedule_date = schedule_date_param
        AND ps.status NOT IN ('cancelled', 'completed')
    )
    ORDER BY ds.priority_level ASC, ds.actual_ready_date ASC;
END;
$$ LANGUAGE plpgsql;

-- ====================
-- TRIGGERS FOR AUTOMATION
-- ====================

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_design_submissions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS tr_design_submissions_updated ON design_submissions;
CREATE TRIGGER tr_design_submissions_updated
    BEFORE UPDATE ON design_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_design_submissions_timestamp();

-- Status change logging trigger
CREATE OR REPLACE FUNCTION log_design_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if status actually changed
    IF OLD.design_complexity IS DISTINCT FROM NEW.design_complexity OR
       OLD.priority_level IS DISTINCT FROM NEW.priority_level THEN
        
        INSERT INTO design_status_history (design_id, old_status, new_status, changed_by)
        VALUES (NEW.id, OLD.design_complexity, NEW.design_complexity, NEW.updated_by);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create status change trigger
DROP TRIGGER IF EXISTS tr_log_design_status ON design_submissions;
CREATE TRIGGER tr_log_design_status
    AFTER UPDATE ON design_submissions
    FOR EACH ROW
    EXECUTE FUNCTION log_design_status_change();

-- Auto-generate design codes
CREATE OR REPLACE FUNCTION generate_design_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.design_code IS NULL OR NEW.design_code = '' THEN
        NEW.design_code := 'DSN-' || to_char(NEW.created_at, 'YYYYMM') || '-' || 
                          LPAD(EXTRACT(DAY FROM NEW.created_at)::TEXT, 2, '0') || '-' ||
                          SUBSTR(NEW.id::TEXT, 1, 8);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create design code trigger
DROP TRIGGER IF EXISTS tr_generate_design_code ON design_submissions;
CREATE TRIGGER tr_generate_design_code
    BEFORE INSERT ON design_submissions
    FOR EACH ROW
    EXECUTE FUNCTION generate_design_code();

-- Material allocation validation
CREATE OR REPLACE FUNCTION validate_material_allocation()
RETURNS TRIGGER AS $$
DECLARE
    available_stock DECIMAL;
BEGIN
    -- Check if enough material is available
    SELECT COALESCE(SUM(ms.current_stock), 0) INTO available_stock
    FROM material_stock ms
    WHERE ms.customer_id = NEW.customer_id 
    AND ms.material_type = NEW.material_type;
    
    IF NEW.allocated_quantity > available_stock THEN
        RAISE EXCEPTION 'Cannot allocate % units. Only % available in stock', 
                       NEW.allocated_quantity, available_stock;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create material allocation trigger
DROP TRIGGER IF EXISTS tr_validate_material_allocation ON design_material_requirements;
CREATE TRIGGER tr_validate_material_allocation
    BEFORE INSERT OR UPDATE ON design_material_requirements
    FOR EACH ROW
    EXECUTE FUNCTION validate_material_allocation();

-- ====================
-- PERFORMANCE INDEXES
-- ====================

-- Design Management Indexes
CREATE INDEX IF NOT EXISTS idx_design_submissions_customer ON design_submissions(customer_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_design_submissions_material_type ON design_submissions(material_type_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_design_submissions_priority ON design_submissions(priority_level) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_design_submissions_ready_date ON design_submissions(actual_ready_date) WHERE actual_ready_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_design_submissions_assigned_designer ON design_submissions(assigned_designer) WHERE is_deleted = FALSE;

-- Design Files Indexes
CREATE INDEX IF NOT EXISTS idx_design_files_design_id ON design_files(design_id);
CREATE INDEX IF NOT EXISTS idx_design_files_primary ON design_files(design_id) WHERE is_primary = TRUE;

-- Material Requirements Indexes
CREATE INDEX IF NOT EXISTS idx_design_material_req_design ON design_material_requirements(design_id);
CREATE INDEX IF NOT EXISTS idx_design_material_req_customer ON design_material_requirements(customer_id, material_type);
CREATE INDEX IF NOT EXISTS idx_design_material_req_status ON design_material_requirements(status);

-- Production Schedule Indexes
CREATE INDEX IF NOT EXISTS idx_production_schedule_date ON production_schedule(schedule_date);
CREATE INDEX IF NOT EXISTS idx_production_schedule_design ON production_schedule(design_id);
CREATE INDEX IF NOT EXISTS idx_production_schedule_customer ON production_schedule(customer_id);
CREATE INDEX IF NOT EXISTS idx_production_schedule_status ON production_schedule(status);
CREATE INDEX IF NOT EXISTS idx_production_schedule_stage ON production_schedule(production_stage);

-- Dependencies Indexes
CREATE INDEX IF NOT EXISTS idx_production_dependencies_dependent ON production_dependencies(dependent_schedule_id);
CREATE INDEX IF NOT EXISTS idx_production_dependencies_prerequisite ON production_dependencies(prerequisite_schedule_id);

-- History and Progress Indexes
CREATE INDEX IF NOT EXISTS idx_design_status_history_design ON design_status_history(design_id);
CREATE INDEX IF NOT EXISTS idx_design_status_history_date ON design_status_history(status_date);
CREATE INDEX IF NOT EXISTS idx_production_stage_progress_design ON production_stage_progress(design_id);
CREATE INDEX IF NOT EXISTS idx_production_stage_progress_stage ON production_stage_progress(production_stage);

SELECT 'Migration 08 completed successfully with corrected data types!' as result;