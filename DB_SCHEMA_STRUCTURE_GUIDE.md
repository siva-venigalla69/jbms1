# Database Schema Structure Guide
*Digital Textile Printing System - Complete Schema Understanding*

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   DIGITAL TEXTILE PRINTING SYSTEM               │
│                     Database Architecture                       │
└─────────────────────────────────────────────────────────────────┘

🔐 Authentication Layer (Supabase Auth)
├── auth.users (Supabase managed)
└── user_profiles (Business profiles)

📋 Reference Data Layer (5 tables)
├── user_roles          → Role definitions
├── order_statuses      → Order lifecycle states  
├── material_types      → Product categories
├── production_stages   → Manufacturing workflow
└── payment_methods     → Financial options
└── return_reasons      → Quality control categories

🏢 Core Business Layer (8 tables)
├── customers           → Customer master data
├── orders              → Order headers
├── order_items         → Order line details
├── material_in         → Incoming materials
├── delivery_challans   → Shipment documents
├── challan_items       → Delivery line items
├── gst_invoices        → Tax invoices
└── payments            → Payment transactions

📦 Operations Layer (4 tables)  
├── material_out        → Material consumption
├── material_stock      → Current inventory
├── inventory           → General assets
└── expenses            → Business costs

🎨 Designer Layer (3 tables - To be deployed)
├── design_library      → Design templates
├── designer_assignments → Work assignments
└── assignment_history  → Change tracking

🔄 Integration Layer
├── invoice_challans    → Links invoices to deliveries
└── returns             → Product returns
```

## 📊 Table Relationships Map

### Primary Data Flow

```
👤 CUSTOMER JOURNEY:
customers 
    ↓ (1:M)
orders 
    ↓ (1:M) 
order_items
    ↓ (1:1)
designer_assignments → design_library
    ↓
material_out → material_stock
    ↓
delivery_challans → challan_items
    ↓
gst_invoices ← invoice_challans
    ↓
payments

💰 FINANCIAL FLOW:
orders → order_items → gst_invoices → invoice_challans → delivery_challans → payments

🏭 PRODUCTION FLOW:  
material_in → material_stock → order_items → designer_assignments → material_out → delivery_challans

👥 USER FLOW:
auth.users → user_profiles → {customers, orders, assignments} (via created_by/updated_by)
```

## 🔗 Detailed Relationship Matrix

| Table | Primary Relations | Foreign Keys | Business Logic |
|-------|------------------|--------------|----------------|
| **customers** | → orders (1:M)<br/>→ material_in (1:M)<br/>→ delivery_challans (1:M) | user_profiles (created_by) | Customer master record |
| **orders** | ← customers (M:1)<br/>→ order_items (1:M)<br/>→ material_in (1:1?) | customers.id<br/>user_profiles (audit) | Order header with totals |
| **order_items** | ← orders (M:1)<br/>→ designer_assignments (1:1)<br/>→ material_out (1:M?) | orders.id<br/>material_types<br/>production_stages | Detailed order specifications |
| **designer_assignments** | ← order_items (1:1)<br/>← design_library (M:1)<br/>→ assignment_history (1:M) | order_items.id<br/>auth.users (designer)<br/>design_library.id | Work allocation & tracking |
| **material_stock** | ← material_in (effects)<br/>← material_out (effects) | Calculated from transactions | Current inventory levels |
| **delivery_challans** | ← customers (M:1)<br/>→ challan_items (1:M)<br/>→ invoice_challans (1:M) | customers.id | Shipment documentation |
| **gst_invoices** | → invoice_challans (1:M)<br/>→ payments (1:M) | - | Tax invoices |
| **payments** | ← gst_invoices (M:1) | gst_invoices.id<br/>payment_methods | Financial settlements |

## 🎯 Table Categories & Purposes

### 1. 👥 **USER MANAGEMENT**
```sql
-- Authentication & Authorization
auth.users (Supabase)     -- Core auth (email, password)
user_profiles             -- Business profiles & roles
user_roles               -- Role definitions (admin, designer, etc.)
```

### 2. 📋 **REFERENCE DATA** 
```sql
-- Lookup Tables (Read-mostly)
order_statuses           -- pending, in_progress, completed, cancelled
material_types           -- saree, dupatta, voni, etc.  
production_stages        -- pre_treatment, printing, post_process
payment_methods          -- cash, upi, bank_transfer, cheque
return_reasons           -- damaged, defective, wrong_design
```

### 3. 🏢 **CORE BUSINESS**
```sql
-- Customer Relationship
customers                -- Customer master (name, phone, address, GST)

-- Order Management  
orders                   -- Order headers (number, date, status, total)
order_items             -- Order line items (material, quantity, price, customization)

-- Material Flow
material_in             -- Incoming material receipts
material_out            -- Material consumption/usage  
material_stock          -- Current inventory levels
```

### 4. 🎨 **DESIGNER WORKFLOW**
```sql
-- Design Management
design_library          -- Reusable design templates
designer_assignments    -- Work assignments & tracking
assignment_history      -- Change audit trail
```

### 5. 🚚 **FULFILLMENT**
```sql
-- Delivery Management
delivery_challans       -- Shipment documents
challan_items          -- Delivery line items
```

### 6. 💰 **FINANCIAL**
```sql
-- Billing & Payments
gst_invoices           -- Tax invoices  
invoice_challans       -- Invoice-delivery links
payments               -- Payment receipts
expenses               -- Business costs
```

### 7. 🔄 **OPERATIONS**
```sql
-- General Operations
inventory              -- General asset tracking
returns                -- Product returns
```

## 🔑 Key Design Patterns

### 1. **UUID Primary Keys**
```sql
-- All business tables use UUID PKs
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```
**Benefits**: Distributed systems, no collision, better security

### 2. **Audit Trail Pattern**  
```sql
-- Most tables include:
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
created_by_user_id UUID REFERENCES auth.users(id),
updated_by_user_id UUID REFERENCES auth.users(id)
```
**Benefits**: Complete change tracking, compliance ready

### 3. **Soft Delete Pattern**
```sql
-- Important business data uses:
is_deleted BOOLEAN DEFAULT false
```
**Benefits**: Data recovery, audit compliance, referential integrity

### 4. **Enum Constraints**
```sql
-- Strong typing with enums:
CREATE TYPE order_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
status order_status NOT NULL DEFAULT 'pending'
```
**Benefits**: Data consistency, performance, clear business rules

### 5. **Reference Table Pattern**
```sql
-- Standardized lookup structure:
id VARCHAR(50) PRIMARY KEY,        -- Business key
name VARCHAR(255) NOT NULL,        -- Display name  
description TEXT,                  -- Details
is_active BOOLEAN DEFAULT true     -- Enable/disable
```

## 📈 Data Volume Expectations

| Table Category | Expected Growth | Index Strategy |
|----------------|-----------------|----------------|
| **Reference Tables** | Static (5-50 records) | Primary key only |
| **Customers** | Linear (100-10K/year) | Phone, email indexes |
| **Orders** | High (1K-100K/year) | Date, customer, status indexes |
| **Order Items** | Very High (5K-500K/year) | Order, material type indexes |
| **Material Transactions** | High (2K-200K/year) | Date, type, customer indexes |
| **Designer Data** | Medium (500-50K/year) | Designer, status, date indexes |
| **Financial Records** | Medium (1K-100K/year) | Date, amount, customer indexes |

## 🛡️ Security & Access Patterns

### Row Level Security (RLS)
```sql
-- Customers can only see their own data
CREATE POLICY "customers_own_data" ON orders
FOR SELECT USING (
    customer_id IN (
        SELECT id FROM customers 
        WHERE created_by_user_id = auth.uid()
    )
);

-- Designers can see their assignments  
CREATE POLICY "designer_assignments" ON designer_assignments
FOR SELECT USING (
    auth.uid() = designer_id OR 
    auth.jwt() ->> 'role' = 'admin'
);
```

### Access Control Matrix

| Role | Customers | Orders | Design | Financial | Admin |
|------|-----------|--------|--------|-----------|-------|
| **Customer** | Own only | Own only | None | Own invoices | None |
| **Employee** | All | All | None | Read only | None |
| **Designer** | Read | Assigned | All | None | None |
| **Manager** | All | All | All | All | Limited |
| **Admin** | All | All | All | All | All |

## ⚡ Performance Optimization

### Critical Indexes
```sql
-- High-traffic queries
CREATE INDEX idx_orders_customer_date ON orders(customer_id, order_date);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_designer_assignments_status ON designer_assignments(status, expected_delivery_date);
CREATE INDEX idx_material_stock_type ON material_stock(material_type, is_active);
CREATE INDEX idx_payments_invoice ON payments(invoice_id, payment_date);
```

### Query Patterns
```sql
-- Common business queries:

-- Customer order history
SELECT o.*, COUNT(oi.id) as item_count
FROM orders o 
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.customer_id = ? AND o.is_deleted = false
GROUP BY o.id ORDER BY o.order_date DESC;

-- Designer workload
SELECT * FROM designer_workload 
WHERE pending_hours < 40 
ORDER BY pending_hours ASC;

-- Today's priorities  
SELECT * FROM todays_priorities
WHERE urgency_status IN ('overdue', 'due_today')
ORDER BY priority_level, expected_delivery_date;

-- Material stock levels
SELECT mt.name, ms.current_quantity, ms.reserved_quantity
FROM material_stock ms
JOIN material_types mt ON ms.material_type = mt.id
WHERE ms.current_quantity < ms.minimum_threshold;
```

## 🔄 Business Process Flows

### 1. **Order Creation Flow**
```
1. Create customer (if new)        → customers
2. Create order header             → orders  
3. Add order items                 → order_items
4. Auto-assign designer            → designer_assignments
5. Check material availability     → material_stock
6. Reserve materials               → material_out (reserved)
7. Generate order confirmation     → (reports)
```

### 2. **Production Flow**
```
1. Designer starts work            → designer_assignments (status='in_progress')
2. Materials consumed              → material_out (actual usage)
3. Production stages completed     → order_items (stage updates)
4. Quality check passed            → order_items (stage='post_process')  
5. Ready for delivery              → delivery_challans
```

### 3. **Billing Flow**
```
1. Items ready for billing         → delivery_challans
2. Generate GST invoice            → gst_invoices
3. Link invoice to deliveries      → invoice_challans
4. Deliver to customer             → delivery_challans (status='delivered')
5. Receive payment                 → payments
6. Close invoice                   → gst_invoices (status='paid')
```

---

## 🎯 Schema Maturity Assessment

| Aspect | Rating | Comments |
|--------|--------|----------|
| **Normalization** | ⭐⭐⭐⭐⭐ | Excellent 3NF design |
| **Scalability** | ⭐⭐⭐⭐⭐ | UUID PKs, proper indexing |  
| **Security** | ⭐⭐⭐⭐⭐ | RLS, audit trails, constraints |
| **Performance** | ⭐⭐⭐⭐⭐ | Optimized for common queries |
| **Maintainability** | ⭐⭐⭐⭐⭐ | Clear naming, good documentation |
| **Business Fit** | ⭐⭐⭐⭐⭐ | Matches textile printing workflow |

**Overall Schema Grade: A+ (Excellent)**

This schema represents **enterprise-grade database design** suitable for a growing textile printing business with potential for significant scale and complexity.