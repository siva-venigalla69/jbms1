# Testing Guide - Automated & Manual Testing

**Created**: 2025-12-20
**Purpose**: Guide for executing automated and manual tests

---

## Quick Start

### 1. Automated Testing

**Run the automated test suite:**

```bash
# Navigate to project root
cd /home/siva/sandboxes/jbms1

# Run the automated tests
node test_simplified_api_comprehensive.mjs
```

**Expected Output:**
```
========================================================================
AUTOMATED API TEST SUITE - SIMPLIFIED SCHEMA
========================================================================
Start Time: 2025-12-20...
Supabase URL: https://pvatfzwzfgioypdnqjay.supabase.co
========================================================================

🧪 Running: 1.1: Verify all 13 tables exist
✅ PASSED: 1.1: Verify all 13 tables exist

🧪 Running: 1.2: Verify material_types has 5 product types
✅ PASSED: 1.2: Verify material_types has 5 product types

... (all tests)

========================================================================
TEST RESULTS SUMMARY
========================================================================
Total Tests: 40
✅ Passed: 40
❌ Failed: 0
Success Rate: 100.00%
========================================================================
```

**Test Results File:**
- Automatically saved to: `test_results_YYYY-MM-DDTHH-MM-SS.json`
- Contains detailed results for each test

---

### 2. Manual Testing

**Follow the manual test plan:**

```bash
# Open the manual test plan
cat MANUAL_TEST_PLAN.md
```

**Testing Steps:**
1. Open Supabase SQL Editor OR Frontend Application
2. Follow each test case in `MANUAL_TEST_PLAN.md`
3. Execute SQL verification queries
4. Mark ✅ or ❌ in the Test Execution Record
5. Document any issues in the Issue Log

---

## Test Coverage

### Automated Tests (40 test cases)

**1. Schema Verification (3 tests)**
- 1.1: All 13 tables exist
- 1.2: 5 product types loaded
- 1.3: All 4 views exist

**2. Customer Management (2 tests)**
- 2.1: Create customer
- 2.2: Search customer

**3. Material Receipt (3 tests)**
- 3.1: Create material receipt
- 3.2: Verify receipt number format
- 3.3: Create stock entry

**4. Order Management (2 tests)**
- 4.1: Create order
- 4.2: Update order status

**5. Production Stock (3 tests)**
- 5.1: Move stock between stages
- 5.2: Verify stock distribution
- 5.3: Update design availability

**6. Delivery Challans (3 tests)**
- 6.1: Move stock to completed
- 6.2: Create delivery challan
- 6.3: Add challan items

**7. Invoices (3 tests)**
- 7.1: Create GST invoice
- 7.2: Link invoice to challan
- 7.3: Verify invoice-challan linkage

**8. Payments (2 tests)**
- 8.1: Record payment
- 8.2: Verify outstanding amount

**9. Returns & Misprints (3 tests)**
- 9.1: Create misprint return
- 9.2: Move stock to misprint stage
- 9.3: Create misprint sale

**10. Credit Notes (2 tests)**
- 10.1: Create credit note
- 10.2: Apply credit note

**11. Reports/Views (4 tests)**
- 11.1: Stock by customer report
- 11.2: Outstanding payments report
- 11.3: Outstanding orders report
- 11.4: Misprint stock report

**12. Business Logic Functions (2 tests)**
- 12.1: Get customer stock summary
- 12.2: Stock movement validation

**13. Auto-Generated IDs (1 test)**
- 13.1: Verify all ID formats

**14. Cleanup (1 test)**
- Soft delete test data

---

### Manual Tests (21 test cases)

See `MANUAL_TEST_PLAN.md` for complete list organized by feature area.

---

## Test Data Created

The automated test creates:
- 1 test customer
- 1 order
- 1 material receipt
- 100 units of stock (SAREE)
- 1 delivery challan with items
- 1 GST invoice
- 1 invoice-challan link
- 1 payment
- 1 return
- 1 misprint sale
- 1 credit note

**Test Data Cleanup:**
- Customer is soft-deleted (is_deleted = true)
- All linked records remain for verification
- Can be manually deleted from Supabase if needed

---

## Troubleshooting

### Test Fails: "relation does not exist"

**Problem**: Table or view doesn't exist
**Solution**: Re-run STEP_2_CREATE_SCHEMA.sql

```bash
# Check if tables exist
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

### Test Fails: "column does not exist"

**Problem**: Table schema mismatch
**Solution**: Re-run STEP_2_CREATE_SCHEMA.sql (it's idempotent)

```bash
# Check table columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'material_stock'
ORDER BY ordinal_position;
```

---

### Test Fails: "Insufficient stock"

**Problem**: Stock already moved in previous test run
**Solution**: This is expected for test 12.2 (validation test)
- If other tests fail with this, cleanup and re-run

---

### Test Fails: Permission denied

**Problem**: Supabase anon key doesn't have permissions
**Solution**: Check RLS policies in Supabase

```sql
-- Check RLS policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';
```

---

## Interpreting Results

### Success Criteria

✅ **All Tests Pass**: System is working correctly
- Success Rate: 100%
- All features functional
- Ready for production

⚠️ **Some Tests Fail**: Investigate failures
- Success Rate: 80-99%
- Review failed tests
- Fix issues and re-run

❌ **Many Tests Fail**: Major issues
- Success Rate: < 80%
- Review schema migration
- Check database connectivity
- Verify data integrity

---

## Test Results Files

### Automated Test Results

**File**: `test_results_YYYY-MM-DDTHH-MM-SS.json`

**Structure**:
```json
{
  "passed": 40,
  "failed": 0,
  "skipped": 0,
  "total": 40,
  "startTime": "2025-12-20T...",
  "endTime": "2025-12-20T...",
  "tests": [
    {
      "name": "1.1: Verify all 13 tables exist",
      "status": "PASSED",
      "error": null,
      "timestamp": "2025-12-20T..."
    },
    ...
  ]
}
```

---

### Manual Test Results

**File**: `MANUAL_TEST_PLAN.md`

**Update the Test Execution Record table**:
- Mark ✅ for passed tests
- Mark ❌ for failed tests
- Add notes in the Notes column
- Fill in Date and Tester columns

---

## Running Tests in CI/CD

### Netlify Build

Add to `package.json`:

```json
{
  "scripts": {
    "test": "node test_simplified_api_comprehensive.mjs",
    "build": "react-scripts build",
    "test:ci": "npm test && npm run build"
  }
}
```

Update `netlify.toml`:

```toml
[build]
  command = "npm run test:ci"
  publish = "build"
```

---

## Next Steps After Testing

### If All Tests Pass ✅

1. **Document Results**
   - Save test results files
   - Update MANUAL_TEST_PLAN.md
   - Take screenshots if needed

2. **Proceed with Deployment**
   - Run `npm run build`
   - Deploy to Netlify
   - Test on production URL

3. **User Acceptance Testing**
   - Invite users to test
   - Gather feedback
   - Fix any issues

---

### If Tests Fail ❌

1. **Investigate**
   - Review error messages
   - Check database schema
   - Verify data integrity

2. **Fix Issues**
   - Update SQL scripts
   - Re-run migration
   - Fix application code

3. **Re-test**
   - Run automated tests again
   - Run manual tests again
   - Verify all fixes

---

## Support

### Getting Help

**If automated tests fail:**
1. Check error message in console
2. Review test_results_*.json file
3. Look for pattern in failures
4. Check database schema

**If manual tests fail:**
1. Check SQL verification queries
2. Review database state
3. Check for data consistency
4. Review business logic

**Common Issues:**
- Schema not migrated: Re-run STEP_2
- Data conflicts: Clean up test data
- Permission issues: Check RLS policies
- Connection issues: Verify Supabase credentials

---

## Test Maintenance

### Updating Tests

**When adding new features:**
1. Add test cases to `MANUAL_TEST_PLAN.md`
2. Add automated tests to `test_simplified_api_comprehensive.mjs`
3. Update this guide with new test sections

**When schema changes:**
1. Update STEP_2_CREATE_SCHEMA.sql
2. Update test assertions
3. Re-run all tests

---

## Appendix: SQL Queries for Manual Verification

### Check All Auto-Generated Numbers

```sql
SELECT
  'Orders' as type,
  order_number as number,
  created_at
FROM orders
WHERE order_number LIKE 'ORD-%'
ORDER BY created_at DESC
LIMIT 5;

UNION ALL

SELECT
  'Receipts',
  receipt_number,
  created_at
FROM material_in
WHERE receipt_number LIKE 'RCP-%'
ORDER BY created_at DESC
LIMIT 5;

-- ... (similar for other types)
```

### Check Stock Distribution

```sql
SELECT
  c.name as customer,
  ms.material_type,
  ms.stage,
  ms.ownership,
  SUM(ms.quantity) as total_qty
FROM material_stock ms
LEFT JOIN customers c ON ms.customer_id = c.id
WHERE ms.quantity > 0
GROUP BY c.name, ms.material_type, ms.stage, ms.ownership
ORDER BY c.name, ms.material_type, ms.stage;
```

### Check Invoice-Challan Links

```sql
SELECT
  inv.invoice_number,
  inv.total_amount,
  STRING_AGG(dc.challan_number, ', ') as challan_numbers,
  COUNT(ic.id) as num_challans
FROM gst_invoices inv
LEFT JOIN invoice_challans ic ON inv.id = ic.invoice_id
LEFT JOIN delivery_challans dc ON ic.challan_id = dc.id
GROUP BY inv.id, inv.invoice_number, inv.total_amount
ORDER BY inv.created_at DESC
LIMIT 10;
```

---

**Ready to test! Run the automated tests and follow the manual test plan.**
