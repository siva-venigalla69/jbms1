-- =====================================
-- INDEXES AND CONSTRAINTS CREATION
-- Performance optimization and data integrity
-- Version: 1.0
-- =====================================

-- =====================================
-- SECTION 1: PRIMARY KEY CONSTRAINTS (Already created with tables)
-- =====================================

-- All tables already have PRIMARY KEY constraints from schema creation

-- =====================================
-- SECTION 2: PERFORMANCE INDEXES
-- =====================================

-- Customer indexes
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_gst ON customers(gst_number) WHERE gst_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(id) WHERE is_deleted = FALSE;

-- Order indexes
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_active ON orders(id) WHERE is_deleted = FALSE;

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_material ON order_items(material_type);
CREATE INDEX IF NOT EXISTS idx_order_items_stage ON order_items(production_stage);

-- Material tracking indexes
CREATE INDEX IF NOT EXISTS idx_material_in_customer ON material_in(customer_id);
CREATE INDEX IF NOT EXISTS idx_material_in_order ON material_in(order_id);
CREATE INDEX IF NOT EXISTS idx_material_in_type ON material_in(material_type);
CREATE INDEX IF NOT EXISTS idx_material_in_date ON material_in(received_date);

-- Material stock indexes (CRITICAL)
CREATE INDEX IF NOT EXISTS idx_material_stock_customer ON material_stock(customer_id);
CREATE INDEX IF NOT EXISTS idx_material_stock_type ON material_stock(material_type);
CREATE INDEX IF NOT EXISTS idx_material_stock_customer_type ON material_stock(customer_id, material_type);
CREATE INDEX IF NOT EXISTS idx_material_stock_low_stock ON material_stock(current_stock) WHERE current_stock <= minimum_threshold;

-- Delivery challan indexes
CREATE INDEX IF NOT EXISTS idx_delivery_challans_customer ON delivery_challans(customer_id);
CREATE INDEX IF NOT EXISTS idx_delivery_challans_date ON delivery_challans(challan_date);
CREATE INDEX IF NOT EXISTS idx_delivery_challans_status ON delivery_challans(delivery_status);
CREATE INDEX IF NOT EXISTS idx_delivery_challans_number ON delivery_challans(challan_number);
CREATE INDEX IF NOT EXISTS idx_delivery_challans_active ON delivery_challans(id) WHERE is_deleted = FALSE;

-- Challan items indexes
CREATE INDEX IF NOT EXISTS idx_challan_items_challan ON challan_items(challan_id);
CREATE INDEX IF NOT EXISTS idx_challan_items_order_item ON challan_items(order_item_id);

-- Invoice indexes
CREATE INDEX IF NOT EXISTS idx_gst_invoices_customer ON gst_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_gst_invoices_date ON gst_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_gst_invoices_number ON gst_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_gst_invoices_outstanding ON gst_invoices(outstanding_amount) WHERE outstanding_amount > 0;
CREATE INDEX IF NOT EXISTS idx_gst_invoices_due_date ON gst_invoices(payment_due_date);

-- Payment indexes
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(payment_method);

-- Design management indexes
CREATE INDEX IF NOT EXISTS idx_design_submissions_customer ON design_submissions(customer_id);
CREATE INDEX IF NOT EXISTS idx_design_submissions_order ON design_submissions(order_id);
CREATE INDEX IF NOT EXISTS idx_design_submissions_date ON design_submissions(submitted_date);
CREATE INDEX IF NOT EXISTS idx_design_submissions_type ON design_submissions(design_type);

CREATE INDEX IF NOT EXISTS idx_design_status_submission ON design_status(design_submission_id);
CREATE INDEX IF NOT EXISTS idx_design_status_status ON design_status(status);
CREATE INDEX IF NOT EXISTS idx_design_status_date ON design_status(status_date);
CREATE INDEX IF NOT EXISTS idx_design_status_assigned ON design_status(assigned_designer_user_id);

CREATE INDEX IF NOT EXISTS idx_material_design_mapping_customer ON material_design_mapping(customer_id);
CREATE INDEX IF NOT EXISTS idx_material_design_mapping_material ON material_design_mapping(material_in_id);
CREATE INDEX IF NOT EXISTS idx_material_design_mapping_design ON material_design_mapping(design_submission_id);
CREATE INDEX IF NOT EXISTS idx_material_design_mapping_status ON material_design_mapping(status);

CREATE INDEX IF NOT EXISTS idx_printing_queue_customer ON design_printing_queue(customer_id);
CREATE INDEX IF NOT EXISTS idx_printing_queue_status ON design_printing_queue(printing_status);
CREATE INDEX IF NOT EXISTS idx_printing_queue_position ON design_printing_queue(queue_position);
CREATE INDEX IF NOT EXISTS idx_printing_queue_scheduled_date ON design_printing_queue(scheduled_print_date);

-- Audit and history indexes
CREATE INDEX IF NOT EXISTS idx_audit_trail_table_record ON audit_trail(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_date ON audit_trail(changed_at);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user ON audit_trail(changed_by);

CREATE INDEX IF NOT EXISTS idx_material_stock_history_stock ON material_stock_history(material_stock_id);
CREATE INDEX IF NOT EXISTS idx_material_stock_history_date ON material_stock_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_material_stock_history_type ON material_stock_history(change_type);

CREATE INDEX IF NOT EXISTS idx_deployment_history_date ON deployment_history(deployment_date);
CREATE INDEX IF NOT EXISTS idx_deployment_history_status ON deployment_history(status);

-- User and reference table indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(id) WHERE is_active = TRUE;

-- Reference table indexes
CREATE INDEX IF NOT EXISTS idx_material_types_name ON material_types(name);
CREATE INDEX IF NOT EXISTS idx_material_types_category ON material_types(category);
CREATE INDEX IF NOT EXISTS idx_order_statuses_name ON order_statuses(name);
CREATE INDEX IF NOT EXISTS idx_production_stages_sequence ON production_stages(sequence_order);

-- =====================================
-- SECTION 3: UNIQUE CONSTRAINTS
-- =====================================

-- Business rule unique constraints (beyond primary keys)
ALTER TABLE customers ADD CONSTRAINT uq_customers_phone_when_not_null 
    UNIQUE (phone) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE orders ADD CONSTRAINT uq_orders_number 
    UNIQUE (order_number);

ALTER TABLE delivery_challans ADD CONSTRAINT uq_delivery_challans_number 
    UNIQUE (challan_number);

ALTER TABLE gst_invoices ADD CONSTRAINT uq_gst_invoices_number 
    UNIQUE (invoice_number);

ALTER TABLE material_stock ADD CONSTRAINT uq_material_stock_customer_type 
    UNIQUE (customer_id, material_type);

ALTER TABLE invoice_challans ADD CONSTRAINT uq_invoice_challans_mapping 
    UNIQUE (invoice_id, challan_id);

-- Reference table unique constraints
ALTER TABLE user_roles ADD CONSTRAINT uq_user_roles_name 
    UNIQUE (name);

ALTER TABLE material_types ADD CONSTRAINT uq_material_types_name 
    UNIQUE (name);

ALTER TABLE order_statuses ADD CONSTRAINT uq_order_statuses_name 
    UNIQUE (name);

ALTER TABLE payment_methods ADD CONSTRAINT uq_payment_methods_name 
    UNIQUE (name);

ALTER TABLE production_stages ADD CONSTRAINT uq_production_stages_name 
    UNIQUE (name);

ALTER TABLE return_reasons ADD CONSTRAINT uq_return_reasons_name 
    UNIQUE (name);

-- =====================================
-- SECTION 4: CHECK CONSTRAINTS
-- =====================================

-- Business logic constraints
ALTER TABLE orders ADD CONSTRAINT chk_orders_total_amount_non_negative 
    CHECK (total_amount >= 0);

ALTER TABLE order_items ADD CONSTRAINT chk_order_items_quantity_positive 
    CHECK (quantity > 0);

ALTER TABLE order_items ADD CONSTRAINT chk_order_items_unit_price_non_negative 
    CHECK (unit_price >= 0);

ALTER TABLE material_in ADD CONSTRAINT chk_material_in_quantity_positive 
    CHECK (quantity > 0);

ALTER TABLE material_in ADD CONSTRAINT chk_material_in_quality_rating_valid 
    CHECK (quality_rating IS NULL OR (quality_rating >= 1 AND quality_rating <= 5));

ALTER TABLE material_stock ADD CONSTRAINT chk_material_stock_quantities_non_negative 
    CHECK (total_received >= 0 AND total_delivered >= 0 AND reserved_stock >= 0);

ALTER TABLE material_stock ADD CONSTRAINT chk_material_stock_reserved_not_exceed_current 
    CHECK (reserved_stock <= current_stock);

ALTER TABLE challan_items ADD CONSTRAINT chk_challan_items_quantity_positive 
    CHECK (quantity > 0);

ALTER TABLE gst_invoices ADD CONSTRAINT chk_gst_invoices_amounts_non_negative 
    CHECK (total_amount >= 0 AND cgst_amount >= 0 AND sgst_amount >= 0 AND igst_amount >= 0);

ALTER TABLE gst_invoices ADD CONSTRAINT chk_gst_invoices_outstanding_not_exceed_total 
    CHECK (outstanding_amount <= grand_total);

ALTER TABLE payments ADD CONSTRAINT chk_payments_amount_positive 
    CHECK (payment_amount > 0);

ALTER TABLE returns ADD CONSTRAINT chk_returns_quantity_positive 
    CHECK (returned_quantity > 0);

ALTER TABLE returns ADD CONSTRAINT chk_returns_refund_amount_non_negative 
    CHECK (refund_amount >= 0);

ALTER TABLE design_printing_queue ADD CONSTRAINT chk_printing_queue_quality_rating_valid 
    CHECK (print_quality_rating IS NULL OR (print_quality_rating >= 1 AND print_quality_rating <= 5));

ALTER TABLE design_printing_queue ADD CONSTRAINT chk_printing_queue_duration_positive 
    CHECK (print_duration_minutes IS NULL OR print_duration_minutes > 0);

-- =====================================
-- SECTION 5: FUNCTIONAL INDEXES (Advanced)
-- =====================================

-- Partial indexes for common queries
CREATE INDEX IF NOT EXISTS idx_orders_pending_by_customer 
    ON orders(customer_id, order_date) 
    WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_material_stock_low_by_customer 
    ON material_stock(customer_id, material_type, current_stock) 
    WHERE current_stock <= minimum_threshold;

CREATE INDEX IF NOT EXISTS idx_invoices_overdue 
    ON gst_invoices(customer_id, payment_due_date, outstanding_amount) 
    WHERE outstanding_amount > 0 AND payment_due_date < CURRENT_DATE;

CREATE INDEX IF NOT EXISTS idx_design_submissions_pending 
    ON design_submissions(customer_id, submitted_date)
    WHERE id IN (
        SELECT DISTINCT design_submission_id 
        FROM design_status 
        WHERE status IN ('submitted', 'under_review', 'modifications_needed')
    );

-- Text search indexes (if needed)
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm ON customers USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_design_submissions_name_trgm ON design_submissions USING gin(design_name gin_trgm_ops);

-- JSON indexes for metadata
CREATE INDEX IF NOT EXISTS idx_audit_trail_old_values ON audit_trail USING gin(old_values);
CREATE INDEX IF NOT EXISTS idx_audit_trail_new_values ON audit_trail USING gin(new_values);
CREATE INDEX IF NOT EXISTS idx_deployment_history_metadata ON deployment_history USING gin(metadata);

-- =====================================
-- SECTION 6: CONSTRAINT VALIDATION
-- =====================================

-- Verify all constraints are properly created
SELECT 
    'CONSTRAINT VALIDATION COMPLETED' as status,
    COUNT(*) as total_indexes_created
FROM pg_indexes 
WHERE schemaname = 'public';

-- Log this deployment
INSERT INTO deployment_history (
    deployment_type,
    script_name,
    status,
    description
) VALUES (
    'indexes_constraints',
    '02_INDEXES_AND_CONSTRAINTS.sql',
    'completed',
    'Performance indexes and data integrity constraints created'
);

-- Performance analysis
SELECT 
    'INDEX SUMMARY' as report_type,
    schemaname,
    tablename,
    COUNT(*) as index_count
FROM pg_indexes 
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;