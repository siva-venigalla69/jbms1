-- SAFE ENHANCED SCHEMA - Works with existing database structure
-- This version creates missing tables and handles existing ones safely

-- =====================================================
-- PART 1: Create Users Table if it doesn't exist
-- =====================================================

-- Check if users table exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        CREATE TABLE users (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            email VARCHAR(255) UNIQUE NOT NULL,
            full_name VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'user',
            is_active BOOLEAN DEFAULT TRUE,
            phone VARCHAR(20),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Insert default admin user
        INSERT INTO users (email, full_name, role) VALUES 
        ('admin@company.com', 'System Administrator', 'admin'),
        ('quality@company.com', 'Quality Manager', 'quality_manager'),
        ('finance@company.com', 'Finance Manager', 'finance_manager')
        ON CONFLICT (email) DO NOTHING;
        
        RAISE NOTICE 'Created users table with default users';
    ELSE
        RAISE NOTICE 'Users table already exists';
    END IF;
END $$;

-- =====================================================
-- PART 2: Enhanced Production Workflow (Safe)
-- =====================================================

-- Add QC tracking columns to order_items (only if they don't exist)
DO $$
BEGIN
    -- Add quality_checked_by column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'quality_checked_by') THEN
        ALTER TABLE order_items ADD COLUMN quality_checked_by UUID;
        -- Add foreign key constraint if users table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
            ALTER TABLE order_items ADD CONSTRAINT fk_order_items_quality_checked_by 
            FOREIGN KEY (quality_checked_by) REFERENCES users(id);
        END IF;
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
-- PART 3: Enhanced Invoice Management (Safe)
-- =====================================================

-- Add invoice editing and tracking columns (only if they don't exist)
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
        -- Add foreign key if users table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
            ALTER TABLE gst_invoices ADD CONSTRAINT fk_gst_invoices_sent_by 
            FOREIGN KEY (sent_by) REFERENCES users(id);
        END IF;
        RAISE NOTICE 'Added sent_by column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gst_invoices' AND column_name = 'last_edited_by') THEN
        ALTER TABLE gst_invoices ADD COLUMN last_edited_by UUID;
        -- Add foreign key if users table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
            ALTER TABLE gst_invoices ADD CONSTRAINT fk_gst_invoices_last_edited_by 
            FOREIGN KEY (last_edited_by) REFERENCES users(id);
        END IF;
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

-- =====================================================
-- PART 4: Invoice-Challan Relationship Tracking (Safe)
-- =====================================================

-- Create invoice sources tracking table
CREATE TABLE IF NOT EXISTS invoice_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL, -- Reference to gst_invoices(id)
    source_type VARCHAR(20) NOT NULL, -- 'challan', 'order', 'manual'
    source_id UUID NOT NULL, -- challan_id or order_id
    line_items JSONB, -- Store specific items invoiced
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_source_type CHECK (source_type IN ('challan', 'order', 'manual'))
);

-- Add foreign key for invoice_sources if gst_invoices exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gst_invoices') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'fk_invoice_sources_invoice_id') THEN
            ALTER TABLE invoice_sources ADD CONSTRAINT fk_invoice_sources_invoice_id 
            FOREIGN KEY (invoice_id) REFERENCES gst_invoices(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added foreign key constraint for invoice_sources';
        END IF;
    END IF;
END $$;

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
        -- Add foreign key if gst_invoices exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gst_invoices') THEN
            ALTER TABLE delivery_challans ADD CONSTRAINT fk_delivery_challans_invoice_id 
            FOREIGN KEY (invoice_id) REFERENCES gst_invoices(id);
        END IF;
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
-- PART 5: Create Simple Activity Log (No user FK initially)
-- =====================================================

-- Create user activity log for audit trail
CREATE TABLE IF NOT EXISTS user_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- Will add FK constraint later if users table exists
    user_email VARCHAR(255), -- Fallback identifier
    activity_type VARCHAR(50) NOT NULL, -- 'qc_completed', 'invoice_created', 'invoice_edited', etc.
    entity_type VARCHAR(50) NOT NULL, -- 'order_item', 'invoice', 'challan'
    entity_id UUID NOT NULL,
    description TEXT,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint if users table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'fk_user_activity_log_user_id') THEN
            ALTER TABLE user_activity_log ADD CONSTRAINT fk_user_activity_log_user_id 
            FOREIGN KEY (user_id) REFERENCES users(id);
            RAISE NOTICE 'Added foreign key constraint for user_activity_log';
        END IF;
    END IF;
END $$;

-- =====================================================
-- PART 6: Create Simple Notification System
-- =====================================================

-- Create notification system for smart alerts
CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- Will add FK constraint later if users table exists
    user_email VARCHAR(255), -- Fallback identifier
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

-- Add foreign key constraint if users table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'fk_user_notifications_user_id') THEN
            ALTER TABLE user_notifications ADD CONSTRAINT fk_user_notifications_user_id 
            FOREIGN KEY (user_id) REFERENCES users(id);
            RAISE NOTICE 'Added foreign key constraint for user_notifications';
        END IF;
    END IF;
END $$;

-- =====================================================
-- PART 7: Performance Indexes
-- =====================================================

-- Indexes for QC tracking
CREATE INDEX IF NOT EXISTS idx_order_items_qc_status ON order_items(qc_pass_status);
CREATE INDEX IF NOT EXISTS idx_order_items_qc_date ON order_items(quality_check_date);
CREATE INDEX IF NOT EXISTS idx_order_items_production_status ON order_items(production_status);

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
-- PART 8: Final Success Message
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ SAFE ENHANCED SCHEMA COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Added Features:';
    RAISE NOTICE '   • Quality Check tracking (QC person, date, status, notes)';
    RAISE NOTICE '   • Enhanced production workflow (quality_check, completed, rework stages)';
    RAISE NOTICE '   • Invoice editing and revision tracking';
    RAISE NOTICE '   • Smart invoice-challan relationship tracking';
    RAISE NOTICE '   • User activity audit trail';
    RAISE NOTICE '   • Notification system for smart alerts';
    RAISE NOTICE '   • Performance indexes for fast queries';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Ready for enhanced API functions and frontend updates!';
    RAISE NOTICE '';
END $$;