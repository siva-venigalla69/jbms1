-- ENHANCED SCHEMA FOR UX-FOCUSED SYSTEM
-- This plan includes QC tracking, invoice editing, and UX improvements

-- =====================================================
-- PART 1: Enhanced Production Workflow
-- =====================================================

-- Add QC tracking columns to order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS quality_checked_by UUID REFERENCES users(id);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS quality_check_date TIMESTAMPTZ;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS qc_pass_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS qc_notes TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS qc_images TEXT[]; -- Store QC photo URLs
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS rework_count INTEGER DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS rework_reason TEXT;

-- Update production_status constraint to include new stages
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS chk_production_status;
ALTER TABLE order_items ADD CONSTRAINT chk_production_status 
CHECK (production_status IN ('pending', 'pre_treatment', 'printing', 'post_process', 'quality_check', 'completed', 'rework'));

-- Add QC pass status constraint
ALTER TABLE order_items ADD CONSTRAINT chk_qc_pass_status 
CHECK (qc_pass_status IN ('pending', 'pass', 'fail', 'rework'));

-- =====================================================
-- PART 2: Enhanced Invoice Management
-- =====================================================

-- Add invoice editing and tracking columns
ALTER TABLE gst_invoices ADD COLUMN IF NOT EXISTS invoice_status VARCHAR(20) DEFAULT 'draft';
ALTER TABLE gst_invoices ADD COLUMN IF NOT EXISTS revision_number INTEGER DEFAULT 1;
ALTER TABLE gst_invoices ADD COLUMN IF NOT EXISTS sent_date TIMESTAMPTZ;
ALTER TABLE gst_invoices ADD COLUMN IF NOT EXISTS sent_by UUID REFERENCES users(id);
ALTER TABLE gst_invoices ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES users(id);
ALTER TABLE gst_invoices ADD COLUMN IF NOT EXISTS last_edited_date TIMESTAMPTZ;
ALTER TABLE gst_invoices ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE gst_invoices ADD COLUMN IF NOT EXISTS email_sent_date TIMESTAMPTZ;
ALTER TABLE gst_invoices ADD COLUMN IF NOT EXISTS payment_received_date TIMESTAMPTZ;
ALTER TABLE gst_invoices ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT FALSE;
ALTER TABLE gst_invoices ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Add invoice status constraint
ALTER TABLE gst_invoices ADD CONSTRAINT chk_invoice_status 
CHECK (invoice_status IN ('draft', 'ready', 'sent', 'paid', 'overdue', 'cancelled'));

-- Create invoice revision history table
CREATE TABLE IF NOT EXISTS invoice_revisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES gst_invoices(id) ON DELETE CASCADE,
    revision_number INTEGER NOT NULL,
    changed_by UUID REFERENCES users(id),
    changed_date TIMESTAMPTZ DEFAULT NOW(),
    changes_description TEXT,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PART 3: Invoice-Challan Relationship Tracking
-- =====================================================

-- Create invoice sources tracking (what generated each invoice)
CREATE TABLE IF NOT EXISTS invoice_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES gst_invoices(id) ON DELETE CASCADE,
    source_type VARCHAR(20) NOT NULL, -- 'challan', 'order', 'manual'
    source_id UUID NOT NULL, -- challan_id or order_id
    line_items JSONB, -- Store specific items invoiced
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_source_type CHECK (source_type IN ('challan', 'order', 'manual'))
);

-- Add challan invoicing status
ALTER TABLE delivery_challans ADD COLUMN IF NOT EXISTS is_invoiced BOOLEAN DEFAULT FALSE;
ALTER TABLE delivery_challans ADD COLUMN IF NOT EXISTS invoiced_date TIMESTAMPTZ;
ALTER TABLE delivery_challans ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES gst_invoices(id);

-- Add order invoicing status  
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_fully_invoiced BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS partial_invoice_count INTEGER DEFAULT 0;

-- =====================================================
-- PART 4: UX Enhancement Tables
-- =====================================================

-- Create user activity log for audit trail
CREATE TABLE IF NOT EXISTS user_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    activity_type VARCHAR(50) NOT NULL, -- 'qc_completed', 'invoice_created', 'invoice_edited', etc.
    entity_type VARCHAR(50) NOT NULL, -- 'order_item', 'invoice', 'challan'
    entity_id UUID NOT NULL,
    description TEXT,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notification system for smart alerts
CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    notification_type VARCHAR(50) NOT NULL, -- 'qc_pending', 'invoice_ready', 'challan_uninvoiced'
    title VARCHAR(200) NOT NULL,
    message TEXT,
    entity_type VARCHAR(50), -- 'order_item', 'invoice', 'challan'
    entity_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- Create system settings for UX preferences
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB,
    description TEXT,
    is_user_configurable BOOLEAN DEFAULT TRUE,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PART 5: Indexes for Performance
-- =====================================================

-- Indexes for QC tracking
CREATE INDEX IF NOT EXISTS idx_order_items_qc_status ON order_items(qc_pass_status);
CREATE INDEX IF NOT EXISTS idx_order_items_qc_date ON order_items(quality_check_date);
CREATE INDEX IF NOT EXISTS idx_order_items_qc_user ON order_items(quality_checked_by);

-- Indexes for invoice management
CREATE INDEX IF NOT EXISTS idx_invoices_status ON gst_invoices(invoice_status);
CREATE INDEX IF NOT EXISTS idx_invoices_sent_date ON gst_invoices(sent_date);
CREATE INDEX IF NOT EXISTS idx_invoice_sources_type_id ON invoice_sources(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_challan_invoiced ON delivery_challans(is_invoiced);

-- Indexes for activity logging
CREATE INDEX IF NOT EXISTS idx_activity_log_user_date ON user_activity_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON user_activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON user_notifications(user_id, is_read);

-- =====================================================
-- PART 6: Sample Settings Data
-- =====================================================

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('default_qc_user', '{"user_id": null, "auto_assign": false}', 'Default user for QC assignments'),
('invoice_auto_number', '{"enabled": true, "prefix": "INV", "format": "INV-{YYYY}-{####}"}', 'Invoice auto-numbering settings'),
('email_templates', '{"invoice": {"subject": "Invoice #{invoice_number} from {company_name}", "body": "Please find attached invoice."}}', 'Email templates for notifications'),
('print_settings', '{"default_printer": "", "invoice_copies": 2, "challan_copies": 3}', 'Default print settings'),
('ui_preferences', '{"theme": "light", "items_per_page": 25, "auto_refresh_interval": 30}', 'UI preferences')
ON CONFLICT (setting_key) DO NOTHING;