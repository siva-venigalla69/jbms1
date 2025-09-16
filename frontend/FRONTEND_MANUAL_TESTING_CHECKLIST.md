# Frontend Manual Testing Checklist

## 🧪 Manual Testing Instructions for Complete Business Cycle

**Test URL**: http://localhost:3000
**Test Date**: September 16, 2025
**Tester**: Manual validation of all frontend components

---

## ✅ 1. ORDERS PAGE TESTING

### Navigation & UI
- [ ] Navigate to `/orders`
- [ ] Verify page loads without errors
- [ ] Check "Order & Production Management" header displays
- [ ] Verify two tabs: "Orders" and "Production Batches"
- [ ] Confirm both "Create Order" and "Create Batch" buttons visible

### Orders Tab
- [ ] Click "Orders" tab (should be active by default)
- [ ] Verify order summary cards show counts
- [ ] Test clicking on status filter cards (All, Pending, In Progress, Completed, Cancelled)
- [ ] Check orders table displays with columns: Order Number, Customer, Date, Status, Amount, Items, Actions
- [ ] Verify search functionality in the search bar
- [ ] Test date range filters (From Date, To Date)
- [ ] Confirm "Clear Filters" button works

### Order Creation
- [ ] Click "Create Order" button
- [ ] Verify dialog opens with form fields
- [ ] Test customer search and selection (autocomplete)
- [ ] Add multiple order items using "Add Item" button
- [ ] Test material type selection dropdown
- [ ] Enter quantities and unit prices
- [ ] Fill in customization details
- [ ] Submit form and verify success message
- [ ] Check new order appears in the list

### Order Actions
- [ ] Click "View" (eye icon) on an order
- [ ] Verify order details dialog shows complete information
- [ ] Click "Edit" (pencil icon) on an order
- [ ] Test editing order details and items
- [ ] Click "Create Batch" (factory icon) on an order
- [ ] Verify production batch dialog opens with pre-selected order

---

## ✅ 2. PRODUCTION BATCHES TAB TESTING

### Navigation & Display
- [ ] Click "Production Batches" tab
- [ ] Verify ProductionBatchList component loads
- [ ] Check filter panel displays with options:
  - Design Status dropdown
  - Production Status dropdown
  - Priority dropdown
  - Batch Number search
- [ ] Verify status summary chips show counts

### Batch Creation
- [ ] Click "Create Batch" button in header
- [ ] Verify CreateProductionBatchDialog opens
- [ ] Test order selection dropdown (should show active orders)
- [ ] Select an order and verify order items populate
- [ ] Select an order item and verify material type auto-fills
- [ ] Check planned quantity suggests 50% of order item quantity
- [ ] Set priority, dates, and design status
- [ ] Submit form and verify batch creation success

### Batch Display & Management
- [ ] Verify production batch cards display with:
  - Batch number and material type
  - Status indicators (design, production, batch status)
  - Progress bars
  - Quantity information (planned/produced/delivered)
  - Quality ratings (if available)
  - Action buttons
- [ ] Test batch filtering by different criteria
- [ ] Verify batches are grouped by status
- [ ] Check "Next Stage" button on applicable batches

---

## ✅ 3. DESIGNER DASHBOARD TESTING

### Page Navigation
- [ ] Navigate to `/designer` or designer dashboard
- [ ] Verify page loads and shows assigned designs
- [ ] Check workload indicators and assignment lists

### Assignment Management
- [ ] Verify design assignments display with:
  - Order information
  - Material type and requirements
  - Due dates and priority
  - Status indicators
- [ ] Test updating assignment status
- [ ] Upload design files (if implemented)
- [ ] Submit designs for approval

---

## ✅ 4. DELIVERY CHALLANS TESTING

### Navigation & Display
- [ ] Navigate to `/challans`
- [ ] Verify delivery challans list displays
- [ ] Check challan cards show:
  - Challan number and date
  - Customer information
  - Total quantity and amount
  - Status indicators

### Challan Creation
- [ ] Click "Create Challan" button
- [ ] Test selecting completed production batches
- [ ] Verify customer information auto-fills
- [ ] Check quantity and amount calculations
- [ ] Submit challan and verify creation success

### Challan Management
- [ ] Test filtering challans by status/date
- [ ] Verify challan details view
- [ ] Check print/download functionality (if available)
- [ ] Test marking challan as delivered

---

## ✅ 5. GST INVOICES TESTING

### Navigation & Invoice List
- [ ] Navigate to `/invoices`
- [ ] Verify invoices list displays
- [ ] Check invoice cards show:
  - Invoice number and date
  - Customer information
  - Total amount and tax
  - Payment status

### Invoice Creation
- [ ] Click "Create Invoice" button
- [ ] Select "From Delivery Challan" option
- [ ] Choose delivery challans to consolidate
- [ ] Verify automatic tax calculation (18% GST)
- [ ] Check invoice total computation
- [ ] Submit and verify invoice creation

### Invoice Management
- [ ] Test invoice filtering and search
- [ ] View invoice details
- [ ] Check payment status tracking
- [ ] Test print/download functionality

---

## ✅ 6. PAYMENTS TESTING

### Navigation & Payment List
- [ ] Navigate to `/payments`
- [ ] Verify payments list displays
- [ ] Check payment records show:
  - Payment date and amount
  - Payment method and reference
  - Invoice reference
  - Status

### Payment Recording
- [ ] Click "Record Payment" button
- [ ] Select invoice for payment
- [ ] Enter payment details:
  - Amount
  - Payment method
  - Reference number
  - Bank details (if applicable)
- [ ] Submit and verify payment recording
- [ ] Check outstanding balance updates

### Payment Reconciliation
- [ ] Verify automatic balance calculations
- [ ] Check payment status updates on invoices
- [ ] Test partial payment handling
- [ ] Verify fully paid status when complete

---

## ✅ 7. CROSS-COMPONENT INTEGRATION TESTING

### Order-to-Batch Flow
- [ ] Create new order with multiple items
- [ ] Create production batch from order (using factory icon)
- [ ] Verify pre-selected order and item data
- [ ] Complete batch creation and verify it appears in batches list
- [ ] Update batch status through production stages

### Batch-to-Challan Flow
- [ ] Complete a production batch (mark as completed)
- [ ] Create delivery challan including the completed batch
- [ ] Verify batch status updates to "delivered"
- [ ] Check batch shows delivery challan reference

### Challan-to-Invoice Flow
- [ ] Create multiple delivery challans
- [ ] Generate consolidated invoice from challans
- [ ] Verify invoice includes all challan items
- [ ] Check tax calculations are correct
- [ ] Confirm invoice references challans properly

### Invoice-to-Payment Flow
- [ ] Record payments against invoice
- [ ] Test partial payments (e.g., 60% advance)
- [ ] Record remaining payment
- [ ] Verify invoice status updates to "Paid"
- [ ] Check outstanding balance shows zero

---

## ✅ 8. ERROR HANDLING & EDGE CASES

### Form Validation
- [ ] Test submitting forms with missing required fields
- [ ] Verify proper error messages display
- [ ] Check field-level validation (email format, phone numbers, etc.)
- [ ] Test invalid data entries (negative quantities, etc.)

### API Error Handling
- [ ] Test with network disconnection (if possible)
- [ ] Verify graceful error messages for API failures
- [ ] Check retry mechanisms for failed operations
- [ ] Test handling of duplicate submissions

### Data Consistency
- [ ] Test creating batch with more quantity than available
- [ ] Check delivery challan with invalid batch selection
- [ ] Verify invoice calculations with modified challan data
- [ ] Test payment amount exceeding invoice total

---

## ✅ 9. UI/UX VERIFICATION

### Responsive Design
- [ ] Test on desktop (1920x1080)
- [ ] Test on tablet (768px width)
- [ ] Test on mobile (375px width)
- [ ] Verify all components remain functional
- [ ] Check text readability and button accessibility

### User Experience
- [ ] Verify intuitive navigation between pages
- [ ] Check loading states and progress indicators
- [ ] Test success/error message visibility and timing
- [ ] Confirm consistent UI patterns across pages
- [ ] Verify tooltip and help text functionality

### Performance
- [ ] Check page load times (< 3 seconds)
- [ ] Test large data sets (100+ orders/batches)
- [ ] Verify smooth scrolling and interactions
- [ ] Check memory usage in browser dev tools

---

## ✅ 10. BUSINESS LOGIC VALIDATION

### Order Completion Logic
- [ ] Verify order status updates based on batch completions
- [ ] Check "partially_delivered" status with partial batches
- [ ] Test "completed" status when all batches delivered
- [ ] Verify order metrics calculations

### Financial Calculations
- [ ] Test GST calculation accuracy (18%)
- [ ] Verify invoice total = subtotal + tax
- [ ] Check payment reconciliation accuracy
- [ ] Test outstanding balance calculations
- [ ] Verify multi-currency handling (if applicable)

### Stock Reconciliation
- [ ] Check ordered vs produced vs delivered quantities
- [ ] Verify completion percentages
- [ ] Test stock movement tracking
- [ ] Check batch quantity validations

---

## 📊 TEST COMPLETION CHECKLIST

### Pre-Testing Setup
- [ ] Development server running on http://localhost:3000
- [ ] Database contains sample data
- [ ] All necessary API endpoints functional
- [ ] Browser developer tools open for monitoring

### Test Execution
- [ ] All navigation tests completed
- [ ] All form submission tests passed
- [ ] All integration flows verified
- [ ] Error handling tested
- [ ] Performance checks completed

### Test Documentation
- [ ] All issues documented with screenshots
- [ ] Reproducible steps recorded for any bugs
- [ ] Success criteria validated
- [ ] Test coverage confirmed at 100%

---

## 🎯 FINAL VALIDATION CRITERIA

**System is ready for production if:**
- ✅ All frontend components load without errors
- ✅ All forms submit successfully with valid data
- ✅ All business workflows complete end-to-end
- ✅ Error handling works properly
- ✅ UI is responsive and user-friendly
- ✅ Performance meets acceptable standards
- ✅ Data consistency is maintained across components
- ✅ Integration between components functions correctly

**Total Test Items**: ~100 individual test cases across 8 major areas
**Expected Pass Rate**: 100% (all critical functionality must work)
**Testing Duration**: 2-3 hours for complete manual validation

---

**Note**: This checklist should be executed by a human tester accessing the live application at http://localhost:3000. Each checkbox represents a specific test case that verifies the system's functionality, integration, and user experience.