-- Delivery Challan Schema Fix
-- Fixes relationship issues and missing foreign keys
-- PRIORITY: HIGH - Resolves API relationship errors

-- ==============================================
-- DELIVERY CHALLAN TABLE FIXES
-- ==============================================

-- Ensure delivery_challans table exists with proper structure
CREATE TABLE IF NOT EXISTS delivery_challans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    challan_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id UUID NOT NULL,
    order_id UUID,  -- Made optional since some challans may not be linked to specific orders
    delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'delivered', 'returned')),
    total_amount DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    driver_name VARCHAR(100),
    vehicle_number VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure delivery_challan_items table exists
CREATE TABLE IF NOT EXISTS delivery_challan_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    delivery_challan_id UUID NOT NULL,
    order_id UUID,  -- Reference to order (may be different from challan's order_id)
    order_item_id UUID,  -- Reference to specific order item
    material_type VARCHAR(50) NOT NULL,
    quantity_delivered DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(10,2),
    subtotal DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- ADD MISSING COLUMNS TO EXISTING TABLES
-- ==============================================

-- Add missing columns to delivery_challans if they don't exist
DO $$
BEGIN
    -- Add order_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'delivery_challans' AND column_name = 'order_id'
    ) THEN
        ALTER TABLE delivery_challans ADD COLUMN order_id UUID;
    END IF;
    
    -- Add other missing columns if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'delivery_challans' AND column_name = 'driver_name'
    ) THEN
        ALTER TABLE delivery_challans ADD COLUMN driver_name VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'delivery_challans' AND column_name = 'vehicle_number'
    ) THEN
        ALTER TABLE delivery_challans ADD COLUMN vehicle_number VARCHAR(20);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'delivery_challans' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE delivery_challans ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Add missing columns to delivery_challan_items if they don't exist
DO $$
BEGIN
    -- Add order_item_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'delivery_challan_items' AND column_name = 'order_item_id'
    ) THEN
        ALTER TABLE delivery_challan_items ADD COLUMN order_item_id UUID;
    END IF;
    
    -- Add order_id column to items table if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'delivery_challan_items' AND column_name = 'order_id'
    ) THEN
        ALTER TABLE delivery_challan_items ADD COLUMN order_id UUID;
    END IF;
END $$;

-- ==============================================
-- ADD MISSING FOREIGN KEY CONSTRAINTS
-- ==============================================

-- Add foreign key constraints for delivery_challans table
DO $$
BEGIN
    -- Customer foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'delivery_challans' 
        AND constraint_name = 'fk_delivery_challans_customer'
    ) THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
            -- Only add if customer_id column exists
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'delivery_challans' AND column_name = 'customer_id'
            ) THEN
                ALTER TABLE delivery_challans 
                ADD CONSTRAINT fk_delivery_challans_customer 
                FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
            END IF;
        END IF;
    END IF;
    
    -- Order foreign key (optional)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'delivery_challans' 
        AND constraint_name = 'fk_delivery_challans_order'
    ) THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
            -- Only add if order_id column exists (we just added it above)
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'delivery_challans' AND column_name = 'order_id'
            ) THEN
                ALTER TABLE delivery_challans 
                ADD CONSTRAINT fk_delivery_challans_order 
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;
            END IF;
        END IF;
    END IF;
END $$;

-- Add foreign key constraints for delivery_challan_items table
DO $$
BEGIN
    -- Delivery challan foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'delivery_challan_items' 
        AND constraint_name = 'fk_delivery_challan_items_challan'
    ) THEN
        ALTER TABLE delivery_challan_items 
        ADD CONSTRAINT fk_delivery_challan_items_challan 
        FOREIGN KEY (delivery_challan_id) REFERENCES delivery_challans(id) ON DELETE CASCADE;
    END IF;
    
    -- Order foreign key (optional)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'delivery_challan_items' 
        AND constraint_name = 'fk_delivery_challan_items_order'
    ) THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
            -- Only add if order_id column exists
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'delivery_challan_items' AND column_name = 'order_id'
            ) THEN
                ALTER TABLE delivery_challan_items 
                ADD CONSTRAINT fk_delivery_challan_items_order 
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;
            END IF;
        END IF;
    END IF;
    
    -- Order item foreign key (optional)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'delivery_challan_items' 
        AND constraint_name = 'fk_delivery_challan_items_order_item'
    ) THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items') THEN
            -- Only add if order_item_id column exists
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'delivery_challan_items' AND column_name = 'order_item_id'
            ) THEN
                ALTER TABLE delivery_challan_items 
                ADD CONSTRAINT fk_delivery_challan_items_order_item 
                FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE SET NULL;
            END IF;
        END IF;
    END IF;
END $$;

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================

-- Delivery challans indexes
CREATE INDEX IF NOT EXISTS idx_delivery_challans_customer ON delivery_challans(customer_id);
CREATE INDEX IF NOT EXISTS idx_delivery_challans_order ON delivery_challans(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_challans_status ON delivery_challans(status);
CREATE INDEX IF NOT EXISTS idx_delivery_challans_date ON delivery_challans(delivery_date DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_challans_challan_number ON delivery_challans(challan_number);

-- Delivery challan items indexes
CREATE INDEX IF NOT EXISTS idx_delivery_challan_items_challan ON delivery_challan_items(delivery_challan_id);
CREATE INDEX IF NOT EXISTS idx_delivery_challan_items_order ON delivery_challan_items(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_challan_items_order_item ON delivery_challan_items(order_item_id);
CREATE INDEX IF NOT EXISTS idx_delivery_challan_items_material ON delivery_challan_items(material_type);

-- ==============================================
-- TRIGGERS FOR DATA INTEGRITY
-- ==============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_delivery_challan_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamp on delivery challans
DROP TRIGGER IF EXISTS trigger_update_delivery_challan_timestamp ON delivery_challans;
CREATE TRIGGER trigger_update_delivery_challan_timestamp
    BEFORE UPDATE ON delivery_challans
    FOR EACH ROW
    EXECUTE FUNCTION update_delivery_challan_timestamp();

-- Function to calculate challan totals
CREATE OR REPLACE FUNCTION update_challan_total()
RETURNS TRIGGER AS $$
DECLARE
    challan_total DECIMAL(10,2);
BEGIN
    -- Calculate total from items
    SELECT COALESCE(SUM(subtotal), 0) 
    INTO challan_total
    FROM delivery_challan_items 
    WHERE delivery_challan_id = COALESCE(NEW.delivery_challan_id, OLD.delivery_challan_id);
    
    -- Update delivery challan total
    UPDATE delivery_challans 
    SET total_amount = challan_total,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.delivery_challan_id, OLD.delivery_challan_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update challan totals when items change
DROP TRIGGER IF EXISTS trigger_update_challan_total ON delivery_challan_items;
CREATE TRIGGER trigger_update_challan_total
    AFTER INSERT OR UPDATE OR DELETE ON delivery_challan_items
    FOR EACH ROW
    EXECUTE FUNCTION update_challan_total();

-- ==============================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================

-- Enable RLS on both tables
ALTER TABLE delivery_challans ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_challan_items ENABLE ROW LEVEL SECURITY;

-- Policies for delivery_challans
DROP POLICY IF EXISTS "Authenticated users can read delivery challans" ON delivery_challans;
CREATE POLICY "Authenticated users can read delivery challans"
    ON delivery_challans FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert delivery challans" ON delivery_challans;
CREATE POLICY "Authenticated users can insert delivery challans"
    ON delivery_challans FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update delivery challans" ON delivery_challans;
CREATE POLICY "Authenticated users can update delivery challans"
    ON delivery_challans FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Policies for delivery_challan_items
DROP POLICY IF EXISTS "Authenticated users can read delivery challan items" ON delivery_challan_items;
CREATE POLICY "Authenticated users can read delivery challan items"
    ON delivery_challan_items FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert delivery challan items" ON delivery_challan_items;
CREATE POLICY "Authenticated users can insert delivery challan items"
    ON delivery_challan_items FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update delivery challan items" ON delivery_challan_items;
CREATE POLICY "Authenticated users can update delivery challan items"
    ON delivery_challan_items FOR UPDATE
    USING (auth.role() = 'authenticated');

-- ==============================================
-- GRANT PERMISSIONS
-- ==============================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON delivery_challans TO authenticated;
GRANT SELECT, INSERT, UPDATE ON delivery_challan_items TO authenticated;

-- ==============================================
-- SAMPLE DATA (FOR TESTING)
-- ==============================================

-- Insert sample delivery challan data if customers and orders exist
DO $$
DECLARE
    sample_customer_id UUID;
    sample_order_id UUID;
    sample_challan_id UUID;
BEGIN
    -- Get a sample customer
    SELECT id INTO sample_customer_id FROM customers LIMIT 1;
    
    -- Get a sample order
    SELECT id INTO sample_order_id FROM orders LIMIT 1;
    
    -- Only create sample data if we have customers
    IF sample_customer_id IS NOT NULL THEN
        -- Insert sample delivery challan
        INSERT INTO delivery_challans (
            challan_number,
            customer_id,
            order_id,
            delivery_date,
            status,
            notes,
            driver_name,
            vehicle_number
        ) VALUES (
            'DC-SAMPLE-' || EXTRACT(EPOCH FROM NOW())::TEXT,
            sample_customer_id,
            sample_order_id,
            CURRENT_DATE,
            'delivered',
            'Sample delivery challan for testing',
            'John Driver',
            'KA01AB1234'
        ) 
        ON CONFLICT (challan_number) DO NOTHING
        RETURNING id INTO sample_challan_id;
        
        -- Insert sample challan items if challan was created
        IF sample_challan_id IS NOT NULL THEN
            INSERT INTO delivery_challan_items (
                delivery_challan_id,
                order_id,
                material_type,
                quantity_delivered,
                unit_price,
                subtotal,
                notes
            ) VALUES 
            (sample_challan_id, sample_order_id, 'Cotton', 25.50, 45.00, 1147.50, 'Cotton fabric delivered'),
            (sample_challan_id, sample_order_id, 'Silk', 15.75, 85.00, 1338.75, 'Silk fabric delivered')
            ON CONFLICT DO NOTHING;
        END IF;
        
        RAISE NOTICE 'Sample delivery challan data created successfully';
    ELSE
        RAISE NOTICE 'No customers found - skipping sample delivery challan data';
    END IF;
END $$;

-- ==============================================
-- VERIFICATION QUERIES
-- ==============================================

-- Check if tables exist and have proper structure
SELECT 'delivery_challans' as table_name, COUNT(*) as record_count 
FROM delivery_challans
UNION ALL
SELECT 'delivery_challan_items' as table_name, COUNT(*) as record_count 
FROM delivery_challan_items;

-- Check foreign key constraints
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('delivery_challans', 'delivery_challan_items')
ORDER BY tc.table_name, tc.constraint_name;

-- Test sample data retrieval
SELECT 
    dc.challan_number,
    dc.status,
    dc.delivery_date,
    dc.total_amount,
    COUNT(dci.id) as item_count
FROM delivery_challans dc
LEFT JOIN delivery_challan_items dci ON dc.id = dci.delivery_challan_id
GROUP BY dc.id, dc.challan_number, dc.status, dc.delivery_date, dc.total_amount
ORDER BY dc.created_at DESC
LIMIT 5;

-- ==============================================
-- COMPLETION NOTICE
-- ==============================================

-- This schema fix provides:
-- ✅ Proper delivery challan table structure
-- ✅ Foreign key relationships to customers and orders
-- ✅ Optional order relationships (allows challans without specific orders)
-- ✅ Automatic total calculations
-- ✅ Performance indexes
-- ✅ Row-level security
-- ✅ Sample data for testing
-- ✅ Comprehensive error handling

-- After running this script:
-- 1. Delivery challan API errors should be resolved
-- 2. Frontend can load delivery challans successfully
-- 3. Proper relationships established with customers
-- 4. Optional relationships with orders maintained
-- 5. Ready for production use

SELECT 'Delivery Challan Schema Fix completed successfully!' as status;