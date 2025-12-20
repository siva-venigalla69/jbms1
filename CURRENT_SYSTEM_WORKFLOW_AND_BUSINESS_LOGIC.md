# Current System Workflow and Business Logic
## Textile Manufacturing Management System - Complete Documentation

**Document Version**: 1.0
**Date**: 2025-12-10
**System**: Digital Textile Printing Management System

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Business Entities](#business-entities)
3. [Complete Business Workflow](#complete-business-workflow)
4. [Production Workflow (Detailed)](#production-workflow-detailed)
5. [Database Schema](#database-schema)
6. [Business Rules and Validation](#business-rules-and-validation)
7. [API Layer](#api-layer)
8. [Frontend Flow](#frontend-flow)
9. [Status Management](#status-management)
10. [Financial Workflow](#financial-workflow)

---

## 🎯 System Overview

### What This System Does

This is a **complete textile manufacturing management system** specifically designed for custom textile printing operations. It manages the entire business lifecycle from when a customer places an order until the final delivery and payment.

### Business Model

**Type**: Custom Textile Printing (B2B)
**Specialization**: Sarees, Dupattas, Vonis, Running Material, Blouse Material
**Process**: Customer provides fabric → Printing/Processing → Delivery

### Key Stakeholders

1. **Customers**: Textile businesses who provide raw fabric for printing
2. **Managers**: Oversee operations and approve designs
3. **Production Workers**: Handle padding, printing, post-processing
4. **Designers**: Create or approve designs for printing
5. **Delivery Team**: Handle logistics and deliveries
6. **Admin**: System administrators and owners

---

## 🏢 Business Entities

### 1. Customers
```typescript
Customer {
    id: UUID
    name: string                    // Business name
    phone: string
    email: string
    address: string
    gst_number: string             // For invoicing
    created_at: timestamp
}
```

**Purpose**: Represents textile businesses who are your clients
**Lifecycle**: Active customers can place orders, receive deliveries, make payments

### 2. Orders
```typescript
Order {
    id: UUID
    order_number: string           // e.g., "ORD-001"
    customer_id: UUID              // Links to customer
    order_date: date
    status: OrderStatus            // pending, in_progress, completed, cancelled
    total_amount: decimal
    notes: text
    created_at: timestamp
}
```

**Purpose**: Represents a customer's order request
**Lifecycle**:
- Created when customer places order
- Status updates as production progresses
- Completed when all items delivered

### 3. Order Items
```typescript
OrderItem {
    id: UUID
    order_id: UUID                 // Parent order
    material_type: MaterialType    // saree, dupatta, voni, etc.
    quantity: integer              // How many units
    unit_price: decimal

    // CRITICAL: Independent Status Tracking
    design_status: DesignStatus    // pending → received → ready
    production_status: ProductionStatus  // pending → pre_treatment → printing → post_process → completed

    design_file_url: text
    design_notes: text
    designs_provided_quantity: integer
    designs_approved_quantity: integer

    // Timestamps
    pre_treatment_completed_at: timestamp
    printing_completed_at: timestamp
    post_process_completed_at: timestamp
    created_at: timestamp
}
```

**Purpose**: Individual items within an order (each tracked separately)
**Lifecycle**: Progresses through design and production stages independently

### 4. Materials In (Material Receipt)
```typescript
MaterialIn {
    id: UUID
    customer_id: UUID
    order_id: UUID (optional)
    material_type: string
    quantity: integer
    received_date: date
    notes: text
}
```

**Purpose**: Track fabric received from customers
**Lifecycle**: Created when customer brings fabric

### 5. Production Batches
```typescript
ProductionBatch {
    id: UUID
    production_batch_number: string    // e.g., "PB-2024-001"
    order_id: UUID
    order_item_id: UUID

    material_type: MaterialType
    planned_quantity: integer
    actual_quantity: integer

    design_status: DesignStatus
    production_status: ProductionStatus
    batch_status: BatchStatus          // planned, in_progress, completed, delivered

    priority: string                   // low, medium, high, urgent
    planned_start_date: date
    actual_start_date: date
    actual_completion_date: date

    // Stage tracking
    pre_treatment_started_at: timestamp
    pre_treatment_completed_at: timestamp
    printing_started_at: timestamp
    printing_completed_at: timestamp
    post_process_started_at: timestamp
    post_process_completed_at: timestamp

    quality_rating: integer (1-5)
    production_notes: text

    delivery_challan_id: UUID
    delivered_quantity: integer
}
```

**Purpose**: Track individual production runs for better granularity
**Why**: Large orders may be produced in multiple batches over time

### 6. Delivery Challans
```typescript
DeliveryChallan {
    id: UUID
    challan_number: string
    customer_id: UUID
    order_id: UUID
    delivery_date: date
    status: string                     // pending, delivered, returned
    notes: text

    items: DeliveryChallanItem[]       // Multiple items can be in one challan
}

DeliveryChallanItem {
    id: UUID
    delivery_challan_id: UUID
    order_id: UUID
    order_item_id: UUID
    material_type: string
    quantity_delivered: integer
    unit_price: decimal
    notes: text
}
```

**Purpose**: Shipping/delivery documentation
**Lifecycle**: Created when items ready for delivery, updated upon delivery confirmation

### 7. GST Invoices
```typescript
GST_Invoice {
    id: UUID
    invoice_number: string
    customer_id: UUID
    order_id: UUID
    invoice_date: date

    subtotal: decimal
    tax_amount: decimal (18% GST)
    total_amount: decimal

    status: string                     // draft, sent, paid, overdue
    due_date: date
    notes: text
}
```

**Purpose**: Financial invoicing with GST compliance
**Lifecycle**: Generated after delivery, paid by customer

### 8. Payments
```typescript
Payment {
    id: UUID
    customer_id: UUID
    invoice_id: UUID
    payment_amount: decimal
    payment_date: date
    payment_method: string             // cash, upi, bank_transfer, cheque
    reference_number: string
    notes: text
}
```

**Purpose**: Track customer payments against invoices
**Lifecycle**: Created when customer makes payment

---

## 🔄 Complete Business Workflow

### Phase 1: Order Intake & Material Receipt

```
Customer Contact → Order Creation → Material Receipt → Stock Recording
```

#### Step 1.1: Customer Places Order
**Actor**: Manager/Admin
**Action**: Create new order in system
**Input**:
- Customer details
- Material type (saree, dupatta, etc.)
- Quantity
- Unit price
- Special requirements

**System Actions**:
- Generate order number (ORD-XXX)
- Create order record
- Create order items
- Initialize status: design_status = 'pending_from_customer', production_status = 'pending'
- Calculate total amount

**Database**:
```sql
INSERT INTO orders (customer_id, order_number, order_date, status, total_amount)
VALUES (customer_id, 'ORD-001', '2025-12-10', 'pending', 20000);

INSERT INTO order_items (order_id, material_type, quantity, unit_price, design_status, production_status)
VALUES (order_id, 'saree', 100, 200.00, 'pending_from_customer', 'pending');
```

#### Step 1.2: Customer Brings Fabric
**Actor**: Manager/Warehouse Staff
**Action**: Record material receipt
**Input**:
- Customer who brought it
- Order it's for (optional)
- Material type
- Quantity received
- Receipt date

**System Actions**:
- Create material_in record
- Update customer material stock
- Link to order if specified

**Database**:
```sql
INSERT INTO material_in (customer_id, order_id, material_type, quantity, received_date)
VALUES (customer_id, order_id, 'saree_fabric', 100, '2025-12-10');

-- Update stock tracking
UPDATE material_stock
SET total_received = total_received + 100,
    current_stock = current_stock + 100
WHERE customer_id = customer_id AND material_type = 'saree_fabric';
```

**UI Flow**:
```
Orders Page → "New Order" Button → Order Form:
- Select Customer (dropdown)
- Add Items:
  - Material Type (dropdown)
  - Quantity (number input)
  - Unit Price (number input)
- Notes (textarea)
- Submit Button → Order Created
```

---

### Phase 2: Design Management

```
Design Request → Customer Provides → Review → Approval → Ready for Production
```

#### Step 2.1: Initial State - Design Pending
**Status**: `design_status = 'pending_from_customer'`
**Meaning**: Waiting for customer to provide design
**Who Can See**: Everyone (shows in "Design Pending" filter)
**Actions Available**:
- Send reminder to customer
- Assign internal designer
- Use design from library

#### Step 2.2: Customer Provides Design
**Actor**: Manager/Designer
**Action**: Upload design or mark as received
**Input**:
- Design file URL or upload
- Design notes
- Number of designs provided

**System Actions**:
- Update design_status to 'design_received_from_customer'
- Store design file reference
- Record timestamp
- Optionally create design assignment for review

**Database**:
```sql
UPDATE order_items
SET design_status = 'design_received_from_customer',
    design_file_url = 'https://storage/design123.png',
    design_notes = 'Red border with golden prints',
    designs_provided_quantity = 5,
    design_last_updated = NOW()
WHERE id = order_item_id;
```

**UI Flow**:
```
Production Page → Find Order Item → "Update Design Status" Button:
- Status: Design Received from Customer (radio button)
- Design File URL: (text input)
- Design Notes: (textarea)
- Designs Provided: (number input)
- Submit → Status Updated
```

#### Step 2.3: Design Review & Approval
**Actor**: Manager/Design Lead
**Action**: Review design for production feasibility
**Checks**:
- Is design printable on fabric?
- Color accuracy achievable?
- Any modifications needed?
- Customer approval if changes made

**System Actions**:
- Update design_status to 'design_ready'
- Record approved quantity
- Design now ready for production use

**Database**:
```sql
UPDATE order_items
SET design_status = 'design_ready',
    designs_approved_quantity = 5,
    design_last_updated = NOW()
WHERE id = order_item_id;

-- Audit log created automatically by trigger
```

**IMPORTANT**: Once design_status = 'design_ready', it unlocks printing (if pre-treatment also done)

---

### Phase 3: Production Workflow (THE CORE PROCESS)

```
Fabric Ready → Pre-treatment (Padding) → Printing → Post-processing → Quality Check → Ready for Delivery
```

This is the MOST IMPORTANT part of your business. Let's break it down in extreme detail.

#### Step 3.1: Pre-treatment (Padding) Stage

**What is Pre-treatment/Padding?**
- Fabric preparation process
- May include: washing, padding, chemical treatment, drying
- Prepares fabric surface for printing
- Can take several days

**CRITICAL BUSINESS RULE (NEW)**:
> Pre-treatment CAN START WITHOUT design being ready!

**Actor**: Production Manager
**Action**: Start pre-treatment process
**Input**: Select order item to start padding

**System Actions**:
- Update production_status from 'pending' to 'pre_treatment'
- Record pre_treatment_started_at timestamp
- NO CHECK on design_status (this is the key change!)
- Update order status to 'in_progress' if first item

**Database**:
```sql
-- This WORKS even if design_status = 'pending_from_customer'
UPDATE order_items
SET production_status = 'pre_treatment',
    pre_treatment_started_at = NOW(),
    updated_at = NOW()
WHERE id = order_item_id;
-- Trigger validates: Allows this! ✅

-- Update parent order
UPDATE orders
SET status = 'in_progress',
    updated_at = NOW()
WHERE id = order_id;
```

**UI Flow**:
```
Production Page → Filter: Pending Production → Find Item:
- Current Status: Design Pending + Production Pending
- Click "Update Production Status"
- Select: "Pre-treatment" from dropdown
- Click "Update"
- ✅ SUCCESS: Status updated
- Item now shows in "Padding in Progress, Design Pending" card (Orange)
```

**What Happens in Real Life**:
```
Day 1: Customer brings fabric, order created
Day 1: Fabric sent to padding department (design not needed yet)
Day 2-3: Fabric being padded
Day 4: Customer sends design
Day 5: Design approved
Day 5: Padding already done! Ready for printing immediately!
```

**Validation**:
```sql
-- Database trigger:
IF NEW.production_status = 'pre_treatment' THEN
    -- Allow without any checks!
    RETURN NEW;
END IF;
```

#### Step 3.2: Pre-treatment Completed, Waiting for Design

**Scenario**: Padding finished, but design not approved yet

**Status**:
- design_status = 'pending_from_customer' OR 'design_received_from_customer'
- production_status = 'pre_treatment'

**System Behavior**:
- Item shows in "⚠️ Padding Done, Waiting for Design" card
- Color: Orange/Yellow (Warning - blocked!)
- Priority: High (needs attention)
- Action Button: "Follow up for design" or "Approve design"

**User Experience**:
```
Production Dashboard shows:
┌─────────────────────────────────────┐
│ ⚠️ Padding Done, Waiting for Design │
│ 12 items                            │
│ Priority: HIGH                      │
│ Action: Approve designs to unblock  │
└─────────────────────────────────────┘
```

**Database Query**:
```sql
-- Find blocked items
SELECT oi.id, o.order_number, c.name, oi.material_type, oi.quantity
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN customers c ON o.customer_id = c.id
WHERE oi.production_status = 'pre_treatment'
  AND oi.design_status != 'design_ready'
  AND o.is_deleted = false;
```

**What Happens if Try to Print**:
```
User Action: Try to update production_status to 'printing'

Database Trigger:
IF NEW.production_status = 'printing' AND NEW.design_status != 'design_ready' THEN
    RAISE EXCEPTION 'BLOCKED: Cannot start printing without design approval.
Design Status: % (Required: design_ready)
Action: Approve the design first, then start printing.', NEW.design_status;
END IF;

Result: ❌ ERROR shown to user with clear message
```

#### Step 3.3: Both Pre-treatment AND Design Ready - READY FOR PRINTING!

**Status**:
- design_status = 'design_ready' ✅
- production_status = 'pre_treatment' ✅

**System Behavior**:
- Item shows in "✅ Ready for Printing" card
- Color: GREEN (Success!)
- Priority: 1 (HIGHEST - immediate action required)
- Action Button: "Start Printing NOW"
- Alert notification (optional)

**User Experience**:
```
Production Dashboard shows:
┌─────────────────────────────────────┐
│ ✅ Ready for Printing                │
│ 8 items                             │
│ Priority: HIGHEST                   │
│ 🚀 Start printing immediately!       │
└─────────────────────────────────────┘

Item row shows:
- Customer: ABC Textiles
- Material: Saree (100 qty)
- Design: ✅ Ready
- Padding: ✅ Complete
- Status Badge: GREEN "READY FOR PRINTING"
- Action Button: [Start Printing] (prominent, enabled)
```

**Database Query**:
```sql
-- Find items ready for printing
SELECT oi.id, o.order_number, c.name, oi.material_type, oi.quantity,
       oi.pre_treatment_completed_at,
       oi.design_file_url
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN customers c ON o.customer_id = c.id
WHERE oi.production_status = 'pre_treatment'
  AND oi.design_status = 'design_ready'
  AND o.is_deleted = false
ORDER BY oi.pre_treatment_completed_at ASC;  -- First completed, first printed
```

#### Step 3.4: Start Printing

**Actor**: Production Manager/Printing Operator
**Action**: Move item to printing stage
**Input**: Select item and click "Start Printing"

**System Actions**:
- Update production_status from 'pre_treatment' to 'printing'
- Record pre_treatment_completed_at (if not already set)
- Record printing_started_at timestamp
- Update batch_status to 'in_progress' if using batches

**Validation (Database Trigger)**:
```sql
IF NEW.production_status = 'printing' THEN
    -- Check 1: Design must be ready
    IF NEW.design_status != 'design_ready' THEN
        RAISE EXCEPTION 'Cannot start printing: Design not ready';
    END IF;

    -- Check 2: Must come from pre-treatment
    IF OLD.production_status NOT IN ('pre_treatment', 'printing') THEN
        RAISE EXCEPTION 'Cannot start printing: Pre-treatment not completed';
    END IF;

    -- Both checks passed ✅
END IF;
```

**Database**:
```sql
UPDATE order_items
SET production_status = 'printing',
    pre_treatment_completed_at = COALESCE(pre_treatment_completed_at, NOW()),
    printing_started_at = NOW(),
    updated_at = NOW()
WHERE id = order_item_id
  AND production_status = 'pre_treatment'  -- Safety check
  AND design_status = 'design_ready';      -- Safety check

-- Returns: 1 row updated ✅
```

**UI Flow**:
```
Production Page → "Ready for Printing" Section → Find Item:
- Click "Update Production Status"
- Select: "Printing" from dropdown
- Click "Update"
- ✅ SUCCESS: Status updated
- Item moves to "Printing in Progress" card (Blue)
- Timestamp recorded: "Printing started at 10:30 AM"
```

**Real-world Process**:
- Printing operator takes fabric and design
- Loads design into printing machine
- Sets up colors and patterns
- Runs printing process (may take hours or days)
- Monitors quality during printing

#### Step 3.5: Printing Stage (Active Work)

**Status**: production_status = 'printing'

**System Behavior**:
- Item shows in "🖨️ Printing in Progress" card
- Color: Blue (Info - active work)
- Priority: Medium
- Shows: printing_started_at timestamp
- Can add production notes

**User Actions Available**:
- View printing progress
- Add production notes
- Report issues
- Mark as completed when done

**Database Queries**:
```sql
-- Items currently in printing
SELECT oi.id, o.order_number, c.name,
       oi.material_type, oi.quantity,
       oi.printing_started_at,
       EXTRACT(EPOCH FROM (NOW() - oi.printing_started_at))/3600 as hours_in_printing
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN customers c ON o.customer_id = c.id
WHERE oi.production_status = 'printing'
  AND o.is_deleted = false
ORDER BY oi.printing_started_at ASC;
```

#### Step 3.6: Move to Post-processing

**Actor**: Production Manager
**Action**: Mark printing as complete, move to post-processing
**When**: Printing finished

**System Actions**:
- Update production_status from 'printing' to 'post_process'
- Record printing_completed_at timestamp
- Record post_process_started_at timestamp

**Database**:
```sql
UPDATE order_items
SET production_status = 'post_process',
    printing_completed_at = NOW(),
    post_process_started_at = NOW(),
    updated_at = NOW()
WHERE id = order_item_id
  AND production_status = 'printing';
```

**Validation**: Must be in 'printing' status to move to post-processing

#### Step 3.7: Post-processing Stage

**What is Post-processing?**
- Final finishing work
- May include: washing, drying, ironing, folding
- Quality inspection
- Defect checking
- Packaging preparation

**Status**: production_status = 'post_process'

**System Behavior**:
- Item shows in "✂️ Post-Processing" card
- Color: Purple/Blue
- Priority: Medium-High
- Shows timestamps

**User Actions**:
- Mark any quality issues
- Rate quality (1-5 stars)
- Add final notes
- Mark as completed

#### Step 3.8: Mark as Completed

**Actor**: Quality Control / Production Manager
**Action**: Final approval and completion
**When**: All quality checks passed

**System Actions**:
- Update production_status to 'completed'
- Record post_process_completed_at timestamp
- Mark order item as ready for delivery
- Update order status if all items complete

**Database**:
```sql
UPDATE order_items
SET production_status = 'completed',
    post_process_completed_at = NOW(),
    updated_at = NOW()
WHERE id = order_item_id
  AND production_status = 'post_process';

-- Check if all items in order are completed
UPDATE orders o
SET status = 'completed'
WHERE o.id = order_id
  AND NOT EXISTS (
    SELECT 1 FROM order_items oi
    WHERE oi.order_id = o.id
      AND oi.production_status != 'completed'
  );
```

**UI Flow**:
```
Production Page → "Post-Processing" Section → Find Item:
- Quality Check: ✅ Passed
- Quality Rating: ⭐⭐⭐⭐⭐ (5 stars)
- Final Notes: "Excellent quality, ready for delivery"
- Click "Mark as Completed"
- ✅ Item moves to "Production Complete" section
- Status Badge: GREEN "COMPLETED"
- Action: "Create Delivery Challan"
```

---

### Phase 4: Delivery Management

```
Production Complete → Delivery Challan → Dispatch → Delivery Confirmation
```

#### Step 4.1: Create Delivery Challan

**Actor**: Manager/Delivery Coordinator
**Action**: Create delivery challan for completed items
**When**: Items ready for delivery

**Input**:
- Select customer
- Select delivery date
- Add items from completed production
- Specify quantity to deliver (can be partial)

**System Actions**:
- Generate challan number (DC-XXX)
- Create delivery_challan record
- Create delivery_challan_items for each item
- Update material stock (reduce)
- Link to production batches if used

**Database**:
```sql
-- Create challan
INSERT INTO delivery_challans (challan_number, customer_id, order_id, delivery_date, status)
VALUES ('DC-001', customer_id, order_id, '2025-12-15', 'pending');

-- Add items to challan
INSERT INTO delivery_challan_items (delivery_challan_id, order_id, order_item_id,
                                     material_type, quantity_delivered, unit_price)
VALUES (challan_id, order_id, order_item_id, 'saree', 50, 200.00);

-- Update stock
UPDATE material_stock
SET total_delivered = total_delivered + 50,
    current_stock = current_stock - 50
WHERE customer_id = customer_id AND material_type = 'saree_fabric';

-- Update production batch if used
UPDATE production_batches
SET delivery_challan_id = challan_id,
    delivered_quantity = 50,
    delivery_date = '2025-12-15',
    batch_status = 'delivered'
WHERE order_item_id = order_item_id;
```

**UI Flow**:
```
Delivery Page → "Create Challan" Button → Form:
- Customer: ABC Textiles (auto-filled from order)
- Delivery Date: 2025-12-15 (date picker)
- Items to Deliver:
  ☑ Order ORD-001 - Saree (50/100 qty)
  ☐ Order ORD-002 - Dupatta (all)
- Notes: "First batch delivery"
- Generate Challan → Challan created (DC-001)
```

#### Step 4.2: Dispatch & Delivery

**Actor**: Delivery Team
**Action**: Physical delivery to customer
**Process**:
- Print delivery challan
- Load items for delivery
- Transport to customer
- Customer receives and signs
- Update system

**System Actions**:
- Update challan status to 'delivered'
- Record delivery confirmation
- Update order item delivery quantities
- Trigger invoice generation

**Database**:
```sql
UPDATE delivery_challans
SET status = 'delivered',
    updated_at = NOW()
WHERE id = challan_id;

-- Update order item quantities
UPDATE order_items
SET delivered_quantity = COALESCE(delivered_quantity, 0) + 50
WHERE id = order_item_id;
```

---

### Phase 5: Financial Management

```
Delivery Confirmed → Invoice Generation → Payment Collection → Allocation → Reconciliation
```

#### Step 5.1: Invoice Generation

**Trigger**: After delivery challan marked as delivered
**Actor**: Manager/Accounts
**Action**: Generate GST invoice

**System Actions**:
- Create invoice from delivery challan
- Calculate totals with 18% GST
- Generate invoice number
- Set due date (typically 30 days)

**Database**:
```sql
-- Calculate amounts
subtotal = SUM(quantity * unit_price) = 50 * 200 = 10,000
tax_amount = subtotal * 0.18 = 1,800
total_amount = subtotal + tax_amount = 11,800

-- Create invoice
INSERT INTO gst_invoices (invoice_number, customer_id, order_id, invoice_date,
                           subtotal, tax_amount, total_amount, status, due_date)
VALUES ('INV-001', customer_id, order_id, '2025-12-15',
        10000.00, 1800.00, 11800.00, 'sent', '2026-01-15');
```

#### Step 5.2: Payment Collection

**Actor**: Manager/Accounts
**Action**: Record customer payment
**Input**:
- Invoice to pay against
- Payment amount
- Payment method
- Reference number

**System Actions**:
- Create payment record
- Allocate payment to invoice(s)
- Update invoice status
- Calculate outstanding balance

**Database**:
```sql
-- Record payment
INSERT INTO payments (customer_id, invoice_id, payment_amount,
                      payment_date, payment_method, reference_number)
VALUES (customer_id, invoice_id, 11800.00, '2025-12-20', 'bank_transfer', 'TXN123456');

-- Update invoice
UPDATE gst_invoices
SET status = 'paid'
WHERE id = invoice_id;
```

---

## 🗄️ Database Schema (Detailed)

### Core Tables

#### orders Table
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'partially_delivered', 'in_production')),
    total_amount DECIMAL(10,2) NOT NULL,
    notes TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status) WHERE NOT is_deleted;
CREATE INDEX idx_orders_date ON orders(order_date DESC);
```

#### order_items Table (MOST IMPORTANT)
```sql
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    material_type VARCHAR(50) NOT NULL
        CHECK (material_type IN ('saree', 'dupatta', 'voni', 'running_material', 'blouse_material')),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),

    -- CRITICAL: Independent status columns
    design_status VARCHAR(50) NOT NULL DEFAULT 'pending_from_customer'
        CHECK (design_status IN ('pending_from_customer', 'design_received_from_customer', 'design_ready')),

    production_status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (production_status IN ('pending', 'pre_treatment', 'printing', 'post_process', 'completed')),

    -- Design information
    design_file_url TEXT,
    design_notes TEXT,
    designs_provided_quantity INTEGER DEFAULT 0,
    designs_approved_quantity INTEGER DEFAULT 0,
    design_last_updated TIMESTAMP,

    -- Production timestamps
    pre_treatment_started_at TIMESTAMP,
    pre_treatment_completed_at TIMESTAMP,
    printing_started_at TIMESTAMP,
    printing_completed_at TIMESTAMP,
    post_process_started_at TIMESTAMP,
    post_process_completed_at TIMESTAMP,

    -- Delivery tracking
    delivered_quantity INTEGER DEFAULT 0,

    -- Notes
    production_notes TEXT,
    customization_details TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Critical indexes for performance
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_design_status ON order_items(design_status);
CREATE INDEX idx_order_items_production_status ON order_items(production_status);
CREATE INDEX idx_order_items_combined ON order_items(design_status, production_status)
    WHERE production_status != 'completed';
```

### Validation Trigger (THE KEY LOGIC)

```sql
CREATE OR REPLACE FUNCTION validate_design_production_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate enum values
    IF NEW.design_status NOT IN ('pending_from_customer', 'design_received_from_customer', 'design_ready') THEN
        RAISE EXCEPTION 'Invalid design_status: %', NEW.design_status;
    END IF;

    IF NEW.production_status NOT IN ('pending', 'pre_treatment', 'printing', 'post_process', 'completed') THEN
        RAISE EXCEPTION 'Invalid production_status: %', NEW.production_status;
    END IF;

    -- ====================================================================
    -- CRITICAL BUSINESS RULE: Pre-treatment can start ANYTIME
    -- ====================================================================
    IF NEW.production_status = 'pre_treatment' THEN
        RAISE NOTICE 'Pre-treatment allowed without design check';
        RETURN NEW;
    END IF;

    -- ====================================================================
    -- CRITICAL BUSINESS RULE: Printing requires BOTH design AND pre-treatment
    -- ====================================================================
    IF NEW.production_status = 'printing' THEN
        -- Check design is ready
        IF NEW.design_status != 'design_ready' THEN
            RAISE EXCEPTION 'BLOCKED: Cannot start printing without design approval.
Design Status: % (Required: design_ready)
Action: Approve the design first, then start printing.', NEW.design_status;
        END IF;

        -- Check pre-treatment was completed
        IF TG_OP = 'UPDATE' AND OLD.production_status NOT IN ('pre_treatment', 'printing') THEN
            RAISE EXCEPTION 'BLOCKED: Cannot start printing without completing pre-treatment first.
Current Status: % (Required: pre_treatment)
Action: Complete pre-treatment/padding before starting printing.', OLD.production_status;
        END IF;

        RAISE NOTICE 'Printing allowed: Both design ready AND pre-treatment completed';
    END IF;

    -- Other validations for post_process and completed...

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_validate_design_production_status
    BEFORE INSERT OR UPDATE OF design_status, production_status ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION validate_design_production_status();
```

### Helper Views

```sql
-- Combined status view for UI
CREATE VIEW order_items_combined_status AS
SELECT
    oi.id,
    oi.order_id,
    o.order_number,
    o.customer_id,
    c.name as customer_name,
    oi.material_type,
    oi.quantity,
    oi.design_status,
    oi.production_status,

    -- Combined status label
    CASE
        WHEN oi.design_status = 'design_ready' AND oi.production_status = 'pre_treatment'
            THEN '✅ Ready for Printing'
        WHEN oi.design_status != 'design_ready' AND oi.production_status = 'pre_treatment'
            THEN '⚠️ Padding Done, Waiting for Design'
        WHEN oi.production_status = 'printing'
            THEN '🖨️ Printing in Progress'
        WHEN oi.production_status = 'post_process'
            THEN '✂️ Post-Processing'
        ELSE 'Other'
    END as combined_status_label,

    -- Priority (1 = highest)
    CASE
        WHEN oi.design_status = 'design_ready' AND oi.production_status = 'pre_treatment'
            THEN 1
        WHEN oi.design_status != 'design_ready' AND oi.production_status = 'pre_treatment'
            THEN 2
        WHEN oi.production_status = 'printing'
            THEN 3
        ELSE 4
    END as priority,

    -- Is blocked indicator
    CASE
        WHEN oi.design_status != 'design_ready' AND oi.production_status = 'pre_treatment'
            THEN true
        ELSE false
    END as is_blocked

FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN customers c ON o.customer_id = c.id
WHERE o.is_deleted = false;
```

---

## 📊 Status Management

### Design Status Flow

```
pending_from_customer
    ↓ (Customer sends design)
design_received_from_customer
    ↓ (Manager/Designer approves)
design_ready
```

**Status**: `pending_from_customer`
- **Meaning**: Waiting for customer to provide design
- **Actions**: Send reminder, assign designer, use library
- **UI**: Gray/Default color, "Design Pending" label

**Status**: `design_received_from_customer`
- **Meaning**: Design received, under review
- **Actions**: Review, request changes, approve
- **UI**: Blue/Info color, "Design Received" label

**Status**: `design_ready`
- **Meaning**: Design approved for production
- **Actions**: None (design complete), can start/continue production
- **UI**: Green/Success color, "Design Ready" label

### Production Status Flow

```
pending
    ↓ (Can start anytime - no dependency)
pre_treatment
    ↓ (Requires: design_ready)
printing
    ↓ (No dependency)
post_process
    ↓ (No dependency)
completed
```

**Status**: `pending`
- **Meaning**: Production not started
- **Can Move To**: pre_treatment (no restrictions!)
- **UI**: Gray, "Pending Production"

**Status**: `pre_treatment`
- **Meaning**: Padding/preparation in progress
- **Can Move To**: printing (ONLY if design_ready)
- **UI**: Orange if design pending, Green if design ready

**Status**: `printing`
- **Meaning**: Active printing
- **Can Move To**: post_process
- **UI**: Blue, "Printing in Progress"

**Status**: `post_process`
- **Meaning**: Final processing
- **Can Move To**: completed
- **UI**: Purple, "Post-Processing"

**Status**: `completed`
- **Meaning**: Production finished
- **Can Move To**: None (final state)
- **UI**: Green, "Completed"

### Combined Status Matrix

| Design | Production | Combined Label | Color | Priority | Action |
|--------|-----------|---------------|-------|----------|--------|
| pending | pending | "Pending Start" | Gray | 6 | Start padding or get design |
| pending | pre_treatment | "🔄 Padding, Design Pending" | Orange | 2 | **Follow up for design** |
| received | pre_treatment | "⏳ Padding Done, Review Design" | Yellow | 3 | **Approve design** |
| ready | pre_treatment | "✅ Ready for Printing" | **Green** | **1** | **START PRINTING!** |
| ready | printing | "🖨️ Printing in Progress" | Blue | 3 | Monitor progress |
| ready | post_process | "✂️ Post-Processing" | Purple | 4 | Quality check |
| ready | completed | "✅ Production Complete" | Success | 7 | Create challan |

---

## 🔗 API Layer

### Order Item Status Update APIs

#### Update Design Status
```http
PUT /rest/v1/order_items?id=eq.<item-id>
Content-Type: application/json

{
  "design_status": "design_ready",
  "design_file_url": "https://...",
  "design_notes": "Approved by design team"
}
```

#### Update Production Status
```http
PUT /rest/v1/order_items?id=eq.<item-id>
Content-Type: application/json

{
  "production_status": "pre_treatment"
}
```

**Response if Validation Fails**:
```json
{
  "code": "23514",
  "message": "BLOCKED: Cannot start printing without design approval...",
  "details": "...",
  "hint": "..."
}
```

### Helper RPC Functions

#### Check if Can Progress
```http
POST /rest/v1/rpc/can_progress_to_next_stage
Content-Type: application/json

{
  "p_order_item_id": "uuid-here"
}
```

**Response**:
```json
{
  "can_progress": false,
  "next_stage": "printing",
  "blocking_reason": "Design not ready (current: pending_from_customer)",
  "action": "Approve design to start printing"
}
```

#### Get Status Summary
```http
POST /rest/v1/rpc/get_production_status_summary
```

**Response**:
```json
[
  {
    "status_combination": "design_ready_pre_treatment",
    "item_count": 12,
    "total_quantity": 500,
    "status_label": "Ready for Printing",
    "is_blocked": false,
    "priority": 1
  },
  {
    "status_combination": "pending_from_customer_pre_treatment",
    "item_count": 8,
    "total_quantity": 300,
    "status_label": "Padding Done, Waiting for Design",
    "is_blocked": true,
    "priority": 2
  }
]
```

---

## 🖥️ Frontend Flow

### Production Page Component Structure

```
ProductionPage
├── StatusSummaryCards (Dashboard cards)
│   ├── ReadyForPrintingCard (Green, Priority 1)
│   ├── BlockedItemsCard (Orange, Priority 2)
│   ├── ActiveWorkCard (Blue)
│   └── PendingItemsCard (Gray)
├── FilterSection
│   ├── DesignStatusFilter (dropdown)
│   ├── ProductionStatusFilter (dropdown)
│   └── CustomerFilter (dropdown)
├── ItemsTable
│   ├── ItemRow (for each order item)
│   │   ├── OrderInfo (number, customer, date)
│   │   ├── MaterialInfo (type, quantity)
│   │   ├── StatusBadges (design + production)
│   │   ├── ProgressIndicator (visual)
│   │   └── ActionButtons
│   │       ├── UpdateDesignButton
│   │       ├── UpdateProductionButton
│   │       └── ViewDetailsButton
│   └── Pagination
└── DialogModals
    ├── UpdateDesignDialog
    └── UpdateProductionDialog
```

### User Interaction Flow

**Scenario: Start Pre-treatment**
```
1. User opens Production page
2. Sees order item with status: "Pending/Pending"
3. Clicks "Update Production Status" button
4. Dialog opens with dropdown
5. Selects "Pre-treatment"
6. Clicks "Update"
7. Frontend calls API:
   PUT /order_items?id=eq.xxx
   { production_status: "pre_treatment" }
8. Database trigger validates (allows it!)
9. API returns success
10. Frontend updates UI
11. Item moves to "Padding in Progress" section
12. Status badge changes to orange
```

**Scenario: Try Printing (Blocked)**
```
1. User sees item with: "Design Pending / Pre-treatment"
2. Clicks "Update Production Status"
3. Selects "Printing"
4. Clicks "Update"
5. Frontend calls API
6. Database trigger BLOCKS it
7. API returns ERROR
8. Frontend shows error modal:
   "❌ Cannot start printing
   Design Status: Design Pending (Required: Design Ready)
   Action: Approve the design first"
9. User understands what's blocking
10. User goes to approve design first
```

---

## 💼 Financial Workflow

### Invoice Generation Process

```
Delivery Confirmed
    ↓
System calculates:
    Subtotal = Σ(quantity × unit_price)
    Tax = Subtotal × 0.18 (18% GST)
    Total = Subtotal + Tax
    ↓
Invoice Created
    ↓
Status: 'sent'
Due Date: +30 days
    ↓
Email/Print invoice to customer
```

### Payment Allocation

When customer pays:
```
Payment Received
    ↓
1. Create payment record
2. Link to invoice(s)
3. Allocate amount:
   - If full amount: Mark invoice as 'paid'
   - If partial: Keep as 'sent', track outstanding
   - If overpayment: Create credit balance
4. Update customer account balance
5. Generate receipt
```

---

## ✅ Business Rules Summary

### Critical Rules

1. **Pre-treatment Independence**
   - ✅ Can start pre-treatment WITHOUT design ready
   - ✅ Can complete pre-treatment while design pending
   - ✅ Can run padding and design processes in parallel

2. **Printing Dependency**
   - ❌ CANNOT start printing without design_ready
   - ❌ CANNOT start printing without pre_treatment completed
   - ✅ CAN start printing when BOTH conditions met

3. **Sequential Production**
   - Must go: pending → pre_treatment → printing → post_process → completed
   - Cannot skip stages
   - Cannot go backwards (without admin override)

4. **Status Persistence**
   - All status changes logged with timestamps
   - Audit trail maintained
   - Cannot delete, only mark as cancelled

5. **Delivery Rules**
   - Can deliver partial quantities
   - Must update stock on delivery
   - Can deliver multiple orders in one challan

6. **Financial Rules**
   - Invoice after delivery confirmed
   - 18% GST on all invoices
   - Payment allocation tracked
   - Credit notes for returns

---

## 🎯 Summary

This system manages the complete textile printing business workflow:

1. **Order Intake**: Customer orders with material receipt
2. **Design Management**: Independent design approval process
3. **Production**: Parallel padding and design → Combined printing → Finishing
4. **Delivery**: Challan generation and delivery tracking
5. **Financial**: GST invoicing and payment management

**Key Innovation**: Pre-treatment (padding) can proceed independently of design approval, improving throughput and reducing waiting time!

---

**Document End**
