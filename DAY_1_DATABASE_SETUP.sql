-- ================================================================
-- DAY 1: DATABASE SIMPLIFICATION FOR SAREE PRINTING WORKFLOW
-- ================================================================
-- Purpose: Map existing complex system to simple Odoo-like workflow
-- Time: 4 hours
-- ================================================================

-- ================================================================
-- STEP 1: Add Missing Columns to order_items (Your Manufacturing Order)
-- ================================================================

-- order_items IS your Manufacturing Order in Odoo terms
-- Add traffic light status tracking

ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS priority_level INTEGER DEFAULT 1 CHECK (priority_level BETWEEN 1 AND 3),
ADD COLUMN IF NOT EXISTS tags TEXT[], -- For "Design Pending", "Urgent", "Shift A", etc.
ADD COLUMN IF NOT EXISTS is_backorder BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS parent_order_item_id UUID REFERENCES order_items(id),
ADD COLUMN IF NOT EXISTS days_waiting INTEGER GENERATED ALWAYS AS (
  EXTRACT(DAY FROM (NOW() - created_at))::INTEGER
) STORED,
ADD COLUMN IF NOT EXISTS fabric_location TEXT DEFAULT 'received',
ADD COLUMN IF NOT EXISTS fabric_available BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN order_items.priority_level IS '1=Normal, 2=High, 3=Urgent (⭐⭐⭐)';
COMMENT ON COLUMN order_items.tags IS 'Array of tags: ["Design Pending", "Shift A", "Urgent"]';
COMMENT ON COLUMN order_items.is_backorder IS 'TRUE if this is a partial production backorder';
COMMENT ON COLUMN order_items.parent_order_item_id IS 'Links to original order_item if this is a backorder';

-- ================================================================
-- STEP 2: Create Traffic Light Dashboard View
-- ================================================================

DROP VIEW IF EXISTS production_traffic_light CASCADE;

CREATE OR REPLACE VIEW production_traffic_light AS
SELECT
  oi.id,
  o.order_number AS mo_number,
  c.name AS customer_name,
  c.phone AS customer_phone,
  oi.material_type,
  oi.quantity AS total_quantity,
  oi.quantity - COALESCE(
    (SELECT SUM(ci.quantity) FROM challan_items ci WHERE ci.order_item_id = oi.id),
    0
  ) AS remaining_quantity,

  -- Design Status
  oi.design_status,
  CASE
    WHEN oi.design_status = 'design_ready' THEN '✅ Ready'
    WHEN oi.design_status = 'design_received_from_customer' THEN '📥 Received'
    ELSE '⏳ Pending'
  END AS design_status_label,

  -- Production Status
  oi.production_status,
  oi.current_stage,

  -- Fabric Availability
  oi.fabric_available,
  oi.fabric_location,

  -- Priority
  oi.priority_level,
  CASE
    WHEN oi.priority_level = 3 THEN '⭐⭐⭐ URGENT'
    WHEN oi.priority_level = 2 THEN '⭐⭐ High'
    ELSE '⭐ Normal'
  END AS priority_label,

  -- Tags
  oi.tags,

  -- Days Waiting
  oi.days_waiting,

  -- TRAFFIC LIGHT STATUS (Odoo Logic)
  CASE
    -- 🟢 GREEN: Fabric available + Design ready = GO PRINT NOW!
    WHEN oi.fabric_available = TRUE
     AND oi.design_status = 'design_ready'
     AND oi.production_status IN ('pre_treatment', 'pending')
    THEN '🟢 GREEN'

    -- 🟡 YELLOW: Fabric available but design pending = CALL CUSTOMER
    WHEN oi.fabric_available = TRUE
     AND oi.design_status != 'design_ready'
    THEN '🟡 YELLOW'

    -- 🔴 RED: Fabric not available = CHECK PRODUCTION FLOOR
    WHEN oi.fabric_available = FALSE
    THEN '🔴 RED'

    -- ⚠️ SPECIAL: Fabric not available but design ready = URGENT FIX
    WHEN oi.fabric_available = FALSE
     AND oi.design_status = 'design_ready'
    THEN '⚠️ URGENT'

    -- ✅ DONE: Production completed
    WHEN oi.production_status = 'completed'
    THEN '✅ DONE'

    -- 🔵 PRINTING: Currently in production
    WHEN oi.production_status = 'printing'
    THEN '🔵 PRINTING'

    ELSE '⚪ OTHER'
  END AS traffic_light_status,

  -- Action Required
  CASE
    WHEN oi.fabric_available = TRUE
     AND oi.design_status = 'design_ready'
     AND oi.production_status IN ('pre_treatment', 'pending')
    THEN '🚀 START PRINTING NOW'

    WHEN oi.fabric_available = TRUE
     AND oi.design_status != 'design_ready'
     AND oi.days_waiting > 5
    THEN '📞 URGENT: Call customer for designs (' || oi.days_waiting || ' days waiting)'

    WHEN oi.fabric_available = TRUE
     AND oi.design_status != 'design_ready'
    THEN '📞 Call customer for designs'

    WHEN oi.fabric_available = FALSE
     AND oi.design_status = 'design_ready'
    THEN '⚠️ CRITICAL: Fabric ready but not available - check location!'

    WHEN oi.fabric_available = FALSE
    THEN '🔍 Check fabric location: ' || COALESCE(oi.fabric_location, 'unknown')

    WHEN oi.production_status = 'printing'
    THEN '⏱️ In progress - monitor'

    WHEN oi.production_status = 'completed'
    THEN '📦 Ready for delivery'

    ELSE 'Review status'
  END AS action_required,

  -- Backorder Info
  oi.is_backorder,
  oi.parent_order_item_id,

  -- Timestamps
  oi.created_at AS order_date,
  oi.updated_at AS last_updated,

  -- Order details
  o.id AS order_id,
  o.status AS order_status,
  c.id AS customer_id

FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN customers c ON o.customer_id = c.id
WHERE o.is_deleted = FALSE
  AND oi.production_status != 'completed' -- Exclude completed items
ORDER BY
  -- Sort by traffic light priority
  CASE
    WHEN oi.fabric_available = TRUE AND oi.design_status = 'design_ready' THEN 1 -- GREEN first
    WHEN oi.fabric_available = FALSE AND oi.design_status = 'design_ready' THEN 2 -- URGENT second
    WHEN oi.fabric_available = TRUE AND oi.design_status != 'design_ready' THEN 3 -- YELLOW third
    WHEN oi.fabric_available = FALSE THEN 4 -- RED fourth
    ELSE 5
  END,
  oi.priority_level DESC, -- Then by priority
  oi.days_waiting DESC; -- Then by how long waiting

COMMENT ON VIEW production_traffic_light IS 'Odoo-style traffic light dashboard for production control';

-- ================================================================
-- STEP 3: Create Quick Status Summary View
-- ================================================================

DROP VIEW IF EXISTS production_dashboard_summary CASCADE;

CREATE OR REPLACE VIEW production_dashboard_summary AS
SELECT
  COUNT(*) FILTER (WHERE traffic_light_status = '🟢 GREEN') AS green_ready_to_print,
  COUNT(*) FILTER (WHERE traffic_light_status = '🟡 YELLOW') AS yellow_waiting_designs,
  COUNT(*) FILTER (WHERE traffic_light_status = '🔴 RED') AS red_fabric_issues,
  COUNT(*) FILTER (WHERE traffic_light_status = '⚠️ URGENT') AS urgent_critical,
  COUNT(*) FILTER (WHERE traffic_light_status = '🔵 PRINTING') AS blue_in_progress,
  COUNT(*) FILTER (WHERE days_waiting > 5) AS aging_orders_5plus_days,
  COUNT(*) FILTER (WHERE priority_level = 3) AS urgent_priority_items,
  SUM(remaining_quantity) AS total_pending_quantity,
  AVG(days_waiting)::INTEGER AS avg_waiting_days
FROM production_traffic_light;

-- ================================================================
-- STEP 4: Helper Functions for Common Operations
-- ================================================================

-- Function: Mark fabric as available (when moved to Ready_for_Print location)
CREATE OR REPLACE FUNCTION mark_fabric_available(p_order_item_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE order_items
  SET fabric_available = TRUE,
      fabric_location = 'ready_for_print',
      updated_at = NOW()
  WHERE id = p_order_item_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Update design status
CREATE OR REPLACE FUNCTION update_design_status_simple(
  p_order_item_id UUID,
  p_design_status TEXT,
  p_design_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE order_items
  SET design_status = p_design_status,
      design_notes = COALESCE(p_design_notes, design_notes),
      design_last_updated = NOW(),
      updated_at = NOW(),
      -- Auto-remove "Design Pending" tag when design becomes ready
      tags = CASE
        WHEN p_design_status = 'design_ready'
        THEN array_remove(tags, 'Design Pending')
        ELSE tags
      END
  WHERE id = p_order_item_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Add tag to order item
CREATE OR REPLACE FUNCTION add_tag(p_order_item_id UUID, p_tag TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE order_items
  SET tags = array_append(tags, p_tag),
      updated_at = NOW()
  WHERE id = p_order_item_id
    AND NOT (tags @> ARRAY[p_tag]); -- Don't add if already exists
END;
$$ LANGUAGE plpgsql;

-- Function: Remove tag from order item
CREATE OR REPLACE FUNCTION remove_tag(p_order_item_id UUID, p_tag TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE order_items
  SET tags = array_remove(tags, p_tag),
      updated_at = NOW()
  WHERE id = p_order_item_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Create backorder (Odoo partial production)
CREATE OR REPLACE FUNCTION create_backorder(
  p_original_order_item_id UUID,
  p_produced_quantity INTEGER,
  p_design_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_original order_items%ROWTYPE;
  v_remaining_quantity INTEGER;
  v_backorder_id UUID;
BEGIN
  -- Get original order item
  SELECT * INTO v_original
  FROM order_items
  WHERE id = p_original_order_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order item not found: %', p_original_order_item_id;
  END IF;

  -- Calculate remaining
  v_remaining_quantity := v_original.quantity - p_produced_quantity;

  IF v_remaining_quantity <= 0 THEN
    RAISE EXCEPTION 'Produced quantity (%) >= total quantity (%)',
      p_produced_quantity, v_original.quantity;
  END IF;

  -- Update original to reflect produced quantity
  UPDATE order_items
  SET quantity = p_produced_quantity,
      production_status = 'completed',
      post_process_completed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_original_order_item_id;

  -- Create backorder
  INSERT INTO order_items (
    order_id,
    material_type,
    quantity,
    unit_price,
    design_status,
    production_status,
    design_file_url,
    design_notes,
    is_backorder,
    parent_order_item_id,
    fabric_available,
    fabric_location,
    priority_level,
    tags
  ) VALUES (
    v_original.order_id,
    v_original.material_type,
    v_remaining_quantity,
    v_original.unit_price,
    'pending_from_customer', -- Reset to pending for backorder
    'pending',
    v_original.design_file_url,
    COALESCE(p_design_notes, 'Backorder: ' || v_remaining_quantity || ' remaining from original order'),
    TRUE,
    p_original_order_item_id,
    v_original.fabric_available,
    v_original.fabric_location,
    v_original.priority_level,
    ARRAY['Backorder', 'Design Pending'] -- Default tags for backorder
  )
  RETURNING id INTO v_backorder_id;

  RETURN v_backorder_id;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- STEP 5: Sample Data Insert Function
-- ================================================================

CREATE OR REPLACE FUNCTION create_sample_order(
  p_customer_name TEXT,
  p_phone TEXT,
  p_material_type TEXT,
  p_quantity INTEGER,
  p_unit_price NUMERIC,
  p_fabric_received BOOLEAN DEFAULT TRUE,
  p_design_status TEXT DEFAULT 'pending_from_customer'
)
RETURNS TABLE(
  customer_id UUID,
  order_id UUID,
  order_item_id UUID,
  mo_number TEXT
) AS $$
DECLARE
  v_customer_id UUID;
  v_order_id UUID;
  v_order_item_id UUID;
  v_order_number TEXT;
BEGIN
  -- Create customer if doesn't exist
  INSERT INTO customers (name, phone)
  VALUES (p_customer_name, p_phone)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_customer_id;

  IF v_customer_id IS NULL THEN
    SELECT id INTO v_customer_id FROM customers WHERE name = p_customer_name LIMIT 1;
  END IF;

  -- Generate order number
  v_order_number := 'SO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                    LPAD((SELECT COUNT(*) + 1 FROM orders)::TEXT, 3, '0');

  -- Create order
  INSERT INTO orders (order_number, customer_id, order_date, status, total_amount)
  VALUES (
    v_order_number,
    v_customer_id,
    NOW(),
    'in_progress',
    p_quantity * p_unit_price
  )
  RETURNING id INTO v_order_id;

  -- Create order item (Manufacturing Order)
  INSERT INTO order_items (
    order_id,
    material_type,
    quantity,
    unit_price,
    design_status,
    production_status,
    fabric_available,
    fabric_location,
    tags
  ) VALUES (
    v_order_id,
    p_material_type,
    p_quantity,
    p_unit_price,
    p_design_status,
    CASE WHEN p_fabric_received THEN 'pre_treatment' ELSE 'pending' END,
    p_fabric_received,
    CASE WHEN p_fabric_received THEN 'ready_for_print' ELSE 'not_received' END,
    CASE
      WHEN p_design_status != 'design_ready' THEN ARRAY['Design Pending']
      ELSE ARRAY['Design Ready']
    END
  )
  RETURNING id INTO v_order_item_id;

  -- If fabric received, create material_in record
  IF p_fabric_received THEN
    INSERT INTO material_in (customer_id, order_id, material_type, quantity, received_date)
    VALUES (v_customer_id, v_order_id, p_material_type, p_quantity, NOW());

    -- Update material stock
    INSERT INTO material_stock (customer_id, material_type, current_stock, total_received)
    VALUES (v_customer_id, p_material_type, p_quantity, p_quantity)
    ON CONFLICT (customer_id, material_type)
    DO UPDATE SET
      current_stock = material_stock.current_stock + p_quantity,
      total_received = material_stock.total_received + p_quantity;
  END IF;

  RETURN QUERY SELECT v_customer_id, v_order_id, v_order_item_id, v_order_number;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- STEP 6: Create Indexes for Performance
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_order_items_traffic_light
  ON order_items(fabric_available, design_status, production_status)
  WHERE production_status != 'completed';

CREATE INDEX IF NOT EXISTS idx_order_items_tags
  ON order_items USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_order_items_priority
  ON order_items(priority_level DESC);

CREATE INDEX IF NOT EXISTS idx_order_items_backorder
  ON order_items(is_backorder, parent_order_item_id)
  WHERE is_backorder = TRUE;

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================

-- Check if all modifications applied
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '✅ DAY 1 DATABASE SETUP COMPLETE!';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 CREATED:';
  RAISE NOTICE '   • production_traffic_light view (Odoo dashboard)';
  RAISE NOTICE '   • production_dashboard_summary view (metrics)';
  RAISE NOTICE '   • Helper functions for workflow';
  RAISE NOTICE '   • create_sample_order() function';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 NEXT STEPS:';
  RAISE NOTICE '   1. Test with sample data (see below)';
  RAISE NOTICE '   2. Build simple UI (Day 1 afternoon)';
  RAISE NOTICE '   3. Deploy and test (Day 2)';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
END $$;

-- ================================================================
-- SAMPLE DATA FOR TESTING
-- ================================================================

-- Uncomment to create sample orders:
/*
-- GREEN: Fabric available + Design ready (PRINT NOW!)
SELECT create_sample_order('Kumar Textiles', '9876543210', 'saree', 50, 150, TRUE, 'design_ready');

-- YELLOW: Fabric available + Design pending (CALL CUSTOMER)
SELECT create_sample_order('Sharma Fabrics', '9876543211', 'dupatta', 30, 120, TRUE, 'pending_from_customer');

-- RED: Fabric not available (CHECK LOCATION)
SELECT create_sample_order('Patel Prints', '9876543212', 'saree', 100, 150, FALSE, 'pending_from_customer');

-- URGENT: Fabric not available but design ready (CRITICAL!)
SELECT * FROM create_sample_order('Verma Textiles', '9876543213', 'voni', 25, 200, FALSE, 'design_ready');
UPDATE order_items SET fabric_available = FALSE WHERE order_id = (SELECT order_id FROM orders WHERE order_number LIKE '%004%');
*/
