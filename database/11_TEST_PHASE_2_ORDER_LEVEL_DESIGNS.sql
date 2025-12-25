-- TEST: PHASE 2 - ORDER-LEVEL DESIGN TRACKING
-- Verifies that design tracking works independently per order (not pooled)
-- Digital Textile Printing System
-- Created: 2025-12-22
-- RERUNNABLE: Safe to execute multiple times (includes cleanup)

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST: Phase 2 - Order-Level Design Tracking';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- Cleanup any existing test data
DO $$
DECLARE
  v_existing_customer_id UUID;
BEGIN
  -- Find existing test customer by name or phone
  SELECT id INTO v_existing_customer_id
  FROM customers
  WHERE name = 'TEST_MULTI_ORDER_CUSTOMER' OR phone = '8888888888';

  IF v_existing_customer_id IS NOT NULL THEN
    DELETE FROM material_design_tracking WHERE customer_id = v_existing_customer_id;
    DELETE FROM material_stock WHERE customer_id = v_existing_customer_id;
    DELETE FROM material_in WHERE customer_id = v_existing_customer_id;
    DELETE FROM orders WHERE customer_id = v_existing_customer_id;
    DELETE FROM customers WHERE id = v_existing_customer_id;
    RAISE NOTICE 'Cleaned up existing test data';
  END IF;
END $$;

-- Test Script
DO $$
DECLARE
  v_customer_id UUID;
  v_order_1_id UUID;
  v_order_2_id UUID;
  v_order_1_designs_given INTEGER;
  v_order_1_designs_pending INTEGER;
  v_order_2_designs_given INTEGER;
  v_order_2_designs_pending INTEGER;
  v_tracking_count INTEGER;
BEGIN
  RAISE NOTICE 'Step 1: Create test customer';

  INSERT INTO customers (name, phone)
  VALUES ('TEST_MULTI_ORDER_CUSTOMER', '8888888888')
  RETURNING id INTO v_customer_id;

  RAISE NOTICE '  ✓ Customer created';
  RAISE NOTICE '';

  -- Order 1: 90 sarees
  RAISE NOTICE 'Step 2: Create Order 1 (90 sarees)';

  INSERT INTO orders (customer_id, order_number, total_quantity, ownership_type, status)
  VALUES (v_customer_id, 'TEST-ORD-001', 90, 'customer_material', 'active')
  RETURNING id INTO v_order_1_id;

  RAISE NOTICE '  ✓ Order 1 created: 90 sarees';
  RAISE NOTICE '';

  -- Receive material for Order 1 in 2 batches
  RAISE NOTICE 'Step 3: Receive material for Order 1 (50 + 40 sarees)';

  -- Batch A: 50 sarees
  INSERT INTO material_stock (
    customer_id, order_id, material_type, stage, quantity,
    ownership, is_active, batch_id, movement_type, moved_at
  )
  VALUES (
    v_customer_id, v_order_1_id, 'SAREE', 'received', 50,
    'customer', true, gen_random_uuid(), 'initial_receipt', NOW()
  );

  -- Batch B: 40 sarees (different batch)
  INSERT INTO material_stock (
    customer_id, order_id, material_type, stage, quantity,
    ownership, is_active, batch_id, movement_type, moved_at
  )
  VALUES (
    v_customer_id, v_order_1_id, 'SAREE', 'received', 40,
    'customer', true, gen_random_uuid(), 'initial_receipt', NOW()
  );

  RAISE NOTICE '  ✓ Material received: Batch A (50), Batch B (40)';
  RAISE NOTICE '';

  -- Add 30 designs to Order 1
  RAISE NOTICE 'Step 4: Add 30 designs to Order 1';

  PERFORM update_design_count(v_customer_id, v_order_1_id, 'SAREE', 30, 'Batch-Test-Order1');

  RAISE NOTICE '  ✓ 30 designs added to Order 1';
  RAISE NOTICE '';

  -- Order 2: 70 sarees
  RAISE NOTICE 'Step 5: Create Order 2 (70 sarees)';

  INSERT INTO orders (customer_id, order_number, total_quantity, ownership_type, status)
  VALUES (v_customer_id, 'TEST-ORD-002', 70, 'customer_material', 'active')
  RETURNING id INTO v_order_2_id;

  RAISE NOTICE '  ✓ Order 2 created: 70 sarees';
  RAISE NOTICE '';

  -- Receive material for Order 2
  RAISE NOTICE 'Step 6: Receive material for Order 2 (70 sarees)';

  -- Batch C: 70 sarees
  INSERT INTO material_stock (
    customer_id, order_id, material_type, stage, quantity,
    ownership, is_active, batch_id, movement_type, moved_at
  )
  VALUES (
    v_customer_id, v_order_2_id, 'SAREE', 'received', 70,
    'customer', true, gen_random_uuid(), 'initial_receipt', NOW()
  );

  RAISE NOTICE '  ✓ Material received: Batch C (70)';
  RAISE NOTICE '';

  -- Add 60 designs to Order 2
  RAISE NOTICE 'Step 7: Add 60 designs to Order 2';

  PERFORM update_design_count(v_customer_id, v_order_2_id, 'SAREE', 60, 'Batch-Test-Order2');

  RAISE NOTICE '  ✓ 60 designs added to Order 2';
  RAISE NOTICE '';

  -- Query and verify
  RAISE NOTICE 'Step 8: Query design tracking per order';
  RAISE NOTICE '';

  -- Get Order 1 designs
  SELECT designs_given, designs_pending
  INTO v_order_1_designs_given, v_order_1_designs_pending
  FROM material_design_tracking
  WHERE order_id = v_order_1_id AND material_type = 'SAREE';

  RAISE NOTICE '  Order 1: % designs given, % pending', v_order_1_designs_given, v_order_1_designs_pending;

  -- Get Order 2 designs
  SELECT designs_given, designs_pending
  INTO v_order_2_designs_given, v_order_2_designs_pending
  FROM material_design_tracking
  WHERE order_id = v_order_2_id AND material_type = 'SAREE';

  RAISE NOTICE '  Order 2: % designs given, % pending', v_order_2_designs_given, v_order_2_designs_pending;
  RAISE NOTICE '';

  -- Verify designs NOT pooled
  SELECT COUNT(*) INTO v_tracking_count
  FROM material_design_tracking
  WHERE customer_id = v_customer_id AND material_type = 'SAREE';

  RAISE NOTICE '  Total tracking records: % (should be 2, not 1)', v_tracking_count;
  RAISE NOTICE '';

  -- Assertions
  RAISE NOTICE 'Step 9: Verify results';

  -- Test 1: Order 1 has correct counts
  IF v_order_1_designs_given = 30 AND v_order_1_designs_pending = 60 THEN
    RAISE NOTICE '  ✓ Order 1: 30 given, 60 pending (CORRECT)';
  ELSE
    RAISE EXCEPTION 'TEST FAILED: Order 1 expected 30/60, got %/%',
      v_order_1_designs_given, v_order_1_designs_pending;
  END IF;

  -- Test 2: Order 2 has correct counts
  IF v_order_2_designs_given = 60 AND v_order_2_designs_pending = 10 THEN
    RAISE NOTICE '  ✓ Order 2: 60 given, 10 pending (CORRECT)';
  ELSE
    RAISE EXCEPTION 'TEST FAILED: Order 2 expected 60/10, got %/%',
      v_order_2_designs_given, v_order_2_designs_pending;
  END IF;

  -- Test 3: Designs are NOT pooled (2 separate records)
  IF v_tracking_count = 2 THEN
    RAISE NOTICE '  ✓ Designs tracked separately (2 records, NOT pooled)';
  ELSE
    RAISE EXCEPTION 'TEST FAILED: Expected 2 tracking records, found %', v_tracking_count;
  END IF;

  -- Test 4: v_pending_designs shows order_number
  IF EXISTS (
    SELECT 1 FROM v_pending_designs
    WHERE customer_id = v_customer_id AND order_number IN ('TEST-ORD-001', 'TEST-ORD-002')
  ) THEN
    RAISE NOTICE '  ✓ v_pending_designs shows order_number column';
  ELSE
    RAISE EXCEPTION 'TEST FAILED: v_pending_designs missing order_number';
  END IF;

  RAISE NOTICE '';

  -- Cleanup
  RAISE NOTICE 'Step 10: Cleanup test data';

  DELETE FROM material_design_tracking WHERE customer_id = v_customer_id;
  DELETE FROM material_stock WHERE customer_id = v_customer_id;
  DELETE FROM orders WHERE customer_id = v_customer_id;
  DELETE FROM customers WHERE id = v_customer_id;

  RAISE NOTICE '  ✓ Test data cleaned up';
  RAISE NOTICE '';

  -- Test summary
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PHASE 2 TEST: PASSED ✓';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Order-level design tracking works correctly';
  RAISE NOTICE 'Designs are independent per order (not pooled)';
  RAISE NOTICE '';

EXCEPTION
  WHEN OTHERS THEN
    -- Cleanup on failure
    DELETE FROM material_design_tracking WHERE customer_id = v_customer_id;
    DELETE FROM material_stock WHERE customer_id = v_customer_id;
    DELETE FROM orders WHERE customer_id = v_customer_id;
    DELETE FROM customers WHERE name = 'TEST_MULTI_ORDER_CUSTOMER';

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PHASE 2 TEST: FAILED ✗';
    RAISE NOTICE '========================================';
    RAISE EXCEPTION 'Test failed: %', SQLERRM;
END $$;
