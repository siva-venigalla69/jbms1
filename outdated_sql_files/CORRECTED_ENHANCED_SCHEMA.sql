-- CORRECTED ENHANCED SCHEMA - Works with existing database structure
-- Uses user_profiles table instead of users table

-- =====================================================
-- PART 1: Enhanced Production Workflow
-- =====================================================

-- Add QC tracking columns to order_items (only if they don't exist)
DO $$
BEGIN
    -- Add quality_checked_by column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'quality_checked_by') THEN
        ALTER TABLE order_items ADD COLUMN quality_checked_by UUID;
        -- Add foreign key constraint to user_profiles
        ALTER TABLE order_items ADD CONSTRAINT fk_order_items_quality_checked_by 
        FOREIGN KEY (quality_checked_by) REFERENCES user_profiles(id);
        RAISE NOTICE 'Added quality_checked_by column';
    END IF;
    
    -- Add other QC columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'quality_check_date') THEN
        ALTER TABLE order_items ADD COLUMN quality_check_date TIMESTAMPTZ;
        RAISE NOTICE 'Added quality_check_date column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'qc_pass_status') THEN
        ALTER TABLE order_items ADD COLUMN qc_pass_status VARCHAR(20) DEFAULT 'pending';
        RAISE NOTICE 'Added qc_pass_status column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'qc_notes') THEN
        ALTER TABLE order_items ADD COLUMN qc_notes TEXT;
        RAISE NOTICE 'Added qc_notes column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'qc_images') THEN
        ALTER TABLE order_items ADD COLUMN qc_images TEXT[];
        RAISE NOTICE 'Added qc_images column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'rework_count') THEN
        ALTER TABLE order_items ADD COLUMN rework_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added rework_count column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'rework_reason') THEN
        ALTER TABLE order_items ADD COLUMN rework_reason TEXT;
        RAISE NOTICE 'Added rework_reason column';
    END IF;
END $$;

-- Update production_status constraint to include new stages
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'chk_production_status') THEN
        ALTER TABLE order_items DROP CONSTRAINT chk_production_status;
    END IF;
    
    -- Add updated constraint
    ALTER TABLE order_items ADD CONSTRAINT chk_production_status 
    CHECK (production_status IN ('pending', 'pre_treatment', 'printing', 'post_process', 'quality_check', 'completed', 'rework'));
    
    RAISE NOTICE 'Updated production_status constraint with new stages';
END $$;

-- Add QC pass status constraint
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'chk_qc_pass_status') THEN
        ALTER TABLE order_items ADD CONSTRAINT chk_qc_pass_status 
        CHECK (qc_pass_status IN ('pending', 'pass', 'fail', 'rework'));
        RAISE NOTICE 'Added QC pass status constraint';
    END IF;
END $$;

-- =====================================================
-- PART 2: Enhanced Invoice Management
-- =====================================================

-- Add invoice editing and tracking columns to gst_invoices
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gst_invoices' AND column_name = 'invoice_status') THEN
        ALTER TABLE gst_invoices ADD COLUMN invoice_status VARCHAR(20) DEFAULT 'draft';
        RAISE NOTICE 'Added invoice_status column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gst_invoices' AND column_name = 'revision_number') THEN
        ALTER TABLE gst_invoices ADD COLUMN revision_number INTEGER DEFAULT 1;
        RAISE NOTICE 'Added revision_number column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gst_invoices' AND column_name = 'sent_date') THEN
        ALTER TABLE gst_invoices ADD COLUMN sent_date TIMESTAMPTZ;
        RAISE NOTICE 'Added sent_date column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gst_invoices' AND column_name = 'sent_by') THEN
        ALTER TABLE gst_invoices ADD COLUMN sent_by UUID;
        ALTER TABLE gst_invoices ADD CONSTRAINT fk_gst_invoices_sent_by 
        FOREIGN KEY (sent_by) REFERENCES user_profiles(id);
        RAISE NOTICE 'Added sent_by column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gst_invoices' AND column_name = 'last_edited_by') THEN
        ALTER TABLE gst_invoices ADD COLUMN last_edited_by UUID;
        ALTER TABLE gst_invoices ADD CONSTRAINT fk_gst_invoices_last_edited_by 
        FOREIGN KEY (last_edited_by) REFERENCES user_profiles(id);
        RAISE NOTICE 'Added last_edited_by column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gst_invoices' AND column_name = 'last_edited_date') THEN
        ALTER TABLE gst_invoices ADD COLUMN last_edited_date TIMESTAMPTZ;
        RAISE NOTICE 'Added last_edited_date column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gst_invoices' AND column_name = 'email_sent') THEN
        ALTER TABLE gst_invoices ADD COLUMN email_sent BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added email_sent column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gst_invoices' AND column_name = 'email_sent_date') THEN
        ALTER TABLE gst_invoices ADD COLUMN email_sent_date TIMESTAMPTZ;
        RAISE NOTICE 'Added email_sent_date column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gst_invoices' AND column_name = 'payment_received_date') THEN
        ALTER TABLE gst_invoices ADD COLUMN payment_received_date TIMESTAMPTZ;
        RAISE NOTICE 'Added payment_received_date column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gst_invoices' AND column_name = 'is_cancelled') THEN
        ALTER TABLE gst_invoices ADD COLUMN is_cancelled BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_cancelled column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gst_invoices' AND column_name = 'cancellation_reason') THEN
        ALTER TABLE gst_invoices ADD COLUMN cancellation_reason TEXT;
        RAISE NOTICE 'Added cancellation_reason column';
    END IF;
END $$;

-- Add invoice status constraint
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'chk_invoice_status') THEN
        ALTER TABLE gst_invoices ADD CONSTRAINT chk_invoice_status 
        CHECK (invoice_status IN ('draft', 'ready', 'sent', 'paid', 'overdue', 'cancelled'));
        RAISE NOTICE 'Added invoice status constraint';
    END IF;
END $$;

-- Create invoice revision history table
CREATE TABLE IF NOT EXISTS invoice_revisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES gst_invoices(id) ON DELETE CASCADE,
    revision_number INTEGER NOT NULL,
    changed_by UUID REFERENCES user_profiles(id),
    changed_date TIMESTAMPTZ DEFAULT NOW(),
    changes_description TEXT,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PART 3: Invoice-Challan Relationship Tracking
-- =====================================================

-- Create enhanced invoice sources tracking (you already have invoice_challans table)
CREATE TABLE IF NOT EXISTS invoice_sources_enhanced (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES gst_invoices(id) ON DELETE CASCADE,
    source_type VARCHAR(20) NOT NULL, -- 'challan', 'order', 'manual'
    source_id UUID NOT NULL, -- challan_id or order_id
    line_items JSONB, -- Store specific items invoiced
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_source_type CHECK (source_type IN ('challan', 'order', 'manual'))
);

-- Add challan invoicing status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_challans' AND column_name = 'is_invoiced') THEN
        ALTER TABLE delivery_challans ADD COLUMN is_invoiced BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_invoiced column to delivery_challans';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_challans' AND column_name = 'invoiced_date') THEN
        ALTER TABLE delivery_challans ADD COLUMN invoiced_date TIMESTAMPTZ;
        RAISE NOTICE 'Added invoiced_date column to delivery_challans';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_challans' AND column_name = 'invoice_id') THEN
        ALTER TABLE delivery_challans ADD COLUMN invoice_id UUID;
        ALTER TABLE delivery_challans ADD CONSTRAINT fk_delivery_challans_invoice_id 
        FOREIGN KEY (invoice_id) REFERENCES gst_invoices(id);
        RAISE NOTICE 'Added invoice_id column to delivery_challans';
    END IF;
END $$;

-- Add order invoicing status  
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'is_fully_invoiced') THEN
        ALTER TABLE orders ADD COLUMN is_fully_invoiced BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_fully_invoiced column to orders';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'partial_invoice_count') THEN
        ALTER TABLE orders ADD COLUMN partial_invoice_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added partial_invoice_count column to orders';
    END IF;
END $$;

-- =====================================================
-- PART 4: Activity Log and Notifications
-- =====================================================

-- Create user activity log for audit trail (using user_profiles)
CREATE TABLE IF NOT EXISTS user_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id),
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
    user_id UUID REFERENCES user_profiles(id),
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
    updated_by UUID REFERENCES user_profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PART 5: Performance Indexes
-- =====================================================

-- Indexes for QC tracking
CREATE INDEX IF NOT EXISTS idx_order_items_qc_status ON order_items(qc_pass_status);
CREATE INDEX IF NOT EXISTS idx_order_items_qc_date ON order_items(quality_check_date);
CREATE INDEX IF NOT EXISTS idx_order_items_qc_user ON order_items(quality_checked_by);
CREATE INDEX IF NOT EXISTS idx_order_items_production_status ON order_items(production_status);

-- Indexes for invoice management
CREATE INDEX IF NOT EXISTS idx_invoices_status ON gst_invoices(invoice_status);
CREATE INDEX IF NOT EXISTS idx_invoices_sent_date ON gst_invoices(sent_date);
CREATE INDEX IF NOT EXISTS idx_invoice_sources_type_id ON invoice_sources_enhanced(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_challan_invoiced ON delivery_challans(is_invoiced);

-- Indexes for activity logging
CREATE INDEX IF NOT EXISTS idx_activity_log_user_date ON user_activity_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON user_activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON user_notifications(user_id, is_read);

-- =====================================================
-- PART 6: Insert Default System Settings
-- =====================================================

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('default_qc_user', '{"user_id": null, "auto_assign": false}', 'Default user for QC assignments'),
('invoice_auto_number', '{"enabled": true, "prefix": "INV", "format": "INV-{YYYY}-{####}"}', 'Invoice auto-numbering settings'),
('email_templates', '{"invoice": {"subject": "Invoice #{invoice_number} from {company_name}", "body": "Please find attached invoice."}}', 'Email templates for notifications'),
('print_settings', '{"default_printer": "", "invoice_copies": 2, "challan_copies": 3}', 'Default print settings'),
('ui_preferences', '{"theme": "light", "items_per_page": 25, "auto_refresh_interval": 30}', 'UI preferences')
ON CONFLICT (setting_key) DO NOTHING;

-- =====================================================
-- PART 7: Create Legacy Compatibility View
-- =====================================================

-- Create view for legacy column names (for frontend compatibility)
CREATE OR REPLACE VIEW order_items_legacy AS 
SELECT 
    oi.*,
    -- Map design_status to legacy design_stage  
    CASE oi.design_status
        WHEN 'pending_from_customer' THEN 'design_pending'
        WHEN 'design_received_from_customer' THEN 'design_received'  
        WHEN 'design_ready' THEN 'design_ready'
        ELSE 'design_pending'
    END as design_stage,
    
    -- Map production_status to legacy fabric_stage
    oi.production_status as fabric_stage,
    
    -- Add QC information
    up.full_name as qc_person_name,
    oi.quality_check_date as qc_completed_at,
    CASE oi.qc_pass_status
        WHEN 'pass' THEN '✅ Passed'
        WHEN 'fail' THEN '❌ Failed'
        WHEN 'rework' THEN '🔄 Rework'
        ELSE '⏳ Pending'
    END as qc_status_display
    
FROM order_items oi
LEFT JOIN user_profiles up ON oi.quality_checked_by = up.id;

-- =====================================================
-- PART 8: Final Success Message
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ CORRECTED ENHANCED SCHEMA COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Added Features:';
    RAISE NOTICE '   • Quality Check tracking (QC person, date, status, notes, photos)';
    RAISE NOTICE '   • Enhanced production workflow (quality_check, completed, rework stages)';
    RAISE NOTICE '   • Invoice editing and revision tracking';
    RAISE NOTICE '   • Smart invoice-challan relationship tracking';
    RAISE NOTICE '   • User activity audit trail (using user_profiles)';
    RAISE NOTICE '   • Notification system for smart alerts';
    RAISE NOTICE '   • Legacy compatibility view (design_stage, fabric_stage)';
    RAISE NOTICE '   • Performance indexes for fast queries';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 New Production Stages Available:';
    RAISE NOTICE '   • pending → pre_treatment → printing → post_process → quality_check → completed';
    RAISE NOTICE '   • Alternative: quality_check → rework (if failed)';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Ready for enhanced API functions and frontend updates!';
    RAISE NOTICE '';
END $$;