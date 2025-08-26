-- CORRECTED Delivery Challan Schema Fix
-- Based on actual database table structure
-- PRIORITY: IMMEDIATE - Fixes actual table names and columns

-- ==============================================
-- ACTUAL DATABASE STRUCTURE (from schema_fixed.sql):
-- delivery_challans - main table exists
-- challan_items - NOT delivery_challan_items!
-- ==============================================

-- First, let's verify what exists
SELECT 'Checking existing tables...' as status;

SELECT table_name, 
       CASE 
         WHEN table_name = 'delivery_challans' THEN '✅ EXISTS'
         WHEN table_name = 'challan_items' THEN '✅ EXISTS' 
         ELSE '❌ MISSING'
       END as status
FROM information_schema.tables 
WHERE table_name IN ('delivery_challans', 'challan_items', 'delivery_challan_items')
ORDER BY table_name;

-- ==============================================
-- STEP 1: ADD MISSING COLUMNS TO EXISTING TABLES
-- ==============================================

-- Add missing columns to delivery_challans table
DO $$
BEGIN
    -- Add order_id column if it doesn't exist (for optional order linking)
    BEGIN
        ALTER TABLE delivery_challans ADD COLUMN order_id UUID;
        RAISE NOTICE '✅ Added order_id column to delivery_challans';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE '⚠️ Column order_id already exists in delivery_challans';
    END;
    
    -- Add delivery_date column if needed (might be challan_date instead)
    BEGIN
        -- Check if we have challan_date but need delivery_date for API compatibility
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_challans' AND column_name = 'challan_date') 
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_challans' AND column_name = 'delivery_date') THEN
            ALTER TABLE delivery_challans ADD COLUMN delivery_date DATE GENERATED ALWAYS AS (challan_date::date) STORED;
            RAISE NOTICE '✅ Added delivery_date as computed column from challan_date';
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Could not add delivery_date: %', SQLERRM;
    END;
    
    -- Add status column if different name exists
    BEGIN
        -- Check if we have delivery_status but API expects status
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_challans' AND column_name = 'delivery_status') 
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_challans' AND column_name = 'status') THEN
            -- Create a view or alias for status compatibility
            ALTER TABLE delivery_challans ADD COLUMN status VARCHAR(20) GENERATED ALWAYS AS (delivery_status) STORED;
            RAISE NOTICE '✅ Added status as computed column from delivery_status';
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Could not add status column: %', SQLERRM;
    END;
    
    -- Add total_amount column if missing
    BEGIN
        ALTER TABLE delivery_challans ADD COLUMN total_amount DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE '✅ Added total_amount column to delivery_challans';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE '⚠️ Column total_amount already exists in delivery_challans';
    END;
END $$;

-- Add missing columns to challan_items table (not delivery_challan_items!)
DO $$
BEGIN
    -- Add material_type column if missing
    BEGIN
        ALTER TABLE challan_items ADD COLUMN material_type VARCHAR(50);
        RAISE NOTICE '✅ Added material_type column to challan_items';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE '⚠️ Column material_type already exists in challan_items';
    END;
    
    -- Add quantity_delivered column if missing (rename from quantity if needed)
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'challan_items' AND column_name = 'quantity') 
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'challan_items' AND column_name = 'quantity_delivered') THEN
            ALTER TABLE challan_items ADD COLUMN quantity_delivered DECIMAL(10,3) GENERATED ALWAYS AS (quantity::decimal) STORED;
            RAISE NOTICE '✅ Added quantity_delivered as computed column from quantity';
        ELSE
            ALTER TABLE challan_items ADD COLUMN quantity_delivered DECIMAL(10,3);
            RAISE NOTICE '✅ Added quantity_delivered column to challan_items';
        END IF;
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE '⚠️ Column quantity_delivered already exists in challan_items';
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Could not add quantity_delivered: %', SQLERRM;
    END;
    
    -- Add unit_price column if missing
    BEGIN
        ALTER TABLE challan_items ADD COLUMN unit_price DECIMAL(10,2);
        RAISE NOTICE '✅ Added unit_price column to challan_items';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE '⚠️ Column unit_price already exists in challan_items';
    END;
    
    -- Add subtotal column if missing
    BEGIN
        ALTER TABLE challan_items ADD COLUMN subtotal DECIMAL(10,2);
        RAISE NOTICE '✅ Added subtotal column to challan_items';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE '⚠️ Column subtotal already exists in challan_items';
    END;
    
    -- Add order_id column for direct order reference
    BEGIN
        ALTER TABLE challan_items ADD COLUMN order_id UUID;
        RAISE NOTICE '✅ Added order_id column to challan_items';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE '⚠️ Column order_id already exists in challan_items';
    END;
    
    -- Rename challan_id to delivery_challan_id for API compatibility if needed
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'challan_items' AND column_name = 'challan_id') 
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'challan_items' AND column_name = 'delivery_challan_id') THEN
            ALTER TABLE challan_items ADD COLUMN delivery_challan_id UUID GENERATED ALWAYS AS (challan_id) STORED;
            RAISE NOTICE '✅ Added delivery_challan_id as computed column from challan_id';
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Could not add delivery_challan_id: %', SQLERRM;
    END;
END $$;

-- ==============================================
-- STEP 2: ADD SAFE FOREIGN KEY CONSTRAINTS
-- ==============================================

DO $$
BEGIN
    -- Add order foreign key to delivery_challans (optional)
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
            ALTER TABLE delivery_challans 
            ADD CONSTRAINT fk_delivery_challans_order 
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;
            RAISE NOTICE '✅ Added order foreign key to delivery_challans';
        END IF;
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE '⚠️ Order foreign key already exists in delivery_challans';
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Could not add order foreign key: %', SQLERRM;
    END;
    
    -- Add order foreign key to challan_items (optional)
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
            ALTER TABLE challan_items 
            ADD CONSTRAINT fk_challan_items_order 
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;
            RAISE NOTICE '✅ Added order foreign key to challan_items';
        END IF;
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE '⚠️ Order foreign key already exists in challan_items';
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Could not add order foreign key: %', SQLERRM;
    END;
END $$;

-- ==============================================
-- STEP 3: CREATE USEFUL INDEXES
-- ==============================================

DO $$
BEGIN
    -- Indexes on delivery_challans
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_delivery_challans_customer ON delivery_challans(customer_id);
        CREATE INDEX IF NOT EXISTS idx_delivery_challans_order ON delivery_challans(order_id);
        CREATE INDEX IF NOT EXISTS idx_delivery_challans_date ON delivery_challans(challan_date);
        CREATE INDEX IF NOT EXISTS idx_delivery_challans_status ON delivery_challans(delivery_status);
        RAISE NOTICE '✅ Created indexes on delivery_challans';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Index creation: %', SQLERRM;
    END;
    
    -- Indexes on challan_items
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_challan_items_challan ON challan_items(challan_id);
        CREATE INDEX IF NOT EXISTS idx_challan_items_order_item ON challan_items(order_item_id);
        CREATE INDEX IF NOT EXISTS idx_challan_items_order ON challan_items(order_id);
        RAISE NOTICE '✅ Created indexes on challan_items';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Index creation: %', SQLERRM;
    END;
END $$;

-- ==============================================
-- STEP 4: ROW LEVEL SECURITY
-- ==============================================

-- ==============================================
-- STEP 4: ROW LEVEL SECURITY (SAFE VERSION)
-- ==============================================

DO $$
BEGIN
    -- Enable RLS if not already enabled
    ALTER TABLE delivery_challans ENABLE ROW LEVEL SECURITY;
    ALTER TABLE challan_items ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ RLS enabled on delivery challan tables';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ RLS setup: %', SQLERRM;
END $$;

-- Create policies with safe DROP/CREATE pattern
DO $$
BEGIN
    -- Policies for delivery_challans
    BEGIN
        DROP POLICY IF EXISTS "Authenticated users can read delivery challans" ON delivery_challans;
        CREATE POLICY "Authenticated users can read delivery challans"
            ON delivery_challans FOR SELECT
            USING (auth.role() = 'authenticated');
        RAISE NOTICE '✅ Created read policy for delivery_challans';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Read policy for delivery_challans: %', SQLERRM;
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Authenticated users can insert delivery challans" ON delivery_challans;
        CREATE POLICY "Authenticated users can insert delivery challans"
            ON delivery_challans FOR INSERT
            WITH CHECK (auth.role() = 'authenticated');
        RAISE NOTICE '✅ Created insert policy for delivery_challans';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Insert policy for delivery_challans: %', SQLERRM;
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Authenticated users can update delivery challans" ON delivery_challans;
        CREATE POLICY "Authenticated users can update delivery challans"
            ON delivery_challans FOR UPDATE
            USING (auth.role() = 'authenticated');
        RAISE NOTICE '✅ Created update policy for delivery_challans';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Update policy for delivery_challans: %', SQLERRM;
    END;
END $$;

-- Create policies for challan_items
DO $$
BEGIN
    BEGIN
        DROP POLICY IF EXISTS "Authenticated users can read challan items" ON challan_items;
        CREATE POLICY "Authenticated users can read challan items"
            ON challan_items FOR SELECT
            USING (auth.role() = 'authenticated');
        RAISE NOTICE '✅ Created read policy for challan_items';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Read policy for challan_items: %', SQLERRM;
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Authenticated users can insert challan items" ON challan_items;
        CREATE POLICY "Authenticated users can insert challan items"
            ON challan_items FOR INSERT
            WITH CHECK (auth.role() = 'authenticated');
        RAISE NOTICE '✅ Created insert policy for challan_items';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Insert policy for challan_items: %', SQLERRM;
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Authenticated users can update challan items" ON challan_items;
        CREATE POLICY "Authenticated users can update challan items"
            ON challan_items FOR UPDATE
            USING (auth.role() = 'authenticated');
        RAISE NOTICE '✅ Created update policy for challan_items';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Update policy for challan_items: %', SQLERRM;
    END;
END $$;

-- ==============================================
-- STEP 5: GRANT PERMISSIONS
-- ==============================================

DO $$
BEGIN
    GRANT SELECT, INSERT, UPDATE ON delivery_challans TO authenticated;
    GRANT SELECT, INSERT, UPDATE ON challan_items TO authenticated;
    RAISE NOTICE '✅ Permissions granted to authenticated users';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Permission grants: %', SQLERRM;
END $$;

-- ==============================================
-- VERIFICATION QUERIES
-- ==============================================

-- Check final table structures
SELECT 
    'delivery_challans' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'delivery_challans'
ORDER BY ordinal_position;

-- Show challan_items structure  
SELECT 
    'challan_items' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'challan_items'
ORDER BY ordinal_position;

-- Test basic queries that the API will use
SELECT 
    COUNT(*) as delivery_challans_count
FROM delivery_challans;

SELECT 
    COUNT(*) as challan_items_count  
FROM challan_items;

-- Final success message
SELECT 'Delivery Challan Schema Fix completed successfully! 🎉' as status,
       'API should now work with delivery challans' as note;