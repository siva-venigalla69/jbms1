-- =====================================
-- COMPLETE DATABASE SCHEMA CREATION
-- For fresh deployment to any new database
-- Version: 1.0
-- Date: 2025-08-26
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
    is_digital BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Production Stages Reference
CREATE TABLE IF NOT EXISTS production_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    sequence_order INTEGER NOT NULL,
    estimated_duration_hours INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Return Reasons Reference
CREATE TABLE IF NOT EXISTS return_reasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    requires_refund BOOLEAN DEFAULT TRUE,
    is_quality_issue BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================
-- SECTION 2: CORE BUSINESS TABLES
-- =====================================

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role UUID REFERENCES user_roles(id),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(255),
    address TEXT,
    gst_number VARCHAR(15),
    credit_limit DECIMAL(10,2) DEFAULT 0,
    payment_terms_days INTEGER DEFAULT 30,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_by_user_id UUID REFERENCES users(id),
    updated_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status UUID REFERENCES order_statuses(id),
    total_amount DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    expected_completion_date DATE,
    priority_level INTEGER DEFAULT 3, -- 1=urgent, 5=low
    is_deleted BOOLEAN DEFAULT FALSE,
    created_by_user_id UUID REFERENCES users(id),
    updated_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    material_type UUID REFERENCES material_types(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    customization_details TEXT,
    production_stage UUID REFERENCES production_stages(id),
    stage_completed_at TIMESTAMP WITH TIME ZONE,
    stage_completed_by UUID REFERENCES users(id),
    design_ready_date TIMESTAMP WITH TIME ZONE,
    printing_scheduled_date TIMESTAMP WITH TIME ZONE,
    estimated_completion_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Material In Table
CREATE TABLE IF NOT EXISTS material_in (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    order_id UUID REFERENCES orders(id),
    material_type UUID REFERENCES material_types(id),
    quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(50),
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    received_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    created_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Material Stock Table (CRITICAL)
CREATE TABLE IF NOT EXISTS material_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    material_type UUID NOT NULL REFERENCES material_types(id),
    total_received DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_delivered DECIMAL(10,2) NOT NULL DEFAULT 0,
    current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
    reserved_stock DECIMAL(10,2) DEFAULT 0, -- For pending orders
    minimum_threshold DECIMAL(10,2) DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    UNIQUE(customer_id, material_type)
);

-- Delivery Challans Table
CREATE TABLE IF NOT EXISTS delivery_challans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challan_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    order_id UUID REFERENCES orders(id), -- Added for API compatibility
    challan_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_quantity DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0, -- Added for API compatibility
    delivery_status VARCHAR(20) DEFAULT 'pending',
    delivered_date TIMESTAMP WITH TIME ZONE,
    delivered_by UUID REFERENCES users(id),
    notes TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Challan Items Table
CREATE TABLE IF NOT EXISTS challan_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challan_id UUID NOT NULL REFERENCES delivery_challans(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES order_items(id),
    quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2),
    line_total DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Material Out Table
CREATE TABLE IF NOT EXISTS material_out (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challan_id UUID NOT NULL REFERENCES delivery_challans(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    material_type UUID REFERENCES material_types(id),
    quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
    dispatch_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- GST Invoices Table
CREATE TABLE IF NOT EXISTS gst_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    invoice_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    cgst_rate DECIMAL(5,2) DEFAULT 9.00,
    sgst_rate DECIMAL(5,2) DEFAULT 9.00,
    igst_rate DECIMAL(5,2) DEFAULT 18.00,
    cgst_amount DECIMAL(10,2) DEFAULT 0,
    sgst_amount DECIMAL(10,2) DEFAULT 0,
    igst_amount DECIMAL(10,2) DEFAULT 0,
    total_tax_amount DECIMAL(10,2) DEFAULT 0,
    grand_total DECIMAL(10,2) DEFAULT 0,
    outstanding_amount DECIMAL(10,2) DEFAULT 0,
    payment_due_date DATE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoice Challans Mapping
CREATE TABLE IF NOT EXISTS invoice_challans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES gst_invoices(id) ON DELETE CASCADE,
    challan_id UUID NOT NULL REFERENCES delivery_challans(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(invoice_id, challan_id)
);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES gst_invoices(id),
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    payment_amount DECIMAL(10,2) NOT NULL CHECK (payment_amount > 0),
    payment_method UUID REFERENCES payment_methods(id),
    reference_number VARCHAR(100),
    bank_details TEXT,
    notes TEXT,
    created_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Returns Table
CREATE TABLE IF NOT EXISTS returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_item_id UUID NOT NULL REFERENCES order_items(id),
    return_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    returned_quantity DECIMAL(10,2) NOT NULL CHECK (returned_quantity > 0),
    return_reason UUID REFERENCES return_reasons(id),
    refund_amount DECIMAL(10,2) DEFAULT 0,
    is_adjustment BOOLEAN DEFAULT FALSE,
    quality_issue_details TEXT,
    resolution_notes TEXT,
    notes TEXT,
    created_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory Table
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL,
    reorder_level DECIMAL(10,2) DEFAULT 0,
    cost_per_unit DECIMAL(10,2) DEFAULT 0,
    supplier_info TEXT,
    location VARCHAR(100),
    created_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
    created_by_user_id UUID REFERENCES users(id),
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
    design_name VARCHAR(255) NOT NULL,
    design_description TEXT,
    design_file_path TEXT,
    design_type VARCHAR(50) DEFAULT 'customer_provided',
    submitted_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expected_completion_date DATE,
    design_complexity VARCHAR(20) DEFAULT 'medium',
    special_requirements TEXT,
    submission_notes TEXT,
    created_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Design Status Tracking
CREATE TABLE IF NOT EXISTS design_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    design_submission_id UUID NOT NULL REFERENCES design_submissions(id),
    status VARCHAR(50) NOT NULL,
    status_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status_notes TEXT,
    estimated_completion_date DATE,
    actual_completion_date DATE,
    assigned_designer_user_id UUID REFERENCES users(id),
    priority_level INTEGER DEFAULT 3,
    changed_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Material Design Mapping
CREATE TABLE IF NOT EXISTS material_design_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_in_id UUID NOT NULL REFERENCES material_in(id),
    design_submission_id UUID REFERENCES design_submissions(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    material_type_id UUID REFERENCES material_types(id),
    quantity_allocated DECIMAL(10,2) NOT NULL,
    allocation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    design_ready_date TIMESTAMP WITH TIME ZONE,
    printing_scheduled_date TIMESTAMP WITH TIME ZONE,
    printing_completed_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'material_with_design_pending',
    allocation_notes TEXT,
    created_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Design Printing Queue
CREATE TABLE IF NOT EXISTS design_printing_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_design_mapping_id UUID NOT NULL REFERENCES material_design_mapping(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    design_submission_id UUID NOT NULL REFERENCES design_submissions(id),
    queue_position INTEGER,
    scheduled_print_date DATE,
    actual_print_start_date TIMESTAMP WITH TIME ZONE,
    actual_print_completion_date TIMESTAMP WITH TIME ZONE,
    operator_user_id UUID REFERENCES users(id),
    printing_status VARCHAR(50) DEFAULT 'queued',
    print_quality_rating INTEGER CHECK (print_quality_rating >= 1 AND print_quality_rating <= 5),
    rework_reason TEXT,
    completion_notes TEXT,
    machine_used VARCHAR(100),
    print_duration_minutes INTEGER,
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
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    change_reason TEXT,
    ip_address INET,
    user_agent TEXT
);

-- Material Stock History
CREATE TABLE IF NOT EXISTS material_stock_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_stock_id UUID NOT NULL REFERENCES material_stock(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    material_type UUID NOT NULL REFERENCES material_types(id),
    previous_stock DECIMAL(10,2),
    quantity_change DECIMAL(10,2),
    new_stock DECIMAL(10,2),
    change_type VARCHAR(50), -- 'receipt', 'delivery', 'adjustment', 'return'
    reference_type VARCHAR(50), -- 'material_in', 'delivery_challan', 'manual_adjustment'
    reference_id UUID,
    reason TEXT,
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deployment History (for migration tracking)
CREATE TABLE IF NOT EXISTS deployment_history (
    id SERIAL PRIMARY KEY,
    deployment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deployment_type VARCHAR(50),
    script_name VARCHAR(255),
    status VARCHAR(20),
    description TEXT,
    execution_time_ms INTEGER,
    error_message TEXT,
    created_by VARCHAR(100) DEFAULT 'system',
    metadata JSONB
);

-- =====================================
-- SCHEMA CREATION COMPLETED
-- =====================================

-- Log this deployment
INSERT INTO deployment_history (
    deployment_type,
    script_name,
    status,
    description
) VALUES (
    'schema_creation',
    '01_COMPLETE_SCHEMA_CREATION.sql',
    'completed',
    'Complete database schema created for fresh deployment'
);