-- =====================================
-- EMERGENCY RESTORE PROCEDURES
-- Quick restore scripts for common scenarios
-- =====================================

-- =====================================
-- SCENARIO 1: RESTORE SINGLE TABLE
-- =====================================

-- Example: If material_stock gets corrupted
-- Step 1: Create emergency backup
CREATE TABLE material_stock_emergency_backup AS 
SELECT * FROM material_stock;

-- Step 2: Restore from your backup (replace with actual backup data)
-- DELETE FROM material_stock;
-- INSERT INTO material_stock SELECT * FROM material_stock_backup;

-- Step 3: Verify restore
SELECT 'RESTORED MATERIAL_STOCK:' as status, COUNT(*) as records FROM material_stock;

-- =====================================
-- SCENARIO 2: RESTORE CRITICAL TABLES
-- =====================================

-- Create backups of all critical tables
DO $$
BEGIN
    -- Customers backup
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
        EXECUTE 'DROP TABLE IF EXISTS customers_emergency_backup';
        EXECUTE 'CREATE TABLE customers_emergency_backup AS SELECT * FROM customers';
    END IF;
    
    -- Material stock backup  
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_stock') THEN
        EXECUTE 'DROP TABLE IF EXISTS material_stock_emergency_backup';
        EXECUTE 'CREATE TABLE material_stock_emergency_backup AS SELECT * FROM material_stock';
    END IF;
    
    -- Material in backup
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_in') THEN
        EXECUTE 'DROP TABLE IF EXISTS material_in_emergency_backup';
        EXECUTE 'CREATE TABLE material_in_emergency_backup AS SELECT * FROM material_in';
    END IF;
    
    -- Delivery challans backup
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'delivery_challans') THEN
        EXECUTE 'DROP TABLE IF EXISTS delivery_challans_emergency_backup';
        EXECUTE 'CREATE TABLE delivery_challans_emergency_backup AS SELECT * FROM delivery_challans';
    END IF;
    
    -- Challan items backup
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'challan_items') THEN
        EXECUTE 'DROP TABLE IF EXISTS challan_items_emergency_backup';
        EXECUTE 'CREATE TABLE challan_items_emergency_backup AS SELECT * FROM challan_items';
    END IF;
    
    RAISE NOTICE 'Emergency backups created successfully';
END $$;

-- =====================================
-- SCENARIO 3: ROLLBACK RECENT CHANGES
-- =====================================

-- Check what backup tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name LIKE '%_backup' THEN 'BACKUP TABLE'
        WHEN table_name LIKE '%_emergency_backup' THEN 'EMERGENCY BACKUP'
        ELSE 'MAIN TABLE'
    END as table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND (table_name LIKE '%backup%' OR table_name IN ('customers', 'material_stock', 'material_in', 'delivery_challans', 'challan_items'))
ORDER BY table_name;

-- =====================================
-- SCENARIO 4: RESET STOCK VALUES TO ZERO
-- =====================================

-- If stock calculations are completely wrong, reset and recalculate
-- USE WITH EXTREME CAUTION
/*
UPDATE material_stock 
SET 
    total_received = 0,
    total_delivered = 0, 
    current_stock = 0,
    last_updated = NOW()
WHERE current_stock < -100; -- Only reset obviously wrong values
*/

-- =====================================  
-- SCENARIO 5: VALIDATE DATA INTEGRITY
-- =====================================

-- Check for orphaned records and data integrity issues
SELECT 'DATA INTEGRITY CHECK' as check_type;

-- Check for material_stock records without customers
SELECT 
    'ORPHANED MATERIAL STOCK:' as issue,
    COUNT(*) as count
FROM material_stock ms
LEFT JOIN customers c ON ms.customer_id = c.id
WHERE c.id IS NULL;

-- Check for delivery challans without customers  
SELECT 
    'ORPHANED DELIVERY CHALLANS:' as issue,
    COUNT(*) as count
FROM delivery_challans dc
LEFT JOIN customers c ON dc.customer_id = c.id
WHERE c.id IS NULL;

-- Check for challan items without order items
SELECT 
    'ORPHANED CHALLAN ITEMS:' as issue,
    COUNT(*) as count
FROM challan_items ci
LEFT JOIN order_items oi ON ci.order_item_id = oi.id
WHERE oi.id IS NULL;

-- Check for material_in without customers
SELECT 
    'ORPHANED MATERIAL IN:' as issue,
    COUNT(*) as count  
FROM material_in mi
LEFT JOIN customers c ON mi.customer_id = c.id
WHERE c.id IS NULL;

-- =====================================
-- SCENARIO 6: EMERGENCY CONTACT INFO
-- =====================================

SELECT 'EMERGENCY PROCEDURES LOADED' as status;
SELECT 'Available backup tables:' as info;

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name LIKE '%backup%'
ORDER BY table_name;

-- =====================================
-- USAGE INSTRUCTIONS
-- =====================================

/*
HOW TO USE THESE EMERGENCY PROCEDURES:

1. BEFORE ANY MAJOR CHANGES:
   - Run the backup creation block (SCENARIO 2)
   
2. IF SOMETHING BREAKS:
   - Check what backups exist (SCENARIO 6)  
   - Restore specific tables (SCENARIO 1)
   - Validate data integrity (SCENARIO 5)
   
3. IF EVERYTHING BREAKS:
   - Use your full database backup from:
     * db/CURRENT_SCHEMA_BACKUP.sql
     * db/CURRENT_DATA_BACKUP.sql
     
4. FOR STOCK ISSUES:
   - Use db/07_STOCK_CALCULATION_FIX.sql
   - Or reset and recalculate (SCENARIO 4)

ALWAYS TEST RESTORES ON A COPY FIRST!
*/