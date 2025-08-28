-- =====================================
-- SAFE CLEAN SLATE RECOVERY  
-- Only drops tables/columns that actually exist
-- =====================================

-- Phase 1: Drop enhancement tables only if they exist
DROP TABLE IF EXISTS invoice_line_items CASCADE;
DROP TABLE IF EXISTS invoice_templates CASCADE;
DROP TABLE IF EXISTS invoice_approvals CASCADE;
DROP TABLE IF EXISTS design_printing_queue CASCADE;
DROP TABLE IF EXISTS material_design_mapping CASCADE; 
DROP TABLE IF EXISTS design_status CASCADE;
DROP TABLE IF EXISTS design_submissions CASCADE;
DROP TABLE IF EXISTS design_files CASCADE;
DROP TABLE IF EXISTS design_material_requirements CASCADE;
DROP TABLE IF EXISTS production_schedule CASCADE;
DROP TABLE IF EXISTS production_dependencies CASCADE;
DROP TABLE IF EXISTS design_status_history CASCADE;
DROP TABLE IF EXISTS production_stage_progress CASCADE;

-- Phase 2: Remove enhancement columns from existing tables (safe with IF EXISTS)

-- Reset order_items table (remove enhancement columns if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'linked_design_id') THEN
        ALTER TABLE order_items DROP COLUMN linked_design_id CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'design_received') THEN
        ALTER TABLE order_items DROP COLUMN design_received CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'design_ready') THEN
        ALTER TABLE order_items DROP COLUMN design_ready CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'design_file_url') THEN
        ALTER TABLE order_items DROP COLUMN design_file_url CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'design_notes') THEN
        ALTER TABLE order_items DROP COLUMN design_notes CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'design_received_date') THEN
        ALTER TABLE order_items DROP COLUMN design_received_date CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'printing_can_start') THEN
        ALTER TABLE order_items DROP COLUMN printing_can_start CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'material_allocated_qty') THEN
        ALTER TABLE order_items DROP COLUMN material_allocated_qty CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'material_consumed_qty') THEN
        ALTER TABLE order_items DROP COLUMN material_consumed_qty CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'material_wastage_qty') THEN
        ALTER TABLE order_items DROP COLUMN material_wastage_qty CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'actual_completion_date') THEN
        ALTER TABLE order_items DROP COLUMN actual_completion_date CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'quality_rating') THEN
        ALTER TABLE order_items DROP COLUMN quality_rating CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'quality_notes') THEN
        ALTER TABLE order_items DROP COLUMN quality_notes CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'production_issues') THEN
        ALTER TABLE order_items DROP COLUMN production_issues CASCADE;
    END IF;
END $$;

-- Reset gst_invoices table (remove enhancement columns if they exist)  
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gst_invoices' AND column_name = 'invoice_type') THEN
        ALTER TABLE gst_invoices DROP COLUMN invoice_type CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gst_invoices' AND column_name = 'consolidation_period') THEN
        ALTER TABLE gst_invoices DROP COLUMN consolidation_period CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gst_invoices' AND column_name = 'consolidation_date') THEN
        ALTER TABLE gst_invoices DROP COLUMN consolidation_date CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gst_invoices' AND column_name = 'billing_address') THEN
        ALTER TABLE gst_invoices DROP COLUMN billing_address CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gst_invoices' AND column_name = 'shipping_address') THEN
        ALTER TABLE gst_invoices DROP COLUMN shipping_address CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gst_invoices' AND column_name = 'payment_terms') THEN
        ALTER TABLE gst_invoices DROP COLUMN payment_terms CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gst_invoices' AND column_name = 'currency') THEN
        ALTER TABLE gst_invoices DROP COLUMN currency CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gst_invoices' AND column_name = 'exchange_rate') THEN
        ALTER TABLE gst_invoices DROP COLUMN exchange_rate CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gst_invoices' AND column_name = 'discount_percentage') THEN
        ALTER TABLE gst_invoices DROP COLUMN discount_percentage CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gst_invoices' AND column_name = 'discount_amount') THEN
        ALTER TABLE gst_invoices DROP COLUMN discount_amount CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gst_invoices' AND column_name = 'shipping_charges') THEN
        ALTER TABLE gst_invoices DROP COLUMN shipping_charges CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gst_invoices' AND column_name = 'other_charges') THEN
        ALTER TABLE gst_invoices DROP COLUMN other_charges CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gst_invoices' AND column_name = 'round_off_amount') THEN
        ALTER TABLE gst_invoices DROP COLUMN round_off_amount CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gst_invoices' AND column_name = 'invoice_status') THEN
        ALTER TABLE gst_invoices DROP COLUMN invoice_status CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gst_invoices' AND column_name = 'approval_required') THEN
        ALTER TABLE gst_invoices DROP COLUMN approval_required CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gst_invoices' AND column_name = 'approved_by') THEN
        ALTER TABLE gst_invoices DROP COLUMN approved_by CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gst_invoices' AND column_name = 'approved_at') THEN
        ALTER TABLE gst_invoices DROP COLUMN approved_at CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gst_invoices' AND column_name = 'sent_at') THEN
        ALTER TABLE gst_invoices DROP COLUMN sent_at CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gst_invoices' AND column_name = 'due_reminder_sent_at') THEN
        ALTER TABLE gst_invoices DROP COLUMN due_reminder_sent_at CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gst_invoices' AND column_name = 'invoice_template') THEN
        ALTER TABLE gst_invoices DROP COLUMN invoice_template CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gst_invoices' AND column_name = 'custom_fields') THEN
        ALTER TABLE gst_invoices DROP COLUMN custom_fields CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gst_invoices' AND column_name = 'internal_notes') THEN
        ALTER TABLE gst_invoices DROP COLUMN internal_notes CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gst_invoices' AND column_name = 'customer_notes') THEN
        ALTER TABLE gst_invoices DROP COLUMN customer_notes CASCADE;
    END IF;
END $$;

-- Reset challan_items table (remove design columns if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'challan_items' AND column_name = 'design_id') THEN
        ALTER TABLE challan_items DROP COLUMN design_id CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'challan_items' AND column_name = 'design_name') THEN
        ALTER TABLE challan_items DROP COLUMN design_name CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'challan_items' AND column_name = 'production_batch') THEN
        ALTER TABLE challan_items DROP COLUMN production_batch CASCADE;
    END IF;
END $$;

-- Drop any functions and triggers that might have been created
DROP FUNCTION IF EXISTS sync_order_item_design_status() CASCADE;
DROP FUNCTION IF EXISTS update_material_consumption() CASCADE;
DROP FUNCTION IF EXISTS validate_production_stage_progression() CASCADE;
DROP FUNCTION IF EXISTS update_order_item_timestamp() CASCADE;
DROP FUNCTION IF EXISTS migrate_existing_design_data() CASCADE;
DROP FUNCTION IF EXISTS can_schedule_design() CASCADE;
DROP FUNCTION IF EXISTS get_schedulable_designs() CASCADE;
DROP FUNCTION IF EXISTS update_design_submissions_timestamp() CASCADE;
DROP FUNCTION IF EXISTS log_design_status_change() CASCADE;
DROP FUNCTION IF EXISTS generate_design_code() CASCADE;
DROP FUNCTION IF EXISTS validate_material_allocation() CASCADE;
DROP FUNCTION IF EXISTS create_consolidated_invoice() CASCADE;
DROP FUNCTION IF EXISTS create_partial_invoice() CASCADE;
DROP FUNCTION IF EXISTS get_billing_suggestions() CASCADE;
DROP FUNCTION IF EXISTS calculate_line_item_totals() CASCADE;
DROP FUNCTION IF EXISTS update_invoice_totals() CASCADE;

-- Drop any views that might have been created
DROP VIEW IF EXISTS order_items_with_design_info CASCADE;
DROP VIEW IF EXISTS production_queue CASCADE;
DROP VIEW IF EXISTS design_workload_summary CASCADE;
DROP VIEW IF EXISTS material_consumption_analytics CASCADE;
DROP VIEW IF EXISTS invoice_summary_enhanced CASCADE;
DROP VIEW IF EXISTS challan_invoice_mapping CASCADE;

SELECT 'Safe clean slate completed - database reset to working state!' as result;