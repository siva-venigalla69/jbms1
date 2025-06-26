# 🧪 Complete Business Rule Testing Guide

## 🎯 **Pre-Testing Setup**

### ✅ **Login Credentials**
- **Username**: `admin`
- **Password**: `Siri@2299`
- **Frontend URL**: `http://localhost:3000`
- **Backend URL**: `https://jbms1.onrender.com`

### ✅ **Testing Environment**
- ✅ Frontend is running and accessible
- ✅ Backend is deployed and responding
- ✅ Authentication is working (user can login)

---

## 📋 **PHASE 1: Customer Management Testing**

### **Test 1.1: View Customer List**
**Expected**: Display all customers with pagination
**Steps**:
1. Login to application
2. Click "Customers" in sidebar
3. Verify table loads with columns: Customer, Contact, Address, GST Number, Created, Actions

**✅ Pass Criteria**: 
- Table displays without "Failed to load customers" error
- Search box is functional
- "Add Customer" button is visible

### **Test 1.2: Create New Customer**
**Business Rule**: Customer must have unique phone number and email
**Steps**:
1. Click "Add Customer" button
2. Fill form:
   - **Name**: "Test Customer 1"
   - **Phone**: "9876543210"
   - **Email**: "test1@example.com"
   - **Address**: "123 Test Street"
   - **GST Number**: "29ABCDE1234F1Z5"
3. Click "Save"

**✅ Pass Criteria**:
- Customer created successfully
- Appears in customer list
- Success message displayed

### **Test 1.3: Duplicate Phone Validation**
**Business Rule**: No two customers can have same phone number
**Steps**:
1. Try creating another customer with phone "9876543210"
2. Verify error message appears

**✅ Pass Criteria**: Error message "Customer with phone number already exists"

### **Test 1.4: Customer Search**
**Business Rule**: Search by name, phone, or email
**Steps**:
1. In search box, type "Test"
2. Verify "Test Customer 1" appears
3. Clear search, type "9876543210"
4. Verify same customer appears

**✅ Pass Criteria**: Search returns correct results

### **Test 1.5: Edit Customer**
**Business Rule**: Customer details can be updated except ID
**Steps**:
1. Click "Edit" for "Test Customer 1"
2. Change name to "Test Customer Updated"
3. Save changes

**✅ Pass Criteria**: Customer name updated in list

### **Test 1.6: Delete Customer**
**Business Rule**: Customer can be deleted if no orders exist
**Steps**:
1. Click "Delete" for test customer
2. Confirm deletion

**✅ Pass Criteria**: Customer removed from list

---

## 📋 **PHASE 2: Order Management Testing**

### **Test 2.1: Create New Order**
**Business Rule**: Order must have customer and at least one item
**Steps**:
1. Click "Orders" in sidebar
2. Click "Create Order"
3. Select customer from dropdown
4. Add order item:
   - **Material**: Saree
   - **Quantity**: 5
   - **Unit Price**: 500.00
   - **Customization**: "Red border design"
5. Save order

**✅ Pass Criteria**:
- Order created with unique order number
- Total amount calculated correctly (5 × 500 = 2500)
- Order status is "Pending"

### **Test 2.2: Order Number Generation**
**Business Rule**: Each order gets unique sequential number
**Steps**:
1. Create another order
2. Verify order number is incremented

**✅ Pass Criteria**: Order numbers are unique and sequential

### **Test 2.3: Multiple Items per Order**
**Business Rule**: Order can have multiple different items
**Steps**:
1. Create order with 2 items:
   - Item 1: Saree, Qty 3, Price 400
   - Item 2: Dupatta, Qty 2, Price 200
2. Verify total = (3×400) + (2×200) = 1600

**✅ Pass Criteria**: Total calculated correctly for multiple items

---

## 📋 **PHASE 3: Production Tracking Testing**

### **Test 3.1: Production Stage Updates**
**Business Rule**: Items progress through stages: Pre-treatment → Printing → Post-process
**Steps**:
1. Go to "Production" page
2. Find order item in "Pre-treatment" stage
3. Mark as complete
4. Verify it moves to "Printing" stage

**✅ Pass Criteria**: Item progresses to next stage with timestamp

### **Test 3.2: Stage Completion Validation**
**Business Rule**: Stages must be completed in order
**Steps**:
1. Try to complete "Post-process" before "Printing"
2. Verify error message

**✅ Pass Criteria**: System prevents skipping stages

### **Test 3.3: Production Timeline**
**Business Rule**: Each stage completion is timestamped
**Steps**:
1. Complete all stages for an item
2. View production timeline

**✅ Pass Criteria**: Each stage shows completion date/time and user

---

## 📋 **PHASE 4: Delivery Challan Testing**

### **Test 4.1: Create Delivery Challan**
**Business Rule**: Challan can only include completed items
**Steps**:
1. Go to "Delivery Challans"
2. Create new challan
3. Select customer
4. Add completed order items
5. Generate challan

**✅ Pass Criteria**:
- Only completed items available for selection
- Challan number auto-generated
- Total quantity calculated

### **Test 4.2: Partial Delivery**
**Business Rule**: Can deliver partial quantities of completed items
**Steps**:
1. Order has 5 pieces completed
2. Create challan for 3 pieces
3. Verify remaining 2 pieces still available

**✅ Pass Criteria**: Remaining quantity tracked correctly

---

## 📋 **PHASE 5: Invoice Generation Testing**

### **Test 5.1: Create GST Invoice**
**Business Rule**: Invoice includes delivery challans with GST calculation
**Steps**:
1. Go to "Invoices"
2. Create new invoice
3. Select customer and delivery challans
4. Set GST rates (CGST: 9%, SGST: 9%)
5. Generate invoice

**✅ Pass Criteria**:
- Subtotal calculated from challan amounts
- GST amounts calculated correctly
- Total = Subtotal + CGST + SGST

### **Test 5.2: Invoice Numbering**
**Business Rule**: Sequential invoice numbers
**Steps**:
1. Create multiple invoices
2. Verify sequential numbering

**✅ Pass Criteria**: Invoice numbers are unique and sequential

---

## 📋 **PHASE 6: Payment Recording Testing**

### **Test 6.1: Record Payment**
**Business Rule**: Payments reduce outstanding amount on invoices
**Steps**:
1. Create invoice with amount 1000
2. Record payment of 600
3. Verify outstanding = 400

**✅ Pass Criteria**: Outstanding amount updated correctly

### **Test 6.2: Multiple Payment Methods**
**Business Rule**: Support Cash, UPI, Bank Transfer, Cheque
**Steps**:
1. Record payments using different methods
2. Verify all methods accepted

**✅ Pass Criteria**: All payment methods work

---

## 📋 **PHASE 7: Returns & Adjustments Testing**

### **Test 7.1: Process Return**
**Business Rule**: Can return delivered items with reason
**Steps**:
1. Find delivered item
2. Process return with reason "Damaged"
3. Specify return quantity and refund amount

**✅ Pass Criteria**: Return recorded with proper tracking

### **Test 7.2: Return Reasons**
**Business Rule**: Must select valid return reason
**Steps**:
1. Verify available reasons: Damaged, Defective, Wrong Design, Customer Request

**✅ Pass Criteria**: All return reasons available

---

## 📋 **PHASE 8: Inventory Management Testing**

### **Test 8.1: Stock Tracking**
**Business Rule**: Track inventory levels and reorder points
**Steps**:
1. Go to "Inventory"
2. Add inventory item
3. Set reorder level
4. Verify low stock alert when below reorder level

**✅ Pass Criteria**: Stock levels tracked accurately

---

## 📋 **PHASE 9: Reporting Testing**

### **Test 9.1: Pending Orders Report**
**Business Rule**: Show orders not yet completed
**Steps**:
1. Go to "Reports"
2. Generate "Pending Orders" report
3. Verify shows only incomplete orders

**✅ Pass Criteria**: Report shows correct data

### **Test 9.2: Production Status Report**
**Business Rule**: Track items by production stage
**Steps**:
1. Generate "Production Status" report
2. Verify items grouped by stage

**✅ Pass Criteria**: Report groups by production stage

---

## 🎯 **TESTING EXECUTION ORDER**

### **Quick Test (15 minutes)**
1. ✅ Login
2. ✅ Create 1 customer  
3. ✅ Create 1 order
4. ✅ Check if data appears in lists

### **Full Test (60 minutes)**
1. Execute Phase 1 (Customers) - 15 min
2. Execute Phase 2 (Orders) - 15 min  
3. Execute Phase 3 (Production) - 15 min
4. Execute Phase 4-9 (Other features) - 15 min

### **Smoke Test (5 minutes)**
1. Login ✅
2. Navigate to each page ✅
3. Verify no 404/500 errors ✅

---

## 🛠 **Troubleshooting Common Issues**

### **Issue: "Failed to load customers"**
- **Cause**: Backend API not responding
- **Fix**: Check console for API errors

### **Issue: "Network Error"**
- **Cause**: Backend deployment issue
- **Fix**: Wait for deployment, verify backend health

### **Issue: "Authentication Error"**
- **Cause**: Token expired or invalid
- **Fix**: Logout and login again

---

## 📊 **Success Metrics**

### **✅ Basic Success** (Minimum viable)
- [ ] Login works
- [ ] Can create customers
- [ ] Can create orders
- [ ] No 404/500 errors

### **✅ Full Success** (Complete system)
- [ ] All CRUD operations work
- [ ] Business rules enforced
- [ ] Reports generate correctly
- [ ] Real-time updates work

### **✅ Production Ready**
- [ ] All tests pass
- [ ] Performance acceptable
- [ ] User-friendly error messages
- [ ] Mobile responsive

---

**Start Testing in 2-3 minutes after backend deployment completes!** 🚀 