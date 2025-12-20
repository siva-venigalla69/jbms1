-- ============================================================================
-- STEP 4: TEST SCHEMA (Optional but Recommended)
-- ============================================================================
-- CLEAN VERSION - Verifies everything was created correctly
-- Execute this to ensure all tables, functions, and views are working
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'STEP 4: TESTING SIMPLIFIED SCHEMA';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- TEST 1: Check Tables
-- ============================================================================

DO $$
DECLARE
  v_table_name TEXT;
  v_count INTEGER := 0;
  v_expected_tables TEXT[] := ARRAY[
    'customers', 'orders', 'material_in', 'material_stock',
    'returns', 'credit_notes', 'misprint_sales',
    'delivery_challans', 'challan_items',
    'gst_invoices', 'payments', 'invoice_challans', 'material_types'
  ];
BEGIN
  RAISE NOTICE 'TEST 1: Checking if all tables exist...';
  RAISE NOTICE '';

  FOREACH v_table_name IN ARRAY v_expected_tables
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = v_table_name AND table_schema = 'public') THEN
      v_count := v_count + 1;
      RAISE NOTICE '  [OK] Table exists: %', v_table_name;
    ELSE
      RAISE NOTICE '  [FAIL] Table missing: %', v_table_name;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '  Result: % / % tables exist', v_count, array_length(v_expected_tables, 1);

  IF v_count = array_length(v_expected_tables, 1) THEN
    RAISE NOTICE '  Status: PASS ✓';
  ELSE
    RAISE NOTICE '  Status: FAIL ✗';
  END IF;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- TEST 2: Check Functions
-- ============================================================================

DO $$
DECLARE
  v_function_name TEXT;
  v_count INTEGER := 0;
  v_expected_functions TEXT[] := ARRAY[
    'generate_order_number',
    'generate_receipt_number',
    'generate_challan_number',
    'generate_invoice_number',
    'generate_credit_note_number',
    'generate_misprint_sale_number',
    'move_stock_to_stage',
    'update_design_availability',
    'get_customer_stock_summary'
  ];
BEGIN
  RAISE NOTICE 'TEST 2: Checking if all functions exist...';
  RAISE NOTICE '';

  FOREACH v_function_name IN ARRAY v_expected_functions
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = v_function_name AND routine_schema = 'public') THEN
      v_count := v_count + 1;
      RAISE NOTICE '  [OK] Function exists: %', v_function_name;
    ELSE
      RAISE NOTICE '  [FAIL] Function missing: %', v_function_name;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '  Result: % / % functions exist', v_count, array_length(v_expected_functions, 1);

  IF v_count = array_length(v_expected_functions, 1) THEN
    RAISE NOTICE '  Status: PASS ✓';
  ELSE
    RAISE NOTICE '  Status: FAIL ✗';
  END IF;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- TEST 3: Check Views
-- ============================================================================

DO $$
DECLARE
  v_view_name TEXT;
  v_count INTEGER := 0;
  v_expected_views TEXT[] := ARRAY[
    'v_stock_by_customer',
    'v_outstanding_payments',
    'v_outstanding_orders',
    'v_misprint_stock'
  ];
BEGIN
  RAISE NOTICE 'TEST 3: Checking if all views exist...';
  RAISE NOTICE '';

  FOREACH v_view_name IN ARRAY v_expected_views
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = v_view_name AND table_schema = 'public') THEN
      v_count := v_count + 1;
      RAISE NOTICE '  [OK] View exists: %', v_view_name;
    ELSE
      RAISE NOTICE '  [FAIL] View missing: %', v_view_name;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '  Result: % / % views exist', v_count, array_length(v_expected_views, 1);

  IF v_count = array_length(v_expected_views, 1) THEN
    RAISE NOTICE '  Status: PASS ✓';
  ELSE
    RAISE NOTICE '  Status: FAIL ✗';
  END IF;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- TEST 4: Test Auto-Generated Numbers
-- ============================================================================

DO $$
DECLARE
  v_order_num TEXT;
  v_receipt_num TEXT;
  v_challan_num TEXT;
  v_invoice_num TEXT;
  v_credit_num TEXT;
  v_misprint_num TEXT;
BEGIN
  RAISE NOTICE 'TEST 4: Testing auto-generated numbers...';
  RAISE NOTICE '';

  SELECT generate_order_number() INTO v_order_num;
  RAISE NOTICE '  [OK] Order number: %', v_order_num;

  SELECT generate_receipt_number() INTO v_receipt_num;
  RAISE NOTICE '  [OK] Receipt number: %', v_receipt_num;

  SELECT generate_challan_number() INTO v_challan_num;
  RAISE NOTICE '  [OK] Challan number: %', v_challan_num;

  SELECT generate_invoice_number() INTO v_invoice_num;
  RAISE NOTICE '  [OK] Invoice number: %', v_invoice_num;

  SELECT generate_credit_note_number() INTO v_credit_num;
  RAISE NOTICE '  [OK] Credit note number: %', v_credit_num;

  SELECT generate_misprint_sale_number() INTO v_misprint_num;
  RAISE NOTICE '  [OK] Misprint sale number: %', v_misprint_num;

  RAISE NOTICE '';
  RAISE NOTICE '  Status: PASS ✓';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- TEST 5: Check Product Types
-- ============================================================================

DO $$
DECLARE
  v_count INTEGER;
  rec RECORD;
BEGIN
  RAISE NOTICE 'TEST 5: Checking product types...';
  RAISE NOTICE '';

  SELECT COUNT(*) INTO v_count FROM material_types WHERE is_active = TRUE;

  IF v_count >= 5 THEN
    RAISE NOTICE '  [OK] Product types loaded: % types', v_count;
    RAISE NOTICE '';

    FOR rec IN (SELECT type_code, type_name FROM material_types WHERE is_active = TRUE ORDER BY type_name)
    LOOP
      RAISE NOTICE '    - % (%)', rec.type_name, rec.type_code;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '  Status: PASS ✓';
  ELSE
    RAISE NOTICE '  [FAIL] Product types not loaded properly (found: %)', v_count;
    RAISE NOTICE '  Status: FAIL ✗';
  END IF;

  RAISE NOTICE '';
END $$;

-- ============================================================================
-- TEST 6: Check Unique Constraints
-- ============================================================================

DO $$
DECLARE
  v_constraints_ok INTEGER := 0;
BEGIN
  RAISE NOTICE 'TEST 6: Checking unique constraints...';
  RAISE NOTICE '';

  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'orders_order_number_key') THEN
    v_constraints_ok := v_constraints_ok + 1;
    RAISE NOTICE '  [OK] orders.order_number is unique';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'material_in_receipt_number_key') THEN
    v_constraints_ok := v_constraints_ok + 1;
    RAISE NOTICE '  [OK] material_in.receipt_number is unique';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'delivery_challans_challan_number_key') THEN
    v_constraints_ok := v_constraints_ok + 1;
    RAISE NOTICE '  [OK] delivery_challans.challan_number is unique';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'gst_invoices_invoice_number_key') THEN
    v_constraints_ok := v_constraints_ok + 1;
    RAISE NOTICE '  [OK] gst_invoices.invoice_number is unique';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '  Result: % / 4 unique constraints exist', v_constraints_ok;

  IF v_constraints_ok = 4 THEN
    RAISE NOTICE '  Status: PASS ✓';
  ELSE
    RAISE NOTICE '  Status: FAIL ✗';
  END IF;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'STEP 4 COMPLETE - SCHEMA TESTING DONE!';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'If all tests passed, your schema is ready to use!';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Schema is ready ✓';
  RAISE NOTICE '  2. Start using the simplified API in frontend';
  RAISE NOTICE '  3. Create the 9 frontend pages';
  RAISE NOTICE '  4. Test the complete workflow';
  RAISE NOTICE '  5. Deploy to production';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
END $$;
