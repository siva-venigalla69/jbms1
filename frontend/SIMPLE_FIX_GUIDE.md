# Simple Fix Guide - Dashboard Error

## What I Understand About Your Business

### Your Business Model:
1. **Job Work Printing** - Customers give you fabric (sarees, duppattas, vonis), you print designs and return
2. **Own Stock Sales** - You also have your own fabric that you sell
3. **Two Types of Material**:
   - `ownership='customer'` → Customer's material (job work)
   - `ownership='self'` → Your own stock (sales)

### Material Flow:
```
Customer Material → Received → Preprocessing → Printing → Postprocessing → Completed → Delivery → Invoice → Payment
                                    ↓
                                Misprints (sold separately)
```

### What's Already Working:
✅ 4-step database migration done (STEP_1 to STEP_4)
✅ 13-table simplified schema created
✅ Material receipt tracking with ownership flag
✅ Stock movement between stages
✅ Delivery challans
✅ GST invoices
✅ Payments tracking

---

## Current Errors & Simple Fixes

### Error 1: Dashboard View Missing Column
**Error:** `column v_outstanding_orders.pending_quantity does not exist`

**Fix:** Run this SQL in Supabase:
```
File: /home/siva/sandboxes/jbms1/database/FIX_DASHBOARD_VIEW.sql
Time: 30 seconds
```

This adds the missing `pending_quantity` column to track deliveries.

---

### Error 2: Stock Movement "Insufficient Stock"
**Error:** `Failed to move stock: Insufficient stock in preprocessing stage. Available: 0, Requested: 20`

**This is CORRECT!** It means:
- You're trying to move 20 items from preprocessing
- But there are 0 items in preprocessing stage
- System is protecting you from moving stock that doesn't exist

**Solution:** First receive material, THEN move it through stages.

---

## Test Your Use Case (Customer 99)

I created a complete test script that does EXACTLY what you described:

**File:** `/home/siva/sandboxes/jbms1/database/TEST_USE_CASE_CUSTOMER_99.sql`

**What it does:**
1. ✅ Creates customer "test customer 99"
2. ✅ Receives stock on 20-Dec (50 sarees, 20 duppattas, 5 vonis, 10 running)
3. ✅ Receives more stock on 21-Dec (40 sarees)
4. ✅ Marks designs as available (simple boolean flag)
5. ✅ Moves 40 sarees: received → preprocessing → printing → postprocessing → completed
6. ✅ Handles 3 misprints during printing
7. ✅ Creates 2 delivery challans (20 + 17 sarees)
8. ✅ Generates invoice for ₹4,012 (37 sarees, adjusted for 3 misprints)
9. ✅ Shows outstanding payment

**Run this SQL to test everything at once!**

---

## What to Execute Now (Simple 2 Steps)

### Step 1: Fix Dashboard (30 seconds)
```sql
-- Open Supabase SQL Editor
-- Copy/paste content of: /home/siva/sandboxes/jbms1/database/FIX_DASHBOARD_VIEW.sql
-- Click RUN
```

### Step 2: Test Complete Flow (1 minute)
```sql
-- Open Supabase SQL Editor
-- Copy/paste content of: /home/siva/sandboxes/jbms1/database/TEST_USE_CASE_CUSTOMER_99.sql
-- Click RUN
-- Read the reconciliation report at the end
```

---

## About Design Tracking (Keeping it Simple)

**Your Requirement:**
- Track "30 designs given by customer, 40 designs prepared"

**Current System (SIMPLE):**
- `designs_available` = true/false (boolean flag)
- `design_notes` = text field for notes like "30 given, 40 ready"

**Why it's simple:**
- Non-technical users don't need to enter counts
- Just mark checkbox "Designs Available" ✓
- Add notes if needed

**If you need detailed tracking later:**
- Can add `designs_given INTEGER` column
- Can add `designs_ready INTEGER` column
- For now, keeping it simple as requested!

---

## Stock Reconciliation Logic

**Formula:**
```
Total Material IN = Stock in all stages + Delivered + Misprints
```

**For Customer 99 Example:**
```
SAREES:
  Total IN: 90 (50 + 40)

  Stock Breakdown:
  - Received stage: 50 (not yet processed)
  - Completed stage: 0 (all delivered)
  - Misprint stage: 3 (defects)
  - Delivered: 37 (via 2 challans)

  Check: 50 + 0 + 3 + 37 = 90 ✓ (Reconciles!)
```

---

## Outstanding Payment Tracking

**How it works:**
1. Invoice created = ₹4,012 (job work for 37 sarees)
2. Payment received = ₹0 (not paid yet)
3. Outstanding = ₹4,012 (shows in dashboard)

**When customer pays:**
- Record payment in Payments page
- Outstanding automatically reduces
- Dashboard updates in real-time

---

## Production Stock Page (Adding Customer Name)

**Current columns:**
- Material Type
- Stage
- Quantity
- Ownership

**You want:**
- Add Customer Name column

**Simple fix:** Will update the ProductionStock.tsx page to show customer names for each stock entry.

---

## Next Steps

1. **Run FIX_DASHBOARD_VIEW.sql** (fixes dashboard error)
2. **Run TEST_USE_CASE_CUSTOMER_99.sql** (validates entire flow)
3. **Check results** (see reconciliation report)
4. **Test in frontend** (manual testing through UI)
5. **Let me know if it works!**

---

## Files Created Today

1. `FIX_DASHBOARD_VIEW.sql` - Adds pending_quantity column
2. `TEST_USE_CASE_CUSTOMER_99.sql` - Complete test case
3. `FIX_RLS_POLICIES.sql` - Enables data access (run if data not loading)

**All in:** `/home/siva/sandboxes/jbms1/database/`

---

## If Something Doesn't Work

**Dashboard still showing error?**
- Run FIX_RLS_POLICIES.sql to enable data access

**Stock movement failing?**
- Check if material was received first
- Check if enough quantity available in source stage

**Invoice not showing?**
- Check if delivery challans exist
- Check if customer has material

---

## Keeping It Simple for Users

✅ Simple boolean checkboxes (not complex number entry)
✅ Auto-generated IDs (users don't type order numbers)
✅ Dropdown selections (not free text)
✅ Clear stage names (Received, Printing, Completed)
✅ One ownership flag (Customer Material vs Own Stock)

**This is what "simple for non-technical users" means!**

---

Ready to test? Run the 2 SQL files and let me know the results!
