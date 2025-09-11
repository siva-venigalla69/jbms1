-- CHECK SAMPLE DATA FROM ORDER_ITEMS
-- See current values in design_status, production_status and any legacy columns

SELECT 
    id,
    design_status,
    production_status,
    design_url,
    design_notes,
    printing_can_start,
    quality_rating,
    quality_notes,
    stage_completed_by,
    stage_completed_at
FROM order_items 
LIMIT 10;