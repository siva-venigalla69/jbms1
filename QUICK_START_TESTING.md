# 🚀 Quick Start - Testing Guide
## Execute All Tests in 30 Minutes

---

## ⚡ Super Quick (15 min)

### 1. Database (5 min)
```bash
# Open Supabase SQL Editor
# Execute these files IN ORDER:
0. 0_VERIFY_AND_FIX_SCHEMA.sql  ⚠️ RUN THIS FIRST!
1. 2_1_FIX_UNIQUE_CONSTRAINT.sql
2. 2_2_ADD_MOVEMENT_HISTORY_AND_DESIGN_TABLE.sql
3. 2_3_ENSURE_ORDERS_TABLE_AND_LINEAGE.sql
4. 5_DROP_DEPRECATED_DESIGN_COLUMNS.sql
```

### 2. Run Test Cases (10 min)
```bash
# Execute in Supabase:
5. 3_TEST_CUSTOMER_99.sql  # Should show RECONCILED!
6. 4_TEST_CUSTOMER_88_DIFFERENT_WORKFLOW.sql  # Should show RECONCILED!
```

**✅ All scripts are RERUNNABLE!** Safe to execute multiple times.
See: `ALL_SCRIPTS_RERUNNABLE.md` for details.

### 3. API Tests (5 min)
```bash
cd /home/siva/sandboxes/jbms1/tests
cp .env.example .env
# Edit .env - add your Supabase URL and anon key
npm install
npm test
# Should see: "ALL TESTS PASSED!"
```

---

## 📋 Detailed Steps

### Step 1: Database Setup

**File 1:** `2_3_ENSURE_ORDERS_TABLE_AND_LINEAGE.sql`
```sql
-- Expected output:
STEP 2.3 COMPLETE - Orders table and lineage tracking ensured!
```

**File 2:** `2_1_FIX_UNIQUE_CONSTRAINT.sql`
```sql
-- Expected output:
UNIQUE CONSTRAINT ADDED - move_stock_to_stage will now work!
```

**File 3:** `2_2_ADD_MOVEMENT_HISTORY_AND_DESIGN_TABLE.sql`
```sql
-- Expected output:
STEP 2.2 COMPLETE - Movement history and design tracking table added!
```

### Step 2: Test Customer 99 (Job Work)

**File:** `3_TEST_CUSTOMER_99.sql`

**Expected Final Output:**
```
SAREE RECONCILIATION:
Total RECEIVED:     90 units
Total in STOCK:     90 units
DELIVERED:          37 units
Status: RECONCILED!

Stock Breakdown:
- 50 in received stage (pending designs)
- 37 in delivered stage (invoiced)
- 3 in misprint stage (to be sold separately)

STEP 3 COMPLETE - Test successful with complete order lineage!
```

### Step 3: Test Customer 88 (Sales)

**File:** `4_TEST_CUSTOMER_88_DIFFERENT_WORKFLOW.sql`

**Expected Final Output:**
```
DUPATTA RECONCILIATION (OWN STOCK):
Total RECEIVED:     100 units
Total in STOCK:     100 units
DELIVERED:          95 units
MISPRINT:           5 units
Status: RECONCILED!

Key Differences:
- Ownership: SELF (own stock, not customer material)
- Invoice Type: SALES (not job work)
- No design tracking needed (we have designs)

STEP 4 COMPLETE - Customer 88 test successful (OWN STOCK workflow)!
```

### Step 4: Automated API Tests

```bash
cd /home/siva/sandboxes/jbms1/tests

# 1. Setup
cp .env.example .env
nano .env  # Add your credentials

# 2. Install
npm install

# 3. Run
npm test
```

**Expected Output:**
```
═══════════════════════════════════════════════════════════
  🚀 Automated API Tests - Digital Textile Printing System
═══════════════════════════════════════════════════════════

▶ Test 1: Create Customer
  ✓ Customer created with ID: ...

▶ Test 2: Create Order with Auto-Generated Order Number
  ✓ Order created: ORD-000003

... (9 more tests) ...

═══════════════════════════════════════════════════════════
  ✅ Test Results
═══════════════════════════════════════════════════════════
  ALL TESTS PASSED!
  ℹ Total Tests: 11
  ℹ Duration: 3.45s
```

---

## ✅ Success Checklist

After running all tests, verify:

### Database
- [ ] Orders table created
- [ ] Order numbers auto-generate (ORD-000001, ORD-000002)
- [ ] material_design_tracking table exists
- [ ] Customer 99 reconciled (90 = 50 + 37 + 3)
- [ ] Customer 88 reconciled (100 = 95 + 5)
- [ ] Movement history preserved (check with query below)

### API
- [ ] All 11 tests passed
- [ ] test-report.json shows "SUCCESS"
- [ ] No errors in output

### Verification Query
```sql
-- Check movement history
SELECT
  customer_id,
  material_type,
  stage,
  quantity,
  is_active,
  created_at
FROM material_stock
WHERE customer_id IN (
  SELECT id FROM customers WHERE name LIKE 'test customer%'
)
ORDER BY customer_id, created_at DESC
LIMIT 30;

-- Should see both is_active=true (current) and is_active=false (history)
```

---

## 🐛 Troubleshooting

### Error: "there is no unique or exclusion constraint"
**Fix:** Run `2_1_FIX_UNIQUE_CONSTRAINT.sql` first

### Error: "column is_active does not exist"
**Fix:** Run `2_2_ADD_MOVEMENT_HISTORY_AND_DESIGN_TABLE.sql`

### Error: "table material_design_tracking does not exist"
**Fix:** Run `2_2_ADD_MOVEMENT_HISTORY_AND_DESIGN_TABLE.sql`

### API Tests: "SUPABASE_ANON_KEY not found"
**Fix:** Create `.env` file from `.env.example` and add your credentials

### API Tests: All tests timeout
**Fix:** Check Supabase URL is correct in `.env`

---

## 📊 What Gets Tested

| Feature | Customer 99 | Customer 88 | API Tests |
|---------|-------------|-------------|-----------|
| Orders & Lineage | ✅ | ✅ | ✅ |
| Material Receipt | ✅ | ✅ | ✅ |
| Design Tracking | ✅ | ❌ | ✅ |
| Stock Movement | ✅ | ✅ | ✅ |
| Movement History | ✅ | ✅ | ✅ |
| Quality Check | ✅ | ✅ | ❌ |
| Delivered Stage | ✅ | ✅ | ❌ |
| Job Work Invoice | ✅ | ❌ | ❌ |
| Sales Invoice | ❌ | ✅ | ❌ |
| Payment | ❌ | ✅ | ❌ |
| Reconciliation | ✅ | ✅ | ✅ |

---

## 📁 File Locations

### Database SQL Files
```
/home/siva/sandboxes/jbms1/database/
├── 2_1_FIX_UNIQUE_CONSTRAINT.sql
├── 2_2_ADD_MOVEMENT_HISTORY_AND_DESIGN_TABLE.sql
├── 2_3_ENSURE_ORDERS_TABLE_AND_LINEAGE.sql
├── 3_TEST_CUSTOMER_99.sql
└── 4_TEST_CUSTOMER_88_DIFFERENT_WORKFLOW.sql
```

### API Tests
```
/home/siva/sandboxes/jbms1/tests/
├── package.json
├── .env.example
├── api-tests.js
├── README.md
└── test-report.json (generated after running)
```

### Documentation
```
/home/siva/sandboxes/jbms1/
├── QUICK_START_TESTING.md (this file)
├── COMPLETE_TESTING_SUMMARY.md (detailed)
├── API_TESTING_GUIDE.md (API reference)
├── EXECUTION_PLAN_NEXT_STEPS.md (step-by-step)
└── SESSION_CONTEXT_2025-12-22.md (architecture)
```

---

## ⏱️ Time Estimate

| Phase | Duration |
|-------|----------|
| Database setup (3 files) | 5 min |
| Database tests (2 files) | 5 min |
| API test setup | 2 min |
| API test execution | 1 min |
| Verification | 2 min |
| **Total** | **15 min** |

---

## 🎯 Next Steps

After all tests pass:

1. **Frontend:** Update `ProductionStock.tsx` (see EXECUTION_PLAN_NEXT_STEPS.md)
2. **Build:** Run `npm run build` in frontend
3. **Manual Test:** Test Production Stock page manually
4. **Deploy:** Push to production

---

**Start now!** Execute the SQL files in Supabase SQL Editor.
