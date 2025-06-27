# FUNCTIONAL REQUIREMENTS - Digital Textile Printing Workflow System

## 1. SYSTEM OVERVIEW
**Purpose**: Full-stack web application for managing digital textile printing job workflow with user-friendly interface for non-technical employees and robust reporting for management.

**Technology Stack**:
- Backend: Python FastAPI
- Frontend: React.js
- Database: PostgreSQL
- Deployment: Render.com (Backend + DB), Netlify (Frontend)

## 2. USER ROLES & ACCESS
- **Admin**: Full system access, user management, all reports
- **Manager**: View all data, generate reports, approve corrections
- **Employee**: Data entry, view assigned tasks, basic reports

## 3. CORE FUNCTIONAL REQUIREMENTS

### 3.1 CUSTOMER MANAGEMENT
**REQ-001**: System shall allow creation, editing, and viewing of customer records
- Customer Name (Required)
- Phone Number
- Email Address
- Physical Address
- GST Number (Optional)
- Creation/Update timestamps
- Created/Updated by user tracking

**REQ-002**: System shall prevent duplicate customers based on phone number

### 3.2 ORDER MANAGEMENT
**REQ-003**: System shall allow order creation with following details:
- Auto-generated Order Number (Format: ORD-YYYY-NNNN)
- Customer Selection (Required)
-
- Order Date (Default: Current Date)
- Order Status: Pending, In Progress, Completed, Cancelled
- Total Amount
- Notes/Special Instructions

**REQ-004**: System shall allow order editing by authorized users
**REQ-005**: System shall track order status changes with timestamps
**REQ-006**: System shall allow order cancellation with reason

### 3.3 ORDER ITEMS MANAGEMENT
**REQ-007**: Each order shall contain multiple order items with:
- Material Type: Saree, Dupatta, Voni, Running Material, Blouse Material
- Quantity (Required, Minimum: 1)
- Unit Price
- Customization Details (Text field)
- Production Stage: Pre-treatment, Printing, Post-process
- Stage Completion Timestamp

**REQ-008**: System shall allow individual item production stage updates
**REQ-009**: System shall calculate order total based on item quantities and prices

### 3.4 MATERIAL IN TRACKING
**REQ-010**: System shall record material received from customers:
- Link to specific Order (Optional)
- Material Type
- Quantity with Unit (pieces, meters, kg)
- Received Date (Default: Current Date)
- Notes
- Created by user tracking
-please link with materials with cusotmers 
[
  {
    "order_id": "string",
    "material_type": "saree",
    "quantity": 1,
    "unit": "string",
    "received_date": "2025-06-27T03:36:54.375Z",
    "notes": "string",
    "id": "string",
    "created_at": "2025-06-27T03:36:54.375Z"
  }
]

**REQ-011**: System shall allow material-in without linking to specific order (general stock)

### 3.5 PRODUCTION WORKFLOW TRACKING
**REQ-012**: System shall track three production stages:
- Pre-treatment: Initial material processing
- Printing: Actual printing process
- Post-process: Finishing and quality check

**REQ-013**: Each stage completion shall record:
- Completion timestamp
- User who completed the stage
- Optional notes

**REQ-014**: System shall show production status dashboard for all active orders

### 3.6 DELIVERY CHALLAN MANAGEMENT
**REQ-015**: System shall create delivery challans with:
- Auto-generated Challan Number (Format: CH-YYYY-NNNN)
- Customer Selection
- Challan Date (Default: Current Date)
- Selection of completed order items
- Total quantity summary
- Delivery status tracking
- Notes

**REQ-016**: System shall allow multiple order items in single challan
**REQ-017**: System shall generate printable challan format
**REQ-018**: System shall update challan delivery status when material is handed over

### 3.7 MATERIAL OUT RECORDING
**REQ-019**: System shall record material dispatch based on delivery challans:
- Link to Delivery Challan (Required)
- Material Type and Quantity confirmation
- Actual Dispatch Date
- Created by user tracking
-add custoemr field here as well 

**REQ-020**: System shall prevent material-out without valid challan

### 3.8 GST INVOICE GENERATION
**REQ-021**: System shall generate GST invoices with:
- Auto-generated Invoice Number (Format: INV-YYYY-NNNN)
- Customer Details with GST Number
- Invoice Date
- Selection of multiple delivery challans
- Line items from selected challans
- CGST, SGST, IGST calculations (configurable rates)
- Total amount calculations
- Outstanding amount tracking

**REQ-022**: System shall consolidate multiple challans into single invoice
**REQ-023**: System shall generate printable GST invoice format
**REQ-024**: System shall track invoice outstanding amounts

### 3.9 PAYMENT RECORDING
**REQ-025**: System shall record customer payments:
- Link to GST Invoice (Required)
- Payment Date
- Payment Amount
- Payment Method: Cash, UPI, Bank Transfer, Cheque
- Reference Number (for digital payments)
- Notes
- Created by user tracking

**REQ-026**: System shall update invoice outstanding amount after payment
**REQ-027**: System shall allow partial payments
**REQ-028**: System shall prevent overpayment beyond invoice amount

### 3.10 DAMAGED RETURNS & ADJUSTMENTS
**REQ-029**: System shall record customer returns:
- Link to Order Item (Required)
- Return Date
- Returned Quantity
- Return Reason: Damaged, Defective, Wrong Design, Customer Request
- Refund Amount (if applicable)
- Adjustment Flag (adjustment against receivables vs cash refund)
- Notes
- Created by user tracking

**REQ-030**: System shall update customer receivables for adjustments
**REQ-031**: System shall track refund processing status

### 3.11 INVENTORY MANAGEMENT
**REQ-032**: System shall maintain inventory of:
- Colors and dyes
- Padding chemicals
- Other production materials
- Raw materials

**REQ-033**: Each inventory item shall have:
- Item Name (Required)
- Category (Colors, Chemicals, Materials, etc.)
- Current Stock Quantity
- Unit of Measurement (kg, liters, pieces)
- Reorder Level (trigger for low stock alert)
- Cost per Unit
- Supplier Information
- Last Updated timestamp

**REQ-034**: System shall generate low stock alerts when current stock <= reorder level
**REQ-035**: System shall allow inventory adjustments with reason tracking

### 3.12 EXPENSE RECORDING
**REQ-036**: System shall record business expenses:
- Expense Date
- Category (Electricity, Transport, Materials, etc.)
- Description (Required)
- Amount
- Payment Method
- Receipt Number
- Notes
- Created by user tracking

## 4. REPORTING REQUIREMENTS

### 4.1 OPERATIONAL REPORTS
**REQ-037**: **Pending Orders Report**
- List all orders with status 'Pending' or 'In Progress'
- Show customer name, order date, total amount, current stage
- Filter by date range, customer, status

**REQ-038**: **Production Status Report**
- Show all order items with their current production stage
- Group by stage (Pre-treatment, Printing, Post-process)
- Show pending items and completion dates

**REQ-039**: **Stock Holding Report**
- Current inventory levels for all items
- Highlight low stock items (below reorder level)
- Show stock value calculations

### 4.2 FINANCIAL REPORTS
**REQ-040**: **Pending Receivables Report**
- List all unpaid or partially paid invoices
- Show customer name, invoice date, total amount, outstanding amount
- Calculate total receivables
- Filter by customer, date range

**REQ-041**: **Payments Received Report** (Date Range Filter)
- List all payments received in specified period
- Group by customer, payment method
- Show running totals

**REQ-042**: **Damaged Returns Report** (Date Range Filter)
- List all returns in specified period
- Group by return reason
- Show refund amounts and adjustments

**REQ-043**: **Expenses Report** (Date Range Filter)
- List all expenses in specified period
- Group by category
- Show total expenses by category

### 4.3 WORKFLOW REPORTS
**REQ-044**: **Material Flow Report** (Date Range Filter)
- Materials received (Material In)
- Materials dispatched (Material Out)
- Delivery challans created
- Invoices generated
- Show material flow summary

**REQ-045**: **Daily Operations Summary**
- Orders received today
- Production stages completed today
- Challans created today
- Payments received today
- Key metrics dashboard

## 5. DATA CORRECTION & AUDIT REQUIREMENTS

### 5.1 EDIT CAPABILITIES
**REQ-046**: System shall allow editing of all major records:
- Orders (before completion)
- Order Items (production stage updates)
- Customer information
- Material In/Out records
- Payments
- Expenses
- Inventory adjustments

**REQ-047**: System shall restrict editing based on user roles:
- Employees: Can edit own entries within 24 hours
- Managers: Can edit any entry within 7 days
- Admins: Can edit any entry anytime

### 5.2 AUDIT TRAIL
**REQ-048**: System shall maintain audit trail for all critical operations:
- Created timestamp and user
- Updated timestamp and user
- Change history for invoice amounts, payment amounts, stock levels

**REQ-049**: System shall use soft deletes for important records
- Mark records as deleted instead of permanent deletion
- Maintain referential integrity
- Allow data recovery if needed

## 6. SECURITY & ACCESS CONTROL

### 6.1 AUTHENTICATION
**REQ-050**: System shall provide secure login mechanism:
- Username/password authentication
- JWT token-based sessions
- Session timeout after inactivity
- Password complexity requirements

### 6.2 AUTHORIZATION
**REQ-051**: System shall implement role-based access control:
- Admin: Full system access
- Manager: All operations except user management
- Employee: Limited to assigned tasks and basic reports

## 7. PERFORMANCE REQUIREMENTS
**REQ-052**: System shall handle up to 50 concurrent users
**REQ-053**: Report generation shall complete within 30 seconds
**REQ-054**: Page load times shall be under 3 seconds
**REQ-055**: System shall support up to 10,000 orders per year

## 8. DATA VALIDATION REQUIREMENTS
**REQ-056**: System shall validate all required fields before saving
**REQ-057**: System shall prevent negative quantities and amounts
**REQ-058**: System shall validate GST number format if provided
**REQ-059**: System shall prevent duplicate order numbers, challan numbers, invoice numbers

## 9. BACKUP & RECOVERY REQUIREMENTS
**REQ-060**: System shall support data export functionality
**REQ-061**: Critical data shall be backed up daily
**REQ-062**: System shall provide data import capabilities for migration

## 10. INTEGRATION REQUIREMENTS
**REQ-063**: System shall generate PDF formats for:
- Delivery Challans
- GST Invoices
- Reports

**REQ-064**: System shall support data export to Excel/CSV format for all reports

## 11. EXCLUDED FEATURES (Future Phase)
- Design Catalog with image management
- Customer portal for order tracking
- SMS/Email notifications
- Advanced analytics and dashboards
- Mobile application
- Barcode/QR code integration 