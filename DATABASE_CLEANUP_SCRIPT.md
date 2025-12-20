# 🗑️ Database Cleanup Script - Remove All Test Data

## 📋 Overview
This document provides comprehensive SQL commands to remove all test data from the textile manufacturing database while preserving the schema structure. The cleanup is organized by dependency order to avoid foreign key constraint violations.

---

## ⚠️ **IMPORTANT WARNINGS**

### 🚨 **BACKUP FIRST**
```sql
-- Create a backup before running cleanup
pg_dump -h your_host -U your_user -d your_database > backup_before_cleanup_$(date +%Y%m%d_%H%M%S).sql
```

### 🔒 **This Operation is IRREVERSIBLE**
- All test data will be permanently deleted
- Schema structure will remain intact
- Sequences will be reset to start values
- Only run on test/development databases

---

## 🔄 **Step 1: Check Current Data Status**

First, check what data exists in your database:

```sql
-- Check table row counts before cleanup
SELECT
    schemaname,
    tablename,
    n_live_tup as "Live Rows"
FROM pg_stat_user_tables
WHERE schemaname = 'public'
    AND n_live_tup > 0
ORDER BY n_live_tup DESC;
```

---

## 🗑️ **Step 2: Data Cleanup (Order-Dependent)**

### **Phase 1: Transaction & Financial Data (Highest Dependencies)**

```sql
-- ==========================================
-- FINANCIAL & TRANSACTION DATA CLEANUP
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
```

### **Phase 2: Production & Order Data**

```sql
-- ==========================================
-- PRODUCTION & ORDER DATA CLEANUP
-- ==========================================

-- Remove production batch data
DELETE FROM production_batches;
DELETE FROM production_batch_items;
DELETE FROM production_batch_updates;

-- Remove design assignments
DELETE FROM design_assignments;

-- Remove order data (this will cascade to order_items due to foreign keys)
DELETE FROM order_items;
DELETE FROM orders;

-- Remove design library
DELETE FROM design_library;
DELETE FROM design_files;
```

### **Phase 3: Employee & User Data**

```sql
-- ==========================================
-- EMPLOYEE & USER DATA CLEANUP
-- ==========================================

-- Remove employee-related data
DELETE FROM employees;
DELETE FROM designer_assignments;
DELETE FROM user_profiles;
```

### **Phase 4: Customer & Base Data**

```sql
-- ==========================================
-- CUSTOMER & BASE DATA CLEANUP
-- ==========================================

-- Remove customer data (will cascade to related records)
DELETE FROM customers;

-- Remove inventory data
DELETE FROM inventory;
DELETE FROM inventory_transactions;

-- Remove material data
DELETE FROM materials;
```

### **Phase 5: Reference Data (Optional - Keep for Schema)**

```sql
-- ==========================================
-- REFERENCE DATA CLEANUP (OPTIONAL)
-- Only run if you want to clear reference data too
-- ==========================================

-- Comment out if you want to keep reference data
/*
DELETE FROM material_types;
DELETE FROM order_statuses;
DELETE FROM payment_methods;
DELETE FROM production_stages;
DELETE FROM return_reasons;
DELETE FROM user_roles;
*/
```

---

## 🔢 **Step 3: Reset Sequences (Auto-Increment Counters)**

```sql
-- ==========================================
-- RESET SEQUENCES TO START VALUES
-- ==========================================

-- Reset all sequences to start from 1
DO $$
DECLARE
    seq_name TEXT;
BEGIN
    FOR seq_name IN
        SELECT sequence_name
        FROM information_schema.sequences
        WHERE sequence_schema = 'public'
    LOOP
        EXECUTE 'ALTER SEQUENCE ' || seq_name || ' RESTART WITH 1';
    END LOOP;
END $$;
```

---

## 🔍 **Step 4: Verify Cleanup**

After running the cleanup, verify that data has been removed:

```sql
-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Check remaining row counts
SELECT
    tablename,
    n_live_tup as "Remaining Rows"
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check specific tables that should be empty
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
    'payments' as table_name, COUNT(*) as row_count FROM payments;

-- Verify sequences have been reset
SELECT
    sequence_name,
    last_value,
    start_value
FROM information_schema.sequences
WHERE sequence_schema = 'public'
ORDER BY sequence_name;
```

---

## 🚀 **Step 5: Optimize Database (Optional)**

After cleanup, optimize the database:

```sql
-- ==========================================
-- DATABASE OPTIMIZATION (OPTIONAL)
-- ==========================================

-- Reclaim disk space and update statistics
VACUUM FULL;

-- Update table statistics for query planner
ANALYZE;

-- Show database size after cleanup
SELECT
    pg_size_pretty(pg_database_size(current_database())) as "Database Size";
```

---

## 📜 **Complete Cleanup Script (All-in-One)**

```sql
-- ==========================================
-- COMPLETE DATABASE CLEANUP SCRIPT
-- Run all commands in sequence
-- ==========================================

BEGIN;

-- Phase 1: Financial & Transaction Data
DELETE FROM payments;
DELETE FROM salary_payments;
DELETE FROM gst_invoices;
DELETE FROM invoice_line_items;
DELETE FROM delivery_challans;
DELETE FROM delivery_challan_items;
DELETE FROM purchases;
DELETE FROM purchase_items;
DELETE FROM expenses;
DELETE FROM material_returns;
DELETE FROM material_out;
DELETE FROM material_in;
DELETE FROM material_stock;
DELETE FROM quality_checks;
DELETE FROM customer_designs;
DELETE FROM customer_design_files;

-- Phase 2: Production & Order Data
DELETE FROM production_batches;
DELETE FROM production_batch_items;
DELETE FROM production_batch_updates;
DELETE FROM design_assignments;
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM design_library;
DELETE FROM design_files;

-- Phase 3: Employee & User Data
DELETE FROM employees;
DELETE FROM designer_assignments;
DELETE FROM user_profiles;

-- Phase 4: Customer & Base Data
DELETE FROM customers;
DELETE FROM inventory;
DELETE FROM inventory_transactions;
DELETE FROM materials;

-- Reset sequences
DO $$
DECLARE
    seq_name TEXT;
BEGIN
    FOR seq_name IN
        SELECT sequence_name
        FROM information_schema.sequences
        WHERE sequence_schema = 'public'
    LOOP
        EXECUTE 'ALTER SEQUENCE ' || seq_name || ' RESTART WITH 1';
    END LOOP;
END $$;

-- Commit all changes
COMMIT;

-- Verify cleanup
SELECT
    tablename,
    n_live_tup as "Remaining Rows"
FROM pg_stat_user_tables
WHERE schemaname = 'public'
    AND n_live_tup > 0
ORDER BY tablename;
```

---

## 📋 **Table Dependencies Reference**

### **High-Level Dependency Order:**
1. **Financial Records** → Reference Orders, Customers, Batches
2. **Production Batches** → Reference Orders, Order Items
3. **Orders & Order Items** → Reference Customers
4. **Employee Records** → Self-contained
5. **Customer Records** → Base level
6. **Reference Tables** → Lowest level (usually kept)

### **Key Foreign Key Relationships:**
- `payments` → `gst_invoices` → `orders` → `customers`
- `production_batches` → `orders` → `customers`
- `delivery_challans` → `production_batches`
- `design_assignments` → `orders` → `customers`
- `material_stock` → `customers`

---

## ✅ **Post-Cleanup Checklist**

- [ ] **Backup created** before cleanup
- [ ] **All commands executed** without errors
- [ ] **Row counts verified** (should be 0 for data tables)
- [ ] **Sequences reset** to start values
- [ ] **Database optimized** (VACUUM/ANALYZE run)
- [ ] **Application tested** with clean database
- [ ] **Fresh test data** can be created if needed

---

## 🔧 **Troubleshooting**

### **Common Issues:**

1. **Foreign Key Constraint Errors:**
   ```sql
   -- Temporarily disable constraints (use carefully)
   SET CONSTRAINTS ALL DEFERRED;
   -- Run cleanup commands
   SET CONSTRAINTS ALL IMMEDIATE;
   ```

2. **Permission Errors:**
   - Ensure you have DELETE permissions on all tables
   - Connect as database owner or superuser

3. **Large Dataset Performance:**
   ```sql
   -- For very large tables, delete in batches
   DELETE FROM large_table WHERE id IN (
       SELECT id FROM large_table LIMIT 10000
   );
   ```

---

## 🎯 **Final Notes**

- **Test Environment Only**: Only run on development/test databases
- **Production Warning**: Never run on production without proper backup and approval
- **Schema Preservation**: This script only removes data, not schema structure
- **Reference Data**: Consider keeping reference data for faster testing setup
- **Fresh Start**: After cleanup, your database is ready for fresh test data

---

*Created: September 16, 2025*
*Purpose: Complete test data removal for textile manufacturing database*
*Status: Ready for execution*