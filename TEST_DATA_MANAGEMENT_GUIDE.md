# Test Data Management Guide
## Digital Textile Printing Management System

**Version**: 3.0.0 (Simplified 13-Table Schema)
**Last Updated**: 2025-12-21

---

## Table of Contents
1. [Overview](#overview)
2. [Test Data Strategy](#test-data-strategy)
3. [Creating Test Data](#creating-test-data)
4. [Cleaning Test Data](#cleaning-test-data)
5. [Sample Data Scripts](#sample-data-scripts)
6. [Automated Test Data Tools](#automated-test-data-tools)
7. [Best Practices](#best-practices)

---

## Overview

This guide provides comprehensive instructions for creating, managing, and cleaning test data in the Digital Textile Printing Management System.

### Database Architecture
- **Platform**: Supabase (PostgreSQL)
- **Project**: pvatfzwzfgioypdnqjay.supabase.co
- **Schema**: 13 core tables (simplified schema)
- **Access**: Supabase SQL Editor

### Current Test Data Status
```
✅ Customers: 96 active customers
✅ Orders: 11 orders (various statuses)
✅ Material Types: 5 types
✅ Material Stock: 3 stock entries
✅ Outstanding Payments: ₹15,000
```

---

## Test Data Strategy

### 1. Data Categories

#### A. Master Data (Permanent)
**Purpose**: Reference data needed for system operation
- Material Types (5 types: SAREE, DUPATTA, LEHENGA, VONI, RUNNING)
- System configuration data

**Management**: Never delete, rarely update

#### B. Test Data (Temporary)
**Purpose**: Testing and development
- Test customers
- Test orders
- Test transactions
- Sample material stock

**Management**: Clean up regularly

#### C. Demo Data (Semi-Permanent)
**Purpose**: Demonstrations and training
- Realistic customer data
- Complete workflow examples
- Sample reports

**Management**: Refresh periodically

### 2. Data Lifecycle

```
Create → Use → Verify → Clean → Reset
   ↓                               ↑
   └───────── Repeat ──────────────┘
```

---

## Creating Test Data

### Method 1: Supabase SQL Editor

**Access**: https://supabase.com/dashboard/project/pvatfzwzfgioypdnqjay/editor

#### Step 1: Create Test Customers

```sql
-- Create 10 test customers
INSERT INTO customers (name, phone, email, address, gst_number, is_active)
VALUES
  ('Test Customer 1', '9876543210', 'test1@example.com', '123 Test Street, Test City', '29ABCDE1234F1Z5', true),
  ('Test Customer 2', '9876543211', 'test2@example.com', '124 Test Street, Test City', '29ABCDE1234F2Z5', true),
  ('Test Customer 3', '9876543212', 'test3@example.com', '125 Test Street, Test City', NULL, true),
  ('Test Customer 4', '9876543213', 'test4@example.com', '126 Test Street, Test City', NULL, true),
  ('Test Customer 5', '9876543214', 'test5@example.com', '127 Test Street, Test City', '29ABCDE1234F3Z5', true),
  ('Test Customer 6', '9876543215', 'test6@example.com', '128 Test Street, Test City', NULL, true),
  ('Test Customer 7', '9876543216', 'test7@example.com', '129 Test Street, Test City', NULL, true),
  ('Test Customer 8', '9876543217', 'test8@example.com', '130 Test Street, Test City', '29ABCDE1234F4Z5', true),
  ('Test Customer 9', '9876543218', 'test9@example.com', '131 Test Street, Test City', NULL, true),
  ('Test Customer 10', '9876543219', 'test10@example.com', '132 Test Street, Test City', NULL, true);
```

#### Step 2: Create Test Orders

```sql
-- Create test orders (replace customer_id with actual IDs)
INSERT INTO orders (order_number, customer_id, order_type, status, total_amount, notes)
SELECT
  'ORD-TEST-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || generate_series,
  (SELECT id FROM customers WHERE name LIKE 'Test Customer%' ORDER BY RANDOM() LIMIT 1),
  CASE WHEN generate_series % 2 = 0 THEN 'customer_material' ELSE 'own_stock' END,
  CASE
    WHEN generate_series % 4 = 0 THEN 'completed'
    WHEN generate_series % 4 = 1 THEN 'in_progress'
    ELSE 'pending'
  END,
  (RANDOM() * 50000 + 5000)::DECIMAL(10,2),
  'Test order ' || generate_series
FROM generate_series(1, 5);
```

#### Step 3: Create Material Receipt Entries

```sql
-- Create material receipt entries for test orders
INSERT INTO material_in (
  order_id,
  customer_id,
  material_type,
  quantity,
  received_date,
  notes
)
SELECT
  o.id,
  o.customer_id,
  mt.code,
  (RANDOM() * 90 + 10)::INTEGER, -- Random quantity between 10-100
  NOW() - (RANDOM() * INTERVAL '30 days'), -- Random date within last 30 days
  'Test material receipt'
FROM orders o
CROSS JOIN (
  SELECT code FROM material_types ORDER BY RANDOM() LIMIT 1
) mt
WHERE o.order_number LIKE 'ORD-TEST-%'
LIMIT 5;
```

#### Step 4: Create Material Stock

```sql
-- Create stock entries for received materials
INSERT INTO material_stock (
  order_id,
  customer_id,
  material_type,
  stage,
  quantity,
  notes
)
SELECT
  mi.order_id,
  mi.customer_id,
  mi.material_type,
  CASE (RANDOM() * 4)::INTEGER
    WHEN 0 THEN 'received'
    WHEN 1 THEN 'preprocessing'
    WHEN 2 THEN 'printing'
    WHEN 3 THEN 'postprocessing'
    ELSE 'completed'
  END,
  mi.quantity,
  'Test stock entry'
FROM material_in mi
WHERE mi.notes = 'Test material receipt'
LIMIT 10;
```

#### Step 5: Create Delivery Challans

```sql
-- Create delivery challans for completed stock
DO $$
DECLARE
  v_challan_id UUID;
  v_order_record RECORD;
BEGIN
  -- Select a test order with completed stock
  FOR v_order_record IN
    SELECT DISTINCT ms.order_id, ms.customer_id, ms.material_type, ms.quantity
    FROM material_stock ms
    WHERE ms.stage = 'completed'
    AND ms.quantity > 0
    LIMIT 3
  LOOP
    -- Create challan
    INSERT INTO delivery_challans (
      challan_number,
      customer_id,
      order_id,
      challan_date,
      total_quantity,
      notes
    ) VALUES (
      'CHN-TEST-' || EXTRACT(EPOCH FROM NOW())::BIGINT,
      v_order_record.customer_id,
      v_order_record.order_id,
      NOW(),
      v_order_record.quantity,
      'Test delivery challan'
    ) RETURNING id INTO v_challan_id;

    -- Create challan items
    INSERT INTO challan_items (
      challan_id,
      material_type,
      quantity,
      notes
    ) VALUES (
      v_challan_id,
      v_order_record.material_type,
      v_order_record.quantity,
      'Test challan item'
    );
  END LOOP;
END $$;
```

#### Step 6: Create GST Invoices

```sql
-- Create invoices from challans
DO $$
DECLARE
  v_invoice_id UUID;
  v_challan_record RECORD;
  v_total_amount DECIMAL(10,2);
BEGIN
  FOR v_challan_record IN
    SELECT dc.id as challan_id, dc.customer_id, dc.order_id, dc.total_quantity
    FROM delivery_challans dc
    WHERE dc.notes = 'Test delivery challan'
    AND NOT EXISTS (
      SELECT 1 FROM invoice_challans ic WHERE ic.challan_id = dc.id
    )
    LIMIT 3
  LOOP
    -- Calculate amount (₹100 per piece for testing)
    v_total_amount := v_challan_record.total_quantity * 100;

    -- Create invoice
    INSERT INTO gst_invoices (
      invoice_number,
      customer_id,
      invoice_date,
      subtotal,
      cgst_amount,
      sgst_amount,
      total_amount,
      notes
    ) VALUES (
      'INV-TEST-' || EXTRACT(EPOCH FROM NOW())::BIGINT,
      v_challan_record.customer_id,
      NOW(),
      v_total_amount,
      v_total_amount * 0.09, -- 9% CGST
      v_total_amount * 0.09, -- 9% SGST
      v_total_amount * 1.18, -- Total with GST
      'Test GST invoice'
    ) RETURNING id INTO v_invoice_id;

    -- Link invoice to challan
    INSERT INTO invoice_challans (invoice_id, challan_id)
    VALUES (v_invoice_id, v_challan_record.challan_id);
  END LOOP;
END $$;
```

#### Step 7: Create Payment Entries

```sql
-- Create partial payments for invoices
INSERT INTO payments (
  invoice_id,
  customer_id,
  payment_date,
  amount,
  payment_method,
  reference_number,
  notes
)
SELECT
  inv.id,
  inv.customer_id,
  NOW() - (RANDOM() * INTERVAL '15 days'),
  (inv.total_amount * 0.5)::DECIMAL(10,2), -- 50% payment
  CASE (RANDOM() * 3)::INTEGER
    WHEN 0 THEN 'cash'
    WHEN 1 THEN 'upi'
    WHEN 2 THEN 'bank_transfer'
    ELSE 'cheque'
  END,
  'REF-' || (RANDOM() * 1000000)::INTEGER,
  'Test payment - 50% advance'
FROM gst_invoices inv
WHERE inv.notes = 'Test GST invoice'
LIMIT 3;
```

#### Step 8: Create Returns

```sql
-- Create return entries
INSERT INTO returns (
  order_id,
  customer_id,
  material_type,
  quantity,
  return_date,
  reason,
  notes
)
SELECT
  ms.order_id,
  ms.customer_id,
  ms.material_type,
  (ms.quantity * 0.1)::INTEGER, -- 10% return
  NOW(),
  CASE (RANDOM() * 3)::INTEGER
    WHEN 0 THEN 'damaged'
    WHEN 1 THEN 'wrong_design'
    ELSE 'customer_request'
  END,
  'Test return entry'
FROM material_stock ms
WHERE ms.stage = 'completed'
AND ms.quantity >= 10
LIMIT 2;
```

#### Step 9: Create Misprint Sales

```sql
-- First create misprint stock
INSERT INTO material_stock (
  order_id,
  customer_id,
  material_type,
  stage,
  quantity,
  notes
)
SELECT
  NULL, -- No specific order
  NULL, -- Own stock
  mt.code,
  'misprint',
  (RANDOM() * 20 + 5)::INTEGER,
  'Test misprint stock'
FROM material_types mt
LIMIT 3;

-- Create misprint sales
INSERT INTO misprint_sales (
  sale_number,
  material_type,
  quantity,
  unit_price,
  total_amount,
  sale_date,
  buyer_name,
  buyer_phone,
  notes
)
SELECT
  'MS-TEST-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || ROW_NUMBER() OVER(),
  ms.material_type,
  (ms.quantity * 0.5)::INTEGER,
  50.00, -- ₹50 per piece
  (ms.quantity * 0.5 * 50)::DECIMAL(10,2),
  NOW(),
  'Test Buyer ' || ROW_NUMBER() OVER(),
  '98765432' || (10 + ROW_NUMBER() OVER()),
  'Test misprint sale'
FROM material_stock ms
WHERE ms.stage = 'misprint'
AND ms.notes = 'Test misprint stock'
LIMIT 3;
```

---

## Cleaning Test Data

### Method 1: Delete All Test Data (Comprehensive Cleanup)

**⚠️ WARNING**: This will delete ALL data marked as test data!

```sql
-- Run this in Supabase SQL Editor

BEGIN;

-- 1. Delete test misprint sales
DELETE FROM misprint_sales WHERE notes LIKE '%Test%' OR sale_number LIKE '%TEST%';

-- 2. Delete test returns
DELETE FROM returns WHERE notes LIKE '%Test%';

-- 3. Delete test payments
DELETE FROM payments WHERE notes LIKE '%Test%';

-- 4. Delete test invoice-challan links
DELETE FROM invoice_challans
WHERE invoice_id IN (SELECT id FROM gst_invoices WHERE notes LIKE '%Test%');

-- 5. Delete test invoices
DELETE FROM gst_invoices WHERE notes LIKE '%Test%' OR invoice_number LIKE '%TEST%';

-- 6. Delete test challan items
DELETE FROM challan_items
WHERE challan_id IN (SELECT id FROM delivery_challans WHERE notes LIKE '%Test%');

-- 7. Delete test delivery challans
DELETE FROM delivery_challans WHERE notes LIKE '%Test%' OR challan_number LIKE '%TEST%';

-- 8. Delete test credit notes
DELETE FROM credit_notes WHERE notes LIKE '%Test%';

-- 9. Delete test material stock
DELETE FROM material_stock WHERE notes LIKE '%Test%';

-- 10. Delete test material receipts
DELETE FROM material_in WHERE notes LIKE '%Test%';

-- 11. Delete test orders
DELETE FROM orders WHERE notes LIKE '%Test%' OR order_number LIKE '%TEST%';

-- 12. Delete test customers
DELETE FROM customers
WHERE name LIKE 'Test Customer%'
OR email LIKE 'test%@example.com';

COMMIT;
```

### Method 2: Selective Cleanup (By Date)

```sql
-- Delete data older than 30 days
BEGIN;

DELETE FROM misprint_sales WHERE created_at < NOW() - INTERVAL '30 days';
DELETE FROM returns WHERE created_at < NOW() - INTERVAL '30 days';
DELETE FROM payments WHERE created_at < NOW() - INTERVAL '30 days';
DELETE FROM credit_notes WHERE created_at < NOW() - INTERVAL '30 days';
DELETE FROM invoice_challans
WHERE invoice_id IN (
  SELECT id FROM gst_invoices WHERE created_at < NOW() - INTERVAL '30 days'
);
DELETE FROM gst_invoices WHERE created_at < NOW() - INTERVAL '30 days';
DELETE FROM challan_items
WHERE challan_id IN (
  SELECT id FROM delivery_challans WHERE created_at < NOW() - INTERVAL '30 days'
);
DELETE FROM delivery_challans WHERE created_at < NOW() - INTERVAL '30 days';
DELETE FROM material_stock WHERE created_at < NOW() - INTERVAL '30 days';
DELETE FROM material_in WHERE created_at < NOW() - INTERVAL '30 days';
DELETE FROM orders WHERE created_at < NOW() - INTERVAL '30 days';

COMMIT;
```

### Method 3: Soft Delete (Mark as Inactive)

```sql
-- Mark customers as inactive instead of deleting
UPDATE customers
SET is_active = false
WHERE name LIKE 'Test Customer%';

-- Mark orders as cancelled
UPDATE orders
SET status = 'cancelled'
WHERE notes LIKE '%Test%';
```

### Method 4: Reset to Fresh State

```sql
-- ⚠️ DANGER: This deletes ALL data except master data!
BEGIN;

TRUNCATE TABLE misprint_sales CASCADE;
TRUNCATE TABLE returns CASCADE;
TRUNCATE TABLE payments CASCADE;
TRUNCATE TABLE credit_notes CASCADE;
TRUNCATE TABLE invoice_challans CASCADE;
TRUNCATE TABLE gst_invoices CASCADE;
TRUNCATE TABLE challan_items CASCADE;
TRUNCATE TABLE delivery_challans CASCADE;
TRUNCATE TABLE material_stock CASCADE;
TRUNCATE TABLE material_in CASCADE;
TRUNCATE TABLE orders CASCADE;
TRUNCATE TABLE customers CASCADE;

-- Reset sequences (auto-increment counters)
-- Material types are master data, don't truncate

COMMIT;
```

---

## Sample Data Scripts

### Complete Test Workflow Script

Save this as `create_test_workflow.sql`:

```sql
-- Complete Test Workflow: Order → Receipt → Stock → Challan → Invoice → Payment
-- Run this in Supabase SQL Editor

DO $$
DECLARE
  v_customer_id UUID;
  v_order_id UUID;
  v_receipt_id UUID;
  v_stock_id UUID;
  v_challan_id UUID;
  v_invoice_id UUID;
  v_material_type VARCHAR(20) := 'SAREE';
  v_quantity INTEGER := 50;
BEGIN
  -- 1. Create customer
  INSERT INTO customers (name, phone, email, address, gst_number, is_active)
  VALUES ('Test Workflow Customer', '9999999999', 'workflow@test.com',
          'Test Address', '29TESTGST123', true)
  RETURNING id INTO v_customer_id;

  RAISE NOTICE 'Created customer: %', v_customer_id;

  -- 2. Create order
  INSERT INTO orders (
    order_number, customer_id, order_type, status, total_amount, notes
  ) VALUES (
    'ORD-WORKFLOW-' || EXTRACT(EPOCH FROM NOW())::BIGINT,
    v_customer_id, 'customer_material', 'in_progress', 25000.00,
    'Test workflow order'
  ) RETURNING id INTO v_order_id;

  RAISE NOTICE 'Created order: %', v_order_id;

  -- 3. Material receipt
  INSERT INTO material_in (
    order_id, customer_id, material_type, quantity,
    received_date, notes
  ) VALUES (
    v_order_id, v_customer_id, v_material_type, v_quantity,
    NOW(), 'Test workflow receipt'
  ) RETURNING id INTO v_receipt_id;

  RAISE NOTICE 'Created material receipt: %', v_receipt_id;

  -- 4. Create stock (received stage)
  INSERT INTO material_stock (
    order_id, customer_id, material_type, stage, quantity, notes
  ) VALUES (
    v_order_id, v_customer_id, v_material_type, 'received',
    v_quantity, 'Test workflow stock - received'
  ) RETURNING id INTO v_stock_id;

  -- Move to preprocessing
  UPDATE material_stock SET stage = 'preprocessing' WHERE id = v_stock_id;

  -- Move to printing
  UPDATE material_stock SET stage = 'printing' WHERE id = v_stock_id;

  -- Move to postprocessing
  UPDATE material_stock SET stage = 'postprocessing' WHERE id = v_stock_id;

  -- Move to completed
  UPDATE material_stock SET stage = 'completed' WHERE id = v_stock_id;

  RAISE NOTICE 'Moved stock through all stages: %', v_stock_id;

  -- 5. Create delivery challan
  INSERT INTO delivery_challans (
    challan_number, customer_id, order_id, challan_date,
    total_quantity, notes
  ) VALUES (
    'CHN-WORKFLOW-' || EXTRACT(EPOCH FROM NOW())::BIGINT,
    v_customer_id, v_order_id, NOW(), v_quantity,
    'Test workflow challan'
  ) RETURNING id INTO v_challan_id;

  -- Add challan items
  INSERT INTO challan_items (challan_id, material_type, quantity, notes)
  VALUES (v_challan_id, v_material_type, v_quantity, 'Test workflow item');

  RAISE NOTICE 'Created delivery challan: %', v_challan_id;

  -- 6. Create GST invoice
  INSERT INTO gst_invoices (
    invoice_number, customer_id, invoice_date,
    subtotal, cgst_amount, sgst_amount, total_amount, notes
  ) VALUES (
    'INV-WORKFLOW-' || EXTRACT(EPOCH FROM NOW())::BIGINT,
    v_customer_id, NOW(),
    25000.00, 2250.00, 2250.00, 29500.00,
    'Test workflow invoice'
  ) RETURNING id INTO v_invoice_id;

  -- Link invoice to challan
  INSERT INTO invoice_challans (invoice_id, challan_id)
  VALUES (v_invoice_id, v_challan_id);

  RAISE NOTICE 'Created invoice: %', v_invoice_id;

  -- 7. Create payment (50% advance)
  INSERT INTO payments (
    invoice_id, customer_id, payment_date, amount,
    payment_method, reference_number, notes
  ) VALUES (
    v_invoice_id, v_customer_id, NOW(), 14750.00,
    'upi', 'UPI-' || (RANDOM() * 1000000)::INTEGER,
    'Test workflow payment - 50% advance'
  );

  RAISE NOTICE 'Created payment';

  -- 8. Mark order as completed
  UPDATE orders SET status = 'completed' WHERE id = v_order_id;

  RAISE NOTICE 'Test workflow completed successfully!';
  RAISE NOTICE 'Customer ID: %, Order ID: %', v_customer_id, v_order_id;

END $$;
```

---

## Automated Test Data Tools

### Tool 1: Quick Test Data Generator (Node.js Script)

Save as `generate_test_data.mjs`:

```javascript
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pvatfzwzfgioypdnqjay.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function generateTestData() {
  console.log('🎲 Generating test data...\n');

  // 1. Create customers
  console.log('Creating test customers...');
  const customers = [];
  for (let i = 1; i <= 5; i++) {
    const { data, error } = await supabase
      .from('customers')
      .insert({
        name: `Test Customer ${Date.now()}-${i}`,
        phone: `987654321${i}`,
        email: `test${Date.now()}${i}@example.com`,
        address: `Test Address ${i}`,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error:', error);
    } else {
      customers.push(data);
      console.log(`✅ Created: ${data.name}`);
    }
  }

  console.log(`\n✅ Created ${customers.length} test customers`);
  console.log('\n🎉 Test data generation complete!');
}

generateTestData();
```

Run with:
```bash
node generate_test_data.mjs
```

### Tool 2: Test Data Cleanup Script

Save as `cleanup_test_data.mjs`:

```javascript
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pvatfzwzfgioypdnqjay.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...\n');

  // Delete test customers
  const { data, error } = await supabase
    .from('customers')
    .delete()
    .like('name', 'Test Customer%')
    .select();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`✅ Deleted ${data.length} test customers`);
  }

  console.log('\n🎉 Cleanup complete!');
}

cleanupTestData();
```

---

## Best Practices

### 1. Naming Conventions

**Use consistent prefixes for test data**:
- Customers: `Test Customer [identifier]`
- Orders: `ORD-TEST-[timestamp]`
- Challans: `CHN-TEST-[timestamp]`
- Invoices: `INV-TEST-[timestamp]`
- Notes field: Always include "Test" keyword

### 2. Data Volume Guidelines

| Environment | Customers | Orders | Transactions |
|-------------|-----------|--------|--------------|
| Development | 10-20 | 5-10 | 20-50 |
| Staging | 50-100 | 50-100 | 200-500 |
| Production | Real data | Real data | Real data |

### 3. Cleanup Schedule

- **Daily**: Remove failed/incomplete test data
- **Weekly**: Clean data older than 7 days
- **Monthly**: Full cleanup of all test data
- **Before UAT**: Fresh data load

### 4. Safety Measures

✅ **DO**:
- Always use transactions (BEGIN/COMMIT)
- Use WHERE clauses with test identifiers
- Test cleanup scripts in development first
- Keep backups before major cleanup
- Document what data you create

❌ **DON'T**:
- Delete without WHERE clause
- Mix test and production data
- Use real customer information in tests
- Delete master data (material_types)
- Skip the COMMIT (or ROLLBACK on error)

### 5. Verification After Cleanup

```sql
-- Check remaining test data
SELECT
  (SELECT COUNT(*) FROM customers WHERE name LIKE 'Test%') as test_customers,
  (SELECT COUNT(*) FROM orders WHERE order_number LIKE '%TEST%') as test_orders,
  (SELECT COUNT(*) FROM delivery_challans WHERE challan_number LIKE '%TEST%') as test_challans,
  (SELECT COUNT(*) FROM gst_invoices WHERE invoice_number LIKE '%TEST%') as test_invoices;
```

Should return all zeros after cleanup.

---

## Quick Reference Commands

### Create Minimal Test Set
```sql
-- Single customer, order, and workflow
\i create_test_workflow.sql
```

### Clean All Test Data
```sql
-- Remove all data marked as test
BEGIN;
DELETE FROM customers WHERE name LIKE 'Test%' OR email LIKE 'test%@example.com';
COMMIT;
```

### Check Current Data
```sql
-- Quick data count
SELECT
  (SELECT COUNT(*) FROM customers WHERE is_active = true) as active_customers,
  (SELECT COUNT(*) FROM orders) as total_orders,
  (SELECT COUNT(*) FROM material_stock) as stock_entries,
  (SELECT COUNT(*) FROM delivery_challans) as challans,
  (SELECT COUNT(*) FROM gst_invoices) as invoices;
```

---

## Troubleshooting

### Issue: Can't delete due to foreign key constraints

**Solution**: Delete in correct order (child tables first):
```sql
-- Correct deletion order
misprint_sales → returns → payments → credit_notes →
invoice_challans → gst_invoices → challan_items →
delivery_challans → material_stock → material_in →
orders → customers
```

### Issue: Need to keep some data for reference

**Solution**: Use soft delete instead:
```sql
UPDATE customers SET is_active = false WHERE name LIKE 'Test%';
UPDATE orders SET status = 'cancelled' WHERE notes LIKE '%Test%';
```

### Issue: Accidentally deleted important data

**Solution**: Contact Supabase support for point-in-time recovery, or restore from backup.

---

**End of Guide**

For more information, see:
- [User Setup Guide](USER_SETUP_GUIDE.md)
- [Backend Architecture](BACKEND_ARCHITECTURE.md)
- [Comprehensive Test Results](COMPREHENSIVE_TEST_RESULTS.md)
