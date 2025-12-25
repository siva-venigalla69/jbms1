# API Automated Tests

## Quick Start

### 1. Install Dependencies
```bash
cd /home/siva/sandboxes/jbms1/tests
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env and add your Supabase credentials
```

### 3. Run Tests
```bash
npm test
```

## Test Output

You'll see colorful output showing each test:
```
═══════════════════════════════════════════════════════════
  🚀 Automated API Tests - Digital Textile Printing System
═══════════════════════════════════════════════════════════

▶ Test 1: Create Customer
  ✓ Customer created with ID: uuid-here
  ℹ Name: Automated Test Customer, Phone: 9999999991

▶ Test 2: Create Order with Auto-Generated Order Number
  ✓ Order created: ORD-000001
  ℹ Order ID: uuid-here, Ownership: customer_material

...

═══════════════════════════════════════════════════════════
  ✅ Test Results
═══════════════════════════════════════════════════════════
  ALL TESTS PASSED!
  ℹ Total Tests: 11
  ℹ Duration: 3.45s
```

## What Gets Tested

1. **Customer Creation** - POST to /customers
2. **Order Creation** - Auto-generated order numbers
3. **Material Receipt** - POST to /material_in
4. **Stock Creation** - POST to /material_stock with is_active
5. **Design Tracking** - POST to /material_design_tracking
6. **Design Update** - RPC call to update_design_count()
7. **Stock Movement** - RPC call to move_stock_to_stage()
8. **Movement History** - Verify inactive records preserved
9. **Order Lifecycle** - Read from v_order_lifecycle view
10. **Pending Designs** - Read from v_pending_designs view
11. **Stock Reconciliation** - Verify totals balance

## Test Report

After running, check `test-report.json` for results:
```json
{
  "timestamp": "2025-12-22T...",
  "duration": "3.45s",
  "totalTests": 11,
  "passed": 11,
  "failed": 0,
  "status": "SUCCESS"
}
```

## Troubleshooting

**Error: SUPABASE_ANON_KEY not found**
- Make sure you copied .env.example to .env
- Add your actual Supabase credentials

**Error: permission denied**
- Check RLS policies in Supabase
- Make sure anon key has correct permissions

**Tests timeout**
- Check Supabase is running
- Verify network connection
- Check URL in .env is correct

## Running Individual Tests

You can modify `api-tests.js` to run specific tests:
```javascript
// Comment out tests you don't want to run
async function runAllTests() {
  // ...
  await test1_CreateCustomer();
  // await test2_CreateOrder();  // Skip this test
  // ...
}
```

## Continuous Integration

Add to your CI/CD pipeline:
```yaml
- name: Run API Tests
  run: |
    cd tests
    npm install
    npm test
```
