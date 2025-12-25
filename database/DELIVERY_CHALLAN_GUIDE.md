# Delivery Challan System - Complete Guide
**Digital Textile Printing Job Work Management System**
**Date:** 2025-12-23
**Purpose:** Track what items (sarees, vonis, duppattas) are delivered in each challan

---

## 🎯 What You Need

**Requirement:** Print delivery challans showing:
- Customer name
- Order number
- **List of items** (material type and quantity)
- Challan date
- Get customer signature

**Example Delivery Challan:**
```
========================================
DELIVERY CHALLAN: DC-20251223-0001
========================================
Customer: Rajesh Textiles
Order: ORD-001
Date: 2025-12-23

ITEMS DELIVERED:
  1. SAREE        x 50 pieces
  2. DUPPATTA     x 20 pieces
  3. VONI         x 10 pieces

Total Items: 80 pieces

Received by: _______________
Signature:   _______________
Date:        _______________
========================================
```

---

## 📊 Database Structure

### Table 1: delivery_challans
Stores the delivery challan header information.

```sql
CREATE TABLE delivery_challans (
  id UUID PRIMARY KEY,
  challan_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  order_id UUID REFERENCES orders(id),  -- ✅ Now has order_id
  challan_date TIMESTAMP NOT NULL,
  total_quantity INTEGER DEFAULT 0,
  total_amount DECIMAL(10,2),
  delivery_status VARCHAR(20),
  notes TEXT,
  is_invoiced BOOLEAN DEFAULT FALSE,
  invoice_id UUID REFERENCES gst_invoices(id),
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Table 2: challan_items (FIXED STRUCTURE)
Stores the individual items in each challan.

**Before Fix (BROKEN):**
```sql
-- Referenced non-existent order_items table ❌
CREATE TABLE challan_items (
  id UUID PRIMARY KEY,
  challan_id UUID REFERENCES delivery_challans(id),
  order_item_id UUID REFERENCES order_items(id),  -- ❌ Table doesn't exist
  quantity INTEGER NOT NULL
);
```

**After Fix (WORKING):**
```sql
-- Directly stores material_type ✅
CREATE TABLE challan_items (
  id UUID PRIMARY KEY,
  challan_id UUID NOT NULL REFERENCES delivery_challans(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id),  -- ✅ For traceability
  material_type VARCHAR(50) NOT NULL,   -- ✅ SAREE, VONI, DUPPATTA, etc.
  quantity INTEGER NOT NULL,             -- ✅ How many
  notes TEXT,                            -- ✅ Optional notes
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔧 Migration to Fix challan_items

**File:** `12_FIX_CHALLAN_ITEMS_STRUCTURE.sql`

**Execute this to fix your database:**
```bash
# Via Supabase SQL Editor:
# Copy contents of 12_FIX_CHALLAN_ITEMS_STRUCTURE.sql
# Paste and run

# Via psql (if working):
psql $DATABASE_URL -f database/12_FIX_CHALLAN_ITEMS_STRUCTURE.sql
```

**What it does:**
1. ✅ Removes FK to non-existent order_items table
2. ✅ Drops order_item_id column
3. ✅ Adds material_type column (SAREE, VONI, DUPPATTA, etc.)
4. ✅ Adds order_id column (for reference)
5. ✅ Removes unnecessary design columns
6. ✅ Creates v_delivery_challan_details view for easy printing

---

## 💻 How to Use (SQL Examples)

### Example 1: Create Delivery Challan with Multiple Items

```sql
-- Step 1: Create the delivery challan
DO $$
DECLARE
  v_challan_id UUID;
  v_challan_number VARCHAR;
  v_customer_id UUID := '...';  -- Your customer ID
  v_order_id UUID := '...';      -- Your order ID
BEGIN
  INSERT INTO delivery_challans (
    customer_id,
    order_id,
    challan_date,
    notes
  )
  VALUES (
    v_customer_id,
    v_order_id,
    NOW(),
    'Delivery for Order ORD-001'
  )
  RETURNING id, challan_number INTO v_challan_id, v_challan_number;

  -- Step 2: Add items to the challan
  INSERT INTO challan_items (challan_id, order_id, material_type, quantity, notes) VALUES
    (v_challan_id, v_order_id, 'SAREE', 50, 'Finished sarees'),
    (v_challan_id, v_order_id, 'DUPPATTA', 20, 'Matching duppattas'),
    (v_challan_id, v_order_id, 'VONI', 10, 'Vonis for the set');

  -- Step 3: Move stock to delivered stage for each item
  PERFORM move_stock_to_stage(v_customer_id, v_order_id, 'SAREE', 'completed', 'delivered', 50, 'customer');
  PERFORM move_stock_to_stage(v_customer_id, v_order_id, 'DUPPATTA', 'completed', 'delivered', 20, 'customer');
  PERFORM move_stock_to_stage(v_customer_id, v_order_id, 'VONI', 'completed', 'delivered', 10, 'customer');

  RAISE NOTICE 'Created delivery challan: %', v_challan_number;
  RAISE NOTICE 'Items: 50 SAREES, 20 DUPPATTAS, 10 VONIS';
END $$;
```

---

### Example 2: Query Delivery Challan for Printing

```sql
-- Get complete challan details for printing
SELECT
  challan_number,
  challan_date,
  customer_name,
  order_number,
  material_type,
  quantity,
  item_notes,
  challan_notes
FROM v_delivery_challan_details
WHERE challan_number = 'DC-20251223-0001'
ORDER BY material_type;
```

**Result:**
```
 challan_number    | challan_date | customer_name    | order_number | material_type | quantity | item_notes           | challan_notes
-------------------+--------------+------------------+--------------+---------------+----------+----------------------+-------------------
 DC-20251223-0001  | 2025-12-23   | Rajesh Textiles  | ORD-001      | DUPPATTA      | 20       | Matching duppattas   | Delivery for...
 DC-20251223-0001  | 2025-12-23   | Rajesh Textiles  | ORD-001      | SAREE         | 50       | Finished sarees      | Delivery for...
 DC-20251223-0001  | 2025-12-23   | Rajesh Textiles  | ORD-001      | VONI          | 10       | Vonis for the set    | Delivery for...
```

---

### Example 3: Get All Items for a Challan

```sql
SELECT
  ci.material_type,
  ci.quantity,
  ci.notes
FROM challan_items ci
JOIN delivery_challans dc ON ci.challan_id = dc.id
WHERE dc.challan_number = 'DC-20251223-0001'
ORDER BY ci.material_type;
```

---

## 🖥️ Frontend API Implementation

### File: `frontend/src/services/simplifiedApi.ts`

**Current implementation needs update:**

```typescript
// CURRENT (lines 697-752) - Needs update
export const deliveriesApi = {
  createChallan: async (
    challan: DeliveryChallan,
    items: ChallanItem[]
  ) => {
    // This needs to be updated to use new challan_items structure
  }
}
```

**Updated implementation:**

```typescript
// UPDATED - Use this in your frontend
export interface ChallanItem {
  material_type: string  // SAREE, VONI, DUPPATTA
  quantity: number
  notes?: string
}

export const deliveriesApi = {
  createChallan: async (
    challan: Omit<DeliveryChallan, 'id' | 'created_at'>,
    items: ChallanItem[]
  ) => {
    // 1. Create delivery challan
    const { data: challanData, error: challanError } = await supabase
      .from('delivery_challans')
      .insert({
        customer_id: challan.customer_id,
        order_id: challan.order_id,  // ✅ Include order_id
        challan_date: challan.challan_date,
        notes: challan.notes
      })
      .select()
      .single()

    if (challanError) throw new Error(challanError.message)

    // 2. Create challan items
    const itemsWithChallanId = items.map(item => ({
      challan_id: challanData.id,
      order_id: challan.order_id,  // ✅ Include order_id for reference
      material_type: item.material_type,
      quantity: item.quantity,
      notes: item.notes
    }))

    const { error: itemsError } = await supabase
      .from('challan_items')
      .insert(itemsWithChallanId)

    if (itemsError) throw new Error(itemsError.message)

    // 3. Move stock to delivered stage for each item
    for (const item of items) {
      await supabase.rpc('move_stock_to_stage', {
        p_customer_id: challan.customer_id,
        p_order_id: challan.order_id,
        p_material_type: item.material_type,
        p_from_stage: 'completed',
        p_to_stage: 'delivered',
        p_quantity: item.quantity,
        p_ownership: 'customer'
      })
    }

    return challanData
  },

  // Get challan with items for printing
  getChallanDetails: async (challanNumber: string) => {
    const { data, error } = await supabase
      .from('v_delivery_challan_details')
      .select('*')
      .eq('challan_number', challanNumber)

    if (error) throw new Error(error.message)
    return data
  }
}
```

---

## 🎨 Frontend UI Example

### File: `DeliveriesSimplified.tsx`

```typescript
const [selectedItems, setSelectedItems] = useState<ChallanItem[]>([
  { material_type: 'SAREE', quantity: 0, notes: '' }
])

const handleAddItem = () => {
  setSelectedItems([
    ...selectedItems,
    { material_type: 'SAREE', quantity: 0, notes: '' }
  ])
}

const handleCreateChallan = async () => {
  const challanData = {
    customer_id: selectedCustomer.id,
    order_id: selectedOrder.id,
    challan_date: new Date().toISOString(),
    notes: challanNotes
  }

  await simplifiedApi.deliveries.createChallan(challanData, selectedItems)

  // Success! Challan created with items
}

// Render items form
{selectedItems.map((item, index) => (
  <Box key={index}>
    <Select
      value={item.material_type}
      onChange={(e) => {
        const updated = [...selectedItems]
        updated[index].material_type = e.target.value
        setSelectedItems(updated)
      }}
    >
      <MenuItem value="SAREE">Saree</MenuItem>
      <MenuItem value="DUPPATTA">Duppatta</MenuItem>
      <MenuItem value="VONI">Voni</MenuItem>
      <MenuItem value="BLOUSE">Blouse</MenuItem>
    </Select>

    <TextField
      type="number"
      label="Quantity"
      value={item.quantity}
      onChange={(e) => {
        const updated = [...selectedItems]
        updated[index].quantity = parseInt(e.target.value)
        setSelectedItems(updated)
      }}
    />

    <TextField
      label="Notes"
      value={item.notes}
      onChange={(e) => {
        const updated = [...selectedItems]
        updated[index].notes = e.target.value
        setSelectedItems(updated)
      }}
    />
  </Box>
))}

<Button onClick={handleAddItem}>+ Add Another Item</Button>
```

---

## 📄 Printing Delivery Challan

### Method 1: Query and Format in Frontend

```typescript
const printChallan = async (challanNumber: string) => {
  // Get challan details
  const details = await simplifiedApi.deliveries.getChallanDetails(challanNumber)

  // Group by challan (in case of multiple orders)
  const challan = details[0]

  // Print template
  const printContent = `
    ========================================
    DELIVERY CHALLAN: ${challan.challan_number}
    ========================================
    Customer: ${challan.customer_name}
    Order: ${challan.order_number}
    Date: ${new Date(challan.challan_date).toLocaleDateString()}

    ITEMS DELIVERED:
    ${details.map((item, i) =>
      `  ${i+1}. ${item.material_type.padEnd(12)} x ${item.quantity} pieces`
    ).join('\n')}

    Total Items: ${details.reduce((sum, item) => sum + item.quantity, 0)} pieces

    Notes: ${challan.challan_notes || 'N/A'}

    Received by: _______________
    Signature:   _______________
    Date:        _______________
    ========================================
  `

  // Print using browser print
  const printWindow = window.open('', '', 'width=600,height=400')
  printWindow.document.write(`<pre>${printContent}</pre>`)
  printWindow.print()
}
```

---

## ✅ Testing

### Test Script Updated: `3_TEST_CUSTOMER_99.sql`

**Step 8 now includes:**
```sql
-- Create delivery challan
INSERT INTO delivery_challans (...)
RETURNING id, challan_number INTO v_challan_id_1, v_challan_num_1;

-- Add challan items
INSERT INTO challan_items (challan_id, order_id, material_type, quantity, notes)
VALUES (v_challan_id_1, v_order_id, 'SAREE', 20, 'First delivery batch');

-- Move stock
PERFORM move_stock_to_stage(...);
```

**Run the test:**
```bash
psql $DATABASE_URL -f database/3_TEST_CUSTOMER_99.sql
```

---

## 🎯 Summary

| Feature | Status |
|---------|--------|
| delivery_challans has order_id | ✅ Already exists |
| challan_items structure fixed | ✅ Migration script ready |
| View for printing created | ✅ v_delivery_challan_details |
| Test script updated | ✅ Step 8 adds challan items |
| Frontend API pattern | ✅ Provided in this doc |
| Print template | ✅ Example provided |

**Next Steps:**
1. ✅ Execute `12_FIX_CHALLAN_ITEMS_STRUCTURE.sql`
2. ✅ Run updated `3_TEST_CUSTOMER_99.sql` to test
3. Update `frontend/src/services/simplifiedApi.ts` with new API
4. Update `DeliveriesSimplified.tsx` to create items
5. Test delivery challan creation in UI
6. Implement print functionality

---

**Document End**
