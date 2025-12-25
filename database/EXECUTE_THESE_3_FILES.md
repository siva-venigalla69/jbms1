## 🚀 EXECUTE THESE 3 SQL FILES IN ORDER

**Total Time: 2 minutes**

---

### 📋 STEP 1: Fix Dashboard Error (30 seconds)

**File:** `FIX_DASHBOARD_VIEW.sql`

**What it does:**
- Fixes: "column v_outstanding_orders.pending_quantity does not exist"
- Adds missing column to track pending deliveries

**Execute:**
1. Open Supabase SQL Editor
2. Copy content of: `/database/FIX_DASHBOARD_VIEW.sql`
3. Paste and click RUN

**Expected output:**
```
Dashboard view fixed! Run: SELECT * FROM v_outstanding_orders;
```

---

### 📋 STEP 2: Add Design Tracking System (30 seconds)

**File:** `STEP_5_ADD_DESIGN_TRACKING.sql`

**What it does:**
- ✅ Adds `designs_given` column (designs from customer)
- ✅ Adds `designs_pending` column (auto-calculated)
- ✅ Creates `v_pending_designs` view (customer follow-up list)
- ✅ Creates `update_design_count()` function
- ✅ Auto-triggers to calculate pending designs

**Execute:**
1. Open Supabase SQL Editor
2. Copy content of: `/database/STEP_5_ADD_DESIGN_TRACKING.sql`
3. Paste and click RUN

**Expected output:**
```
========================================================================
STEP 5 COMPLETE!
========================================================================

Features Added:
  ✓ Track designs given by customer
  ✓ Track designs pending for follow-up
  ✓ Auto-calculate pending designs
  ✓ View for customer follow-up (v_pending_designs)
  ✓ Helper function to update design counts
```

---

### 📋 STEP 3: Test Complete Use Case (1 minute)

**File:** `TEST_USE_CASE_CUSTOMER_99_UPDATED.sql`

**What it does:**
Tests your EXACT requirements:

1. ✅ Create customer 99
2. ✅ Receive 50 sarees (20-Dec) + 40 sarees (21-Dec) = 90 total
3. ✅ Customer gives 30 designs → **60 designs pending** (follow-up needed!)
4. ✅ Prepare 40 designs (30 from customer + 10 repeated)
5. ✅ Move 40 sarees through production stages
6. ✅ **Quality check AFTER postprocessing** → 37 pass, 3 misprints
7. ✅ Create 2 delivery challans (20 + 17 sarees)
8. ✅ Generate invoice ₹4,012 (adjusted for 3 misprints)
9. ✅ Shows outstanding payment ₹4,012
10. ✅ **Complete reconciliation** - all stock balances!

**Execute:**
1. Open Supabase SQL Editor
2. Copy content of: `/database/TEST_USE_CASE_CUSTOMER_99_UPDATED.sql`
3. Paste and click RUN
4. **READ THE RECONCILIATION REPORT** at the end

**Expected output:**
```
========================================================================
SAREE RECONCILIATION CHECK
========================================================================
Total Sarees RECEIVED:     90 units
Current Stock (all stages): 53 units
  - In received stage:     50 units (pending 50 designs)
  - In misprint stage:     3 units
Delivered to customer:     37 units

Balance Check: 53 + 37 = 90 units
Expected:      90 units
Status:        ✓ RECONCILED

========================================================================
TEST COMPLETED SUCCESSFULLY!
========================================================================

Next Steps:
  1. Follow up with customer for 50 pending designs
  2. Collect payment of ₹4,012
  3. Sell 3 misprint sarees in misprint sales
```

---

## ✅ WHAT YOU'LL HAVE AFTER EXECUTION

### Design Tracking:
- Track designs given by customer: `designs_given`
- Track designs pending: `designs_pending` (auto-calculated)
- Follow-up list: `SELECT * FROM v_pending_designs`

### Quality Check Process:
- Misprints identified AFTER postprocessing (not during printing)
- Flow: `printing → postprocessing → quality_check → (completed OR misprint)`

### Customer Follow-up:
```sql
-- See all customers with pending designs
SELECT
  customer_name,
  material_type,
  total_quantity,
  designs_given,
  designs_pending,
  design_completion_pct || '%' as completion
FROM v_pending_designs
ORDER BY designs_pending DESC;
```

### Stock Reconciliation:
- Every piece of material is tracked
- Formula: `Material IN = Stock + Delivered + Misprints`
- Always balances!

---

## 🎯 QUICK REFERENCE

### Track Design Submission:
```sql
-- Customer gives 30 designs for sarees
SELECT update_design_count(
  '<customer_id>',  -- UUID of customer
  'SAREE',          -- Material type
  30,               -- Number of designs given
  'received'        -- Stage
);
```

### Check Pending Designs:
```sql
-- Who needs follow-up?
SELECT * FROM v_pending_designs;
```

### Move Stock with Design Tracking:
```sql
-- Move 40 sarees from received to preprocessing
-- Designs automatically carry forward!
SELECT move_stock_to_stage(
  '<customer_id>',
  NULL,
  'SAREE',
  'received',
  'preprocessing',
  40,
  'customer'
);
```

---

## 📊 TABLES UPDATED

### material_stock (NEW COLUMNS):
- `designs_given` INTEGER - Designs provided by customer
- `designs_pending` INTEGER - Auto-calculated (quantity - designs_given)

### NEW VIEW:
- `v_pending_designs` - Customer follow-up list

### NEW FUNCTION:
- `update_design_count()` - Update design counts easily

---

## 🔧 IF SOMETHING FAILS

### Error: "column already exists"
- **Solution:** Already added! Safe to continue.

### Error: "function already exists"
- **Solution:** Will be replaced. Safe to continue.

### Error: "view already exists"
- **Solution:** Will be replaced. Safe to continue.

### Dashboard still showing error?
- **Solution:** Also run `FIX_RLS_POLICIES.sql` to enable data access.

---

## ✨ THAT'S IT!

Execute the 3 files in order, then:

1. Check the reconciliation report
2. Verify designs_pending shows 50
3. Check v_pending_designs view
4. Test in frontend!

**All files are in:** `/home/siva/sandboxes/jbms1/database/`

---

**Ready? Start with FIX_DASHBOARD_VIEW.sql!**
