# Order Items Feature - Multi-Item Orders & Material Receipt

## Overview

This feature adds comprehensive support for:
1. **Multi-item orders** - Create orders with multiple material types and quantities
2. **Add items to existing orders** - Extend orders with additional items later
3. **Multi-item material receipts** - Receive multiple material types in a single transaction
4. **Auto-calculation** - Total quantity is automatically calculated from order items

---

## Database Changes

### New Table: `order_items`

Stores line items for each order with:
- Material type
- Quantity
- Unit price (optional)
- Notes per item

### Migration Script

**File:** `/database/14_ADD_ORDER_ITEMS_TABLE.sql`

**To Apply:**
```bash
# Run the migration script through Supabase SQL Editor or psql
psql $DATABASE_URL -f database/14_ADD_ORDER_ITEMS_TABLE.sql
```

**What it does:**
1. Creates `order_items` table with foreign keys to `orders` and `material_types`
2. Creates trigger to auto-update `orders.total_quantity` when items change
3. Creates `v_order_details` view for easy order + items queries
4. Creates helper functions: `add_order_item()`, `update_order_item()`, `delete_order_item()`
5. Runs automated tests to verify functionality

---

## Frontend Changes

### 1. Orders Page (`OrdersSimplified.tsx`)

**New Features:**

#### Create Order with Multiple Items
- Select customer and order details
- Add items one by one to the order:
  - Material type (SAREE, DUPATTA, VONI, etc.)
  - Quantity
  - Unit price (optional)
  - Notes per item
- Review items in a table before submitting
- Submit creates order + all items in one transaction

#### View Order Details
- Click "View" icon (eye) on any order
- Shows all order details
- Lists all order items in a table
- Displays total quantity (auto-calculated)

#### Add Items to Existing Orders
- Click "Add" icon (plus) on any order
- Add new items to the order
- Items can be added anytime, even after order creation
- Total quantity updates automatically

**Workflow Example:**
1. Customer places order for 90 SAREES + 20 DUPPATTAS
2. Create order and add both items
3. Later, customer adds 5 VONIS to the order
4. Click "Add Items" and add VONI item
5. Total quantity automatically becomes 115 (90+20+5)

### 2. Material Receipt Page (`MaterialReceiptSimplified.tsx`)

**Enhanced Features:**

#### Multi-Item Receipt
- Select customer and order
- Add multiple material types to a batch:
  - Each with its own quantity and notes
  - All items share same receipt date
  - All items linked to same order
- Submit all items in one transaction

**Workflow Example:**
1. Customer brings materials for an order
2. Select customer and link to order
3. Add items:
   - 50 SAREES
   - 20 DUPPATTAS
   - 5 VONIS
4. Submit all 3 items in one batch
5. All receipts created with same timestamp

### 3. API Changes (`simplifiedApi.ts`)

**New Exports:**
```typescript
// Types
export interface OrderItem {
  id: string
  order_id: string
  material_type: string
  quantity: number
  unit_price?: number
  notes?: string
  created_at: string
  updated_at?: string
}

export interface OrderWithItems extends Order {
  items: OrderItem[]
}

// API
simplifiedApi.orderItems.getByOrder(orderId)
simplifiedApi.orderItems.create(item)
simplifiedApi.orderItems.createMultiple(items)
simplifiedApi.orderItems.update(id, item)
simplifiedApi.orderItems.delete(id)
```

---

## Build Status

✅ **BUILD SUCCESSFUL**

```
Bundle: main.95939725.js (252.28 kB gzipped)
Status: Compiled with warnings (only unused imports, no errors)
```

---

## How to Use

### Step 1: Run Database Migration

**IMPORTANT:** Must run before using the feature!

```bash
# Through psql
psql $DATABASE_URL -f database/14_ADD_ORDER_ITEMS_TABLE.sql

# Or through Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Copy contents of 14_ADD_ORDER_ITEMS_TABLE.sql
# 3. Run the script
```

The script will:
- Create the `order_items` table
- Run automated tests
- Show success messages

### Step 2: Build and Deploy Frontend

```bash
cd frontend
npm run build
```

### Step 3: Hard Refresh Browser

```
Windows/Linux: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

---

## Usage Examples

### Example 1: Create Multi-Item Order

**Scenario:** Customer orders 90 sarees, 20 duppattas, 5 vonis

1. Go to **Orders** page
2. Fill in order details:
   - Customer: Select customer
   - Order Date: Today
   - Expected Delivery: Next week
3. Add items:
   - Material: SAREE, Quantity: 90, Unit Price: 100
   - Click "Add Item to Order"
   - Material: DUPATTA, Quantity: 20, Unit Price: 50
   - Click "Add Item to Order"
   - Material: VONI, Quantity: 5, Unit Price: 30
   - Click "Add Item to Order"
4. Review items in table (shows 3 items, 115 total quantity)
5. Click "Create Order with 3 Item(s)"
6. Order created with auto-generated order number (e.g., ORD-20251225-0001)

### Example 2: Add Items to Existing Order

**Scenario:** Customer later adds 10 more sarees to existing order

1. Go to **Orders** page
2. Find the order in the list
3. Click the "+" (Add) icon
4. Add item:
   - Material: SAREE, Quantity: 10, Unit Price: 100
   - Click "Add Item"
5. Click "Add 1 Item(s)"
6. Total quantity auto-updates from 115 to 125

### Example 3: Multi-Item Material Receipt

**Scenario:** Customer brings all materials at once

1. Go to **Material Receipt** page
2. Select customer
3. Link to the order created above
4. Add items:
   - SAREE: 90
   - DUPATTA: 20
   - VONI: 5
   - Extra SAREE: 10 (from added item)
5. Submit all 4 items in one batch
6. All receipts created with same timestamp and linked to order

---

## Database Schema

### `orders` Table
```sql
id               UUID (PK)
customer_id      UUID (FK to customers)
order_number     VARCHAR(50) UNIQUE (auto-generated)
ownership_type   VARCHAR(20) (customer_material | own_stock)
total_quantity   INTEGER (auto-calculated from order_items)
status           VARCHAR(20) (active | completed | cancelled)
order_date       TIMESTAMP
expected_delivery_date TIMESTAMP
notes            TEXT
created_at       TIMESTAMP
updated_at       TIMESTAMP
```

### `order_items` Table (NEW)
```sql
id            UUID (PK)
order_id      UUID (FK to orders, CASCADE DELETE)
material_type VARCHAR(50) (FK to material_types)
quantity      INTEGER (must be > 0)
unit_price    DECIMAL(10, 2) (optional)
notes         TEXT (optional)
created_at    TIMESTAMP
updated_at    TIMESTAMP
```

### Auto-Calculation Trigger

When order_items are inserted/updated/deleted:
1. Trigger fires automatically
2. Calculates `SUM(quantity)` from all items
3. Updates `orders.total_quantity`
4. No manual calculation needed!

---

## API Endpoints

### Orders

```typescript
// Get all orders with auto-calculated total_quantity
const orders = await simplifiedApi.orders.getAll()

// Create order (total_quantity will be 0 initially)
const order = await simplifiedApi.orders.create({
  customer_id: 'xxx',
  order_number: '', // auto-generated
  ownership_type: 'customer_material',
  total_quantity: 0, // will be auto-calculated
  status: 'active',
  order_date: '2025-12-25',
  notes: 'Customer order'
})
```

### Order Items

```typescript
// Add items to order
const items = await simplifiedApi.orderItems.createMultiple([
  {
    order_id: order.id,
    material_type: 'SAREE',
    quantity: 90,
    unit_price: 100,
    notes: 'First batch'
  },
  {
    order_id: order.id,
    material_type: 'DUPATTA',
    quantity: 20,
    unit_price: 50
  }
])
// After this, order.total_quantity automatically becomes 110

// Get all items for an order
const orderItems = await simplifiedApi.orderItems.getByOrder(order.id)

// Add more items later
const newItem = await simplifiedApi.orderItems.create({
  order_id: order.id,
  material_type: 'VONI',
  quantity: 5
})
// order.total_quantity automatically becomes 115
```

---

## Benefits

### 1. **Accurate Order Tracking**
- Know exactly what materials and quantities are in each order
- No more confusion with just a "total quantity"

### 2. **Flexible Ordering**
- Start with some items
- Add more items later as customer finalizes
- Each item can have its own price and notes

### 3. **Batch Material Receipt**
- Receive all materials for an order in one transaction
- Saves time vs creating separate receipts

### 4. **Automatic Calculations**
- Total quantity always correct
- Database trigger ensures consistency
- No manual calculations needed

### 5. **Better Reporting**
- See breakdown of materials per order
- Track which material types are most ordered
- Better inventory management

---

## Testing Checklist

After deploying, test these scenarios:

- [ ] Create order with 2-3 items
- [ ] View order details and verify items are shown
- [ ] Add more items to existing order
- [ ] Verify total quantity updates automatically
- [ ] Create multi-item material receipt linked to order
- [ ] Verify all receipts are linked to same order
- [ ] Check that order number is auto-generated (ORD-YYYYMMDD-XXXX format)
- [ ] Test with both customer_material and own_stock orders
- [ ] Remove an item from pending list before submitting

---

## Troubleshooting

### Error: Table "order_items" does not exist

**Solution:** Run the database migration script first:
```bash
psql $DATABASE_URL -f database/14_ADD_ORDER_ITEMS_TABLE.sql
```

### Total quantity not updating

**Solution:** Check that the trigger is created:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'trg_update_order_total';
```

If not exists, re-run the migration script.

### Can't see new order items in UI

**Solution:** Hard refresh browser (Ctrl+Shift+R)

---

## Summary

This feature transforms orders from simple "total quantity" records into detailed multi-item work orders with:

✅ Multiple material types per order
✅ Individual quantities and prices
✅ Ability to add items later
✅ Auto-calculated totals
✅ Multi-item material receipts
✅ Complete order/item tracking

Perfect for managing complex textile printing orders with multiple material types!
