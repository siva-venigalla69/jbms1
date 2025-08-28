-- =====================================
-- CORRECTED ENHANCED INVOICE CHALLAN WORKFLOW
-- Migration 10: Using actual database schema data types  
-- VARCHAR for: material_types, production_stages, user_roles, order_statuses, payment_methods
-- UUID for: customers, orders, order_items, gst_invoices, user_profiles
-- =====================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================
-- GST INVOICES ENHANCEMENTS
-- ====================

-- Add advanced invoice features to existing gst_invoices table
ALTER TABLE gst_invoices
ADD COLUMN IF NOT EXISTS payment_due_date DATE,
ADD COLUMN IF NOT EXISTS total_tax_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) DEFAULT 0.00,
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
ADD COLUMN IF NOT EXISTS approved_by UUID,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS due_reminder_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS invoice_template VARCHAR(50) DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS custom_fields JSONB,
ADD COLUMN IF NOT EXISTS internal_notes TEXT,
ADD COLUMN IF NOT EXISTS customer_notes TEXT;

-- Update existing records to populate new columns
UPDATE gst_invoices 
SET total_tax_amount = COALESCE(cgst_amount, 0) + COALESCE(sgst_amount, 0) + COALESCE(igst_amount, 0),
    subtotal = total_amount - (COALESCE(cgst_amount, 0) + COALESCE(sgst_amount, 0) + COALESCE(igst_amount, 0))
WHERE total_tax_amount IS NULL OR subtotal IS NULL;

-- ====================
-- INVOICE LINE ITEMS SYSTEM
-- ====================

-- Detailed line items for invoices (supports multiple challans per invoice)
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
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    taxable_amount DECIMAL(10,2) NOT NULL,
    
    -- Tax Details
    cgst_rate DECIMAL(5,2) DEFAULT 0.00,
    sgst_rate DECIMAL(5,2) DEFAULT 0.00,
    igst_rate DECIMAL(5,2) DEFAULT 0.00,
    cgst_amount DECIMAL(10,2) DEFAULT 0.00,
    sgst_amount DECIMAL(10,2) DEFAULT 0.00,
    igst_amount DECIMAL(10,2) DEFAULT 0.00,
    total_tax_amount DECIMAL(10,2) DEFAULT 0.00,
    
    -- Final Amount
    line_total DECIMAL(10,2) NOT NULL,
    
    -- Additional Information
    batch_number VARCHAR(100),
    expiry_date DATE,
    manufacturing_date DATE,
    remarks TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure line numbers are unique within an invoice
    CONSTRAINT unique_line_number_per_invoice UNIQUE (invoice_id, line_number)
);

-- Add missing columns to existing invoice_challans table
ALTER TABLE invoice_challans
ADD COLUMN IF NOT EXISTS challan_amount DECIMAL(10,2) DEFAULT 0.00 CHECK (challan_amount >= 0),
ADD COLUMN IF NOT EXISTS included_percentage DECIMAL(5,2) DEFAULT 100.00 CHECK (included_percentage BETWEEN 0 AND 100),
ADD COLUMN IF NOT EXISTS partial_invoice_notes TEXT;

-- Add unique constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_invoice_challan') THEN
        ALTER TABLE invoice_challans ADD CONSTRAINT unique_invoice_challan UNIQUE (invoice_id, challan_id);
    END IF;
END $$;

-- ====================
-- INVOICE TEMPLATES AND APPROVAL WORKFLOW
-- ====================

-- Invoice Templates for different invoice types
CREATE TABLE IF NOT EXISTS invoice_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_name VARCHAR(100) NOT NULL UNIQUE,
    template_type VARCHAR(50) NOT NULL, -- 'standard', 'consolidated', 'export', etc.
    
    -- Template Configuration
    header_content TEXT,
    footer_content TEXT,
    terms_and_conditions TEXT,
    payment_instructions TEXT,
    
    -- Display Settings
    show_company_logo BOOLEAN DEFAULT TRUE,
    show_customer_details BOOLEAN DEFAULT TRUE,
    show_line_item_details BOOLEAN DEFAULT TRUE,
    show_tax_summary BOOLEAN DEFAULT TRUE,
    show_payment_terms BOOLEAN DEFAULT TRUE,
    
    -- Color and Styling
    primary_color VARCHAR(7) DEFAULT '#000000',
    secondary_color VARCHAR(7) DEFAULT '#666666',
    font_family VARCHAR(50) DEFAULT 'Arial',
    
    -- Status and Metadata
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
    approval_level INTEGER NOT NULL DEFAULT 1,
    approver_id UUID NOT NULL REFERENCES user_profiles(id),
    approval_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'delegated')),
    
    -- Approval Actions
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    approval_comments TEXT,
    delegated_to UUID REFERENCES user_profiles(id),
    
    -- Approval Rules
    minimum_amount_threshold DECIMAL(10,2),
    maximum_amount_threshold DECIMAL(10,2),
    requires_additional_approval BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================
-- ADVANCED INVOICE VIEWS  
-- ====================

-- Comprehensive Invoice Summary View
CREATE OR REPLACE VIEW invoice_summary_enhanced AS
SELECT 
    i.id,
    i.invoice_number,
    i.invoice_date,
    i.payment_due_date as due_date,
    i.invoice_type,
    i.consolidation_period,
    i.invoice_status,
    
    -- Customer Information
    c.name as customer_name,
    c.gst_number as customer_gst,
    c.phone as customer_phone,
    c.email as customer_email,
    
    -- Financial Summary
    i.total_amount - i.total_tax_amount as subtotal,
    i.total_tax_amount as total_tax,
    i.total_amount,
    i.discount_amount,
    i.shipping_charges,
    i.other_charges,
    i.round_off_amount,
    
    -- Payment Information
    i.payment_terms,
    i.currency,
    i.exchange_rate,
    
    -- Line Items Summary
    COUNT(ili.id) as total_line_items,
    SUM(ili.quantity) as total_quantity,
    
    -- Challans Summary  
    COUNT(DISTINCT ic.challan_id) as total_challans,
    STRING_AGG(DISTINCT dc.challan_number, ', ') as challan_numbers,
    
    -- Approval Status
    CASE 
        WHEN i.approval_required = FALSE THEN 'Not Required'
        WHEN EXISTS (SELECT 1 FROM invoice_approvals ia WHERE ia.invoice_id = i.id AND ia.approval_status = 'approved') THEN 'Approved'
        WHEN EXISTS (SELECT 1 FROM invoice_approvals ia WHERE ia.invoice_id = i.id AND ia.approval_status = 'rejected') THEN 'Rejected'
        ELSE 'Pending Approval'
    END as approval_status,
    
    -- Payment Status
    COALESCE(SUM(p.payment_amount), 0) as paid_amount,
    (i.total_amount - COALESCE(SUM(p.payment_amount), 0)) as outstanding_amount,
    
    -- Age Analysis
    CASE 
        WHEN i.invoice_status = 'paid' THEN 'Paid'
        WHEN CURRENT_DATE <= i.payment_due_date THEN 'Current'
        WHEN CURRENT_DATE - i.payment_due_date <= 30 THEN '1-30 Days Overdue'
        WHEN CURRENT_DATE - i.payment_due_date <= 60 THEN '31-60 Days Overdue'
        WHEN CURRENT_DATE - i.payment_due_date <= 90 THEN '61-90 Days Overdue'
        ELSE '90+ Days Overdue'
    END as aging_category,
    
    i.created_at,
    i.updated_at
    
FROM gst_invoices i
JOIN customers c ON i.customer_id = c.id
LEFT JOIN invoice_line_items ili ON i.id = ili.invoice_id
LEFT JOIN invoice_challans ic ON i.id = ic.invoice_id
LEFT JOIN delivery_challans dc ON ic.challan_id = dc.id
LEFT JOIN payments p ON i.id = p.invoice_id
GROUP BY i.id, c.id, c.name, c.gst_number, c.phone, c.email;

-- Challan to Invoice Mapping View
CREATE OR REPLACE VIEW challan_invoice_mapping AS
SELECT 
    dc.id as challan_id,
    dc.challan_number,
    dc.challan_date,
    dc.delivery_status,
    
    -- Customer Info
    c.name as customer_name,
    
    -- Invoice Information
    i.id as invoice_id,
    i.invoice_number,
    i.invoice_date,
    i.invoice_type,
    i.invoice_status,
    
    -- Financial Details
    ic.challan_amount,
    ic.included_percentage,
    (ic.challan_amount * ic.included_percentage / 100) as invoiced_amount,
    
    -- Status Analysis
    CASE 
        WHEN i.id IS NULL THEN 'Not Invoiced'
        WHEN ic.included_percentage < 100 THEN 'Partially Invoiced'
        ELSE 'Fully Invoiced'
    END as invoice_status_summary,
    
    -- Order Information
    STRING_AGG(DISTINCT o.order_number, ', ') as order_numbers,
    COUNT(DISTINCT ci.order_item_id) as total_items
    
FROM delivery_challans dc
JOIN customers c ON dc.customer_id = c.id
LEFT JOIN invoice_challans ic ON dc.id = ic.challan_id
LEFT JOIN gst_invoices i ON ic.invoice_id = i.id
LEFT JOIN challan_items ci ON dc.id = ci.challan_id
LEFT JOIN order_items oi ON ci.order_item_id = oi.id
LEFT JOIN orders o ON oi.order_id = o.id
GROUP BY dc.id, dc.challan_number, dc.challan_date, dc.delivery_status, 
         c.name, i.id, i.invoice_number, i.invoice_date, i.invoice_type, i.invoice_status,
         ic.challan_amount, ic.included_percentage;

-- ====================
-- BUSINESS LOGIC FUNCTIONS
-- ====================

-- Function to create consolidated invoice from multiple challans
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
    challan_record RECORD;
    challan_id_var UUID;
    line_number INTEGER := 1;
    total_amount DECIMAL(10,2) := 0;
    total_tax DECIMAL(10,2) := 0;
    subtotal DECIMAL(10,2) := 0;
BEGIN
    -- Generate invoice number
    SELECT 'INV-' || to_char(CURRENT_DATE, 'YYYYMM') || '-' || 
           LPAD((COALESCE(MAX(EXTRACT(DAY FROM invoice_date)::INTEGER), 0) + 1)::TEXT, 4, '0')
    INTO invoice_number
    FROM gst_invoices 
    WHERE DATE_TRUNC('month', invoice_date) = DATE_TRUNC('month', CURRENT_DATE);
    
    -- Create the invoice
    INSERT INTO gst_invoices (
        invoice_number, customer_id, invoice_date, payment_due_date, 
        invoice_type, consolidation_period, consolidation_date,
        invoice_status, created_at
    ) VALUES (
        invoice_number, customer_id_param, CURRENT_DATE, CURRENT_DATE + due_days,
        invoice_type_param, consolidation_period_param, CURRENT_DATE,
        'draft', NOW()
    ) RETURNING id INTO invoice_id;
    
    -- Process each challan
    FOREACH challan_id_var IN ARRAY challan_ids LOOP
        -- Link challan to invoice
        INSERT INTO invoice_challans (invoice_id, challan_id, challan_amount)
        SELECT invoice_id, dc.id, 
               COALESCE(SUM(ci.quantity * oi.unit_price), 0)
        FROM delivery_challans dc
        LEFT JOIN challan_items ci ON dc.id = ci.challan_id
        LEFT JOIN order_items oi ON ci.order_item_id = oi.id
        WHERE dc.id = challan_id_var
        GROUP BY dc.id;
        
        -- Create line items from challan items
        FOR challan_record IN 
            SELECT ci.*, oi.unit_price, mt.name as material_name,
                   dc.challan_number, o.order_number
            FROM challan_items ci
            JOIN order_items oi ON ci.order_item_id = oi.id
            JOIN orders o ON oi.order_id = o.id
            JOIN material_types mt ON oi.material_type = mt.id
            JOIN delivery_challans dc ON ci.challan_id = dc.id
            WHERE ci.challan_id = ANY(challan_ids)
        LOOP
            INSERT INTO invoice_line_items (
                invoice_id, challan_id, order_id, order_item_id,
                line_number, item_description, quantity, unit_of_measurement,
                rate_per_unit, gross_amount, taxable_amount, line_total
            ) VALUES (
                invoice_id, challan_record.challan_id, challan_record.order_id, challan_record.order_item_id,
                line_number, 
                challan_record.material_name || ' (Order: ' || challan_record.order_number || ', Challan: ' || challan_record.challan_number || ')',
                challan_record.quantity, 'Pcs',
                challan_record.unit_price, 
                challan_record.quantity * challan_record.unit_price,
                challan_record.quantity * challan_record.unit_price,
                challan_record.quantity * challan_record.unit_price
            );
            
            subtotal := subtotal + (challan_record.quantity * challan_record.unit_price);
            line_number := line_number + 1;
        END LOOP;
    END LOOP;
    
    -- Update invoice totals
    UPDATE gst_invoices 
    SET subtotal = subtotal,
        total_tax = total_tax,
        total_amount = subtotal + total_tax
    WHERE id = invoice_id;
    
    RETURN invoice_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create partial invoice from challan
CREATE OR REPLACE FUNCTION create_partial_invoice(
    challan_id_param UUID,
    partial_percentage DECIMAL DEFAULT 100.00,
    due_days INTEGER DEFAULT 30
)
RETURNS UUID AS $$
DECLARE
    invoice_id UUID;
    challan_record RECORD;
    customer_id_val UUID;
BEGIN
    -- Get challan details
    SELECT dc.*, c.id as customer_id INTO challan_record
    FROM delivery_challans dc
    JOIN customers c ON dc.customer_id = c.id
    WHERE dc.id = challan_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Challan not found: %', challan_id_param;
    END IF;
    
    -- Create partial invoice
    SELECT create_consolidated_invoice(
        challan_record.customer_id,
        ARRAY[challan_id_param],
        'partial',
        NULL,
        due_days
    ) INTO invoice_id;
    
    -- Update the challan-invoice link with partial percentage
    UPDATE invoice_challans 
    SET included_percentage = partial_percentage,
        partial_invoice_notes = 'Partial invoice at ' || partial_percentage || '%'
    WHERE invoice_id = invoice_id AND challan_id = challan_id_param;
    
    -- Update line item amounts based on percentage
    UPDATE invoice_line_items 
    SET gross_amount = gross_amount * partial_percentage / 100,
        taxable_amount = taxable_amount * partial_percentage / 100,
        line_total = line_total * partial_percentage / 100
    WHERE invoice_id = invoice_id;
    
    -- Recalculate invoice totals
    UPDATE gst_invoices 
    SET subtotal = (SELECT SUM(taxable_amount) FROM invoice_line_items WHERE invoice_id = gst_invoices.id),
        total_amount = (SELECT SUM(line_total) FROM invoice_line_items WHERE invoice_id = gst_invoices.id)
    WHERE id = invoice_id;
    
    RETURN invoice_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get billing suggestions
CREATE OR REPLACE FUNCTION get_billing_suggestions(customer_id_param UUID DEFAULT NULL)
RETURNS TABLE (
    customer_id UUID,
    customer_name VARCHAR,
    unbilled_challans_count BIGINT,
    total_unbilled_amount DECIMAL,
    oldest_challan_date DATE,
    suggested_action TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        COUNT(dc.id),
        COALESCE(SUM(challan_totals.total_amount), 0),
        MIN(dc.challan_date),
        CASE 
            WHEN COUNT(dc.id) >= 5 THEN 'Create consolidated invoice'
            WHEN MIN(dc.challan_date) < CURRENT_DATE - INTERVAL '7 days' THEN 'Invoice overdue'
            WHEN COUNT(dc.id) >= 1 THEN 'Ready for invoicing'
            ELSE 'No action needed'
        END
    FROM customers c
    LEFT JOIN delivery_challans dc ON c.id = dc.customer_id
    LEFT JOIN (
        SELECT 
            ci.challan_id,
            SUM(ci.quantity * oi.unit_price) as total_amount
        FROM challan_items ci 
        JOIN order_items oi ON ci.order_item_id = oi.id 
        GROUP BY ci.challan_id
    ) challan_totals ON dc.id = challan_totals.challan_id
    WHERE dc.delivery_status = 'delivered'
    AND NOT EXISTS (
        SELECT 1 FROM invoice_challans ic WHERE ic.challan_id = dc.id
    )
    AND (customer_id_param IS NULL OR c.id = customer_id_param)
    GROUP BY c.id, c.name
    HAVING COUNT(dc.id) > 0
    ORDER BY COUNT(dc.id) DESC, MIN(dc.challan_date) ASC;
END;
$$ LANGUAGE plpgsql;

-- ====================
-- AUTOMATION TRIGGERS
-- ====================

-- Auto-calculate line item totals
CREATE OR REPLACE FUNCTION calculate_line_item_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate amounts
    NEW.gross_amount := NEW.quantity * NEW.rate_per_unit;
    NEW.taxable_amount := NEW.gross_amount - COALESCE(NEW.discount_amount, 0);
    
    -- Calculate tax amounts
    NEW.cgst_amount := NEW.taxable_amount * COALESCE(NEW.cgst_rate, 0) / 100;
    NEW.sgst_amount := NEW.taxable_amount * COALESCE(NEW.sgst_rate, 0) / 100;
    NEW.igst_amount := NEW.taxable_amount * COALESCE(NEW.igst_rate, 0) / 100;
    NEW.total_tax_amount := NEW.cgst_amount + NEW.sgst_amount + NEW.igst_amount;
    
    -- Final total
    NEW.line_total := NEW.taxable_amount + NEW.total_tax_amount;
    
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create line item calculation trigger
DROP TRIGGER IF EXISTS tr_calculate_line_totals ON invoice_line_items;
CREATE TRIGGER tr_calculate_line_totals
    BEFORE INSERT OR UPDATE ON invoice_line_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_line_item_totals();

-- Auto-update invoice totals when line items change
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
    invoice_id_val UUID;
BEGIN
    -- Get invoice ID from either NEW or OLD record
    invoice_id_val := COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    -- Recalculate invoice totals
    UPDATE gst_invoices 
    SET 
        total_tax_amount = COALESCE((
            SELECT SUM(total_tax_amount) 
            FROM invoice_line_items 
            WHERE invoice_id = invoice_id_val
        ), 0),
        updated_at = NOW()
    WHERE id = invoice_id_val;
    
    -- Update final total amount
    UPDATE gst_invoices 
    SET total_amount = subtotal + total_tax + COALESCE(shipping_charges, 0) + 
                      COALESCE(other_charges, 0) - COALESCE(discount_amount, 0) + 
                      COALESCE(round_off_amount, 0)
    WHERE id = invoice_id_val;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create invoice totals trigger
DROP TRIGGER IF EXISTS tr_update_invoice_totals ON invoice_line_items;
CREATE TRIGGER tr_update_invoice_totals
    AFTER INSERT OR UPDATE OR DELETE ON invoice_line_items
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_totals();

-- ====================
-- PERFORMANCE INDEXES
-- ====================

-- Invoice Line Items Indexes
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_challan ON invoice_line_items(challan_id) WHERE challan_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_order ON invoice_line_items(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_design ON invoice_line_items(design_id) WHERE design_id IS NOT NULL;

-- Invoice Challans Indexes
CREATE INDEX IF NOT EXISTS idx_invoice_challans_invoice ON invoice_challans(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_challans_challan ON invoice_challans(challan_id);

-- Invoice Approvals Indexes
CREATE INDEX IF NOT EXISTS idx_invoice_approvals_invoice ON invoice_approvals(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_approvals_status ON invoice_approvals(approval_status);
CREATE INDEX IF NOT EXISTS idx_invoice_approvals_approver ON invoice_approvals(approver_id);

-- Enhanced GST Invoices Indexes
CREATE INDEX IF NOT EXISTS idx_gst_invoices_type ON gst_invoices(invoice_type);
CREATE INDEX IF NOT EXISTS idx_gst_invoices_status ON gst_invoices(invoice_status);
CREATE INDEX IF NOT EXISTS idx_gst_invoices_consolidation ON gst_invoices(consolidation_date) WHERE consolidation_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gst_invoices_approval_required ON gst_invoices(approval_required) WHERE approval_required = TRUE;

SELECT 'Migration 10 completed successfully with corrected data types!' as result;