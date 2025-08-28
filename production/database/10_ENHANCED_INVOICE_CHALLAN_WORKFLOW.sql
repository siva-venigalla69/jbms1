-- =====================================
-- ENHANCED INVOICE-CHALLAN WORKFLOW
-- Migration 10: Enhanced invoicing system supporting multiple DC combinations
-- Supports: Single DC → Invoice, Multiple DC → Single Invoice, Partial invoicing
-- =====================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================
-- ENHANCED INVOICE SYSTEM
-- ====================

-- Add enhanced fields to GST invoices
ALTER TABLE gst_invoices
ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(50) DEFAULT 'standard' CHECK (invoice_type IN ('standard', 'consolidated', 'partial', 'advance', 'credit_note')),
ADD COLUMN IF NOT EXISTS consolidation_period VARCHAR(20), -- 'daily', 'weekly', 'monthly'
ADD COLUMN IF NOT EXISTS consolidation_date DATE,
ADD COLUMN IF NOT EXISTS billing_address TEXT,
ADD COLUMN IF NOT EXISTS shipping_address TEXT,
ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(100) DEFAULT 'Net 30',
ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR',
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,4) DEFAULT 1.0000,
ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS shipping_charges DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS other_charges DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS round_off_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS invoice_status VARCHAR(20) DEFAULT 'draft' CHECK (invoice_status IN ('draft', 'pending_approval', 'approved', 'sent', 'viewed', 'paid', 'partially_paid', 'overdue', 'cancelled')),
ADD COLUMN IF NOT EXISTS approval_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES user_profiles(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS due_reminder_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS invoice_template VARCHAR(50) DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS custom_fields JSONB,
ADD COLUMN IF NOT EXISTS internal_notes TEXT,
ADD COLUMN IF NOT EXISTS customer_notes TEXT;

-- Enhanced Invoice Line Items (detailed breakdown)
CREATE TABLE IF NOT EXISTS invoice_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES gst_invoices(id) ON DELETE CASCADE,
    challan_id UUID REFERENCES delivery_challans(id),
    order_id UUID REFERENCES orders(id),
    order_item_id UUID REFERENCES order_items(id),
    design_id UUID REFERENCES design_submissions(id),
    
    -- Item Details
    line_number INTEGER NOT NULL,
    item_description TEXT NOT NULL,
    item_code VARCHAR(100),
    hsn_sac_code VARCHAR(20),
    
    -- Quantity and Rates
    quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
    unit_of_measurement VARCHAR(20) DEFAULT 'Pcs',
    rate_per_unit DECIMAL(10,2) NOT NULL CHECK (rate_per_unit >= 0),
    
    -- Amounts
    gross_amount DECIMAL(10,2) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    taxable_amount DECIMAL(10,2) NOT NULL,
    
    -- Tax Details
    cgst_rate DECIMAL(5,2) DEFAULT 9.00,
    sgst_rate DECIMAL(5,2) DEFAULT 9.00,
    igst_rate DECIMAL(5,2) DEFAULT 18.00,
    cgst_amount DECIMAL(10,2) DEFAULT 0.00,
    sgst_amount DECIMAL(10,2) DEFAULT 0.00,
    igst_amount DECIMAL(10,2) DEFAULT 0.00,
    total_tax_amount DECIMAL(10,2) DEFAULT 0.00,
    
    -- Final Amount
    line_total DECIMAL(10,2) NOT NULL,
    
    -- Additional Information
    delivery_date DATE,
    batch_number VARCHAR(50),
    serial_numbers TEXT,
    warranty_period VARCHAR(50),
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced Invoice-Challan relationship with partial support
DROP TABLE IF EXISTS invoice_challans CASCADE;
CREATE TABLE invoice_challans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES gst_invoices(id) ON DELETE CASCADE,
    challan_id UUID NOT NULL REFERENCES delivery_challans(id),
    
    -- Partial invoicing support
    is_partial BOOLEAN DEFAULT FALSE,
    partial_percentage DECIMAL(5,2) CHECK (partial_percentage > 0 AND partial_percentage <= 100),
    partial_amount DECIMAL(10,2),
    remaining_amount DECIMAL(10,2),
    
    -- Billing details
    invoiced_amount DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL,
    
    -- Status tracking
    billing_status VARCHAR(20) DEFAULT 'fully_billed' CHECK (billing_status IN ('fully_billed', 'partially_billed', 'pending_billing')),
    
    -- Notes and references
    billing_notes TEXT,
    reference_number VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique combinations for partial billing
    UNIQUE(invoice_id, challan_id, partial_percentage)
);

-- Invoice Generation Templates
CREATE TABLE IF NOT EXISTS invoice_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_name VARCHAR(100) NOT NULL UNIQUE,
    template_type VARCHAR(50) DEFAULT 'standard',
    
    -- Template Configuration
    header_content TEXT,
    footer_content TEXT,
    terms_and_conditions TEXT,
    payment_instructions TEXT,
    
    -- Styling
    logo_path TEXT,
    color_scheme JSONB,
    font_settings JSONB,
    
    -- Business Rules
    auto_calculate_tax BOOLEAN DEFAULT TRUE,
    default_payment_terms VARCHAR(100),
    require_approval BOOLEAN DEFAULT FALSE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoice Approval Workflow
CREATE TABLE IF NOT EXISTS invoice_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES gst_invoices(id) ON DELETE CASCADE,
    
    -- Approval Details
    approval_level INTEGER DEFAULT 1,
    approver_id UUID NOT NULL REFERENCES user_profiles(id),
    approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'escalated')),
    
    -- Approval Decision
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    approval_notes TEXT,
    
    -- Escalation
    escalated_to UUID REFERENCES user_profiles(id),
    escalated_at TIMESTAMP WITH TIME ZONE,
    escalation_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================
-- CONSOLIDATED INVOICING VIEWS
-- ====================

-- View: Delivery Challans ready for invoicing
CREATE OR REPLACE VIEW challans_ready_for_invoicing AS
SELECT 
    dc.id,
    dc.challan_number,
    dc.customer_id,
    c.name as customer_name,
    c.gst_number,
    dc.delivery_date,
    dc.status,
    
    -- Financial Summary
    SUM(ci.quantity_delivered * ci.unit_price) as challan_amount,
    SUM(ci.quantity_delivered * ci.unit_price) * 0.18 as estimated_tax,
    SUM(ci.quantity_delivered * ci.unit_price) * 1.18 as estimated_total,
    
    -- Billing Status
    CASE 
        WHEN ic.challan_id IS NULL THEN 'not_billed'
        WHEN ic.is_partial = TRUE AND ic.billing_status = 'partially_billed' THEN 'partially_billed'
        WHEN ic.billing_status = 'fully_billed' THEN 'fully_billed'
        ELSE 'unknown'
    END as billing_status,
    
    -- Already Billed Amount
    COALESCE(SUM(ic.invoiced_amount), 0) as already_billed_amount,
    
    -- Remaining Amount
    SUM(ci.quantity_delivered * ci.unit_price) - COALESCE(SUM(ic.invoiced_amount), 0) as remaining_amount,
    
    -- Item Count
    COUNT(ci.id) as item_count,
    
    -- Dates
    dc.created_at as challan_date,
    MAX(ic.created_at) as last_billing_date

FROM delivery_challans dc
JOIN customers c ON dc.customer_id = c.id
LEFT JOIN challan_items ci ON dc.id = ci.delivery_challan_id
LEFT JOIN invoice_challans ic ON dc.id = ic.challan_id
WHERE dc.status = 'delivered'
AND c.is_deleted = FALSE
GROUP BY dc.id, dc.challan_number, dc.customer_id, c.name, c.gst_number, 
         dc.delivery_date, dc.status, dc.created_at, ic.challan_id, ic.is_partial, ic.billing_status
HAVING SUM(ci.quantity_delivered * ci.unit_price) - COALESCE(SUM(ic.invoiced_amount), 0) > 0;

-- View: Customer billing summary
CREATE OR REPLACE VIEW customer_billing_summary AS
SELECT 
    c.id as customer_id,
    c.name as customer_name,
    c.gst_number,
    
    -- Challan Counts
    COUNT(DISTINCT dc.id) as total_challans,
    COUNT(DISTINCT CASE WHEN crfi.billing_status = 'not_billed' THEN dc.id END) as unbilled_challans,
    COUNT(DISTINCT CASE WHEN crfi.billing_status = 'partially_billed' THEN dc.id END) as partially_billed_challans,
    COUNT(DISTINCT CASE WHEN crfi.billing_status = 'fully_billed' THEN dc.id END) as fully_billed_challans,
    
    -- Financial Summary
    COALESCE(SUM(crfi.challan_amount), 0) as total_delivered_value,
    COALESCE(SUM(crfi.already_billed_amount), 0) as total_billed_amount,
    COALESCE(SUM(crfi.remaining_amount), 0) as total_pending_amount,
    
    -- Invoice Counts
    COUNT(DISTINCT gi.id) as total_invoices,
    COUNT(DISTINCT CASE WHEN gi.invoice_status = 'paid' THEN gi.id END) as paid_invoices,
    COUNT(DISTINCT CASE WHEN gi.invoice_status = 'overdue' THEN gi.id END) as overdue_invoices,
    
    -- Outstanding Amounts
    COALESCE(SUM(CASE WHEN gi.invoice_status NOT IN ('paid', 'cancelled') THEN gi.outstanding_amount END), 0) as total_outstanding,
    
    -- Last Activity
    MAX(dc.delivery_date) as last_delivery_date,
    MAX(gi.invoice_date) as last_invoice_date

FROM customers c
LEFT JOIN delivery_challans dc ON c.id = dc.customer_id
LEFT JOIN challans_ready_for_invoicing crfi ON dc.id = crfi.id
LEFT JOIN gst_invoices gi ON c.id = gi.customer_id AND gi.invoice_status != 'cancelled'
WHERE c.is_deleted = FALSE
GROUP BY c.id, c.name, c.gst_number;

-- ====================
-- ADVANCED BUSINESS FUNCTIONS
-- ====================

-- Function: Create consolidated invoice from multiple challans
CREATE OR REPLACE FUNCTION create_consolidated_invoice(
    customer_id_param UUID,
    challan_ids UUID[],
    invoice_type_param VARCHAR DEFAULT 'consolidated',
    consolidation_period_param VARCHAR DEFAULT NULL,
    due_days INTEGER DEFAULT 30
)
RETURNS UUID AS $$
DECLARE
    invoice_id UUID;
    invoice_number VARCHAR(50);
    total_amount DECIMAL(10,2) := 0;
    tax_amount DECIMAL(10,2) := 0;
    grand_total DECIMAL(10,2) := 0;
    challan_record RECORD;
    line_number INTEGER := 1;
    customer_record RECORD;
BEGIN
    -- Validate customer
    SELECT * INTO customer_record FROM customers WHERE id = customer_id_param AND is_deleted = FALSE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer not found or inactive';
    END IF;
    
    -- Validate all challans belong to customer and are ready for billing
    FOR challan_record IN 
        SELECT * FROM challans_ready_for_invoicing 
        WHERE id = ANY(challan_ids) AND customer_id = customer_id_param
    LOOP
        IF challan_record.billing_status = 'fully_billed' THEN
            RAISE EXCEPTION 'Challan % is already fully billed', challan_record.challan_number;
        END IF;
    END LOOP;
    
    -- Generate invoice number
    invoice_number := 'INV-CONS-' || EXTRACT(YEAR FROM NOW()) || '-' || 
                     LPAD(nextval('consolidated_invoice_seq')::TEXT, 6, '0');
    
    -- Calculate totals
    SELECT 
        SUM(remaining_amount),
        SUM(remaining_amount * 0.18),
        SUM(remaining_amount * 1.18)
    INTO total_amount, tax_amount, grand_total
    FROM challans_ready_for_invoicing 
    WHERE id = ANY(challan_ids);
    
    -- Create main invoice record
    INSERT INTO gst_invoices (
        invoice_number,
        customer_id,
        invoice_date,
        invoice_type,
        consolidation_period,
        consolidation_date,
        total_amount,
        total_tax_amount,
        grand_total,
        outstanding_amount,
        payment_due_date,
        invoice_status,
        billing_address,
        created_at
    ) VALUES (
        invoice_number,
        customer_id_param,
        CURRENT_DATE,
        invoice_type_param,
        consolidation_period_param,
        CURRENT_DATE,
        total_amount,
        tax_amount,
        grand_total,
        grand_total,
        CURRENT_DATE + INTERVAL '1 day' * due_days,
        'draft',
        customer_record.address,
        NOW()
    ) RETURNING id INTO invoice_id;
    
    -- Create invoice line items for each challan
    FOR challan_record IN 
        SELECT crfi.*, ci.* 
        FROM challans_ready_for_invoicing crfi
        JOIN challan_items ci ON crfi.id = ci.delivery_challan_id
        WHERE crfi.id = ANY(challan_ids)
        ORDER BY crfi.challan_number, ci.material_type
    LOOP
        INSERT INTO invoice_line_items (
            invoice_id,
            challan_id,
            order_id,
            order_item_id,
            line_number,
            item_description,
            quantity,
            rate_per_unit,
            gross_amount,
            taxable_amount,
            cgst_rate,
            sgst_rate,
            cgst_amount,
            sgst_amount,
            total_tax_amount,
            line_total,
            delivery_date
        ) VALUES (
            invoice_id,
            challan_record.id,
            challan_record.order_id,
            challan_record.order_item_id,
            line_number,
            'Textile Printing - ' || challan_record.material_type || ' (DC: ' || challan_record.challan_number || ')',
            challan_record.quantity_delivered,
            challan_record.unit_price,
            challan_record.quantity_delivered * challan_record.unit_price,
            challan_record.quantity_delivered * challan_record.unit_price,
            9.00,
            9.00,
            (challan_record.quantity_delivered * challan_record.unit_price) * 0.09,
            (challan_record.quantity_delivered * challan_record.unit_price) * 0.09,
            (challan_record.quantity_delivered * challan_record.unit_price) * 0.18,
            (challan_record.quantity_delivered * challan_record.unit_price) * 1.18,
            challan_record.delivery_date
        );
        
        line_number := line_number + 1;
    END LOOP;
    
    -- Link challans to invoice
    FOR challan_record IN 
        SELECT * FROM challans_ready_for_invoicing 
        WHERE id = ANY(challan_ids)
    LOOP
        INSERT INTO invoice_challans (
            invoice_id,
            challan_id,
            is_partial,
            invoiced_amount,
            tax_amount,
            total_amount,
            billing_status
        ) VALUES (
            invoice_id,
            challan_record.id,
            FALSE,
            challan_record.remaining_amount,
            challan_record.remaining_amount * 0.18,
            challan_record.remaining_amount * 1.18,
            'fully_billed'
        );
    END LOOP;
    
    RETURN invoice_id;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for consolidated invoices
CREATE SEQUENCE IF NOT EXISTS consolidated_invoice_seq START 1;

-- Function: Create partial invoice from single challan
CREATE OR REPLACE FUNCTION create_partial_invoice(
    challan_id_param UUID,
    partial_percentage_param DECIMAL,
    invoice_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    invoice_id UUID;
    challan_record RECORD;
    partial_amount DECIMAL(10,2);
    tax_amount DECIMAL(10,2);
    total_amount DECIMAL(10,2);
BEGIN
    -- Validate inputs
    IF partial_percentage_param <= 0 OR partial_percentage_param > 100 THEN
        RAISE EXCEPTION 'Partial percentage must be between 0 and 100';
    END IF;
    
    -- Get challan details
    SELECT * INTO challan_record 
    FROM challans_ready_for_invoicing 
    WHERE id = challan_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Challan not found or not ready for invoicing';
    END IF;
    
    -- Calculate amounts
    partial_amount := challan_record.remaining_amount * (partial_percentage_param / 100);
    tax_amount := partial_amount * 0.18;
    total_amount := partial_amount + tax_amount;
    
    -- Create invoice using existing function logic (simplified)
    SELECT create_consolidated_invoice(
        challan_record.customer_id,
        ARRAY[challan_id_param],
        'partial'
    ) INTO invoice_id;
    
    -- Update the invoice amounts for partial billing
    UPDATE gst_invoices 
    SET 
        total_amount = partial_amount,
        total_tax_amount = tax_amount,
        grand_total = total_amount,
        outstanding_amount = total_amount,
        customer_notes = invoice_notes
    WHERE id = invoice_id;
    
    -- Update invoice-challan relationship for partial
    UPDATE invoice_challans 
    SET 
        is_partial = TRUE,
        partial_percentage = partial_percentage_param,
        partial_amount = partial_amount,
        remaining_amount = challan_record.remaining_amount - partial_amount,
        billing_status = 'partially_billed'
    WHERE invoice_id = invoice_id AND challan_id = challan_id_param;
    
    RETURN invoice_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Get available billing combinations
CREATE OR REPLACE FUNCTION get_billing_suggestions(customer_id_param UUID DEFAULT NULL)
RETURNS TABLE (
    suggestion_type TEXT,
    customer_id UUID,
    customer_name TEXT,
    challan_ids UUID[],
    challan_numbers TEXT[],
    total_amount DECIMAL,
    challan_count INTEGER,
    oldest_delivery DATE,
    newest_delivery DATE
) AS $$
BEGIN
    -- Daily consolidation suggestions
    RETURN QUERY
    SELECT 
        'daily_consolidation'::TEXT,
        crfi.customer_id,
        crfi.customer_name,
        array_agg(crfi.id) as challan_ids,
        array_agg(crfi.challan_number) as challan_numbers,
        SUM(crfi.remaining_amount) as total_amount,
        COUNT(*)::INTEGER as challan_count,
        MIN(crfi.delivery_date) as oldest_delivery,
        MAX(crfi.delivery_date) as newest_delivery
    FROM challans_ready_for_invoicing crfi
    WHERE (customer_id_param IS NULL OR crfi.customer_id = customer_id_param)
    AND crfi.billing_status = 'not_billed'
    GROUP BY crfi.customer_id, crfi.customer_name, crfi.delivery_date
    HAVING COUNT(*) > 1
    
    UNION ALL
    
    -- Weekly consolidation suggestions  
    SELECT 
        'weekly_consolidation'::TEXT,
        crfi.customer_id,
        crfi.customer_name,
        array_agg(crfi.id) as challan_ids,
        array_agg(crfi.challan_number) as challan_numbers,
        SUM(crfi.remaining_amount) as total_amount,
        COUNT(*)::INTEGER as challan_count,
        MIN(crfi.delivery_date) as oldest_delivery,
        MAX(crfi.delivery_date) as newest_delivery
    FROM challans_ready_for_invoicing crfi
    WHERE (customer_id_param IS NULL OR crfi.customer_id = customer_id_param)
    AND crfi.billing_status = 'not_billed'
    AND crfi.delivery_date >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY crfi.customer_id, crfi.customer_name
    HAVING COUNT(*) >= 2 AND SUM(crfi.remaining_amount) >= 10000 -- Minimum amount threshold
    
    ORDER BY total_amount DESC, challan_count DESC;
END;
$$ LANGUAGE plpgsql;

-- ====================
-- PERFORMANCE INDEXES
-- ====================

-- Invoice Line Items Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_line_items_invoice ON invoice_line_items(invoice_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_line_items_challan ON invoice_line_items(challan_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_line_items_order ON invoice_line_items(order_id);

-- Enhanced Invoice Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gst_invoices_type_status ON gst_invoices(invoice_type, invoice_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gst_invoices_consolidation ON gst_invoices(consolidation_period, consolidation_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gst_invoices_approval ON gst_invoices(approval_required, approved_at) WHERE approval_required = TRUE;

-- Invoice Challans Enhanced Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_challans_partial ON invoice_challans(is_partial, billing_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_challans_billing_status ON invoice_challans(billing_status, created_at);

-- Templates and Approvals
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_templates_active ON invoice_templates(is_active, is_default) WHERE is_active = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_approvals_pending ON invoice_approvals(approval_status, approver_id) WHERE approval_status = 'pending';

-- ====================
-- MIGRATION VALIDATION
-- ====================

DO $$
DECLARE
    table_count INTEGER;
    required_tables TEXT[] := ARRAY[
        'invoice_line_items', 'invoice_templates', 'invoice_approvals'
    ];
    table_name TEXT;
    function_count INTEGER;
BEGIN
    -- Validate tables
    FOREACH table_name IN ARRAY required_tables LOOP
        SELECT COUNT(*) INTO table_count
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = table_name;
        
        IF table_count = 0 THEN
            RAISE EXCEPTION 'Required table % was not created', table_name;
        END IF;
        
        RAISE NOTICE 'Table % created successfully', table_name;
    END LOOP;
    
    -- Validate key functions
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines
    WHERE routine_schema = 'public' 
    AND routine_name = 'create_consolidated_invoice';
    
    IF function_count = 0 THEN
        RAISE EXCEPTION 'Required function create_consolidated_invoice was not created';
    END IF;
    
    RAISE NOTICE 'Enhanced Invoice-Challan Workflow migration completed successfully';
END $$;

-- Insert default invoice template
INSERT INTO invoice_templates (
    template_name,
    template_type,
    terms_and_conditions,
    payment_instructions,
    is_default,
    is_active
) VALUES (
    'Standard GST Invoice',
    'standard',
    'Payment due within 30 days of invoice date. Interest @ 2% per month will be charged on overdue amounts.',
    'Please make payment by cheque/DD in favor of Company Name or transfer to Bank Account: XXXXXXXXXX, IFSC: XXXXXXX',
    TRUE,
    TRUE
) ON CONFLICT (template_name) DO NOTHING;

-- Migration completion log
INSERT INTO deployment_history (
    deployment_type,
    script_name,
    status,
    description
) VALUES (
    'schema_enhancement',
    '10_ENHANCED_INVOICE_CHALLAN_WORKFLOW.sql',
    'completed',
    'Enhanced invoicing system with support for consolidated billing, partial invoicing, and advanced workflow management'
);

-- Final summary
SELECT 
    'WORKFLOW ENHANCEMENT COMPLETE' as status,
    'Enhanced Invoice-Challan Workflow with Multi-DC Support' as description,
    NOW() as completed_at;