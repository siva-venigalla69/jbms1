-- =====================================
-- REFERENCE DATA INSERTION
-- Essential reference data for system operation
-- Version: 1.0
-- =====================================

-- =====================================
-- SECTION 1: USER ROLES
-- =====================================

INSERT INTO user_roles (name, description, permissions) VALUES
('admin', 'System Administrator', '{"all_access": true, "manage_users": true, "system_config": true}'),
('manager', 'Operations Manager', '{"orders": "full", "customers": "full", "inventory": "full", "reports": "full"}'),
('operator', 'Production Operator', '{"orders": "read_update", "printing": "full", "inventory": "read"}'),
('designer', 'Design Specialist', '{"designs": "full", "orders": "read", "printing_queue": "read"}'),
('accounts', 'Accounts Personnel', '{"invoices": "full", "payments": "full", "reports": "read"}')
ON CONFLICT (name) DO NOTHING;

-- =====================================
-- SECTION 2: MATERIAL TYPES
-- =====================================

INSERT INTO material_types (name, category, description, unit_of_measure) VALUES
-- Fabric Types
('Dupatta', 'fabric', 'Traditional dupatta for ethnic wear', 'pieces'),
('Saree', 'fabric', 'Traditional saree fabric', 'pieces'),
('Kurti Fabric', 'fabric', 'Fabric for kurti/tunic', 'meters'),
('Dress Material', 'fabric', 'Unstitched dress material set', 'sets'),
('Blouse Piece', 'fabric', 'Blouse fabric piece', 'pieces'),
('Shirt Fabric', 'fabric', 'Men shirt fabric', 'meters'),
('Trouser Fabric', 'fabric', 'Trouser/pant fabric', 'meters'),
('Bedsheet', 'home_textile', 'Bed sheet fabric', 'pieces'),
('Pillow Cover', 'home_textile', 'Pillow cover fabric', 'pieces'),
('Curtain Fabric', 'home_textile', 'Curtain material', 'meters'),
('Table Cover', 'home_textile', 'Table covering fabric', 'pieces'),
-- Raw Materials
('Cotton Fabric', 'raw_material', 'Pure cotton fabric', 'meters'),
('Silk Fabric', 'raw_material', 'Pure silk fabric', 'meters'),
('Polyester Fabric', 'raw_material', 'Synthetic polyester fabric', 'meters'),
('Georgette', 'raw_material', 'Georgette fabric', 'meters'),
('Chiffon', 'raw_material', 'Chiffon fabric', 'meters')
ON CONFLICT (name) DO NOTHING;

-- =====================================
-- SECTION 3: ORDER STATUSES
-- =====================================

INSERT INTO order_statuses (name, description, color_code, sort_order, is_final_status) VALUES
('pending', 'Order placed, waiting for processing', '#FFA500', 1, FALSE),
('material_received', 'Customer material received', '#2196F3', 2, FALSE),
('design_pending', 'Waiting for design submission/approval', '#FF9800', 3, FALSE),
('design_ready', 'Design approved, ready for production', '#4CAF50', 4, FALSE),
('in_production', 'Currently in production', '#9C27B0', 5, FALSE),
('quality_check', 'Production complete, quality checking', '#795548', 6, FALSE),
('ready_for_delivery', 'Quality approved, ready for delivery', '#8BC34A', 7, FALSE),
('partially_delivered', 'Some items delivered', '#FF5722', 8, FALSE),
('completed', 'Order fully completed and delivered', '#4CAF50', 9, TRUE),
('cancelled', 'Order cancelled', '#F44336', 10, TRUE),
('on_hold', 'Order temporarily on hold', '#607D8B', 11, FALSE)
ON CONFLICT (name) DO NOTHING;

-- =====================================
-- SECTION 4: PAYMENT METHODS
-- =====================================

INSERT INTO payment_methods (name, requires_reference, is_digital) VALUES
('Cash', FALSE, FALSE),
('Bank Transfer', TRUE, TRUE),
('UPI', TRUE, TRUE),
('Cheque', TRUE, FALSE),
('Card Payment', TRUE, TRUE),
('Net Banking', TRUE, TRUE),
('Digital Wallet', TRUE, TRUE),
('Credit Note', FALSE, FALSE)
ON CONFLICT (name) DO NOTHING;

-- =====================================
-- SECTION 5: PRODUCTION STAGES
-- =====================================

INSERT INTO production_stages (name, description, sequence_order, estimated_duration_hours) VALUES
('Material Receipt', 'Customer material received and catalogued', 1, 1),
('Design Submission', 'Customer submits design or design created', 2, 24),
('Design Approval', 'Design reviewed and approved', 3, 8),
('Pre-production Setup', 'Machine setup and preparation', 4, 2),
('Printing', 'Actual printing process', 5, 4),
('Quality Check', 'Post-print quality inspection', 6, 1),
('Finishing', 'Final touches and packaging', 7, 2),
('Ready for Delivery', 'Item ready for customer pickup/delivery', 8, 0)
ON CONFLICT (name) DO NOTHING;

-- =====================================
-- SECTION 6: RETURN REASONS
-- =====================================

INSERT INTO return_reasons (name, requires_refund, is_quality_issue) VALUES
('Quality Issue', TRUE, TRUE),
('Design Mismatch', TRUE, TRUE),
('Color Variation', TRUE, TRUE),
('Size Issue', TRUE, FALSE),
('Customer Change of Mind', FALSE, FALSE),
('Damaged in Transit', TRUE, FALSE),
('Late Delivery', FALSE, FALSE),
('Wrong Item Delivered', TRUE, FALSE),
('Print Defect', TRUE, TRUE),
('Fabric Damage', TRUE, TRUE)
ON CONFLICT (name) DO NOTHING;

-- =====================================
-- SECTION 7: DEFAULT ADMIN USER
-- =====================================

-- Create default admin user (password: admin123 - CHANGE IN PRODUCTION!)
INSERT INTO users (
    username, 
    email, 
    full_name, 
    password_hash, 
    role,
    is_active
) VALUES (
    'admin',
    'admin@company.com',
    'System Administrator',
    crypt('admin123', gen_salt('bf', 8)),
    (SELECT id FROM user_roles WHERE name = 'admin'),
    TRUE
) ON CONFLICT (username) DO NOTHING;

-- =====================================
-- SECTION 8: SAMPLE CUSTOMERS (OPTIONAL)
-- =====================================

-- Only insert if no customers exist
INSERT INTO customers (name, phone, email, address, gst_number, credit_limit, payment_terms_days, created_by_user_id)
SELECT 
    'SAMPLE CUSTOMER',
    '9999999999',
    'sample@customer.com',
    'Sample Address, Sample City',
    NULL,
    50000.00,
    30,
    u.id
FROM users u 
WHERE u.username = 'admin'
AND NOT EXISTS (SELECT 1 FROM customers)
LIMIT 1;

-- =====================================
-- SECTION 9: SYSTEM CONFIGURATION
-- =====================================

-- Create system configuration table if needed
CREATE TABLE IF NOT EXISTS system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    config_type VARCHAR(20) DEFAULT 'string',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default system configuration
INSERT INTO system_config (config_key, config_value, config_type, description) VALUES
('company_name', 'Textile Printing Solutions', 'string', 'Company name for invoices and documents'),
('gst_number', '', 'string', 'Company GST registration number'),
('default_cgst_rate', '9.00', 'decimal', 'Default CGST rate percentage'),
('default_sgst_rate', '9.00', 'decimal', 'Default SGST rate percentage'),
('default_igst_rate', '18.00', 'decimal', 'Default IGST rate percentage'),
('invoice_prefix', 'INV', 'string', 'Prefix for invoice numbers'),
('challan_prefix', 'CH', 'string', 'Prefix for challan numbers'),
('order_prefix', 'ORD', 'string', 'Prefix for order numbers'),
('low_stock_threshold', '10', 'integer', 'Default low stock alert threshold'),
('print_queue_batch_size', '5', 'integer', 'Maximum items in print queue batch'),
('design_approval_days', '3', 'integer', 'Default days for design approval'),
('payment_terms_days', '30', 'integer', 'Default payment terms in days')
ON CONFLICT (config_key) DO NOTHING;

-- =====================================
-- REFERENCE DATA VALIDATION
-- =====================================

-- Verify all reference data is inserted
SELECT 
    'REFERENCE DATA VALIDATION' as status,
    (SELECT COUNT(*) FROM user_roles) as user_roles_count,
    (SELECT COUNT(*) FROM material_types) as material_types_count,
    (SELECT COUNT(*) FROM order_statuses) as order_statuses_count,
    (SELECT COUNT(*) FROM payment_methods) as payment_methods_count,
    (SELECT COUNT(*) FROM production_stages) as production_stages_count,
    (SELECT COUNT(*) FROM return_reasons) as return_reasons_count,
    (SELECT COUNT(*) FROM users) as users_count,
    (SELECT COUNT(*) FROM system_config) as system_config_count;

-- Log this deployment
INSERT INTO deployment_history (
    deployment_type,
    script_name,
    status,
    description
) VALUES (
    'reference_data',
    '04_REFERENCE_DATA.sql',
    'completed',
    'Reference data and system configuration inserted'
);

-- Display reference data summary
SELECT 
    'USER ROLES' as data_type,
    name,
    description
FROM user_roles
ORDER BY name

UNION ALL

SELECT 
    'MATERIAL TYPES' as data_type,
    name,
    category || ' - ' || unit_of_measure as description
FROM material_types
ORDER BY category, name

UNION ALL

SELECT 
    'ORDER STATUSES' as data_type,
    name,
    description
FROM order_statuses
ORDER BY sort_order;