# Design Tracking Logic - Complete Guide
**Date:** 2025-12-24
**Status:** ✅ Verified and Working

---

## Executive Summary

The design tracking system tracks how many designs have been given to customers for each order and material type, and calculates how many designs are still pending.

**Key Principle:** Designs are tracked **per order**, not pooled across all orders for a customer.

---

## How It Works

### 1. Basic Concept

When material is received for an order:
- **Total Quantity:** Number of pieces received (e.g., 100 sarees)
- **Designs Given:** Number of unique designs provided to customer (e.g., 30 designs)
- **Designs Pending:** Total quantity - Designs given (e.g., 100 - 30 = 70 pending)

### 2. Example Scenario

**Customer:** Rajesh Textiles

**Order 1:** ORD-001
- Received: 100 SAREES
- Designs given: 30
- Designs pending: 70 ✅ (Customer needs to provide 70 more designs)

**Order 2:** ORD-002
- Received: 80 SAREES
- Designs given: 60
- Designs pending: 20 ✅ (Customer needs to provide 20 more designs)

**Important:** Orders are tracked independently! The 30 designs from Order 1 don't count toward Order 2.

---

## Database Schema

### Table: material_design_tracking

```sql
CREATE TABLE material_design_tracking (
  id UUID PRIMARY KEY,
  customer_id UUID NOT NULL,
  order_id UUID NOT NULL,         -- ✅ Each order tracked separately
  material_type VARCHAR(50) NOT NULL,
  batch_identifier VARCHAR(100),
  total_quantity INTEGER NOT NULL,
  designs_given INTEGER DEFAULT 0,
  designs_pending INTEGER,         -- Calculated: total_quantity - designs_given
  design_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## RPC Function: update_design_count

### Purpose
Add designs to an order and automatically calculate pending designs.

### Parameters

```sql
update_design_count(
  p_customer_id UUID,
  p_order_id UUID,
  p_material_type VARCHAR,
  p_designs_to_add INTEGER,
  p_batch_identifier VARCHAR DEFAULT NULL
)
```

### Logic Flow

```
1. Validate order belongs to customer
   ↓
2. Get total quantity from active stock for this customer + order + material
   ↓
3. Check if design tracking record exists
   ↓
4a. If NO record exists:
    - CREATE new tracking record
    - designs_given = p_designs_to_add
    - designs_pending = total_quantity - p_designs_to_add
   ↓
4b. If record EXISTS:
    - UPDATE existing record
    - designs_given = designs_given + p_designs_to_add
    - designs_pending = total_quantity - (designs_given + p_designs_to_add)
   ↓
5. Use GREATEST(0, ...) to prevent negative values
```

### Example Usage

```sql
-- Customer receives 100 sarees for Order 1
-- (stock entry created via material_in)

-- Customer provides 30 designs
SELECT update_design_count(
  'customer-uuid',
  'order-uuid',
  'SAREE',
  30,  -- Adding 30 designs
  'Batch-Dec-2025'
);

-- Result in material_design_tracking:
-- total_quantity: 100
-- designs_given: 30
-- designs_pending: 70

-- Later, customer provides 20 more designs
SELECT update_design_count(
  'customer-uuid',
  'order-uuid',
  'SAREE',
  20,  -- Adding 20 more designs
  'Batch-Dec-2025'
);

-- Result:
-- total_quantity: 100
-- designs_given: 50 (30 + 20)
-- designs_pending: 50 (100 - 50)
```

---

## View: v_pending_designs

### Purpose
Shows all orders with pending designs (designs_pending > 0).

### Schema

```sql
CREATE VIEW v_pending_designs AS
SELECT
  c.id as customer_id,
  c.name as customer_name,
  c.phone as customer_phone,
  o.id as order_id,
  o.order_number,
  o.order_date,
  dt.material_type,
  dt.total_quantity,
  dt.designs_given,
  dt.designs_pending,
  ROUND((dt.designs_given::DECIMAL / NULLIF(dt.total_quantity, 0)) * 100, 1)
    as design_completion_pct,
  dt.design_notes,
  dt.batch_identifier,
  dt.created_at as tracking_started,
  dt.updated_at as last_updated
FROM material_design_tracking dt
JOIN customers c ON dt.customer_id = c.id
JOIN orders o ON dt.order_id = o.id
WHERE dt.designs_pending > 0
ORDER BY dt.designs_pending DESC, o.order_date, c.name;
```

### Example Query

```sql
SELECT * FROM v_pending_designs;
```

**Result:**
```
customer_name    | order_number | material_type | total_qty | designs_given | designs_pending | completion_pct
-----------------|--------------|---------------|-----------|---------------|-----------------|---------------
Rajesh Textiles  | ORD-001      | SAREE         | 100       | 30            | 70              | 30.0
Rajesh Textiles  | ORD-002      | SAREE         | 80        | 60            | 20              | 75.0
Kumar Silks      | ORD-005      | VONI          | 50        | 10            | 40              | 20.0
```

---

## Frontend API

### Added to simplifiedApi.ts

```typescript
// Add designs to an order
await simplifiedApi.designTracking.addDesigns({
  customer_id: 'customer-uuid',
  order_id: 'order-uuid',
  material_type: 'SAREE',
  designs_to_add: 30,
  batch_identifier: 'Batch-Dec-2025' // optional
});

// Get all pending designs
const pendingDesigns = await simplifiedApi.designTracking.getPendingDesigns();
// Returns: Array of PendingDesign objects

// Get pending designs for specific customer
const customerPending = await simplifiedApi.designTracking.getPendingDesignsByCustomer(customerId);

// Get all design tracking for an order
const orderDesigns = await simplifiedApi.designTracking.getByOrder(orderId);
```

---

## Business Rules

### ✅ Correct Behavior

1. **Order-Level Tracking**
   - Each order has independent design tracking
   - Order 1 with 100 sarees, 30 designs given = 70 pending
   - Order 2 with 80 sarees, 60 designs given = 20 pending
   - Total across orders: NOT pooled

2. **Incremental Design Addition**
   - First call: Add 30 designs → designs_given = 30
   - Second call: Add 20 designs → designs_given = 50 (30 + 20)
   - Cumulative, not replacement

3. **Automatic Calculation**
   - designs_pending = total_quantity - designs_given
   - Always calculated, never manually set
   - Uses GREATEST(0, ...) to prevent negative values

4. **Follow-up Required When:**
   - designs_pending > 0 → Customer needs to provide more designs
   - design_completion_pct < 100 → Order not ready for production

### ❌ What NOT to Do

1. **Don't pool designs across orders**
   ```sql
   -- WRONG: This would pool designs across all orders
   SELECT SUM(designs_given) FROM material_design_tracking
   WHERE customer_id = 'xxx';

   -- CORRECT: Track per order
   SELECT designs_given FROM material_design_tracking
   WHERE customer_id = 'xxx' AND order_id = 'yyy';
   ```

2. **Don't manually set designs_pending**
   ```sql
   -- WRONG: designs_pending is calculated
   UPDATE material_design_tracking
   SET designs_pending = 50;

   -- CORRECT: Use update_design_count RPC
   SELECT update_design_count(...);
   ```

3. **Don't allow negative pending**
   - The GREATEST(0, ...) function prevents this
   - If customer provides more designs than quantity, pending = 0

---

## Follow-Up Requirements

### When designs_pending > 0

**Action Required:**
1. Contact customer
2. Request remaining designs
3. Update system when designs received

**Dashboard Alert:**
```typescript
const pendingDesigns = await simplifiedApi.designTracking.getPendingDesigns();

// Show alert if any pending
if (pendingDesigns.length > 0) {
  console.log(`⚠️ ${pendingDesigns.length} orders need design follow-up`);

  pendingDesigns.forEach(pd => {
    console.log(
      `${pd.customer_name} - Order ${pd.order_number}: ` +
      `${pd.designs_pending} designs pending for ${pd.material_type}`
    );
  });
}
```

### Production Readiness

**Before starting production:**
```typescript
const orderDesigns = await simplifiedApi.designTracking.getByOrder(orderId);

const allDesignsReady = orderDesigns.every(d => d.designs_pending === 0);

if (!allDesignsReady) {
  throw new Error('Cannot start production - designs still pending');
}
```

---

## Testing

### Test Case 1: Single Order, Incremental Designs

```sql
-- Setup
INSERT INTO orders (customer_id, order_number, total_quantity)
VALUES ('customer-1', 'ORD-001', 100);

INSERT INTO material_stock (customer_id, order_id, material_type, quantity, stage)
VALUES ('customer-1', 'order-1', 'SAREE', 100, 'received');

-- Add 30 designs
SELECT update_design_count('customer-1', 'order-1', 'SAREE', 30);

-- Verify
SELECT designs_given, designs_pending FROM material_design_tracking
WHERE order_id = 'order-1';
-- Expected: designs_given = 30, designs_pending = 70

-- Add 20 more designs
SELECT update_design_count('customer-1', 'order-1', 'SAREE', 20);

-- Verify
SELECT designs_given, designs_pending FROM material_design_tracking
WHERE order_id = 'order-1';
-- Expected: designs_given = 50, designs_pending = 50
```

### Test Case 2: Multiple Orders, Independent Tracking

```sql
-- Setup Order 1
INSERT INTO orders (customer_id, order_number, total_quantity)
VALUES ('customer-1', 'ORD-001', 100);

INSERT INTO material_stock (customer_id, order_id, material_type, quantity, stage)
VALUES ('customer-1', 'order-1', 'SAREE', 100, 'received');

-- Setup Order 2
INSERT INTO orders (customer_id, order_number, total_quantity)
VALUES ('customer-1', 'ORD-002', 80);

INSERT INTO material_stock (customer_id, order_id, material_type, quantity, stage)
VALUES ('customer-1', 'order-2', 'SAREE', 80, 'received');

-- Add designs to Order 1
SELECT update_design_count('customer-1', 'order-1', 'SAREE', 30);

-- Add designs to Order 2
SELECT update_design_count('customer-1', 'order-2', 'SAREE', 60);

-- Verify Order 1
SELECT designs_given, designs_pending FROM material_design_tracking
WHERE order_id = 'order-1';
-- Expected: designs_given = 30, designs_pending = 70

-- Verify Order 2
SELECT designs_given, designs_pending FROM material_design_tracking
WHERE order_id = 'order-2';
-- Expected: designs_given = 60, designs_pending = 20

-- Verify they are NOT pooled
SELECT COUNT(*) FROM material_design_tracking
WHERE customer_id = 'customer-1';
-- Expected: 2 separate records
```

---

## Summary

### ✅ Design Tracking Logic is Correct

| Aspect | Status | Notes |
|--------|--------|-------|
| Order-level tracking | ✅ Correct | Each order tracked independently |
| Incremental updates | ✅ Correct | designs_given cumulative |
| Automatic calculation | ✅ Correct | designs_pending = total - given |
| Negative prevention | ✅ Correct | Uses GREATEST(0, ...) |
| Follow-up detection | ✅ Correct | v_pending_designs view |
| Frontend API | ✅ Complete | All CRUD operations available |

### Follow-Up Required When:
- ✅ designs_pending > 0 → Contact customer for remaining designs
- ✅ design_completion_pct < 100 → Order not ready for production
- ✅ View shows in v_pending_designs → Action required

### No Changes Needed:
- Logic is sound and working correctly
- Database structure supports all requirements
- Frontend API fully implemented
- Views provide necessary reporting

---

**Status:** ✅ **DESIGN TRACKING VERIFIED AND WORKING CORRECTLY**
