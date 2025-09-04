-- CHECK CURRENT DATABASE STATE
-- Run these queries one by one to understand what exists

-- 1. Check existing triggers on order_items
SELECT 
    trigger_name,
    event_manipulation as event_type,
    action_timing as timing,
    action_condition,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'order_items'
ORDER BY trigger_name;