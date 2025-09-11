-- ENHANCED API FUNCTIONS FOR UX-FOCUSED SYSTEM
-- Functions to support QC tracking, invoice editing, and smart features

-- =====================================================
-- PART 1: QC Management Functions
-- =====================================================

-- Function to get QC dashboard data
CREATE OR REPLACE FUNCTION get_qc_dashboard()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    pending_count INTEGER;
    completed_today INTEGER;
    failed_count INTEGER;
BEGIN
    -- Get counts for dashboard metrics
    SELECT COUNT(*) INTO pending_count 
    FROM order_items 
    WHERE production_status = 'quality_check' AND qc_pass_status = 'pending';
    
    SELECT COUNT(*) INTO completed_today
    FROM order_items 
    WHERE quality_check_date::date = CURRENT_DATE AND qc_pass_status IN ('pass', 'fail');
    
    SELECT COUNT(*) INTO failed_count
    FROM order_items 
    WHERE qc_pass_status = 'fail' AND production_status != 'rework';
    
    -- Build result JSON
    result = jsonb_build_object(
        'metrics', jsonb_build_object(
            'pending_qc', pending_count,
            'completed_today', completed_today,
            'failed_qc', failed_count
        ),
        'pending_items', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', oi.id,
                    'order_number', o.order_number,
                    'customer_name', c.name,
                    'material_type', oi.material_type,
                    'quantity', oi.quantity,
                    'production_status', oi.production_status,
                    'stage_completed_at', oi.stage_completed_at
                )
            )
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN customers c ON o.customer_id = c.id
            WHERE oi.production_status = 'quality_check' 
            AND oi.qc_pass_status = 'pending'
            AND o.is_deleted = false
            ORDER BY oi.stage_completed_at ASC
        )
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to perform QC on an item
CREATE OR REPLACE FUNCTION perform_quality_check(
    p_order_item_id UUID,
    p_qc_user_id UUID,
    p_qc_status VARCHAR(20),
    p_qc_notes TEXT DEFAULT NULL,
    p_qc_images TEXT[] DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    result_item order_items%ROWTYPE;
    new_production_status VARCHAR(50);
BEGIN
    -- Validate QC status
    IF p_qc_status NOT IN ('pass', 'fail', 'rework') THEN
        RAISE EXCEPTION 'Invalid QC status: %. Must be pass, fail, or rework', p_qc_status;
    END IF;
    
    -- Determine new production status based on QC result
    new_production_status = CASE 
        WHEN p_qc_status = 'pass' THEN 'completed'
        WHEN p_qc_status = 'fail' THEN 'rework'
        WHEN p_qc_status = 'rework' THEN 'rework'
    END;
    
    -- Update the order item with QC results
    UPDATE order_items 
    SET 
        quality_checked_by = p_qc_user_id,
        quality_check_date = NOW(),
        qc_pass_status = p_qc_status,
        qc_notes = p_qc_notes,
        qc_images = p_qc_images,
        production_status = new_production_status,
        rework_count = CASE WHEN p_qc_status = 'rework' THEN COALESCE(rework_count, 0) + 1 ELSE rework_count END,
        updated_at = NOW()
    WHERE id = p_order_item_id
    RETURNING * INTO result_item;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order item not found: %', p_order_item_id;
    END IF;
    
    -- Log the QC activity
    INSERT INTO user_activity_log (
        user_id, activity_type, entity_type, entity_id, description, metadata
    ) VALUES (
        p_qc_user_id, 'qc_completed', 'order_item', p_order_item_id,
        FORMAT('Quality check completed with status: %s', p_qc_status),
        jsonb_build_object(
            'qc_status', p_qc_status,
            'previous_status', 'quality_check',
            'new_status', new_production_status
        )
    );
    
    -- Create notification if QC failed
    IF p_qc_status IN ('fail', 'rework') THEN
        INSERT INTO user_notifications (
            user_id, notification_type, title, message, entity_type, entity_id, priority
        ) 
        SELECT 
            u.id, 'qc_failed', 'QC Failed - Action Required',
            FORMAT('Item %s failed QC and needs rework', result_item.id),
            'order_item', result_item.id, 'high'
        FROM users u 
        WHERE u.role IN ('production_manager', 'admin');
    END IF;
    
    RETURN to_jsonb(result_item);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 2: Smart Invoice Generation Functions
-- =====================================================

-- Function to get available challans for invoicing
CREATE OR REPLACE FUNCTION get_available_challans_for_invoice(p_customer_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
BEGIN
    RETURN jsonb_agg(
        jsonb_build_object(
            'challan_id', dc.id,
            'challan_number', dc.challan_number,
            'customer_id', dc.customer_id,
            'customer_name', c.name,
            'challan_date', dc.challan_date,
            'total_items', challan_summary.item_count,
            'total_value', challan_summary.total_value,
            'delivery_status', dc.delivery_status
        )
    )
    FROM delivery_challans dc
    JOIN customers c ON dc.customer_id = c.id
    JOIN (
        SELECT 
            ci.challan_id,
            COUNT(*) as item_count,
            SUM(oi.unit_price * ci.quantity) as total_value
        FROM challan_items ci
        JOIN order_items oi ON ci.order_item_id = oi.id
        GROUP BY ci.challan_id
    ) challan_summary ON challan_summary.challan_id = dc.id
    WHERE dc.is_invoiced = false
    AND dc.delivery_status = 'delivered'
    AND dc.is_deleted = false
    AND (p_customer_id IS NULL OR dc.customer_id = p_customer_id)
    ORDER BY dc.challan_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to generate invoice from multiple challans
CREATE OR REPLACE FUNCTION generate_invoice_from_challans(
    p_challan_ids UUID[],
    p_created_by UUID,
    p_invoice_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    invoice_record gst_invoices%ROWTYPE;
    customer_id_check UUID;
    invoice_number TEXT;
    total_amount NUMERIC := 0;
    tax_amount NUMERIC := 0;
    subtotal NUMERIC := 0;
BEGIN
    -- Validate that all challans belong to same customer
    SELECT DISTINCT customer_id INTO customer_id_check
    FROM delivery_challans 
    WHERE id = ANY(p_challan_ids) AND is_invoiced = false;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No valid uninvoiced challans found';
    END IF;
    
    -- Check if more than one customer (should not happen)
    IF (SELECT COUNT(DISTINCT customer_id) FROM delivery_challans WHERE id = ANY(p_challan_ids)) > 1 THEN
        RAISE EXCEPTION 'Cannot create invoice for challans from different customers';
    END IF;
    
    -- Calculate totals from challan items
    SELECT 
        SUM(oi.unit_price * ci.quantity),
        SUM(oi.unit_price * ci.quantity) * 0.18, -- 18% GST
        SUM(oi.unit_price * ci.quantity) * 1.18
    INTO subtotal, tax_amount, total_amount
    FROM challan_items ci
    JOIN order_items oi ON ci.order_item_id = oi.id
    WHERE ci.challan_id = ANY(p_challan_ids);
    
    -- Generate invoice number
    invoice_number = 'INV-' || TO_CHAR(NOW(), 'YYYY-MM') || '-' || 
                    LPAD(NEXTVAL('invoice_number_seq')::TEXT, 4, '0');
    
    -- Create the invoice
    INSERT INTO gst_invoices (
        invoice_number, customer_id, invoice_date, subtotal, tax_amount, 
        total_amount, invoice_status, notes, created_at, last_edited_by
    ) VALUES (
        invoice_number, customer_id_check, CURRENT_DATE, subtotal, tax_amount,
        total_amount, 'draft', p_invoice_notes, NOW(), p_created_by
    ) RETURNING * INTO invoice_record;
    
    -- Link challans to invoice
    INSERT INTO invoice_sources (invoice_id, source_type, source_id)
    SELECT invoice_record.id, 'challan', unnest(p_challan_ids);
    
    -- Update challans as invoiced
    UPDATE delivery_challans 
    SET is_invoiced = true, invoiced_date = NOW(), invoice_id = invoice_record.id
    WHERE id = ANY(p_challan_ids);
    
    -- Log the activity
    INSERT INTO user_activity_log (
        user_id, activity_type, entity_type, entity_id, description, metadata
    ) VALUES (
        p_created_by, 'invoice_created', 'invoice', invoice_record.id,
        FORMAT('Invoice created from %s challans', array_length(p_challan_ids, 1)),
        jsonb_build_object(
            'challan_ids', p_challan_ids,
            'amount', total_amount,
            'customer_id', customer_id_check
        )
    );
    
    RETURN to_jsonb(invoice_record);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 3: Invoice Editing Functions
-- =====================================================

-- Function to check if invoice can be edited
CREATE OR REPLACE FUNCTION can_edit_invoice(p_invoice_id UUID, p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    invoice_status VARCHAR(20);
    user_role VARCHAR(50);
    can_edit BOOLEAN := false;
    reason TEXT;
BEGIN
    -- Get invoice status
    SELECT invoice_status INTO invoice_status
    FROM gst_invoices WHERE id = p_invoice_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('can_edit', false, 'reason', 'Invoice not found');
    END IF;
    
    -- Get user role
    SELECT role INTO user_role FROM users WHERE id = p_user_id;
    
    -- Determine edit permissions
    CASE invoice_status
        WHEN 'draft' THEN 
            can_edit = true;
            reason = 'Invoice is in draft status';
        WHEN 'ready' THEN
            can_edit = (user_role IN ('admin', 'finance_manager'));
            reason = CASE WHEN can_edit THEN 'Admin override allowed' ELSE 'Invoice is ready - admin access required' END;
        WHEN 'sent' THEN
            can_edit = false;
            reason = 'Invoice has been sent to customer';
        WHEN 'paid' THEN
            can_edit = false;
            reason = 'Invoice has been paid';
        WHEN 'cancelled' THEN
            can_edit = (user_role IN ('admin', 'finance_manager'));
            reason = CASE WHEN can_edit THEN 'Cancelled invoice - admin can edit' ELSE 'Invoice is cancelled' END;
        ELSE
            can_edit = false;
            reason = 'Unknown invoice status';
    END CASE;
    
    RETURN jsonb_build_object(
        'can_edit', can_edit,
        'reason', reason,
        'invoice_status', invoice_status,
        'user_role', user_role
    );
END;
$$ LANGUAGE plpgsql;

-- Function to update invoice with revision tracking
CREATE OR REPLACE FUNCTION update_invoice_with_revision(
    p_invoice_id UUID,
    p_user_id UUID,
    p_updates JSONB,
    p_change_description TEXT
) RETURNS JSONB AS $$
DECLARE
    old_values JSONB;
    new_values JSONB;
    updated_invoice gst_invoices%ROWTYPE;
    can_edit_result JSONB;
BEGIN
    -- Check if user can edit this invoice
    can_edit_result = can_edit_invoice(p_invoice_id, p_user_id);
    
    IF NOT (can_edit_result->>'can_edit')::BOOLEAN THEN
        RAISE EXCEPTION 'Cannot edit invoice: %', can_edit_result->>'reason';
    END IF;
    
    -- Get current values for revision history
    SELECT to_jsonb(gst_invoices.*) INTO old_values
    FROM gst_invoices WHERE id = p_invoice_id;
    
    -- Update the invoice
    UPDATE gst_invoices 
    SET 
        subtotal = COALESCE((p_updates->>'subtotal')::NUMERIC, subtotal),
        tax_amount = COALESCE((p_updates->>'tax_amount')::NUMERIC, tax_amount),
        total_amount = COALESCE((p_updates->>'total_amount')::NUMERIC, total_amount),
        notes = COALESCE(p_updates->>'notes', notes),
        due_date = COALESCE((p_updates->>'due_date')::DATE, due_date),
        revision_number = revision_number + 1,
        last_edited_by = p_user_id,
        last_edited_date = NOW(),
        updated_at = NOW()
    WHERE id = p_invoice_id
    RETURNING * INTO updated_invoice;
    
    -- Get new values
    SELECT to_jsonb(updated_invoice) INTO new_values;
    
    -- Create revision history
    INSERT INTO invoice_revisions (
        invoice_id, revision_number, changed_by, changes_description, old_values, new_values
    ) VALUES (
        p_invoice_id, updated_invoice.revision_number, p_user_id, 
        p_change_description, old_values, new_values
    );
    
    -- Log the activity
    INSERT INTO user_activity_log (
        user_id, activity_type, entity_type, entity_id, description, metadata
    ) VALUES (
        p_user_id, 'invoice_edited', 'invoice', p_invoice_id,
        p_change_description,
        jsonb_build_object(
            'revision_number', updated_invoice.revision_number,
            'changes', p_updates
        )
    );
    
    RETURN to_jsonb(updated_invoice);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 4: Smart Notification Functions
-- =====================================================

-- Function to create smart notifications
CREATE OR REPLACE FUNCTION create_smart_notifications()
RETURNS VOID AS $$
BEGIN
    -- Clear old notifications
    DELETE FROM user_notifications WHERE expires_at < NOW();
    
    -- Create QC pending notifications
    INSERT INTO user_notifications (user_id, notification_type, title, message, entity_type, priority, expires_at)
    SELECT DISTINCT
        u.id,
        'qc_pending',
        'Items Ready for Quality Check',
        FORMAT('%s items are ready for quality check', COUNT(oi.id)),
        'order_item',
        'normal',
        NOW() + INTERVAL '24 hours'
    FROM users u
    CROSS JOIN order_items oi
    WHERE u.role IN ('quality_manager', 'admin')
    AND oi.production_status = 'quality_check'
    AND oi.qc_pass_status = 'pending'
    GROUP BY u.id
    HAVING COUNT(oi.id) > 0;
    
    -- Create invoice ready notifications
    INSERT INTO user_notifications (user_id, notification_type, title, message, entity_type, priority, expires_at)
    SELECT DISTINCT
        u.id,
        'invoice_ready',
        'Challans Ready for Invoicing',
        FORMAT('%s challans are ready for invoicing', COUNT(dc.id)),
        'challan',
        'normal',
        NOW() + INTERVAL '48 hours'
    FROM users u
    CROSS JOIN delivery_challans dc
    WHERE u.role IN ('finance_manager', 'admin')
    AND dc.is_invoiced = false
    AND dc.delivery_status = 'delivered'
    AND dc.is_deleted = false
    GROUP BY u.id
    HAVING COUNT(dc.id) > 0;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for invoice numbering
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;