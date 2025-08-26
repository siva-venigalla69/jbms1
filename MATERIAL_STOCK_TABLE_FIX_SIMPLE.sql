-- Simple Fix for Material Stock Table - Missing from Schema
-- This table is required for tracking customer material stock

-- Create material_stock table
CREATE TABLE IF NOT EXISTS material_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL,
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

-- Add foreign key constraint to customers table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_material_stock_customer' 
        AND table_name = 'material_stock'
    ) THEN
        ALTER TABLE material_stock 
        ADD CONSTRAINT fk_material_stock_customer 
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
    END IF;
END $$;

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

-- Grant basic permissions (no sequence needed for UUID)
GRANT SELECT, INSERT, UPDATE ON material_stock TO authenticated;

-- Verify the table was created successfully
SELECT 
    'Material Stock table created successfully! Columns:' as status,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'material_stock' 
ORDER BY ordinal_position;