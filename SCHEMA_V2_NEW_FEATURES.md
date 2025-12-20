# 🆕 SCHEMA V2 - NEW FEATURES ADDED

**Date**: 2025-12-20
**Version**: 2.0
**Status**: Ready for execution

---

## ✅ ALL REQUESTED FEATURES NOW INCLUDED

### **1. Unique IDs for Everything** ✅

All documents now have **auto-generated unique IDs** with date-based format:

| Document | Format | Example |
|----------|--------|---------|
| **Orders** | `ORD-YYYYMMDD-0001` | `ORD-20251220-0001` |
| **Material Receipts** | `RCP-YYYYMMDD-0001` | `RCP-20251220-0001` |
| **Delivery Challans** | `CHN-YYYYMMDD-0001` | `CHN-20251220-0001` |
| **Invoices** | `INV-YYYYMMDD-0001` | `INV-20251220-0001` |
| **Credit Notes** | `CN-YYYYMMDD-0001` | `CN-20251220-0001` |
| **Misprint Sales** | `MS-YYYYMMDD-0001` | `MS-20251220-0001` |

**How it works**:
- Each type has its own sequence counter
- Numbers reset daily (so you know which day the document was created)
- Auto-increments within the day (0001, 0002, 0003...)
- **Completely automatic** - no manual numbering needed!

**Example for one day**:
```
RCP-20251220-0001  (First receipt of the day)
RCP-20251220-0002  (Second receipt)
ORD-20251220-0001  (First order)
CHN-20251220-0001  (First challan)
INV-20251220-0001  (First invoice)
```

---

### **2. Product Types (Material Types)** ✅

Created a **reference table** for your product types:

**Table**: `material_types`

**Pre-loaded with your products**:
| Code | Name | Description |
|------|------|-------------|
| `SAREE` | Sarees | Traditional sarees |
| `DUPATTA` | Dupattas | Dupattas/Chunnis |
| `VONI` | Voni | Voni/Pallu |
| `LEHENGA` | Lehenga | Lehenga sets |
| `RUNNING` | Running Material | Running fabric by meter |

**Benefits**:
- Consistent naming across system
- Easy to add new product types
- Dropdown lists in UI will use this
- Can add descriptions, units, etc.

**Example usage**:
```sql
-- When creating material receipt
INSERT INTO material_in (material_type, ...)
VALUES ('SAREE', ...);  -- Type-safe!
```

---

### **3. Invoice-Challan Linking** ✅

**NEW TABLE**: `invoice_challans`

**What it does**:
- Links invoices to delivery challans (many-to-many)
- One invoice can include multiple challans
- One challan can be referenced in invoice

**Example workflow**:
```
Delivery Challan 1: CHN-20251220-0001 (30 sarees delivered)
Delivery Challan 2: CHN-20251220-0002 (50 sarees delivered)

Create Invoice: INV-20251220-0001
├── Link to CHN-20251220-0001
└── Link to CHN-20251220-0002

Result: One invoice for both deliveries (80 sarees total)
```

**Database structure**:
```sql
CREATE TABLE invoice_challans (
  id UUID PRIMARY KEY,
  invoice_id UUID REFERENCES gst_invoices(id),
  challan_id UUID REFERENCES delivery_challans(id),
  UNIQUE(invoice_id, challan_id)
);
```

**API usage**:
```typescript
// Create invoice from multiple challans
const invoice = await invoicesApi.create({
  customer_id: 'xxx',
  order_id: 'xxx',
  // ... invoice details
});

// Link to challans
await linkInvoiceToChallan(invoice.id, challan1.id);
await linkInvoiceToChallan(invoice.id, challan2.id);
```

---

### **4. Unique Receipt Number for Material In** ✅

**Field**: `material_in.receipt_number`

**Format**: `RCP-YYYYMMDD-0001`

**Features**:
- Auto-generated on insert
- Unique constraint (no duplicates)
- Date-based for easy tracking
- Proof of material receipt

**Example**:
```sql
-- When customer brings fabric
INSERT INTO material_in (customer_id, material_type, quantity, ownership)
VALUES ('customer-a-id', 'SAREE', 100, 'customer');

-- System automatically generates:
-- receipt_number = 'RCP-20251220-0001'
```

**Use case**:
```
Customer: "I brought 100 sarees on December 15th"
You: "Yes, receipt number RCP-20251215-0003"
     → Instant lookup!
```

---

## 📊 COMPLETE FEATURE MATRIX

| Feature | Status | Implementation |
|---------|--------|----------------|
| ✅ Unique Order Number | Done | `order_number` with auto-generation |
| ✅ Unique Receipt Number | Done | `receipt_number` with auto-generation |
| ✅ Unique Challan Number | Done | `challan_number` with auto-generation |
| ✅ Unique Invoice Number | Done | `invoice_number` with auto-generation |
| ✅ Product Types | Done | `material_types` reference table |
| ✅ Invoice from Challans | Done | `invoice_challans` linking table |
| ✅ Auto-numbering | Done | 6 sequence generators |
| ✅ Date-based IDs | Done | Format: `XXX-YYYYMMDD-0001` |

---

## 🆚 WHAT CHANGED FROM V1 TO V2

### **Version 1** (Original):
```
❌ No unique receipt numbers
❌ No product types validation
❌ No invoice-challan linking
❌ Manual numbering required
❌ No auto-generation
```

### **Version 2** (Updated):
```
✅ Auto-generated receipt numbers (RCP-YYYYMMDD-0001)
✅ Product types reference table (SAREE, DUPATTA, VONI, etc.)
✅ Invoice-challan linking table (many-to-many)
✅ Auto-generated IDs for all documents
✅ Sequence generators for consistent numbering
✅ Date-based format for easy tracking
```

---

## 🔧 TECHNICAL ADDITIONS IN V2

### **New Database Objects**:

1. **1 New Table**:
   - `material_types` - Product types reference

2. **1 New Linking Table**:
   - `invoice_challans` - Invoice-to-challan mapping

3. **6 Sequence Generators**:
   - `order_number_seq`
   - `receipt_number_seq`
   - `challan_number_seq`
   - `invoice_number_seq`
   - `credit_note_seq`
   - `misprint_sale_seq`

4. **6 Number Generation Functions**:
   - `generate_order_number()`
   - `generate_receipt_number()`
   - `generate_challan_number()`
   - `generate_invoice_number()`
   - `generate_credit_note_number()`
   - `generate_misprint_sale_number()`

5. **Updated Columns**:
   - `material_in.receipt_number` - Now has default and unique constraint
   - `orders.order_number` - Now has unique constraint and default
   - `delivery_challans.challan_number` - Now has unique constraint and default
   - `gst_invoices.invoice_number` - Now has unique constraint and default

---

## 📖 HOW TO USE THE NEW FEATURES

### **Example 1: Material Receipt with Auto Number**

```sql
-- Old way (V1) - Manual numbering
INSERT INTO material_in (receipt_number, customer_id, material_type, quantity)
VALUES ('RCP-001', 'customer-id', 'Sarees', 100);  -- Manual!

-- New way (V2) - Automatic!
INSERT INTO material_in (customer_id, material_type, quantity)
VALUES ('customer-id', 'SAREE', 100);
-- receipt_number automatically becomes: RCP-20251220-0001
```

### **Example 2: Create Order with Auto Number**

```typescript
// Frontend code
const order = await ordersApi.create({
  customer_id: 'xxx',
  // order_number automatically generated: ORD-20251220-0001
  ownership_type: 'customer_material',
  total_quantity: 100,
  status: 'active'
});

console.log(order.order_number);
// Output: "ORD-20251220-0001"
```

### **Example 3: Create Invoice from Multiple Challans**

```typescript
// 1. Create delivery challans
const challan1 = await deliveriesApi.createChallan({
  customer_id: 'xxx',
  order_id: 'xxx',
  delivery_date: '2025-12-20'
  // challan_number auto: CHN-20251220-0001
}, [
  { material_type: 'SAREE', quantity: 30 }
]);

const challan2 = await deliveriesApi.createChallan({
  customer_id: 'xxx',
  order_id: 'xxx',
  delivery_date: '2025-12-20'
  // challan_number auto: CHN-20251220-0002
}, [
  { material_type: 'SAREE', quantity: 50 }
]);

// 2. Create invoice
const invoice = await invoicesApi.create({
  customer_id: 'xxx',
  order_id: 'xxx',
  // invoice_number auto: INV-20251220-0001
  invoice_type: 'job_work',
  subtotal: 12000,
  cgst_amount: 1080,
  sgst_amount: 1080,
  total_amount: 14160
});

// 3. Link invoice to both challans
await linkInvoiceToChallans(invoice.id, [challan1.id, challan2.id]);

// Now invoice INV-20251220-0001 includes both:
// - CHN-20251220-0001 (30 sarees)
// - CHN-20251220-0002 (50 sarees)
// Total: 80 sarees @ ₹150 each = ₹12,000 + GST
```

### **Example 4: Use Product Types**

```typescript
// Get all product types for dropdown
const productTypes = await supabase
  .from('material_types')
  .select('*')
  .eq('is_active', true);

// Returns:
// [
//   { type_code: 'SAREE', type_name: 'Sarees', ... },
//   { type_code: 'DUPATTA', type_name: 'Dupattas', ... },
//   { type_code: 'VONI', type_name: 'Voni', ... },
//   { type_code: 'LEHENGA', type_name: 'Lehenga', ... },
//   { type_code: 'RUNNING', type_name: 'Running Material', ... }
// ]

// Use in form
<select>
  {productTypes.map(type => (
    <option value={type.type_code}>{type.type_name}</option>
  ))}
</select>
```

---

## 🎯 MIGRATION STEPS

**Use the NEW schema file**: `database/02_CREATE_SIMPLIFIED_SCHEMA_V2.sql`

**Migration order**:
1. ✅ Execute `01_BACKUP_ALL_TABLES.sql` (backup everything)
2. ✅ Execute `02_CREATE_SIMPLIFIED_SCHEMA_V2.sql` ← **USE THIS ONE!**
3. ✅ Execute `03_DROP_UNUSED_TABLES.sql` (cleanup)

---

## ✅ VERIFICATION QUERIES

After migration, verify all features work:

### **Check Auto-Generated Numbers**:
```sql
-- Test order number generation
INSERT INTO orders (customer_id, ownership_type, total_quantity, status)
VALUES ('some-customer-id', 'customer_material', 100, 'active');

SELECT order_number FROM orders ORDER BY created_at DESC LIMIT 1;
-- Should return: ORD-20251220-0001 (or next number)
```

### **Check Product Types**:
```sql
SELECT * FROM material_types WHERE is_active = TRUE;
-- Should return 5 rows: SAREE, DUPATTA, VONI, LEHENGA, RUNNING
```

### **Check Invoice-Challan Linking**:
```sql
-- After creating an invoice and linking it
SELECT
  i.invoice_number,
  dc.challan_number
FROM gst_invoices i
JOIN invoice_challans ic ON i.id = ic.invoice_id
JOIN delivery_challans dc ON ic.challan_id = dc.id;
```

---

## 📊 SUMMARY

### **Total Database Objects in V2**:
- ✅ 13 Core Tables (11 + material_types + invoice_challans)
- ✅ 9 Helper Functions (3 business + 6 number generators)
- ✅ 4 Reporting Views
- ✅ 6 Sequence Generators

### **Key Benefits**:
1. ✅ **No manual numbering** - everything auto-generated
2. ✅ **Unique IDs for all documents** - never duplicate
3. ✅ **Product validation** - consistent material types
4. ✅ **Invoice-challan linking** - create invoices from deliveries
5. ✅ **Date-based tracking** - know when documents created
6. ✅ **Proof of receipt** - unique receipt numbers

---

## 🚀 READY TO EXECUTE!

**Next step**:
1. Open Supabase SQL Editor
2. Execute `02_CREATE_SIMPLIFIED_SCHEMA_V2.sql`
3. Verify all features work
4. Start using the system!

**All your requirements are now covered!** ✅
