-- =====================================
-- SIMPLE SCHEMA CHECK (No Complex Loops)
-- Run this to quickly see your database status
-- =====================================

-- 1. ALL TABLES WITH COUNTS
SELECT 
    '=== ALL TABLES ===' as section,
    table_name,
    table_type,
    CASE 
        WHEN table_name = 'customers' THEN (SELECT COUNT(*)::TEXT FROM customers)
        WHEN table_name = 'orders' THEN (SELECT COUNT(*)::TEXT FROM orders)
        WHEN table_name = 'material_in' THEN (SELECT COUNT(*)::TEXT FROM material_in)
        WHEN table_name = 'material_stock' THEN (SELECT COUNT(*)::TEXT FROM material_stock)
        WHEN table_name = 'delivery_challans' THEN (SELECT COUNT(*)::TEXT FROM delivery_challans)
        WHEN table_name = 'challan_items' THEN (SELECT COUNT(*)::TEXT FROM challan_items)
        ELSE 'N/A'
    END as record_count
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. CRITICAL TABLE STRUCTURES
SELECT '=== MATERIAL_STOCK STRUCTURE ===' as section;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'material_stock'
ORDER BY ordinal_position;

SELECT '=== MATERIAL_IN STRUCTURE ===' as section;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'material_in'
ORDER BY ordinal_position;

SELECT '=== ORDER_ITEMS STRUCTURE ===' as section;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'order_items'
ORDER BY ordinal_position;

-- 3. REFERENCE TABLES CHECK
SELECT '=== REFERENCE TABLES CHECK ===' as section;
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_types') 
        THEN '✅ material_types: EXISTS (' || (SELECT COUNT(*)::TEXT FROM material_types) || ' records)'
        ELSE '❌ material_types: MISSING'
    END as material_types_status;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_statuses') 
        THEN '✅ order_statuses: EXISTS (' || (SELECT COUNT(*)::TEXT FROM order_statuses) || ' records)'
        ELSE '❌ order_statuses: MISSING'
    END as order_statuses_status;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') 
        THEN '✅ user_roles: EXISTS (' || (SELECT COUNT(*)::TEXT FROM user_roles) || ' records)'
        ELSE '❌ user_roles: MISSING'
    END as user_roles_status;

-- 4. SCHEMA TYPE IDENTIFICATION
SELECT '=== SCHEMA TYPE ===' as section;
SELECT 
    CASE 
        WHEN (
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name IN ('material_types', 'order_statuses', 'user_roles')
        ) >= 3 THEN '✅ TABLE-BASED SCHEMA (uses reference tables)'
        ELSE '✅ ENUM-BASED SCHEMA (uses PostgreSQL enums)'
    END as schema_type;

-- 5. CURRENT STOCK ISSUES CHECK
SELECT '=== STOCK ISSUES CHECK ===' as section;
SELECT 
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_stock')
        THEN '❌ CRITICAL: material_stock table does not exist'
        WHEN EXISTS (SELECT 1 FROM material_stock WHERE current_stock < 0)
        THEN '🚨 CRITICAL: ' || (SELECT COUNT(*)::TEXT FROM material_stock WHERE current_stock < 0) || ' customers have negative stock'
        ELSE '✅ STOCK VALUES: All positive'
    END as stock_status;

-- 6. SAMPLE DATA
SELECT '=== SAMPLE MATERIAL_IN DATA ===' as section;
SELECT 
    c.name as customer_name,
    mi.material_type,
    mi.quantity,
    mi.received_date::date
FROM material_in mi
JOIN customers c ON mi.customer_id = c.id
ORDER BY mi.received_date DESC
LIMIT 5;

SELECT '=== SAMPLE MATERIAL_STOCK DATA ===' as section;
SELECT 
    c.name as customer_name,
    ms.material_type,
    ms.total_received,
    ms.total_delivered,
    ms.current_stock,
    CASE 
        WHEN ms.current_stock < 0 THEN '❌ NEGATIVE'
        ELSE '✅ POSITIVE'
    END as status
FROM material_stock ms
JOIN customers c ON ms.customer_id = c.id
WHERE c.name IN ('SIVA HANDLOOMS', 'SRINIVASA HANDLOOMS')
ORDER BY c.name, ms.material_type;

-- 7. DESIGN MANAGEMENT TABLES CHECK
SELECT '=== DESIGN MANAGEMENT STATUS ===' as section;
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'design_submissions')
        THEN '✅ design_submissions: EXISTS'
        ELSE '❌ design_submissions: MISSING'
    END as design_submissions_status;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'design_status')
        THEN '✅ design_status: EXISTS'
        ELSE '❌ design_status: MISSING'
    END as design_status_status;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_design_mapping')
        THEN '✅ material_design_mapping: EXISTS'
        ELSE '❌ material_design_mapping: MISSING'
    END as material_design_mapping_status;

-- 8. NEXT STEPS SUMMARY
SELECT '=== RECOMMENDED NEXT STEPS ===' as section;
SELECT 
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_stock')
        THEN '1. 🚨 DEPLOY: Create material_stock table first'
        WHEN EXISTS (SELECT 1 FROM material_stock WHERE current_stock < 0)
        THEN '1. 🚨 FIX: Run URGENT_01_STOCK_FIX_CORRECTED.sql'
        ELSE '1. ✅ Stock system working'
    END as step_1;

SELECT 
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'design_submissions')
        THEN '2. 📋 DEPLOY: Design management system'
        ELSE '2. ✅ Design system deployed'
    END as step_2;

SELECT '3. 🔧 DEPLOY: API compatibility updates' as step_3;
SELECT '4. 📊 VERIFY: Run final system check' as step_4;