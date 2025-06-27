-- POST DEPLOYMENT DATABASE OBJECTS
-- Views, Functions, and Additional Indexes for JBMS Digital Textile Printing System
-- Run this after the main schema is deployed

-- ===================================================================
-- REPORTING VIEWS (REQ-037 to REQ-045)
-- ===================================================================

-- Production Status Report View (REQ-038)
CREATE OR REPLACE VIEW v_production_status AS
SELECT 
    oi.id,
    o.order_number,
    c.name as customer_name,
    c.phone as customer_phone,
    oi.material_type,
    oi.quantity,
    oi.unit_price,
    oi.production_stage,
    oi.stage_completed_at,
    oi.customization_details,
    CASE 
        WHEN oi.production_stage = 'post_process' AND oi.stage_completed_at IS NOT NULL THEN 'Completed'
        WHEN oi.production_stage = 'post_process' THEN 'Post Process'
        WHEN oi.production_stage = 'printing' THEN 'Printing' 
        WHEN oi.production_stage = 'pre_treatment' THEN 'Pre Treatment'
        ELSE 'Pending'
    END as status_display,
    o.order_date,
    o.created_at as order_created_at
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN customers c ON o.customer_id = c.id
WHERE o.is_deleted = false 
AND oi.is_deleted = false
AND NOT (oi.production_stage = 'post_process' AND oi.stage_completed_at IS NOT NULL)
ORDER BY o.order_date DESC, oi.created_at;

-- Daily Operations Summary View (REQ-045)
CREATE OR REPLACE VIEW v_daily_summary AS
SELECT 
    CURRENT_DATE as report_date,
    (SELECT COUNT(*) FROM orders 
     WHERE DATE(created_at) = CURRENT_DATE AND is_deleted = false) as orders_today,
    (SELECT COUNT(*) FROM order_items 
     WHERE DATE(stage_completed_at) = CURRENT_DATE) as stages_completed_today,
    (SELECT COUNT(*) FROM delivery_challans 
     WHERE DATE(created_at) = CURRENT_DATE AND is_deleted = false) as challans_today,
    (SELECT COALESCE(SUM(amount), 0) FROM payments 
     WHERE DATE(payment_date) = CURRENT_DATE AND is_deleted = false) as payments_today,
    (SELECT COUNT(*) FROM gst_invoices 
     WHERE DATE(created_at) = CURRENT_DATE AND is_deleted = false) as invoices_today,
    (SELECT COALESCE(SUM(amount), 0) FROM expenses 
     WHERE DATE(expense_date) = CURRENT_DATE AND is_deleted = false) as expenses_today;

-- Enhanced Material Flow Summary (REQ-044)
CREATE OR REPLACE VIEW v_enhanced_material_flow AS
SELECT 
    'IN' as flow_type,
    mi.id,
    c.name as customer_name,
    mi.material_type,
    mi.quantity,
    mi.unit,
    mi.received_date as flow_date,
    o.order_number,
    mi.notes,
    u.full_name as created_by
FROM material_in mi
LEFT JOIN customers c ON mi.customer_id = c.id
LEFT JOIN orders o ON mi.order_id = o.id
LEFT JOIN users u ON mi.created_by_user_id = u.id
WHERE mi.is_deleted = false

UNION ALL

SELECT 
    'OUT' as flow_type,
    mo.id,
    c.name as customer_name,
    mo.material_type,
    mo.quantity,
    mo.unit,
    mo.dispatch_date as flow_date,
    dc.challan_number as reference_number,
    mo.notes,
    u.full_name as created_by
FROM material_out mo
LEFT JOIN customers c ON mo.customer_id = c.id
LEFT JOIN delivery_challans dc ON mo.challan_id = dc.id
LEFT JOIN users u ON mo.created_by_user_id = u.id
WHERE mo.is_deleted = false

ORDER BY flow_date DESC;

-- Stock Holding Report View (REQ-039)
CREATE OR REPLACE VIEW v_stock_holding AS
SELECT 
    inv.id,
    inv.item_name,
    inv.category,
    inv.current_stock,
    inv.unit,
    inv.reorder_level,
    inv.cost_per_unit,
    (inv.current_stock * inv.cost_per_unit) as stock_value,
    inv.supplier_name,
    inv.supplier_contact,
    CASE 
        WHEN inv.current_stock <= inv.reorder_level THEN 'LOW STOCK'
        WHEN inv.current_stock <= (inv.reorder_level * 1.5) THEN 'MEDIUM STOCK'
        ELSE 'GOOD STOCK'
    END as stock_status,
    inv.last_updated
FROM inventory inv
WHERE inv.is_active = true 
AND inv.is_deleted = false
ORDER BY 
    CASE WHEN inv.current_stock <= inv.reorder_level THEN 1 ELSE 2 END,
    inv.item_name;

-- ===================================================================
-- ADDITIONAL INDEXES FOR PERFORMANCE
-- ===================================================================

-- Indexes for customer_id columns added in migration
CREATE INDEX IF NOT EXISTS idx_material_in_customer_id ON material_in(customer_id);
CREATE INDEX IF NOT EXISTS idx_material_out_customer_id ON material_out(customer_id);

-- Date-based indexes for reporting
CREATE INDEX IF NOT EXISTS idx_material_in_received_date ON material_in(received_date);
CREATE INDEX IF NOT EXISTS idx_material_out_dispatch_date ON material_out(dispatch_date);

-- Junction table indexes
CREATE INDEX IF NOT EXISTS idx_challan_items_challan_id ON challan_items(challan_id);
CREATE INDEX IF NOT EXISTS idx_challan_items_order_item_id ON challan_items(order_item_id);
CREATE INDEX IF NOT EXISTS idx_invoice_challans_invoice_id ON invoice_challans(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_challans_challan_id ON invoice_challans(challan_id);

-- ===================================================================
-- COMPLIANCE CHECKING FUNCTION
-- ===================================================================

-- Function to check functional requirements compliance
CREATE OR REPLACE FUNCTION check_functional_requirements_compliance()
RETURNS TABLE(
    requirement_code TEXT,
    requirement_description TEXT,
    compliance_status TEXT,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'REQ-010'::TEXT as requirement_code,
        'Material In Customer Linking'::TEXT as requirement_description,
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'material_in' AND column_name = 'customer_id')
            THEN '✅ COMPLIANT'::TEXT
            ELSE '❌ NON-COMPLIANT'::TEXT
        END as compliance_status,
        'Customer ID column in material_in table'::TEXT as notes
    
    UNION ALL
    
    SELECT 
        'REQ-019'::TEXT,
        'Material Out Customer Linking'::TEXT,
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'material_out' AND column_name = 'customer_id')
            THEN '✅ COMPLIANT'::TEXT
            ELSE '❌ NON-COMPLIANT'::TEXT
        END,
        'Customer ID column in material_out table'::TEXT
    
    UNION ALL
    
    SELECT 
        'REQ-016'::TEXT,
        'Multiple Order Items per Challan'::TEXT,
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.tables 
                        WHERE table_name = 'challan_items')
            THEN '✅ COMPLIANT'::TEXT
            ELSE '❌ NON-COMPLIANT'::TEXT
        END,
        'Junction table for challan-orderitem relationship'::TEXT
    
    UNION ALL
    
    SELECT 
        'REQ-022'::TEXT,
        'Multiple Challans per Invoice'::TEXT,
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.tables 
                        WHERE table_name = 'invoice_challans')
            THEN '✅ COMPLIANT'::TEXT
            ELSE '❌ NON-COMPLIANT'::TEXT
        END,
        'Junction table for invoice-challan relationship'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- CHECK CONSTRAINTS (with proper syntax)
-- ===================================================================

-- Check constraints for positive quantities
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_material_in_quantity_positive' 
        AND table_name = 'material_in'
    ) THEN
        ALTER TABLE material_in 
        ADD CONSTRAINT check_material_in_quantity_positive 
        CHECK (quantity > 0);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_material_out_quantity_positive' 
        AND table_name = 'material_out'
    ) THEN
        ALTER TABLE material_out 
        ADD CONSTRAINT check_material_out_quantity_positive 
        CHECK (quantity > 0);
    END IF;
END $$;

-- ===================================================================
-- VERIFICATION QUERIES
-- ===================================================================

-- Final verification query
SELECT 'POST DEPLOYMENT OBJECTS CREATED' as status, NOW() as completed_at; 