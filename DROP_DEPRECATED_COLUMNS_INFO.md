# ✅ NEW: Script to Drop Deprecated Design Columns

## 🎯 Why This Script Was Created

You correctly identified that having **both old and new design columns** creates a risk of data discrepancy. If code accidentally references the old columns (`material_stock.designs_given`, `material_stock.designs_pending`) instead of the new table (`material_design_tracking`), it could lead to inconsistent data.

## 📄 New File Created

**File:** `/home/siva/sandboxes/jbms1/database/5_DROP_DEPRECATED_DESIGN_COLUMNS.sql`

**Purpose:** Permanently drops the deprecated design columns from `material_stock` table to prevent accidental use.

## 🔒 What This Script Does

### Step 1: Verification
- Checks that `material_design_tracking` table exists
- Raises error if table missing (you must run script 2.2 first)

### Step 2: Data Migration (Safety)
- Scans `material_stock` for any remaining design data
- Migrates it to `material_design_tracking` table
- Ensures no data is lost

### Step 3: Drop Columns
- Drops `material_stock.designs_given` column
- Drops `material_stock.designs_pending` column
- Shows confirmation messages

### Step 4: Verification Report
- Confirms columns are dropped
- Shows record count in `material_design_tracking`
- Displays final schema

## ✅ Safety Features

### 100% Rerunnable
```sql
IF EXISTS (column exists) THEN
  -- Migrate data if any
  -- Drop column
ELSE
  RAISE NOTICE 'Column already dropped';
END IF;
```

### Data Protection
- Migrates existing data **before** dropping columns
- Uses ON CONFLICT DO NOTHING to prevent duplicates
- Labels migrated data with 'MIGRATED_' prefix

### No Breaking Changes
- Frontend already uses `material_design_tracking` table
- Database functions already use `material_design_tracking` table
- Views already use `material_design_tracking` table

## 📊 Updated Execution Order

### All 7 SQL Files (Run in Order):

```sql
0. 0_VERIFY_AND_FIX_SCHEMA.sql              ⚠️ RUN FIRST!
   ✅ Fixes "column does not exist" errors
   ✅ Adds missing columns safely

1. 2_1_FIX_UNIQUE_CONSTRAINT.sql
   ✅ Adds unique index

2. 2_2_ADD_MOVEMENT_HISTORY_AND_DESIGN_TABLE.sql
   ✅ Adds is_active column
   ✅ Creates material_design_tracking table
   ✅ Updates all functions

3. 2_3_ENSURE_ORDERS_TABLE_AND_LINEAGE.sql
   ✅ Creates orders table
   ✅ Auto-generates order numbers
   ✅ Uses material_design_tracking (created in step 2)

4. 5_DROP_DEPRECATED_DESIGN_COLUMNS.sql     ⚠️ NEW - Prevents data discrepancy!
   ✅ Migrates any remaining design data
   ✅ Drops old designs_given/designs_pending columns
   ✅ Single source of truth: material_design_tracking table

5. 3_TEST_CUSTOMER_99.sql
   ✅ Tests job work workflow
   ✅ Should show: "RECONCILED!"

6. 4_TEST_CUSTOMER_88_DIFFERENT_WORKFLOW.sql
   ✅ Tests sales workflow
   ✅ Should show: "RECONCILED!"
```

**Total Time: 23 minutes** (added 1 minute for new script)

## 🎯 Impact

### Before (With Deprecated Columns):
- ⚠️ Risk: Code might accidentally use `material_stock.designs_given`
- ⚠️ Risk: Data could be in two places (stock table + design tracking table)
- ⚠️ Risk: Confusion about which is the source of truth

### After (Columns Dropped):
- ✅ **Single source of truth:** `material_design_tracking` table only
- ✅ **No accidental usage:** Old columns don't exist anymore
- ✅ **Data consistency:** All design data in one place
- ✅ **Code clarity:** Developers know exactly where to look

## 📖 Documentation Updates

All documentation has been updated to include this new script:

1. **FINAL_SUMMARY.md**
   - Updated file count: 16 → 17 total files
   - Updated database files: 6 → 7 SQL files
   - Added script 5 to execution order
   - Updated total time: 22 → 23 minutes

2. **ALL_SCRIPTS_RERUNNABLE.md**
   - Added script 5 to rerunnability table
   - Added detailed safety features section
   - Updated execution order examples
   - Updated summary: 6 → 7 scripts

3. **0_VERIFY_AND_FIX_SCHEMA.sql**
   - Updated comments to mention script 5 will drop the columns
   - Added message when columns are already dropped

## 🚀 Next Steps

### Execute the Scripts

1. **Open Supabase SQL Editor**

2. **Execute in this exact order:**
   ```
   0_VERIFY_AND_FIX_SCHEMA.sql
   2_1_FIX_UNIQUE_CONSTRAINT.sql
   2_2_ADD_MOVEMENT_HISTORY_AND_DESIGN_TABLE.sql
   2_3_ENSURE_ORDERS_TABLE_AND_LINEAGE.sql
   5_DROP_DEPRECATED_DESIGN_COLUMNS.sql  ← NEW!
   3_TEST_CUSTOMER_99.sql
   4_TEST_CUSTOMER_88_DIFFERENT_WORKFLOW.sql
   ```

3. **After running script 5, verify:**
   - You should see: "✓ Dropped column: material_stock.designs_given"
   - You should see: "✓ Dropped column: material_stock.designs_pending"
   - You should see: "✅ SUCCESS: All deprecated columns dropped!"

## ⚠️ Important Notes

1. **Run script 5 AFTER scripts 0-2** (needs material_design_tracking table to exist from script 2.2)
2. **Run script 5 AFTER script 2.3** (script 2.3 references design tracking in views)
3. **Run script 5 BEFORE test scripts** (tests don't use old columns)
4. **Existing data is safe** - migrated before dropping
5. **Frontend code is ready** - already uses new table
6. **Rerunnable** - safe to run multiple times

## 🎉 Benefits

- ✅ Eliminates data discrepancy risk
- ✅ Single source of truth enforced at database level
- ✅ Cleaner schema
- ✅ Better code maintainability
- ✅ Prevents future bugs

---

**Great catch on identifying this risk! The new script ensures data consistency.**
