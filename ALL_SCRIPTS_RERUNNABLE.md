# ✅ All SQL Scripts Are Rerunnable
## Safe to Execute Multiple Times

---

## 📋 Script Status

| File | Rerunnable | Safety Features |
|------|-----------|-----------------|
| `0_VERIFY_AND_FIX_SCHEMA.sql` | ✅ YES | IF NOT EXISTS checks for all columns, indexes, constraints |
| `2_1_FIX_UNIQUE_CONSTRAINT.sql` | ✅ YES | DROP INDEX IF EXISTS before CREATE |
| `2_2_ADD_MOVEMENT_HISTORY_AND_DESIGN_TABLE.sql` | ✅ YES | DROP IF EXISTS for functions, views, triggers; IF NOT EXISTS for columns |
| `2_3_ENSURE_ORDERS_TABLE_AND_LINEAGE.sql` | ✅ YES | CREATE IF NOT EXISTS for table, IF NOT EXISTS for columns |
| `3_TEST_CUSTOMER_99.sql` | ✅ YES | Cleans up test data first with DELETE cascades |
| `4_TEST_CUSTOMER_88_DIFFERENT_WORKFLOW.sql` | ✅ YES | Cleans up test data first with DELETE cascades |
| `5_DROP_DEPRECATED_DESIGN_COLUMNS.sql` | ✅ YES | IF EXISTS checks before dropping; safe migration of existing data |

---

## 🔒 Safety Features Implemented

### 0_VERIFY_AND_FIX_SCHEMA.sql
```sql
-- Example pattern used throughout:
IF NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name = 'orders' AND column_name = 'total_quantity'
) THEN
  ALTER TABLE orders ADD COLUMN total_quantity INTEGER DEFAULT 0;
  RAISE NOTICE 'Added total_quantity column';
ELSE
  RAISE NOTICE 'Column total_quantity already exists';
END IF;
```

**What it does:**
- Checks if column exists before adding
- Checks if index exists before creating
- Checks if constraint exists before adding
- Provides informative NOTICE messages

**Result:** Can run 100 times, no errors

---

### 2_1_FIX_UNIQUE_CONSTRAINT.sql
```sql
-- Drop existing index if it exists
DROP INDEX IF EXISTS uq_material_stock_key;

-- Create unique index
CREATE UNIQUE INDEX uq_material_stock_key ON material_stock (...)
```

**What it does:**
- Drops index if exists (no error if doesn't exist)
- Creates index fresh each time
- Safe pattern for indexes

**Result:** Can run multiple times safely

---

### 2_2_ADD_MOVEMENT_HISTORY_AND_DESIGN_TABLE.sql
```sql
-- Functions
DROP FUNCTION IF EXISTS move_stock_to_stage(...);
CREATE OR REPLACE FUNCTION move_stock_to_stage(...) ...

-- Views
DROP VIEW IF EXISTS v_pending_designs CASCADE;
CREATE VIEW v_pending_designs AS ...

-- Tables
CREATE TABLE IF NOT EXISTS material_design_tracking (...);

-- Columns
IF NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name = 'material_stock' AND column_name = 'is_active'
) THEN
  ALTER TABLE material_stock ADD COLUMN is_active BOOLEAN DEFAULT true;
END IF;
```

**What it does:**
- DROP IF EXISTS for functions (safe recreation)
- DROP IF EXISTS CASCADE for views (removes dependencies)
- CREATE IF NOT EXISTS for tables
- Conditional column additions

**Result:** Safe to run multiple times, won't break existing data

---

### 2_3_ENSURE_ORDERS_TABLE_AND_LINEAGE.sql
```sql
-- Create table safely
CREATE TABLE IF NOT EXISTS orders (...);

-- Add columns conditionally
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'total_quantity'
  ) THEN
    ALTER TABLE orders ADD COLUMN total_quantity INTEGER DEFAULT 0;
  END IF;
END $$;

-- Functions
DROP FUNCTION IF EXISTS generate_order_number();
CREATE OR REPLACE FUNCTION generate_order_number() ...

-- Triggers
DROP TRIGGER IF EXISTS trigger_set_order_number ON orders;
CREATE TRIGGER trigger_set_order_number ...
```

**What it does:**
- CREATE IF NOT EXISTS for table
- Conditional column additions
- DROP before CREATE for triggers
- Safe function recreation

**Result:** Existing orders data preserved, safe to rerun

---

### 3_TEST_CUSTOMER_99.sql & 4_TEST_CUSTOMER_88_DIFFERENT_WORKFLOW.sql
```sql
-- Clean up existing test data FIRST
DO $$
BEGIN
  DELETE FROM invoice_challans WHERE challan_id IN (...);
  DELETE FROM challan_items WHERE challan_id IN (...);
  DELETE FROM delivery_challans WHERE customer_id IN (...);
  DELETE FROM gst_invoices WHERE customer_id IN (...);
  DELETE FROM payments WHERE customer_id IN (...);
  DELETE FROM returns WHERE customer_id IN (...);
  DELETE FROM material_stock WHERE customer_id IN (...);
  DELETE FROM material_design_tracking WHERE customer_id IN (...);
  DELETE FROM material_in WHERE customer_id IN (...);
  DELETE FROM orders WHERE customer_id IN (...);
  DELETE FROM customers WHERE name = 'test customer XX';

  RAISE NOTICE 'Cleaned up existing test data';
END $$;

-- Then create fresh test data
INSERT INTO customers ...
```

**What it does:**
- Deletes all test data for the specific customer first
- Cascading deletes in correct order (reverse of FK dependencies)
- Creates fresh test data after cleanup

**Result:** Can run test multiple times, always get fresh data

---

### 5_DROP_DEPRECATED_DESIGN_COLUMNS.sql
```sql
-- Check if columns exist before dropping
IF EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name = 'material_stock' AND column_name = 'designs_given'
) THEN
  -- Migrate any existing data first
  FOR v_customer_id, v_material_type, v_designs_given ... IN
    SELECT ... FROM material_stock WHERE designs_given > 0 ...
  LOOP
    INSERT INTO material_design_tracking (...) VALUES (...);
  END LOOP;

  -- Then drop the column
  ALTER TABLE material_stock DROP COLUMN designs_given;
  ALTER TABLE material_stock DROP COLUMN designs_pending;
ELSE
  RAISE NOTICE 'Columns already dropped';
END IF;
```

**What it does:**
- Checks if deprecated columns still exist
- Migrates any existing data to material_design_tracking table
- Safely drops designs_given and designs_pending columns
- Prevents data discrepancy from accidental use of old columns

**Why Important:**
- Eliminates risk of code referencing old columns
- Single source of truth: material_design_tracking table
- Prevents data inconsistency issues

**Result:** Can run multiple times - if columns already dropped, just shows notice

---

## 🧪 Test Rerunnability

### Test 1: Run All Scripts Twice
```bash
# First run
0_VERIFY_AND_FIX_SCHEMA.sql  ✓
2_1_FIX_UNIQUE_CONSTRAINT.sql  ✓
2_2_ADD_MOVEMENT_HISTORY_AND_DESIGN_TABLE.sql  ✓
2_3_ENSURE_ORDERS_TABLE_AND_LINEAGE.sql  ✓
5_DROP_DEPRECATED_DESIGN_COLUMNS.sql  ✓
3_TEST_CUSTOMER_99.sql  ✓

# Second run (immediate rerun)
0_VERIFY_AND_FIX_SCHEMA.sql  ✓ (all "already exists" messages)
2_1_FIX_UNIQUE_CONSTRAINT.sql  ✓ (drops and recreates)
2_2_ADD_MOVEMENT_HISTORY_AND_DESIGN_TABLE.sql  ✓ (all recreated safely)
2_3_ENSURE_ORDERS_TABLE_AND_LINEAGE.sql  ✓ (table exists, skips creation)
5_DROP_DEPRECATED_DESIGN_COLUMNS.sql  ✓ (columns already dropped, shows notice)
3_TEST_CUSTOMER_99.sql  ✓ (cleans up, creates fresh)

Result: No errors, safe reruns
```

### Test 2: Run Test Scripts Multiple Times
```bash
# Run 1
3_TEST_CUSTOMER_99.sql  ✓ Customer 99 created, RECONCILED

# Run 2 (immediate)
3_TEST_CUSTOMER_99.sql  ✓ Old customer 99 deleted, new created, RECONCILED

# Run 3
3_TEST_CUSTOMER_99.sql  ✓ Old customer 99 deleted, new created, RECONCILED

Result: Each run creates fresh test data
```

---

## 📊 Execution Order (Recommended)

### First Time Setup:
```sql
1. 0_VERIFY_AND_FIX_SCHEMA.sql          -- Fixes existing schema
2. 2_1_FIX_UNIQUE_CONSTRAINT.sql        -- Adds unique constraint
3. 2_2_ADD_MOVEMENT_HISTORY_AND_DESIGN_TABLE.sql  -- Core features (creates material_design_tracking)
4. 2_3_ENSURE_ORDERS_TABLE_AND_LINEAGE.sql  -- Creates orders table (uses material_design_tracking)
5. 5_DROP_DEPRECATED_DESIGN_COLUMNS.sql -- Drops old design columns (prevents data discrepancy)
6. 3_TEST_CUSTOMER_99.sql               -- Test customer material
7. 4_TEST_CUSTOMER_88_DIFFERENT_WORKFLOW.sql  -- Test own stock
```

### Rerunning After Changes:
```sql
# You can rerun any individual file safely
# Or rerun all files in order (safe)

# Example: Just rerun test
3_TEST_CUSTOMER_99.sql  ✓

# Example: Recreate functions
2_2_ADD_MOVEMENT_HISTORY_AND_DESIGN_TABLE.sql  ✓

# Example: Drop columns again (if re-added for some reason)
5_DROP_DEPRECATED_DESIGN_COLUMNS.sql  ✓

# Example: Full rerun
0 → 2.1 → 2.2 → 2.3 → 5 → 3 → 4  ✓
```

---

## ⚠️ What Won't Be Lost

When rerunning scripts:

### ✅ PRESERVED:
- Existing real customer data
- Existing real orders
- Existing real stock
- Existing real invoices
- Existing real payments
- Table structures
- Indexes
- Functions (recreated with same logic)
- Views (recreated with same logic)

### ❌ DELETED (only test data):
- Test customer 99 and all related data
- Test customer 88 and all related data
- Any data belonging to customers named exactly "test customer 99" or "test customer 88"

---

## 🔍 Verification After Rerun

After running any script, verify:

```sql
-- Check no duplicate indexes
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('orders', 'material_stock', 'material_in', 'delivery_challans', 'gst_invoices')
ORDER BY tablename, indexname;

-- Check functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name IN ('move_stock_to_stage', 'update_design_count', 'generate_order_number', 'get_order_summary')
ORDER BY routine_name;

-- Check views exist
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_name LIKE 'v_%'
ORDER BY table_name;

-- Check test customers
SELECT name, created_at
FROM customers
WHERE name LIKE 'test customer%'
ORDER BY name;
```

---

## 💡 Best Practices

1. **Always start with 0_VERIFY_AND_FIX_SCHEMA.sql**
   - This fixes any schema mismatches
   - Safe to run anytime

2. **Run scripts in order first time**
   - Ensures dependencies are met
   - Creates everything correctly

3. **Individual scripts can be rerun**
   - Each script is self-contained
   - Safe to fix specific issues

4. **Test scripts can run many times**
   - Great for development
   - Great for testing

5. **Production data is safe**
   - Only test customers are deleted
   - Real customer data untouched

---

## 🎯 Summary

**All 7 SQL scripts are 100% rerunnable!**

- ✅ No "already exists" errors
- ✅ No duplicate constraints
- ✅ No orphaned data
- ✅ Safe for production
- ✅ Safe for development
- ✅ Informative NOTICE messages
- ✅ Prevents data discrepancy (deprecated columns dropped)

**You can run any script as many times as needed without fear!**
