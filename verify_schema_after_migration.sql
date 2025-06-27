-- SCHEMA VERIFICATION SCRIPT
-- Run this after the migration to verify all tables match the schema diagram

-- 1. Check enum types exist
SELECT 'ENUM TYPES:' as check_type;
SELECT typname as enum_name, enumlabel as enum_value 
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid 
WHERE typname IN ('adjustment_type', 'production_stage', 'order_status', 'material_type', 'payment_method', 'return_reason');

-- 2. Check all tables exist with correct schema prefix
SELECT 'TABLES EXISTENCE:' as check_type;
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'users', 'customers', 'orders', 'order_items', 
    'material_in', 'material_out', 'delivery_challans', 'challan_items',
    'gst_invoices', 'invoice_challans', 'payments', 'returns',
    'inventory', 'inventory_adjustments', 'expenses', 'audit_log'
  )
ORDER BY table_name;

-- 3. Check critical columns that were added/modified
SELECT 'CRITICAL COLUMNS CHECK:' as check_type;

-- Check order_items has new production tracking columns
SELECT 'order_items' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'order_items'
  AND column_name IN ('production_stage', 'stage_completed_at', 'updated_by_user_id')
ORDER BY column_name;

-- Check material_in has customer_id
SELECT 'material_in' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'material_in'
  AND column_name = 'customer_id';

-- Check material_out has required columns
SELECT 'material_out' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'material_out'
  AND column_name IN ('customer_id', 'unit', 'notes')
ORDER BY column_name;

-- Check delivery_challans has new structure
SELECT 'delivery_challans' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'delivery_challans'
  AND column_name IN ('is_delivered', 'delivered_at')
ORDER BY column_name;

-- Check inventory has supplier columns
SELECT 'inventory' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'inventory'
  AND column_name IN ('supplier_name', 'supplier_contact')
ORDER BY column_name;

-- Check inventory_adjustments table exists with correct structure
SELECT 'inventory_adjustments' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'inventory_adjustments'
ORDER BY ordinal_position;

-- 4. Check views were created correctly
SELECT 'VIEWS CREATED:' as check_type;
SELECT table_name as view_name, table_schema
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name LIKE 'v_%'
ORDER BY table_name;

-- 5. Check indexes were created
SELECT 'INDEXES CREATED:' as check_type;
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- 6. Check foreign key constraints
SELECT 'FOREIGN KEYS:' as check_type;
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('order_items', 'material_in', 'material_out', 'inventory_adjustments')
ORDER BY tc.table_name, kcu.column_name;

-- 7. Check sample data can be inserted (Test constraints work)
SELECT 'CONSTRAINT VALIDATION:' as check_type;

-- Test if production_stage enum works
SELECT 'Testing production_stage enum' as test_name;
SELECT enumlabel FROM pg_enum e 
JOIN pg_type t ON e.enumtypid = t.oid 
WHERE t.typname = 'production_stage';

-- Test if adjustment_type enum works  
SELECT 'Testing adjustment_type enum' as test_name;
SELECT enumlabel FROM pg_enum e 
JOIN pg_type t ON e.enumtypid = t.oid 
WHERE t.typname = 'adjustment_type';

-- 8. Final summary
SELECT 'MIGRATION SUMMARY:' as check_type;
SELECT 
  'Tables' as object_type,
  COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
UNION ALL
SELECT 
  'Views' as object_type,
  COUNT(*) as count
FROM information_schema.views 
WHERE table_schema = 'public'
UNION ALL
SELECT 
  'Indexes' as object_type,
  COUNT(*) as count
FROM pg_indexes 
WHERE schemaname = 'public'
UNION ALL
SELECT 
  'Enums' as object_type,
  COUNT(DISTINCT typname) as count
FROM pg_type 
WHERE typtype = 'e';

-- Check if critical migration worked by testing sample operations
SELECT 'FUNCTIONAL TESTS:' as check_type;

-- Test 1: Can we reference adjustment_type enum?
SELECT 'adjustment_type enum test' as test_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'adjustment_type') 
    THEN 'PASS - Enum exists'
    ELSE 'FAIL - Enum missing'
  END as result;

-- Test 2: Can we find customer_id in material_in?
SELECT 'material_in customer_id test' as test_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'material_in' 
        AND column_name = 'customer_id'
    ) 
    THEN 'PASS - Column exists'
    ELSE 'FAIL - Column missing'
  END as result;

-- Test 3: Can we find inventory_adjustments table?
SELECT 'inventory_adjustments table test' as test_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = 'inventory_adjustments'
    ) 
    THEN 'PASS - Table exists'
    ELSE 'FAIL - Table missing'
  END as result;

-- Test 4: Are the views created?
SELECT 'views creation test' as test_name,
  CASE 
    WHEN (
      SELECT COUNT(*) FROM information_schema.views 
      WHERE table_schema = 'public' AND table_name LIKE 'v_%'
    ) >= 4
    THEN 'PASS - Views created'
    ELSE 'FAIL - Views missing'
  END as result; 