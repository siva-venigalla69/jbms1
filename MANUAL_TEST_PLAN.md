# Manual Test Plan - End-to-End Testing

**Date**: 2025-12-20
**Database**: Simplified 13-table schema
**Purpose**: Verify all features work correctly after migration

---

## Test Environment Setup

### Prerequisites
- ✅ STEP_1_BACKUP.sql executed
- ✅ STEP_2_CREATE_SCHEMA.sql executed
- ✅ STEP_3_DROP_UNUSED.sql executed (optional)
- ✅ STEP_4_TEST.sql passed all 6 tests

### Database Connection
- **URL**: https://pvatfzwzfgioypdnqjay.supabase.co
- **Access**: Supabase Dashboard → SQL Editor OR Frontend Application

---

## Test Scenarios

##1. Material Receipt & Stock Tracking

### Test Case 1.1: Receive Job Work Material (Customer Material)
**Objective**: Verify we can receive customer material and track it

**Steps**:
1. Go to Material Receipt page
2. Fill in details:
   - Customer: Select existing customer
   - Material Type: SAREE
   - Quantity: 100
   - Ownership: Customer
   - Designs Available: No
3. Click "Save"

**Expected Results**:
- ✅ Receipt created with unique ID format: `RCP-20251220-0001`
- ✅ Entry created in `material_in` table
- ✅ Entry created in `material_stock` table with:
  - stage = 'received'
  - ownership = 'customer'
  - quantity = 100
  - designs_available = false

**SQL Verification**:
```sql
-- Check material_in
SELECT * FROM material_in
WHERE receipt_number LIKE 'RCP-%'
ORDER BY created_at DESC LIMIT 1;

-- Check material_stock
SELECT * FROM material_stock
WHERE stage = 'received' AND ownership = 'customer'
ORDER BY created_at DESC LIMIT 1;
```

---

### Test Case 1.2: Receive Own Stock Material
**Objective**: Verify we can receive own material for resale

**Steps**:
1. Go to Material Receipt page
2. Fill in details:
   - Customer: Leave empty or select "Own Stock"
   - Material Type: DUPATTA
   - Quantity: 50
   - Ownership: Self
   - Unit Cost: 500.00
3. Click "Save"

**Expected Results**:
- ✅ Receipt created with unique ID
- ✅ Entry in `material_stock` with:
  - customer_id = NULL (for own stock)
  - ownership = 'self'
  - unit_cost = 500.00

**SQL Verification**:
```sql
SELECT * FROM material_stock
WHERE ownership = 'self'
ORDER BY created_at DESC LIMIT 1;
```

---

## 2. Production Workflow

### Test Case 2.1: Move Stock Through Production Stages
**Objective**: Verify stock movement between stages

**Steps**:
1. Go to Production Stock page
2. Find stock in 'received' stage
3. Select material
4. Choose "Move to Preprocessing"
5. Enter quantity to move: 25
6. Click "Move"

**Expected Results**:
- ✅ Stock reduced in 'received' stage by 25
- ✅ Stock increased in 'preprocessing' stage by 25
- ✅ Function `move_stock_to_stage()` called successfully

**SQL Verification**:
```sql
-- Check stock distribution by stage
SELECT stage, SUM(quantity) as total_quantity
FROM material_stock
WHERE material_type = 'SAREE'
GROUP BY stage;
```

**Test All Stages**:
- received → preprocessing
- preprocessing → printing
- printing → postprocessing
- postprocessing → completed

---

### Test Case 2.2: Update Design Availability
**Objective**: Verify design status tracking

**Steps**:
1. Go to Production Stock page
2. Find stock waiting for designs
3. Click "Update Design Status"
4. Set:
   - Designs Available: Yes
   - Design Notes: "Design file: SAREE-001.pdf"
5. Click "Save"

**Expected Results**:
- ✅ designs_available = true
- ✅ design_notes updated

**SQL Verification**:
```sql
SELECT id, material_type, stage, designs_available, design_notes
FROM material_stock
WHERE designs_available = true;
```

---

## 3. Delivery & Invoicing

### Test Case 3.1: Create Delivery Challan
**Objective**: Verify delivery challan creation

**Steps**:
1. Go to Deliveries page
2. Click "New Delivery"
3. Fill in:
   - Customer: Select customer
   - Order: Select order
   - Delivery Date: Today
4. Add Items:
   - Material Type: SAREE
   - Quantity: 20
5. Click "Save"

**Expected Results**:
- ✅ Challan created with unique ID: `CHN-20251220-0001`
- ✅ Entry in `delivery_challans` table
- ✅ Entries in `challan_items` table
- ✅ Stock reduced from 'completed' stage

**SQL Verification**:
```sql
-- Check delivery challan
SELECT * FROM delivery_challans
WHERE challan_number LIKE 'CHN-%'
ORDER BY created_at DESC LIMIT 1;

-- Check challan items
SELECT ci.* FROM challan_items ci
JOIN delivery_challans dc ON ci.challan_id = dc.id
WHERE dc.challan_number LIKE 'CHN-%'
ORDER BY ci.created_at DESC;
```

---

### Test Case 3.2: Create Invoice from Multiple Challans
**Objective**: Verify invoice-challan linking (many-to-many)

**Steps**:
1. Go to Invoices page
2. Click "New Invoice"
3. Select Customer
4. **Select Multiple Challans**:
   - CHN-20251220-0001
   - CHN-20251220-0002
5. System calculates total from both challans
6. Add:
   - GST Amount
   - Total Amount
7. Click "Create Invoice"

**Expected Results**:
- ✅ Invoice created with unique ID: `INV-20251220-0001`
- ✅ Entry in `gst_invoices` table
- ✅ Multiple entries in `invoice_challans` linking table
- ✅ One invoice linked to multiple challans

**SQL Verification**:
```sql
-- Check invoice
SELECT * FROM gst_invoices
WHERE invoice_number LIKE 'INV-%'
ORDER BY created_at DESC LIMIT 1;

-- Check invoice-challan links
SELECT
  inv.invoice_number,
  dc.challan_number,
  ic.created_at as link_created
FROM invoice_challans ic
JOIN gst_invoices inv ON ic.invoice_id = inv.id
JOIN delivery_challans dc ON ic.challan_id = dc.id
WHERE inv.invoice_number LIKE 'INV-%'
ORDER BY ic.created_at DESC;
```

---

## 4. Returns & Misprints

### Test Case 4.1: Customer Returns Misprints
**Objective**: Verify misprint return workflow

**Steps**:
1. Go to Returns page
2. Click "New Return"
3. Fill in:
   - Return Type: Customer Return (Misprints)
   - Customer: Select customer
   - Order: Select order
   - Material Type: SAREE
   - Quantity: 5
   - Reason: "Printing defect - color mismatch"
4. Click "Save"

**Expected Results**:
- ✅ Entry in `returns` table
- ✅ Stock moved to 'misprint' stage
- ✅ Status = 'pending'

**SQL Verification**:
```sql
-- Check return record
SELECT * FROM returns
WHERE return_type = 'customer_return'
ORDER BY created_at DESC LIMIT 1;

-- Check misprint stock
SELECT * FROM material_stock
WHERE stage = 'misprint'
ORDER BY updated_at DESC;
```

---

### Test Case 4.2: Return Damaged Material to Supplier
**Objective**: Verify supplier return workflow

**Steps**:
1. Go to Returns page
2. Click "New Return"
3. Fill in:
   - Return Type: Damaged Return (to supplier)
   - Material Type: SAREE
   - Quantity: 3
   - Reason: "Fabric damaged before printing"
4. Click "Process Return"

**Expected Results**:
- ✅ Entry in `returns` table with return_type = 'damaged_return'
- ✅ Stock moved to 'damaged' stage
- ✅ Credit note created (optional)

**SQL Verification**:
```sql
SELECT * FROM material_stock
WHERE stage = 'damaged'
ORDER BY updated_at DESC;
```

---

### Test Case 4.3: Sell Misprint Stock
**Objective**: Verify misprint sales at discounted price

**Steps**:
1. Go to Misprint Sales page
2. Click "New Sale"
3. Fill in:
   - Material Type: SAREE
   - Quantity: 5
   - Unit Price: 200.00 (discounted from 800)
   - Customer Name: "Walk-in Customer"
   - Payment Method: Cash
4. Click "Record Sale"

**Expected Results**:
- ✅ Entry in `misprint_sales` table with unique ID: `MS-20251220-0001`
- ✅ Stock reduced from 'misprint' stage
- ✅ Stock moved to 'sold' stage

**SQL Verification**:
```sql
-- Check misprint sale
SELECT * FROM misprint_sales
WHERE sale_number LIKE 'MS-%'
ORDER BY created_at DESC LIMIT 1;

-- Check sold stock
SELECT * FROM material_stock
WHERE stage = 'sold'
ORDER BY updated_at DESC;
```

---

## 5. Credit Notes & Adjustments

### Test Case 5.1: Create Credit Note for Misprint Adjustment
**Objective**: Verify credit note creation for invoice adjustments

**Steps**:
1. Go to Credit Notes page
2. Click "New Credit Note"
3. Fill in:
   - Customer: Select customer
   - Invoice: Select invoice with misprints
   - Credit Amount: 1000.00
   - Reason: "Misprint adjustment for 5 sarees"
4. Click "Create"

**Expected Results**:
- ✅ Credit note created with unique ID: `CN-20251220-0001`
- ✅ Entry in `credit_notes` table
- ✅ Status = 'pending'

**SQL Verification**:
```sql
SELECT * FROM credit_notes
WHERE credit_note_number LIKE 'CN-%'
ORDER BY created_at DESC LIMIT 1;
```

---

### Test Case 5.2: Apply Credit Note to Invoice
**Objective**: Verify credit note application

**Steps**:
1. Find pending credit note
2. Click "Apply to Invoice"
3. Select invoice to apply credit
4. Click "Apply"

**Expected Results**:
- ✅ Credit note status = 'applied'
- ✅ applied_to_invoice_id set
- ✅ applied_date set
- ✅ Invoice outstanding amount reduced

**SQL Verification**:
```sql
SELECT
  cn.credit_note_number,
  cn.credit_amount,
  cn.status,
  inv.invoice_number,
  cn.applied_date
FROM credit_notes cn
LEFT JOIN gst_invoices inv ON cn.applied_to_invoice_id = inv.id
WHERE cn.status = 'applied';
```

---

## 6. Payments

### Test Case 6.1: Record Customer Payment
**Objective**: Verify payment recording

**Steps**:
1. Go to Payments page
2. Click "New Payment"
3. Fill in:
   - Customer: Select customer
   - Invoice: Select invoice
   - Amount: 5000.00
   - Payment Method: UPI
   - Payment Date: Today
   - Transaction ID: UPI123456789
4. Click "Save"

**Expected Results**:
- ✅ Entry in `payments` table
- ✅ Invoice outstanding amount reduced

**SQL Verification**:
```sql
-- Check payment
SELECT * FROM payments
ORDER BY created_at DESC LIMIT 1;

-- Check updated invoice
SELECT
  invoice_number,
  total_amount,
  (SELECT SUM(amount) FROM payments WHERE invoice_id = gst_invoices.id) as total_paid,
  total_amount - (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = gst_invoices.id) as outstanding
FROM gst_invoices
ORDER BY created_at DESC LIMIT 1;
```

---

## 7. Reports

### Test Case 7.1: Stock by Customer Report
**Objective**: Verify v_stock_by_customer view

**Steps**:
1. Go to Reports page
2. Select "Stock by Customer" report
3. View results

**Expected Results**:
- ✅ Shows stock grouped by customer
- ✅ Shows stock by material type
- ✅ Shows quantities at each stage
- ✅ Shows own stock separately (customer_name = 'Own Stock')

**SQL Verification**:
```sql
SELECT * FROM v_stock_by_customer
ORDER BY customer_name, material_type;
```

**Verify Columns**:
- customer_id
- customer_name
- material_type
- ownership
- received, preprocessing, printing, postprocessing, completed, misprint, damaged
- total_quantity

---

### Test Case 7.2: Outstanding Payments Report
**Objective**: Verify v_outstanding_payments view

**Steps**:
1. Go to Reports page
2. Select "Outstanding Payments" report
3. View results

**Expected Results**:
- ✅ Shows customers with outstanding amounts
- ✅ Shows total invoiced vs total paid
- ✅ Calculates outstanding_amount correctly

**SQL Verification**:
```sql
SELECT * FROM v_outstanding_payments
ORDER BY outstanding_amount DESC;
```

---

### Test Case 7.3: Outstanding Orders Report
**Objective**: Verify v_outstanding_orders view

**Steps**:
1. Go to Reports page
2. Select "Outstanding Orders" report
3. View results

**Expected Results**:
- ✅ Shows orders not yet completed
- ✅ Shows delivered quantity
- ✅ Shows number of challans created

**SQL Verification**:
```sql
SELECT * FROM v_outstanding_orders
ORDER BY order_date DESC;
```

---

### Test Case 7.4: Misprint Stock Report
**Objective**: Verify v_misprint_stock view

**Steps**:
1. Go to Reports page
2. Select "Misprint Stock" report
3. View results

**Expected Results**:
- ✅ Shows all material in 'misprint' stage
- ✅ Grouped by material_type and ownership
- ✅ Shows source (customer name or 'Own Stock')

**SQL Verification**:
```sql
SELECT * FROM v_misprint_stock
ORDER BY material_type, ownership;
```

---

## 8. Product Types

### Test Case 8.1: Verify Product Types
**Objective**: Verify material_types reference table

**Steps**:
1. Check dropdown in any material entry form
2. Verify available options

**Expected Results**:
- ✅ SAREE - Sarees
- ✅ DUPATTA - Dupattas
- ✅ VONI - Voni
- ✅ LEHENGA - Lehenga
- ✅ RUNNING - Running Material

**SQL Verification**:
```sql
SELECT type_code, type_name, unit_of_measure, is_active
FROM material_types
ORDER BY type_name;
```

---

## 9. Auto-Generated IDs

### Test Case 9.1: Verify Auto-Generated Number Format
**Objective**: Ensure all auto-generated IDs follow correct format

**Steps**:
1. Create one entry in each table that uses auto-generated IDs
2. Verify format

**Expected Results**:
- ✅ Orders: `ORD-YYYYMMDD-0001`
- ✅ Receipts: `RCP-YYYYMMDD-0001`
- ✅ Challans: `CHN-YYYYMMDD-0001`
- ✅ Invoices: `INV-YYYYMMDD-0001`
- ✅ Credit Notes: `CN-YYYYMMDD-0001`
- ✅ Misprint Sales: `MS-YYYYMMDD-0001`

**SQL Verification**:
```sql
-- Test all generation functions
SELECT
  generate_order_number() as order_num,
  generate_receipt_number() as receipt_num,
  generate_challan_number() as challan_num,
  generate_invoice_number() as invoice_num,
  generate_credit_note_number() as credit_note_num,
  generate_misprint_sale_number() as misprint_sale_num;
```

---

### Test Case 9.2: Verify Sequential Numbering
**Objective**: Ensure numbers increment correctly within same day

**Steps**:
1. Create first order → `ORD-20251220-0001`
2. Create second order → `ORD-20251220-0002`
3. Create third order → `ORD-20251220-0003`

**Expected Results**:
- ✅ Sequential numbering within same day
- ✅ Resets on new day

**SQL Verification**:
```sql
SELECT order_number, created_at
FROM orders
WHERE order_number LIKE 'ORD-20251220%'
ORDER BY created_at;
```

---

## 10. Business Logic Functions

### Test Case 10.1: Test move_stock_to_stage Function
**Objective**: Verify stock movement function validation

**Steps**:
1. Try to move MORE stock than available

**Expected Results**:
- ✅ Error: "Insufficient stock in [stage]. Available: X, Requested: Y"

**SQL Test**:
```sql
-- Should fail
SELECT move_stock_to_stage(
  p_customer_id := 'customer-uuid',
  p_order_id := 'order-uuid',
  p_material_type := 'SAREE',
  p_from_stage := 'received',
  p_to_stage := 'preprocessing',
  p_quantity := 99999,  -- More than available
  p_ownership := 'customer'
);
```

---

### Test Case 10.2: Test get_customer_stock_summary Function
**Objective**: Verify customer stock summary function

**Steps**:
1. Execute function for a customer

**Expected Results**:
- ✅ Returns row for each material_type + ownership combination
- ✅ Shows quantities at each stage
- ✅ Shows total_quantity

**SQL Test**:
```sql
SELECT * FROM get_customer_stock_summary('customer-uuid');
```

---

## Test Results Summary

### Test Execution Record

| Test Case | Status | Date | Tester | Notes |
|-----------|--------|------|--------|-------|
| 1.1 Material Receipt (Customer) | ⬜ | | | |
| 1.2 Material Receipt (Own Stock) | ⬜ | | | |
| 2.1 Move Stock Through Stages | ⬜ | | | |
| 2.2 Update Design Availability | ⬜ | | | |
| 3.1 Create Delivery Challan | ⬜ | | | |
| 3.2 Create Invoice from Multiple Challans | ⬜ | | | |
| 4.1 Customer Returns Misprints | ⬜ | | | |
| 4.2 Return Damaged Material | ⬜ | | | |
| 4.3 Sell Misprint Stock | ⬜ | | | |
| 5.1 Create Credit Note | ⬜ | | | |
| 5.2 Apply Credit Note | ⬜ | | | |
| 6.1 Record Payment | ⬜ | | | |
| 7.1 Stock by Customer Report | ⬜ | | | |
| 7.2 Outstanding Payments Report | ⬜ | | | |
| 7.3 Outstanding Orders Report | ⬜ | | | |
| 7.4 Misprint Stock Report | ⬜ | | | |
| 8.1 Verify Product Types | ⬜ | | | |
| 9.1 Auto-Generated ID Format | ⬜ | | | |
| 9.2 Sequential Numbering | ⬜ | | | |
| 10.1 Stock Movement Validation | ⬜ | | | |
| 10.2 Customer Stock Summary | ⬜ | | | |

### Legend
- ✅ = Passed
- ❌ = Failed
- ⬜ = Not Tested Yet
- ⚠️ = Needs Review

---

## Issues Found

### Issue Log

| Issue # | Test Case | Description | Severity | Status | Resolution |
|---------|-----------|-------------|----------|--------|------------|
| | | | | | |

**Severity Levels**:
- **Critical**: Blocks testing or causes data loss
- **High**: Major feature broken
- **Medium**: Feature partially working
- **Low**: Minor UI/UX issue

---

## Sign-Off

### Testing Complete

- [ ] All test cases executed
- [ ] All issues documented
- [ ] All critical/high issues resolved
- [ ] System ready for deployment

**Tester**: _________________
**Date**: _________________
**Signature**: _________________

---

**Next Steps**: After manual testing complete, run automated tests and compare results.
