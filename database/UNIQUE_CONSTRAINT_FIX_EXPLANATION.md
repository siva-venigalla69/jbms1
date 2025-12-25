# Unique Constraint Fix - Material Stock Table

## ❌ The Problem

**Error:**
```
ERROR: 23505: duplicate key value violates unique constraint
"material_stock_customer_id_order_id_material_type_stage_own_key"
```

**Root Cause:**
The `material_stock` table had a UNIQUE constraint on:
```sql
UNIQUE(customer_id, order_id, material_type, stage, ownership)
```

This constraint assumes **only ONE record** can exist per combination, which is **WRONG** for an Inventory Transaction Log pattern.

---

## 🔍 Why This Constraint Is Wrong

### The Constraint Prevents:

1. **Split Remainders:**
   ```
   Example: 50 units in 'received' stage
   Move 40 to 'preprocessing'

   Result should be:
   - 10 units stay in 'received' (new record, is_active=true)
   - 40 units move to 'preprocessing' (new record, is_active=true)
   - Original 50 units record (is_active=false, historical)

   But constraint blocks creating the "10 units in received" record!
   ```

2. **Multiple Batches:**
   ```
   Customer brings material in 3 batches:
   - Batch A: 20 sarees received on Dec-20
   - Batch B: 30 sarees received on Dec-21
   - Batch C: 15 sarees received on Dec-22

   All are in 'received' stage, but constraint allows only ONE!
   ```

3. **Proper Inventory Flow:**
   ```
   At any moment, customer can have:
   - 20 sarees in 'received'
   - 30 sarees in 'preprocessing'
   - 10 sarees in 'printing'
   - 5 sarees in 'misprint'

   This is NORMAL inventory flow, not duplication!
   ```

---

## ✅ The Solution

### What We Fixed:

1. **Updated `STEP_2_CREATE_SCHEMA.sql`**
   - Removed the UNIQUE constraint from table definition
   - Added comment explaining why it's not needed

2. **Updated `2_1_FIX_UNIQUE_CONSTRAINT.sql`**
   - Changed from ADDING constraint to REMOVING it
   - Added explanation of Inventory Transaction Log pattern

3. **Created `FIX_DROP_UNIQUE_CONSTRAINT_MATERIAL_STOCK.sql`**
   - One-time fix script to drop existing constraint
   - Safe to rerun

---

## 🎯 Correct Pattern: Inventory Transaction Log

### Primary Key Strategy:

**ONLY uniqueness constraint needed:**
```sql
PRIMARY KEY: id (UUID)
```

**Why this is correct:**
- Each record = unique stock lot/batch/transaction
- Multiple active records per stage = NORMAL
- Different batches at different times
- Stock flowing through pipeline

### No Natural Key Constraint:

**WRONG:**
```sql
UNIQUE(customer_id, order_id, material_type, stage, ownership)
-- This prevents multiple batches in same stage!
```

**CORRECT:**
```sql
-- NO UNIQUE constraint on business columns
-- Multiple records CAN exist for same customer+material+stage
-- They represent different batches/transactions
```

---

## 📋 How to Apply the Fix

### Option 1: Run Fix Script (Quickest)
```bash
# If constraint already exists, run this to drop it:
psql $DATABASE_URL -f FIX_DROP_UNIQUE_CONSTRAINT_MATERIAL_STOCK.sql
```

### Option 2: Run Updated Scripts (Clean rebuild)
```bash
# These scripts now remove the constraint:
psql $DATABASE_URL -f STEP_2_CREATE_SCHEMA.sql
psql $DATABASE_URL -f 2_1_FIX_UNIQUE_CONSTRAINT.sql
```

---

## 🔄 Impact on Stock Movement Function

### Before Fix (ERROR):
```sql
move_stock_to_stage(customer_id, order_id, 'SAREE', 'received', 'preprocessing', 40, 'customer')

-- Tries to create:
-- 1. New record: 10 SAREE in 'received' (remainder)
-- ERROR: Unique constraint violation!
```

### After Fix (SUCCESS):
```sql
move_stock_to_stage(customer_id, order_id, 'SAREE', 'received', 'preprocessing', 40, 'customer')

-- Successfully creates:
-- 1. Original: 50 SAREE in 'received' (is_active=false, historical)
-- 2. Remainder: 10 SAREE in 'received' (is_active=true, current)
-- 3. Moved: 40 SAREE in 'preprocessing' (is_active=true, current)
```

---

## 📊 Query Examples After Fix

### Get Current Stock (All Active Records):
```sql
SELECT stage, SUM(quantity) as total
FROM material_stock
WHERE customer_id = ?
  AND material_type = 'SAREE'
  AND is_active = true
GROUP BY stage;

-- Result:
-- stage          | total
-- --------------|------
-- received      | 10
-- preprocessing | 40
```

### Get All Batches in Same Stage:
```sql
SELECT id, quantity, created_at, batch_id
FROM material_stock
WHERE customer_id = ?
  AND material_type = 'SAREE'
  AND stage = 'received'
  AND is_active = true
ORDER BY created_at;

-- Result (multiple batches allowed!):
-- id    | qty | created_at | batch_id
-- -----|-----|------------|----------
-- uuid1 | 10  | Dec-20     | batch-A
-- uuid2 | 20  | Dec-21     | batch-B
```

---

## 🎉 Summary

**What Changed:**
- ❌ Removed UNIQUE constraint on (customer_id, order_id, material_type, stage, ownership)
- ✅ Kept PRIMARY KEY on id (UUID)
- ✅ Updated schema files to prevent recreating the constraint
- ✅ Created fix scripts to drop existing constraint

**Why:**
- This is Inventory Transaction Log pattern, NOT SCD Type 2
- Multiple batches can exist in same stage simultaneously
- Stock splits and flows through stages
- Each record is a unique transaction/batch

**Result:**
- ✅ `move_stock_to_stage()` function now works correctly
- ✅ Split remainders work
- ✅ Multiple batches in same stage allowed
- ✅ Proper inventory flow tracking

---

**See Also:**
- `STOCK_TRACKING_PATTERN_ANALYSIS.md` - Detailed pattern explanation
- `SCD_TYPE2_ANSWER.md` - Why this is NOT SCD Type 2
- `STOCK_AND_DESIGN_LOGIC_EXPLAINED.md` - Business logic
