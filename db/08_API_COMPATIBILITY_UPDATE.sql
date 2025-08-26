-- =====================================
-- API COMPATIBILITY UPDATE
-- Updates the database to work with current API structure
-- Run this AFTER the stock calculation fix
-- =====================================

-- 1. CHECK MATERIAL TYPES MAPPING
-- Your API expects material_type as strings, but DB uses foreign keys
SELECT 
    'MATERIAL TYPES REFERENCE:' as info,
    id,
    name,
    'API expects: ' || name as api_compatibility
FROM material_types
ORDER BY name;

-- 2. ADD MISSING COLUMNS TO DELIVERY_CHALLANS
-- API expects these fields but they're missing from current schema
DO $$
BEGIN
    -- Add order_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'delivery_challans' AND column_name = 'order_id'
    ) THEN
        ALTER TABLE delivery_challans ADD COLUMN order_id UUID;
        ALTER TABLE delivery_challans ADD CONSTRAINT fk_delivery_challans_order 
            FOREIGN KEY (order_id) REFERENCES orders(id);
        RAISE NOTICE 'Added order_id column to delivery_challans';
    END IF;
    
    -- Add total_amount column if it doesn't exist  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'delivery_challans' AND column_name = 'total_amount'
    ) THEN
        ALTER TABLE delivery_challans ADD COLUMN total_amount DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE 'Added total_amount column to delivery_challans';
    END IF;
END $$;

-- 3. CREATE VIEW FOR API COMPATIBILITY
-- This allows API to work with current schema while maintaining compatibility
CREATE OR REPLACE VIEW delivery_challans_api_view AS
SELECT 
    id,
    challan_number,
    customer_id,
    challan_date as delivery_date,  -- Map to API expected field name
    total_quantity,
    delivery_status as status,      -- Map to API expected field name
    order_id,
    total_amount,
    notes,
    is_deleted,
    created_by_user_id,
    created_at,
    updated_at
FROM delivery_challans;

-- 4. CREATE VIEW FOR MATERIAL STOCK WITH STRING TYPES
-- API expects material_type as string, not foreign key
CREATE OR REPLACE VIEW material_stock_api_view AS
SELECT 
    ms.id,
    ms.customer_id,
    mt.name as material_type,  -- Convert foreign key to string
    ms.total_received,
    ms.total_delivered,
    ms.current_stock,
    ms.last_updated,
    ms.created_at,
    ms.notes
FROM material_stock ms
LEFT JOIN material_types mt ON ms.material_type = mt.id;

-- 5. CREATE VIEW FOR MATERIAL_IN WITH STRING TYPES
CREATE OR REPLACE VIEW material_in_api_view AS
SELECT 
    mi.id,
    mi.customer_id,
    mi.order_id,
    mt.name as material_type,  -- Convert foreign key to string
    mi.quantity,
    mi.unit,
    mi.received_date,
    mi.notes,
    mi.created_by_user_id,
    mi.created_at
FROM material_in mi
LEFT JOIN material_types mt ON mi.material_type = mt.id;

-- 6. CREATE FUNCTION TO GET MATERIAL_TYPE_ID FROM STRING
-- This helps API insert data correctly
CREATE OR REPLACE FUNCTION get_material_type_id(type_name TEXT)
RETURNS UUID AS $$
DECLARE
    type_id UUID;
BEGIN
    SELECT id INTO type_id 
    FROM material_types 
    WHERE name = type_name;
    
    IF type_id IS NULL THEN
        -- If material type doesn't exist, create it
        INSERT INTO material_types (name, created_at)
        VALUES (type_name, NOW())
        RETURNING id INTO type_id;
    END IF;
    
    RETURN type_id;
END;
$$ LANGUAGE plpgsql;

-- 7. CREATE FUNCTION TO INSERT MATERIAL_IN WITH STRING TYPE
CREATE OR REPLACE FUNCTION insert_material_in_with_string_type(
    p_customer_id UUID,
    p_order_id UUID,
    p_material_type_name TEXT,
    p_quantity INTEGER,
    p_unit TEXT DEFAULT NULL,
    p_received_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    p_notes TEXT DEFAULT NULL,
    p_created_by_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    material_type_id UUID;
    new_record_id UUID;
BEGIN
    -- Get or create material type
    material_type_id := get_material_type_id(p_material_type_name);
    
    -- Insert the record
    INSERT INTO material_in (
        customer_id, order_id, material_type, quantity, unit, 
        received_date, notes, created_by_user_id, created_at
    )
    VALUES (
        p_customer_id, p_order_id, material_type_id, p_quantity, p_unit,
        p_received_date, p_notes, p_created_by_user_id, NOW()
    )
    RETURNING id INTO new_record_id;
    
    RETURN new_record_id;
END;
$$ LANGUAGE plpgsql;

-- 8. CREATE INDEXES FOR BETTER PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_material_stock_customer_type 
ON material_stock(customer_id, material_type);

CREATE INDEX IF NOT EXISTS idx_material_in_customer_type 
ON material_in(customer_id, material_type);

CREATE INDEX IF NOT EXISTS idx_delivery_challans_customer_date 
ON delivery_challans(customer_id, challan_date);

-- 9. GRANT PERMISSIONS TO AUTHENTICATED USERS
-- Ensure API can access the new views and functions
GRANT SELECT ON delivery_challans_api_view TO authenticated;
GRANT SELECT ON material_stock_api_view TO authenticated; 
GRANT SELECT ON material_in_api_view TO authenticated;
GRANT EXECUTE ON FUNCTION get_material_type_id(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION insert_material_in_with_string_type(UUID, UUID, TEXT, INTEGER, TEXT, TIMESTAMP WITH TIME ZONE, TEXT, UUID) TO authenticated;

-- 10. VERIFY API COMPATIBILITY
SELECT 
    'API COMPATIBILITY CHECK:' as status,
    'Views created for API compatibility' as result;

SELECT 
    'MATERIAL STOCK VIEW:' as check,
    COUNT(*) as record_count
FROM material_stock_api_view;

SELECT 
    'DELIVERY CHALLANS VIEW:' as check,
    COUNT(*) as record_count  
FROM delivery_challans_api_view;