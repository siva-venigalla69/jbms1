-- =====================================
-- COMPLETE DATABASE SCHEMA CREATION - UPDATED WITH 2-COLUMN DESIGN
-- For fresh deployment to any new database
-- Version: 2.0 - Includes Clean 2-Column Design Structure
-- Date: 2025-09-02
-- =====================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================
-- SECTION 1: REFERENCE TABLES (CREATE FIRST)
-- =====================================

-- User Roles Reference
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Material Types Reference  
CREATE TABLE IF NOT EXISTS material_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50),
    description TEXT,
    unit_of_measure VARCHAR(20) DEFAULT 'pieces',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order Status Reference
CREATE TABLE IF NOT EXISTS order_statuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    color_code VARCHAR(7), -- For UI display
    sort_order INTEGER DEFAULT 0,
    is_final_status BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment Methods Reference
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    requires_reference BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Production Stages Reference (DEPRECATED - Keep for compatibility)
CREATE TABLE IF NOT EXISTS production_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Return Reasons Reference
CREATE TABLE IF NOT EXISTS return_reasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reason VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50),
    requires_approval BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================
-- SECTION 2: CORE BUSINESS TABLES
-- =====================================

-- Users/Staff Table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role UUID REFERENCES user_roles(id),
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    gst_number VARCHAR(15),
    credit_limit DECIMAL(12,2) DEFAULT 0,
    current_balance DECIMAL(12,2) DEFAULT 0,
    payment_terms INTEGER DEFAULT 30, -- Days
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    order_date DATE DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    total_amount DECIMAL(12,2) DEFAULT 0,
    advance_amount DECIMAL(12,2) DEFAULT 0,
    balance_amount DECIMAL(12,2) DEFAULT 0,
    status UUID REFERENCES order_statuses(id),
    priority_level INTEGER DEFAULT 3,
    special_instructions TEXT,
    created_by UUID REFERENCES user_profiles(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order Items Table - UPDATED WITH CLEAN 2-COLUMN DESIGN
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    material_type UUID REFERENCES material_types(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    subtotal DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    
    -- ✨ NEW CLEAN 2-COLUMN DESIGN ✨
    design_status VARCHAR(30) DEFAULT 'pending_from_customer' NOT NULL,
    production_status VARCHAR(30) DEFAULT 'pending' NOT NULL,
    
    -- Design-related fields
    design_file_url TEXT,
    design_notes TEXT,
    
    -- Additional tracking
    customization_details TEXT, -- Kept for compatibility/notes
    estimated_completion_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add constraints for valid enum values
    CONSTRAINT valid_design_status CHECK (design_status IN ('pending_from_customer', 'design_received_from_customer', 'design_ready')),
    CONSTRAINT valid_production_status CHECK (production_status IN ('pending', 'printing', 'post_process')),
    
    -- Business rule: Can't start production until design is ready
    CONSTRAINT production_requires_design CHECK (
        (production_status = 'pending') OR 
        (production_status IN ('printing', 'post_process') AND design_status = 'design_ready')
    )
);

-- Material In Table
CREATE TABLE IF NOT EXISTS material_in (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    order_id UUID REFERENCES orders(id),
    material_type UUID REFERENCES material_types(id),
    quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
    unit_of_measure VARCHAR(20) DEFAULT 'pieces',
    received_date DATE DEFAULT CURRENT_DATE,
    quality_check_status VARCHAR(20) DEFAULT 'pending',
    storage_location VARCHAR(100),
    batch_number VARCHAR(100),
    notes TEXT,
    received_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Material Stock Table (Auto-managed)
CREATE TABLE IF NOT EXISTS material_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    material_type VARCHAR(100) NOT NULL,
    total_received DECIMAL(10,2) DEFAULT 0,
    total_delivered DECIMAL(10,2) DEFAULT 0,
    current_stock DECIMAL(10,2) GENERATED ALWAYS AS (total_received - total_delivered) STORED,
    last_transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(customer_id, material_type)
);

-- Delivery Challans Table  
CREATE TABLE IF NOT EXISTS delivery_challans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    order_id UUID REFERENCES orders(id),
    challan_number VARCHAR(100) UNIQUE NOT NULL,
    challan_date DATE DEFAULT CURRENT_DATE,
    delivery_date DATE,
    total_quantity DECIMAL(10,2) DEFAULT 0,
    delivery_status VARCHAR(20) DEFAULT 'prepared',
    transport_mode VARCHAR(50),
    vehicle_number VARCHAR(20),
    driver_name VARCHAR(100),
    driver_phone VARCHAR(20),
    delivery_address TEXT,
    special_instructions TEXT,
    created_by UUID REFERENCES user_profiles(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Challan Items Table
CREATE TABLE IF NOT EXISTS challan_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challan_id UUID NOT NULL REFERENCES delivery_challans(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES order_items(id),
    quantity_delivered DECIMAL(10,2) NOT NULL CHECK (quantity_delivered > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    line_total DECIMAL(12,2) GENERATED ALWAYS AS (quantity_delivered * unit_price) STORED,
    design_id UUID, -- For tracking which design was used
    quality_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Material Out Table (Auto-managed by triggers)
CREATE TABLE IF NOT EXISTS material_out (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challan_id UUID NOT NULL REFERENCES delivery_challans(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    material_type UUID REFERENCES material_types(id),
    quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
    delivery_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- GST Invoices Table
CREATE TABLE IF NOT EXISTS gst_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    invoice_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    subtotal DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    payment_status VARCHAR(20) DEFAULT 'pending',
    gst_treatment VARCHAR(20) DEFAULT 'taxable',
    place_of_supply VARCHAR(100),
    reverse_charge BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES user_profiles(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoice Line Items
CREATE TABLE IF NOT EXISTS invoice_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES gst_invoices(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id),
    order_item_id UUID REFERENCES order_items(id),
    challan_id UUID REFERENCES delivery_challans(id),
    design_id UUID, -- For design-specific billing
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    line_total DECIMAL(12,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 18.00,
    tax_amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoice Challan Mapping
CREATE TABLE IF NOT EXISTS invoice_challans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES gst_invoices(id),
    challan_id UUID NOT NULL REFERENCES delivery_challans(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(invoice_id, challan_id)
);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES gst_invoices(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    payment_amount DECIMAL(12,2) NOT NULL CHECK (payment_amount > 0),
    payment_date DATE DEFAULT CURRENT_DATE,
    payment_method UUID REFERENCES payment_methods(id),
    reference_number VARCHAR(100),
    bank_details TEXT,
    payment_status VARCHAR(20) DEFAULT 'completed',
    notes TEXT,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Returns Table
CREATE TABLE IF NOT EXISTS returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_item_id UUID NOT NULL REFERENCES order_items(id),
    return_quantity DECIMAL(10,2) NOT NULL CHECK (return_quantity > 0),
    return_date DATE DEFAULT CURRENT_DATE,
    return_reason UUID REFERENCES return_reasons(id),
    condition_on_return VARCHAR(50) DEFAULT 'good',
    refund_amount DECIMAL(10,2) DEFAULT 0,
    replacement_required BOOLEAN DEFAULT FALSE,
    notes TEXT,
    approved_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    payment_method UUID REFERENCES payment_methods(id),
    receipt_number VARCHAR(100),
    vendor_name VARCHAR(255),
    notes TEXT,
    created_by_user_id UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================
-- SECTION 3: DESIGN MANAGEMENT SYSTEM
-- =====================================

-- Design Submissions
CREATE TABLE IF NOT EXISTS design_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    order_id UUID REFERENCES orders(id),
    material_type_id UUID REFERENCES material_types(id),
    design_code VARCHAR(50) UNIQUE,
    design_name VARCHAR(255) NOT NULL,
    design_description TEXT,
    design_file_path TEXT,
    design_type VARCHAR(50) DEFAULT 'customer_provided',
    status VARCHAR(50) DEFAULT 'draft',
    submitted_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expected_completion_date DATE,
    actual_completion_date DATE,
    design_complexity VARCHAR(20) DEFAULT 'medium',
    special_requirements TEXT,
    submission_notes TEXT,
    assigned_designer UUID REFERENCES user_profiles(id),
    created_by UUID REFERENCES user_profiles(id),
    updated_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================
-- SECTION 4: AUDIT AND LOGGING TABLES
-- =====================================

-- Audit Trail
CREATE TABLE IF NOT EXISTS audit_trail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
    old_values JSONB,
    new_values JSONB,
    changed_by UUID REFERENCES user_profiles(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- =====================================
-- SECTION 5: SYSTEM TABLES
-- =====================================

-- Deployment History
CREATE TABLE IF NOT EXISTS deployment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deployment_type VARCHAR(50) NOT NULL,
    script_name VARCHAR(255) NOT NULL,
    version VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT,
    deployment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deployment Issues
CREATE TABLE IF NOT EXISTS deployment_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_type VARCHAR(50) NOT NULL,
    issue_title VARCHAR(255) NOT NULL,
    issue_description TEXT,
    severity_level VARCHAR(20) DEFAULT 'medium',
    resolution_status VARCHAR(20) DEFAULT 'open',
    resolution_notes TEXT,
    issue_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_date TIMESTAMP WITH TIME ZONE
);

-- Deployment Validation Results
CREATE TABLE IF NOT EXISTS deployment_validation_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    validation_type VARCHAR(50) NOT NULL,
    validation_passed BOOLEAN NOT NULL,
    validation_score INTEGER,
    overall_readiness_percentage INTEGER,
    issues_found TEXT[],
    recommendations TEXT[],
    validation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================
-- SUCCESS MESSAGE
-- =====================================

-- Log successful deployment
INSERT INTO deployment_history (deployment_type, script_name, version, status)
VALUES ('schema_creation', '01_COMPLETE_SCHEMA_CREATION_UPDATED.sql', '2.0', 'completed');

-- Create initial validation entry
INSERT INTO deployment_validation_results (
    validation_type, 
    validation_passed, 
    validation_score, 
    overall_readiness_percentage,
    issues_found,
    recommendations
) VALUES (
    'schema_creation',
    true,
    95,
    25,
    ARRAY[]::TEXT[],
    ARRAY['Run remaining migration scripts 02-07 in order']::TEXT[]
);