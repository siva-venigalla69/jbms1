# Database Schema Documentation

## Overview
This document describes the Supabase database schema used by the JBMS (Job Batch Management System) frontend application. The system manages textile orders, customers, materials, inventory, and financial transactions.

## Core Tables

### 1. Users (`user_profiles`)
**Purpose**: Stores user authentication and profile information

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | UUID | Primary key, matches Supabase auth.users.id | PRIMARY KEY |
| `email` | VARCHAR | User email address | UNIQUE, NOT NULL |
| `username` | VARCHAR | Username for display | UNIQUE |
| `full_name` | VARCHAR | User's full name | |
| `role` | VARCHAR | User role (admin, manager, operator) | NOT NULL, DEFAULT 'operator' |
| `is_active` | BOOLEAN | Whether the user account is active | DEFAULT true |
| `created_at` | TIMESTAMPTZ | Account creation timestamp | DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | Last profile update | DEFAULT now() |

**Functionality**:
- User authentication and authorization
- Role-based access control
- User profile management

---

### 2. Customers (`customers`)
**Purpose**: Manages customer information and contact details

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | UUID | Primary key | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `name` | VARCHAR | Customer name | NOT NULL |
| `phone` | VARCHAR | Phone number | |
| `email` | VARCHAR | Email address | |
| `address` | TEXT | Customer address | |
| `gstin` | VARCHAR | GST identification number | |
| `created_at` | TIMESTAMPTZ | Record creation timestamp | DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | Last update timestamp | DEFAULT now() |

**Functionality**:
- Customer relationship management
- Contact information storage
- GST compliance tracking
- Used in orders, materials, and invoicing

---

### 3. Orders (`orders`)
**Purpose**: Manages customer orders and their lifecycle

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | UUID | Primary key | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `order_number` | VARCHAR | Unique order identifier | UNIQUE, NOT NULL |
| `customer_id` | UUID | Foreign key to customers | REFERENCES customers(id) |
| `order_date` | DATE | Order placement date | DEFAULT CURRENT_DATE |
| `status` | VARCHAR | Order status | CHECK IN ('pending', 'in_progress', 'completed', 'cancelled') |
| `total_amount` | DECIMAL(10,2) | Total order value | |
| `notes` | TEXT | Order notes and instructions | |
| `created_at` | TIMESTAMPTZ | Record creation timestamp | DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | Last update timestamp | DEFAULT now() |

**Functionality**:
- Order lifecycle management
- Customer order tracking
- Status progression monitoring
- Financial reporting base

---

### 4. Order Items (`order_items`)
**Purpose**: Stores individual items within orders

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | UUID | Primary key | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `order_id` | UUID | Foreign key to orders | REFERENCES orders(id) ON DELETE CASCADE |
| `material_type` | VARCHAR | Type of material | NOT NULL |
| `quantity` | INTEGER | Quantity ordered | NOT NULL, CHECK (quantity > 0) |
| `unit_price` | DECIMAL(10,2) | Price per unit | NOT NULL, CHECK (unit_price >= 0) |
| `customization_details` | TEXT | Specific customization requirements | |
| `subtotal` | DECIMAL(10,2) | Calculated subtotal (quantity * unit_price) | |
| `created_at` | TIMESTAMPTZ | Record creation timestamp | DEFAULT now() |

**Functionality**:
- Detailed order composition
- Material-specific pricing
- Customization tracking
- Production planning data

**Material Types**:
- `saree` - Traditional Indian garment
- `dupatta` - Traditional scarf/veil
- `voni` - Ceremonial drape
- `running_material` - Fabric sold by length
- `blouse_material` - Blouse fabric

---

### 5. Material In (`material_in`)
**Purpose**: Tracks incoming materials from customers

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | UUID | Primary key | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `customer_id` | UUID | Foreign key to customers | REFERENCES customers(id) |
| `material_type` | VARCHAR | Type of material received | NOT NULL |
| `quantity` | INTEGER | Quantity received | NOT NULL, CHECK (quantity > 0) |
| `received_date` | DATE | Date material was received | DEFAULT CURRENT_DATE |
| `notes` | TEXT | Additional notes about the material | |
| `created_at` | TIMESTAMPTZ | Record creation timestamp | DEFAULT now() |

**Functionality**:
- Material intake tracking
- Customer material management
- Production input tracking
- Inventory management support

---

### 6. Inventory (`inventory`)
**Purpose**: Manages stock levels and inventory items

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | UUID | Primary key | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `item_name` | VARCHAR | Name of inventory item | NOT NULL |
| `item_type` | VARCHAR | Category of the item | NOT NULL |
| `quantity` | INTEGER | Current stock quantity | NOT NULL, DEFAULT 0 |
| `unit_price` | DECIMAL(10,2) | Price per unit | CHECK (unit_price >= 0) |
| `reorder_level` | INTEGER | Minimum stock level before reorder | DEFAULT 10 |
| `created_at` | TIMESTAMPTZ | Record creation timestamp | DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | Last update timestamp | DEFAULT now() |

**Functionality**:
- Stock level monitoring
- Reorder point management
- Inventory valuation
- Low stock alerts

---

### 7. Delivery Challans (`delivery_challans`)
**Purpose**: Manages delivery documentation

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | UUID | Primary key | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `challan_number` | VARCHAR | Unique challan identifier | UNIQUE, NOT NULL |
| `customer_id` | UUID | Foreign key to customers | REFERENCES customers(id) |
| `order_id` | UUID | Foreign key to orders | REFERENCES orders(id) |
| `delivery_date` | DATE | Planned/actual delivery date | DEFAULT CURRENT_DATE |
| `status` | VARCHAR | Challan status | CHECK IN ('pending', 'delivered', 'returned') |
| `notes` | TEXT | Delivery notes | |
| `created_at` | TIMESTAMPTZ | Record creation timestamp | DEFAULT now() |

**Functionality**:
- Delivery tracking
- Order fulfillment management
- Customer delivery history
- Legal compliance documentation

---

### 8. GST Invoices (`gst_invoices`)
**Purpose**: Manages GST-compliant invoicing

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | UUID | Primary key | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `invoice_number` | VARCHAR | Unique invoice identifier | UNIQUE, NOT NULL |
| `customer_id` | UUID | Foreign key to customers | REFERENCES customers(id) |
| `order_id` | UUID | Foreign key to orders | REFERENCES orders(id) |
| `invoice_date` | DATE | Invoice generation date | DEFAULT CURRENT_DATE |
| `subtotal` | DECIMAL(10,2) | Pre-tax amount | NOT NULL |
| `tax_amount` | DECIMAL(10,2) | GST amount | NOT NULL |
| `total_amount` | DECIMAL(10,2) | Final invoice amount | NOT NULL |
| `status` | VARCHAR | Invoice status | CHECK IN ('draft', 'sent', 'paid', 'overdue') |
| `due_date` | DATE | Payment due date | |
| `notes` | TEXT | Invoice notes | |
| `created_at` | TIMESTAMPTZ | Record creation timestamp | DEFAULT now() |

**Functionality**:
- GST-compliant invoicing
- Tax calculation and tracking
- Payment due monitoring
- Financial compliance

---

### 9. Payments (`payments`)
**Purpose**: Tracks all payment transactions

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | UUID | Primary key | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `invoice_id` | UUID | Foreign key to GST invoices | REFERENCES gst_invoices(id) |
| `customer_id` | UUID | Foreign key to customers | REFERENCES customers(id) |
| `payment_amount` | DECIMAL(10,2) | Amount paid | NOT NULL, CHECK (payment_amount > 0) |
| `payment_date` | DATE | Date of payment | DEFAULT CURRENT_DATE |
| `payment_method` | VARCHAR | Method of payment | CHECK IN ('cash', 'cheque', 'bank_transfer', 'upi', 'card') |
| `reference_number` | VARCHAR | Payment reference/transaction ID | |
| `notes` | TEXT | Payment notes | |
| `created_at` | TIMESTAMPTZ | Record creation timestamp | DEFAULT now() |

**Functionality**:
- Payment tracking
- Cash flow management
- Payment method analysis
- Customer payment history

---

### 10. Return Items (`return_items`)
**Purpose**: Manages product returns and exchanges

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | UUID | Primary key | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `order_id` | UUID | Foreign key to original order | REFERENCES orders(id) |
| `customer_id` | UUID | Foreign key to customers | REFERENCES customers(id) |
| `return_date` | DATE | Date of return | DEFAULT CURRENT_DATE |
| `reason` | VARCHAR | Reason for return | NOT NULL |
| `status` | VARCHAR | Return status | CHECK IN ('pending', 'approved', 'rejected', 'processed') |
| `refund_amount` | DECIMAL(10,2) | Refund amount | |
| `notes` | TEXT | Return notes | |
| `created_at` | TIMESTAMPTZ | Record creation timestamp | DEFAULT now() |

**Functionality**:
- Return/exchange management
- Customer satisfaction tracking
- Refund processing
- Quality control feedback

---

### 11. Expenses (`expenses`)
**Purpose**: Tracks business expenses

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | UUID | Primary key | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `expense_type` | VARCHAR | Category of expense | NOT NULL |
| `amount` | DECIMAL(10,2) | Expense amount | NOT NULL, CHECK (amount > 0) |
| `expense_date` | DATE | Date of expense | DEFAULT CURRENT_DATE |
| `vendor_name` | VARCHAR | Vendor/supplier name | |
| `description` | TEXT | Expense description | |
| `receipt_number` | VARCHAR | Receipt/bill number | |
| `created_at` | TIMESTAMPTZ | Record creation timestamp | DEFAULT now() |

**Functionality**:
- Expense tracking
- Vendor management
- Financial reporting
- Tax documentation

**Expense Types**:
- `materials` - Raw material purchases
- `utilities` - Electricity, water, etc.
- `labor` - Worker wages
- `maintenance` - Equipment maintenance
- `office` - Office supplies
- `transport` - Transportation costs
- `other` - Miscellaneous expenses

---

## Relationships

### Primary Relationships
1. **Customers → Orders**: One-to-Many
   - Each customer can have multiple orders
   - Used for customer order history

2. **Orders → Order Items**: One-to-Many
   - Each order contains multiple items
   - Enables detailed order composition

3. **Customers → Material In**: One-to-Many
   - Track materials received from each customer
   - Material intake management

4. **Orders → Delivery Challans**: One-to-Many
   - Multiple deliveries per order (partial deliveries)
   - Delivery tracking

5. **Orders → GST Invoices**: One-to-Many
   - Multiple invoices per order (partial billing)
   - Flexible billing cycles

6. **GST Invoices → Payments**: One-to-Many
   - Multiple payments per invoice (partial payments)
   - Payment tracking

7. **Orders → Return Items**: One-to-Many
   - Multiple return requests per order
   - Return management

### Cross-References
- **Customers** are referenced by Orders, Material In, Delivery Challans, GST Invoices, Payments, and Return Items
- **Orders** are central to the workflow, connecting most operational tables

---

## Database Functions and Views

### Computed Fields
- **Order Total**: Calculated from order_items.subtotal
- **Invoice Outstanding**: Total amount minus payments received
- **Low Stock Items**: Items where quantity < reorder_level

### Triggers (Recommended)
- **Update Timestamps**: Auto-update `updated_at` columns
- **Order Total Calculation**: Recalculate order total when items change
- **Inventory Updates**: Update stock levels on material movements

---

## Data Flow

### Order Lifecycle
1. **Customer Creation**: New customer added to `customers`
2. **Order Creation**: Order created in `orders` with status 'pending'
3. **Order Items**: Detailed items added to `order_items`
4. **Material Receipt**: Customer materials recorded in `material_in`
5. **Production**: Order status updated to 'in_progress'
6. **Delivery**: Challan created in `delivery_challans`
7. **Invoicing**: GST invoice generated in `gst_invoices`
8. **Payment**: Payment received and recorded in `payments`
9. **Completion**: Order status updated to 'completed'

### Material Flow
1. **Material Receipt**: Recorded in `material_in`
2. **Inventory Update**: Stock levels updated in `inventory`
3. **Production Use**: Materials consumed during production
4. **Low Stock Alerts**: Generated when stock falls below reorder level

### Financial Flow
1. **Order Value**: Calculated from order items
2. **Invoice Generation**: GST invoice created with tax calculations
3. **Payment Receipt**: Payments recorded against invoices
4. **Outstanding Tracking**: Automatic calculation of pending amounts
5. **Expense Recording**: Business expenses tracked separately

---

## Security and Access Control

### Row Level Security (RLS)
- **Users**: Users can only access their own profile
- **All Other Tables**: Access controlled by user role
  - `admin`: Full access to all records
  - `manager`: Read/write access to operational data
  - `operator`: Limited access based on assigned tasks

### API Security
- All API calls authenticated via Supabase auth
- JWT tokens used for session management
- Role-based permissions enforced at database level

---

## Indexes (Recommended)

### Performance Indexes
```sql
-- Customer lookups
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_phone ON customers(phone);

-- Order queries
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_order_date ON orders(order_date);

-- Order items
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- Material tracking
CREATE INDEX idx_material_in_customer_id ON material_in(customer_id);
CREATE INDEX idx_material_in_received_date ON material_in(received_date);

-- Financial queries
CREATE INDEX idx_gst_invoices_customer_id ON gst_invoices(customer_id);
CREATE INDEX idx_gst_invoices_status ON gst_invoices(status);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);
```

---

## Frontend Integration

### API Layer (`services/supabaseApi.ts`)
- **customerApi**: Customer CRUD operations
- **orderApi**: Order and order item management
- **materialInApi**: Material intake tracking
- **inventoryApi**: Inventory management
- **deliveryChallanApi**: Delivery documentation
- **gstInvoiceApi**: GST invoice management
- **paymentApi**: Payment tracking
- **returnItemApi**: Return management
- **expenseApi**: Expense tracking
- **reportsApi**: Reporting and analytics

### Real-time Features
- Order status updates
- Inventory level changes
- Payment notifications
- Low stock alerts

### Data Validation
- Form validation using Yup schemas
- Database constraints ensure data integrity
- Type safety with TypeScript interfaces

---

## Backup and Maintenance

### Automated Backups
- Supabase provides automated daily backups
- Point-in-time recovery available
- Data export capabilities for additional backups

### Data Retention
- All operational data retained indefinitely
- Soft deletes recommended for customer and order data
- Archive strategy for old completed orders

### Performance Monitoring
- Query performance tracking via Supabase dashboard
- Database size monitoring
- Connection pool management

---

This schema provides a comprehensive foundation for textile business management, supporting the full lifecycle from customer orders through production, delivery, invoicing, and payment collection.