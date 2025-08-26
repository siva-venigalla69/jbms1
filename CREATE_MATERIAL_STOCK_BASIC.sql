-- Create material_stock table for customer material tracking
CREATE TABLE material_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    material_type VARCHAR(50) NOT NULL,
    total_received INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    current_stock INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(customer_id, material_type)
);

-- Create indexes
CREATE INDEX idx_material_stock_customer ON material_stock(customer_id);
CREATE INDEX idx_material_stock_material_type ON material_stock(material_type);

-- Enable RLS and create policies
ALTER TABLE material_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON material_stock
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON material_stock
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON material_stock
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Test the table
INSERT INTO material_stock (customer_id, material_type, total_received, total_delivered, current_stock) 
SELECT 
    c.id,
    'saree',
    0,
    0,
    0
FROM customers c LIMIT 1;

SELECT 'Material stock table created successfully!' as result;