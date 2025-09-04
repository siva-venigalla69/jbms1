-- COMPLETE SCHEMA ANALYSIS - Single Query Block
-- This will output all analysis to console in one execution

DO $$
DECLARE
    rec RECORD;
    col_exists BOOLEAN;
    trigger_count INTEGER;
    function_count INTEGER;
    row_count INTEGER;
BEGIN
    RAISE NOTICE '=== SCHEMA ANALYSIS REPORT ===';
    RAISE NOTICE '';
    
    -- 1. Check order_items table structure
    RAISE NOTICE '1. ORDER_ITEMS TABLE STRUCTURE:';
    FOR rec IN 
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'order_items' 
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '   Column: % | Type: % | Nullable: % | Default: %', 
            rec.column_name, rec.data_type, rec.is_nullable, COALESCE(rec.column_default, 'NULL');
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '2. COLUMN STATUS CHECK:';
    
    -- Check for new columns
    SELECT COUNT(*) > 0 INTO col_exists
    FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'design_status';
    RAISE NOTICE '   design_status: %', CASE WHEN col_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    
    SELECT COUNT(*) > 0 INTO col_exists
    FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'production_status';
    RAISE NOTICE '   production_status: %', CASE WHEN col_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    
    -- Check for old columns
    SELECT COUNT(*) > 0 INTO col_exists
    FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'design_ready';
    RAISE NOTICE '   design_ready: %', CASE WHEN col_exists THEN '⚠️ OLD COLUMN EXISTS' ELSE '✅ REMOVED' END;
    
    SELECT COUNT(*) > 0 INTO col_exists
    FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'design_received';
    RAISE NOTICE '   design_received: %', CASE WHEN col_exists THEN '⚠️ OLD COLUMN EXISTS' ELSE '✅ REMOVED' END;
    
    SELECT COUNT(*) > 0 INTO col_exists
    FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'current_stage';
    RAISE NOTICE '   current_stage: %', CASE WHEN col_exists THEN '⚠️ OLD COLUMN EXISTS' ELSE '✅ REMOVED' END;
    
    SELECT COUNT(*) > 0 INTO col_exists
    FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'production_stage';
    RAISE NOTICE '   production_stage: %', CASE WHEN col_exists THEN '⚠️ OLD COLUMN EXISTS' ELSE '✅ REMOVED' END;
    
    -- Check related columns
    SELECT COUNT(*) > 0 INTO col_exists
    FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'customization_details';
    RAISE NOTICE '   customization_details: %', CASE WHEN col_exists THEN '📋 EXISTS' ELSE '❌ MISSING' END;
    
    RAISE NOTICE '';
    RAISE NOTICE '3. TRIGGERS ON order_items:';
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers 
    WHERE event_object_table = 'order_items';
    RAISE NOTICE '   Total triggers: %', trigger_count;
    
    FOR rec IN 
        SELECT trigger_name, event_manipulation, action_timing
        FROM information_schema.triggers 
        WHERE event_object_table = 'order_items'
    LOOP
        RAISE NOTICE '   Trigger: % | Event: % | Timing: %', 
            rec.trigger_name, rec.event_manipulation, rec.action_timing;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '4. FUNCTIONS REFERENCING OLD COLUMNS:';
    SELECT COUNT(*) INTO function_count
    FROM pg_proc 
    WHERE prosrc LIKE '%production_stage%' 
       OR prosrc LIKE '%design_ready%'
       OR prosrc LIKE '%design_received%'
       OR prosrc LIKE '%current_stage%';
    RAISE NOTICE '   Functions with old column references: %', function_count;
    
    FOR rec IN 
        SELECT proname as function_name
        FROM pg_proc 
        WHERE prosrc LIKE '%production_stage%' 
           OR prosrc LIKE '%design_ready%'
           OR prosrc LIKE '%design_received%'
           OR prosrc LIKE '%current_stage%'
        LIMIT 10
    LOOP
        RAISE NOTICE '   Function: %', rec.function_name;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '5. DATA CHECK:';
    SELECT COUNT(*) INTO row_count FROM order_items;
    RAISE NOTICE '   Total order_items rows: %', row_count;
    
    -- Check if there's any data in customization_details (fallback column)
    IF col_exists THEN
        SELECT COUNT(*) INTO row_count 
        FROM order_items 
        WHERE customization_details IS NOT NULL AND customization_details != '';
        RAISE NOTICE '   Rows with customization_details: %', row_count;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== ANALYSIS COMPLETE ===';
    RAISE NOTICE 'Use this information to create the correct migration!';
    
END $$;