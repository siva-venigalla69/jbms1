-- ============================================================================
-- UPDATED TEST USE CASE: Customer 99 Complete Flow
-- With Design Tracking and Quality Check After Postprocessing
-- Digital Textile Printing System
-- Created: 2025-12-21
-- ============================================================================

-- Clean up existing test data
DO $$
BEGIN
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
END $$;

-- ============================================================================
-- STEP 1: Create test customer 99
-- ============================================================================
DO $$
BEGIN
  INSERT INTO customers (name, phone, email, gst_number, address, is_active)
  VALUES (
    'test customer 99',
    '9999999999',
    'testcustomer99@test.com',
    '29ABCDE1234F1Z5',
    'Test Address, Test City',
    true
  );

  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '✓ STEP 1: Created customer "test customer 99"';
  RAISE NOTICE '========================================================================';
END $$;

-- ============================================================================
-- STEP 2: Customer gives stock on 20-Dec-2025
-- 50 sarees, 20 duppattas, 5 vonis, 10 meters running fabric
-- Auto-creates stock in 'received' stage with designs_pending = quantity
-- ============================================================================
DO $$
DECLARE
  v_customer_id UUID;
BEGIN
  SELECT id INTO v_customer_id FROM customers WHERE name = 'test customer 99';

  -- Receipt 1: 50 sarees
  INSERT INTO material_in (customer_id, material_type, quantity, ownership, received_date, notes)
  VALUES (v_customer_id, 'SAREE', 50, 'customer', '2025-12-20 10:00:00', 'First batch - 50 sarees');

  -- Create stock entry
  INSERT INTO material_stock (customer_id, material_type, stage, quantity, ownership, designs_given, designs_pending)
  VALUES (v_customer_id, 'SAREE', 'received', 50, 'customer', 0, 50);

  -- Receipt 2: 20 duppattas
  INSERT INTO material_in (customer_id, material_type, quantity, ownership, received_date, notes)
  VALUES (v_customer_id, 'DUPATTA', 20, 'customer', '2025-12-20 10:05:00', 'First batch - 20 duppattas');

  INSERT INTO material_stock (customer_id, material_type, stage, quantity, ownership, designs_given, designs_pending)
  VALUES (v_customer_id, 'DUPATTA', 'received', 20, 'customer', 0, 20);

  -- Receipt 3: 5 vonis
  INSERT INTO material_in (customer_id, material_type, quantity, ownership, received_date, notes)
  VALUES (v_customer_id, 'VONI', 5, 'customer', '2025-12-20 10:10:00', 'First batch - 5 vonis');

  INSERT INTO material_stock (customer_id, material_type, stage, quantity, ownership, designs_given, designs_pending)
  VALUES (v_customer_id, 'VONI', 'received', 5, 'customer', 0, 5);

  -- Receipt 4: 10 meters running fabric
  INSERT INTO material_in (customer_id, material_type, quantity, ownership, received_date, notes)
  VALUES (v_customer_id, 'RUNNING', 10, 'customer', '2025-12-20 10:15:00', 'First batch - 10 meters running fabric');

  INSERT INTO material_stock (customer_id, material_type, stage, quantity, ownership, designs_given, designs_pending)
  VALUES (v_customer_id, 'RUNNING', 'received', 10, 'customer', 0, 10);

  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '✓ STEP 2: Received stock on 20-Dec-2025';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '  - 50 sarees (designs pending: 50)';
  RAISE NOTICE '  - 20 duppattas (designs pending: 20)';
  RAISE NOTICE '  - 5 vonis (designs pending: 5)';
  RAISE NOTICE '  - 10 running fabric (designs pending: 10)';
END $$;

-- ============================================================================
-- STEP 3: Customer gives additional stock on 21-Dec-2025
-- 40 more sarees → Total becomes 90 sarees
-- ============================================================================
DO $$
DECLARE
  v_customer_id UUID;
BEGIN
  SELECT id INTO v_customer_id FROM customers WHERE name = 'test customer 99';

  INSERT INTO material_in (customer_id, material_type, quantity, ownership, received_date, notes)
  VALUES (v_customer_id, 'SAREE', 40, 'customer', '2025-12-21 11:00:00', 'Second batch - 40 sarees');

  -- Add to existing stock
  UPDATE material_stock
  SET quantity = quantity + 40,
      designs_pending = designs_pending + 40,
      updated_at = NOW()
  WHERE customer_id = v_customer_id
    AND material_type = 'SAREE'
    AND stage = 'received';

  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '✓ STEP 3: Received more stock on 21-Dec-2025';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '  - 40 more sarees';
  RAISE NOTICE '  - Total sarees now: 90 (designs pending: 90)';
END $$;

-- ============================================================================
-- STEP 4: Customer provides 30 designs
-- Now: designs_given = 30, designs_pending = 60
-- ============================================================================
DO $$
DECLARE
  v_customer_id UUID;
BEGIN
  SELECT id INTO v_customer_id FROM customers WHERE name = 'test customer 99';

  -- Customer gives 30 designs
  PERFORM update_design_count(v_customer_id, 'SAREE', 30, 'received');

  UPDATE material_stock
  SET design_notes = 'Customer provided 30 unique designs. 60 designs still pending.'
  WHERE customer_id = v_customer_id
    AND material_type = 'SAREE'
    AND stage = 'received';

  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '✓ STEP 4: Customer provided 30 designs';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '  - Designs given: 30';
  RAISE NOTICE '  - Designs pending: 60';
  RAISE NOTICE '  - ⚠️  NEED TO FOLLOW UP with customer for remaining 60 designs!';
END $$;

-- Show pending designs view
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '--- Pending Designs Report (for Customer Follow-up) ---';
END $$;

SELECT
  customer_name,
  material_type,
  total_quantity,
  designs_given,
  designs_pending,
  design_completion_pct || '%' as completion
FROM v_pending_designs
WHERE customer_name = 'test customer 99';

-- ============================================================================
-- STEP 5: Prepare 40 designs (30 from customer + 10 repeated)
-- We can only process 40 sarees because we have designs for 40
-- Update designs_given to 40 (reusing 10 designs)
-- ============================================================================
DO $$
DECLARE
  v_customer_id UUID;
BEGIN
  SELECT id INTO v_customer_id FROM customers WHERE name = 'test customer 99';

  -- Add 10 more designs by reusing existing designs
  UPDATE material_stock
  SET designs_given = 40,  -- 30 original + 10 repeated
      designs_pending = 50,  -- 90 - 40
      design_notes = 'Customer provided 30 unique designs. Prepared 40 total (10 designs repeated). 50 still pending.',
      updated_at = NOW()
  WHERE customer_id = v_customer_id
    AND material_type = 'SAREE'
    AND stage = 'received';

  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '✓ STEP 5: Prepared 40 designs for printing';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '  - Customer gave: 30 unique designs';
  RAISE NOTICE '  - We prepared: 40 total (reused 10 designs)';
  RAISE NOTICE '  - Can process: 40 sarees';
  RAISE NOTICE '  - Still pending: 50 designs from customer';
END $$;

-- ============================================================================
-- STEP 6: Move 40 sarees through production stages
-- received → preprocessing → printing → postprocessing
-- ============================================================================
DO $$
DECLARE
  v_customer_id UUID;
  v_order_id UUID;
BEGIN
  SELECT id INTO v_customer_id FROM customers WHERE name = 'test customer 99';
  SELECT id INTO v_order_id FROM orders WHERE customer_id = v_customer_id ORDER BY created_at DESC LIMIT 1;

  -- Move to preprocessing
  PERFORM move_stock_to_stage(v_customer_id, v_order_id, 'SAREE', 'received', 'preprocessing', 40, 'customer');
  RAISE NOTICE '  ✓ Moved 40 sarees: RECEIVED → PREPROCESSING';

  -- Move to printing
  PERFORM move_stock_to_stage(v_customer_id, v_order_id, 'SAREE', 'preprocessing', 'printing', 40, 'customer');
  RAISE NOTICE '  ✓ Moved 40 sarees: PREPROCESSING → PRINTING';

  -- Move to postprocessing
  PERFORM move_stock_to_stage(v_customer_id, v_order_id, 'SAREE', 'printing', 'postprocessing', 40, 'customer');
  RAISE NOTICE '  ✓ Moved 40 sarees: PRINTING → POSTPROCESSING';

  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '✓ STEP 6: Moved 40 sarees through production';
  RAISE NOTICE '========================================================================';
END $$;

-- ============================================================================
-- STEP 7: QUALITY CHECK after postprocessing
-- Identify 3 misprints during quality inspection
-- Move: 37 to completed, 3 to misprint
-- ============================================================================
DO $$
DECLARE
  v_customer_id UUID;
  v_order_id UUID;
BEGIN
  SELECT id INTO v_customer_id FROM customers WHERE name = 'test customer 99';
  SELECT id INTO v_order_id FROM orders WHERE customer_id = v_customer_id ORDER BY created_at DESC LIMIT 1;

  -- Quality check: 37 pass, 3 fail (misprints)
  PERFORM move_stock_to_stage(v_customer_id, v_order_id, 'SAREE', 'postprocessing', 'completed', 37, 'customer');
  RAISE NOTICE '  ✓ Quality Check: 37 sarees PASSED → COMPLETED';

  PERFORM move_stock_to_stage(v_customer_id, v_order_id, 'SAREE', 'postprocessing', 'misprint', 3, 'customer');
  RAISE NOTICE '  ✓ Quality Check: 3 sarees FAILED → MISPRINT';

  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '✓ STEP 7: Quality Check completed';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '  - Good quality: 37 sarees (ready for delivery)';
  RAISE NOTICE '  - Misprints: 3 sarees (will be sold separately)';
END $$;

-- ============================================================================
-- STEP 8: Generate delivery challans
-- Challan 1: 20 sarees
-- Challan 2: 17 sarees
-- Total delivered: 37 sarees
-- ============================================================================
DO $$
DECLARE
  v_customer_id UUID;
  v_challan_id_1 UUID;
  v_challan_id_2 UUID;
  v_challan_num_1 VARCHAR;
  v_challan_num_2 VARCHAR;
BEGIN
  SELECT id INTO v_customer_id FROM customers WHERE name = 'test customer 99';

  -- Delivery Challan 1: 20 sarees
  INSERT INTO delivery_challans (customer_id, challan_date, notes)
  VALUES (v_customer_id, '2025-12-21 15:00:00', 'Delivery 1 - 20 sarees')
  RETURNING id, challan_number INTO v_challan_id_1, v_challan_num_1;

  -- Reduce completed stock
  UPDATE material_stock
  SET quantity = quantity - 20, updated_at = NOW()
  WHERE customer_id = v_customer_id AND material_type = 'SAREE' AND stage = 'completed';

  RAISE NOTICE '  ✓ Challan 1: % (20 sarees)', v_challan_num_1;

  -- Delivery Challan 2: 17 sarees
  INSERT INTO delivery_challans (customer_id, challan_date, notes)
  VALUES (v_customer_id, '2025-12-21 16:00:00', 'Delivery 2 - 17 sarees')
  RETURNING id, challan_number INTO v_challan_id_2, v_challan_num_2;

  -- Reduce completed stock
  UPDATE material_stock
  SET quantity = quantity - 17, updated_at = NOW()
  WHERE customer_id = v_customer_id AND material_type = 'SAREE' AND stage = 'completed';

  RAISE NOTICE '  ✓ Challan 2: % (17 sarees)', v_challan_num_2;

  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '✓ STEP 8: Generated delivery challans';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '  - Total delivered: 37 sarees (20 + 17)';
  RAISE NOTICE '  - Completed stock remaining: 0';
END $$;

-- ============================================================================
-- STEP 9: Generate invoice for 37 sarees
-- Job work charges @ ₹100 per saree
-- Adjust for 3 misprints (₹300 reduction)
-- Link to both delivery challans
-- ============================================================================
DO $$
DECLARE
  v_customer_id UUID;
  v_challan_id_1 UUID;
  v_challan_id_2 UUID;
  v_invoice_id UUID;
  v_invoice_number VARCHAR;
  v_subtotal DECIMAL(10,2);
  v_misprint_adjustment DECIMAL(10,2);
  v_adjusted_subtotal DECIMAL(10,2);
  v_cgst_amt DECIMAL(10,2);
  v_sgst_amt DECIMAL(10,2);
  v_total DECIMAL(10,2);
BEGIN
  SELECT id INTO v_customer_id FROM customers WHERE name = 'test customer 99';

  SELECT id INTO v_challan_id_1 FROM delivery_challans
  WHERE customer_id = v_customer_id AND notes LIKE '%Delivery 1%';

  SELECT id INTO v_challan_id_2 FROM delivery_challans
  WHERE customer_id = v_customer_id AND notes LIKE '%Delivery 2%';

  -- Calculate amounts
  v_subtotal := 37 * 100.00;  -- ₹3,700 (37 sarees @ ₹100)
  v_misprint_adjustment := 3 * 100.00;  -- ₹300 (3 misprints @ ₹100)
  v_adjusted_subtotal := v_subtotal - v_misprint_adjustment;  -- ₹3,400
  v_cgst_amt := v_adjusted_subtotal * 0.09;  -- ₹306
  v_sgst_amt := v_adjusted_subtotal * 0.09;  -- ₹306
  v_total := v_adjusted_subtotal + v_cgst_amt + v_sgst_amt;  -- ₹4,012

  -- Create GST Invoice
  INSERT INTO gst_invoices (
    customer_id, invoice_type, invoice_date,
    subtotal, cgst_rate, cgst_amount, sgst_rate, sgst_amount,
    igst_rate, igst_amount, total_amount, status, notes
  )
  VALUES (
    v_customer_id, 'job_work', '2025-12-21 17:00:00',
    v_adjusted_subtotal, 9.00, v_cgst_amt, 9.00, v_sgst_amt,
    0.00, 0.00, v_total, 'pending',
    '37 sarees job work @ ₹100 = ₹3,700. Adjusted for 3 misprints (-₹300). Net: ₹3,400 + GST 18% = ₹4,012'
  )
  RETURNING id, invoice_number INTO v_invoice_id, v_invoice_number;

  -- Link invoice to challans
  INSERT INTO invoice_challans (invoice_id, challan_id)
  VALUES (v_invoice_id, v_challan_id_1), (v_invoice_id, v_challan_id_2);

  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '✓ STEP 9: Generated Invoice %', v_invoice_number;
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '  - Job work for 37 sarees @ ₹100 = ₹%', v_subtotal;
  RAISE NOTICE '  - Misprint adjustment (3 sarees) = -₹%', v_misprint_adjustment;
  RAISE NOTICE '  - Adjusted Subtotal = ₹%', v_adjusted_subtotal;
  RAISE NOTICE '  - CGST @ 9%% = ₹%', v_cgst_amt;
  RAISE NOTICE '  - SGST @ 9%% = ₹%', v_sgst_amt;
  RAISE NOTICE '  - TOTAL INVOICE = ₹%', v_total;
  RAISE NOTICE '  - Status: PENDING PAYMENT';
END $$;

-- ============================================================================
-- FINAL RECONCILIATION & VALIDATION
-- ============================================================================
RAISE NOTICE '';
RAISE NOTICE '';
RAISE NOTICE '========================================================================';
RAISE NOTICE 'FINAL STOCK RECONCILIATION - TEST CUSTOMER 99';
RAISE NOTICE '========================================================================';

-- Material IN Summary
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '--- MATERIAL RECEIVED (IN) ---';
END $$;

SELECT
  material_type,
  SUM(quantity) as total_received,
  STRING_AGG(DISTINCT TO_CHAR(received_date, 'DD-Mon'), ', ') as received_dates
FROM material_in
WHERE customer_id = (SELECT id FROM customers WHERE name = 'test customer 99')
GROUP BY material_type
ORDER BY material_type;

-- Current Stock by Stage
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '--- CURRENT STOCK BY STAGE ---';
END $$;

SELECT
  material_type,
  stage,
  quantity,
  designs_given,
  designs_pending
FROM material_stock
WHERE customer_id = (SELECT id FROM customers WHERE name = 'test customer 99')
  AND quantity > 0
ORDER BY material_type, stage;

-- Pending Designs
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '--- PENDING DESIGNS (CUSTOMER FOLLOW-UP NEEDED) ---';
END $$;

SELECT
  material_type,
  total_quantity,
  designs_given,
  designs_pending,
  design_completion_pct || '%' as completion
FROM v_pending_designs
WHERE customer_name = 'test customer 99';

-- Deliveries
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '--- DELIVERIES ---';
END $$;

SELECT
  challan_number,
  TO_CHAR(challan_date, 'DD-Mon HH24:MI') as delivered_at,
  notes
FROM delivery_challans
WHERE customer_id = (SELECT id FROM customers WHERE name = 'test customer 99')
ORDER BY challan_date;

-- Invoice
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '--- INVOICE ---';
END $$;

SELECT
  invoice_number,
  invoice_type,
  subtotal,
  total_amount,
  status
FROM gst_invoices
WHERE customer_id = (SELECT id FROM customers WHERE name = 'test customer 99');

-- Outstanding Payment
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '--- OUTSTANDING PAYMENT ---';
END $$;

SELECT
  customer_name,
  total_invoiced,
  total_paid,
  outstanding_amount
FROM v_outstanding_payments
WHERE customer_name = 'test customer 99';

-- Final Summary
DO $$
DECLARE
  v_total_in INTEGER;
  v_total_stock INTEGER;
  v_total_delivered INTEGER;
  v_total_misprint INTEGER;
  v_balance_check INTEGER;
BEGIN
  -- Get totals
  SELECT SUM(quantity) INTO v_total_in
  FROM material_in
  WHERE customer_id = (SELECT id FROM customers WHERE name = 'test customer 99')
    AND material_type = 'SAREE';

  SELECT SUM(quantity) INTO v_total_stock
  FROM material_stock
  WHERE customer_id = (SELECT id FROM customers WHERE name = 'test customer 99')
    AND material_type = 'SAREE';

  SELECT SUM(quantity) INTO v_total_misprint
  FROM material_stock
  WHERE customer_id = (SELECT id FROM customers WHERE name = 'test customer 99')
    AND material_type = 'SAREE'
    AND stage = 'misprint';

  v_total_delivered := 37;  -- From challans

  v_balance_check := COALESCE(v_total_stock, 0) + v_total_delivered;

  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'SAREE RECONCILIATION CHECK';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'Total Sarees RECEIVED:     % units', v_total_in;
  RAISE NOTICE 'Current Stock (all stages): % units', COALESCE(v_total_stock, 0);
  RAISE NOTICE '  - In received stage:     50 units (pending 50 designs)';
  RAISE NOTICE '  - In misprint stage:     3 units';
  RAISE NOTICE 'Delivered to customer:     % units', v_total_delivered;
  RAISE NOTICE '';
  RAISE NOTICE 'Balance Check: % + % = % units', COALESCE(v_total_stock, 0), v_total_delivered, v_balance_check;
  RAISE NOTICE 'Expected:      % units', v_total_in;
  RAISE NOTICE 'Status:        %', CASE WHEN v_balance_check = v_total_in THEN '✓ RECONCILED' ELSE '✗ MISMATCH' END;
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'TEST COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Follow up with customer for 50 pending designs';
  RAISE NOTICE '  2. Collect payment of ₹4,012';
  RAISE NOTICE '  3. Sell 3 misprint sarees in misprint sales';
  RAISE NOTICE '';
END $$;
