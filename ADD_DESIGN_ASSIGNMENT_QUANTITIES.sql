-- =====================================================
-- DESIGN ASSIGNMENT QUANTITY TRACKING
-- Add quantity tracking to designer assignments to split designs among multiple designers
-- =====================================================

-- Add design quantity column to designer_assignments table
ALTER TABLE designer_assignments 
ADD COLUMN IF NOT EXISTS assigned_design_quantity INTEGER DEFAULT 0;

-- Add comments for clarity
COMMENT ON COLUMN designer_assignments.assigned_design_quantity IS 'Number of designs assigned to this designer from the available designs for this order item';

-- Add constraint to ensure assigned quantity is positive
ALTER TABLE designer_assignments 
ADD CONSTRAINT chk_assigned_design_quantity_positive 
CHECK (assigned_design_quantity >= 0);

-- Create function to validate design assignment quantities
CREATE OR REPLACE FUNCTION validate_design_assignment_quantity()
RETURNS TRIGGER AS $$
DECLARE
    total_assigned INTEGER;
    available_designs INTEGER;
    order_item_id_param UUID;
BEGIN
    -- Get the order item ID from the assignment
    order_item_id_param := NEW.order_item_id;
    
    -- Calculate total designs already assigned for this order item (excluding current assignment if updating)
    SELECT COALESCE(SUM(assigned_design_quantity), 0) INTO total_assigned
    FROM designer_assignments 
    WHERE order_item_id = order_item_id_param 
    AND (TG_OP = 'INSERT' OR id != NEW.id);
    
    -- Get available approved designs for this order item
    SELECT COALESCE(designs_approved_quantity, 0) INTO available_designs
    FROM order_items 
    WHERE id = order_item_id_param;
    
    -- Check if total assignment (including new/updated assignment) exceeds available designs
    IF (total_assigned + NEW.assigned_design_quantity) > available_designs THEN
        RAISE EXCEPTION 'Cannot assign % designs. Only % designs available (% already assigned)', 
            NEW.assigned_design_quantity, 
            (available_designs - total_assigned),
            total_assigned;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate design assignment quantities
DROP TRIGGER IF EXISTS tr_validate_design_assignment_quantity ON designer_assignments;
CREATE TRIGGER tr_validate_design_assignment_quantity
    BEFORE INSERT OR UPDATE OF assigned_design_quantity ON designer_assignments
    FOR EACH ROW
    EXECUTE FUNCTION validate_design_assignment_quantity();

-- Create view for design assignment summary per order item
CREATE OR REPLACE VIEW design_assignment_summary AS
SELECT 
    oi.id as order_item_id,
    oi.material_type,
    oi.quantity as order_quantity,
    oi.designs_provided_quantity,
    oi.designs_approved_quantity,
    COALESCE(SUM(da.assigned_design_quantity), 0) as total_assigned_designs,
    (oi.designs_approved_quantity - COALESCE(SUM(da.assigned_design_quantity), 0)) as unassigned_designs,
    COUNT(da.id) as number_of_designers,
    ARRAY_AGG(
        CASE 
            WHEN da.id IS NOT NULL THEN 
                JSON_BUILD_OBJECT(
                    'designer_id', da.designer_id,
                    'assigned_quantity', da.assigned_design_quantity,
                    'status', da.status,
                    'priority_level', da.priority_level
                )
            ELSE NULL
        END
    ) FILTER (WHERE da.id IS NOT NULL) as designer_assignments
FROM order_items oi
LEFT JOIN designer_assignments da ON oi.id = da.order_item_id
GROUP BY oi.id, oi.material_type, oi.quantity, oi.designs_provided_quantity, oi.designs_approved_quantity;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_designer_assignments_order_item_quantity 
ON designer_assignments(order_item_id, assigned_design_quantity);

-- Update existing assignments to have at least 1 design assigned if they exist
UPDATE designer_assignments 
SET assigned_design_quantity = 1 
WHERE assigned_design_quantity = 0 
AND EXISTS (
    SELECT 1 FROM order_items oi 
    WHERE oi.id = designer_assignments.order_item_id 
    AND oi.designs_approved_quantity > 0
);

COMMENT ON VIEW design_assignment_summary IS 'Summary view showing design assignment distribution per order item';
COMMENT ON FUNCTION validate_design_assignment_quantity() IS 'Validates that design assignments do not exceed available approved designs';