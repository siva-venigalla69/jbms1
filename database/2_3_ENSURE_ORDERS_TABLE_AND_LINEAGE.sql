-- STEP 2.3: ENSURE ORDERS TABLE AND ORDER_ID LINEAGE
-- Ensures orders table exists and order_id is tracked through entire workflow
-- Digital Textile Printing System
-- Created: 2025-12-22
-- RERUNNABLE: Safe to execute multiple times

-- Create orders table if not exists
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  ownership_type VARCHAR(20) NOT NULL DEFAULT 'customer_material',
  total_quantity INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expected_delivery_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT chk_ownership_type CHECK (ownership_type IN ('customer_material', 'own_stock')),
  CONSTRAINT chk_status CHECK (status IN ('active', 'completed', 'cancelled'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date DESC);

COMMENT ON TABLE orders IS 'Customer orders - tracks work orders from receipt to delivery';
COMMENT ON COLUMN orders.order_number IS 'Auto-generated or manual order reference number';
COMMENT ON COLUMN orders.ownership_type IS 'customer_material = job work, own_stock = sales';
COMMENT ON COLUMN orders.total_quantity IS 'Total quantity ordered (sum of all materials)';
COMMENT ON COLUMN orders.status IS 'active, completed, or cancelled';

-- Grant permissions
GRANT ALL ON orders TO authenticated;

-- Add columns if they don't exist (for existing tables)
DO $$
BEGIN
  -- Add total_quantity if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'total_quantity'
  ) THEN
    ALTER TABLE orders ADD COLUMN total_quantity INTEGER DEFAULT 0;
    RAISE NOTICE 'Added total_quantity column to orders table';
  END IF;

  -- Add ownership_type if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'ownership_type'
  ) THEN
    ALTER TABLE orders ADD COLUMN ownership_type VARCHAR(20) NOT NULL DEFAULT 'customer_material';
    RAISE NOTICE 'Added ownership_type column to orders table';
  END IF;

  -- Add expected_delivery_date if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'expected_delivery_date'
  ) THEN
    ALTER TABLE orders ADD COLUMN expected_delivery_date TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'Added expected_delivery_date column to orders table';
  END IF;

  -- Add order_date if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'order_date'
  ) THEN
    ALTER TABLE orders ADD COLUMN order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE 'Added order_date column to orders table';
  END IF;

  -- Add notes if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'notes'
  ) THEN
    ALTER TABLE orders ADD COLUMN notes TEXT;
    RAISE NOTICE 'Added notes column to orders table';
  END IF;

  RAISE NOTICE 'Orders table columns ensured';
END $$;

-- Create function to auto-generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR AS $$
DECLARE
  next_num INTEGER;
  order_num VARCHAR;
BEGIN
  SELECT COALESCE(MAX(SUBSTRING(order_number FROM '[0-9]+')::INTEGER), 0) + 1
  INTO next_num
  FROM orders
  WHERE order_number ~ '^ORD-[0-9]+$';

  order_num := 'ORD-' || LPAD(next_num::TEXT, 6, '0');
  RETURN order_num;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate order number if not provided
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_order_number ON orders;

CREATE TRIGGER trigger_set_order_number
BEFORE INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION set_order_number();

-- Ensure order_id column exists in related tables
DO $$
BEGIN
  -- material_in table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'material_in' AND column_name = 'order_id'
  ) THEN
    ALTER TABLE material_in ADD COLUMN order_id UUID REFERENCES orders(id) ON DELETE SET NULL;
    CREATE INDEX idx_material_in_order ON material_in(order_id);
  END IF;

  -- material_stock table (already has it, but ensure index)
  CREATE INDEX IF NOT EXISTS idx_material_stock_order ON material_stock(order_id);

  -- delivery_challans table (already has it, but ensure index)
  CREATE INDEX IF NOT EXISTS idx_delivery_challans_order ON delivery_challans(order_id);

  -- gst_invoices table (already has it, but ensure index)
  CREATE INDEX IF NOT EXISTS idx_gst_invoices_order ON gst_invoices(order_id);

  RAISE NOTICE 'Order lineage columns and indexes ensured';
END $$;

-- Create view to track complete order lifecycle
DROP VIEW IF EXISTS v_order_lifecycle CASCADE;

CREATE VIEW v_order_lifecycle AS
SELECT
  o.id AS order_id,
  o.order_number,
  c.name AS customer_name,
  o.order_date,
  o.expected_delivery_date,
  o.status AS order_status,

  -- Material received
  (SELECT COALESCE(SUM(quantity), 0) FROM material_in WHERE order_id = o.id) AS total_received,

  -- Current stock by stage (active only)
  (SELECT COALESCE(SUM(quantity), 0) FROM material_stock WHERE order_id = o.id AND stage = 'received' AND is_active = true) AS stock_received,
  (SELECT COALESCE(SUM(quantity), 0) FROM material_stock WHERE order_id = o.id AND stage = 'preprocessing' AND is_active = true) AS stock_preprocessing,
  (SELECT COALESCE(SUM(quantity), 0) FROM material_stock WHERE order_id = o.id AND stage = 'printing' AND is_active = true) AS stock_printing,
  (SELECT COALESCE(SUM(quantity), 0) FROM material_stock WHERE order_id = o.id AND stage = 'postprocessing' AND is_active = true) AS stock_postprocessing,
  (SELECT COALESCE(SUM(quantity), 0) FROM material_stock WHERE order_id = o.id AND stage = 'completed' AND is_active = true) AS stock_completed,
  (SELECT COALESCE(SUM(quantity), 0) FROM material_stock WHERE order_id = o.id AND stage = 'delivered' AND is_active = true) AS stock_delivered,
  (SELECT COALESCE(SUM(quantity), 0) FROM material_stock WHERE order_id = o.id AND stage = 'misprint' AND is_active = true) AS stock_misprint,

  -- Delivery info
  (SELECT COUNT(*) FROM delivery_challans WHERE order_id = o.id) AS delivery_challan_count,
  (SELECT MAX(challan_date) FROM delivery_challans WHERE order_id = o.id) AS last_delivery_date,

  -- Invoice info
  (SELECT COUNT(*) FROM gst_invoices WHERE order_id = o.id) AS invoice_count,
  (SELECT COALESCE(SUM(total_amount), 0) FROM gst_invoices WHERE order_id = o.id) AS total_invoiced,

  -- Design tracking
  (SELECT COALESCE(SUM(designs_given), 0) FROM material_design_tracking dt
   JOIN material_in mi ON dt.customer_id = mi.customer_id AND dt.material_type = mi.material_type
   WHERE mi.order_id = o.id) AS total_designs_given,
  (SELECT COALESCE(SUM(designs_pending), 0) FROM material_design_tracking dt
   JOIN material_in mi ON dt.customer_id = mi.customer_id AND dt.material_type = mi.material_type
   WHERE mi.order_id = o.id) AS total_designs_pending,

  o.notes,
  o.created_at,
  o.updated_at

FROM orders o
JOIN customers c ON o.customer_id = c.id
ORDER BY o.order_date DESC;

GRANT SELECT ON v_order_lifecycle TO authenticated;

COMMENT ON VIEW v_order_lifecycle IS 'Complete order tracking from receipt to delivery with stock status at each stage';

-- Create function to get order summary
CREATE OR REPLACE FUNCTION get_order_summary(p_order_id UUID)
RETURNS TABLE (
  order_number VARCHAR,
  customer_name VARCHAR,
  total_received INTEGER,
  total_in_stock INTEGER,
  total_delivered INTEGER,
  total_misprint INTEGER,
  designs_given INTEGER,
  designs_pending INTEGER,
  invoiced_amount DECIMAL,
  order_status VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.order_number::VARCHAR,
    c.name::VARCHAR,
    COALESCE((SELECT SUM(quantity) FROM material_in WHERE order_id = p_order_id), 0)::INTEGER,
    COALESCE((SELECT SUM(quantity) FROM material_stock WHERE order_id = p_order_id AND is_active = true
              AND stage NOT IN ('delivered', 'misprint')), 0)::INTEGER,
    COALESCE((SELECT SUM(quantity) FROM material_stock WHERE order_id = p_order_id AND is_active = true
              AND stage = 'delivered'), 0)::INTEGER,
    COALESCE((SELECT SUM(quantity) FROM material_stock WHERE order_id = p_order_id AND is_active = true
              AND stage = 'misprint'), 0)::INTEGER,
    COALESCE((SELECT SUM(dt.designs_given) FROM material_design_tracking dt
              JOIN material_in mi ON dt.customer_id = mi.customer_id AND dt.material_type = mi.material_type
              WHERE mi.order_id = p_order_id), 0)::INTEGER,
    COALESCE((SELECT SUM(dt.designs_pending) FROM material_design_tracking dt
              JOIN material_in mi ON dt.customer_id = mi.customer_id AND dt.material_type = mi.material_type
              WHERE mi.order_id = p_order_id), 0)::INTEGER,
    COALESCE((SELECT SUM(total_amount) FROM gst_invoices WHERE order_id = p_order_id), 0)::DECIMAL,
    o.status::VARCHAR
  FROM orders o
  JOIN customers c ON o.customer_id = c.id
  WHERE o.id = p_order_id;
END;
$$ LANGUAGE plpgsql;

-- Verification queries
SELECT 'VERIFICATION: Orders table structure' AS check_name;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;

SELECT 'VERIFICATION: Order lineage columns' AS check_name;
SELECT
  'material_in' AS table_name,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'material_in' AND column_name = 'order_id') AS has_order_id
UNION ALL
SELECT
  'material_stock' AS table_name,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'material_stock' AND column_name = 'order_id') AS has_order_id
UNION ALL
SELECT
  'delivery_challans' AS table_name,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_challans' AND column_name = 'order_id') AS has_order_id
UNION ALL
SELECT
  'gst_invoices' AS table_name,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'gst_invoices' AND column_name = 'order_id') AS has_order_id;

SELECT 'STEP 2.3 COMPLETE - Orders table and lineage tracking ensured!' AS status;
