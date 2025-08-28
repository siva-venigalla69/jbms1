-- =====================================
-- CLEAN SLATE RECOVERY PLAN
-- Drop all problematic tables and recreate with correct types
-- =====================================

-- Phase 1: Drop all newly created design and enhancement tables
-- (This won't affect your core business data)

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

-- Phase 2: Remove any enhancement columns that were added to existing tables
-- (This will reset order_items and gst_invoices to original state)

-- Reset order_items table (remove enhancement columns)
ALTER TABLE order_items DROP COLUMN IF EXISTS linked_design_id CASCADE;
ALTER TABLE order_items DROP COLUMN IF EXISTS design_received CASCADE;
ALTER TABLE order_items DROP COLUMN IF EXISTS design_ready CASCADE;
ALTER TABLE order_items DROP COLUMN IF EXISTS design_file_url CASCADE;
ALTER TABLE order_items DROP COLUMN IF EXISTS design_notes CASCADE;
ALTER TABLE order_items DROP COLUMN IF EXISTS design_received_date CASCADE;
ALTER TABLE order_items DROP COLUMN IF EXISTS printing_can_start CASCADE;
ALTER TABLE order_items DROP COLUMN IF EXISTS material_allocated_qty CASCADE;
ALTER TABLE order_items DROP COLUMN IF EXISTS material_consumed_qty CASCADE;
ALTER TABLE order_items DROP COLUMN IF EXISTS material_wastage_qty CASCADE;
ALTER TABLE order_items DROP COLUMN IF EXISTS actual_completion_date CASCADE;
ALTER TABLE order_items DROP COLUMN IF EXISTS quality_rating CASCADE;
ALTER TABLE order_items DROP COLUMN IF EXISTS quality_notes CASCADE;
ALTER TABLE order_items DROP COLUMN IF EXISTS production_issues CASCADE;

-- Reset gst_invoices table (remove enhancement columns)
ALTER TABLE gst_invoices DROP COLUMN IF EXISTS invoice_type CASCADE;
ALTER TABLE gst_invoices DROP COLUMN IF EXISTS consolidation_period CASCADE;
ALTER TABLE gst_invoices DROP COLUMN IF EXISTS consolidation_date CASCADE;
ALTER TABLE gst_invoices DROP COLUMN IF EXISTS billing_address CASCADE;
ALTER TABLE gst_invoices DROP COLUMN IF EXISTS shipping_address CASCADE;
ALTER TABLE gst_invoices DROP COLUMN IF EXISTS payment_terms CASCADE;
ALTER TABLE gst_invoices DROP COLUMN IF EXISTS currency CASCADE;
ALTER TABLE gst_invoices DROP COLUMN IF EXISTS exchange_rate CASCADE;
ALTER TABLE gst_invoices DROP COLUMN IF EXISTS discount_percentage CASCADE;
ALTER TABLE gst_invoices DROP COLUMN IF EXISTS discount_amount CASCADE;
ALTER TABLE gst_invoices DROP COLUMN IF EXISTS shipping_charges CASCADE;
ALTER TABLE gst_invoices DROP COLUMN IF EXISTS other_charges CASCADE;
ALTER TABLE gst_invoices DROP COLUMN IF EXISTS round_off_amount CASCADE;
ALTER TABLE gst_invoices DROP COLUMN IF EXISTS invoice_status CASCADE;
ALTER TABLE gst_invoices DROP COLUMN IF EXISTS approval_required CASCADE;
ALTER TABLE gst_invoices DROP COLUMN IF EXISTS approved_by CASCADE;
ALTER TABLE gst_invoices DROP COLUMN IF EXISTS approved_at CASCADE;
ALTER TABLE gst_invoices DROP COLUMN IF EXISTS sent_at CASCADE;
ALTER TABLE gst_invoices DROP COLUMN IF EXISTS due_reminder_sent_at CASCADE;
ALTER TABLE gst_invoices DROP COLUMN IF EXISTS invoice_template CASCADE;
ALTER TABLE gst_invoices DROP COLUMN IF EXISTS custom_fields CASCADE;
ALTER TABLE gst_invoices DROP COLUMN IF EXISTS internal_notes CASCADE;
ALTER TABLE gst_invoices DROP COLUMN IF EXISTS customer_notes CASCADE;

-- Reset design_submissions table enhancements
ALTER TABLE design_submissions DROP COLUMN IF EXISTS design_code CASCADE;
ALTER TABLE design_submissions DROP COLUMN IF EXISTS design_thumbnail_path CASCADE;
ALTER TABLE design_submissions DROP COLUMN IF EXISTS material_type_id CASCADE;
ALTER TABLE design_submissions DROP COLUMN IF EXISTS estimated_material_usage CASCADE;
ALTER TABLE design_submissions DROP COLUMN IF EXISTS actual_material_usage CASCADE;
ALTER TABLE design_submissions DROP COLUMN IF EXISTS priority_level CASCADE;
ALTER TABLE design_submissions DROP COLUMN IF EXISTS estimated_prep_hours CASCADE;
ALTER TABLE design_submissions DROP COLUMN IF EXISTS actual_prep_hours CASCADE;
ALTER TABLE design_submissions DROP COLUMN IF EXISTS target_ready_date CASCADE;
ALTER TABLE design_submissions DROP COLUMN IF EXISTS actual_ready_date CASCADE;
ALTER TABLE design_submissions DROP COLUMN IF EXISTS completion_deadline CASCADE;
ALTER TABLE design_submissions DROP COLUMN IF EXISTS assigned_designer CASCADE;
ALTER TABLE design_submissions DROP COLUMN IF EXISTS design_notes CASCADE;
ALTER TABLE design_submissions DROP COLUMN IF EXISTS internal_notes CASCADE;
ALTER TABLE design_submissions DROP COLUMN IF EXISTS client_requirements CASCADE;
ALTER TABLE design_submissions DROP COLUMN IF EXISTS is_deleted CASCADE;
ALTER TABLE design_submissions DROP COLUMN IF EXISTS created_by CASCADE;
ALTER TABLE design_submissions DROP COLUMN IF EXISTS updated_by CASCADE;

SELECT 'Phase 2 Complete: All enhancement columns removed' as status;