# Schema Clarification - gst_invoices Table
**Date:** 2025-12-23
**Issue:** Test script error due to schema mismatch

---

## ⚠️ Important: Actual Schema vs. Expected Schema

### Issue Found

The test script `3_TEST_CUSTOMER_99.sql` was trying to insert into columns that don't exist in the actual `gst_invoices` table:

**Columns that DON'T exist:**
- ❌ `order_id` - NOT in the table
- ❌ `status` - NOT in the table
- ❌ `invoice_type` - NOT in base table (may be added by migrations)

### Actual gst_invoices Schema

**Source:** `database/schema.sql:136-156`

```sql
CREATE TABLE gst_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    invoice_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    cgst_rate DECIMAL(5,2) DEFAULT 9.00,
    sgst_rate DECIMAL(5,2) DEFAULT 9.00,
    igst_rate DECIMAL(5,2) DEFAULT 0.00,
    cgst_amount DECIMAL(12,2) DEFAULT 0.00,
    sgst_amount DECIMAL(12,2) DEFAULT 0.00,
    igst_amount DECIMAL(12,2) DEFAULT 0.00,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    outstanding_amount DECIMAL(12,2) DEFAULT 0.00,
    notes TEXT,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id UUID REFERENCES users(id),
    updated_by_user_id UUID REFERENCES users(id)
);
```

### Columns Present in Actual Schema

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | NOT NULL | uuid_generate_v4() | Primary key |
| `invoice_number` | VARCHAR(50) | NOT NULL | - | Unique |
| `customer_id` | UUID | NOT NULL | - | FK to customers |
| `invoice_date` | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | |
| `subtotal` | DECIMAL(12,2) | NOT NULL | 0.00 | |
| `cgst_rate` | DECIMAL(5,2) | NULL | 9.00 | |
| `sgst_rate` | DECIMAL(5,2) | NULL | 9.00 | |
| `igst_rate` | DECIMAL(5,2) | NULL | 0.00 | |
| `cgst_amount` | DECIMAL(12,2) | NULL | 0.00 | |
| `sgst_amount` | DECIMAL(12,2) | NULL | 0.00 | |
| `igst_amount` | DECIMAL(12,2) | NULL | 0.00 | |
| `total_amount` | DECIMAL(12,2) | NOT NULL | 0.00 | |
| `outstanding_amount` | DECIMAL(12,2) | NULL | 0.00 | Amount still owed |
| `notes` | TEXT | NULL | - | |
| `is_deleted` | BOOLEAN | NULL | false | Soft delete flag |
| `created_at` | TIMESTAMP | NULL | CURRENT_TIMESTAMP | |
| `updated_at` | TIMESTAMP | NULL | CURRENT_TIMESTAMP | |
| `created_by_user_id` | UUID | NULL | - | FK to users |
| `updated_by_user_id` | UUID | NULL | - | FK to users |

---

## ✅ Fix Applied

### File: `3_TEST_CUSTOMER_99.sql`

**Before (WRONG):**
```sql
INSERT INTO gst_invoices (
  customer_id, order_id, invoice_type, invoice_date,
  subtotal, cgst_rate, cgst_amount, sgst_rate, sgst_amount,
  igst_rate, igst_amount, total_amount, status, notes
)
VALUES (
  v_customer_id, v_order_id, 'job_work', '2025-12-21 17:00:00',
  v_net, 9.00, v_cgst, 9.00, v_sgst,
  0.00, 0.00, v_total, 'pending',
  '37 sarees @ Rs.100 = Rs.3700...'
)
```

**After (CORRECT):**
```sql
INSERT INTO gst_invoices (
  customer_id, invoice_date,
  subtotal, cgst_rate, cgst_amount, sgst_rate, sgst_amount,
  igst_rate, igst_amount, total_amount, notes
)
VALUES (
  v_customer_id, '2025-12-21 17:00:00',
  v_net, 9.00, v_cgst, 9.00, v_sgst,
  0.00, 0.00, v_total,
  'Job Work Invoice - 37 sarees @ Rs.100 = Rs.3700...'
)
```

**Also fixed SELECT statement (Line 339):**
```sql
-- Before (WRONG):
SELECT invoice_number, total_amount, status
FROM gst_invoices...

-- After (CORRECT):
SELECT invoice_number, total_amount, outstanding_amount
FROM gst_invoices...
```

---

## 🔍 Why This Mismatch Occurred

### Design Evolution

The system appears to have evolved through multiple schema versions:

1. **Original Schema** (`schema.sql`) - Simple invoice table without order tracking
2. **Enhanced Schema** (expected by test scripts) - Added order_id, status, invoice_type

### Migration Files

The file `STEP_2_CREATE_SCHEMA.sql:386` shows an attempt to add `invoice_type`:

```sql
ALTER TABLE gst_invoices ADD COLUMN invoice_type VARCHAR(20) DEFAULT 'job_work'
  CHECK (invoice_type IN ('job_work', 'sales'));
```

**But this migration:**
- Only adds `invoice_type` (not order_id or status)
- May not have been executed on your database

---

## 📋 Recommended Actions

### 1. Verify Current Database Schema

Run this query to see what columns actually exist:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'gst_invoices'
ORDER BY ordinal_position;
```

### 2. Option A: Keep Simple Schema (Recommended)

**Advantages:**
- Simpler design
- Fewer columns to manage
- Invoice-to-order relationship via invoice_challans → delivery_challans → order_id

**Current relationship:**
```
gst_invoices
  ↓ (via invoice_challans)
delivery_challans
  ↓ (has order_id column)
orders
```

**Use JOIN to get order info:**
```sql
SELECT
  i.invoice_number,
  i.total_amount,
  dc.order_id,
  o.order_number
FROM gst_invoices i
JOIN invoice_challans ic ON i.id = ic.invoice_id
JOIN delivery_challans dc ON ic.challan_id = dc.id
JOIN orders o ON dc.order_id = o.id;
```

### 3. Option B: Add Missing Columns (If Needed)

If you need direct order tracking in invoices:

```sql
-- Add order_id (if needed)
ALTER TABLE gst_invoices
  ADD COLUMN order_id UUID REFERENCES orders(id);

-- Add status (if needed)
ALTER TABLE gst_invoices
  ADD COLUMN status VARCHAR(20) DEFAULT 'pending'
  CHECK (status IN ('pending', 'paid', 'cancelled', 'partial'));

-- Add invoice_type (if not already present)
ALTER TABLE gst_invoices
  ADD COLUMN invoice_type VARCHAR(20) DEFAULT 'job_work'
  CHECK (invoice_type IN ('job_work', 'sales'));
```

**However, we recommend Option A (keep simple schema)** because:
- Invoice can cover multiple orders (via multiple delivery challans)
- Adding single order_id would limit this flexibility
- Current design is more flexible

---

## 🔄 Frontend API Impact

### Current Frontend API (simplifiedApi.ts)

The frontend TypeScript interface needs to match the actual schema:

**Location:** `frontend/src/services/simplifiedApi.ts:177-195`

**Current (may be incorrect):**
```typescript
export interface GSTInvoice {
  id: string
  invoice_number: string
  customer_id: string
  order_id: string              // ❌ Doesn't exist
  invoice_type: 'job_work' | 'sales'  // ❌ May not exist
  invoice_date: string
  subtotal: number
  cgst_rate: number
  cgst_amount: number
  sgst_rate: number
  sgst_amount: number
  igst_rate: number
  igst_amount: number
  total_amount: number
  status: string                // ❌ Doesn't exist
  notes?: string
  created_at: string
}
```

**Should be (matching actual schema):**
```typescript
export interface GSTInvoice {
  id: string
  invoice_number: string
  customer_id: string
  invoice_date: string
  subtotal: number
  cgst_rate: number
  cgst_amount: number
  sgst_rate: number
  sgst_amount: number
  igst_rate: number
  igst_amount: number
  total_amount: number
  outstanding_amount: number    // ✅ Exists
  notes?: string
  is_deleted: boolean           // ✅ Exists
  created_at: string
  updated_at?: string           // ✅ Exists
  created_by_user_id?: string   // ✅ Exists
  updated_by_user_id?: string   // ✅ Exists
}
```

---

## ✅ Testing After Fix

**Run the updated test:**
```bash
psql $DATABASE_URL -f database/3_TEST_CUSTOMER_99.sql
```

**Expected:** Step 10 should now complete without errors

---

## 📞 Related Files Updated

1. ✅ `3_TEST_CUSTOMER_99.sql` - Fixed INSERT and SELECT statements
2. 📝 `frontend/src/services/simplifiedApi.ts` - Review and update GSTInvoice interface
3. 📝 `COMPLETE_SYSTEM_DMD.md` - Review invoice traceability section

---

## 🎯 Summary

**Problem:** Test script assumed gst_invoices had order_id, status, and invoice_type columns
**Actual Schema:** Only has customer_id, amounts, dates, and outstanding_amount
**Solution:** Updated test script to use actual schema columns
**Recommendation:** Keep simple schema, use JOINs to get order info when needed

**Status:** ✅ FIXED - Test script now matches actual database schema

---

**Document End**
