# Next Steps: Manual & Automated Testing
**Digital Textile Printing Job Work Management System**
**Date:** 2025-12-23 (Updated)

---

## 📋 Quick Reference

**Main Documentation:** `COMPLETE_SYSTEM_DMD.md` (contains complete traceability and testing guides)

**Status:**
- ✅ Phase 1 migration complete (delivered stage fix)
- ✅ Phase 2 migration complete (order-level design tracking)
- ✅ Phase 3 migration complete (batch lineage)
- ✅ Test scripts fixed (SUM instead of COUNT in 10_TEST_PHASE_1)
- ✅ Schema mismatch fixed (gst_invoices table in 3_TEST_CUSTOMER_99.sql)
- ⚠️ Frontend updates pending (breaking change)

---

## 🧪 Immediate Testing Steps

### Step 1: Verify Latest Fix (2 minutes)

**Test the fix we just applied:**

```bash
# Execute via Supabase SQL Editor or psql:
psql $DATABASE_URL -f database/10_TEST_PHASE_1_DELIVERED_STAGE.sql
```

**Expected Output:**
```
PHASE 1 TEST: PASSED ✓
Delivered stage constraint works correctly
```

**If test passes:** ✅ Proceed to Step 2
**If test fails:** ❌ Review error message and check Phase 1 migration was executed

---

### Step 2: Run Phase 2 Test (3 minutes)

**Test order-level design tracking:**

```bash
psql $DATABASE_URL -f database/11_TEST_PHASE_2_ORDER_LEVEL_DESIGNS.sql
```

**Expected Output:**
```
PHASE 2 TEST: PASSED ✓
Order-level design tracking works correctly
Designs are independent per order (not pooled)
```

**What this verifies:**
- ✅ Two orders for same customer tracked independently
- ✅ Designs NOT pooled across orders
- ✅ v_pending_designs shows order_number column

---

### Step 3: Run Updated Customer Test (5 minutes)

**Test complete workflow:**

```bash
psql $DATABASE_URL -f database/3_TEST_CUSTOMER_99.sql
```

**Expected:** All steps complete without errors, especially Step 8 (delivery challan)

---

## 🎯 Manual End-to-End Testing

**Complete guide in:** `COMPLETE_SYSTEM_DMD.md` Section 7

### Quick Test Scenario (30 minutes)

1. **Create Customer** → "Rajesh Textiles"
2. **Create Order 1** → 90 SAREES (ORD-001)
3. **Receive Material Batch A** → 50 SAREES
4. **Provide Designs** → 30 designs for Batch A
5. **Receive Material Batch B** → 40 SAREES
6. **Provide More Designs** → 20 designs for Batch B
7. **Create Order 2** → 70 SAREES (ORD-002)
8. **Receive Material Batch C** → 70 SAREES
9. **Provide Designs** → 60 designs for Batch C
10. **Verify Dashboard** → Shows TWO separate orders with independent design counts
11. **Move Stock** → Batch A through production stages (received → preprocessing → printing → postprocessing → completed)
12. **Create Delivery Challan** → 37 SAREES from Order 1
13. **Verify Delivered Stage** → Stock appears in 'delivered' (no error!)
14. **Generate Invoice** → From delivery challan
15. **Record Payment** → Full payment
16. **Check Reports** → Outstanding payments, stock by customer

**Critical Checkpoints:**
- ✅ Step 10: Designs tracked separately per order (NOT pooled)
- ✅ Step 12: Delivery challan creation succeeds (no CHECK constraint error)
- ✅ Step 13: Stock appears in 'delivered' stage

---

## 🤖 Automated Testing

### Available Test Scripts

| Script | Purpose | Status | Execution Time |
|--------|---------|--------|----------------|
| `10_TEST_PHASE_1_DELIVERED_STAGE.sql` | Test delivered stage | ✅ FIXED | 5 seconds |
| `11_TEST_PHASE_2_ORDER_LEVEL_DESIGNS.sql` | Test order-level designs | ✅ READY | 10 seconds |
| `3_TEST_CUSTOMER_99.sql` | Complete workflow test | ✅ UPDATED | 30 seconds |

### To Be Created (Optional)

| Script | Purpose | Priority | Estimated Effort |
|--------|---------|----------|------------------|
| `12_TEST_PHASE_3_BATCH_LINEAGE.sql` | Test batch tracking | HIGH | 30 minutes |
| `13_TEST_COMPLEX_MULTI_ORDER_SCENARIO.sql` | Integration test | HIGH | 1 hour |
| `RUN_ALL_TESTS.sql` | Master test runner | MEDIUM | 15 minutes |

**Templates available in:** `COMPLETE_SYSTEM_DMD.md` Section 8.2

---

## 🔧 Frontend Updates Required

### Breaking Change (Phase 2)

**File 1:** `frontend/src/pages/MaterialReceiptSimplified.tsx`

**Current Code (Line ~220):**
```typescript
await supabase.rpc('update_design_count', {
  p_customer_id: selectedCustomer.id,
  p_material_type: selectedMaterialType,
  p_designs_to_add: designsCount,
  p_batch_identifier: batchId
})
```

**Required Update:**
```typescript
await supabase.rpc('update_design_count', {
  p_customer_id: selectedCustomer.id,
  p_order_id: selectedOrder.id,  // ⚠️ ADD THIS LINE
  p_material_type: selectedMaterialType,
  p_designs_to_add: designsCount,
  p_batch_identifier: batchId
})
```

**File 2:** `frontend/src/pages/SimplifiedDashboard.tsx`

**Update Display (Line ~180):**
```typescript
// Add order_number column to pending designs table
<TableHead>
  <TableRow>
    <TableCell>Customer</TableCell>
    <TableCell>Order Number</TableCell>  {/* ADD THIS */}
    <TableCell>Material Type</TableCell>
    <TableCell>Designs Given</TableCell>
    <TableCell>Designs Pending</TableCell>
  </TableRow>
</TableHead>

<TableBody>
  {pendingDesigns.map((item) => (
    <TableRow key={item.id}>
      <TableCell>{item.customer_name}</TableCell>
      <TableCell>{item.order_number}</TableCell>  {/* ADD THIS */}
      <TableCell>{item.material_type}</TableCell>
      <TableCell>{item.designs_given}</TableCell>
      <TableCell>{item.designs_pending}</TableCell>
    </TableRow>
  ))}
</TableBody>
```

---

## 📊 Verification Queries

### Quick Health Check

```sql
-- Check 1: All design tracking has order_id
SELECT COUNT(*) as records_without_order_id
FROM material_design_tracking
WHERE order_id IS NULL;
-- Expected: 0

-- Check 2: Delivered stage works
SELECT COUNT(*) as delivered_stock_count
FROM material_stock
WHERE stage = 'delivered' AND is_active = true;
-- Expected: > 0 if delivery challans created

-- Check 3: Batch tracking complete
SELECT COUNT(*) as batches_without_lineage
FROM material_in
WHERE batch_id IS NULL;
-- Expected: 0

-- Check 4: Designs tracked per order
SELECT
  order_number,
  material_type,
  designs_given,
  designs_pending
FROM v_pending_designs
ORDER BY order_number;
-- Expected: Multiple rows for same customer if multiple orders

-- Check 5: View availability
SELECT
  table_name
FROM information_schema.views
WHERE table_name IN (
  'v_pending_designs',
  'v_order_design_summary',
  'v_batch_lineage',
  'v_outstanding_payments'
);
-- Expected: 4 rows
```

---

## 🚀 Production Deployment Timeline

### Recommended Sequence

**Day 1: Phase 1 (Immediate - Zero Downtime)**
- Execute `7_FIX_DELIVERED_STAGE_CONSTRAINT.sql`
- Test with `10_TEST_PHASE_1_DELIVERED_STAGE.sql`
- Verify delivery challan creation works
- **Time:** 15 minutes

**Day 2-3: Frontend Updates**
- Update `MaterialReceiptSimplified.tsx`
- Update `SimplifiedDashboard.tsx`
- Test locally
- **Time:** 2-4 hours

**Day 4: Phase 2 Deployment (Maintenance Window Required)**
- Schedule 2-hour maintenance window
- Execute `8_ADD_ORDER_ID_TO_DESIGN_TRACKING.sql`
- Test with `11_TEST_PHASE_2_ORDER_LEVEL_DESIGNS.sql`
- Deploy updated frontend
- Manual testing
- **Time:** 2 hours

**Day 5: Phase 3 (Optional - Zero Downtime)**
- Execute `9_ADD_BATCH_ID_TO_MATERIAL_IN.sql`
- Verify batch lineage view
- **Time:** 30 minutes

**Day 6: Complete Testing**
- Run manual end-to-end test
- Monitor for 24 hours
- **Time:** 1 hour + monitoring

**Total Timeline:** 1 week
**Total Active Work:** ~8 hours

---

## ✅ Testing Checklist

### Database Tests
- [ ] Phase 1 test passes (`10_TEST_PHASE_1_DELIVERED_STAGE.sql`)
- [ ] Phase 2 test passes (`11_TEST_PHASE_2_ORDER_LEVEL_DESIGNS.sql`)
- [ ] Customer 99 test passes (`3_TEST_CUSTOMER_99.sql`)
- [ ] All verification queries return expected results

### Manual Tests
- [ ] Create customer
- [ ] Create order
- [ ] Receive material
- [ ] Update designs (with order_id parameter)
- [ ] Move stock through stages
- [ ] Create delivery challan
- [ ] Stock appears in 'delivered' stage (no error)
- [ ] Generate invoice
- [ ] Record payment
- [ ] Verify reports show correct data

### Frontend Tests
- [ ] MaterialReceiptSimplified.tsx updated
- [ ] SimplifiedDashboard.tsx updated
- [ ] Local testing complete
- [ ] Design tracking works with order_id
- [ ] Dashboard shows order_number column
- [ ] No console errors

### Production Deployment
- [ ] Database backup taken
- [ ] Phase 1 migration executed
- [ ] Phase 1 tested in production
- [ ] Frontend code deployed
- [ ] Phase 2 migration executed (during maintenance window)
- [ ] Phase 2 tested in production
- [ ] Phase 3 migration executed
- [ ] Complete manual test in production
- [ ] Monitored for 24 hours
- [ ] No errors reported

---

## 📞 Quick Help

**Error: "Function update_design_count not found"**
→ Update frontend to include `p_order_id` parameter

**Error: "CHECK constraint violation for delivered"**
→ Run Phase 1 migration: `7_FIX_DELIVERED_STAGE_CONSTRAINT.sql`

**Error: "Column order_id does not exist"**
→ Run Phase 2 migration: `8_ADD_ORDER_ID_TO_DESIGN_TRACKING.sql`

**Designs pooling across orders?**
→ Check migration completed, verify frontend passes order_id

**Test script fails?**
→ Check which step failed, review error message
→ Verify migration executed before running test
→ Check test data cleanup (may need manual cleanup if previous run failed)

---

## 📚 Documentation References

1. **COMPLETE_SYSTEM_DMD.md** - Complete traceability, API mappings, full testing guides
2. **MIGRATION_AND_TEST_SUMMARY.md** - Migration execution instructions
3. **IMPLEMENTATION_STATUS.md** - Current status, success criteria
4. **~/.claude/plans/dazzling-dazzling-babbage.md** - Original implementation plan

---

## 🎯 Next Action

**Right Now:** Run Step 1 verification test to confirm the fix works

```bash
# Copy this and run in Supabase SQL Editor or psql:
psql $DATABASE_URL -f database/10_TEST_PHASE_1_DELIVERED_STAGE.sql
```

**Expected Result:**
```
PHASE 1 TEST: PASSED ✓
```

**If passed:** Proceed with manual testing or frontend updates
**If failed:** Review error and investigate

---

**Document End**
