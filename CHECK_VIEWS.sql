-- CHECK EXISTING VIEWS
-- Run this to see what views exist

SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE schemaname = 'public' 
AND (viewname LIKE '%order%' OR viewname LIKE '%production%' OR viewname LIKE '%design%')
ORDER BY viewname;