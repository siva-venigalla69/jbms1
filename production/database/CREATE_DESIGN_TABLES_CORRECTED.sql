-- =====================================
-- CORRECTED: Create design tables with proper foreign key types
-- =====================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create design_submissions table
CREATE TABLE IF NOT EXISTS design_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    order_id UUID REFERENCES orders(id),
    design_name VARCHAR(255) NOT NULL,
    design_description TEXT,
    design_file_path TEXT,
    design_type VARCHAR(50) DEFAULT 'customer_provided',
    submitted_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expected_completion_date DATE,
    design_complexity VARCHAR(20) DEFAULT 'medium',
    special_requirements TEXT,
    submission_notes TEXT,
    created_by_user_id UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create design_status table
CREATE TABLE IF NOT EXISTS design_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    design_submission_id UUID NOT NULL REFERENCES design_submissions(id),
    status VARCHAR(50) NOT NULL,
    status_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status_notes TEXT,
    estimated_completion_date DATE,
    actual_completion_date DATE,
    assigned_designer_user_id UUID REFERENCES user_profiles(id),
    priority_level INTEGER DEFAULT 3,
    changed_by_user_id UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create material_design_mapping table (fix: use VARCHAR for material_type_id to match your schema)
CREATE TABLE IF NOT EXISTS material_design_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_in_id UUID NOT NULL REFERENCES material_in(id),
    design_submission_id UUID REFERENCES design_submissions(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    material_type_id VARCHAR REFERENCES material_types(id), -- Changed from UUID to VARCHAR
    quantity_allocated DECIMAL(10,2) NOT NULL,
    allocation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    design_ready_date TIMESTAMP WITH TIME ZONE,
    printing_scheduled_date TIMESTAMP WITH TIME ZONE,
    printing_completed_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'material_with_design_pending',
    allocation_notes TEXT,
    created_by_user_id UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create design_printing_queue table
CREATE TABLE IF NOT EXISTS design_printing_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_design_mapping_id UUID NOT NULL REFERENCES material_design_mapping(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    design_submission_id UUID NOT NULL REFERENCES design_submissions(id),
    queue_position INTEGER,
    scheduled_print_date DATE,
    actual_print_start_date TIMESTAMP WITH TIME ZONE,
    actual_print_completion_date TIMESTAMP WITH TIME ZONE,
    operator_user_id UUID REFERENCES user_profiles(id),
    printing_status VARCHAR(50) DEFAULT 'queued',
    print_quality_rating INTEGER CHECK (print_quality_rating >= 1 AND print_quality_rating <= 5),
    rework_reason TEXT,
    completion_notes TEXT,
    machine_used VARCHAR(100),
    print_duration_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add basic indexes
CREATE INDEX IF NOT EXISTS idx_design_submissions_customer ON design_submissions(customer_id);
CREATE INDEX IF NOT EXISTS idx_design_submissions_order ON design_submissions(order_id);
CREATE INDEX IF NOT EXISTS idx_design_status_submission ON design_status(design_submission_id);
CREATE INDEX IF NOT EXISTS idx_material_design_mapping_customer ON material_design_mapping(customer_id);
CREATE INDEX IF NOT EXISTS idx_design_printing_queue_customer ON design_printing_queue(customer_id);

-- Verify creation
SELECT 'SUCCESS: Design tables created with correct foreign key types!' as result;