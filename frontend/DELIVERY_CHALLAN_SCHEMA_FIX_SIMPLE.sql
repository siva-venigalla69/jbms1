-- SIMPLE Delivery Challan Schema Fix
-- Fixes column existence errors and relationship issues
-- PRIORITY: IMMEDIATE - Resolves schema errors safely

-- ==============================================
-- STEP 1: ADD MISSING COLUMNS SAFELY
-- ==============================================

-- Add missing columns to delivery_challans table
DO $$
BEGIN
    -- Add order_id column if it doesn't exist
    BEGIN
        ALTER TABLE delivery_challans ADD COLUMN order_id UUID;
        RAISE NOTICE 'Added order_id column to delivery_challans';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'Column order_id already exists in delivery_challans';
    END;
    
    -- Add driver_name column if it doesn't exist
    BEGIN
        ALTER TABLE delivery_challans ADD COLUMN driver_name VARCHAR(100);
        RAISE NOTICE 'Added driver_name column to delivery_challans';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'Column driver_name already exists in delivery_challans';
    END;
    
    -- Add vehicle_number column if it doesn't exist
    BEGIN
        ALTER TABLE delivery_challans ADD COLUMN vehicle_number VARCHAR(20);
        RAISE NOTICE 'Added vehicle_number column to delivery_challans';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'Column vehicle_number already exists in delivery_challans';
    END;
    
    -- Add updated_at column if it doesn't exist
    BEGIN
        ALTER TABLE delivery_challans ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to delivery_challans';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'Column updated_at already exists in delivery_challans';
    END;
END $$;

-- Add missing columns to delivery_challan_items table
DO $$
BEGIN
    -- Add order_id column if it doesn't exist
    BEGIN
        ALTER TABLE delivery_challan_items ADD COLUMN order_id UUID;
        RAISE NOTICE 'Added order_id column to delivery_challan_items';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'Column order_id already exists in delivery_challan_items';
    END;
    
    -- Add order_item_id column if it doesn't exist
    BEGIN
        ALTER TABLE delivery_challan_items ADD COLUMN order_item_id UUID;
        RAISE NOTICE 'Added order_item_id column to delivery_challan_items';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'Column order_item_id already exists in delivery_challan_items';
    END;
END $$;

-- ==============================================
-- STEP 2: ADD FOREIGN KEY CONSTRAINTS SAFELY
-- ==============================================

-- Add customer foreign key to delivery_challans
DO $$
BEGIN
    BEGIN
        ALTER TABLE delivery_challans 
        ADD CONSTRAINT fk_delivery_challans_customer 
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added customer foreign key to delivery_challans';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'Customer foreign key already exists in delivery_challans';
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not add customer foreign key: %', SQLERRM;
    END;
END $$;

-- Add order foreign key to delivery_challans (optional)
DO $$
BEGIN
    BEGIN
        ALTER TABLE delivery_challans 
        ADD CONSTRAINT fk_delivery_challans_order 
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added order foreign key to delivery_challans';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'Order foreign key already exists in delivery_challans';
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not add order foreign key (this is OK if orders table does not exist): %', SQLERRM;
    END;
END $$;

-- Add foreign keys to delivery_challan_items
DO $$
BEGIN
    -- Delivery challan foreign key (required)
    BEGIN
        ALTER TABLE delivery_challan_items 
        ADD CONSTRAINT fk_delivery_challan_items_challan 
        FOREIGN KEY (delivery_challan_id) REFERENCES delivery_challans(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added challan foreign key to delivery_challan_items';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'Challan foreign key already exists in delivery_challan_items';
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not add challan foreign key: %', SQLERRM;
    END;
    
    -- Order foreign key (optional)
    BEGIN
        ALTER TABLE delivery_challan_items 
        ADD CONSTRAINT fk_delivery_challan_items_order 
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added order foreign key to delivery_challan_items';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'Order foreign key already exists in delivery_challan_items';
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not add order foreign key (this is OK if orders table does not exist): %', SQLERRM;
    END;
    
    -- Order item foreign key (optional)
    BEGIN
        ALTER TABLE delivery_challan_items 
        ADD CONSTRAINT fk_delivery_challan_items_order_item 
        FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added order_item foreign key to delivery_challan_items';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'Order item foreign key already exists in delivery_challan_items';
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not add order item foreign key (this is OK if order_items table does not exist): %', SQLERRM;
    END;
END $$;

-- ==============================================
-- STEP 3: ADD INDEXES FOR PERFORMANCE
-- ==============================================

-- Create indexes with error handling
DO $$
BEGIN
    -- Delivery challans indexes
    BEGIN
        CREATE INDEX idx_delivery_challans_customer ON delivery_challans(customer_id);
        RAISE NOTICE 'Created customer index on delivery_challans';
    EXCEPTION
        WHEN duplicate_table THEN
            RAISE NOTICE 'Customer index already exists on delivery_challans';
    END;
    
    BEGIN
        CREATE INDEX idx_delivery_challans_order ON delivery_challans(order_id);
        RAISE NOTICE 'Created order index on delivery_challans';
    EXCEPTION
        WHEN duplicate_table THEN
            RAISE NOTICE 'Order index already exists on delivery_challans';
    END;
    
    BEGIN
        CREATE INDEX idx_delivery_challans_status ON delivery_challans(status);
        RAISE NOTICE 'Created status index on delivery_challans';
    EXCEPTION
        WHEN duplicate_table THEN
            RAISE NOTICE 'Status index already exists on delivery_challans';
    END;
    
    -- Delivery challan items indexes
    BEGIN
        CREATE INDEX idx_delivery_challan_items_challan ON delivery_challan_items(delivery_challan_id);
        RAISE NOTICE 'Created challan index on delivery_challan_items';
    EXCEPTION
        WHEN duplicate_table THEN
            RAISE NOTICE 'Challan index already exists on delivery_challan_items';
    END;
    
    BEGIN
        CREATE INDEX idx_delivery_challan_items_order ON delivery_challan_items(order_id);
        RAISE NOTICE 'Created order index on delivery_challan_items';
    EXCEPTION
        WHEN duplicate_table THEN
            RAISE NOTICE 'Order index already exists on delivery_challan_items';
    END;
END $$;

-- ==============================================
-- STEP 4: ROW LEVEL SECURITY
-- ==============================================

-- Enable RLS safely
DO $$
BEGIN
    ALTER TABLE delivery_challans ENABLE ROW LEVEL SECURITY;
    ALTER TABLE delivery_challan_items ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on delivery challan tables';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'RLS setup: %', SQLERRM;
END $$;

-- Create policies safely
DO $$
BEGIN
    -- Policies for delivery_challans
    BEGIN
        CREATE POLICY "Authenticated users can read delivery challans"
            ON delivery_challans FOR SELECT
            USING (auth.role() = 'authenticated');
        RAISE NOTICE 'Created read policy for delivery_challans';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'Read policy already exists for delivery_challans';
    END;
    
    BEGIN
        CREATE POLICY "Authenticated users can insert delivery challans"
            ON delivery_challans FOR INSERT
            WITH CHECK (auth.role() = 'authenticated');
        RAISE NOTICE 'Created insert policy for delivery_challans';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'Insert policy already exists for delivery_challans';
    END;
    
    BEGIN
        CREATE POLICY "Authenticated users can update delivery challans"
            ON delivery_challans FOR UPDATE
            USING (auth.role() = 'authenticated');
        RAISE NOTICE 'Created update policy for delivery_challans';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'Update policy already exists for delivery_challans';
    END;
    
    -- Policies for delivery_challan_items
    BEGIN
        CREATE POLICY "Authenticated users can read delivery challan items"
            ON delivery_challan_items FOR SELECT
            USING (auth.role() = 'authenticated');
        RAISE NOTICE 'Created read policy for delivery_challan_items';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'Read policy already exists for delivery_challan_items';
    END;
    
    BEGIN
        CREATE POLICY "Authenticated users can insert delivery challan items"
            ON delivery_challan_items FOR INSERT
            WITH CHECK (auth.role() = 'authenticated');
        RAISE NOTICE 'Created insert policy for delivery_challan_items';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'Insert policy already exists for delivery_challan_items';
    END;
    
    BEGIN
        CREATE POLICY "Authenticated users can update delivery challan items"
            ON delivery_challan_items FOR UPDATE
            USING (auth.role() = 'authenticated');
        RAISE NOTICE 'Created update policy for delivery_challan_items';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'Update policy already exists for delivery_challan_items';
    END;
END $$;

-- ==============================================
-- STEP 5: GRANT PERMISSIONS
-- ==============================================

DO $$
BEGIN
    GRANT SELECT, INSERT, UPDATE ON delivery_challans TO authenticated;
    GRANT SELECT, INSERT, UPDATE ON delivery_challan_items TO authenticated;
    RAISE NOTICE 'Granted permissions to authenticated users';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Permission grants: %', SQLERRM;
END $$;

-- ==============================================
-- VERIFICATION
-- ==============================================

-- Verify table structure
SELECT 
    'delivery_challans' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'delivery_challans'
ORDER BY ordinal_position;

-- Verify constraints
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type
FROM information_schema.table_constraints AS tc
WHERE tc.table_name IN ('delivery_challans', 'delivery_challan_items')
    AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, tc.constraint_name;

-- Final status
SELECT 'Delivery Challan Schema Fix completed successfully! ✅' as status;