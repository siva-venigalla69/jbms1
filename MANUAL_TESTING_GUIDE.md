# Manual Testing Guide
## Digital Textile Printing Management System - Simplified Frontend

**Version**: 1.0
**Date**: 2025-12-21
**Tester**: QA Team / User

---

## Table of Contents
1. [Pre-Testing Setup](#pre-testing-setup)
2. [Test Case Structure](#test-case-structure)
3. [Page-by-Page Testing](#page-by-page-testing)
4. [End-to-End Workflows](#end-to-end-workflows)
5. [Negative Testing](#negative-testing)
6. [Performance Testing](#performance-testing)
7. [Test Results Template](#test-results-template)

---

## Pre-Testing Setup

### Prerequisites
✅ Application deployed and accessible
✅ Database migrations applied (all 13 tables exist)
✅ Test user account created
✅ Browser: Chrome/Firefox/Safari (latest version)
✅ Screen resolution: 1920x1080 or higher

### Test Data Preparation
Create the following test data:
- 2-3 test customers
- 5 material types (SAREE, DUPATTA, VONI, LEHENGA, RUNNING)
- Test user with admin role

### Before Starting
1. Clear browser cache
2. Open browser dev tools (F12)
3. Have notepad ready for notes
4. Record screen if possible

---

## Test Case Structure

Each test case follows this format:

**TC-XXX: Test Case Name**
- **Objective**: What are we testing?
- **Prerequisites**: What must be done first?
- **Steps**: Numbered steps to execute
- **Expected Result**: What should happen?
- **Actual Result**: What actually happened?
- **Status**: ✅ PASS / ❌ FAIL
- **Notes**: Additional observations

---

## Page-by-Page Testing

### Section 1: Login & Navigation

#### TC-001: User Login
- **Objective**: Verify user can log in successfully
- **Prerequisites**: Valid user credentials
- **Steps**:
  1. Open application URL
  2. Enter email: `your-email@example.com`
  3. Enter password: `your-password`
  4. Click "Login" button
- **Expected Result**:
  - User redirected to `/simplified-dashboard`
  - Dashboard loads successfully
  - User info displayed in header
- **Status**: [ ]
- **Notes**:

#### TC-002: Navigation Menu
- **Objective**: Verify all menu items are accessible
- **Steps**:
  1. Click on each menu item:
     - Dashboard
     - Material Receipt
     - Production Stock
     - Deliveries
     - Invoices
     - Payments
     - Returns
     - Misprint Sales
     - Reports
  2. Verify each page loads
- **Expected Result**: All pages load without errors
- **Status**: [ ]
- **Notes**:

---

### Section 2: Dashboard

#### TC-003: Dashboard Metrics Display
- **Objective**: Verify dashboard shows correct metrics
- **Steps**:
  1. Navigate to `/simplified-dashboard`
  2. Check all metric cards display:
     - Total Stock
     - In Production
     - Completed
     - Misprint Stock
  3. Verify numbers are > 0 or show 0
- **Expected Result**: All metrics visible and displaying numbers
- **Status**: [ ]
- **Notes**:

#### TC-004: Dashboard Quick Actions
- **Objective**: Verify quick action buttons work
- **Steps**:
  1. Click "Receive Material" button
  2. Verify navigation to `/material-receipt`
  3. Go back to dashboard
  4. Repeat for other quick action buttons
- **Expected Result**: All buttons navigate to correct pages
- **Status**: [ ]
- **Notes**:

---

### Section 3: Material Receipt

#### TC-005: Create Customer Material Receipt
- **Objective**: Create material receipt for customer job work
- **Steps**:
  1. Navigate to `/material-receipt`
  2. Select Ownership: `Customer Material`
  3. Select Customer: `Test Customer 1`
  4. Select Material Type: `SAREE`
  5. Enter Quantity: `100`
  6. Enter Notes: `Test receipt for SAREE - Customer 1`
  7. Click "Create Receipt"
- **Expected Result**:
  - Success message displayed
  - Receipt appears in "Recent Receipts" table
  - Receipt number auto-generated (RCP-YYYYMMDD-NNNN format)
  - Form resets
- **Status**: [ ]
- **Notes**:

#### TC-006: Create Own Stock Receipt
- **Objective**: Create material receipt for own stock
- **Steps**:
  1. Navigate to `/material-receipt`
  2. Select Ownership: `Own Stock`
  3. Select Material Type: `DUPATTA`
  4. Enter Quantity: `50`
  5. Enter Notes: `Test own stock receipt`
  6. Click "Create Receipt"
- **Expected Result**:
  - Success message displayed
  - Receipt created with ownership = 'self'
  - Customer field not required
- **Status**: [ ]
- **Notes**:

#### TC-007: View Receipt Details
- **Objective**: View detailed information of a receipt
- **Steps**:
  1. In "Recent Receipts" table
  2. Click eye icon on any receipt
  3. Verify dialog shows:
     - Receipt Date
     - Customer Name
     - Material Type
     - Quantity
     - Ownership
     - Notes
  4. Click "Close"
- **Expected Result**: Dialog opens with all details, closes correctly
- **Status**: [ ]
- **Notes**:

---

### Section 4: Production Stock

#### TC-008: View Stock by Stage
- **Objective**: View stock grouped by production stages
- **Steps**:
  1. Navigate to `/production-stock`
  2. Click on each tab:
     - All
     - Received
     - Preprocessing
     - Printing
     - Postprocessing
     - Completed
     - Misprint
  3. Verify stock items display for each stage
- **Expected Result**:
  - Each tab shows relevant stock
  - Tabs show count in parentheses
  - Table updates when switching tabs
- **Status**: [ ]
- **Notes**:

#### TC-009: Move Stock to Next Stage
- **Objective**: Move material from one stage to another
- **Steps**:
  1. Go to "Received" tab
  2. Click "Move" icon on a stock item
  3. Dialog opens
  4. Verify current stage shown
  5. Set Quantity: `50`
  6. Select "Move to Stage": `Preprocessing`
  7. Click "Move Stock"
- **Expected Result**:
  - Success message shown
  - Stock quantity reduced in "Received"
  - Stock appears in "Preprocessing" tab
  - Refresh updates correctly
- **Status**: [ ]
- **Notes**:

#### TC-010: Update Design Status
- **Objective**: Mark designs as ready for production
- **Steps**:
  1. Click on a stock item's design icon
  2. Dialog opens
  3. Select Design Availability: `Design Ready`
  4. Enter Design Notes: `Design files received from customer`
  5. Click "Update Design"
- **Expected Result**:
  - Success message
  - Design status chip shows "Ready"
  - Notes saved
- **Status**: [ ]
- **Notes**:

#### TC-011: Filter Stock by Material Type
- **Objective**: Filter stock table by material type
- **Steps**:
  1. In Production Stock page
  2. Click Material Type dropdown
  3. Select "SAREE"
  4. Verify table shows only SAREE items
  5. Select "All Materials"
  6. Verify all items shown again
- **Expected Result**: Filter works correctly, shows/hides items
- **Status**: [ ]
- **Notes**:

#### TC-012: Search Stock
- **Objective**: Search stock by text
- **Steps**:
  1. Enter "Test" in search box
  2. Verify filtered results
  3. Clear search
  4. Verify all stock shows again
- **Expected Result**: Search filters correctly
- **Status**: [ ]
- **Notes**:

---

### Section 5: Deliveries

#### TC-013: Create Delivery Challan with Single Item
- **Objective**: Create a delivery challan
- **Prerequisites**: At least one material in "Completed" stage
- **Steps**:
  1. Navigate to `/deliveries`
  2. Select Customer: `Test Customer 1`
  3. Select Order: (choose from dropdown)
  4. Set Delivery Date: Today's date
  5. Click "Add Item"
  6. Select Material: `SAREE`
  7. Enter Quantity: `20`
  8. Enter Notes: `First delivery test`
  9. Click "Create Delivery Challan"
- **Expected Result**:
  - Success message
  - Challan number auto-generated (DC-YYYYMMDD-NNNN)
  - Appears in Recent Challans table
  - Completed stock reduced by 20
- **Status**: [ ]
- **Notes**:

#### TC-014: Create Delivery with Multiple Items
- **Objective**: Create challan with 2+ material types
- **Steps**:
  1. Select customer and order
  2. Click "Add Item" twice
  3. Item 1: SAREE, Qty 10
  4. Item 2: DUPATTA, Qty 5
  5. Create challan
- **Expected Result**:
  - Challan created with 2 items
  - Both stock quantities reduced
- **Status**: [ ]
- **Notes**:

#### TC-015: View Challan Details
- **Objective**: View challan with items
- **Steps**:
  1. Click eye icon on a challan
  2. Verify shows:
     - Challan number
     - Customer name
     - Order number
     - Delivery date
     - List of items with quantities
- **Expected Result**: All details display correctly
- **Status**: [ ]
- **Notes**:

---

### Section 6: Invoices

#### TC-016: Create Invoice for Job Work
- **Objective**: Generate job work invoice
- **Prerequisites**: Delivery challan created
- **Steps**:
  1. Navigate to `/invoices-simplified`
  2. Select Invoice Type: `Job Work`
  3. Select Customer: `Test Customer 1`
  4. Select Order: (from dropdown)
  5. Set Invoice Date: Today
  6. Enter Subtotal: `1000`
  7. CGST Rate: `9` (%)
  8. SGST Rate: `9` (%)
  9. IGST Rate: `0`
  10. Verify total calculation:
      - CGST: ₹90
      - SGST: ₹90
      - Total: ₹1180
  11. Click "Create Invoice"
- **Expected Result**:
  - Invoice created
  - Auto-generated invoice number (INV-YYYYMMDD-NNNN)
  - GST amounts calculated correctly
  - Status: Unpaid
- **Status**: [ ]
- **Notes**:

#### TC-017: Verify Invoice in Table
- **Objective**: Check invoice appears in recent invoices
- **Steps**:
  1. Scroll to Recent Invoices table
  2. Find the newly created invoice
  3. Verify columns:
     - Invoice Number
     - Date
     - Customer
     - Type (JOB WORK)
     - Amount (₹1180)
     - Status (UNPAID)
- **Expected Result**: Invoice displays with correct data
- **Status**: [ ]
- **Notes**:

---

### Section 7: Payments

#### TC-018: Record Cash Payment
- **Objective**: Record a cash payment
- **Steps**:
  1. Navigate to `/payments-simplified`
  2. Select Customer: `Test Customer 1`
  3. Select Invoice: (choose unpaid invoice)
  4. Set Payment Date: Today
  5. Enter Amount: `1180`
  6. Payment Method: `Cash`
  7. Notes: `Full payment received`
  8. Click "Record Payment"
- **Expected Result**:
  - Success message
  - Payment appears in Recent Payments
  - Invoice still shows in system (status update tested separately)
- **Status**: [ ]
- **Notes**:

#### TC-019: Record UPI Payment with Transaction Reference
- **Objective**: Record digital payment
- **Steps**:
  1. Record new payment
  2. Select Payment Method: `UPI`
  3. Enter Transaction Reference: `UPI123456789`
  4. Amount: `500`
  5. Create payment
- **Expected Result**:
  - Payment recorded
  - Transaction reference saved
  - Shows in payment table
- **Status**: [ ]
- **Notes**:

#### TC-020: Record Advance Payment (No Invoice)
- **Objective**: Record payment not linked to invoice
- **Steps**:
  1. Select customer
  2. Leave Invoice dropdown as "None"
  3. Enter amount
  4. Record payment
- **Expected Result**:
  - Payment recorded successfully
  - Shows "None" or "-" for invoice column
- **Status**: [ ]
- **Notes**:

---

### Section 8: Returns

#### TC-021: Create Customer Return (Misprint)
- **Objective**: Handle customer misprint return
- **Steps**:
  1. Navigate to `/returns`
  2. Select Return Type: `Customer Return (Misprint)`
  3. Select Customer: `Test Customer 1`
  4. Select Order: (optional)
  5. Select Material Type: `SAREE`
  6. Quantity: `5`
  7. Reason: `Printing quality issue - customer rejected`
  8. Adjustment Amount: `100`
  9. Click "Create Return"
- **Expected Result**:
  - Return created
  - Material should appear in misprint stock
  - Check `/production-stock` → Misprint tab
  - Quantity: 5 SAREE in misprint
- **Status**: [ ]
- **Notes**:

#### TC-022: Create Damaged Return
- **Objective**: Record damaged material
- **Steps**:
  1. Select Return Type: `Damaged Return`
  2. Select Material Type: `DUPATTA`
  3. Quantity: `3`
  4. Reason: `Damaged during post-processing`
  5. Create return
- **Expected Result**:
  - Return recorded
  - Material tracked as damaged
- **Status**: [ ]
- **Notes**:

---

### Section 9: Misprint Sales

#### TC-023: Check Misprint Stock Summary
- **Objective**: View available misprint stock
- **Steps**:
  1. Navigate to `/misprint-sales`
  2. Check "Misprint Stock Summary" card
  3. Verify shows material types with quantities
- **Expected Result**: Shows materials from TC-021 return
- **Status**: [ ]
- **Notes**:

#### TC-024: Create Misprint Sale
- **Objective**: Sell misprint material
- **Steps**:
  1. Select Material Type: `SAREE`
  2. Verify "Available" shows correctly
  3. Enter Quantity: `3`
  4. Enter Unit Price: `50`
  5. Verify Total Amount: `₹150`
  6. Customer Name: `Walk-in Customer`
  7. Notes: `Discounted sale`
  8. Click "Create Sale"
- **Expected Result**:
  - Sale created
  - Auto-generated sale number (MS-YYYYMMDD-NNNN)
  - Misprint stock reduced by 3
  - Check stock summary updates
- **Status**: [ ]
- **Notes**:

#### TC-025: Verify Cannot Sell More Than Available
- **Objective**: Validation check
- **Steps**:
  1. Try to enter quantity > available stock
  2. Attempt to create sale
- **Expected Result**:
  - Error message or button disabled
  - Cannot create sale with excessive quantity
- **Status**: [ ]
- **Notes**:

---

### Section 10: Reports

#### TC-026: View Stock by Customer Report
- **Objective**: Check stock distribution report
- **Steps**:
  1. Navigate to `/reports-simplified`
  2. Click "Stock by Customer" tab
  3. Verify table shows:
     - Customer names
     - Material types
     - Ownership (customer/self)
     - Quantities by stage (Received, Preprocessing, etc.)
     - Total quantity
  4. Check data matches production stock
- **Expected Result**: Report displays accurate stock data
- **Status**: [ ]
- **Notes**:

#### TC-027: View Outstanding Payments Report
- **Objective**: Check financial report
- **Steps**:
  1. Click "Outstanding Payments" tab
  2. Verify shows:
     - Total Outstanding amount at top
     - Customer names
     - Total Invoiced
     - Total Paid
     - Outstanding Amount
     - Invoice Count
  3. Verify math: Outstanding = Invoiced - Paid
- **Expected Result**: All calculations correct
- **Status**: [ ]
- **Notes**:

#### TC-028: View Outstanding Orders Report
- **Objective**: Check pending deliveries
- **Steps**:
  1. Click "Outstanding Orders" tab
  2. Verify shows:
     - Total Pending quantity at top
     - Order numbers
     - Customers
     - Total vs Delivered quantities
     - Pending quantities
  3. Verify math: Pending = Total - Delivered
- **Expected Result**: Report accurate
- **Status**: [ ]
- **Notes**:

#### TC-029: View Misprint Stock Report
- **Objective**: Check misprint tracking
- **Steps**:
  1. Click "Misprint Stock" tab
  2. Verify shows:
     - Total misprint quantity
     - Material types
     - Quantities
     - Ownership
     - Design notes
  3. Cross-check with Production Stock → Misprint tab
- **Expected Result**: Data matches across pages
- **Status**: [ ]
- **Notes**:

---

## End-to-End Workflows

### E2E-001: Complete Job Work Flow
**Objective**: Test entire customer job work lifecycle

**Steps**:
1. **Material Receipt**:
   - Create receipt for customer material
   - Material Type: SAREE, Qty: 100
   - ✓ Receipt created

2. **Production Processing**:
   - Update design status to "Ready"
   - Move 100 from Received → Preprocessing
   - Move 100 from Preprocessing → Printing
   - Move 100 from Printing → Postprocessing
   - Move 100 from Postprocessing → Completed
   - ✓ Material in completed stage

3. **Delivery**:
   - Create delivery challan
   - Add 50 SAREE
   - ✓ Challan created
   - ✓ Completed stock reduced to 50

4. **Invoicing**:
   - Create job work invoice
   - Subtotal: ₹2000
   - GST: 18% (9% CGST + 9% SGST)
   - Total: ₹2360
   - ✓ Invoice created

5. **Payment**:
   - Record payment of ₹2360
   - Method: Bank Transfer
   - ✓ Payment recorded

6. **Verification**:
   - Check Reports → Outstanding Payments
   - Verify customer shows ₹0 outstanding
   - Check Reports → Outstanding Orders
   - Verify 50 pending quantity (100 ordered - 50 delivered)
   - Check Reports → Stock by Customer
   - Verify 50 in completed stage

**Expected Result**: Complete workflow successful, all data consistent
**Status**: [ ]
**Notes**:

---

### E2E-002: Misprint Handling Flow
**Objective**: Test misprint lifecycle

**Steps**:
1. **Create Initial Stock**:
   - Material receipt: 50 DUPATTA
   - Move through production to Completed

2. **Create Delivery**:
   - Deliver 50 DUPATTA to customer

3. **Customer Return**:
   - Create return: 10 DUPATTA (misprint)
   - Reason: "Print quality issue"
   - Adjustment: ₹200
   - ✓ Return created

4. **Verify Misprint Stock**:
   - Check Production Stock → Misprint tab
   - Verify 10 DUPATTA present
   - Check Reports → Misprint Stock
   - Verify shows 10 DUPATTA

5. **Sell Misprint**:
   - Create misprint sale
   - 5 DUPATTA at ₹40 each = ₹200
   - ✓ Sale created

6. **Verification**:
   - Misprint stock should show 5 remaining
   - Reports should match

**Expected Result**: Misprint tracked end-to-end
**Status**: [ ]
**Notes**:

---

## Negative Testing

### NEG-001: Create Receipt with Missing Required Fields
- **Steps**:
  1. Leave customer blank
  2. Try to submit
- **Expected**: Error message "Please fill in all required fields"
- **Status**: [ ]

### NEG-002: Move Stock with Insufficient Quantity
- **Steps**:
  1. Stock has quantity 10
  2. Try to move 15
- **Expected**: Error or validation message
- **Status**: [ ]

### NEG-003: Create Delivery with No Completed Stock
- **Steps**:
  1. Select material with 0 in completed
  2. Try to create delivery
- **Expected**: Should show 0 available or prevent selection
- **Status**: [ ]

### NEG-004: Create Invoice with Invalid GST Rates
- **Steps**:
  1. Enter CGST: 150%
- **Expected**: Validation error or limit to 100%
- **Status**: [ ]

### NEG-005: Record Negative Payment Amount
- **Steps**:
  1. Try to enter amount: -500
- **Expected**: Field should not accept negative, or validation error
- **Status**: [ ]

---

## Performance Testing

### PERF-001: Page Load Times
- **Objective**: Measure page load performance
- **Steps**:
  1. Open browser dev tools → Network tab
  2. Navigate to each page
  3. Record load time
- **Expected**: All pages load < 3 seconds
- **Results**:
  - Dashboard: ___ seconds
  - Material Receipt: ___ seconds
  - Production Stock: ___ seconds
  - Deliveries: ___ seconds
  - Invoices: ___ seconds
  - Payments: ___ seconds
  - Returns: ___ seconds
  - Misprint Sales: ___ seconds
  - Reports: ___ seconds
- **Status**: [ ]

### PERF-002: Large Data Set Handling
- **Objective**: Test with 100+ records
- **Steps**:
  1. Create 100+ material receipts
  2. Navigate to Material Receipt page
  3. Check table scrolling
  4. Test search/filter performance
- **Expected**: No lag, smooth scrolling
- **Status**: [ ]

---

## Test Results Template

### Summary

**Test Date**: __________
**Tester Name**: __________
**Build Version**: __________
**Browser**: __________

| Category | Total | Passed | Failed | Blocked | Pass Rate |
|----------|-------|--------|--------|---------|-----------|
| Login & Navigation | 2 | | | | |
| Dashboard | 2 | | | | |
| Material Receipt | 3 | | | | |
| Production Stock | 5 | | | | |
| Deliveries | 3 | | | | |
| Invoices | 2 | | | | |
| Payments | 3 | | | | |
| Returns | 2 | | | | |
| Misprint Sales | 3 | | | | |
| Reports | 4 | | | | |
| E2E Workflows | 2 | | | | |
| Negative Tests | 5 | | | | |
| Performance | 2 | | | | |
| **TOTAL** | **38** | | | | |

### Critical Issues Found
1.
2.
3.

### Medium Issues Found
1.
2.
3.

### Minor Issues Found
1.
2.
3.

### Recommendations
1.
2.
3.

### Sign-off

**Tester Signature**: __________
**Date**: __________

**Ready for Production**: ✅ YES / ❌ NO

---

**End of Manual Testing Guide**
