-- =====================================
-- MIGRATION COMPATIBILITY TEST
-- Run this to verify all migrations are compatible
-- =====================================

DO $$
DECLARE
    test_result TEXT := '';
    compatibility_score INTEGER := 0;
    total_tests INTEGER := 10;
BEGIN
    
    -- Test 1: Check if design_submissions table exists (should exist after migration 01)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'design_submissions') THEN
        test_result := test_result || '✅ design_submissions table exists' || E'\n';
        compatibility_score := compatibility_score + 1;
    ELSE
        test_result := test_result || '❌ design_submissions table missing' || E'\n';
    END IF;
    
    -- Test 2: Check if enhanced design_submissions columns exist (should exist after migration 08)  
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'design_submissions' AND column_name = 'design_code') THEN
        test_result := test_result || '✅ Enhanced design_submissions columns exist' || E'\n';
        compatibility_score := compatibility_score + 1;
    ELSE
        test_result := test_result || '❌ Enhanced design_submissions columns missing' || E'\n';
    END IF;
    
    -- Test 3: Check if order_items enhancements exist (should exist after migration 09)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'linked_design_id') THEN
        test_result := test_result || '✅ Order items design integration exists' || E'\n';
        compatibility_score := compatibility_score + 1;
    ELSE
        test_result := test_result || '❌ Order items design integration missing' || E'\n';
    END IF;
    
    -- Test 4: Check if production_schedule table exists (should exist after migration 08)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'production_schedule') THEN
        test_result := test_result || '✅ Production scheduling system exists' || E'\n';
        compatibility_score := compatibility_score + 1;
    ELSE
        test_result := test_result || '❌ Production scheduling system missing' || E'\n';
    END IF;
    
    -- Test 5: Check if invoice_line_items table exists (should exist after migration 10)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_line_items') THEN
        test_result := test_result || '✅ Enhanced invoice system exists' || E'\n';
        compatibility_score := compatibility_score + 1;
    ELSE
        test_result := test_result || '❌ Enhanced invoice system missing' || E'\n';
    END IF;
    
    -- Test 6: Check foreign key relationships are valid
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'order_items' AND tc.constraint_type = 'FOREIGN KEY' 
        AND ccu.column_name = 'linked_design_id' AND ccu.table_name = 'design_submissions'
    ) THEN
        test_result := test_result || '✅ Foreign key relationships are valid' || E'\n';
        compatibility_score := compatibility_score + 1;
    ELSE
        test_result := test_result || '❌ Foreign key relationships have issues' || E'\n';
    END IF;
    
    -- Test 7: Check if design_material_requirements table exists  
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'design_material_requirements') THEN
        test_result := test_result || '✅ Material-design correlation system exists' || E'\n';
        compatibility_score := compatibility_score + 1;
    ELSE
        test_result := test_result || '❌ Material-design correlation system missing' || E'\n';
    END IF;
    
    -- Test 8: Check if existing tables weren't broken
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_stock') THEN
        test_result := test_result || '✅ Core business tables intact' || E'\n';
        compatibility_score := compatibility_score + 1;
    ELSE
        test_result := test_result || '❌ Core business tables have issues' || E'\n';
    END IF;
    
    -- Test 9: Check if views exist and are functional
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'design_workload_summary') THEN
        test_result := test_result || '✅ Business intelligence views exist' || E'\n';
        compatibility_score := compatibility_score + 1;
    ELSE
        test_result := test_result || '❌ Business intelligence views missing' || E'\n';
    END IF;
    
    -- Test 10: Check if functions exist
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'can_schedule_design') THEN
        test_result := test_result || '✅ Business logic functions exist' || E'\n';
        compatibility_score := compatibility_score + 1;
    ELSE
        test_result := test_result || '❌ Business logic functions missing' || E'\n';
    END IF;
    
    -- Generate final report
    RAISE NOTICE '=====================================';
    RAISE NOTICE 'MIGRATION COMPATIBILITY TEST RESULTS';
    RAISE NOTICE '=====================================';
    RAISE NOTICE '%', test_result;
    RAISE NOTICE '=====================================';
    RAISE NOTICE 'COMPATIBILITY SCORE: %/% (%%%)', compatibility_score, total_tests, 
                 ROUND((compatibility_score::DECIMAL / total_tests::DECIMAL) * 100, 1);
    
    IF compatibility_score >= 8 THEN
        RAISE NOTICE '✅ RESULT: Migrations are COMPATIBLE and ready for deployment';
    ELSIF compatibility_score >= 6 THEN
        RAISE NOTICE '⚠️  RESULT: Migrations have minor compatibility issues';  
    ELSE
        RAISE NOTICE '❌ RESULT: Migrations have MAJOR compatibility issues - DO NOT DEPLOY';
    END IF;
    
    RAISE NOTICE '=====================================';
    
END $$;