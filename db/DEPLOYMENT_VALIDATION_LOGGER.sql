-- =====================================
-- DEPLOYMENT VALIDATION LOGGING SYSTEM
-- Comprehensive logging for deployment tracking
-- =====================================

-- Create deployment logging tables
CREATE TABLE IF NOT EXISTS deployment_history (
    id SERIAL PRIMARY KEY,
    deployment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deployment_type VARCHAR(50), -- 'validation', 'migration', 'fix', 'enhancement'
    script_name VARCHAR(255),
    status VARCHAR(20), -- 'started', 'completed', 'failed', 'rolled_back'
    description TEXT,
    execution_time_ms INTEGER,
    error_message TEXT,
    created_by VARCHAR(100) DEFAULT 'system',
    metadata JSONB
);

CREATE TABLE IF NOT EXISTS deployment_validation_results (
    id SERIAL PRIMARY KEY,
    validation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    overall_readiness_percentage INTEGER,
    core_tables_status JSONB,
    critical_issues JSONB,
    recommendations JSONB,
    system_metrics JSONB,
    validation_passed BOOLEAN,
    next_deployment_steps TEXT[]
);

CREATE TABLE IF NOT EXISTS deployment_issues (
    id SERIAL PRIMARY KEY,
    issue_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    issue_type VARCHAR(50), -- 'error', 'warning', 'info'
    issue_category VARCHAR(100), -- 'schema', 'data', 'performance', 'security'
    issue_title VARCHAR(255),
    issue_description TEXT,
    affected_tables TEXT[],
    resolution_status VARCHAR(20) DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'ignored'
    resolution_notes TEXT,
    resolved_date TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_deployment_history_date ON deployment_history(deployment_date);
CREATE INDEX IF NOT EXISTS idx_deployment_history_status ON deployment_history(status);
CREATE INDEX IF NOT EXISTS idx_deployment_validation_date ON deployment_validation_results(validation_date);
CREATE INDEX IF NOT EXISTS idx_deployment_issues_status ON deployment_issues(resolution_status);

-- Function to log deployment actions
CREATE OR REPLACE FUNCTION log_deployment_action(
    p_deployment_type VARCHAR(50),
    p_script_name VARCHAR(255),
    p_status VARCHAR(20),
    p_description TEXT DEFAULT NULL,
    p_execution_time_ms INTEGER DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    log_id INTEGER;
BEGIN
    INSERT INTO deployment_history (
        deployment_type,
        script_name,
        status,
        description,
        execution_time_ms,
        error_message,
        metadata
    )
    VALUES (
        p_deployment_type,
        p_script_name,
        p_status,
        p_description,
        p_execution_time_ms,
        p_error_message,
        p_metadata
    )
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log validation results
CREATE OR REPLACE FUNCTION log_validation_results(
    p_readiness_percentage INTEGER,
    p_core_tables JSONB,
    p_issues JSONB,
    p_recommendations JSONB,
    p_metrics JSONB,
    p_validation_passed BOOLEAN,
    p_next_steps TEXT[]
)
RETURNS INTEGER AS $$
DECLARE
    result_id INTEGER;
BEGIN
    INSERT INTO deployment_validation_results (
        overall_readiness_percentage,
        core_tables_status,
        critical_issues,
        recommendations,
        system_metrics,
        validation_passed,
        next_deployment_steps
    )
    VALUES (
        p_readiness_percentage,
        p_core_tables,
        p_issues,
        p_recommendations,
        p_metrics,
        p_validation_passed,
        p_next_steps
    )
    RETURNING id INTO result_id;
    
    RETURN result_id;
END;
$$ LANGUAGE plpgsql;

-- Function to track deployment issues
CREATE OR REPLACE FUNCTION log_deployment_issue(
    p_issue_type VARCHAR(50),
    p_category VARCHAR(100),
    p_title VARCHAR(255),
    p_description TEXT,
    p_affected_tables TEXT[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    issue_id INTEGER;
BEGIN
    INSERT INTO deployment_issues (
        issue_type,
        issue_category,
        issue_title,
        issue_description,
        affected_tables
    )
    VALUES (
        p_issue_type,
        p_category,
        p_title,
        p_description,
        p_affected_tables
    )
    RETURNING id INTO issue_id;
    
    RETURN issue_id;
END;
$$ LANGUAGE plpgsql;

-- Comprehensive deployment validation with logging
DO $$
DECLARE
    start_time TIMESTAMP := clock_timestamp();
    validation_log TEXT := '';
    readiness_score INTEGER := 0;
    core_tables_info JSONB := '{}';
    critical_issues_info JSONB := '[]';
    recommendations_info JSONB := '[]';
    system_metrics_info JSONB := '{}';
    next_steps_array TEXT[] := ARRAY[]::TEXT[];
    validation_passed BOOLEAN := FALSE;
    execution_time INTEGER;
    
    -- Counters
    total_tables INTEGER;
    core_tables_count INTEGER := 0;
    negative_stock_count INTEGER := 0;
    design_tables_count INTEGER := 0;
    
    log_id INTEGER;
BEGIN
    -- Log start of validation
    SELECT log_deployment_action(
        'validation',
        'DEPLOYMENT_VALIDATION_LOGGER.sql',
        'started',
        'Comprehensive deployment validation started'
    ) INTO log_id;
    
    validation_log := '=== COMPREHENSIVE DEPLOYMENT VALIDATION ===' || E'\n';
    validation_log := validation_log || 'Started: ' || start_time::TEXT || E'\n\n';
    
    -- 1. CORE TABLES VALIDATION
    validation_log := validation_log || '--- CORE TABLES VALIDATION ---' || E'\n';
    
    -- Check each core table and build JSON status
    core_tables_info := jsonb_build_object();
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers') THEN
        SELECT COUNT(*) FROM customers INTO total_tables;
        core_tables_info := core_tables_info || jsonb_build_object('customers', jsonb_build_object('exists', true, 'count', total_tables));
        core_tables_count := core_tables_count + 1;
        validation_log := validation_log || '✅ customers: ' || total_tables || ' records' || E'\n';
    ELSE
        core_tables_info := core_tables_info || jsonb_build_object('customers', jsonb_build_object('exists', false, 'count', 0));
        validation_log := validation_log || '❌ customers: MISSING' || E'\n';
        -- Log critical issue
        PERFORM log_deployment_issue('error', 'schema', 'Missing customers table', 'Core customers table does not exist', ARRAY['customers']);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'material_stock') THEN
        SELECT COUNT(*) FROM material_stock INTO total_tables;
        SELECT COUNT(*) FROM material_stock WHERE current_stock < 0 INTO negative_stock_count;
        core_tables_info := core_tables_info || jsonb_build_object('material_stock', jsonb_build_object('exists', true, 'count', total_tables, 'negative_stock', negative_stock_count));
        core_tables_count := core_tables_count + 1;
        validation_log := validation_log || '✅ material_stock: ' || total_tables || ' records';
        IF negative_stock_count > 0 THEN
            validation_log := validation_log || ' (⚠️ ' || negative_stock_count || ' negative)';
            -- Log critical issue
            PERFORM log_deployment_issue('error', 'data', 'Negative stock values detected', negative_stock_count || ' customers have negative stock values', ARRAY['material_stock']);
            critical_issues_info := critical_issues_info || jsonb_build_array(jsonb_build_object(
                'type', 'negative_stock',
                'severity', 'critical',
                'count', negative_stock_count,
                'action', 'Run URGENT_01_STOCK_FIX_CORRECTED.sql'
            ));
        END IF;
        validation_log := validation_log || E'\n';
    ELSE
        core_tables_info := core_tables_info || jsonb_build_object('material_stock', jsonb_build_object('exists', false, 'count', 0));
        validation_log := validation_log || '❌ material_stock: MISSING (CRITICAL)' || E'\n';
        -- Log critical issue
        PERFORM log_deployment_issue('error', 'schema', 'Missing material_stock table', 'Critical material_stock table does not exist', ARRAY['material_stock']);
        critical_issues_info := critical_issues_info || jsonb_build_array(jsonb_build_object(
            'type', 'missing_table',
            'severity', 'critical',
            'table', 'material_stock',
            'action', 'Create material_stock table'
        ));
    END IF;
    
    -- Continue with other core tables...
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
        SELECT COUNT(*) FROM orders INTO total_tables;
        core_tables_info := core_tables_info || jsonb_build_object('orders', jsonb_build_object('exists', true, 'count', total_tables));
        core_tables_count := core_tables_count + 1;
        validation_log := validation_log || '✅ orders: ' || total_tables || ' records' || E'\n';
    END IF;
    
    -- 2. DESIGN SYSTEM VALIDATION
    validation_log := validation_log || E'\n--- DESIGN SYSTEM VALIDATION ---' || E'\n';
    
    SELECT COUNT(*) INTO design_tables_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('design_submissions', 'design_status', 'material_design_mapping', 'design_printing_queue');
    
    validation_log := validation_log || 'Design tables: ' || design_tables_count || '/4' || E'\n';
    
    IF design_tables_count = 0 THEN
        recommendations_info := recommendations_info || jsonb_build_array(jsonb_build_object(
            'priority', 'high',
            'action', 'Deploy design management system',
            'script', 'MIGRATION_03_DESIGN_MANAGEMENT_SCHEMA.sql'
        ));
        next_steps_array := array_append(next_steps_array, 'Deploy design management system');
    END IF;
    
    -- 3. CALCULATE READINESS SCORE
    readiness_score := (core_tables_count * 20) + 
                      CASE WHEN negative_stock_count = 0 AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_stock') THEN 20 ELSE 0 END +
                      (design_tables_count * 5);
    
    validation_passed := (readiness_score >= 70 AND negative_stock_count = 0);
    
    -- 4. BUILD SYSTEM METRICS
    system_metrics_info := jsonb_build_object(
        'total_tables', (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'),
        'core_tables_ready', core_tables_count,
        'design_system_progress', design_tables_count,
        'data_quality_issues', negative_stock_count,
        'validation_timestamp', NOW()
    );
    
    -- 5. BUILD RECOMMENDATIONS
    IF negative_stock_count > 0 THEN
        next_steps_array := array_prepend('Fix negative stock calculations', next_steps_array);
    END IF;
    
    IF design_tables_count = 0 THEN
        next_steps_array := array_append(next_steps_array, 'Deploy design management system');
    END IF;
    
    next_steps_array := array_append(next_steps_array, 'Deploy API compatibility updates');
    next_steps_array := array_append(next_steps_array, 'Run final deployment verification');
    
    -- 6. FINAL VALIDATION LOG
    validation_log := validation_log || E'\n--- VALIDATION SUMMARY ---' || E'\n';
    validation_log := validation_log || 'Overall Readiness: ' || readiness_score || '%' || E'\n';
    validation_log := validation_log || 'Validation Status: ' || CASE WHEN validation_passed THEN 'PASSED ✅' ELSE 'FAILED ❌' END || E'\n';
    validation_log := validation_log || 'Critical Issues: ' || jsonb_array_length(critical_issues_info) || E'\n';
    validation_log := validation_log || 'Next Steps: ' || array_length(next_steps_array, 1) || ' actions required' || E'\n';
    
    -- Calculate execution time
    execution_time := EXTRACT(milliseconds FROM (clock_timestamp() - start_time))::INTEGER;
    validation_log := validation_log || 'Execution Time: ' || execution_time || 'ms' || E'\n';
    
    -- 7. LOG RESULTS TO DATABASE
    PERFORM log_validation_results(
        readiness_score,
        core_tables_info,
        critical_issues_info,
        recommendations_info,
        system_metrics_info,
        validation_passed,
        next_steps_array
    );
    
    -- Log completion
    PERFORM log_deployment_action(
        'validation',
        'DEPLOYMENT_VALIDATION_LOGGER.sql',
        CASE WHEN validation_passed THEN 'completed' ELSE 'completed_with_issues' END,
        'Comprehensive deployment validation completed',
        execution_time,
        NULL,
        jsonb_build_object('readiness_score', readiness_score, 'issues_found', jsonb_array_length(critical_issues_info))
    );
    
    -- Output validation log
    RAISE NOTICE '%', validation_log;
    
    RAISE NOTICE 'Validation results logged to deployment_validation_results table (ID: %)', 
                 (SELECT id FROM deployment_validation_results ORDER BY validation_date DESC LIMIT 1);

END $$;

-- Query deployment validation summary
SELECT 
    'DEPLOYMENT VALIDATION SUMMARY' as report_type,
    validation_date,
    overall_readiness_percentage || '%' as readiness,
    validation_passed,
    array_length(next_deployment_steps, 1) as pending_actions,
    (critical_issues->0->>'type') as primary_issue
FROM deployment_validation_results 
ORDER BY validation_date DESC 
LIMIT 1;

-- Query recent deployment history
SELECT 
    'RECENT DEPLOYMENT ACTIONS' as report_type,
    deployment_date,
    deployment_type,
    script_name,
    status,
    description
FROM deployment_history 
ORDER BY deployment_date DESC 
LIMIT 5;

-- Query open issues
SELECT 
    'OPEN DEPLOYMENT ISSUES' as report_type,
    issue_type,
    issue_category,
    issue_title,
    affected_tables
FROM deployment_issues 
WHERE resolution_status = 'open'
ORDER BY issue_date DESC;