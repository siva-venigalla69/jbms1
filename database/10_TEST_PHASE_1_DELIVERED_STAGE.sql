-- TEST: PHASE 1 - DELIVERED STAGE CONSTRAINT
-- Verifies that 'delivered' stage works in move_stock_to_stage function
-- Digital Textile Printing System
-- Created: 2025-12-22
-- RERUNNABLE: Safe to execute multiple times (includes cleanup)

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST: Phase 1 - Delivered Stage';
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
  WHERE name = 'TEST_DELIVERED_STAGE' OR phone = '9999999999';

  IF v_existing_customer_id IS NOT NULL THEN
    DELETE FROM material_stock WHERE customer_id = v_existing_customer_id;
    DELETE FROM orders WHERE customer_id = v_existing_customer_id;
    DELETE FROM customers WHERE id = v_existing_customer_id;
    RAISE NOTICE 'Cleaned up existing test data';
  END IF;
END $$;

-- Test Script
DO $$
DECLARE
  v_test_customer_id UUID;
  v_test_order_id UUID;
  v_stock_id UUID;
  v_delivered_count INTEGER;
BEGIN
  RAISE NOTICE 'Step 1: Create test customer and order';

  -- Create test customer
  INSERT INTO customers (name, phone)
  VALUES ('TEST_DELIVERED_STAGE', '9999999999')
  RETURNING id INTO v_test_customer_id;

  -- Create test order
  INSERT INTO orders (customer_id, order_number, total_quantity, ownership_type, status)
  VALUES (v_test_customer_id, 'TEST-DEL-001', 10, 'customer_material', 'active')
  RETURNING id INTO v_test_order_id;

  RAISE NOTICE '  ✓ Customer and order created';
  RAISE NOTICE '';

  -- Insert stock in completed stage
  RAISE NOTICE 'Step 2: Add stock in completed stage';

  INSERT INTO material_stock (
    customer_id, order_id, material_type, stage, quantity,
    ownership, is_active, batch_id, movement_type, moved_at
  )
  VALUES (
    v_test_customer_id, v_test_order_id, 'SAREE', 'completed', 10,
    'customer', true, gen_random_uuid(), 'initial_receipt', NOW()
  )
  RETURNING id INTO v_stock_id;

  RAISE NOTICE '  ✓ Stock added: 10 SAREES in completed stage';
  RAISE NOTICE '';

  -- Move to delivered stage
  RAISE NOTICE 'Step 3: Move stock from completed to delivered';

  BEGIN
    PERFORM move_stock_to_stage(
      v_test_customer_id, v_test_order_id, 'SAREE',
      'completed', 'delivered', 10, 'customer'
    );
    RAISE NOTICE '  ✓ Stock moved to delivered stage (no constraint error!)';
  EXCEPTION
    WHEN check_violation THEN
      RAISE EXCEPTION 'TEST FAILED: CHECK constraint violation when moving to delivered stage';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'TEST FAILED: Error moving stock: %', SQLERRM;
  END;

  RAISE NOTICE '';

  -- Verify stock in delivered stage
  RAISE NOTICE 'Step 4: Verify stock in delivered stage';

  SELECT COALESCE(SUM(quantity), 0) INTO v_delivered_count
  FROM material_stock
  WHERE customer_id = v_test_customer_id
    AND stage = 'delivered'
    AND is_active = true;

  IF v_delivered_count = 10 THEN
    RAISE NOTICE '  ✓ Verified: 10 units found in delivered stage';
  ELSE
    RAISE EXCEPTION 'TEST FAILED: Expected 10 units in delivered, found %', v_delivered_count;
  END IF;

  RAISE NOTICE '';

  -- Verify historical record preserved
  RAISE NOTICE 'Step 5: Verify historical record preserved';

  IF EXISTS (
    SELECT 1 FROM material_stock
    WHERE customer_id = v_test_customer_id
      AND stage = 'completed'
      AND is_active = false
  ) THEN
    RAISE NOTICE '  ✓ Historical record preserved (is_active=false)';
  ELSE
    RAISE EXCEPTION 'TEST FAILED: Historical record not found';
  END IF;

  RAISE NOTICE '';

  -- Cleanup
  RAISE NOTICE 'Step 6: Cleanup test data';

  DELETE FROM material_stock WHERE customer_id = v_test_customer_id;
  DELETE FROM orders WHERE id = v_test_order_id;
  DELETE FROM customers WHERE id = v_test_customer_id;

  RAISE NOTICE '  ✓ Test data cleaned up';
  RAISE NOTICE '';

  -- Test summary
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PHASE 1 TEST: PASSED ✓';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Delivered stage constraint works correctly';
  RAISE NOTICE '';

EXCEPTION
  WHEN OTHERS THEN
    -- Cleanup on failure
    DELETE FROM material_stock WHERE customer_id = v_test_customer_id;
    DELETE FROM orders WHERE customer_id = v_test_customer_id;
    DELETE FROM customers WHERE name = 'TEST_DELIVERED_STAGE';

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PHASE 1 TEST: FAILED ✗';
    RAISE NOTICE '========================================';
    RAISE EXCEPTION 'Test failed: %', SQLERRM;
END $$;
