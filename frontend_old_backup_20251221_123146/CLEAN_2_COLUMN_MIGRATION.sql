-- CLEAN 2-COLUMN DESIGN: design_status + production_status
-- This replaces the messy 3-column approach with a clean 2-column structure

-- =====================================================
-- PART 1: Add the 2 clean columns
-- =====================================================

-- Add design_status column with enum values
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS design_status VARCHAR(30) DEFAULT 'pending_from_customer';

-- Add production_status column with enum values  
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS production_status VARCHAR(30) DEFAULT 'pending';

-- =====================================================
-- PART 2: Create enums for data validation
-- =====================================================

-- Design status enum
DO $$ BEGIN
    CREATE TYPE design_status_enum AS ENUM (
        'pending_from_customer',
        'design_received_from_customer', 
        'design_ready'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Production status enum
DO $$ BEGIN
    CREATE TYPE production_status_enum AS ENUM (
        'pending',
        'printing', 
        'post_process'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- PART 3: Migrate existing data from old columns
-- =====================================================

-- Migrate from customization_details if it contains stage info
UPDATE order_items 
SET 
    design_status = CASE 
        WHEN customization_details LIKE '%Design Status: Received%' AND customization_details LIKE '%Ready: Yes%' THEN 'design_ready'
        WHEN customization_details LIKE '%Design Status: Received%' THEN 'design_received_from_customer'
        ELSE 'pending_from_customer'
    END,
    production_status = CASE 
        WHEN customization_details LIKE '%Production Stage: POST PROCESS%' THEN 'post_process'
        WHEN customization_details LIKE '%Production Stage: PRINTING%' THEN 'printing'
        ELSE 'pending'
    END
WHERE customization_details IS NOT NULL;

-- Migrate from current_stage column if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'current_stage') THEN
        UPDATE order_items 
        SET production_status = CASE 
            WHEN current_stage = 'post_process' THEN 'post_process'
            WHEN current_stage = 'printing' THEN 'printing' 
            ELSE 'pending'
        END
        WHERE current_stage IS NOT NULL;
    END IF;
END $$;

-- Migrate from design_ready/design_received columns if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'design_ready') THEN
        UPDATE order_items 
        SET design_status = CASE 
            WHEN design_ready = true THEN 'design_ready'
            WHEN design_received = true THEN 'design_received_from_customer'
            ELSE 'pending_from_customer'
        END
        WHERE design_ready IS NOT NULL OR design_received IS NOT NULL;
    END IF;
END $$;

-- =====================================================
-- PART 4: Drop old confusing columns (OPTIONAL - run after testing)
-- =====================================================

-- Uncomment these after confirming the migration worked:
-- ALTER TABLE order_items DROP COLUMN IF EXISTS current_stage;
-- ALTER TABLE order_items DROP COLUMN IF EXISTS production_stage; 
-- ALTER TABLE order_items DROP COLUMN IF EXISTS design_received;
-- ALTER TABLE order_items DROP COLUMN IF EXISTS design_ready;
-- ALTER TABLE order_items DROP COLUMN IF EXISTS design_file_url;
-- ALTER TABLE order_items DROP COLUMN IF EXISTS design_notes;
-- ALTER TABLE order_items DROP COLUMN IF EXISTS design_received_date;
-- ALTER TABLE order_items DROP COLUMN IF EXISTS design_ready_date;

-- =====================================================
-- PART 5: Create indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_order_items_design_status ON order_items(design_status);
CREATE INDEX IF NOT EXISTS idx_order_items_production_status ON order_items(production_status);

-- =====================================================
-- PART 6: Verification queries
-- =====================================================

-- Check the new column structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'order_items' 
AND column_name IN ('design_status', 'production_status')
ORDER BY column_name;

-- Count items by the new statuses
SELECT 
    design_status,
    production_status,
    COUNT(*) as count
FROM order_items 
GROUP BY design_status, production_status
ORDER BY design_status, production_status;

-- Sample of migrated data
SELECT 
    id,
    design_status,
    production_status,
    customization_details
FROM order_items 
LIMIT 10;

-- =====================================================
-- COMPLETED: Clean 2-column structure implemented
-- =====================================================

/*
After running this migration:

1. DESIGN_STATUS column:
   - 'pending_from_customer' (default)
   - 'design_received_from_customer' 
   - 'design_ready'

2. PRODUCTION_STATUS column:
   - 'pending' (default)
   - 'printing'
   - 'post_process'

3. Old columns preserved (can be dropped after testing)
4. All existing data migrated to new structure
5. Indexes created for performance
6. Enums ensure data integrity
*/