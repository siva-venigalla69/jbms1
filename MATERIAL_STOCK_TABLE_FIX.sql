-- Fix for Material Stock Table - Missing from Schema
-- This table is required for tracking customer material stock

-- Create material_stock table
CREATE TABLE IF NOT EXISTS material_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    material_type VARCHAR(50) NOT NULL,
    total_received INTEGER DEFAULT 0 CHECK (total_received >= 0),
    total_delivered INTEGER DEFAULT 0 CHECK (total_delivered >= 0),
    current_stock INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint to ensure one record per customer-material combination
    UNIQUE(customer_id, material_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_material_stock_customer ON material_stock(customer_id);
CREATE INDEX IF NOT EXISTS idx_material_stock_material_type ON material_stock(material_type);
CREATE INDEX IF NOT EXISTS idx_material_stock_current_stock ON material_stock(current_stock);

-- Enable Row Level Security
ALTER TABLE material_stock ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for material_stock
DROP POLICY IF EXISTS "Authenticated users can read material stock" ON material_stock;
DROP POLICY IF EXISTS "Authenticated users can insert material stock" ON material_stock;
DROP POLICY IF EXISTS "Authenticated users can update material stock" ON material_stock;

CREATE POLICY "Authenticated users can read material stock" 
    ON material_stock FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Authenticated users can insert material stock" 
    ON material_stock FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update material stock" 
    ON material_stock FOR UPDATE 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON material_stock TO authenticated;

-- Grant sequence permissions (only if sequence exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'material_stock_id_seq') THEN
        GRANT USAGE, SELECT ON SEQUENCE material_stock_id_seq TO authenticated;
    END IF;
END $$;

-- Add function to automatically update current_stock when total_received or total_delivered changes
CREATE OR REPLACE FUNCTION update_material_stock_current_stock()
RETURNS TRIGGER AS $$
BEGIN
    NEW.current_stock = NEW.total_received - NEW.total_delivered;
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate current_stock
DROP TRIGGER IF EXISTS trigger_update_material_stock_current_stock ON material_stock;
CREATE TRIGGER trigger_update_material_stock_current_stock
    BEFORE UPDATE ON material_stock
    FOR EACH ROW
    EXECUTE FUNCTION update_material_stock_current_stock();

-- Verify the table was created successfully
SELECT 'Material Stock table created successfully!' as status;

-- Show the table structure
\d material_stock;