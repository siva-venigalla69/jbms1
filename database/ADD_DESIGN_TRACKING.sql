-- ============================================================================
-- ENHANCE DESIGN TRACKING
-- Add columns to track design submission and readiness quantities
-- Digital Textile Printing System
-- Created: 2025-12-21
-- ============================================================================

-- Add design tracking columns to material_stock table
ALTER TABLE material_stock
ADD COLUMN IF NOT EXISTS designs_given INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS designs_ready INTEGER DEFAULT 0;

-- Update existing records to set defaults
UPDATE material_stock
SET designs_given = 0, designs_ready = 0
WHERE designs_given IS NULL OR designs_ready IS NULL;

-- Add comments for clarity
COMMENT ON COLUMN material_stock.designs_given IS 'Number of designs submitted/given by customer for this stock';
COMMENT ON COLUMN material_stock.designs_ready IS 'Number of designs prepared and ready for printing';
COMMENT ON COLUMN material_stock.designs_available IS 'Boolean flag - are designs ready for this batch (deprecated, use designs_ready count instead)';

-- Create index for design tracking queries
CREATE INDEX IF NOT EXISTS idx_material_stock_designs ON material_stock(designs_given, designs_ready) WHERE quantity > 0;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check the updated schema
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'material_stock'
-- AND column_name LIKE 'design%'
-- ORDER BY ordinal_position;
