# Stock Movement & Design Tracking Logic
**Digital Textile Printing System**
**Date:** 2025-12-22

---

## 🔄 Stock Movement Logic

### Function: `move_stock_to_stage()`

**Parameters:**
- `customer_id` - Which customer
- `order_id` - Which order
- `material_type` - SAREE, DUPATTA, VONI, RUNNING
- `from_stage` - Current stage
- `to_stage` - Destination stage
- `quantity` - How many units to move
- `ownership` - 'customer' or 'self'

### How It Works:

```
BEFORE:
material_stock:
- 50 SAREE in 'received' (is_active=true)

CALL: move_stock_to_stage(..., 'received', 'preprocessing', 40, ...)

AFTER:
material_stock:
- 10 SAREE in 'received' (is_active=FALSE) ← Historical record
- 40 SAREE in 'preprocessing' (is_active=TRUE) ← Current stock
```

### Steps Inside Function:

1. **Find Source Stock:**
   ```sql
   SELECT * FROM material_stock
   WHERE customer_id = p_customer_id
     AND material_type = p_material_type
     AND stage = p_from_stage
     AND is_active = true
   ```

2. **Validate Quantity:**
   ```sql
   IF stock_quantity < p_quantity THEN
     RAISE EXCEPTION 'Not enough stock'
   ```

3. **Mark Old as History:**
   ```sql
   UPDATE material_stock
   SET is_active = false,
       quantity = quantity - p_quantity
   WHERE [conditions]
   ```

4. **Create New Active Record:**
   ```sql
   INSERT INTO material_stock (
     customer_id, order_id, material_type,
     stage, quantity, ownership, is_active
   ) VALUES (
     ..., p_to_stage, p_quantity, ..., TRUE
   )
   ```

### Key Benefits:

✅ **Complete Audit Trail** - All movements preserved
✅ **Simple Queries** - `WHERE is_active = true` for current stock
✅ **History** - `WHERE is_active = false ORDER BY created_at` for movements

---

## 🎨 Design Tracking Logic

### Why Separate Table?

**Before:** Designs stored in `material_stock` table
**Problem:** When stock moves between stages, design info gets confusing

**Now:** Designs stored in `material_design_tracking` table
**Benefit:** Design status independent of stock movements

### When to Create Design Tracking?

**Rule:** Create tracking for **ALL customer material fabrics** when received

```sql
-- When customer brings material (ownership='customer')
INSERT INTO material_design_tracking (
  customer_id, material_type,
  total_quantity, designs_given, designs_pending,
  batch_identifier
) VALUES
  ('SAREE', 50, 0, 50, 'Batch-20Dec'),     ← 0 given, 50 pending
  ('DUPATTA', 20, 0, 20, 'Batch-20Dec'),   ← 0 given, 20 pending
  ('VONI', 5, 0, 5, 'Batch-20Dec'),        ← 0 given, 5 pending
  ('RUNNING', 10, 0, 10, 'Batch-20Dec');   ← 0 given, 10 pending
```

**For Own Stock (ownership='self'):**
❌ **NO design tracking needed** - We already have designs!

### When Customer Provides Designs:

```sql
-- Customer brings 30 saree designs
CALL update_design_count(customer_id, 'SAREE', 30, 'Batch-20Dec');

-- Result in material_design_tracking:
-- designs_given = 30
-- designs_pending = 20 (50 - 30)
```

### Design Tracking Columns:

| Column | Meaning | Example |
|--------|---------|---------|
| `total_quantity` | Total fabric received | 50 sarees |
| `designs_given` | Designs provided by customer | 30 |
| `designs_pending` | Still waiting from customer | 20 |
| `batch_identifier` | Links related batches | 'Batch-20Dec2025-1' |
| `design_notes` | Additional info | 'Customer promised 20 more by 25-Dec' |

---

## 📊 Complete Workflow Example

### Scenario: Customer brings 50 sarees (no designs yet)

**Step 1: Material Receipt**
```sql
-- Record in material_in table
INSERT INTO material_in (customer_id, order_id, material_type, quantity, ownership)
VALUES (customer_id, order_id, 'SAREE', 50, 'customer');

-- Create stock record in 'received' stage
INSERT INTO material_stock (customer_id, order_id, material_type, stage, quantity, ownership, is_active)
VALUES (customer_id, order_id, 'SAREE', 'received', 50, 'customer', true);

-- Create design tracking (0 designs given initially)
INSERT INTO material_design_tracking (customer_id, material_type, total_quantity, designs_given, designs_pending)
VALUES (customer_id, 'SAREE', 50, 0, 50);
```

**Current State:**
- material_stock: 50 SAREE in 'received' (is_active=true)
- material_design_tracking: 0/50 designs (50 pending)

---

**Step 2: Customer Provides 30 Designs**
```sql
CALL update_design_count(customer_id, 'SAREE', 30, 'Batch-20Dec');
```

**Current State:**
- material_stock: 50 SAREE in 'received' (is_active=true) ← UNCHANGED
- material_design_tracking: 30/50 designs (20 pending)

---

**Step 3: Move 30 Sarees to Preprocessing**
```sql
CALL move_stock_to_stage(customer_id, order_id, 'SAREE', 'received', 'preprocessing', 30, 'customer');
```

**Current State:**
- material_stock:
  - 20 SAREE in 'received' (is_active=false) ← Historical
  - 30 SAREE in 'preprocessing' (is_active=true) ← Current
- material_design_tracking: 30/50 designs (20 pending) ← UNCHANGED

**Note:** Design tracking is INDEPENDENT of stock movements!

---

**Step 4: Move 30 Through Production**
```sql
-- Preprocessing → Printing
CALL move_stock_to_stage(..., 'preprocessing', 'printing', 30, ...);

-- Printing → Postprocessing
CALL move_stock_to_stage(..., 'printing', 'postprocessing', 30, ...);

-- Postprocessing → Completed
CALL move_stock_to_stage(..., 'postprocessing', 'completed', 30, ...);
```

**Current State:**
- material_stock:
  - Multiple historical records (is_active=false) ← Audit trail
  - 30 SAREE in 'completed' (is_active=true) ← Current
  - 20 SAREE in 'received' (is_active=false) ← Still waiting for designs
- material_design_tracking: 30/50 designs (20 pending)

---

**Step 5: Quality Check (27 pass, 3 misprint)**
```sql
-- Move to misprint
CALL move_stock_to_stage(..., 'completed', 'misprint', 3, ...);

-- Move to delivered
CALL move_stock_to_stage(..., 'completed', 'delivered', 27, ...);
```

**Current State:**
- material_stock:
  - 27 SAREE in 'delivered' (is_active=true)
  - 3 SAREE in 'misprint' (is_active=true)
  - 20 SAREE in 'received' (is_active=false) ← Waiting for designs
- material_design_tracking: 30/50 designs (20 pending)

---

## ✅ Stock Reconciliation Formula

```sql
Total Received (material_in) = Active Stock (all stages) + Delivered + Sold + Returned

Example:
50 sarees received = 20 (received) + 3 (misprint) + 27 (delivered)
50 = 50 ✓ RECONCILED!
```

---

## 🔍 Important Queries

### Get Current Stock by Stage:
```sql
SELECT stage, SUM(quantity) as total
FROM material_stock
WHERE customer_id = ?
  AND material_type = 'SAREE'
  AND is_active = true
GROUP BY stage;
```

### Get Pending Designs:
```sql
SELECT material_type, total_quantity, designs_given, designs_pending
FROM material_design_tracking
WHERE customer_id = ?
  AND designs_pending > 0;
```

### Get Movement History:
```sql
SELECT stage, quantity, created_at, is_active
FROM material_stock
WHERE customer_id = ?
  AND material_type = 'SAREE'
ORDER BY created_at DESC;
```

### Get Order Summary:
```sql
SELECT * FROM v_order_lifecycle
WHERE customer_id = ?;
```

---

## 🎯 Design Tracking Best Practices

### When to Create:
✅ **Customer Material (ownership='customer'):** ALWAYS create for ALL fabric types
❌ **Own Stock (ownership='self'):** NO design tracking needed

### When to Update:
1. Customer provides designs → `update_design_count()`
2. More material received → UPDATE `total_quantity` and `designs_pending`
3. Customer provides design notes → UPDATE `design_notes`

### What NOT to Do:
❌ Don't link designs to specific stage (designs are independent of movements)
❌ Don't update designs when moving stock between stages
❌ Don't delete design tracking when stock is delivered (keep for history)

---

## 📝 Updated Test Script

**File:** `3_TEST_CUSTOMER_99.sql`

**Change Made:** Now creates design tracking for ALL fabrics:

```sql
-- OLD (only sarees):
INSERT INTO material_design_tracking (...)
VALUES (customer_id, 'SAREE', 50, 0, 50, 'Batch-20Dec2025-1');

-- NEW (all fabrics):
INSERT INTO material_design_tracking (...)
VALUES
  (customer_id, 'SAREE', 50, 0, 50, 'Batch-20Dec2025-1'),
  (customer_id, 'DUPATTA', 20, 0, 20, 'Batch-20Dec2025-1'),
  (customer_id, 'VONI', 5, 0, 5, 'Batch-20Dec2025-1'),
  (customer_id, 'RUNNING', 10, 0, 10, 'Batch-20Dec2025-1');
```

---

## 🎉 Summary

**Stock Movement:**
- Uses `is_active` flag (true=current, false=history)
- Preserves complete audit trail
- Independent of design tracking

**Design Tracking:**
- Separate `material_design_tracking` table
- Create for ALL customer material fabrics
- Independent of stock movements
- Tracks: total_quantity, designs_given, designs_pending

**Key Principle:**
> Designs and stock movements are INDEPENDENT. Design status doesn't change when stock moves between stages!

---

**Documentation Complete!** ✅
