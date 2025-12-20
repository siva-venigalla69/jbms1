# 🔄 COMPLETE SYSTEM SIMPLIFICATION PLAN
## Database, APIs, and Frontend

**Goal**: Simplify from 50+ tables & 24 pages to 8 tables & 5 pages
**Time**: 2 days
**Approach**: Backup everything, then simplify

---

## 📊 CURRENT STATE ANALYSIS

### **API Services (17 files):**
```
✅ KEEP:
1. supabaseApi.ts           - Core API (customers, orders, payments, etc.)
2. materialStockWorkflowApi.ts - Stock management (NEEDS MODIFICATION)
3. deliveryWorkflowApi.ts   - Delivery management
4. invoiceWorkflowApi.ts    - Invoice management
5. paymentsApi.ts           - Payment tracking

❌ BACKUP & DISABLE:
6. designerApi.ts           - Complex design workflow (not needed)
7. employeeApi.ts           - Employee management (use external)
8. payrollApi.ts            - Payroll (use external)
9. expensesApi.ts           - Expense tracking (optional - disable for now)
10. purchasesApi.ts         - Purchase management (optional)
11. productionBatchApi.ts   - Production batches (not needed with simplified stock)
12. orderWorkflowApi.ts     - Complex workflow (simplify)
13. workflowApi.ts          - Generic workflow (not needed)
14. businessFlowApi.ts      - Business flow (not needed)
15. businessReportsApi.ts   - Advanced reports (create simple ones later)
16. auditTrailService.ts    - Audit logging (overkill for small business)
17. printService.ts         - Printing utilities (keep if used)
```

### **Frontend Pages (24 files):**
```
✅ KEEP & SIMPLIFY:
1. Login.tsx                - Authentication
2. Dashboard.tsx            - Main dashboard (REDESIGN for stock view)
3. Customers.tsx            - Customer management
4. Orders.tsx               - Order entry (SIMPLIFY)
5. StockReconciliation.tsx  - RENAME to "ProductionStock.tsx" (CORE PAGE)
6. DeliveryChallans.tsx     - Delivery management
7. GSTInvoices.tsx          - Invoice management
8. Payments.tsx             - Payment tracking

❌ BACKUP & DISABLE:
9. DesignLibrary.tsx        - Complex design management
10. DesignerDashboard.tsx   - Designer workflow
11. MyAssignments.tsx       - Designer assignments
12. DesignerWorkload.tsx    - Designer workload
13. Employees.tsx           - Employee management
14. Payroll.tsx             - Payroll management
15. Expenses.tsx            - Expense tracking
16. Purchases.tsx           - Purchase management
17. Production.tsx          - Complex production (replace with simple stock view)
18. Inventory.tsx           - Generic inventory (not needed)
19. Materials.tsx           - Materials management (covered by stock)
20. CustomerStock.tsx       - Customer stock (merge into main stock view)
21. Reports.tsx             - Complex reports
22. EnhancedReports.tsx     - Advanced BI reports
23. TransactionHistory.tsx  - Transaction history (optional)
24. OrderTracking.tsx       - Order tracking (optional)
25. APITester.tsx           - Development tool (keep for debugging)
```

### **RESULT: 8 Core Pages (Down from 24)**

---

## 🗂️ BACKUP STRATEGY

### **Step 1: Create Backup Directories**

```bash
mkdir -p backup/database
mkdir -p backup/api_services
mkdir -p backup/frontend_pages
mkdir -p backup/documentation
```

### **Step 2: Backup Database Tables**

```sql
-- File: backup/database/01_BACKUP_ALL_TABLES.sql

-- Backup design management tables
CREATE TABLE backup_design_submissions AS SELECT * FROM design_submissions;
CREATE TABLE backup_design_files AS SELECT * FROM design_files;
CREATE TABLE backup_design_status AS SELECT * FROM design_status;
CREATE TABLE backup_design_status_history AS SELECT * FROM design_status_history;
CREATE TABLE backup_customer_designs AS SELECT * FROM customer_designs;
CREATE TABLE backup_design_library AS SELECT * FROM design_library;
CREATE TABLE backup_material_design_mapping AS SELECT * FROM material_design_mapping;
CREATE TABLE backup_design_printing_queue AS SELECT * FROM design_printing_queue;
CREATE TABLE backup_design_material_requirements AS SELECT * FROM design_material_requirements;
CREATE TABLE backup_designer_assignments AS SELECT * FROM designer_assignments;
CREATE TABLE backup_assignment_history AS SELECT * FROM assignment_history;
CREATE TABLE backup_customer_design_summary AS SELECT * FROM customer_design_summary;

-- Backup production scheduling tables
CREATE TABLE backup_production_schedule AS SELECT * FROM production_schedule;
CREATE TABLE backup_production_dependencies AS SELECT * FROM production_dependencies;
CREATE TABLE backup_production_stage_progress AS SELECT * FROM production_stage_progress;
CREATE TABLE backup_production_batches AS SELECT * FROM production_batches;
CREATE TABLE backup_order_items AS SELECT * FROM order_items;

-- Backup invoice complexity tables
CREATE TABLE backup_invoice_line_items AS SELECT * FROM invoice_line_items;
CREATE TABLE backup_invoice_challans AS SELECT * FROM invoice_challans;
CREATE TABLE backup_invoice_approvals AS SELECT * FROM invoice_approvals;
CREATE TABLE backup_invoice_revisions AS SELECT * FROM invoice_revisions;
CREATE TABLE backup_invoice_templates AS SELECT * FROM invoice_templates;
CREATE TABLE backup_invoice_sources_enhanced AS SELECT * FROM invoice_sources_enhanced;

-- Backup employee/payroll tables
CREATE TABLE backup_employees AS SELECT * FROM employees;
CREATE TABLE backup_salary_payments AS SELECT * FROM salary_payments;
CREATE TABLE backup_expenses AS SELECT * FROM expenses;
CREATE TABLE backup_purchases AS SELECT * FROM purchases;
CREATE TABLE backup_purchase_items AS SELECT * FROM purchase_items;

-- Backup audit/logging tables
CREATE TABLE backup_audit_trail AS SELECT * FROM audit_trail;
CREATE TABLE backup_user_activity_log AS SELECT * FROM user_activity_log;
CREATE TABLE backup_user_notifications AS SELECT * FROM user_notifications;

-- Backup views/summary tables
CREATE TABLE backup_challan_invoice_mapping AS SELECT * FROM challan_invoice_mapping;
CREATE TABLE backup_customer_activity_summary AS SELECT * FROM customer_activity_summary;
CREATE TABLE backup_daily_business_summary AS SELECT * FROM daily_business_summary;
```

### **Step 3: Export Table Definitions**

```sql
-- File: backup/database/02_EXPORT_SCHEMAS.sql

-- Export all table definitions before dropping
pg_dump -h your_host -U your_user -d your_database --schema-only > backup/database/full_schema_backup.sql
```

---

## 🎯 SIMPLIFIED DATABASE DESIGN

### **Core Schema (8 Tables):**

```sql
-- File: database/simplified_schema.sql

-- ============================================================================
-- SIMPLIFIED TEXTILE MANAGEMENT SYSTEM
-- 8 Core Tables for Stage-Based Stock Tracking
-- ============================================================================

-- 1. CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  gst_number VARCHAR(50),
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. ORDERS
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  order_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(50) DEFAULT 'active',
  total_amount DECIMAL(10,2),
  notes TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. MATERIAL_IN (Fabric Receipt)
CREATE TABLE IF NOT EXISTS material_in (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  order_id UUID REFERENCES orders(id),
  material_type VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL,
  received_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. MATERIAL_STOCK (CORE TABLE - Stock by Stage)
CREATE TABLE IF NOT EXISTS material_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  order_id UUID REFERENCES orders(id),
  material_type VARCHAR(50) NOT NULL,
  stage VARCHAR(50) NOT NULL CHECK (stage IN ('received', 'preprocessing', 'printing', 'postprocessing', 'completed')),
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  design_available BOOLEAN DEFAULT FALSE,
  design_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(customer_id, order_id, material_type, stage)
);

COMMENT ON TABLE material_stock IS 'Real-time stock tracking at each production stage';
COMMENT ON COLUMN material_stock.stage IS 'Production stage: received, preprocessing, printing, postprocessing, completed';
COMMENT ON COLUMN material_stock.design_available IS 'Whether designs are available for this stock';

-- 5. DELIVERY_CHALLANS
CREATE TABLE IF NOT EXISTS delivery_challans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challan_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  order_id UUID REFERENCES orders(id),
  challan_date DATE DEFAULT CURRENT_DATE,
  total_quantity INTEGER DEFAULT 0,
  delivery_status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. CHALLAN_ITEMS
CREATE TABLE IF NOT EXISTS challan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challan_id UUID NOT NULL REFERENCES delivery_challans(id) ON DELETE CASCADE,
  material_type VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7. GST_INVOICES
CREATE TABLE IF NOT EXISTS gst_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  order_id UUID REFERENCES orders(id),
  invoice_date DATE DEFAULT CURRENT_DATE,
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  due_date DATE,
  notes TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 8. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  invoice_id UUID REFERENCES gst_invoices(id),
  payment_amount DECIMAL(10,2) NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,
  payment_method VARCHAR(50),
  reference_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 9. USER_PROFILES (Optional - for multi-user)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_material_stock_customer ON material_stock(customer_id);
CREATE INDEX idx_material_stock_stage ON material_stock(stage);
CREATE INDEX idx_material_stock_lookup ON material_stock(customer_id, material_type, stage);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_material_in_customer ON material_in(customer_id);
CREATE INDEX idx_deliveries_customer ON delivery_challans(customer_id);
CREATE INDEX idx_invoices_customer ON gst_invoices(customer_id);
CREATE INDEX idx_payments_customer ON payments(customer_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Get stock summary for a customer
CREATE OR REPLACE FUNCTION get_customer_stock_summary(p_customer_id UUID)
RETURNS TABLE(
  material_type VARCHAR,
  stage VARCHAR,
  quantity INTEGER,
  design_available BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT ms.material_type, ms.stage, ms.quantity, ms.design_available
  FROM material_stock ms
  WHERE ms.customer_id = p_customer_id
    AND ms.quantity > 0
  ORDER BY ms.material_type,
    CASE ms.stage
      WHEN 'received' THEN 1
      WHEN 'preprocessing' THEN 2
      WHEN 'printing' THEN 3
      WHEN 'postprocessing' THEN 4
      WHEN 'completed' THEN 5
    END;
END;
$$ LANGUAGE plpgsql;

-- Function: Move stock between stages
CREATE OR REPLACE FUNCTION move_stock_to_stage(
  p_customer_id UUID,
  p_order_id UUID,
  p_material_type VARCHAR,
  p_from_stage VARCHAR,
  p_to_stage VARCHAR,
  p_quantity INTEGER
) RETURNS VOID AS $$
DECLARE
  v_current_qty INTEGER;
BEGIN
  -- Get current quantity at from_stage
  SELECT quantity INTO v_current_qty
  FROM material_stock
  WHERE customer_id = p_customer_id
    AND order_id = p_order_id
    AND material_type = p_material_type
    AND stage = p_from_stage;

  IF v_current_qty IS NULL OR v_current_qty < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock at % stage. Available: %, Requested: %',
      p_from_stage, COALESCE(v_current_qty, 0), p_quantity;
  END IF;

  -- Reduce from source stage
  UPDATE material_stock
  SET quantity = quantity - p_quantity,
      updated_at = NOW()
  WHERE customer_id = p_customer_id
    AND order_id = p_order_id
    AND material_type = p_material_type
    AND stage = p_from_stage;

  -- Add to destination stage (upsert)
  INSERT INTO material_stock (customer_id, order_id, material_type, stage, quantity)
  VALUES (p_customer_id, p_order_id, p_material_type, p_to_stage, p_quantity)
  ON CONFLICT (customer_id, order_id, material_type, stage)
  DO UPDATE SET
    quantity = material_stock.quantity + p_quantity,
    updated_at = NOW();

  -- Clean up zero quantities
  DELETE FROM material_stock WHERE quantity = 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS FOR REPORTING
-- ============================================================================

-- Stock summary by customer
CREATE OR REPLACE VIEW v_stock_by_customer AS
SELECT
  c.id AS customer_id,
  c.name AS customer_name,
  o.order_number,
  ms.material_type,
  ms.stage,
  ms.quantity,
  ms.design_available,
  ms.design_notes,
  ms.updated_at
FROM material_stock ms
JOIN customers c ON ms.customer_id = c.id
LEFT JOIN orders o ON ms.order_id = o.id
WHERE ms.quantity > 0
ORDER BY c.name, o.order_number, ms.material_type, ms.stage;

-- Total stock by stage
CREATE OR REPLACE VIEW v_stock_by_stage AS
SELECT
  stage,
  material_type,
  SUM(quantity) AS total_quantity,
  COUNT(DISTINCT customer_id) AS customer_count
FROM material_stock
WHERE quantity > 0
GROUP BY stage, material_type
ORDER BY stage, material_type;
```

---

## 🔄 MIGRATION SCRIPT

```sql
-- File: database/EXECUTE_MIGRATION.sql

-- ============================================================================
-- STEP 1: BACKUP EVERYTHING
-- ============================================================================

\echo 'Creating backups...'
\i backup/database/01_BACKUP_ALL_TABLES.sql

-- ============================================================================
-- STEP 2: DROP UNUSED TABLES (After confirming backups exist)
-- ============================================================================

\echo 'Dropping unused tables...'

-- Drop design management tables
DROP TABLE IF EXISTS design_printing_queue CASCADE;
DROP TABLE IF EXISTS material_design_mapping CASCADE;
DROP TABLE IF EXISTS design_material_requirements CASCADE;
DROP TABLE IF EXISTS design_files CASCADE;
DROP TABLE IF EXISTS design_status_history CASCADE;
DROP TABLE IF EXISTS design_status CASCADE;
DROP TABLE IF EXISTS designer_assignments CASCADE;
DROP TABLE IF EXISTS assignment_history CASCADE;
DROP TABLE IF EXISTS customer_design_summary CASCADE;
DROP TABLE IF EXISTS customer_designs CASCADE;
DROP TABLE IF EXISTS design_library CASCADE;
DROP TABLE IF EXISTS design_submissions CASCADE;

-- Drop production scheduling tables
DROP TABLE IF EXISTS production_dependencies CASCADE;
DROP TABLE IF EXISTS production_stage_progress CASCADE;
DROP TABLE IF EXISTS production_schedule CASCADE;
DROP TABLE IF EXISTS production_batches CASCADE;

-- Drop invoice complexity tables
DROP TABLE IF EXISTS invoice_sources_enhanced CASCADE;
DROP TABLE IF EXISTS invoice_revisions CASCADE;
DROP TABLE IF EXISTS invoice_approvals CASCADE;
DROP TABLE IF EXISTS invoice_templates CASCADE;
DROP TABLE IF EXISTS invoice_line_items CASCADE;
DROP TABLE IF EXISTS invoice_challans CASCADE;

-- Drop employee/payroll tables
DROP TABLE IF EXISTS purchase_items CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS salary_payments CASCADE;
DROP TABLE IF EXISTS employees CASCADE;

-- Drop audit/logging tables
DROP TABLE IF EXISTS user_notifications CASCADE;
DROP TABLE IF EXISTS user_activity_log CASCADE;
DROP TABLE IF EXISTS audit_trail CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;

-- Drop views/summary tables
DROP VIEW IF EXISTS challan_invoice_mapping CASCADE;
DROP VIEW IF EXISTS customer_activity_summary CASCADE;
DROP VIEW IF EXISTS daily_business_summary CASCADE;

-- Drop order_items if exists (replaced by material_stock)
-- DROP TABLE IF EXISTS order_items CASCADE;

\echo 'Unused tables dropped successfully!'

-- ============================================================================
-- STEP 3: CREATE SIMPLIFIED SCHEMA
-- ============================================================================

\echo 'Creating simplified schema...'
\i database/simplified_schema.sql

\echo 'Migration complete!'
```

---

## 📝 API SIMPLIFICATION

### **New Simplified API: `simplifiedApi.ts`**

```typescript
// File: frontend/src/services/simplifiedApi.ts

import { supabase } from '../lib/supabase';

// ============================================================================
// SIMPLIFIED API FOR 8-TABLE SYSTEM
// ============================================================================

export const simplifiedApi = {
  // CUSTOMERS
  customers: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('is_deleted', false)
        .order('name');
      if (error) throw error;
      return data;
    },

    create: async (customer: any) => {
      const { data, error } = await supabase
        .from('customers')
        .insert(customer)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    update: async (id: string, customer: any) => {
      const { data, error } = await supabase
        .from('customers')
        .update(customer)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  // ORDERS
  orders: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('is_deleted', false)
        .order('order_date', { ascending: false });
      if (error) throw error;
      return data;
    },

    create: async (order: any) => {
      // Generate order number
      const orderNumber = `SO-${Date.now()}`;

      const { data, error } = await supabase
        .from('orders')
        .insert({
          ...order,
          order_number: orderNumber
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  // MATERIAL RECEIPT
  materialIn: {
    create: async (receipt: {
      customer_id: string;
      order_id: string;
      material_type: string;
      quantity: number;
      notes?: string;
    }) => {
      // Insert receipt
      const { data: receiptData, error: receiptError } = await supabase
        .from('material_in')
        .insert(receipt)
        .select()
        .single();

      if (receiptError) throw receiptError;

      // Add to stock (received stage)
      const { error: stockError } = await supabase
        .from('material_stock')
        .insert({
          customer_id: receipt.customer_id,
          order_id: receipt.order_id,
          material_type: receipt.material_type,
          stage: 'received',
          quantity: receipt.quantity,
          design_available: false
        })
        .select();

      if (stockError) {
        // Try upsert if record exists
        const { error: upsertError } = await supabase
          .from('material_stock')
          .upsert({
            customer_id: receipt.customer_id,
            order_id: receipt.order_id,
            material_type: receipt.material_type,
            stage: 'received',
            quantity: receipt.quantity
          });

        if (upsertError) throw upsertError;
      }

      return receiptData;
    }
  },

  // STOCK MANAGEMENT (CORE)
  stock: {
    getByCustomer: async (customerId: string) => {
      const { data, error } = await supabase
        .from('v_stock_by_customer')
        .select('*')
        .eq('customer_id', customerId);
      if (error) throw error;
      return data;
    },

    getAll: async () => {
      const { data, error } = await supabase
        .from('v_stock_by_customer')
        .select('*');
      if (error) throw error;
      return data;
    },

    moveToStage: async (params: {
      customer_id: string;
      order_id: string;
      material_type: string;
      from_stage: string;
      to_stage: string;
      quantity: number;
    }) => {
      const { error } = await supabase.rpc('move_stock_to_stage', {
        p_customer_id: params.customer_id,
        p_order_id: params.order_id,
        p_material_type: params.material_type,
        p_from_stage: params.from_stage,
        p_to_stage: params.to_stage,
        p_quantity: params.quantity
      });
      if (error) throw error;
    },

    updateDesignStatus: async (params: {
      customer_id: string;
      order_id: string;
      material_type: string;
      stage: string;
      design_available: boolean;
      design_notes?: string;
    }) => {
      const { error } = await supabase
        .from('material_stock')
        .update({
          design_available: params.design_available,
          design_notes: params.design_notes
        })
        .eq('customer_id', params.customer_id)
        .eq('order_id', params.order_id)
        .eq('material_type', params.material_type)
        .eq('stage', params.stage);
      if (error) throw error;
    }
  },

  // DELIVERIES
  deliveries: {
    create: async (challan: any, items: any[]) => {
      // Create challan
      const challanNumber = `DC-${Date.now()}`;
      const { data: challanData, error: challanError } = await supabase
        .from('delivery_challans')
        .insert({
          ...challan,
          challan_number: challanNumber,
          total_quantity: items.reduce((sum, item) => sum + item.quantity, 0)
        })
        .select()
        .single();

      if (challanError) throw challanError;

      // Create items
      const itemsWithChallanId = items.map(item => ({
        ...item,
        challan_id: challanData.id
      }));

      const { error: itemsError } = await supabase
        .from('challan_items')
        .insert(itemsWithChallanId);

      if (itemsError) throw itemsError;

      // Reduce stock from 'completed' stage
      for (const item of items) {
        await supabase.rpc('move_stock_to_stage', {
          p_customer_id: challan.customer_id,
          p_order_id: challan.order_id,
          p_material_type: item.material_type,
          p_from_stage: 'completed',
          p_to_stage: 'delivered', // Could add this stage or just reduce quantity
          p_quantity: item.quantity
        });
      }

      return challanData;
    },

    getAll: async () => {
      const { data, error } = await supabase
        .from('delivery_challans')
        .select(`
          *,
          customer:customers(*),
          items:challan_items(*)
        `)
        .eq('is_deleted', false)
        .order('challan_date', { ascending: false });
      if (error) throw error;
      return data;
    }
  },

  // INVOICES
  invoices: {
    create: async (invoice: any) => {
      const invoiceNumber = `INV-${Date.now()}`;
      const { data, error } = await supabase
        .from('gst_invoices')
        .insert({
          ...invoice,
          invoice_number: invoiceNumber,
          tax_amount: invoice.subtotal * 0.18,
          total_amount: invoice.subtotal * 1.18
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    getAll: async () => {
      const { data, error } = await supabase
        .from('gst_invoices')
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('is_deleted', false)
        .order('invoice_date', { ascending: false });
      if (error) throw error;
      return data;
    }
  },

  // PAYMENTS
  payments: {
    create: async (payment: any) => {
      const { data, error } = await supabase
        .from('payments')
        .insert(payment)
        .select()
        .single();
      if (error) throw error;

      // Update invoice status if payment is for an invoice
      if (payment.invoice_id) {
        await supabase
          .from('gst_invoices')
          .update({ status: 'paid' })
          .eq('id', payment.invoice_id);
      }

      return data;
    },

    getAll: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          customer:customers(*),
          invoice:gst_invoices(*)
        `)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data;
    }
  }
};
```

---

## 🎨 SIMPLIFIED FRONTEND PAGES

### **1. Main Dashboard (Stock Overview)**

Create: `frontend/src/pages/SimpleDashboard.tsx`

See next message for complete React components...

---

## ✅ EXECUTION CHECKLIST

### **Day 1 Morning:**
- [ ] Create backup directories
- [ ] Run database backup script
- [ ] Verify backups created successfully
- [ ] Review simplified schema
- [ ] Apply migration script (test on dev first!)

### **Day 1 Afternoon:**
- [ ] Move old API files to backup/
- [ ] Create simplified API (simplifiedApi.ts)
- [ ] Move old pages to backup/
- [ ] Create SimpleDashboard.tsx

### **Day 2 Morning:**
- [ ] Create ProductionStock.tsx (main page)
- [ ] Create MaterialReceipt.tsx
- [ ] Test stock movement functions

### **Day 2 Afternoon:**
- [ ] Update routing
- [ ] Test end-to-end workflow
- [ ] Document new system

---

**Ready to proceed? Confirm and I'll create the React components next.**
