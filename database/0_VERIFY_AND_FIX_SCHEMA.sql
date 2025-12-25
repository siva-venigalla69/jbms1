-- STEP 0: VERIFY AND FIX SCHEMA
-- Ensures all tables have required columns before running other scripts
-- Digital Textile Printing System
-- Created: 2025-12-22
-- RERUNNABLE: Safe to execute multiple times
-- RUN THIS FIRST before any other SQL files

-- Check and fix orders table
DO $$
BEGIN
  -- Ensure orders table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
    RAISE NOTICE 'Orders table does not exist - will be created by 2_3 script';
  ELSE
    -- Add missing columns to existing orders table
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'orders' AND column_name = 'total_quantity'
    ) THEN
      ALTER TABLE orders ADD COLUMN total_quantity INTEGER DEFAULT 0;
      RAISE NOTICE 'Added total_quantity column to orders table';
    ELSE
      RAISE NOTICE 'Column total_quantity already exists in orders table';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'orders' AND column_name = 'ownership_type'
    ) THEN
      ALTER TABLE orders ADD COLUMN ownership_type VARCHAR(20) NOT NULL DEFAULT 'customer_material';

      -- Drop constraint if exists before adding
      IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chk_ownership_type') THEN
        ALTER TABLE orders DROP CONSTRAINT chk_ownership_type;
      END IF;

      ALTER TABLE orders ADD CONSTRAINT chk_ownership_type CHECK (ownership_type IN ('customer_material', 'own_stock'));
      RAISE NOTICE 'Added ownership_type column to orders table';
    ELSE
      RAISE NOTICE 'Column ownership_type already exists in orders table';

      -- Ensure constraint exists
      IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chk_ownership_type') THEN
        ALTER TABLE orders ADD CONSTRAINT chk_ownership_type CHECK (ownership_type IN ('customer_material', 'own_stock'));
        RAISE NOTICE 'Added ownership_type constraint';
      END IF;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'orders' AND column_name = 'expected_delivery_date'
    ) THEN
      ALTER TABLE orders ADD COLUMN expected_delivery_date TIMESTAMP WITH TIME ZONE;
      RAISE NOTICE 'Added expected_delivery_date column to orders table';
    ELSE
      RAISE NOTICE 'Column expected_delivery_date already exists in orders table';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'orders' AND column_name = 'order_date'
    ) THEN
      ALTER TABLE orders ADD COLUMN order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      RAISE NOTICE 'Added order_date column to orders table';
    ELSE
      RAISE NOTICE 'Column order_date already exists in orders table';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'orders' AND column_name = 'notes'
    ) THEN
      ALTER TABLE orders ADD COLUMN notes TEXT;
      RAISE NOTICE 'Added notes column to orders table';
    ELSE
      RAISE NOTICE 'Column notes already exists in orders table';
    END IF;

    RAISE NOTICE 'Orders table verified and fixed';
  END IF;
END $$;

-- Check and fix material_stock table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_stock') THEN
    -- Add is_active column if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'material_stock' AND column_name = 'is_active'
    ) THEN
      ALTER TABLE material_stock ADD COLUMN is_active BOOLEAN DEFAULT true;
      RAISE NOTICE 'Added is_active column to material_stock table';
    ELSE
      RAISE NOTICE 'Column is_active already exists in material_stock table';
    END IF;

    -- Create index if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_material_stock_active') THEN
      CREATE INDEX idx_material_stock_active ON material_stock(is_active) WHERE is_active = true;
      RAISE NOTICE 'Created index idx_material_stock_active';
    ELSE
      RAISE NOTICE 'Index idx_material_stock_active already exists';
    END IF;

    -- Add order_id column if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'material_stock' AND column_name = 'order_id'
    ) THEN
      ALTER TABLE material_stock ADD COLUMN order_id UUID;
      RAISE NOTICE 'Added order_id column to material_stock table';
    ELSE
      RAISE NOTICE 'Column order_id already exists in material_stock table';
    END IF;

    -- Note: Old design columns (designs_given, designs_pending) will be dropped
    -- by script 5_DROP_DEPRECATED_DESIGN_COLUMNS.sql to prevent data discrepancy
    -- The new material_design_tracking table should be used instead
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'material_stock' AND column_name = 'designs_given'
    ) THEN
      COMMENT ON COLUMN material_stock.designs_given IS 'DEPRECATED: Will be dropped by script 5. Use material_design_tracking table instead';
      COMMENT ON COLUMN material_stock.designs_pending IS 'DEPRECATED: Will be dropped by script 5. Use material_design_tracking table instead';
      RAISE NOTICE 'Design columns marked as deprecated (will be dropped by script 5_DROP_DEPRECATED_DESIGN_COLUMNS.sql)';
    ELSE
      RAISE NOTICE 'Design columns already dropped (good - prevents data discrepancy)';
    END IF;

    RAISE NOTICE 'Material_stock table verified and fixed';
  END IF;
END $$;

-- Check and fix material_in table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_in') THEN
    -- Add order_id column if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'material_in' AND column_name = 'order_id'
    ) THEN
      -- Note: Can't add FK constraint if orders table doesn't exist yet
      ALTER TABLE material_in ADD COLUMN order_id UUID;
      RAISE NOTICE 'Added order_id column to material_in table';
    ELSE
      RAISE NOTICE 'Column order_id already exists in material_in table';
    END IF;

    -- Create index if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_material_in_order') THEN
      CREATE INDEX idx_material_in_order ON material_in(order_id);
      RAISE NOTICE 'Created index idx_material_in_order';
    ELSE
      RAISE NOTICE 'Index idx_material_in_order already exists';
    END IF;

    RAISE NOTICE 'Material_in table verified and fixed';
  END IF;
END $$;

-- Check and fix delivery_challans table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'delivery_challans') THEN
    -- Add order_id column if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'delivery_challans' AND column_name = 'order_id'
    ) THEN
      ALTER TABLE delivery_challans ADD COLUMN order_id UUID;
      RAISE NOTICE 'Added order_id column to delivery_challans table';
    ELSE
      RAISE NOTICE 'Column order_id already exists in delivery_challans table';
    END IF;

    -- Create index if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_delivery_challans_order') THEN
      CREATE INDEX idx_delivery_challans_order ON delivery_challans(order_id);
      RAISE NOTICE 'Created index idx_delivery_challans_order';
    ELSE
      RAISE NOTICE 'Index idx_delivery_challans_order already exists';
    END IF;

    RAISE NOTICE 'Delivery_challans table verified and fixed';
  END IF;
END $$;

-- Check and fix gst_invoices table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gst_invoices') THEN
    -- Add order_id column if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'gst_invoices' AND column_name = 'order_id'
    ) THEN
      ALTER TABLE gst_invoices ADD COLUMN order_id UUID;
      RAISE NOTICE 'Added order_id column to gst_invoices table';
    ELSE
      RAISE NOTICE 'Column order_id already exists in gst_invoices table';
    END IF;

    -- Create index if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_gst_invoices_order') THEN
      CREATE INDEX idx_gst_invoices_order ON gst_invoices(order_id);
      RAISE NOTICE 'Created index idx_gst_invoices_order';
    ELSE
      RAISE NOTICE 'Index idx_gst_invoices_order already exists';
    END IF;

    RAISE NOTICE 'GST_invoices table verified and fixed';
  END IF;
END $$;

-- Verification: Show current schema status
SELECT 'SCHEMA VERIFICATION REPORT:' AS report;

SELECT
  'orders' AS table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;

SELECT
  'material_stock' AS table_name,
  column_name,
  CASE
    WHEN column_name IN ('designs_given', 'designs_pending') THEN 'DEPRECATED'
    ELSE 'ACTIVE'
  END AS status
FROM information_schema.columns
WHERE table_name = 'material_stock'
  AND column_name IN ('is_active', 'designs_given', 'designs_pending', 'order_id')
ORDER BY column_name;

SELECT
  'material_in' AS table_name,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'material_in' AND column_name = 'order_id') AS has_order_id;

SELECT 'STEP 0 COMPLETE - Schema verified and fixed!' AS status;
SELECT 'You can now run the other SQL files in order.' AS next_step;
