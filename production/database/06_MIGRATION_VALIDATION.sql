-- =====================================
-- COMPREHENSIVE MIGRATION VALIDATION
-- Validates complete database deployment success
-- Version: 1.0
-- =====================================

-- =====================================
-- SECTION 1: SCHEMA VALIDATION
-- =====================================

DO $$
DECLARE
    validation_results JSONB := '{}'::jsonb;
    total_score INTEGER := 0;
    max_score INTEGER := 100;
    
    -- Counters
    expected_tables INTEGER := 23;  -- Total expected tables
    actual_tables INTEGER;
    expected_indexes INTEGER := 50; -- Approximate expected indexes
    actual_indexes INTEGER;
    expected_triggers INTEGER := 15; -- Expected triggers
    actual_triggers INTEGER;
    expected_functions INTEGER := 10; -- Expected functions
    actual_functions INTEGER;
    
    -- Reference data counts
    user_roles_count INTEGER;
    material_types_count INTEGER;
    order_statuses_count INTEGER;
    payment_methods_count INTEGER;
    production_stages_count INTEGER;
    admin_user_exists BOOLEAN := FALSE;
    
    -- Data quality checks
    negative_stock_count INTEGER := 0;
    orphaned_records_count INTEGER := 0;
    
    start_time TIMESTAMP := clock_timestamp();
    execution_time INTEGER;
    
BEGIN
    RAISE NOTICE '=== COMPREHENSIVE MIGRATION VALIDATION ===';
    RAISE NOTICE 'Started: %', start_time;
    RAISE NOTICE '';
    
    -- =====================================
    -- TABLE STRUCTURE VALIDATION
    -- =====================================
    RAISE NOTICE '--- TABLE STRUCTURE VALIDATION ---';
    
    SELECT COUNT(*) INTO actual_tables
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE';
    
    RAISE NOTICE 'Tables: %/% (% expected)', actual_tables, expected_tables, 
                CASE WHEN actual_tables >= expected_tables THEN '✅' ELSE '❌' END;
    
    -- Score: 20 points for table structure
    IF actual_tables >= expected_tables THEN
        total_score := total_score + 20;
    ELSE
        total_score := total_score + (actual_tables * 20 / expected_tables);
    END IF;
    
    validation_results := validation_results || jsonb_build_object(
        'tables', jsonb_build_object(
            'expected', expected_tables,
            'actual', actual_tables,
            'status', CASE WHEN actual_tables >= expected_tables THEN 'pass' ELSE 'fail' END
        )
    );
    
    -- =====================================
    -- CORE TABLES VALIDATION
    -- =====================================
    RAISE NOTICE '';
    RAISE NOTICE '--- CORE TABLES VALIDATION ---';
    
    -- Check critical tables exist
    DECLARE
        critical_tables TEXT[] := ARRAY[
            'customers', 'orders', 'order_items', 'material_stock', 
            'delivery_challans', 'challan_items', 'gst_invoices', 'payments',
            'material_in', 'material_out', 'users', 'user_roles'
        ];
        table_name TEXT;
        missing_tables TEXT[] := ARRAY[]::TEXT[];
    BEGIN
        FOREACH table_name IN ARRAY critical_tables
        LOOP
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = table_name
            ) THEN
                missing_tables := array_append(missing_tables, table_name);
                RAISE NOTICE '❌ %: MISSING (CRITICAL)', table_name;
            ELSE
                RAISE NOTICE '✅ %: EXISTS', table_name;
            END IF;
        END LOOP;
        
        -- Score: 25 points for core tables
        IF array_length(missing_tables, 1) IS NULL THEN
            total_score := total_score + 25;
            RAISE NOTICE 'All critical tables exist ✅';
        ELSE
            total_score := total_score + ((array_length(critical_tables, 1) - array_length(missing_tables, 1)) * 25 / array_length(critical_tables, 1));
            RAISE NOTICE 'Missing critical tables: %', array_to_string(missing_tables, ', ');
        END IF;
        
        validation_results := validation_results || jsonb_build_object(
            'core_tables', jsonb_build_object(
                'total', array_length(critical_tables, 1),
                'missing', COALESCE(array_length(missing_tables, 1), 0),
                'missing_list', CASE WHEN missing_tables IS NOT NULL THEN array_to_json(missing_tables) ELSE '[]'::json END
            )
        );
    END;
    
    -- =====================================
    -- INDEX VALIDATION
    -- =====================================
    RAISE NOTICE '';
    RAISE NOTICE '--- INDEX VALIDATION ---';
    
    SELECT COUNT(*) INTO actual_indexes
    FROM pg_indexes 
    WHERE schemaname = 'public';
    
    RAISE NOTICE 'Indexes: %/% (approximately)', actual_indexes, expected_indexes;
    
    -- Score: 15 points for indexes
    IF actual_indexes >= expected_indexes THEN
        total_score := total_score + 15;
    ELSE
        total_score := total_score + (actual_indexes * 15 / expected_indexes);
    END IF;
    
    validation_results := validation_results || jsonb_build_object(
        'indexes', jsonb_build_object(
            'expected_minimum', expected_indexes,
            'actual', actual_indexes,
            'status', CASE WHEN actual_indexes >= expected_indexes THEN 'pass' ELSE 'needs_attention' END
        )
    );
    
    -- =====================================
    -- TRIGGER VALIDATION
    -- =====================================
    RAISE NOTICE '';
    RAISE NOTICE '--- TRIGGER VALIDATION ---';
    
    SELECT COUNT(*) INTO actual_triggers
    FROM pg_trigger pt
    JOIN pg_class pc ON pt.tgrelid = pc.oid
    JOIN pg_namespace pn ON pc.relnamespace = pn.oid
    WHERE pn.nspname = 'public'
    AND NOT pt.tgisinternal;
    
    RAISE NOTICE 'Triggers: %/% (approximately)', actual_triggers, expected_triggers;
    
    -- Score: 10 points for triggers
    IF actual_triggers >= expected_triggers THEN
        total_score := total_score + 10;
    ELSE
        total_score := total_score + (actual_triggers * 10 / expected_triggers);
    END IF;
    
    validation_results := validation_results || jsonb_build_object(
        'triggers', jsonb_build_object(
            'expected_minimum', expected_triggers,
            'actual', actual_triggers,
            'status', CASE WHEN actual_triggers >= expected_triggers THEN 'pass' ELSE 'partial' END
        )
    );
    
    -- =====================================
    -- FUNCTION VALIDATION
    -- =====================================
    RAISE NOTICE '';
    RAISE NOTICE '--- FUNCTION VALIDATION ---';
    
    SELECT COUNT(*) INTO actual_functions
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public';
    
    RAISE NOTICE 'Functions: %/% (approximately)', actual_functions, expected_functions;
    
    -- Score: 5 points for functions
    IF actual_functions >= expected_functions THEN
        total_score := total_score + 5;
    ELSE
        total_score := total_score + (actual_functions * 5 / expected_functions);
    END IF;
    
    validation_results := validation_results || jsonb_build_object(
        'functions', jsonb_build_object(
            'expected_minimum', expected_functions,
            'actual', actual_functions,
            'status', CASE WHEN actual_functions >= expected_functions THEN 'pass' ELSE 'partial' END
        )
    );
    
    -- =====================================
    -- REFERENCE DATA VALIDATION
    -- =====================================
    RAISE NOTICE '';
    RAISE NOTICE '--- REFERENCE DATA VALIDATION ---';
    
    -- Check reference data
    SELECT COUNT(*) INTO user_roles_count FROM user_roles;
    SELECT COUNT(*) INTO material_types_count FROM material_types;
    SELECT COUNT(*) INTO order_statuses_count FROM order_statuses;
    SELECT COUNT(*) INTO payment_methods_count FROM payment_methods;
    SELECT COUNT(*) INTO production_stages_count FROM production_stages;
    
    RAISE NOTICE 'User Roles: % %', user_roles_count, CASE WHEN user_roles_count >= 3 THEN '✅' ELSE '⚠️' END;
    RAISE NOTICE 'Material Types: % %', material_types_count, CASE WHEN material_types_count >= 5 THEN '✅' ELSE '⚠️' END;
    RAISE NOTICE 'Order Statuses: % %', order_statuses_count, CASE WHEN order_statuses_count >= 5 THEN '✅' ELSE '⚠️' END;
    RAISE NOTICE 'Payment Methods: % %', payment_methods_count, CASE WHEN payment_methods_count >= 3 THEN '✅' ELSE '⚠️' END;
    RAISE NOTICE 'Production Stages: % %', production_stages_count, CASE WHEN production_stages_count >= 3 THEN '✅' ELSE '⚠️' END;
    
    -- Check admin user exists
    SELECT EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.role = ur.id 
        WHERE ur.name = 'admin'
    ) INTO admin_user_exists;
    
    RAISE NOTICE 'Admin User: %', CASE WHEN admin_user_exists THEN 'EXISTS ✅' ELSE 'MISSING ❌' END;
    
    -- Score: 15 points for reference data
    DECLARE
        ref_data_score INTEGER := 0;
    BEGIN
        IF user_roles_count >= 3 THEN ref_data_score := ref_data_score + 3; END IF;
        IF material_types_count >= 5 THEN ref_data_score := ref_data_score + 3; END IF;
        IF order_statuses_count >= 5 THEN ref_data_score := ref_data_score + 3; END IF;
        IF payment_methods_count >= 3 THEN ref_data_score := ref_data_score + 3; END IF;
        IF production_stages_count >= 3 THEN ref_data_score := ref_data_score + 3; END IF;
        
        total_score := total_score + ref_data_score;
        
        validation_results := validation_results || jsonb_build_object(
            'reference_data', jsonb_build_object(
                'user_roles', user_roles_count,
                'material_types', material_types_count,
                'order_statuses', order_statuses_count,
                'payment_methods', payment_methods_count,
                'production_stages', production_stages_count,
                'admin_user_exists', admin_user_exists,
                'score', ref_data_score
            )
        );
    END;
    
    -- =====================================
    -- DATA QUALITY VALIDATION
    -- =====================================
    RAISE NOTICE '';
    RAISE NOTICE '--- DATA QUALITY VALIDATION ---';
    
    -- Check for negative stock (if material_stock exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_stock') THEN
        SELECT COUNT(*) INTO negative_stock_count
        FROM material_stock 
        WHERE current_stock < 0;
        
        RAISE NOTICE 'Negative Stock Records: % %', negative_stock_count, 
                    CASE WHEN negative_stock_count = 0 THEN '✅' ELSE '❌ CRITICAL' END;
    END IF;
    
    -- Check for orphaned records (basic check)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items') 
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
        SELECT COUNT(*) INTO orphaned_records_count
        FROM order_items oi
        LEFT JOIN orders o ON oi.order_id = o.id
        WHERE o.id IS NULL;
        
        RAISE NOTICE 'Orphaned Order Items: % %', orphaned_records_count,
                    CASE WHEN orphaned_records_count = 0 THEN '✅' ELSE '⚠️' END;
    END IF;
    
    -- Score: 10 points for data quality
    DECLARE
        quality_score INTEGER := 0;
    BEGIN
        IF negative_stock_count = 0 THEN quality_score := quality_score + 5; END IF;
        IF orphaned_records_count = 0 THEN quality_score := quality_score + 5; END IF;
        
        total_score := total_score + quality_score;
        
        validation_results := validation_results || jsonb_build_object(
            'data_quality', jsonb_build_object(
                'negative_stock_count', negative_stock_count,
                'orphaned_records_count', orphaned_records_count,
                'score', quality_score
            )
        );
    END;
    
    -- =====================================
    -- DESIGN SYSTEM VALIDATION
    -- =====================================
    RAISE NOTICE '';
    RAISE NOTICE '--- DESIGN SYSTEM VALIDATION ---';
    
    DECLARE
        design_tables TEXT[] := ARRAY['design_submissions', 'design_status', 'material_design_mapping', 'design_printing_queue'];
        design_table_count INTEGER := 0;
        table_name TEXT;
    BEGIN
        FOREACH table_name IN ARRAY design_tables
        LOOP
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = table_name) THEN
                design_table_count := design_table_count + 1;
                RAISE NOTICE '✅ %: EXISTS', table_name;
            ELSE
                RAISE NOTICE '❌ %: MISSING', table_name;
            END IF;
        END LOOP;
        
        RAISE NOTICE 'Design System: %/4 tables %', design_table_count,
                    CASE WHEN design_table_count = 4 THEN '✅' ELSE '⚠️ PARTIAL' END;
        
        -- Score: 15 points for design system
        total_score := total_score + (design_table_count * 15 / 4);
        
        validation_results := validation_results || jsonb_build_object(
            'design_system', jsonb_build_object(
                'expected_tables', 4,
                'actual_tables', design_table_count,
                'completeness_percent', (design_table_count * 100 / 4)
            )
        );
    END;
    
    -- =====================================
    -- FINAL VALIDATION SUMMARY
    -- =====================================
    execution_time := EXTRACT(milliseconds FROM (clock_timestamp() - start_time))::INTEGER;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== VALIDATION SUMMARY ===';
    RAISE NOTICE 'Overall Score: %/% (%%)', total_score, max_score, (total_score * 100 / max_score);
    RAISE NOTICE 'Status: %', CASE 
        WHEN total_score >= 90 THEN 'EXCELLENT ✅'
        WHEN total_score >= 80 THEN 'GOOD ✅'
        WHEN total_score >= 70 THEN 'ACCEPTABLE ⚠️'
        ELSE 'NEEDS ATTENTION ❌'
    END;
    RAISE NOTICE 'Execution Time: %ms', execution_time;
    RAISE NOTICE '';
    
    -- =====================================
    -- LOG VALIDATION RESULTS
    -- =====================================
    
    -- Insert into deployment validation results
    INSERT INTO deployment_validation_results (
        overall_readiness_percentage,
        core_tables_status,
        critical_issues,
        system_metrics,
        validation_passed,
        next_deployment_steps
    ) VALUES (
        (total_score * 100 / max_score),
        validation_results,
        CASE WHEN negative_stock_count > 0 THEN 
            jsonb_build_array(jsonb_build_object('type', 'negative_stock', 'count', negative_stock_count))
        ELSE '[]'::jsonb END,
        jsonb_build_object(
            'total_tables', actual_tables,
            'total_indexes', actual_indexes,
            'total_triggers', actual_triggers,
            'total_functions', actual_functions,
            'execution_time_ms', execution_time,
            'validation_timestamp', NOW()
        ),
        (total_score >= 80),
        CASE 
            WHEN total_score >= 90 THEN ARRAY['Migration completed successfully']
            WHEN total_score >= 80 THEN ARRAY['Consider minor optimizations']
            ELSE ARRAY['Review missing components', 'Fix critical issues']
        END
    );
    
    -- Log deployment action
    PERFORM log_deployment_action(
        'validation',
        '06_MIGRATION_VALIDATION.sql',
        CASE WHEN total_score >= 80 THEN 'completed' ELSE 'completed_with_issues' END,
        'Comprehensive migration validation completed with score: ' || total_score || '/' || max_score,
        execution_time,
        NULL,
        validation_results
    );
    
    -- =====================================
    -- RECOMMENDATIONS
    -- =====================================
    RAISE NOTICE '=== RECOMMENDATIONS ===';
    
    IF total_score >= 90 THEN
        RAISE NOTICE '🎉 Migration completed successfully!';
        RAISE NOTICE '✅ Database is ready for production use';
        RAISE NOTICE '✅ All critical components are properly installed';
    ELSIF total_score >= 80 THEN
        RAISE NOTICE '✅ Migration mostly successful';
        RAISE NOTICE '⚠️  Consider reviewing partial components for optimization';
    ELSE
        RAISE NOTICE '❌ Migration needs attention';
        IF negative_stock_count > 0 THEN
            RAISE NOTICE '🔧 Fix negative stock calculations';
        END IF;
        IF actual_tables < expected_tables THEN
            RAISE NOTICE '🔧 Review missing tables';
        END IF;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Validation completed successfully! ✅';
    
END $$;

-- =====================================
-- DETAILED SYSTEM REPORTS
-- =====================================

-- Table summary with record counts
SELECT 
    'TABLE SUMMARY' as report_type,
    table_name,
    (xpath('/row/count/text()', query_to_xml(format('select count(*) from %I', table_name), false, true, '')))[1]::text::int as record_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
AND table_name NOT LIKE 'pg_%'
ORDER BY table_name;

-- Index summary by table
SELECT 
    'INDEX SUMMARY' as report_type,
    schemaname,
    tablename,
    COUNT(*) as index_count
FROM pg_indexes 
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Trigger summary by table
SELECT 
    'TRIGGER SUMMARY' as report_type,
    schemaname,
    tablename,
    COUNT(*) as trigger_count
FROM pg_triggers 
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Latest validation result
SELECT 
    'LATEST VALIDATION RESULT' as report_type,
    validation_date,
    overall_readiness_percentage || '%' as readiness_score,
    validation_passed,
    CASE 
        WHEN overall_readiness_percentage >= 90 THEN 'EXCELLENT ✅'
        WHEN overall_readiness_percentage >= 80 THEN 'GOOD ✅'  
        WHEN overall_readiness_percentage >= 70 THEN 'ACCEPTABLE ⚠️'
        ELSE 'NEEDS ATTENTION ❌'
    END as status,
    array_length(next_deployment_steps, 1) as pending_actions
FROM deployment_validation_results 
ORDER BY validation_date DESC 
LIMIT 1;

-- Log this deployment
INSERT INTO deployment_history (
    deployment_type,
    script_name,
    status,
    description
) VALUES (
    'validation',
    '06_MIGRATION_VALIDATION.sql',
    'completed',
    'Comprehensive migration validation completed'
);