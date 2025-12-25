# Migration & Test Scripts Summary

## Created: 2025-12-22

This document summarizes all migration scripts and test files created to fix the delivered stage constraint and enhance order/batch tracking.

---

## Migration Scripts (Execute in Order)

### Phase 1: Fix Delivered Stage Constraint (CRITICAL)
**File:** `7_FIX_DELIVERED_STAGE_CONSTRAINT.sql`
**Purpose:** Add 'delivered' to allowed stages in material_stock table
**Risk:** LOW - Simple constraint modification
**Downtime:** None
**Execution Time:** ~1 minute

**What it does:**
- Drops existing CHECK constraint on `material_stock.stage`
- Recreates with 'delivered' added to allowed stages
- Updates movement_type constraint to include 'delivered'
- Verifies the constraint was updated correctly

**Run this FIRST** - it unblocks the immediate error!

---

### Phase 2: Order-Level Design Tracking (BREAKING CHANGE)
**File:** `8_ADD_ORDER_ID_TO_DESIGN_TRACKING.sql`
**Purpose:** Change design tracking from customer-level to order-level
**Risk:** MEDIUM - Requires data migration and application updates
**Downtime:** Recommended (1-2 hours maintenance window)
**Execution Time:** ~5-10 minutes depending on data volume

**What it does:**
- Adds `order_id` column to `material_design_tracking` table
- Migrates existing records (creates migration orders if needed)
- Updates `update_design_count()` function (now requires order_id parameter)
- Updates `v_pending_designs` view to show order information
- Creates new `v_order_design_summary` view
- Updates indexes for better performance

**BREAKING CHANGE:**
```sql
-- OLD signature (will no longer work):
update_design_count(customer_id, material_type, designs, batch)

-- NEW signature (required):
update_design_count(customer_id, order_id, material_type, designs, batch)
```

**Frontend Changes Required:**
- MaterialReceiptSimplified.tsx
- SimplifiedDashboard.tsx
- Any component calling `update_design_count` RPC

---

### Phase 3: Complete Batch Tracking (ENHANCEMENT)
**File:** `9_ADD_BATCH_ID_TO_MATERIAL_IN.sql`
**Purpose:** Add batch_id to material_in table for complete lineage tracking
**Risk:** LOW - Additive change only
**Downtime:** None
**Execution Time:** ~2-3 minutes

**What it does:**
- Adds `batch_id` column to `material_in` table
- Generates batch_id for existing records
- Creates `v_batch_lineage` view showing receipt → stock flow
- Creates `get_batch_history()` function for querying batch movements
- Adds indexes for performance

**Benefits:**
- Complete traceability from receipt to delivery
- Track which batch material came from
- View batch lineage: `SELECT * FROM v_batch_lineage WHERE batch_id = ?`

---

## Test Scripts

### Test 1: Phase 1 - Delivered Stage
**File:** `10_TEST_PHASE_1_DELIVERED_STAGE.sql`
**Tests:** Delivered stage constraint works
**Run After:** Phase 1 migration

**Validates:**
- ✅ No CHECK constraint violation when moving to 'delivered'
- ✅ Stock successfully moved to 'delivered' stage
- ✅ Historical record preserved (is_active=false)

---

### Test 2: Phase 2 - Order-Level Design Tracking
**File:** `11_TEST_PHASE_2_ORDER_LEVEL_DESIGNS.sql`
**Tests:** Design tracking per order (not pooled)
**Run After:** Phase 2 migration

**Scenario:**
- Customer with 2 orders
- Order 1: 90 sarees (2 batches), 30 designs given
- Order 2: 70 sarees (1 batch), 60 designs given

**Validates:**
- ✅ Order 1: 30 given, 60 pending (independent)
- ✅ Order 2: 60 given, 10 pending (independent)
- ✅ Designs NOT pooled together
- ✅ v_pending_designs shows order_number

---

### Test 3: Phase 3 - Batch Lineage
**File:** `12_TEST_PHASE_3_BATCH_LINEAGE.sql`
**Tests:** Batch identity from receipt through delivery
**Run After:** Phase 3 migration

**Scenario:**
- Order with 100 sarees in 2 batches
- Batch A: 50 sarees → moved through stages
- Batch B: 50 sarees → moved through stages

**Validates:**
- ✅ material_in has 2 different batch_ids
- ✅ Batch A maintains batch_id through movements
- ✅ Batch B maintains batch_id through movements
- ✅ v_batch_lineage shows correct lineage
- ✅ get_batch_history() returns complete history

---

### Test 4: Complete Integration Test
**File:** `13_TEST_COMPLEX_MULTI_ORDER_SCENARIO.sql`
**Tests:** Real-world complex workflow
**Run After:** All 3 phases complete

**Scenario:** "Rajesh Textiles" Customer
- **Order 1:** 90 SAREES + 20 DUPPATTAS + 5 VONIS
  - Material received in 2 batches (50 + 40 sarees)
  - Designs: 30 given initially, then 10 more, then 60 more (total 100)
  - 40 sarees through production → 37 pass, 3 misprint → delivered

- **Order 2:** 70 SAREES
  - Material received in 1 batch (70 sarees)
  - Designs: 60 given (10 pending)
  - 70 sarees through production

**Timeline:** 6 days simulating real workflow

**Validates:**
- ✅ Two separate orders exist
- ✅ Design tracking independent per order
- ✅ Batch identity preserved (4+ batches)
- ✅ Stock moved to delivered stage
- ✅ Misprints tracked correctly
- ✅ Order 1 has 3 material types
- ✅ Batch lineage complete (no stock loss)

---

## Execution Instructions

### Development/Testing Environment

```bash
# Step 1: Run Phase 1 migration (CRITICAL)
# Execute via Supabase SQL Editor or your preferred method
# File: 7_FIX_DELIVERED_STAGE_CONSTRAINT.sql

# Step 2: Test Phase 1
# File: 10_TEST_PHASE_1_DELIVERED_STAGE.sql

# Step 3: Run Phase 2 migration (BREAKING CHANGE)
# File: 8_ADD_ORDER_ID_TO_DESIGN_TRACKING.sql

# Step 4: Test Phase 2
# File: 11_TEST_PHASE_2_ORDER_LEVEL_DESIGNS.sql

# Step 5: Update 3_TEST_CUSTOMER_99.sql
# Update lines 147, 171 to include order_id parameter

# Step 6: Run Phase 3 migration (ENHANCEMENT)
# File: 9_ADD_BATCH_ID_TO_MATERIAL_IN.sql

# Step 7: Test Phase 3
# File: 12_TEST_PHASE_3_BATCH_LINEAGE.sql

# Step 8: Run complete integration test
# File: 13_TEST_COMPLEX_MULTI_ORDER_SCENARIO.sql

# Step 9: Run master test suite
# File: RUN_ALL_TESTS.sql (runs all tests in sequence)
```

### Production Deployment

```bash
# Prerequisites:
# 1. Full database backup
# 2. Application code updated (Phase 2 requires frontend changes)
# 3. Maintenance window scheduled (Phase 2 only)

# Timeline:
# Phase 1: 15 minutes (zero downtime)
# Phase 2: 1-2 hours (maintenance window)
# Phase 3: 30 minutes (zero downtime)

# Execution:
1. T+0:00 - Take database backup
2. T+0:15 - Execute Phase 1 (7_FIX_DELIVERED_STAGE_CONSTRAINT.sql)
3. T+0:20 - Verify Phase 1 (10_TEST_PHASE_1_DELIVERED_STAGE.sql)
4. T+0:25 - Execute Phase 2 (8_ADD_ORDER_ID_TO_DESIGN_TRACKING.sql)
5. T+0:45 - Verify Phase 2 data migration
6. T+1:00 - Deploy updated application code
7. T+1:15 - Smoke tests
8. T+1:30 - Execute Phase 3 (9_ADD_BATCH_ID_TO_MATERIAL_IN.sql)
9. T+1:40 - Verify Phase 3 (12_TEST_PHASE_3_BATCH_LINEAGE.sql)
10. T+1:45 - Run integration test (13_TEST_COMPLEX_MULTI_ORDER_SCENARIO.sql)
11. T+2:00 - Monitor for errors
12. T+2:30 - Sign off / Rollback decision
```

---

## Quick Reference

### Files Created

**Migration Scripts:**
1. `7_FIX_DELIVERED_STAGE_CONSTRAINT.sql` - Fix delivered stage (Phase 1)
2. `8_ADD_ORDER_ID_TO_DESIGN_TRACKING.sql` - Order-level designs (Phase 2)
3. `9_ADD_BATCH_ID_TO_MATERIAL_IN.sql` - Batch tracking (Phase 3)

**Test Scripts:**
4. `10_TEST_PHASE_1_DELIVERED_STAGE.sql` - Test Phase 1
5. `11_TEST_PHASE_2_ORDER_LEVEL_DESIGNS.sql` - Test Phase 2
6. `12_TEST_PHASE_3_BATCH_LINEAGE.sql` - Test Phase 3
7. `13_TEST_COMPLEX_MULTI_ORDER_SCENARIO.sql` - Integration test
8. `RUN_ALL_TESTS.sql` - Master test runner

**Updates Needed:**
9. `3_TEST_CUSTOMER_99.sql` - Update with order_id parameters (lines 147, 171)

**Documentation:**
10. This file (`MIGRATION_AND_TEST_SUMMARY.md`)
11. Plan file (`~/.claude/plans/dazzling-dazzling-babbage.md`)

---

## Rollback Instructions

### Phase 1 Rollback
```sql
ALTER TABLE material_stock DROP CONSTRAINT material_stock_stage_check;
ALTER TABLE material_stock ADD CONSTRAINT material_stock_stage_check
  CHECK (stage IN ('received', 'preprocessing', 'printing', 'postprocessing',
                   'completed', 'misprint', 'damaged', 'sold'));
```

### Phase 2 Rollback (⚠️ DATA LOSS WARNING)
```sql
-- WARNING: This will pool designs back to customer level
ALTER TABLE material_design_tracking DROP COLUMN order_id;
-- You'll need to restore old function definitions from backup
```

### Phase 3 Rollback
```sql
DROP VIEW IF EXISTS v_batch_lineage CASCADE;
DROP FUNCTION IF EXISTS get_batch_history(UUID);
DROP INDEX IF EXISTS idx_material_in_batch;
ALTER TABLE material_in DROP COLUMN batch_id;
```

---

## Success Criteria

### Phase 1 ✅
- [ ] CHECK constraint includes 'delivered' stage
- [ ] Test script completes without error
- [ ] move_stock_to_stage accepts 'delivered' as to_stage

### Phase 2 ✅
- [ ] All material_design_tracking records have valid order_id
- [ ] Customer with 2 orders sees independent design counts
- [ ] v_pending_designs view shows order_number column
- [ ] Application updated to pass order_id in RPC calls

### Phase 3 ✅
- [ ] All material_in records have batch_id
- [ ] v_batch_lineage view shows receipt → stock flow
- [ ] Batch identity preserved through stage movements

---

## Support & Troubleshooting

### Common Issues

**Issue:** "update_design_count function not found"
**Solution:** You're using old function signature. Update to include order_id parameter.

**Issue:** "Column order_id does not exist in material_design_tracking"
**Solution:** Run Phase 2 migration first.

**Issue:** "Permission denied for view v_batch_lineage"
**Solution:** Run Phase 3 migration to create the view.

**Issue:** "Designs are pooling across orders"
**Solution:** Ensure Phase 2 migration completed successfully. Check that order_id column is populated.

---

## Contact

For questions or issues, refer to:
- Full implementation plan: `~/.claude/plans/dazzling-dazzling-babbage.md`
- Pattern analysis: `STOCK_TRACKING_PATTERN_ANALYSIS.md`
- SCD Type 2 explanation: `SCD_TYPE2_ANSWER.md`
- Stock logic documentation: `STOCK_AND_DESIGN_LOGIC_EXPLAINED.md`
