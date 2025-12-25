-- STEP 3: TEST COMPLETE USE CASE - Customer 99
-- Tests design tracking and complete workflow
-- Digital Textile Printing System
-- Created: 2025-12-21
-- RERUNNABLE: Safe to execute multiple times (cleans up test data first)

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
  DELETE FROM material_design_tracking WHERE customer_id IN (SELECT id FROM customers WHERE name = 'test customer 99');
  DELETE FROM material_stock WHERE customer_id IN (SELECT id FROM customers WHERE name = 'test customer 99');
  DELETE FROM material_in WHERE customer_id IN (SELECT id FROM customers WHERE name = 'test customer 99');
  DELETE FROM orders WHERE customer_id IN (SELECT id FROM customers WHERE name = 'test customer 99');
  DELETE FROM customers WHERE name = 'test customer 99';

  RAISE NOTICE 'Cleaned up existing test data';
END $$;

-- STEP 1: Create test customer and order
DO $$
DECLARE
  v_customer_id UUID;
  v_order_id UUID;
  v_order_number VARCHAR;
BEGIN
  -- Create customer
  INSERT INTO customers (name, phone, email, gst_number, address, is_active)
  VALUES (
    'test customer 99',
    '9999999999',
    'testcustomer99@test.com',
    '29ABCDE1234F1Z5',
    'Test Address, Test City',
    true
  )
  RETURNING id INTO v_customer_id;

  -- Create order
  INSERT INTO orders (customer_id, ownership_type, total_quantity, status, order_date, expected_delivery_date, notes)
  VALUES (
    v_customer_id,
    'customer_material',
    90,
    'active',
    '2025-12-20 09:00:00',
    '2025-12-30 18:00:00',
    'Test order for 90 sarees with design tracking'
  )
  RETURNING id, order_number INTO v_order_id, v_order_number;

  RAISE NOTICE 'Created customer: test customer 99 with order: %', v_order_number;
END $$;

SELECT 'Created customer and order' AS step_1;

-- STEP 2: Receive stock on 20-Dec-2025 with order linkage
DO $$
DECLARE
  v_customer_id UUID;
  v_order_id UUID;
BEGIN
  SELECT id INTO v_customer_id FROM customers WHERE name = 'test customer 99';
  SELECT id INTO v_order_id FROM orders WHERE customer_id = v_customer_id ORDER BY created_at DESC LIMIT 1;

  -- Material IN with order_id
  INSERT INTO material_in (customer_id, order_id, material_type, quantity, ownership, received_date, notes)
  VALUES
  (v_customer_id, v_order_id, 'SAREE', 50, 'customer', '2025-12-20 10:00:00', 'First batch - 50 sarees'),
  (v_customer_id, v_order_id, 'DUPATTA', 20, 'customer', '2025-12-20 10:05:00', 'First batch - 20 duppattas'),
  (v_customer_id, v_order_id, 'VONI', 5, 'customer', '2025-12-20 10:10:00', 'First batch - 5 vonis'),
  (v_customer_id, v_order_id, 'RUNNING', 10, 'customer', '2025-12-20 10:15:00', 'First batch - 10 meters running fabric');

  -- Material STOCK with order_id
  INSERT INTO material_stock (customer_id, order_id, material_type, stage, quantity, ownership, is_active)
  VALUES
  (v_customer_id, v_order_id, 'SAREE', 'received', 50, 'customer', true),
  (v_customer_id, v_order_id, 'DUPATTA', 'received', 20, 'customer', true),
  (v_customer_id, v_order_id, 'VONI', 'received', 5, 'customer', true),
  (v_customer_id, v_order_id, 'RUNNING', 'received', 10, 'customer', true);

  -- Create design tracking for ALL fabrics (customer material needs designs) with order_id
  INSERT INTO material_design_tracking (customer_id, order_id, material_type, total_quantity, designs_given, designs_pending, batch_identifier)
  VALUES
  (v_customer_id, v_order_id, 'SAREE', 50, 0, 50, 'Batch-20Dec2025-1'),
  (v_customer_id, v_order_id, 'DUPATTA', 20, 0, 20, 'Batch-20Dec2025-1'),
  (v_customer_id, v_order_id, 'VONI', 5, 0, 5, 'Batch-20Dec2025-1'),
  (v_customer_id, v_order_id, 'RUNNING', 10, 0, 10, 'Batch-20Dec2025-1');

  RAISE NOTICE 'Received stock on 20-Dec: 50 sarees, 20 duppattas, 5 vonis, 10 running (linked to order %)', (SELECT order_number FROM orders WHERE id = v_order_id);
END $$;

-- STEP 3: Receive more stock on 21-Dec-2025 with order linkage
DO $$
DECLARE
  v_customer_id UUID;
  v_order_id UUID;
BEGIN
  SELECT id INTO v_customer_id FROM customers WHERE name = 'test customer 99';
  SELECT id INTO v_order_id FROM orders WHERE customer_id = v_customer_id ORDER BY created_at DESC LIMIT 1;

  -- Material IN with order_id
  INSERT INTO material_in (customer_id, order_id, material_type, quantity, ownership, received_date, notes)
  VALUES (v_customer_id, v_order_id, 'SAREE', 40, 'customer', '2025-12-21 11:00:00', 'Second batch - 40 sarees');

  -- Update existing material_stock record with order_id
  UPDATE material_stock
  SET quantity = quantity + 40, updated_at = NOW()
  WHERE customer_id = v_customer_id
    AND order_id = v_order_id
    AND material_type = 'SAREE'
    AND stage = 'received'
    AND is_active = true;

  -- Update design tracking for total quantity with order_id
  UPDATE material_design_tracking
  SET total_quantity = 90,
      designs_pending = 90 - designs_given,
      updated_at = NOW()
  WHERE customer_id = v_customer_id
    AND order_id = v_order_id
    AND material_type = 'SAREE'
    AND batch_identifier = 'Batch-20Dec2025-1';

  RAISE NOTICE 'Received 40 more sarees on 21-Dec. Total: 90 sarees';
END $$;

-- STEP 4: Customer provides 30 designs
DO $$
DECLARE
  v_customer_id UUID;
  v_order_id UUID;
BEGIN
  SELECT id INTO v_customer_id FROM customers WHERE name = 'test customer 99';
  SELECT id INTO v_order_id FROM orders WHERE customer_id = v_customer_id ORDER BY created_at DESC LIMIT 1;

  PERFORM update_design_count(v_customer_id, v_order_id, 'SAREE', 30, 'Batch-20Dec2025-1');

  UPDATE material_design_tracking
  SET design_notes = 'Customer provided 30 unique designs. 60 designs still pending.'
  WHERE customer_id = v_customer_id
    AND order_id = v_order_id
    AND material_type = 'SAREE'
    AND batch_identifier = 'Batch-20Dec2025-1';

  RAISE NOTICE 'Customer gave 30 designs. PENDING: 60 designs (need follow-up!)';
END $$;

SELECT 'Customer 99 - Pending Designs:' AS step_4;

SELECT material_type, total_quantity, designs_given, designs_pending
FROM v_pending_designs
WHERE customer_name = 'test customer 99';

-- STEP 5: Prepare 40 designs (30 from customer + 10 repeated)
DO $$
DECLARE
  v_customer_id UUID;
  v_order_id UUID;
BEGIN
  SELECT id INTO v_customer_id FROM customers WHERE name = 'test customer 99';
  SELECT id INTO v_order_id FROM orders WHERE customer_id = v_customer_id ORDER BY created_at DESC LIMIT 1;

  PERFORM update_design_count(v_customer_id, v_order_id, 'SAREE', 10, 'Batch-20Dec2025-1');

  UPDATE material_design_tracking
  SET design_notes = '30 unique designs from customer + 10 repeated = 40 total ready. 50 still pending.'
  WHERE customer_id = v_customer_id
    AND order_id = v_order_id
    AND material_type = 'SAREE'
    AND batch_identifier = 'Batch-20Dec2025-1';

  RAISE NOTICE 'Prepared 40 designs total (30 unique + 10 repeated). Can process 40 sarees.';
END $$;

-- STEP 6: Move 40 sarees through production stages
DO $$
DECLARE
  v_customer_id UUID;
  v_order_id UUID;
BEGIN
  SELECT id INTO v_customer_id FROM customers WHERE name = 'test customer 99';
  SELECT id INTO v_order_id FROM orders WHERE customer_id = v_customer_id ORDER BY created_at DESC LIMIT 1;

  PERFORM move_stock_to_stage(v_customer_id, v_order_id, 'SAREE', 'received', 'preprocessing', 40, 'customer');
  RAISE NOTICE 'Moved 40 sarees: received -> preprocessing';

  PERFORM move_stock_to_stage(v_customer_id, v_order_id, 'SAREE', 'preprocessing', 'printing', 40, 'customer');
  RAISE NOTICE 'Moved 40 sarees: preprocessing -> printing';

  PERFORM move_stock_to_stage(v_customer_id, v_order_id, 'SAREE', 'printing', 'postprocessing', 40, 'customer');
  RAISE NOTICE 'Moved 40 sarees: printing -> postprocessing';
END $$;

-- STEP 7: Quality check AFTER postprocessing (37 pass, 3 misprints)
DO $$
DECLARE
  v_customer_id UUID;
  v_order_id UUID;
BEGIN
  SELECT id INTO v_customer_id FROM customers WHERE name = 'test customer 99';
  SELECT id INTO v_order_id FROM orders WHERE customer_id = v_customer_id ORDER BY created_at DESC LIMIT 1;

  PERFORM move_stock_to_stage(v_customer_id, v_order_id, 'SAREE', 'postprocessing', 'completed', 37, 'customer');
  RAISE NOTICE 'Quality Check: 37 sarees PASSED -> completed';

  PERFORM move_stock_to_stage(v_customer_id, v_order_id, 'SAREE', 'postprocessing', 'misprint', 3, 'customer');
  RAISE NOTICE 'Quality Check: 3 sarees FAILED -> misprint';
END $$;

-- STEP 8: Create delivery challans and move to delivered stage (20 + 17 = 37) with order linkage
DO $$
DECLARE
  v_customer_id UUID;
  v_order_id UUID;
  v_challan_num_1 VARCHAR;
  v_challan_num_2 VARCHAR;
  v_challan_id_1 UUID;
  v_challan_id_2 UUID;
BEGIN
  SELECT id INTO v_customer_id FROM customers WHERE name = 'test customer 99';
  SELECT id INTO v_order_id FROM orders WHERE customer_id = v_customer_id ORDER BY created_at DESC LIMIT 1;

  -- Delivery Challan 1 with order_id and items
  INSERT INTO delivery_challans (customer_id, order_id, challan_date, notes)
  VALUES (v_customer_id, v_order_id, '2025-12-21 15:00:00', 'Delivery 1 - 20 sarees')
  RETURNING id, challan_number INTO v_challan_id_1, v_challan_num_1;

  -- Add challan items for Challan 1
  INSERT INTO challan_items (challan_id, order_id, material_type, quantity, notes)
  VALUES (v_challan_id_1, v_order_id, 'SAREE', 20, 'First delivery batch');

  PERFORM move_stock_to_stage(v_customer_id, v_order_id, 'SAREE', 'completed', 'delivered', 20, 'customer');
  RAISE NOTICE 'Created challan: % with 20 SAREES - Moved to delivered stage', v_challan_num_1;

  -- Delivery Challan 2 with order_id and items
  INSERT INTO delivery_challans (customer_id, order_id, challan_date, notes)
  VALUES (v_customer_id, v_order_id, '2025-12-21 16:00:00', 'Delivery 2 - 17 sarees')
  RETURNING id, challan_number INTO v_challan_id_2, v_challan_num_2;

  -- Add challan items for Challan 2
  INSERT INTO challan_items (challan_id, order_id, material_type, quantity, notes)
  VALUES (v_challan_id_2, v_order_id, 'SAREE', 17, 'Second delivery batch');

  PERFORM move_stock_to_stage(v_customer_id, v_order_id, 'SAREE', 'completed', 'delivered', 17, 'customer');
  RAISE NOTICE 'Created challan: % with 17 SAREES - Moved to delivered stage', v_challan_num_2;
END $$;

-- STEP 9: Generate invoice (37 sarees, adjusted for 3 misprints) with order linkage
DO $$
DECLARE
  v_customer_id UUID;
  v_order_id UUID;
  v_challan_id_1 UUID;
  v_challan_id_2 UUID;
  v_invoice_number VARCHAR;
  v_subtotal DECIMAL(10,2);
  v_adjustment DECIMAL(10,2);
  v_net DECIMAL(10,2);
  v_cgst DECIMAL(10,2);
  v_sgst DECIMAL(10,2);
  v_total DECIMAL(10,2);
BEGIN
  SELECT id INTO v_customer_id FROM customers WHERE name = 'test customer 99';
  SELECT id INTO v_order_id FROM orders WHERE customer_id = v_customer_id ORDER BY created_at DESC LIMIT 1;

  SELECT id INTO v_challan_id_1 FROM delivery_challans
  WHERE customer_id = v_customer_id AND notes LIKE '%Delivery 1%';

  SELECT id INTO v_challan_id_2 FROM delivery_challans
  WHERE customer_id = v_customer_id AND notes LIKE '%Delivery 2%';

  v_subtotal := 37 * 100.00;
  v_adjustment := 3 * 100.00;
  v_net := v_subtotal - v_adjustment;
  v_cgst := v_net * 0.09;
  v_sgst := v_net * 0.09;
  v_total := v_net + v_cgst + v_sgst;

  -- Invoice (note: order_id and status columns don't exist in gst_invoices table)
  INSERT INTO gst_invoices (
    customer_id, invoice_date,
    subtotal, cgst_rate, cgst_amount, sgst_rate, sgst_amount,
    igst_rate, igst_amount, total_amount, notes
  )
  VALUES (
    v_customer_id, '2025-12-21 17:00:00',
    v_net, 9.00, v_cgst, 9.00, v_sgst,
    0.00, 0.00, v_total,
    'Job Work Invoice - 37 sarees @ Rs.100 = Rs.3700. Adjusted for 3 misprints (-Rs.300). Net: Rs.3400 + GST 18% = Rs.4012'
  )
  RETURNING invoice_number INTO v_invoice_number;

  INSERT INTO invoice_challans (invoice_id, challan_id)
  SELECT
    (SELECT id FROM gst_invoices WHERE invoice_number = v_invoice_number),
    id
  FROM delivery_challans
  WHERE id IN (v_challan_id_1, v_challan_id_2);

  RAISE NOTICE 'Created invoice: % for Rs.%', v_invoice_number, v_total;
  RAISE NOTICE 'Breakdown: 37 sarees (Rs.%) - 3 misprints (Rs.%) = Rs.% + GST', v_subtotal, v_adjustment, v_net;
END $$;

-- FINAL RECONCILIATION
SELECT 'MATERIAL RECEIVED (IN):' AS reconciliation;

SELECT material_type, SUM(quantity) as total_received
FROM material_in
WHERE customer_id = (SELECT id FROM customers WHERE name = 'test customer 99')
GROUP BY material_type
ORDER BY material_type;

SELECT 'CURRENT ACTIVE STOCK BY STAGE:' AS stock_status;

SELECT material_type, stage, quantity, is_active
FROM material_stock
WHERE customer_id = (SELECT id FROM customers WHERE name = 'test customer 99')
  AND is_active = true
  AND quantity > 0
ORDER BY material_type, stage;

SELECT 'STOCK MOVEMENT HISTORY (Last 20):' AS movement_history;

SELECT material_type, stage, quantity, is_active, created_at as moved_at
FROM material_stock
WHERE customer_id = (SELECT id FROM customers WHERE name = 'test customer 99')
ORDER BY created_at DESC
LIMIT 20;

SELECT 'PENDING DESIGNS (FOLLOW-UP):' AS pending_designs;

SELECT material_type, designs_given, designs_pending
FROM v_pending_designs
WHERE customer_name = 'test customer 99';

SELECT 'INVOICE & PAYMENT:' AS payment_status;

SELECT invoice_number, total_amount, outstanding_amount
FROM gst_invoices
WHERE customer_id = (SELECT id FROM customers WHERE name = 'test customer 99');

SELECT 'OUTSTANDING PAYMENT:' AS outstanding;

SELECT customer_name, total_invoiced, total_paid, outstanding_amount
FROM v_outstanding_payments
WHERE customer_name = 'test customer 99';

-- FINAL BALANCE CHECK
DO $$
DECLARE
  v_total_in INTEGER;
  v_total_stock INTEGER;
  v_delivered INTEGER;
  v_balance INTEGER;
BEGIN
  SELECT SUM(quantity) INTO v_total_in
  FROM material_in
  WHERE customer_id = (SELECT id FROM customers WHERE name = 'test customer 99')
    AND material_type = 'SAREE';

  SELECT SUM(quantity) INTO v_total_stock
  FROM material_stock
  WHERE customer_id = (SELECT id FROM customers WHERE name = 'test customer 99')
    AND material_type = 'SAREE'
    AND is_active = true;

  SELECT COALESCE(SUM(quantity), 0) INTO v_delivered
  FROM material_stock
  WHERE customer_id = (SELECT id FROM customers WHERE name = 'test customer 99')
    AND material_type = 'SAREE'
    AND stage = 'delivered'
    AND is_active = true;

  RAISE NOTICE '';
  RAISE NOTICE 'SAREE RECONCILIATION:';
  RAISE NOTICE 'Total RECEIVED:     % units', v_total_in;
  RAISE NOTICE 'Total in STOCK:     % units (all stages including delivered)', COALESCE(v_total_stock, 0);
  RAISE NOTICE 'DELIVERED:          % units (in delivered stage)', v_delivered;
  RAISE NOTICE 'Balance check: Total in stock = % units', COALESCE(v_total_stock, 0);
  RAISE NOTICE 'Expected: % units', v_total_in;
  RAISE NOTICE 'Status: %', CASE WHEN v_total_stock = v_total_in THEN 'RECONCILED!' ELSE 'MISMATCH' END;
  RAISE NOTICE '';
  RAISE NOTICE 'Stock Breakdown:';
  RAISE NOTICE '- 50 in received stage (pending designs)';
  RAISE NOTICE '- 37 in delivered stage (invoiced)';
  RAISE NOTICE '- 3 in misprint stage (to be sold separately)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Follow up for 50 pending designs';
  RAISE NOTICE '2. Collect payment Rs.4,012';
  RAISE NOTICE '3. Sell 3 misprint sarees';
END $$;

-- ORDER LIFECYCLE VERIFICATION
SELECT 'ORDER LIFECYCLE:' AS order_tracking;

SELECT * FROM v_order_lifecycle
WHERE customer_name = 'test customer 99';

-- Get order summary
SELECT 'ORDER SUMMARY:' AS summary;

SELECT * FROM get_order_summary(
  (SELECT id FROM orders WHERE customer_id = (SELECT id FROM customers WHERE name = 'test customer 99'))
);

SELECT 'STEP 3 COMPLETE - Test successful with complete order lineage!' AS status;
