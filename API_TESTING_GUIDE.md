

# API Testing Guide - Digital Textile Printing System
## Complete API Mapping, Testing & Automation

**Created:** 2025-12-22
**Last Updated:** 2025-12-22 (Added expected_delivery_date column)
**Purpose:** Document all APIs, SQL functions, frontend screens, and testing procedures

## ⚠️ Important Notes (Latest Updates)

1. **Design Tracking:** Uses `material_design_tracking` table (separate from material_stock)
   - ❌ **Deprecated:** `material_stock.designs_given`, `material_stock.designs_pending` (removed by script 5)
   - ✅ **Current:** Use `material_design_tracking` table with columns: `designs_given`, `designs_pending`

2. **Active Stock Filtering:** Always filter by `is_active=true` for current stock
   - `is_active=true` → Current stock
   - `is_active=false` → Historical movements (audit trail)

3. **Orders Table Columns:**
   - `order_number` (auto-generated: ORD-000001)
   - `order_date`, `expected_delivery_date`, `notes`
   - `ownership_type` ('customer_material' or 'own_stock')
   - `total_quantity`, `status`

---

## 📋 Table of Contents

1. [API Endpoint Mapping](#api-endpoint-mapping)
2. [SQL Function → API → Screen Mapping](#sql-function--api--screen-mapping)
3. [Manual API Testing](#manual-api-testing)
4. [Automated API Tests](#automated-api-tests)
5. [Frontend Manual Testing](#frontend-manual-testing)

---

## 🗺️ API Endpoint Mapping

### Supabase Auto-Generated REST API

**Base URL:** `https://your-project.supabase.co/rest/v1/`
**Auth Header:** `apikey: your-anon-key`
**Authorization:** `Bearer your-access-token`

| Endpoint | Method | Purpose | Screen |
|----------|--------|---------|--------|
| `/customers` | GET | List all customers | Customers, Dashboard |
| `/customers` | POST | Create customer | Customers |
| `/customers?id=eq.{id}` | PATCH | Update customer | Customers |
| `/customers?id=eq.{id}` | DELETE | Delete customer | Customers |
| `/orders` | GET | List all orders | Dashboard, Reports |
| `/orders` | POST | Create order | Material Receipt |
| `/material_in` | GET | List material receipts | Material Receipt, Reports |
| `/material_in` | POST | Receive material | Material Receipt |
| `/material_stock` | GET | List stock (active) | Production Stock |
| `/material_stock?is_active=eq.true` | GET | Get active stock only | Production Stock |
| `/material_design_tracking` | GET | Get design status | Production Stock |
| `/material_design_tracking` | POST | Create design tracking | Material Receipt |
| `/material_design_tracking?id=eq.{id}` | PATCH | Update design count | Production Stock |
| `/delivery_challans` | GET | List challans | Deliveries |
| `/delivery_challans` | POST | Create challan | Deliveries |
| `/gst_invoices` | GET | List invoices | Invoices |
| `/gst_invoices` | POST | Create invoice | Invoices |
| `/payments` | GET | List payments | Payments |
| `/payments` | POST | Record payment | Payments |

### RPC Endpoints (PostgreSQL Functions)

| Endpoint | Method | SQL Function | Purpose | Screen |
|----------|--------|--------------|---------|--------|
| `/rpc/move_stock_to_stage` | POST | `move_stock_to_stage()` | Move stock between stages | Production Stock |
| `/rpc/update_design_count` | POST | `update_design_count()` | Update design tracking | Production Stock |
| `/rpc/get_order_summary` | POST | `get_order_summary()` | Get order summary | Dashboard, Reports |
| `/rpc/generate_order_number` | POST | `generate_order_number()` | Auto-generate order number | Material Receipt |

### Views (Read-Only)

| View | Purpose | Accessed From Screen |
|------|---------|---------------------|
| `v_order_lifecycle` | Complete order tracking | Dashboard, Reports |
| `v_pending_designs` | Customer follow-up list | Reports, Production Stock |
| `v_stock_movement_history` | Complete audit trail | Reports (future) |
| `v_outstanding_payments` | Payment tracking | Dashboard, Payments |
| `v_outstanding_orders` | Pending deliveries | Dashboard |
| `v_stock_by_customer` | Customer-wise stock | Reports |
| `v_misprint_stock` | Misprint inventory | Reports |

---

## 🔗 SQL Function → API → Screen Mapping

### 1. Stock Movement Function

**SQL Function:**
```sql
move_stock_to_stage(
  p_customer_id UUID,
  p_order_id UUID,
  p_material_type VARCHAR,
  p_from_stage VARCHAR,
  p_to_stage VARCHAR,
  p_quantity INTEGER,
  p_ownership VARCHAR
)
```

**API Endpoint:**
```
POST /rest/v1/rpc/move_stock_to_stage
Content-Type: application/json
apikey: your-anon-key
Authorization: Bearer token

{
  "p_customer_id": "uuid-here",
  "p_order_id": "uuid-here",
  "p_material_type": "SAREE",
  "p_from_stage": "received",
  "p_to_stage": "preprocessing",
  "p_quantity": 50,
  "p_ownership": "customer"
}
```

**Frontend Screen:** Production Stock (`ProductionStock.tsx`)
**Function Call:** `simplifiedApi.stock.moveToStage()`
**User Action:** Click "Move to Next Stage" button

**Manual Test:**
1. Go to Production Stock page
2. Select a stock item
3. Click "Move Stock" button
4. Enter quantity and select destination stage
5. Click "Move"
6. Verify stock moved to new stage

---

### 2. Design Count Update Function

**SQL Function:**
```sql
update_design_count(
  p_customer_id UUID,
  p_material_type VARCHAR,
  p_designs_to_add INTEGER,
  p_batch_identifier VARCHAR
)
```

**API Endpoint:**
```
POST /rest/v1/rpc/update_design_count
Content-Type: application/json
apikey: your-anon-key
Authorization: Bearer token

{
  "p_customer_id": "uuid-here",
  "p_material_type": "SAREE",
  "p_designs_to_add": 30,
  "p_batch_identifier": "Batch-20Dec2025-1"
}
```

**Frontend Screen:** Production Stock (`ProductionStock.tsx`)
**Function Call:** `simplifiedApi.stock.updateDesignCount()`
**User Action:** Click "Update Design Count" button

**Manual Test:**
1. Go to Production Stock page
2. Select a stock item with customer material
3. Click "🎨" (design) icon
4. Enter number of designs given by customer
5. Click "Update"
6. Verify designs_given increases, designs_pending decreases

---

### 3. Order Summary Function

**SQL Function:**
```sql
get_order_summary(p_order_id UUID)
RETURNS TABLE (...)
```

**API Endpoint:**
```
POST /rest/v1/rpc/get_order_summary
Content-Type: application/json
apikey: your-anon-key
Authorization: Bearer token

{
  "p_order_id": "uuid-here"
}
```

**Frontend Screen:** Dashboard (`SimplifiedDashboard.tsx`), Reports
**Function Call:** `simplifiedApi.orders.getSummary()`
**User Action:** View dashboard metrics

**Manual Test:**
1. Go to Dashboard
2. View order summary metrics
3. Verify correct counts for received, delivered, invoiced

---

### 4. Order Number Generation Function

**SQL Function:**
```sql
generate_order_number()
RETURNS VARCHAR
```

**API Endpoint:**
```
POST /rest/v1/rpc/generate_order_number
Content-Type: application/json
apikey: your-anon-key
Authorization: Bearer token

{}
```

**Frontend Screen:** Material Receipt (`MaterialReceiptSimplified.tsx`)
**Function Call:** Auto-triggered on order creation
**User Action:** Create new order (optional)

**Manual Test:**
1. Go to Material Receipt page
2. Create new receipt (creates order if needed)
3. Verify order_number is auto-generated (ORD-000001, ORD-000002, etc.)

---

## 🧪 Manual API Testing

### Setup

1. **Get Supabase Credentials:**
   - Project URL: `https://your-project.supabase.co`
   - Anon Key: From Supabase Dashboard → Settings → API
   - Access Token: Login via frontend, get token from localStorage

2. **Testing Tool:** Use Postman, Insomnia, or curl

### Test 1: Create Customer

```bash
curl -X POST "https://your-project.supabase.co/rest/v1/customers" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "name": "API Test Customer",
    "phone": "9999999990",
    "email": "apitest@test.com",
    "gst_number": "29APITEST123Z5",
    "address": "API Test Address",
    "is_active": true
  }'
```

**Expected:** Status 201, returns customer object with auto-generated id

### Test 2: Create Order

```bash
curl -X POST "https://your-project.supabase.co/rest/v1/orders" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "customer_id": "CUSTOMER_UUID_FROM_TEST_1",
    "ownership_type": "customer_material",
    "total_quantity": 50,
    "status": "active",
    "order_date": "2025-12-22T10:00:00Z",
    "expected_delivery_date": "2025-12-27T10:00:00Z",
    "notes": "API test order"
  }'
```

**Expected:** Status 201, returns order with auto-generated order_number (ORD-000XXX)

### Test 3: Receive Material

```bash
curl -X POST "https://your-project.supabase.co/rest/v1/material_in" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "customer_id": "CUSTOMER_UUID",
    "order_id": "ORDER_UUID",
    "material_type": "SAREE",
    "quantity": 50,
    "ownership": "customer",
    "received_date": "2025-12-22T10:00:00Z",
    "notes": "API test material receipt"
  }'
```

**Expected:** Status 201, material_in record created

### Test 4: Create Stock Record

```bash
curl -X POST "https://your-project.supabase.co/rest/v1/material_stock" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "customer_id": "CUSTOMER_UUID",
    "order_id": "ORDER_UUID",
    "material_type": "SAREE",
    "stage": "received",
    "quantity": 50,
    "ownership": "customer",
    "is_active": true
  }'
```

**Expected:** Status 201, stock record created in received stage

### Test 5: Create Design Tracking

```bash
curl -X POST "https://your-project.supabase.co/rest/v1/material_design_tracking" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "customer_id": "CUSTOMER_UUID",
    "material_type": "SAREE",
    "total_quantity": 50,
    "designs_given": 0,
    "designs_pending": 50,
    "batch_identifier": "API-TEST-BATCH-1"
  }'
```

**Expected:** Status 201, design tracking created

### Test 6: Update Design Count (RPC)

```bash
curl -X POST "https://your-project.supabase.co/rest/v1/rpc/update_design_count" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "p_customer_id": "CUSTOMER_UUID",
    "p_material_type": "SAREE",
    "p_designs_to_add": 25,
    "p_batch_identifier": "API-TEST-BATCH-1"
  }'
```

**Expected:** Status 200 or 204, design tracking updated (designs_given = 25, designs_pending = 25)

### Test 7: Move Stock Between Stages (RPC)

```bash
curl -X POST "https://your-project.supabase.co/rest/v1/rpc/move_stock_to_stage" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "p_customer_id": "CUSTOMER_UUID",
    "p_order_id": "ORDER_UUID",
    "p_material_type": "SAREE",
    "p_from_stage": "received",
    "p_to_stage": "preprocessing",
    "p_quantity": 25,
    "p_ownership": "customer"
  }'
```

**Expected:** Status 200 or 204, stock moved (new active record in preprocessing, old record marked inactive)

### Test 8: Get Active Stock

```bash
curl -X GET "https://your-project.supabase.co/rest/v1/material_stock?is_active=eq.true&customer_id=eq.CUSTOMER_UUID&select=*" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected:** Returns only active stock records

### Test 9: Get Order Lifecycle

```bash
curl -X GET "https://your-project.supabase.co/rest/v1/v_order_lifecycle?customer_name=eq.API%20Test%20Customer&select=*" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected:** Returns complete order tracking with all stages

### Test 10: Get Pending Designs

```bash
curl -X GET "https://your-project.supabase.co/rest/v1/v_pending_designs?customer_name=eq.API%20Test%20Customer&select=*" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected:** Returns design tracking with designs_pending > 0

---

## 🤖 Automated API Tests

Create file: `/home/siva/sandboxes/jbms1/tests/api-tests.js`

```javascript
const { createClient } = require('@supabase/supabase-js');
const assert = require('assert');

// Configuration
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test customer IDs
let testCustomerId;
let testOrderId;

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

async function test1_CreateCustomer() {
  log(colors.yellow, '\n=== Test 1: Create Customer ===');

  const { data, error } = await supabase
    .from('customers')
    .insert({
      name: 'Automated Test Customer',
      phone: '9999999991',
      email: 'autotest@test.com',
      gst_number: '29AUTOTEST123Z',
      address: 'Automated Test Address',
      is_active: true
    })
    .select()
    .single();

  assert(!error, `Error creating customer: ${error?.message}`);
  assert(data.id, 'Customer ID should be generated');
  testCustomerId = data.id;

  log(colors.green, `✓ Customer created: ${testCustomerId}`);
  return data;
}

async function test2_CreateOrder() {
  log(colors.yellow, '\n=== Test 2: Create Order ===');

  const { data, error } = await supabase
    .from('orders')
    .insert({
      customer_id: testCustomerId,
      ownership_type: 'customer_material',
      total_quantity: 60,
      status: 'active',
      order_date: new Date().toISOString(),
      expected_delivery_date: new Date(Date.now() + 5*24*60*60*1000).toISOString(), // 5 days from now
      notes: 'Automated test order'
    })
    .select()
    .single();

  assert(!error, `Error creating order: ${error?.message}`);
  assert(data.order_number, 'Order number should be auto-generated');
  assert(data.order_number.startsWith('ORD-'), 'Order number should start with ORD-');
  testOrderId = data.id;

  log(colors.green, `✓ Order created: ${data.order_number} (${testOrderId})`);
  return data;
}

async function test3_ReceiveMaterial() {
  log(colors.yellow, '\n=== Test 3: Receive Material ===');

  const { data, error } = await supabase
    .from('material_in')
    .insert({
      customer_id: testCustomerId,
      order_id: testOrderId,
      material_type: 'SAREE',
      quantity: 60,
      ownership: 'customer',
      received_date: new Date().toISOString(),
      notes: 'Automated test material receipt'
    })
    .select()
    .single();

  assert(!error, `Error receiving material: ${error?.message}`);

  log(colors.green, `✓ Material received: 60 SAREE`);
  return data;
}

async function test4_CreateStock() {
  log(colors.yellow, '\n=== Test 4: Create Stock ===');

  const { data, error } = await supabase
    .from('material_stock')
    .insert({
      customer_id: testCustomerId,
      order_id: testOrderId,
      material_type: 'SAREE',
      stage: 'received',
      quantity: 60,
      ownership: 'customer',
      is_active: true
    })
    .select()
    .single();

  assert(!error, `Error creating stock: ${error?.message}`);
  assert(data.is_active === true, 'Stock should be active');

  log(colors.green, `✓ Stock created: 60 SAREE in received stage`);
  return data;
}

async function test5_CreateDesignTracking() {
  log(colors.yellow, '\n=== Test 5: Create Design Tracking ===');

  const { data, error } = await supabase
    .from('material_design_tracking')
    .insert({
      customer_id: testCustomerId,
      material_type: 'SAREE',
      total_quantity: 60,
      designs_given: 0,
      designs_pending: 60,
      batch_identifier: 'AUTO-TEST-BATCH'
    })
    .select()
    .single();

  assert(!error, `Error creating design tracking: ${error?.message}`);
  assert(data.designs_pending === 60, 'Should have 60 designs pending');

  log(colors.green, `✓ Design tracking created: 0 given, 60 pending`);
  return data;
}

async function test6_UpdateDesignCount() {
  log(colors.yellow, '\n=== Test 6: Update Design Count (RPC) ===');

  const { data, error } = await supabase.rpc('update_design_count', {
    p_customer_id: testCustomerId,
    p_material_type: 'SAREE',
    p_designs_to_add: 35,
    p_batch_identifier: 'AUTO-TEST-BATCH'
  });

  assert(!error, `Error updating design count: ${error?.message}`);

  // Verify update
  const { data: tracking } = await supabase
    .from('material_design_tracking')
    .select('*')
    .eq('customer_id', testCustomerId)
    .eq('batch_identifier', 'AUTO-TEST-BATCH')
    .single();

  assert(tracking.designs_given === 35, 'Should have 35 designs given');
  assert(tracking.designs_pending === 25, 'Should have 25 designs pending');

  log(colors.green, `✓ Design count updated: 35 given, 25 pending`);
  return tracking;
}

async function test7_MoveStock() {
  log(colors.yellow, '\n=== Test 7: Move Stock (RPC) ===');

  const { data, error } = await supabase.rpc('move_stock_to_stage', {
    p_customer_id: testCustomerId,
    p_order_id: testOrderId,
    p_material_type: 'SAREE',
    p_from_stage: 'received',
    p_to_stage: 'preprocessing',
    p_quantity: 35,
    p_ownership: 'customer'
  });

  assert(!error, `Error moving stock: ${error?.message}`);

  // Verify movement
  const { data: activeStock } = await supabase
    .from('material_stock')
    .select('*')
    .eq('customer_id', testCustomerId)
    .eq('is_active', true);

  const receivedStock = activeStock.find(s => s.stage === 'received');
  const preprocessingStock = activeStock.find(s => s.stage === 'preprocessing');

  assert(receivedStock?.quantity === 25, 'Should have 25 in received');
  assert(preprocessingStock?.quantity === 35, 'Should have 35 in preprocessing');

  log(colors.green, `✓ Stock moved: 35 SAREE to preprocessing, 25 remaining in received`);
  return activeStock;
}

async function test8_GetOrderLifecycle() {
  log(colors.yellow, '\n=== Test 8: Get Order Lifecycle ===');

  const { data, error } = await supabase
    .from('v_order_lifecycle')
    .select('*')
    .eq('customer_name', 'Automated Test Customer')
    .single();

  assert(!error, `Error getting order lifecycle: ${error?.message}`);
  assert(data.total_received === 60, 'Should show 60 received');
  assert(data.stock_received === 25, 'Should show 25 in received stage');
  assert(data.stock_preprocessing === 35, 'Should show 35 in preprocessing stage');
  assert(data.total_designs_given === 35, 'Should show 35 designs given');
  assert(data.total_designs_pending === 25, 'Should show 25 designs pending');

  log(colors.green, `✓ Order lifecycle retrieved successfully`);
  log(colors.green, `  Received: ${data.total_received}, In Stock: ${data.stock_received + data.stock_preprocessing}`);
  return data;
}

async function test9_GetPendingDesigns() {
  log(colors.yellow, '\n=== Test 9: Get Pending Designs ===');

  const { data, error } = await supabase
    .from('v_pending_designs')
    .select('*')
    .eq('customer_name', 'Automated Test Customer');

  assert(!error, `Error getting pending designs: ${error?.message}`);
  assert(data.length > 0, 'Should have pending designs');
  assert(data[0].designs_pending === 25, 'Should show 25 designs pending');

  log(colors.green, `✓ Pending designs retrieved: ${data[0].designs_pending} pending`);
  return data;
}

async function cleanup() {
  log(colors.yellow, '\n=== Cleanup: Removing Test Data ===');

  // Delete in reverse order of dependencies
  await supabase.from('material_stock').delete().eq('customer_id', testCustomerId);
  await supabase.from('material_design_tracking').delete().eq('customer_id', testCustomerId);
  await supabase.from('material_in').delete().eq('customer_id', testCustomerId);
  await supabase.from('orders').delete().eq('customer_id', testCustomerId);
  await supabase.from('customers').delete().eq('id', testCustomerId);

  log(colors.green, '✓ Test data cleaned up');
}

async function runAllTests() {
  try {
    log(colors.yellow, '\n========================================');
    log(colors.yellow, '  Automated API Tests Starting...');
    log(colors.yellow, '========================================');

    await test1_CreateCustomer();
    await test2_CreateOrder();
    await test3_ReceiveMaterial();
    await test4_CreateStock();
    await test5_CreateDesignTracking();
    await test6_UpdateDesignCount();
    await test7_MoveStock();
    await test8_GetOrderLifecycle();
    await test9_GetPendingDesigns();

    await cleanup();

    log(colors.green, '\n========================================');
    log(colors.green, '  ✓ All Tests Passed!');
    log(colors.green, '========================================\n');

    process.exit(0);
  } catch (error) {
    log(colors.red, `\n✗ Test Failed: ${error.message}`);
    log(colors.red, error.stack);

    // Attempt cleanup even on failure
    try {
      await cleanup();
    } catch (cleanupError) {
      log(colors.red, `Cleanup failed: ${cleanupError.message}`);
    }

    process.exit(1);
  }
}

// Run tests
runAllTests();
```

**To Run Automated Tests:**
```bash
cd /home/siva/sandboxes/jbms1/tests
npm install @supabase/supabase-js
node api-tests.js
```

---

## 🖥️ Frontend Manual Testing

### Production Stock Page

**URL:** `/production-stock`

**Test Scenario 1: View Active Stock**
1. Navigate to Production Stock page
2. Verify only active stock displayed (is_active = true)
3. Check tabs: All, Received, Preprocessing, Printing, Postprocessing, Completed, Delivered, Misprint
4. Verify counts match in each tab

**Test Scenario 2: Update Design Count**
1. Select a stock item with customer material
2. Click 🎨 (design) icon
3. Enter "30" in designs given field
4. Click "Update"
5. Verify:
   - Designs Given column shows "30 / X" with progress bar
   - Designs Pending shows updated count
   - Warning alert appears if designs still pending

**Test Scenario 3: Move Stock**
1. Select stock in "Received" stage
2. Click "➡️" (move) icon
3. Enter quantity to move
4. Select "Preprocessing" as destination
5. Click "Move"
6. Verify:
   - Stock appears in Preprocessing tab
   - Original quantity reduced in Received tab
   - Movement history preserved (check with database query)

**Test Scenario 4: Search & Filter**
1. Use search box to search by customer name
2. Verify results filtered correctly
3. Use material type filter
4. Verify only selected material type shown

### Material Receipt Page

**URL:** `/material-receipt`

**Test Scenario 1: Receive Customer Material**
1. Navigate to Material Receipt
2. Select "Customer Material" ownership
3. Select customer
4. Select order (or create new)
5. Enter material type and quantity
6. Submit
7. Verify:
   - Material appears in Production Stock (Received stage)
   - Order linked correctly
   - Design tracking created if needed

**Test Scenario 2: Receive Own Stock**
1. Select "Own Stock" ownership
2. Skip customer selection
3. Enter material details
4. Submit
5. Verify ownership = "self" in database

### Dashboard

**URL:** `/dashboard`

**Test Scenario: View Metrics**
1. Open Dashboard
2. Verify all metrics load:
   - Total stock by stage
   - Pending deliveries
   - Outstanding payments
   - Production pipeline
3. Click on metrics to drill down

---

## 📊 Test Coverage Summary

| Layer | Test Type | Coverage |
|-------|-----------|----------|
| Database | SQL Test Scripts | Customer 99 (job work), Customer 88 (sales) |
| API | Manual curl tests | 10 endpoints |
| API | Automated tests | 9 test cases |
| Frontend | Manual testing | 3 key pages, 8 scenarios |

---

## ✅ Test Checklist

### Before Release:
- [ ] Execute all SQL test scripts (customer 99, customer 88)
- [ ] Run automated API tests
- [ ] Complete frontend manual testing
- [ ] Verify movement history preserved
- [ ] Check design tracking works independently
- [ ] Test order lineage from receipt to invoice
- [ ] Verify reconciliation balances
- [ ] Test delivered stage workflow

---

**Next:** Execute tests and document results!
