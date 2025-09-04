-- CHECK EXISTING FUNCTIONS
-- Run this to see what functions exist that might reference old columns

SELECT 
    proname as function_name,
    pronargs as num_args,
    proargnames as arg_names,
    CASE 
        WHEN prosrc LIKE '%production_stage%' THEN '⚠️ References production_stage'
        WHEN prosrc LIKE '%design_ready%' THEN '⚠️ References design_ready'  
        WHEN prosrc LIKE '%current_stage%' THEN '⚠️ References current_stage'
        ELSE '✅ Clean'
    END as status
FROM pg_proc 
WHERE proname LIKE '%order_item%' 
   OR proname LIKE '%production%'
   OR proname LIKE '%design%'
   OR prosrc LIKE '%production_stage%' 
   OR prosrc LIKE '%design_ready%'
   OR prosrc LIKE '%current_stage%'
ORDER BY function_name;