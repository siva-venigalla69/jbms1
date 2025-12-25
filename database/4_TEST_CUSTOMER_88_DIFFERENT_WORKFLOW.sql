-- STEP 4: TEST DIFFERENT WORKFLOW - Customer 88
-- Tests own stock workflow (not customer material)
-- Digital Textile Printing System
-- Created: 2025-12-22
-- RERUNNABLE: Safe to execute multiple times (cleans up test data first)

-- Clean up existing test data
DO $$
BEGIN
  DELETE FROM invoice_challans WHERE challan_id IN (
    SELECT id FROM delivery_challans WHERE customer_id IN (
      SELECT id FROM customers WHERE name = 'test customer 88'
    )
  );
  DELETE FROM challan_items WHERE challan_id IN (
    SELECT id FROM delivery_challans WHERE customer_id IN (
      SELECT id FROM customers WHERE name = 'test customer 88'
    )
  );
  DELETE FROM delivery_challans WHERE customer_id IN (SELECT id FROM customers WHERE name = 'test customer 88');
  DELETE FROM gst_invoices WHERE customer_id IN (SELECT id FROM customers WHERE name = 'test customer 88');
  DELETE FROM payments WHERE customer_id IN (SELECT id FROM customers WHERE name = 'test customer 88');
  DELETE FROM returns WHERE customer_id IN (SELECT id FROM customers WHERE name = 'test customer 88');
  DELETE FROM material_stock WHERE customer_id IN (SELECT id FROM customers WHERE name = 'test customer 88');
  DELETE FROM material_design_tracking WHERE customer_id IN (SELECT id FROM customers WHERE name = 'test customer 88');
  DELETE FROM material_in WHERE customer_id IN (SELECT id FROM customers WHERE name = 'test customer 88');
  DELETE FROM orders WHERE customer_id IN (SELECT id FROM customers WHERE name = 'test customer 88');
  DELETE FROM customers WHERE name = 'test customer 88';

  RAISE NOTICE 'Cleaned up existing test data for customer 88';
END $$;

-- STEP 1: Create customer and order for OWN STOCK (sales, not job work)
DO $$
DECLARE
  v_customer_id UUID;
  v_order_id UUID;
  v_order_number VARCHAR;
BEGIN
  -- Create customer
  INSERT INTO customers (name, phone, email, gst_number, address, is_active)
  VALUES (
    'test customer 88',
    '8888888888',
    'testcustomer88@test.com',
    '29XYZKL5678M1N9',
    'Test Address 88, Test City 88',
    true
  )
  RETURNING id INTO v_customer_id;

  -- Create order for own stock (sales order)
  INSERT INTO orders (customer_id, ownership_type, total_quantity, status, order_date, expected_delivery_date, notes)
  VALUES (
    v_customer_id,
    'own_stock',
    100,
    'active',
    '2025-12-22 09:00:00',
    '2025-12-25 18:00:00',
    'Sales order for 100 duppattas from own stock'
  )
  RETURNING id, order_number INTO v_order_id, v_order_number;

  RAISE NOTICE 'Created customer 88 with order: % (OWN STOCK - SALES)', v_order_number;
END $$;

-- STEP 2: Receive OWN stock (not customer material)
DO $$
DECLARE
  v_customer_id UUID;
  v_order_id UUID;
BEGIN
  SELECT id INTO v_customer_id FROM customers WHERE name = 'test customer 88';
  SELECT id INTO v_order_id FROM orders WHERE customer_id = v_customer_id ORDER BY created_at DESC LIMIT 1;

  -- Material IN with ownership = 'self'
  INSERT INTO material_in (customer_id, order_id, material_type, quantity, ownership, received_date, notes)
  VALUES (v_customer_id, v_order_id, 'DUPATTA', 100, 'self', '2025-12-22 10:00:00', 'Own stock - 100 duppattas for sales');

  -- Material STOCK with ownership = 'self'
  INSERT INTO material_stock (customer_id, order_id, material_type, stage, quantity, ownership, is_active)
  VALUES (v_customer_id, v_order_id, 'DUPATTA', 'received', 100, 'self', true);

  RAISE NOTICE 'Received OWN stock: 100 duppattas (ownership = self)';
END $$;

-- STEP 3: NO design tracking needed for own stock (we already have designs)
-- Move directly through production

-- STEP 4: Move through production stages (no waiting for customer designs)
DO $$
DECLARE
  v_customer_id UUID;
  v_order_id UUID;
BEGIN
  SELECT id INTO v_customer_id FROM customers WHERE name = 'test customer 88';
  SELECT id INTO v_order_id FROM orders WHERE customer_id = v_customer_id ORDER BY created_at DESC LIMIT 1;

  PERFORM move_stock_to_stage(v_customer_id, v_order_id, 'DUPATTA', 'received', 'preprocessing', 100, 'self');
  RAISE NOTICE 'Moved 100 duppattas: received -> preprocessing';

  PERFORM move_stock_to_stage(v_customer_id, v_order_id, 'DUPATTA', 'preprocessing', 'printing', 100, 'self');
  RAISE NOTICE 'Moved 100 duppattas: preprocessing -> printing';

  PERFORM move_stock_to_stage(v_customer_id, v_order_id, 'DUPATTA', 'printing', 'postprocessing', 100, 'self');
  RAISE NOTICE 'Moved 100 duppattas: printing -> postprocessing';
END $$;

-- STEP 5: Quality check (95 pass, 5 misprints)
DO $$
DECLARE
  v_customer_id UUID;
  v_order_id UUID;
BEGIN
  SELECT id INTO v_customer_id FROM customers WHERE name = 'test customer 88';
  SELECT id INTO v_order_id FROM orders WHERE customer_id = v_customer_id ORDER BY created_at DESC LIMIT 1;

  PERFORM move_stock_to_stage(v_customer_id, v_order_id, 'DUPATTA', 'postprocessing', 'completed', 95, 'self');
  RAISE NOTICE 'Quality Check: 95 duppattas PASSED -> completed';

  PERFORM move_stock_to_stage(v_customer_id, v_order_id, 'DUPATTA', 'postprocessing', 'misprint', 5, 'self');
  RAISE NOTICE 'Quality Check: 5 duppattas FAILED -> misprint';
END $$;

-- STEP 6: Delivery (all 95 in one challan)
DO $$
DECLARE
  v_customer_id UUID;
  v_order_id UUID;
  v_challan_num VARCHAR;
BEGIN
  SELECT id INTO v_customer_id FROM customers WHERE name = 'test customer 88';
  SELECT id INTO v_order_id FROM orders WHERE customer_id = v_customer_id ORDER BY created_at DESC LIMIT 1;

  INSERT INTO delivery_challans (customer_id, order_id, challan_date, notes)
  VALUES (v_customer_id, v_order_id, '2025-12-22 16:00:00', 'Delivery - 95 duppattas from own stock')
  RETURNING challan_number INTO v_challan_num;

  PERFORM move_stock_to_stage(v_customer_id, v_order_id, 'DUPATTA', 'completed', 'delivered', 95, 'self');
  RAISE NOTICE 'Created challan: % - Moved 95 duppattas: completed -> delivered', v_challan_num;
END $$;

-- STEP 7: Generate SALES invoice (not job work)
DO $$
DECLARE
  v_customer_id UUID;
  v_order_id UUID;
  v_challan_id UUID;
  v_invoice_number VARCHAR;
  v_unit_price DECIMAL(10,2);
  v_subtotal DECIMAL(10,2);
  v_cgst DECIMAL(10,2);
  v_sgst DECIMAL(10,2);
  v_total DECIMAL(10,2);
BEGIN
  SELECT id INTO v_customer_id FROM customers WHERE name = 'test customer 88';
  SELECT id INTO v_order_id FROM orders WHERE customer_id = v_customer_id ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO v_challan_id FROM delivery_challans WHERE customer_id = v_customer_id ORDER BY created_at DESC LIMIT 1;

  v_unit_price := 150.00;
  v_subtotal := 95 * v_unit_price;
  v_cgst := v_subtotal * 0.09;
  v_sgst := v_subtotal * 0.09;
  v_total := v_subtotal + v_cgst + v_sgst;

  -- Invoice with invoice_type = 'sales'
  INSERT INTO gst_invoices (
    customer_id, order_id, invoice_type, invoice_date,
    subtotal, cgst_rate, cgst_amount, sgst_rate, sgst_amount,
    igst_rate, igst_amount, total_amount, status, notes
  )
  VALUES (
    v_customer_id, v_order_id, 'sales', '2025-12-22 17:00:00',
    v_subtotal, 9.00, v_cgst, 9.00, v_sgst,
    0.00, 0.00, v_total, 'pending',
    '95 duppattas @ Rs.150 = Rs.14,250 + GST 18% = Rs.16,815 (SALES - own stock)'
  )
  RETURNING invoice_number INTO v_invoice_number;

  INSERT INTO invoice_challans (invoice_id, challan_id)
  SELECT
    (SELECT id FROM gst_invoices WHERE invoice_number = v_invoice_number),
    v_challan_id;

  RAISE NOTICE 'Created SALES invoice: % for Rs.%', v_invoice_number, v_total;
END $$;

-- STEP 8: Record partial payment
DO $$
DECLARE
  v_customer_id UUID;
  v_invoice_id UUID;
BEGIN
  SELECT id INTO v_customer_id FROM customers WHERE name = 'test customer 88';
  SELECT id INTO v_invoice_id FROM gst_invoices WHERE customer_id = v_customer_id ORDER BY created_at DESC LIMIT 1;

  INSERT INTO payments (customer_id, invoice_id, payment_date, amount, payment_method, transaction_reference, notes)
  VALUES (
    v_customer_id, v_invoice_id, '2025-12-22 18:00:00', 10000.00, 'bank_transfer', 'REF88001', 'Partial payment - advance'
  );

  RAISE NOTICE 'Recorded payment: Rs.10,000 (Outstanding: Rs.6,815)';
END $$;

-- RECONCILIATION
SELECT 'MATERIAL RECEIVED (IN):' AS reconciliation;

SELECT material_type, SUM(quantity) as total_received, ownership
FROM material_in
WHERE customer_id = (SELECT id FROM customers WHERE name = 'test customer 88')
GROUP BY material_type, ownership
ORDER BY material_type;

SELECT 'CURRENT ACTIVE STOCK BY STAGE:' AS stock_status;

SELECT material_type, stage, quantity, ownership, is_active
FROM material_stock
WHERE customer_id = (SELECT id FROM customers WHERE name = 'test customer 88')
  AND is_active = true
  AND quantity > 0
ORDER BY material_type, stage;

SELECT 'STOCK MOVEMENT HISTORY (Last 15):' AS movement_history;

SELECT material_type, stage, quantity, ownership, is_active, created_at as moved_at
FROM material_stock
WHERE customer_id = (SELECT id FROM customers WHERE name = 'test customer 88')
ORDER BY created_at DESC
LIMIT 15;

SELECT 'INVOICE & PAYMENT:' AS payment_status;

SELECT invoice_number, invoice_type, total_amount, status
FROM gst_invoices
WHERE customer_id = (SELECT id FROM customers WHERE name = 'test customer 88');

SELECT 'OUTSTANDING PAYMENT:' AS outstanding;

SELECT customer_name, total_invoiced, total_paid, outstanding_amount
FROM v_outstanding_payments
WHERE customer_name = 'test customer 88';

-- ORDER LIFECYCLE VERIFICATION
SELECT 'ORDER LIFECYCLE:' AS order_tracking;

SELECT * FROM v_order_lifecycle
WHERE customer_name = 'test customer 88';

-- FINAL BALANCE CHECK
DO $$
DECLARE
  v_total_in INTEGER;
  v_total_stock INTEGER;
  v_delivered INTEGER;
  v_misprint INTEGER;
BEGIN
  SELECT SUM(quantity) INTO v_total_in
  FROM material_in
  WHERE customer_id = (SELECT id FROM customers WHERE name = 'test customer 88')
    AND material_type = 'DUPATTA';

  SELECT SUM(quantity) INTO v_total_stock
  FROM material_stock
  WHERE customer_id = (SELECT id FROM customers WHERE name = 'test customer 88')
    AND material_type = 'DUPATTA'
    AND is_active = true;

  SELECT COALESCE(SUM(quantity), 0) INTO v_delivered
  FROM material_stock
  WHERE customer_id = (SELECT id FROM customers WHERE name = 'test customer 88')
    AND material_type = 'DUPATTA'
    AND stage = 'delivered'
    AND is_active = true;

  SELECT COALESCE(SUM(quantity), 0) INTO v_misprint
  FROM material_stock
  WHERE customer_id = (SELECT id FROM customers WHERE name = 'test customer 88')
    AND material_type = 'DUPATTA'
    AND stage = 'misprint'
    AND is_active = true;

  RAISE NOTICE '';
  RAISE NOTICE 'DUPATTA RECONCILIATION (OWN STOCK):';
  RAISE NOTICE 'Total RECEIVED:     % units', v_total_in;
  RAISE NOTICE 'Total in STOCK:     % units (all stages)', COALESCE(v_total_stock, 0);
  RAISE NOTICE 'DELIVERED:          % units', v_delivered;
  RAISE NOTICE 'MISPRINT:           % units', v_misprint;
  RAISE NOTICE 'Balance check: % = % + %', COALESCE(v_total_stock, 0), v_delivered, v_misprint;
  RAISE NOTICE 'Expected: % units', v_total_in;
  RAISE NOTICE 'Status: %', CASE WHEN v_total_stock = v_total_in THEN 'RECONCILED!' ELSE 'MISMATCH' END;
  RAISE NOTICE '';
  RAISE NOTICE 'Key Differences:';
  RAISE NOTICE '- Ownership: SELF (own stock, not customer material)';
  RAISE NOTICE '- Invoice Type: SALES (not job work)';
  RAISE NOTICE '- No design tracking needed (we have designs)';
  RAISE NOTICE '- Payment: Rs.10,000 paid, Rs.6,815 outstanding';
END $$;

SELECT 'STEP 4 COMPLETE - Customer 88 test successful (OWN STOCK workflow)!' AS status;
