-- ==========================================
-- COMPLETE DATABASE CLEANUP SCRIPT
-- Removes ALL test data while preserving schema
-- ==========================================
--
-- WARNING: THIS WILL DELETE ALL DATA IN YOUR DATABASE
-- MAKE SURE YOU HAVE A BACKUP BEFORE RUNNING THIS
--
-- ==========================================

-- Show current status before cleanup
SELECT 'BEFORE CLEANUP - DATABASE STATUS' as status;

SELECT
    tablename,
    n_live_tup as "Current Rows"
FROM pg_stat_user_tables
WHERE schemaname = 'public'
    AND n_live_tup > 0
ORDER BY n_live_tup DESC;

-- ==========================================
-- START TRANSACTION - ALL OR NOTHING
-- ==========================================
BEGIN;

-- ==========================================
-- PHASE 1: FINANCIAL & TRANSACTION DATA
-- (Highest dependency level)
-- ==========================================

-- Remove payment records
DELETE FROM payments;
DELETE FROM salary_payments;

-- Remove invoice data
DELETE FROM gst_invoices;
DELETE FROM invoice_line_items;

-- Remove delivery challan data
DELETE FROM delivery_challans;
DELETE FROM delivery_challan_items;

-- Remove purchase data
DELETE FROM purchases;
DELETE FROM purchase_items;

-- Remove expense records
DELETE FROM expenses;

-- Remove material tracking data
DELETE FROM material_returns;
DELETE FROM material_out;
DELETE FROM material_in;
DELETE FROM material_stock;

-- Remove quality control records
DELETE FROM quality_checks;

-- Remove customer design data
DELETE FROM customer_designs;
DELETE FROM customer_design_files;

-- ==========================================
-- PHASE 2: PRODUCTION & ORDER DATA
-- ==========================================

-- Remove production batch data
DELETE FROM production_batches;
DELETE FROM production_batch_items;
DELETE FROM production_batch_updates;

-- Remove design assignments
DELETE FROM design_assignments;

-- Remove order data (cascades to order_items)
DELETE FROM order_items;
DELETE FROM orders;

-- Remove design library
DELETE FROM design_library;
DELETE FROM design_files;

-- ==========================================
-- PHASE 3: EMPLOYEE & USER DATA
-- ==========================================

-- Remove employee-related data
DELETE FROM employees;
DELETE FROM designer_assignments;
DELETE FROM user_profiles;

-- ==========================================
-- PHASE 4: CUSTOMER & BASE DATA
-- ==========================================

-- Remove customer data (cascades to related records)
DELETE FROM customers;

-- Remove inventory data
DELETE FROM inventory;
DELETE FROM inventory_transactions;

-- Remove material data
DELETE FROM materials;

-- ==========================================
-- PHASE 5: RESET SEQUENCES
-- (Reset auto-increment counters)
-- ==========================================

DO $$
DECLARE
    seq_name TEXT;
    seq_record RECORD;
BEGIN
    -- Reset all sequences to start from 1
    FOR seq_record IN
        SELECT sequence_name, sequence_schema
        FROM information_schema.sequences
        WHERE sequence_schema = 'public'
    LOOP
        EXECUTE 'ALTER SEQUENCE ' || seq_record.sequence_schema || '.' || seq_record.sequence_name || ' RESTART WITH 1';
        RAISE NOTICE 'Reset sequence: %', seq_record.sequence_name;
    END LOOP;
END $$;

-- ==========================================
-- COMMIT ALL CHANGES
-- ==========================================
COMMIT;

-- ==========================================
-- VERIFICATION - CHECK CLEANUP RESULTS
-- ==========================================

SELECT 'AFTER CLEANUP - VERIFICATION' as status;

-- Check remaining row counts (should all be 0)
SELECT
    tablename,
    n_live_tup as "Remaining Rows"
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check specific important tables
SELECT
    'customers' as table_name, COUNT(*) as row_count FROM customers
UNION ALL
SELECT
    'orders' as table_name, COUNT(*) as row_count FROM orders
UNION ALL
SELECT
    'production_batches' as table_name, COUNT(*) as row_count FROM production_batches
UNION ALL
SELECT
    'employees' as table_name, COUNT(*) as row_count FROM employees
UNION ALL
SELECT
    'payments' as table_name, COUNT(*) as row_count FROM payments
UNION ALL
SELECT
    'gst_invoices' as table_name, COUNT(*) as row_count FROM gst_invoices;

-- Check sequence status
SELECT
    sequence_name,
    last_value,
    start_value,
    increment_by
FROM information_schema.sequences
WHERE sequence_schema = 'public'
ORDER BY sequence_name;

-- Show final database status
SELECT
    'CLEANUP COMPLETED' as "Status",
    COUNT(*) as "Tables in Database",
    SUM(CASE WHEN n_live_tup > 0 THEN 1 ELSE 0 END) as "Tables with Data",
    SUM(n_live_tup) as "Total Remaining Rows"
FROM pg_stat_user_tables
WHERE schemaname = 'public';

-- Show database size after cleanup
SELECT
    pg_size_pretty(pg_database_size(current_database())) as "Database Size After Cleanup",
    current_database() as "Database Name",
    NOW() as "Cleanup Completed At";

SELECT 'DATABASE CLEANUP COMPLETED SUCCESSFULLY!' as "FINAL STATUS";