-- =====================================================
-- DESIGN QUANTITY TRACKING ENHANCEMENT
-- Add columns to track design quantities at order and stock levels
-- =====================================================

-- Add design quantity columns to order_items table
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS designs_provided_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS designs_approved_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS design_last_updated TIMESTAMP WITH TIME ZONE;

-- Add comments for clarity
COMMENT ON COLUMN order_items.designs_provided_quantity IS 'Number of designs provided by customer for this specific order item';
COMMENT ON COLUMN order_items.designs_approved_quantity IS 'Number of designs approved and ready for production for this order item';
COMMENT ON COLUMN order_items.design_last_updated IS 'Timestamp when design quantities were last updated';

-- Create customer-level design summary table for stock-wide tracking
CREATE TABLE IF NOT EXISTS customer_design_summary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    material_type VARCHAR(50) NOT NULL,
    
    -- Total material tracking
    total_material_received INTEGER DEFAULT 0,
    total_material_allocated INTEGER DEFAULT 0,
    
    -- Design tracking
    total_designs_provided INTEGER DEFAULT 0,
    total_designs_approved INTEGER DEFAULT 0,
    total_designs_used INTEGER DEFAULT 0,
    
    -- Calculated fields for quick reference
    available_material INTEGER GENERATED ALWAYS AS (total_material_received - total_material_allocated) STORED,
    available_designs INTEGER GENERATED ALWAYS AS (total_designs_approved - total_designs_used) STORED,
    design_shortage_for_stock INTEGER GENERATED ALWAYS AS (total_material_received - total_designs_provided) STORED,
    
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(customer_id, material_type)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_order_items_designs_provided ON order_items(designs_provided_quantity);
CREATE INDEX IF NOT EXISTS idx_order_items_designs_approved ON order_items(designs_approved_quantity);
CREATE INDEX IF NOT EXISTS idx_customer_design_summary_customer_id ON customer_design_summary(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_design_summary_material_type ON customer_design_summary(material_type);

-- Add constraints
ALTER TABLE order_items 
ADD CONSTRAINT chk_designs_provided_positive 
CHECK (designs_provided_quantity >= 0);

ALTER TABLE order_items 
ADD CONSTRAINT chk_designs_approved_positive 
CHECK (designs_approved_quantity >= 0);

ALTER TABLE order_items 
ADD CONSTRAINT chk_designs_approved_not_more_than_provided 
CHECK (designs_approved_quantity <= designs_provided_quantity OR designs_provided_quantity = 0);

ALTER TABLE customer_design_summary 
ADD CONSTRAINT chk_customer_design_summary_positive 
CHECK (
    total_material_received >= 0 AND 
    total_material_allocated >= 0 AND
    total_designs_provided >= 0 AND 
    total_designs_approved >= 0 AND 
    total_designs_used >= 0
);

-- Function to update customer design summary when order_items change
CREATE OR REPLACE FUNCTION update_customer_design_summary()
RETURNS TRIGGER AS $$
BEGIN
    -- Update customer design summary based on order items changes
    INSERT INTO customer_design_summary (
        customer_id, 
        material_type,
        total_designs_provided,
        total_designs_approved
    )
    SELECT 
        o.customer_id,
        NEW.material_type,
        COALESCE(SUM(NEW.designs_provided_quantity), 0),
        COALESCE(SUM(NEW.designs_approved_quantity), 0)
    FROM orders o 
    WHERE o.id = NEW.order_id
    GROUP BY o.customer_id, NEW.material_type
    
    ON CONFLICT (customer_id, material_type) 
    DO UPDATE SET
        total_designs_provided = (
            SELECT COALESCE(SUM(oi.designs_provided_quantity), 0)
            FROM order_items oi 
            JOIN orders o ON o.id = oi.order_id 
            WHERE o.customer_id = customer_design_summary.customer_id 
            AND oi.material_type = customer_design_summary.material_type
        ),
        total_designs_approved = (
            SELECT COALESCE(SUM(oi.designs_approved_quantity), 0)
            FROM order_items oi 
            JOIN orders o ON o.id = oi.order_id 
            WHERE o.customer_id = customer_design_summary.customer_id 
            AND oi.material_type = customer_design_summary.material_type
        ),
        last_updated = NOW();
        
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update customer design summary
DROP TRIGGER IF EXISTS tr_update_customer_design_summary ON order_items;
CREATE TRIGGER tr_update_customer_design_summary
    AFTER INSERT OR UPDATE OF designs_provided_quantity, designs_approved_quantity ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_design_summary();

-- Initial population of customer_design_summary from existing data
INSERT INTO customer_design_summary (customer_id, material_type, total_designs_provided, total_designs_approved)
SELECT 
    o.customer_id,
    oi.material_type,
    0, -- Will be updated via UI
    0  -- Will be updated via UI
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
GROUP BY o.customer_id, oi.material_type
ON CONFLICT (customer_id, material_type) DO NOTHING;

-- Update material totals from material_in table  
UPDATE customer_design_summary cds
SET total_material_received = (
    SELECT COALESCE(SUM(mi.quantity), 0)
    FROM material_in mi
    WHERE mi.customer_id = cds.customer_id 
    AND mi.material_type = cds.material_type
);

COMMENT ON TABLE customer_design_summary IS 'Customer-level summary of material stock and design quantities';
COMMENT ON FUNCTION update_customer_design_summary() IS 'Automatically updates customer design summary when order item design quantities change';