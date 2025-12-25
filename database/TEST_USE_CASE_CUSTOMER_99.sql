-- ============================================================================
-- TEST USE CASE: Customer 99 Complete Flow
-- Tests the entire workflow from receipt to invoice
-- Created: 2025-12-21
-- ============================================================================

-- Clean up any existing test data
DELETE FROM invoice_challans WHERE challan_id IN (
  SELECT id FROM delivery_challans WHERE customer_id IN (
    SELECT id FROM customers WHERE name = 'test customer 99'
  )
);
DELETE FROM challan_items WHERE challan_id IN (
  SELECT id FROM delivery_challans WHERE customer_id IN (
    SELECT id FROM customers WHERE name = 'test customer 99'
  )
);
DELETE FROM delivery_challans WHERE customer_id IN (SELECT id FROM customers WHERE name = 'test customer 99');
DELETE FROM gst_invoices WHERE customer_id IN (SELECT id FROM customers WHERE name = 'test customer 99');
DELETE FROM payments WHERE customer_id IN (SELECT id FROM customers WHERE name = 'test customer 99');
DELETE FROM returns WHERE customer_id IN (SELECT id FROM customers WHERE name = 'test customer 99');
DELETE FROM material_stock WHERE customer_id IN (SELECT id FROM customers WHERE name = 'test customer 99');
DELETE FROM material_in WHERE customer_id IN (SELECT id FROM customers WHERE name = 'test customer 99');
DELETE FROM orders WHERE customer_id IN (SELECT id FROM customers WHERE name = 'test customer 99');
DELETE FROM customers WHERE name = 'test customer 99';

RAISE NOTICE 'Cleaned up existing test data for customer 99';

-- ============================================================================
-- STEP 1: Create test customer 99
-- ============================================================================
INSERT INTO customers (name, phone, email, gst_number, address, is_active)
VALUES (
  'test customer 99',
  '9999999999',
  'testcustomer99@test.com',
  '29ABCDE1234F1Z5',
  'Test Address, Test City',
  true
)
RETURNING id, name;

RAISE NOTICE '✓ Step 1: Created customer "test customer 99"';

-- ============================================================================
-- STEP 2: Customer gives stock on 20-Dec-2025
-- 50 sarees, 20 duppattas, 5 vonis, 10 meters running fabric
-- ============================================================================
DO $$
DECLARE
  v_customer_id UUID;
BEGIN
  SELECT id INTO v_customer_id FROM customers WHERE name = 'test customer 99';

  -- Receipt 1: 50 sarees
  INSERT INTO material_in (customer_id, material_type, quantity, ownership, received_date, notes)
  VALUES (v_customer_id, 'SAREE', 50, 'customer', '2025-12-20 10:00:00', 'First batch - 50 sarees');

  -- Receipt 2: 20 duppattas
  INSERT INTO material_in (customer_id, material_type, quantity, ownership, received_date, notes)
  VALUES (v_customer_id, 'DUPATTA', 20, 'customer', '2025-12-20 10:05:00', 'First batch - 20 duppattas');

  -- Receipt 3: 5 vonis
  INSERT INTO material_in (customer_id, material_type, quantity, ownership, received_date, notes)
  VALUES (v_customer_id, 'VONI', 5, 'customer', '2025-12-20 10:10:00', 'First batch - 5 vonis');

  -- Receipt 4: 10 meters running fabric
  INSERT INTO material_in (customer_id, material_type, quantity, ownership, received_date, notes)
  VALUES (v_customer_id, 'RUNNING', 10, 'customer', '2025-12-20 10:15:00', 'First batch - 10 meters running fabric');

  RAISE NOTICE '✓ Step 2: Added stock on 20-Dec-2025 (50 sarees, 20 duppattas, 5 vonis, 10 running)';
END $$;

-- ============================================================================
-- STEP 3: Customer gives additional stock on 21-Dec-2025
-- 40 more sarees
-- ============================================================================
DO $$
DECLARE
  v_customer_id UUID;
BEGIN
  SELECT id INTO v_customer_id FROM customers WHERE name = 'test customer 99';

  INSERT INTO material_in (customer_id, material_type, quantity, ownership, received_date, notes)
  VALUES (v_customer_id, 'SAREE', 40, 'customer', '2025-12-21 11:00:00', 'Second batch - 40 sarees');

  RAISE NOTICE '✓ Step 3: Added stock on 21-Dec-2025 (40 sarees)';
END $$;

-- Auto-stock creation happens via trigger/function (should be in 'received' stage)

-- ============================================================================
-- STEP 4: Customer gives designs
-- 30 designs given, mark 40 designs as ready
-- NOTE: Current schema only has boolean 'designs_available'
-- For simplicity, we'll mark sarees as having designs available
-- ============================================================================
DO $$
DECLARE
  v_customer_id UUID;
BEGIN
  SELECT id INTO v_customer_id FROM customers WHERE name = 'test customer 99';

  -- Update material_stock to mark designs as available for sarees
  UPDATE material_stock
  SET designs_available = true,
      design_notes = '30 designs given by customer, 40 designs prepared and ready',
      updated_at = NOW()
  WHERE customer_id = v_customer_id
    AND material_type = 'SAREE'
    AND stage = 'received';

  RAISE NOTICE '✓ Step 4: Marked designs as available for sarees (30 given, 40 ready)';
  RAISE NOTICE '  NOTE: Current schema uses boolean flag. For detailed tracking, needs design_count columns.';
END $$;

-- ============================================================================
-- STEP 5: Move 40 sarees from received to preprocessing
-- (because we have 40 designs ready)
-- ============================================================================
DO $$
DECLARE
  v_customer_id UUID;
BEGIN
  SELECT id INTO v_customer_id FROM customers WHERE name = 'test customer 99';

  -- Use the move_stock_to_stage function
  PERFORM move_stock_to_stage(
    v_customer_id,  -- customer_id
    NULL,           -- order_id (NULL since no order)
    'SAREE',        -- material_type
    'received',     -- from_stage
    'preprocessing',-- to_stage
    40,             -- quantity
    'customer'      -- ownership
  );

  RAISE NOTICE '✓ Step 5: Moved 40 sarees from RECEIVED → PREPROCESSING';
END $$;

-- ============================================================================
-- STEP 6: Move 40 sarees from preprocessing to printing
-- ============================================================================
DO $$
DECLARE
  v_customer_id UUID;
BEGIN
  SELECT id INTO v_customer_id FROM customers WHERE name = 'test customer 99';

  PERFORM move_stock_to_stage(
    v_customer_id,
    NULL,
    'SAREE',
    'preprocessing',
    'printing',
    40,
    'customer'
  );

  RAISE NOTICE '✓ Step 6: Moved 40 sarees from PREPROCESSING → PRINTING';
END $$;

-- ============================================================================
-- STEP 7: Move from printing to postprocessing
-- 3 sarees are misprints, so move 37 to postprocessing and 3 to misprint
-- ============================================================================
DO $$
DECLARE
  v_customer_id UUID;
BEGIN
  SELECT id INTO v_customer_id FROM customers WHERE name = 'test customer 99';

  -- Move 37 good sarees to postprocessing
  PERFORM move_stock_to_stage(
    v_customer_id,
    NULL,
    'SAREE',
    'printing',
    'postprocessing',
    37,
    'customer'
  );

  -- Move 3 misprints
  PERFORM move_stock_to_stage(
    v_customer_id,
    NULL,
    'SAREE',
    'printing',
    'misprint',
    3,
    'customer'
  );

  RAISE NOTICE '✓ Step 7: From PRINTING → 37 to POSTPROCESSING, 3 to MISPRINT';
END $$;

-- Move to completed
DO $$
DECLARE
  v_customer_id UUID;
BEGIN
  SELECT id INTO v_customer_id FROM customers WHERE name = 'test customer 99';

  PERFORM move_stock_to_stage(
    v_customer_id,
    NULL,
    'SAREE',
    'postprocessing',
    'completed',
    37,
    'customer'
  );

  RAISE NOTICE '✓ Moved 37 sarees from POSTPROCESSING → COMPLETED';
END $$;

-- ============================================================================
-- STEP 8: Generate delivery challans
-- Challan 1: 20 sarees
-- Challan 2: 17 sarees
-- ============================================================================
DO $$
DECLARE
  v_customer_id UUID;
  v_challan_id_1 UUID;
  v_challan_id_2 UUID;
BEGIN
  SELECT id INTO v_customer_id FROM customers WHERE name = 'test customer 99';

  -- Delivery Challan 1: 20 sarees
  INSERT INTO delivery_challans (customer_id, challan_date, notes)
  VALUES (v_customer_id, '2025-12-21 15:00:00', 'Delivery 1 - 20 sarees')
  RETURNING id INTO v_challan_id_1;

  -- Since we don't have order_items, we'll create a simple challan_items entry
  -- NOTE: The real schema might have order_item_id FK, let's check if table structure allows direct insert
  -- For now, let's track this manually

  -- Reduce completed stock by 20
  UPDATE material_stock
  SET quantity = quantity - 20, updated_at = NOW()
  WHERE customer_id = v_customer_id
    AND material_type = 'SAREE'
    AND stage = 'completed';

  RAISE NOTICE '✓ Step 8a: Created Challan 1 - 20 sarees delivered';

  -- Delivery Challan 2: 17 sarees
  INSERT INTO delivery_challans (customer_id, challan_date, notes)
  VALUES (v_customer_id, '2025-12-21 16:00:00', 'Delivery 2 - 17 sarees')
  RETURNING id INTO v_challan_id_2;

  -- Reduce completed stock by 17
  UPDATE material_stock
  SET quantity = quantity - 17, updated_at = NOW()
  WHERE customer_id = v_customer_id
    AND material_type = 'SAREE'
    AND stage = 'completed';

  RAISE NOTICE '✓ Step 8b: Created Challan 2 - 17 sarees delivered';
  RAISE NOTICE '  NOTE: challan_items not populated (depends on order_items FK)';
END $$;

-- ============================================================================
-- STEP 9: Generate invoice for 37 sarees (20 + 17)
-- Job work charges, adjusted for 3 misprints
-- ============================================================================
DO $$
DECLARE
  v_customer_id UUID;
  v_challan_id_1 UUID;
  v_challan_id_2 UUID;
  v_invoice_id UUID;
  v_subtotal DECIMAL(10,2);
  v_cgst_amt DECIMAL(10,2);
  v_sgst_amt DECIMAL(10,2);
  v_total DECIMAL(10,2);
BEGIN
  SELECT id INTO v_customer_id FROM customers WHERE name = 'test customer 99';

  SELECT id INTO v_challan_id_1 FROM delivery_challans
  WHERE customer_id = v_customer_id AND notes LIKE '%Delivery 1%';

  SELECT id INTO v_challan_id_2 FROM delivery_challans
  WHERE customer_id = v_customer_id AND notes LIKE '%Delivery 2%';

  -- Calculate invoice amount
  -- Assume: ₹100 per saree job work
  -- 37 sarees delivered = ₹3,700
  -- Adjust for 3 misprints = -₹300
  -- Subtotal = ₹3,400
  v_subtotal := (37 * 100.00) - (3 * 100.00); -- ₹3,400
  v_cgst_amt := v_subtotal * 0.09; -- 9% CGST = ₹306
  v_sgst_amt := v_subtotal * 0.09; -- 9% SGST = ₹306
  v_total := v_subtotal + v_cgst_amt + v_sgst_amt; -- ₹4,012

  -- Create GST Invoice
  INSERT INTO gst_invoices (
    customer_id,
    invoice_type,
    invoice_date,
    subtotal,
    cgst_rate,
    cgst_amount,
    sgst_rate,
    sgst_amount,
    igst_rate,
    igst_amount,
    total_amount,
    status,
    notes
  )
  VALUES (
    v_customer_id,
    'job_work',
    '2025-12-21 17:00:00',
    v_subtotal,
    9.00,
    v_cgst_amt,
    9.00,
    v_sgst_amt,
    0.00,
    0.00,
    v_total,
    'pending',
    'Invoice for 37 sarees job work. Adjusted for 3 misprints. Challans: ' ||
    (SELECT challan_number FROM delivery_challans WHERE id = v_challan_id_1) || ', ' ||
    (SELECT challan_number FROM delivery_challans WHERE id = v_challan_id_2)
  )
  RETURNING id INTO v_invoice_id;

  -- Link invoice to challans
  INSERT INTO invoice_challans (invoice_id, challan_id)
  VALUES (v_invoice_id, v_challan_id_1), (v_invoice_id, v_challan_id_2);

  RAISE NOTICE '✓ Step 9: Created Invoice for ₹% (37 sarees - 3 misprints)', v_total;
  RAISE NOTICE '  Breakdown: Subtotal=₹%, CGST=₹%, SGST=₹%', v_subtotal, v_cgst_amt, v_sgst_amt;
END $$;

-- ============================================================================
-- VALIDATION & RECONCILIATION
-- ============================================================================
RAISE NOTICE '';
RAISE NOTICE '========================================================================';
RAISE NOTICE 'STOCK RECONCILIATION FOR TEST CUSTOMER 99';
RAISE NOTICE '========================================================================';

-- Show material in
SELECT
  'MATERIAL IN' as category,
  material_type,
  SUM(quantity) as total_quantity,
  STRING_AGG(DISTINCT TO_CHAR(received_date, 'DD-Mon-YYYY'), ', ') as received_dates
FROM material_in
WHERE customer_id = (SELECT id FROM customers WHERE name = 'test customer 99')
GROUP BY material_type
ORDER BY material_type;

RAISE NOTICE '';

-- Show current stock by stage
SELECT
  'STOCK BY STAGE' as category,
  material_type,
  stage,
  quantity
FROM material_stock
WHERE customer_id = (SELECT id FROM customers WHERE name = 'test customer 99')
  AND quantity > 0
ORDER BY material_type, stage;

RAISE NOTICE '';

-- Show deliveries
SELECT
  'DELIVERIES' as category,
  challan_number,
  TO_CHAR(challan_date, 'DD-Mon-YYYY HH24:MI') as delivered_at,
  notes
FROM delivery_challans
WHERE customer_id = (SELECT id FROM customers WHERE name = 'test customer 99')
ORDER BY challan_date;

RAISE NOTICE '';

-- Show invoice
SELECT
  'INVOICE' as category,
  invoice_number,
  TO_CHAR(invoice_date, 'DD-Mon-YYYY') as invoice_date,
  subtotal,
  total_amount,
  status
FROM gst_invoices
WHERE customer_id = (SELECT id FROM customers WHERE name = 'test customer 99');

RAISE NOTICE '';

-- Show outstanding payment
SELECT
  'OUTSTANDING PAYMENT' as category,
  customer_name,
  total_invoiced,
  total_paid,
  outstanding_amount
FROM v_outstanding_payments
WHERE customer_name = 'test customer 99';

RAISE NOTICE '';
RAISE NOTICE '========================================================================';
RAISE NOTICE 'EXPECTED RESULTS:';
RAISE NOTICE '========================================================================';
RAISE NOTICE 'Material IN:';
RAISE NOTICE '  - SAREE: 90 (50+40)';
RAISE NOTICE '  - DUPATTA: 20';
RAISE NOTICE '  - VONI: 5';
RAISE NOTICE '  - RUNNING: 10';
RAISE NOTICE '';
RAISE NOTICE 'Current Stock:';
RAISE NOTICE '  - SAREE/received: 50 (90 total - 40 moved to production)';
RAISE NOTICE '  - SAREE/completed: 0 (37 completed - 37 delivered)';
RAISE NOTICE '  - SAREE/misprint: 3';
RAISE NOTICE '  - DUPATTA/received: 20';
RAISE NOTICE '  - VONI/received: 5';
RAISE NOTICE '  - RUNNING/received: 10';
RAISE NOTICE '';
RAISE NOTICE 'Deliveries: 2 challans (20 + 17 = 37 sarees)';
RAISE NOTICE 'Invoice: ₹4,012 (pending payment)';
RAISE NOTICE 'Outstanding: ₹4,012';
RAISE NOTICE '========================================================================';
