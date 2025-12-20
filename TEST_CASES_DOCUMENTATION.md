# Comprehensive Test Cases Documentation

**Created**: 2025-12-20
**Test Suite**: test_all_apis_comprehensive.mjs
**Test Data Prefix**: `AUTOTEST-`
**Purpose**: Document all automated test scenarios

---

## Test Execution

### Run All Tests
```bash
node test_all_apis_comprehensive.mjs
```

### Cleanup Test Data Only
```bash
node cleanup_test_data.mjs
```

---

## Test Data Identification

All test data is easily identifiable with these patterns:

| Entity | Identifier Pattern | Example |
|--------|-------------------|---------|
| **Customers** | Name starts with `AUTOTEST-` | `AUTOTEST-Customer-JobWork-20251220` |
| **Orders** | Notes contain `AUTOTEST-` | `AUTOTEST-Test order` |
| **Material Receipts** | Notes contain `AUTOTEST-` | `AUTOTEST-Test receipt - customer material` |
| **Delivery Challans** | Notes contain `AUTOTEST-` | `AUTOTEST-Test delivery challan` |
| **Invoices** | Notes contain `AUTOTEST-` | `AUTOTEST-Test invoice` |
| **Payments** | Notes contain `AUTOTEST-` | `AUTOTEST-Test payment` |
| **Credit Notes** | Notes contain `AUTOTEST-` | `AUTOTEST-Test credit note` |
| **Returns** | Reason contains `AUTOTEST-` | `AUTOTEST-Printing defect` |
| **Misprint Sales** | Notes contain `AUTOTEST-` | `AUTOTEST-Test misprint sale` |
| **Stock Entries** | Linked to test customers | Via customer_id foreign key |
| **Challan Items** | Linked to test challans | Description: `AUTOTEST-SAREE - Printed` |

---

## Test Scenarios Coverage

### SECTION 1: Schema Verification (4 tests)

#### Test 1.1: Verify all 13 core tables exist
**Objective**: Ensure database schema is complete
**Tables Verified**:
- customers
- orders
- material_in
- material_stock
- returns
- credit_notes
- misprint_sales
- delivery_challans
- challan_items
- gst_invoices
- payments
- invoice_challans
- material_types

**Expected**: All tables accessible without error
**SQL**: `SELECT * FROM <table> LIMIT 0`

---

#### Test 1.2: Verify 5 product types exist
**Objective**: Ensure material types reference data is loaded
**Product Types Verified**:
- SAREE - Sarees
- DUPATTA - Dupattas
- VONI - Voni
- LEHENGA - Lehenga
- RUNNING - Running Material

**Expected**: At least 5 active product types
**SQL**:
```sql
SELECT type_code, type_name, is_active
FROM material_types
WHERE is_active = true;
```

---

#### Test 1.3: Verify all 4 reporting views exist
**Objective**: Ensure reporting infrastructure is in place
**Views Verified**:
- v_stock_by_customer - Stock aggregated by customer and material type
- v_outstanding_payments - Customers with unpaid invoices
- v_outstanding_orders - Orders not yet completed
- v_misprint_stock - Stock in misprint stage

**Expected**: All views accessible
**SQL**: `SELECT * FROM <view> LIMIT 0`

---

#### Test 1.4: Verify all 9 business functions exist
**Objective**: Ensure stored procedures are created
**Functions Verified**:
1. generate_order_number() - Auto-generate order IDs
2. generate_receipt_number() - Auto-generate receipt IDs
3. generate_challan_number() - Auto-generate challan IDs
4. generate_invoice_number() - Auto-generate invoice IDs
5. generate_credit_note_number() - Auto-generate credit note IDs
6. generate_misprint_sale_number() - Auto-generate misprint sale IDs
7. move_stock_to_stage() - Move stock between production stages
8. update_design_availability() - Update design status
9. get_customer_stock_summary() - Get stock summary for a customer

**Expected**: Functions callable without error

---

### SECTION 2: Customer Management (6 tests)

#### Test 2.1: Create test customer #1 (Job Work)
**Objective**: Verify customer creation for job work business
**Test Data**:
```json
{
  "name": "AUTOTEST-Customer-JobWork-20251220",
  "phone": "9876543210",
  "email": "autotest1_20251220@example.com",
  "address": "AUTOTEST-123 Test Street, Test City",
  "gst_number": "29AUTOTEST123F1Z5"
}
```

**Expected**:
- Customer created with UUID
- Name contains `AUTOTEST-`
- All fields saved correctly

**SQL**:
```sql
INSERT INTO customers (name, phone, email, address, gst_number, is_deleted)
VALUES (...) RETURNING *;
```

---

#### Test 2.2: Create test customer #2 (Own Stock)
**Objective**: Verify customer creation for own stock sales
**Test Data**:
```json
{
  "name": "AUTOTEST-Customer-OwnStock-20251220",
  "phone": "9876543211",
  "email": "autotest2_20251220@example.com",
  "address": "AUTOTEST-456 Test Avenue, Test City"
}
```

**Expected**: Second customer created successfully

---

#### Test 2.3: Search customers by name
**Objective**: Verify customer search functionality
**Search Term**: `%AUTOTEST-%`
**Expected**: Find at least 2 test customers
**SQL**:
```sql
SELECT * FROM customers
WHERE name ILIKE '%AUTOTEST-%';
```

---

#### Test 2.4: Search customers by phone
**Objective**: Verify phone number search
**Search Term**: `9876543210`
**Expected**: Find customer #1
**SQL**:
```sql
SELECT * FROM customers
WHERE phone = '9876543210';
```

---

#### Test 2.5: Update customer details
**Objective**: Verify customer update functionality
**Update**: Change address to `AUTOTEST-UPDATED - 789 New Street`
**Expected**:
- Address updated successfully
- updated_at timestamp changed

**SQL**:
```sql
UPDATE customers
SET address = 'AUTOTEST-UPDATED - 789 New Street',
    updated_at = NOW()
WHERE id = '<customer_id>'
RETURNING *;
```

---

#### Test 2.6: Soft delete customer
**Objective**: Verify soft delete (is_deleted flag)
**Steps**:
1. Create temporary customer
2. Set is_deleted = true
3. Verify customer still in database but marked deleted

**Expected**:
- Customer not physically deleted
- is_deleted = true

**SQL**:
```sql
UPDATE customers
SET is_deleted = true
WHERE id = '<customer_id>'
RETURNING *;
```

---

### SECTION 3: Material Receipt & Stock Management (5 tests)

#### Test 3.1: Create material receipt (Customer Material)
**Objective**: Verify material receipt for job work
**Test Data**:
```json
{
  "customer_id": "<customer_1_id>",
  "material_type": "SAREE",
  "quantity": 100,
  "ownership": "customer",
  "notes": "AUTOTEST-Test receipt - customer material"
}
```

**Expected**:
- Receipt created with auto-generated receipt_number
- receipt_number format: `RCP-YYYYMMDD-NNNN`
- ownership = 'customer'

**SQL**:
```sql
INSERT INTO material_in (customer_id, material_type, quantity, ownership, notes)
VALUES (...) RETURNING *;
```

---

#### Test 3.2: Verify receipt number format
**Objective**: Ensure auto-generated IDs follow format
**Format**: `RCP-YYYYMMDD-NNNN`
**Example**: `RCP-20251220-0001`
**Regex**: `^RCP-\d{8}-\d{4}$`

**Expected**: Receipt number matches regex pattern

---

#### Test 3.3: Create material receipt (Own Stock)
**Objective**: Verify receipt for own stock purchases
**Test Data**:
```json
{
  "customer_id": null,
  "material_type": "DUPATTA",
  "quantity": 50,
  "ownership": "self",
  "unit_cost": 500.00,
  "notes": "AUTOTEST-Test receipt - own stock"
}
```

**Expected**:
- customer_id = null (no customer for own stock)
- ownership = 'self'
- unit_cost stored

---

#### Test 3.4: Create stock entry in "received" stage
**Objective**: Verify stock tracking entry creation
**Test Data**:
```json
{
  "customer_id": "<customer_1_id>",
  "material_type": "SAREE",
  "stage": "received",
  "quantity": 100,
  "ownership": "customer",
  "designs_available": false
}
```

**Expected**:
- Stock created in 'received' stage
- Unique constraint on (customer_id, material_type, stage, ownership)

**SQL**:
```sql
INSERT INTO material_stock (customer_id, material_type, stage, quantity, ownership, designs_available)
VALUES (...) RETURNING *;
```

---

#### Test 3.5: Create multiple material types stock
**Objective**: Verify multiple material types for same customer
**Material Types**: DUPATTA, VONI, LEHENGA
**Quantity Each**: 20

**Expected**:
- 3 stock entries created
- Each with different material_type
- All in 'received' stage

---

### SECTION 4: Production Workflow & Stock Movement (7 tests)

#### Test 4.1: Move stock: received → preprocessing
**Objective**: Verify stock movement function
**Function**: `move_stock_to_stage()`
**Parameters**:
```json
{
  "p_customer_id": "<customer_1_id>",
  "p_material_type": "SAREE",
  "p_from_stage": "received",
  "p_to_stage": "preprocessing",
  "p_quantity": 25,
  "p_ownership": "customer"
}
```

**Expected**:
- 25 units moved from 'received' to 'preprocessing'
- Original stock reduced by 25
- New stock entry created with 25 units
- Function returns: `{"success": true, "quantity_moved": 25}`

**SQL**:
```sql
SELECT move_stock_to_stage(
  '<customer_id>', null, 'SAREE',
  'received', 'preprocessing', 25, 'customer'
);
```

---

#### Test 4.2: Move stock: preprocessing → printing
**Objective**: Continue production workflow
**Expected**: 25 units moved to 'printing' stage

---

#### Test 4.3: Move stock: printing → postprocessing
**Objective**: Move through printing stage
**Expected**: 20 units moved to 'postprocessing' stage

---

#### Test 4.4: Move stock: postprocessing → completed
**Objective**: Complete production workflow
**Expected**: 20 units moved to 'completed' stage (ready for delivery)

---

#### Test 4.5: Verify stock distribution across stages
**Objective**: Ensure stock is correctly distributed
**Expected Distribution** (for 100 units of SAREE):
```json
{
  "received": 75,        // 100 - 25
  "preprocessing": 0,    // 25 - 25
  "printing": 5,         // 25 - 20
  "postprocessing": 0,   // 20 - 20
  "completed": 20        // 20 delivered
}
```

**Total**: Should still be 100 units

**SQL**:
```sql
SELECT stage, SUM(quantity) as qty
FROM material_stock
WHERE customer_id = '<customer_id>'
  AND material_type = 'SAREE'
  AND ownership = 'customer'
GROUP BY stage;
```

---

#### Test 4.6: Test stock movement validation (insufficient quantity)
**Objective**: Verify function rejects invalid movements
**Action**: Try to move 99999 units (more than available)
**Expected**:
- Function returns error
- Error message contains "Insufficient stock"
- No stock actually moved

**This is a NEGATIVE test case - should fail**

---

#### Test 4.7: Update design availability
**Objective**: Verify design status tracking
**Function**: `update_design_availability()`
**Parameters**:
```json
{
  "p_customer_id": "<customer_id>",
  "p_material_type": "SAREE",
  "p_stage": "printing",
  "p_designs_available": true,
  "p_design_notes": "AUTOTEST-Design file: SAREE-TEST-001.pdf"
}
```

**Expected**:
- designs_available = true
- design_notes updated
- Function returns: `{"success": true, "designs_available": true}`

**SQL**:
```sql
SELECT update_design_availability(
  '<customer_id>', null, 'SAREE', 'printing',
  true, 'AUTOTEST-Design file: SAREE-TEST-001.pdf'
);
```

---

### SECTION 5: Order Management (6 tests)

#### Test 5.1: Create order with auto-generated order number
**Objective**: Verify order creation and ID generation
**Test Data**:
```json
{
  "customer_id": "<customer_1_id>",
  "order_date": "2025-12-20",
  "status": "pending",
  "notes": "AUTOTEST-Test order"
}
```

**Expected**:
- Order created with UUID
- order_number auto-generated: `ORD-YYYYMMDD-NNNN`
- status = 'pending'

**SQL**:
```sql
INSERT INTO orders (customer_id, order_date, status, notes)
VALUES (...) RETURNING *;
```

---

#### Test 5.2: Verify order number format
**Objective**: Ensure format consistency
**Format**: `ORD-YYYYMMDD-NNNN`
**Example**: `ORD-20251220-0001`
**Regex**: `^ORD-\d{8}-\d{4}$`

---

#### Test 5.3: Create multiple orders for same customer
**Objective**: Verify multiple orders support
**Action**: Create 3 orders for customer #1
**Expected**:
- All 3 orders created successfully
- Each has unique order_number
- Sequential numbering within same day

---

#### Test 5.4: Update order status (pending → in_progress)
**Objective**: Verify order status workflow
**Action**: Update order status
**Expected**: status changed to 'in_progress'

**SQL**:
```sql
UPDATE orders
SET status = 'in_progress'
WHERE id = '<order_id>'
RETURNING *;
```

---

#### Test 5.5: Update order status (in_progress → completed)
**Objective**: Complete order workflow
**Expected**: status changed to 'completed'

---

#### Test 5.6: Query orders by status
**Objective**: Verify filtering by status
**Filter**: status = 'pending' AND notes CONTAINS 'AUTOTEST-'
**Expected**: Find all pending test orders

**SQL**:
```sql
SELECT * FROM orders
WHERE status = 'pending'
  AND notes ILIKE '%AUTOTEST-%';
```

---

### SECTION 6: Delivery Challans (3 tests)

#### Test 6.1: Create delivery challan
**Objective**: Verify challan creation
**Test Data**:
```json
{
  "customer_id": "<customer_1_id>",
  "order_id": "<order_1_id>",
  "notes": "AUTOTEST-Test delivery challan"
}
```

**Expected**:
- Challan created with auto-generated challan_number
- Format: `CHN-YYYYMMDD-NNNN`

**Note**: May fail if delivery_date column doesn't exist in schema

---

#### Test 6.2: Verify challan number format
**Format**: `CHN-YYYYMMDD-NNNN`
**Regex**: `^CHN-\d{8}-\d{4}$`

---

#### Test 6.3: Add items to delivery challan
**Objective**: Verify challan items creation
**Test Data**:
```json
{
  "challan_id": "<challan_id>",
  "description": "AUTOTEST-SAREE - Printed",
  "quantity": 15,
  "unit_price": 800.00
}
```

**Expected**: Challan item created

**Note**: May fail if amount column doesn't exist

---

## Test Data Cleanup

### Cleanup Order (Due to Foreign Keys)

The cleanup script deletes data in this order to respect foreign key constraints:

1. **invoice_challans** - Links (no foreign key from other tables)
2. **challan_items** - Items (references delivery_challans)
3. **payments** - Payments (references gst_invoices)
4. **credit_notes** - Credit notes (references customers, gst_invoices)
5. **gst_invoices** - Invoices (references customers)
6. **delivery_challans** - Challans (references customers, orders)
7. **misprint_sales** - Misprint sales (standalone)
8. **returns** - Returns (references customers, orders)
9. **material_stock** - Stock (references customers)
10. **material_in** - Receipts (references customers)
11. **orders** - Orders (references customers)
12. **customers** - Customers (LAST - referenced by many tables)

### Cleanup SQL Queries

```sql
-- 1. Delete invoice-challan links
DELETE FROM invoice_challans
WHERE invoice_id IN (
  SELECT id FROM gst_invoices WHERE notes ILIKE '%AUTOTEST-%'
);

-- 2. Delete challan items
DELETE FROM challan_items
WHERE challan_id IN (
  SELECT id FROM delivery_challans WHERE notes ILIKE '%AUTOTEST-%'
);

-- 3. Delete payments
DELETE FROM payments WHERE notes ILIKE '%AUTOTEST-%';

-- 4. Delete credit notes
DELETE FROM credit_notes WHERE notes ILIKE '%AUTOTEST-%';

-- 5. Delete invoices
DELETE FROM gst_invoices WHERE notes ILIKE '%AUTOTEST-%';

-- 6. Delete delivery challans
DELETE FROM delivery_challans WHERE notes ILIKE '%AUTOTEST-%';

-- 7. Delete misprint sales
DELETE FROM misprint_sales WHERE notes ILIKE '%AUTOTEST-%';

-- 8. Delete returns
DELETE FROM returns WHERE reason ILIKE '%AUTOTEST-%';

-- 9. Delete stock entries (by customer)
DELETE FROM material_stock
WHERE customer_id IN (
  SELECT id FROM customers WHERE name ILIKE '%AUTOTEST-%'
);

-- 10. Delete material receipts
DELETE FROM material_in WHERE notes ILIKE '%AUTOTEST-%';

-- 11. Delete orders
DELETE FROM orders WHERE notes ILIKE '%AUTOTEST-%';

-- 12. Delete customers (LAST)
DELETE FROM customers WHERE name ILIKE '%AUTOTEST-%';
```

### Verify Cleanup

```sql
-- Check for remaining test data
SELECT 'customers' as table_name, COUNT(*) as remaining
FROM customers WHERE name ILIKE '%AUTOTEST-%'
UNION ALL
SELECT 'orders', COUNT(*)
FROM orders WHERE notes ILIKE '%AUTOTEST-%'
UNION ALL
SELECT 'material_in', COUNT(*)
FROM material_in WHERE notes ILIKE '%AUTOTEST-%';
```

---

## Expected Test Results

### Success Criteria

| Section | Tests | Expected Pass Rate |
|---------|-------|-------------------|
| Schema Verification | 4 | 100% (4/4) |
| Customer Management | 6 | 100% (6/6) |
| Material & Stock | 5 | 100% (5/5) |
| Production Workflow | 7 | 100% (7/7) |
| Order Management | 6 | 100% (6/6) |
| Delivery Challans | 3 | 67% (2/3)* |
| **Total** | **31+** | **~90%** |

*Some tests may fail due to schema differences (missing columns)

### Known Issues

1. **RLS Policies**: Tests will fail if Row-Level Security is enabled
   - Solution: Disable RLS or create appropriate policies

2. **Missing Columns**: Some tests expect columns that may not exist:
   - `delivery_challans.delivery_date`
   - `challan_items.amount`
   - `gst_invoices.gst_amount`
   - `payments.transaction_id`
   - Solution: Update test to match actual schema or add columns

3. **Schema Cache**: Supabase may show "column not in schema cache" errors
   - Solution: Wait a few seconds and retry

---

## Test Reports

### Generated Files

1. **test_results_comprehensive_TIMESTAMP.json** - Full test results in JSON format
2. **Console output** - Real-time test execution log

### Report Structure

```json
{
  "passed": 15,
  "failed": 5,
  "skipped": 0,
  "total": 20,
  "startTime": "2025-12-20T...",
  "endTime": "2025-12-20T...",
  "tests": [
    {
      "id": "SCHEMA.1",
      "name": "Verify all 13 core tables exist",
      "category": "SCHEMA",
      "status": "PASSED",
      "error": null,
      "result": {"tables_verified": 13},
      "timestamp": "2025-12-20T..."
    }
  ],
  "testDataSummary": {
    "customers": 2,
    "orders": 4,
    "material_receipts": 2,
    "stock_entries": 5,
    "delivery_challans": 1
  },
  "byCategory": {
    "SCHEMA": {"passed": 4, "failed": 0, "total": 4},
    "CUSTOMER": {"passed": 6, "failed": 0, "total": 6}
  }
}
```

---

## Troubleshooting

### Common Issues

#### Issue 1: RLS Policy Violation
```
Error: new row violates row-level security policy for table "customers"
```

**Solution**: Disable RLS
```sql
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
```

#### Issue 2: Column Not Found
```
Error: Could not find the 'delivery_date' column in schema cache
```

**Solution**: Either:
- Remove that field from test
- Add the column to schema
- Wait and retry (cache issue)

#### Issue 3: Insufficient Stock
```
Error: Insufficient stock in received stage
```

**Solution**: This is expected for validation test (Test 4.6)

---

## Maintenance

### Adding New Tests

1. Add test in appropriate section
2. Use `TEST_PREFIX` for all test data
3. Add cleanup for new entities
4. Document in this file

### Updating for Schema Changes

1. Update test data to match new schema
2. Update assertions for new constraints
3. Update cleanup order if foreign keys change
4. Re-run tests to verify

---

**Last Updated**: 2025-12-20
**Test Suite Version**: 1.0
**Maintained By**: Automated Testing Team
