-- Fix production_schedule table data type issue
-- Drop and recreate with correct data types

DROP TABLE IF EXISTS production_schedule CASCADE;
DROP TABLE IF EXISTS production_dependencies CASCADE;
DROP TABLE IF EXISTS production_stage_progress CASCADE;

-- Recreate production_schedule with correct VARCHAR type for production_stage
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
    production_stage VARCHAR REFERENCES production_stages(id), -- VARCHAR to match production_stages.id
    
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

-- Production Stage Progress - Track progress through each stage
CREATE TABLE IF NOT EXISTS production_stage_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    design_id UUID NOT NULL REFERENCES design_submissions(id) ON DELETE CASCADE,
    production_stage VARCHAR REFERENCES production_stages(id), -- VARCHAR to match production_stages.id
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    operator UUID REFERENCES user_profiles(id),
    stage_notes TEXT,
    quality_check_passed BOOLEAN,
    rework_required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

SELECT 'Production schedule tables recreated with correct data types!' as result;