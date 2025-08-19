-- Audit Trail Database Schema for Textile Printing Business Management System
-- This script creates the necessary tables and functions for comprehensive transaction history tracking

-- ==============================================
-- AUDIT TRAIL TABLE
-- ==============================================

-- Create audit_trail table for comprehensive transaction logging
CREATE TABLE IF NOT EXISTS audit_trail (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('order', 'material', 'cash_flow', 'delivery', 'production', 'invoice', 'payment')),
    event_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    customer_id UUID,
    user_id UUID,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT NOT NULL,
    amount DECIMAL(12,2),
    quantity DECIMAL(10,3),
    previous_values JSONB,
    new_values JSONB,
    metadata JSONB,
    reference_number VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    impact_type VARCHAR(20) NOT NULL CHECK (impact_type IN ('financial', 'inventory', 'production', 'delivery', 'administrative')),
    business_context JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_trail_customer_id ON audit_trail(customer_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_transaction_type ON audit_trail(transaction_type);
CREATE INDEX IF NOT EXISTS idx_audit_trail_timestamp ON audit_trail(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_entity ON audit_trail(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_impact_type ON audit_trail(impact_type);
CREATE INDEX IF NOT EXISTS idx_audit_trail_reference_number ON audit_trail(reference_number);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_trail_customer_type_date ON audit_trail(customer_id, transaction_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_business_analytics ON audit_trail(transaction_type, impact_type, timestamp DESC);

-- ==============================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================

-- Enable RLS on audit_trail table
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;

-- Policy for reading audit trail (users can read all records)
CREATE POLICY "Users can read audit trail"
    ON audit_trail FOR SELECT
    USING (true);

-- Policy for inserting audit trail (authenticated users only)
CREATE POLICY "Authenticated users can insert audit trail"
    ON audit_trail FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Policy for updating audit trail (no updates allowed - immutable records)
-- Audit trail records should be immutable for compliance

-- ==============================================
-- HELPER FUNCTIONS
-- ==============================================

-- Function to get customer transaction summary
CREATE OR REPLACE FUNCTION get_customer_transaction_summary(
    p_customer_id UUID,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
    transaction_type VARCHAR(20),
    event_count BIGINT,
    total_amount DECIMAL(12,2),
    latest_transaction TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        at.transaction_type,
        COUNT(*) as event_count,
        COALESCE(SUM(at.amount), 0) as total_amount,
        MAX(at.timestamp) as latest_transaction
    FROM audit_trail at
    WHERE at.customer_id = p_customer_id
        AND (p_date_from IS NULL OR DATE(at.timestamp) >= p_date_from)
        AND (p_date_to IS NULL OR DATE(at.timestamp) <= p_date_to)
    GROUP BY at.transaction_type
    ORDER BY latest_transaction DESC;
END;
$$;

-- Function to get business analytics from audit trail
CREATE OR REPLACE FUNCTION get_business_analytics(
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
    total_transactions BIGINT,
    revenue_transactions BIGINT,
    total_revenue DECIMAL(12,2),
    material_movements BIGINT,
    delivery_transactions BIGINT,
    production_changes BIGINT,
    active_customers BIGINT,
    avg_order_value DECIMAL(12,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_transactions,
        COUNT(CASE WHEN at.transaction_type IN ('payment', 'invoice') THEN 1 END)::BIGINT as revenue_transactions,
        COALESCE(SUM(CASE WHEN at.transaction_type = 'payment' THEN at.amount END), 0) as total_revenue,
        COUNT(CASE WHEN at.transaction_type = 'material' THEN 1 END)::BIGINT as material_movements,
        COUNT(CASE WHEN at.transaction_type = 'delivery' THEN 1 END)::BIGINT as delivery_transactions,
        COUNT(CASE WHEN at.transaction_type = 'production' THEN 1 END)::BIGINT as production_changes,
        COUNT(DISTINCT at.customer_id)::BIGINT as active_customers,
        COALESCE(AVG(CASE WHEN at.transaction_type = 'order' THEN at.amount END), 0) as avg_order_value
    FROM audit_trail at
    WHERE (p_date_from IS NULL OR DATE(at.timestamp) >= p_date_from)
        AND (p_date_to IS NULL OR DATE(at.timestamp) <= p_date_to);
END;
$$;

-- Function to get material flow history
CREATE OR REPLACE FUNCTION get_material_flow_history(
    p_customer_id UUID DEFAULT NULL,
    p_material_type TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    transaction_timestamp TIMESTAMP WITH TIME ZONE,
    customer_name TEXT,
    material_type TEXT,
    quantity_change DECIMAL(10,3),
    flow_type VARCHAR(20),
    reference_number VARCHAR(100),
    description TEXT,
    running_balance DECIMAL(10,3)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        at.timestamp as transaction_timestamp,
        c.name as customer_name,
        (at.metadata->>'material_type')::TEXT as material_type,
        at.quantity as quantity_change,
        at.event_type as flow_type,
        at.reference_number,
        at.description,
        SUM(at.quantity) OVER (
            PARTITION BY at.customer_id, (at.metadata->>'material_type')
            ORDER BY at.timestamp 
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) as running_balance
    FROM audit_trail at
    JOIN customers c ON c.id = at.customer_id
    WHERE at.transaction_type = 'material'
        AND (p_customer_id IS NULL OR at.customer_id = p_customer_id)
        AND (p_material_type IS NULL OR (at.metadata->>'material_type') = p_material_type)
    ORDER BY at.timestamp DESC
    LIMIT p_limit;
END;
$$;

-- Function to get cash flow timeline
CREATE OR REPLACE FUNCTION get_cash_flow_timeline(
    p_customer_id UUID DEFAULT NULL,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
    transaction_timestamp TIMESTAMP WITH TIME ZONE,
    customer_name TEXT,
    transaction_type VARCHAR(20),
    amount DECIMAL(12,2),
    running_balance DECIMAL(12,2),
    reference_number VARCHAR(100),
    description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        at.timestamp as transaction_timestamp,
        c.name as customer_name,
        at.transaction_type,
        at.amount,
        SUM(
            CASE 
                WHEN at.transaction_type = 'payment' THEN at.amount
                WHEN at.transaction_type = 'invoice' THEN -at.amount
                ELSE 0
            END
        ) OVER (
            PARTITION BY at.customer_id
            ORDER BY at.timestamp 
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) as running_balance,
        at.reference_number,
        at.description
    FROM audit_trail at
    JOIN customers c ON c.id = at.customer_id
    WHERE at.transaction_type IN ('payment', 'invoice', 'cash_flow')
        AND (p_customer_id IS NULL OR at.customer_id = p_customer_id)
        AND (p_date_from IS NULL OR DATE(at.timestamp) >= p_date_from)
        AND (p_date_to IS NULL OR DATE(at.timestamp) <= p_date_to)
    ORDER BY at.timestamp DESC;
END;
$$;

-- ==============================================
-- VIEWS FOR REPORTING
-- ==============================================

-- View for recent business activities
CREATE OR REPLACE VIEW recent_business_activities AS
SELECT 
    at.id,
    at.timestamp,
    at.transaction_type,
    at.event_type,
    c.name as customer_name,
    at.description,
    at.amount,
    at.reference_number,
    at.status,
    at.impact_type
FROM audit_trail at
LEFT JOIN customers c ON c.id = at.customer_id
ORDER BY at.timestamp DESC
LIMIT 100;

-- View for daily business summary
CREATE OR REPLACE VIEW daily_business_summary AS
SELECT 
    DATE(at.timestamp) as business_date,
    COUNT(*) as total_transactions,
    COUNT(DISTINCT at.customer_id) as active_customers,
    COUNT(CASE WHEN at.transaction_type = 'order' THEN 1 END) as orders_created,
    COUNT(CASE WHEN at.transaction_type = 'delivery' THEN 1 END) as deliveries_made,
    COUNT(CASE WHEN at.transaction_type = 'payment' THEN 1 END) as payments_received,
    COALESCE(SUM(CASE WHEN at.transaction_type = 'payment' THEN at.amount END), 0) as daily_revenue,
    COALESCE(SUM(CASE WHEN at.transaction_type = 'invoice' THEN at.amount END), 0) as invoices_generated
FROM audit_trail at
WHERE at.timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(at.timestamp)
ORDER BY business_date DESC;

-- View for customer activity summary
CREATE OR REPLACE VIEW customer_activity_summary AS
SELECT 
    c.id as customer_id,
    c.name as customer_name,
    COUNT(*) as total_transactions,
    MAX(at.timestamp) as last_activity,
    COUNT(CASE WHEN at.transaction_type = 'order' THEN 1 END) as total_orders,
    COUNT(CASE WHEN at.transaction_type = 'payment' THEN 1 END) as total_payments,
    COALESCE(SUM(CASE WHEN at.transaction_type = 'payment' THEN at.amount END), 0) as total_paid,
    COALESCE(SUM(CASE WHEN at.transaction_type = 'invoice' THEN at.amount END), 0) as total_invoiced
FROM customers c
LEFT JOIN audit_trail at ON at.customer_id = c.id
GROUP BY c.id, c.name
ORDER BY last_activity DESC NULLS LAST;

-- ==============================================
-- TRIGGERS FOR AUTOMATIC LOGGING
-- ==============================================

-- Note: Triggers would be added here for automatic logging of table changes
-- However, since we're using client-side logging through the audit trail service,
-- these are commented out. Uncomment and modify if you want database-level triggers.

/*
-- Trigger function for order changes
CREATE OR REPLACE FUNCTION log_order_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_trail (
            transaction_type, event_type, entity_type, entity_id, customer_id,
            description, amount, new_values, reference_number, status, impact_type, business_context
        ) VALUES (
            'order', 'created', 'order', NEW.id, NEW.customer_id,
            'Order created: ' || NEW.order_number, NEW.total_amount,
            to_jsonb(NEW), NEW.order_number, NEW.status, 'administrative',
            jsonb_build_object('order_date', NEW.order_date, 'items_count', 0)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_trail (
            transaction_type, event_type, entity_type, entity_id, customer_id,
            description, amount, previous_values, new_values, reference_number, status, impact_type, business_context
        ) VALUES (
            'order', 'updated', 'order', NEW.id, NEW.customer_id,
            'Order updated: ' || NEW.order_number, NEW.total_amount,
            to_jsonb(OLD), to_jsonb(NEW), NEW.order_number, NEW.status, 'administrative',
            jsonb_build_object('status_changed', OLD.status != NEW.status)
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

-- Create trigger for orders
CREATE TRIGGER audit_orders
    AFTER INSERT OR UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION log_order_changes();
*/

-- ==============================================
-- GRANTS AND PERMISSIONS
-- ==============================================

-- Grant permissions to authenticated users
GRANT SELECT ON audit_trail TO authenticated;
GRANT INSERT ON audit_trail TO authenticated;
GRANT SELECT ON recent_business_activities TO authenticated;
GRANT SELECT ON daily_business_summary TO authenticated;
GRANT SELECT ON customer_activity_summary TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_customer_transaction_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_business_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_material_flow_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_cash_flow_timeline TO authenticated;

-- ==============================================
-- SAMPLE DATA (for testing)
-- ==============================================

-- This section would contain sample audit trail records for testing
-- Comment out in production

/*
INSERT INTO audit_trail (
    transaction_type, event_type, entity_type, entity_id, customer_id,
    description, amount, reference_number, status, impact_type, business_context
) VALUES (
    'order', 'created', 'order', gen_random_uuid(), (SELECT id FROM customers LIMIT 1),
    'Sample order created for testing', 1500.00, 'ORD-SAMPLE-001', 'pending', 'administrative',
    '{"items_count": 3, "order_date": "2025-01-19"}'
);
*/

-- ==============================================
-- MAINTENANCE QUERIES
-- ==============================================

-- Query to check audit trail statistics
-- SELECT 
--     transaction_type,
--     COUNT(*) as record_count,
--     MIN(timestamp) as earliest_record,
--     MAX(timestamp) as latest_record
-- FROM audit_trail 
-- GROUP BY transaction_type 
-- ORDER BY record_count DESC;

-- Query to find large audit records (for cleanup)
-- SELECT id, transaction_type, length(new_values::text) as size_bytes
-- FROM audit_trail 
-- WHERE length(new_values::text) > 10000
-- ORDER BY size_bytes DESC;

-- ==============================================
-- BACKUP AND ARCHIVE STRATEGY
-- ==============================================

-- For long-term storage, consider archiving old audit records
-- Example: Archive records older than 2 years to a separate table

/*
CREATE TABLE audit_trail_archive (
    LIKE audit_trail INCLUDING ALL
);

-- Function to archive old records
CREATE OR REPLACE FUNCTION archive_old_audit_records(archive_before_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Move old records to archive table
    WITH moved_records AS (
        DELETE FROM audit_trail 
        WHERE DATE(timestamp) < archive_before_date
        RETURNING *
    )
    INSERT INTO audit_trail_archive 
    SELECT * FROM moved_records;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    RETURN archived_count;
END;
$$;
*/

-- ==============================================
-- COMPLETION NOTICE
-- ==============================================

-- This schema provides comprehensive audit trail functionality for the textile printing business
-- Key features:
-- 1. Complete transaction logging with JSONB flexibility
-- 2. Efficient indexing for fast queries
-- 3. Row-level security for data protection  
-- 4. Helper functions for business analytics
-- 5. Views for common reporting needs
-- 6. Scalable design for growing business needs

-- To use this schema:
-- 1. Run this script in your Supabase SQL editor
-- 2. Verify all tables and functions are created
-- 3. Test with sample data
-- 4. Configure your application to use the audit trail service
-- 5. Monitor performance and adjust indexes as needed