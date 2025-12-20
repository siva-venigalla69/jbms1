-- =====================================================================
-- PRODUCTION WORKFLOW FIX
-- =====================================================================
-- Migration: 20251210120000_production_workflow_fix.sql
-- Date: 2025-12-10 12:00:00
-- Purpose: Fix production workflow to allow pre-treatment without design
--
-- BUSINESS REQUIREMENT:
-- - Pre-treatment (padding) can start WITHOUT design being ready
-- - Printing requires BOTH pre-treatment completed AND design ready
-- - Post-processing requires printing completion
-- - Completed requires post-processing completion
--
-- CHANGES:
-- 1. Update validate_design_production_status() function
-- 2. Update update_production_status() RPC function
-- 3. Add new helper views for combined status tracking
-- 4. Add status summary functions
-- =====================================================================

-- =====================================================================
-- PART 1: Drop Existing Validation Function
-- =====================================================================

DROP TRIGGER IF EXISTS tr_validate_design_production_status ON order_items;
DROP FUNCTION IF EXISTS validate_design_production_status() CASCADE;

-- =====================================================================
-- PART 2: Create NEW Validation Function with Updated Logic
-- =====================================================================

CREATE OR REPLACE FUNCTION validate_design_production_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the status change for debugging
    RAISE NOTICE 'Production status validation: design_status=%, production_status=%',
        NEW.design_status, NEW.production_status;

    -- =========================================
    -- RULE 1: Validate design_status values
    -- =========================================
    IF NEW.design_status NOT IN ('pending_from_customer', 'design_received_from_customer', 'design_ready') THEN
        RAISE EXCEPTION 'Invalid design_status: %. Must be one of: pending_from_customer, design_received_from_customer, design_ready',
            NEW.design_status;
    END IF;

    -- =========================================
    -- RULE 2: Validate production_status values
    -- =========================================
    IF NEW.production_status NOT IN ('pending', 'pre_treatment', 'printing', 'post_process', 'completed') THEN
        RAISE EXCEPTION 'Invalid production_status: %. Must be one of: pending, pre_treatment, printing, post_process, completed',
            NEW.production_status;
    END IF;

    -- =========================================
    -- RULE 3: Pre-treatment can START ANYTIME
    -- =========================================
    -- NO DESIGN REQUIREMENT for pre-treatment!
    IF NEW.production_status = 'pre_treatment' THEN
        RAISE NOTICE 'Pre-treatment allowed without design check';
        RETURN NEW;
    END IF;

    -- =========================================
    -- RULE 4: Printing requires BOTH conditions
    -- =========================================
    IF NEW.production_status = 'printing' THEN
        -- Check 1: Design must be ready
        IF NEW.design_status != 'design_ready' THEN
            RAISE EXCEPTION 'BLOCKED: Cannot start printing without design approval.
Design Status: % (Required: design_ready)
Action: Approve the design first, then start printing.',
                NEW.design_status;
        END IF;

        -- Check 2: Must have completed pre-treatment first
        IF TG_OP = 'UPDATE' AND OLD.production_status NOT IN ('pre_treatment', 'printing') THEN
            RAISE EXCEPTION 'BLOCKED: Cannot start printing without completing pre-treatment first.
Current Status: % (Required: pre_treatment)
Action: Complete pre-treatment/padding before starting printing.',
                OLD.production_status;
        END IF;

        RAISE NOTICE 'Printing allowed: Both design ready AND pre-treatment completed';
        RETURN NEW;
    END IF;

    -- =========================================
    -- RULE 5: Post-processing requires printing
    -- =========================================
    IF NEW.production_status = 'post_process' THEN
        IF TG_OP = 'UPDATE' AND OLD.production_status NOT IN ('printing', 'post_process') THEN
            RAISE EXCEPTION 'BLOCKED: Cannot start post-processing without completing printing first.
Current Status: % (Required: printing)
Action: Complete printing before starting post-processing.',
                OLD.production_status;
        END IF;
    END IF;

    -- =========================================
    -- RULE 6: Completed requires post-processing
    -- =========================================
    IF NEW.production_status = 'completed' THEN
        IF TG_OP = 'UPDATE' AND OLD.production_status NOT IN ('post_process', 'completed') THEN
            RAISE EXCEPTION 'BLOCKED: Cannot mark as completed without finishing post-processing first.
Current Status: % (Required: post_process)
Action: Complete post-processing before marking as completed.',
                OLD.production_status;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger with new function
CREATE TRIGGER tr_validate_design_production_status
    BEFORE INSERT OR UPDATE OF design_status, production_status ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION validate_design_production_status();

COMMENT ON FUNCTION validate_design_production_status() IS
'Production workflow validation with independent pre-treatment:
- Pre-treatment: Can start anytime (no design requirement)
- Printing: Requires BOTH design_ready AND pre_treatment completed
- Post-processing: Requires printing completed
- Completed: Requires post_process completed';

-- =====================================================================
-- PART 3: Update RPC Function for Production Status Updates
-- =====================================================================

DROP FUNCTION IF EXISTS update_production_status(UUID, TEXT, TEXT, BOOLEAN, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION update_production_status(
    p_order_item_id UUID,
    p_production_status TEXT,
    p_production_notes TEXT DEFAULT NULL,
    p_quality_check_passed BOOLEAN DEFAULT NULL,
    p_completed_by TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    result_item order_items%ROWTYPE;
    current_design_status TEXT;
    current_production_status TEXT;
    can_progress BOOLEAN := true;
    blocking_reason TEXT := NULL;
BEGIN
    -- Get current status
    SELECT design_status, production_status
    INTO current_design_status, current_production_status
    FROM order_items
    WHERE id = p_order_item_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order item not found: %', p_order_item_id;
    END IF;

    -- Validate production status value
    IF p_production_status NOT IN ('pending', 'pre_treatment', 'printing', 'post_process', 'completed') THEN
        RAISE EXCEPTION 'Invalid production_status: %. Must be one of: pending, pre_treatment, printing, post_process, completed',
            p_production_status;
    END IF;

    -- Check if can progress to requested status
    IF p_production_status = 'printing' THEN
        -- Check design ready
        IF current_design_status != 'design_ready' THEN
            blocking_reason := format('Design not ready (current: %s). Approve design first.', current_design_status);
            can_progress := false;
        END IF;

        -- Check pre-treatment completed
        IF current_production_status NOT IN ('pre_treatment', 'printing') THEN
            blocking_reason := format('Pre-treatment not completed (current: %s). Complete padding first.', current_production_status);
            can_progress := false;
        END IF;

        IF NOT can_progress THEN
            RAISE EXCEPTION 'Cannot move to printing: %', blocking_reason;
        END IF;
    END IF;

    -- Update timestamps based on status
    UPDATE order_items
    SET
        production_status = p_production_status,
        production_notes = COALESCE(p_production_notes, production_notes),
        pre_treatment_completed_at = CASE
            WHEN p_production_status = 'printing' AND current_production_status = 'pre_treatment'
            THEN COALESCE(pre_treatment_completed_at, NOW())
            ELSE pre_treatment_completed_at
        END,
        printing_completed_at = CASE
            WHEN p_production_status = 'post_process' AND current_production_status = 'printing'
            THEN COALESCE(printing_completed_at, NOW())
            ELSE printing_completed_at
        END,
        post_process_completed_at = CASE
            WHEN p_production_status = 'completed' AND current_production_status = 'post_process'
            THEN COALESCE(post_process_completed_at, NOW())
            ELSE post_process_completed_at
        END,
        updated_at = NOW()
    WHERE id = p_order_item_id
    RETURNING * INTO result_item;

    RETURN to_jsonb(result_item);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_production_status(UUID, TEXT, TEXT, BOOLEAN, TEXT) IS
'Update production status with workflow validation and automatic timestamp tracking';

-- =====================================================================
-- PART 4: Create Helper View for Combined Status
-- =====================================================================

DROP VIEW IF EXISTS order_items_combined_status CASCADE;

CREATE OR REPLACE VIEW order_items_combined_status AS
SELECT
    oi.id,
    oi.order_id,
    o.order_number,
    o.customer_id,
    c.name as customer_name,
    c.phone as customer_phone,
    oi.material_type,
    oi.quantity,
    oi.unit_price,
    oi.design_status,
    oi.production_status,
    oi.design_file_url,
    oi.design_notes,

    -- Combined status label for UI
    CASE
        WHEN oi.design_status = 'design_ready' AND oi.production_status = 'pre_treatment'
            THEN 'ready_for_printing'
        WHEN oi.design_status != 'design_ready' AND oi.production_status = 'pre_treatment'
            THEN 'padding_done_waiting_design'
        WHEN oi.design_status = 'pending_from_customer' AND oi.production_status = 'pre_treatment'
            THEN 'padding_in_progress'
        WHEN oi.production_status = 'printing'
            THEN 'printing_in_progress'
        WHEN oi.production_status = 'post_process'
            THEN 'post_processing'
        WHEN oi.production_status = 'completed'
            THEN 'production_complete'
        WHEN oi.production_status = 'pending'
            THEN 'pending_start'
        ELSE 'unknown'
    END as combined_status_code,

    -- User-friendly label
    CASE
        WHEN oi.design_status = 'design_ready' AND oi.production_status = 'pre_treatment'
            THEN '✅ Ready for Printing'
        WHEN oi.design_status != 'design_ready' AND oi.production_status = 'pre_treatment'
            THEN '⚠️ Padding Done, Waiting for Design'
        WHEN oi.design_status = 'pending_from_customer' AND oi.production_status = 'pre_treatment'
            THEN '🔄 Padding in Progress, Design Pending'
        WHEN oi.production_status = 'printing'
            THEN '🖨️ Printing in Progress'
        WHEN oi.production_status = 'post_process'
            THEN '✂️ Post-Processing'
        WHEN oi.production_status = 'completed'
            THEN '✅ Production Complete'
        WHEN oi.production_status = 'pending'
            THEN '⏸️ Pending Start'
        ELSE '❓ Unknown Status'
    END as combined_status_label,

    -- Priority for sorting (1 = highest priority)
    CASE
        WHEN oi.design_status = 'design_ready' AND oi.production_status = 'pre_treatment'
            THEN 1  -- Ready for immediate action
        WHEN oi.design_status != 'design_ready' AND oi.production_status = 'pre_treatment'
            THEN 2  -- Blocked, needs attention
        WHEN oi.production_status = 'printing'
            THEN 3  -- Active work
        WHEN oi.production_status = 'post_process'
            THEN 4  -- Final stage
        WHEN oi.production_status = 'pending'
            THEN 5  -- Not started
        WHEN oi.production_status = 'completed'
            THEN 6  -- Done
        ELSE 99
    END as priority,

    -- Blocking indicator
    CASE
        WHEN oi.design_status != 'design_ready' AND oi.production_status = 'pre_treatment'
            THEN true
        ELSE false
    END as is_blocked,

    -- Blocking reason
    CASE
        WHEN oi.design_status != 'design_ready' AND oi.production_status = 'pre_treatment'
            THEN format('Pre-treatment completed. Waiting for design approval (current: %s)', oi.design_status)
        ELSE NULL
    END as blocking_reason,

    -- Timestamps
    oi.pre_treatment_completed_at,
    oi.printing_completed_at,
    oi.post_process_completed_at,
    oi.created_at,
    oi.updated_at

FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN customers c ON o.customer_id = c.id
WHERE o.is_deleted = false
ORDER BY priority ASC, oi.created_at ASC;

COMMENT ON VIEW order_items_combined_status IS
'Combined view showing order items with computed status labels, priorities, and blocking reasons';

-- =====================================================================
-- PART 5: Create Status Summary Function
-- =====================================================================

CREATE OR REPLACE FUNCTION get_production_status_summary()
RETURNS TABLE (
    status_combination TEXT,
    item_count BIGINT,
    total_quantity BIGINT,
    status_label TEXT,
    is_blocked BOOLEAN,
    priority INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (design_status || '_' || production_status) as status_combination,
        COUNT(*)::BIGINT as item_count,
        SUM(quantity)::BIGINT as total_quantity,
        CASE
            WHEN design_status = 'design_ready' AND production_status = 'pre_treatment'
                THEN 'Ready for Printing'
            WHEN design_status != 'design_ready' AND production_status = 'pre_treatment'
                THEN 'Padding Done, Waiting for Design'
            WHEN production_status = 'printing'
                THEN 'Printing in Progress'
            WHEN production_status = 'post_process'
                THEN 'Post-Processing'
            WHEN production_status = 'completed'
                THEN 'Production Complete'
            ELSE 'Other'
        END as status_label,
        CASE
            WHEN design_status != 'design_ready' AND production_status = 'pre_treatment'
                THEN true
            ELSE false
        END as is_blocked,
        CASE
            WHEN design_status = 'design_ready' AND production_status = 'pre_treatment'
                THEN 1
            WHEN design_status != 'design_ready' AND production_status = 'pre_treatment'
                THEN 2
            WHEN production_status = 'printing'
                THEN 3
            ELSE 4
        END as priority
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.is_deleted = false
    GROUP BY design_status, production_status
    ORDER BY priority ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_production_status_summary() IS
'Get aggregated counts of all status combinations with labels and priorities';

-- =====================================================================
-- PART 6: Create Function to Check if Can Progress
-- =====================================================================

CREATE OR REPLACE FUNCTION can_progress_to_next_stage(p_order_item_id UUID)
RETURNS JSONB AS $$
DECLARE
    current_design_status TEXT;
    current_production_status TEXT;
    result JSONB;
BEGIN
    -- Get current status
    SELECT design_status, production_status
    INTO current_design_status, current_production_status
    FROM order_items
    WHERE id = p_order_item_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order item not found: %', p_order_item_id;
    END IF;

    -- Determine next stage and blocking status
    IF current_production_status = 'pending' THEN
        result := jsonb_build_object(
            'can_progress', true,
            'next_stage', 'pre_treatment',
            'blocking_reason', NULL,
            'action', 'Start pre-treatment/padding process'
        );

    ELSIF current_production_status = 'pre_treatment' THEN
        IF current_design_status != 'design_ready' THEN
            result := jsonb_build_object(
                'can_progress', false,
                'next_stage', 'printing',
                'blocking_reason', format('Design not ready (current: %s)', current_design_status),
                'action', 'Approve design to start printing'
            );
        ELSE
            result := jsonb_build_object(
                'can_progress', true,
                'next_stage', 'printing',
                'blocking_reason', NULL,
                'action', '✅ Both pre-treatment and design ready - Start printing!'
            );
        END IF;

    ELSIF current_production_status = 'printing' THEN
        result := jsonb_build_object(
            'can_progress', true,
            'next_stage', 'post_process',
            'blocking_reason', NULL,
            'action', 'Move to post-processing'
        );

    ELSIF current_production_status = 'post_process' THEN
        result := jsonb_build_object(
            'can_progress', true,
            'next_stage', 'completed',
            'blocking_reason', NULL,
            'action', 'Mark as completed'
        );

    ELSIF current_production_status = 'completed' THEN
        result := jsonb_build_object(
            'can_progress', false,
            'next_stage', NULL,
            'blocking_reason', 'Production already completed',
            'action', 'Create delivery challan'
        );

    ELSE
        result := jsonb_build_object(
            'can_progress', false,
            'next_stage', NULL,
            'blocking_reason', 'Unknown status',
            'action', NULL
        );
    END IF;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION can_progress_to_next_stage(UUID) IS
'Check if order item can progress to next production stage and get blocking reason if not';

-- =====================================================================
-- PART 7: Update Existing Views with New Logic
-- =====================================================================

DROP VIEW IF EXISTS production_queue CASCADE;

CREATE OR REPLACE VIEW production_queue AS
SELECT
    oi.id,
    oi.order_id,
    o.order_number,
    o.customer_id,
    c.name as customer_name,
    oi.material_type,
    oi.quantity,
    oi.design_status,
    oi.production_status,
    CASE
        -- Highest priority: Ready for immediate action
        WHEN oi.design_status = 'design_ready' AND oi.production_status = 'pre_treatment' THEN 1
        -- High priority: Actively being worked on
        WHEN oi.production_status = 'printing' THEN 2
        WHEN oi.production_status = 'post_process' THEN 3
        -- Medium priority: Blocked but pre-treatment done
        WHEN oi.design_status != 'design_ready' AND oi.production_status = 'pre_treatment' THEN 4
        -- Lower priority: In progress but waiting for design
        WHEN oi.production_status = 'pre_treatment' THEN 5
        -- Lowest priority: Not started
        WHEN oi.production_status = 'pending' THEN 6
        ELSE 99
    END as queue_priority,
    oi.created_at,
    oi.updated_at
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN customers c ON o.customer_id = c.id
WHERE o.is_deleted = false
  AND oi.production_status != 'completed'
ORDER BY queue_priority ASC, oi.created_at ASC;

-- =====================================================================
-- PART 8: Add Indexes for Performance
-- =====================================================================

-- Index for combined status queries
CREATE INDEX IF NOT EXISTS idx_order_items_combined_status
    ON order_items(design_status, production_status)
    WHERE production_status != 'completed';

-- Index for blocked items
CREATE INDEX IF NOT EXISTS idx_order_items_blocked
    ON order_items(production_status, design_status)
    WHERE production_status = 'pre_treatment' AND design_status != 'design_ready';

-- Index for ready items
CREATE INDEX IF NOT EXISTS idx_order_items_ready_for_printing
    ON order_items(production_status, design_status)
    WHERE production_status = 'pre_treatment' AND design_status = 'design_ready';

-- =====================================================================
-- PART 9: Success Message and Verification
-- =====================================================================

DO $$
DECLARE
    total_items INTEGER;
    blocked_items INTEGER;
    ready_items INTEGER;
BEGIN
    -- Get counts
    SELECT COUNT(*) INTO total_items FROM order_items;
    SELECT COUNT(*) INTO blocked_items
        FROM order_items
        WHERE production_status = 'pre_treatment' AND design_status != 'design_ready';
    SELECT COUNT(*) INTO ready_items
        FROM order_items
        WHERE production_status = 'pre_treatment' AND design_status = 'design_ready';

    RAISE NOTICE '';
    RAISE NOTICE '========================================================================';
    RAISE NOTICE '✅ PRODUCTION WORKFLOW FIX COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '========================================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 CHANGES APPLIED:';
    RAISE NOTICE '   • Pre-treatment can now start WITHOUT design being ready';
    RAISE NOTICE '   • Printing requires BOTH pre-treatment AND design completion';
    RAISE NOTICE '   • Added combined status view with blocking indicators';
    RAISE NOTICE '   • Added status summary and helper functions';
    RAISE NOTICE '   • Added performance indexes';
    RAISE NOTICE '';
    RAISE NOTICE '📊 CURRENT DATABASE STATE:';
    RAISE NOTICE '   • Total Order Items: %', total_items;
    RAISE NOTICE '   • Items Blocked (padding done, design pending): %', blocked_items;
    RAISE NOTICE '   • Items Ready for Printing: %', ready_items;
    RAISE NOTICE '';
    RAISE NOTICE '🎯 BUSINESS WORKFLOW:';
    RAISE NOTICE '   1. Order received → Can start padding anytime';
    RAISE NOTICE '   2. Padding in progress → Design can be pending/received';
    RAISE NOTICE '   3. Padding completed + Design ready → Can start printing';
    RAISE NOTICE '   4. Printing → Post-processing → Completed';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 NEW FUNCTIONS AVAILABLE:';
    RAISE NOTICE '   • get_production_status_summary() - Get status counts';
    RAISE NOTICE '   • can_progress_to_next_stage(uuid) - Check if can progress';
    RAISE NOTICE '';
    RAISE NOTICE '📊 NEW VIEWS AVAILABLE:';
    RAISE NOTICE '   • order_items_combined_status - Full status with labels';
    RAISE NOTICE '   • production_queue - Priority-sorted work queue';
    RAISE NOTICE '';
    RAISE NOTICE '========================================================================';
    RAISE NOTICE '🚀 System ready for production use!';
    RAISE NOTICE '========================================================================';
    RAISE NOTICE '';
END $$;
