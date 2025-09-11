# UI to Database Data Flow Documentation
*Digital Textile Printing System - Complete Data Flow Analysis*

## 🔄 System Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   FRONTEND UI   │    │   SUPABASE API   │    │    POSTGRESQL DB    │
│   (React/TS)    │◄──►│   (REST/RPC)     │◄──►│   (24 Tables)       │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
   User Actions            API Endpoints              Database Tables
   - Click buttons         - CRUD operations          - Store data  
   - Fill forms           - Business logic            - Enforce constraints
   - Navigate pages       - Authentication            - Trigger functions
   - View reports         - Authorization             - Maintain relationships
```

## 📱 Page-by-Page Data Flow Analysis

### 1. 🏠 **Dashboard Page** (`/dashboard`)

#### **UI Components → Data Sources**
```
DashboardStats Component:
├── Total Orders      → SELECT COUNT(*) FROM orders WHERE is_deleted = false
├── Pending Orders    → SELECT COUNT(*) FROM orders WHERE status = 'pending'  
├── Active Customers  → SELECT COUNT(DISTINCT customer_id) FROM orders WHERE order_date >= CURRENT_DATE - INTERVAL '30 days'
└── Revenue This Month → SELECT SUM(total_amount) FROM orders WHERE EXTRACT(month FROM order_date) = EXTRACT(month FROM CURRENT_DATE)

RecentOrders Component:
└── Order List → SELECT o.*, c.name as customer_name FROM orders o JOIN customers c ON o.customer_id = c.id ORDER BY created_at DESC LIMIT 10

OverdueAlerts Component:
└── Overdue Items → SELECT * FROM overdue_assignments ORDER BY days_overdue DESC LIMIT 5
```

#### **API Calls**
```typescript
// Dashboard API calls in useEffect
const fetchDashboardData = async () => {
    const { data: orders } = await supabase.from('orders').select('*');
    const { data: customers } = await supabase.from('customers').select('*');
    const { data: overdueItems } = await supabase.rpc('get_overdue_assignments');
};
```

#### **Database Queries Generated**
```sql
-- Dashboard statistics  
SELECT 
    COUNT(CASE WHEN status != 'completed' THEN 1 END) as pending_orders,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
    SUM(total_amount) as total_revenue
FROM orders WHERE is_deleted = false;

-- Recent activity
SELECT o.order_number, o.order_date, c.name, o.total_amount 
FROM orders o 
JOIN customers c ON o.customer_id = c.id 
WHERE o.created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY o.created_at DESC;
```

---

### 2. 👥 **Customers Page** (`/customers`)

#### **UI Data Flow**
```
CustomersList Component:
├── Search Bar      → WHERE name ILIKE '%search%' OR phone ILIKE '%search%'
├── Filter Dropdown → WHERE is_deleted = false/true  
├── Data Table      → SELECT id, name, phone, email, gst_number, created_at FROM customers
└── Pagination      → LIMIT 50 OFFSET (page * 50)

CustomerDialog (Add/Edit):
├── Form Fields     → INSERT/UPDATE customers SET (name, phone, email, address, gst_number)
├── Validation      → CHECK constraints + frontend validation
└── Save Action     → supabaseApi.createCustomer() / updateCustomer()
```

#### **CRUD Operations**
```typescript
// Create customer
const createCustomer = async (customerData) => {
    const { data, error } = await supabase
        .from('customers')
        .insert([{
            name: customerData.name,
            phone: customerData.phone,  
            email: customerData.email,
            address: customerData.address,
            gst_number: customerData.gstNumber,
            created_by_user_id: userId
        }]);
};

// Update customer
const updateCustomer = async (id, customerData) => {
    const { data, error } = await supabase
        .from('customers') 
        .update({
            ...customerData,
            updated_by_user_id: userId,
            updated_at: new Date()
        })
        .eq('id', id);
};

// Delete (soft delete)
const deleteCustomer = async (id) => {
    const { data, error } = await supabase
        .from('customers')
        .update({ is_deleted: true, updated_by_user_id: userId })
        .eq('id', id);
};
```

#### **Database Impact**
```sql
-- List customers (filtered and paginated)
SELECT id, name, phone, email, gst_number, created_at
FROM customers 
WHERE is_deleted = false 
  AND (name ILIKE $1 OR phone ILIKE $1)
ORDER BY created_at DESC 
LIMIT 50 OFFSET $2;

-- Customer creation
INSERT INTO customers (id, name, phone, email, address, gst_number, created_by_user_id)
VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6);

-- Related data cascade
-- When customer created → affects orders, material_in, delivery_challans
```

---

### 3. 📦 **Orders Page** (`/orders`)

#### **Complex UI Data Flow**
```
OrdersList Component:
├── Order Header Data → SELECT o.*, c.name as customer_name FROM orders o JOIN customers c
├── Order Items Count → SELECT COUNT(*) FROM order_items WHERE order_id = ?
├── Status Filter     → WHERE status IN (selected_statuses)
└── Date Range Filter → WHERE order_date BETWEEN start_date AND end_date

OrderDialog (Add/Edit):
├── Customer Dropdown → SELECT id, name FROM customers WHERE is_deleted = false
├── Order Items Table → order_items[] with material_type, quantity, unit_price
├── Material Types    → SELECT * FROM material_types WHERE is_active = true
├── Auto Order Number → SELECT 'ORD-' || LPAD(NEXTVAL('order_number_seq')::text, 6, '0')
└── Total Calculation → Frontend calculation, stored in orders.total_amount
```

#### **Multi-Table Operations**
```typescript
// Create order with items (Transaction)
const createOrder = async (orderData) => {
    const { data: order } = await supabase
        .from('orders')
        .insert([{
            order_number: await generateOrderNumber(),
            customer_id: orderData.customerId,
            total_amount: orderData.totalAmount,
            notes: orderData.notes,
            created_by_user_id: userId
        }])
        .select()
        .single();

    // Create order items
    const orderItems = orderData.items.map(item => ({
        order_id: order.id,
        material_type: item.materialType,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        customization_details: item.customizationDetails
    }));

    const { data: items } = await supabase
        .from('order_items')
        .insert(orderItems)
        .select();

    // Auto-assign designer for each item
    for (const item of items) {
        await designerApi.autoAssignDesigner(
            item.id, 
            calculatePriority(item), 
            estimateHours(item)
        );
    }
};
```

#### **Database Transactions**
```sql
-- Complex order creation transaction
BEGIN;

-- 1. Create order header
INSERT INTO orders (id, order_number, customer_id, total_amount, notes, created_by_user_id)
VALUES (gen_random_uuid(), 'ORD-001234', $1, $2, $3, $4)
RETURNING id;

-- 2. Create order items
INSERT INTO order_items (id, order_id, material_type, quantity, unit_price, customization_details)
VALUES 
    (gen_random_uuid(), $order_id, 'saree', 5, 150.00, 'Red silk with golden border'),
    (gen_random_uuid(), $order_id, 'dupatta', 2, 75.00, 'Matching dupatta');

-- 3. Auto-assign designers
SELECT auto_assign_designer($item_id, 'normal', 2.5);

-- 4. Update material stock reservations  
UPDATE material_stock SET reserved_quantity = reserved_quantity + $quantity
WHERE material_type = $material_type;

COMMIT;
```

---

### 4. 🎨 **Designer Dashboard** (`/designer-dashboard`)

#### **Real-time Data Updates**
```
TodaysPriorities Component:
├── Priority Items → SELECT * FROM todays_priorities WHERE urgency_status IN ('overdue', 'due_today')
├── My Assignments → WHERE designer_id = current_user_id
├── Status Updates → UPDATE designer_assignments SET status = ?, actual_start_time = NOW()
└── Auto-refresh   → useEffect with 30-second interval

OverdueAlerts Component:
├── Critical Items → SELECT * FROM overdue_assignments WHERE days_overdue > 2
├── Alert Counts   → COUNT grouped by severity
└── Real-time Badge → WebSocket or polling updates

WorkloadSummary Component:
├── My Stats → SELECT * FROM designer_workload WHERE designer_id = current_user_id
├── Team Stats → SELECT * FROM designer_workload ORDER BY pending_hours
└── Performance → avg_completion_hours, on_time_deliveries percentage
```

#### **Designer Workflow APIs**
```typescript
// Update assignment status
const updateAssignmentStatus = async (assignmentId, newStatus) => {
    const { data } = await supabase
        .rpc('update_assignment_status', {
            p_assignment_id: assignmentId,
            p_new_status: newStatus,
            p_reason: 'Designer status update'
        });
    
    // This calls the stored function that:
    // 1. Updates designer_assignments table
    // 2. Sets actual_start_time or actual_completion_time  
    // 3. Logs change in assignment_history
    // 4. Updates related order_item production_stage
};

// Get my workload
const getMyWorkload = async () => {
    const { data } = await supabase
        .from('designer_workload')
        .select('*')
        .eq('designer_id', userId)
        .single();
};
```

#### **Complex Views Utilized**
```sql
-- Today's priorities (pre-computed view)
SELECT 
    da.id, da.priority_level, da.expected_delivery_date,
    oi.material_type, oi.quantity, oi.customization_details,
    o.order_number, c.name as customer_name,
    CASE 
        WHEN da.expected_delivery_date < CURRENT_DATE THEN 'overdue'
        WHEN da.expected_delivery_date = CURRENT_DATE THEN 'due_today'
        ELSE 'upcoming'
    END as urgency_status
FROM designer_assignments da
JOIN order_items oi ON da.order_item_id = oi.id  
JOIN orders o ON oi.order_id = o.id
JOIN customers c ON o.customer_id = c.id
WHERE da.designer_id = $user_id AND da.status != 'completed'
ORDER BY urgency_status, da.expected_delivery_date;
```

---

### 5. 📊 **Production Page** (`/production`)

#### **Production Tracking Data Flow**
```
ProductionBoard Component:
├── Stage Columns     → GROUP BY production_stage FROM order_items
├── Item Cards        → SELECT oi.*, o.order_number, c.name FROM order_items oi
├── Drag & Drop       → UPDATE order_items SET production_stage = ?, stage_completed_at = NOW()
├── Designer Info     → JOIN designer_assignments da ON oi.id = da.order_item_id
└── Progress Tracking → Calculate % completion per order

StageStatistics Component:
├── Items per Stage   → COUNT(*) GROUP BY production_stage
├── Average Time      → AVG(stage_completed_at - created_at) per stage
├── Bottleneck Alert  → Stages with high item counts
└── Efficiency Metrics → Completed items per day/week
```

#### **Production Updates**
```typescript
// Move item between production stages
const updateProductionStage = async (itemId, newStage) => {
    // Update order item
    await supabase
        .from('order_items')
        .update({
            production_stage: newStage,
            stage_completed_at: new Date(),
            stage_completed_by: userId,
            updated_at: new Date()
        })
        .eq('id', itemId);

    // Update designer assignment if needed
    if (newStage === 'completed') {
        await supabase
            .rpc('update_assignment_status', {
                p_assignment_id: assignmentId,
                p_new_status: 'completed'
            });
    }

    // Record material consumption
    await supabase
        .from('material_out')
        .insert([{
            order_item_id: itemId,
            material_type: materialType,
            quantity_used: actualQuantityUsed,
            usage_date: new Date()
        }]);
};
```

---

### 6. 💰 **Financial Pages** (`/invoices`, `/payments`)

#### **Invoice Generation Flow**
```
GSTInvoices Component:
├── Invoice List      → SELECT gi.*, c.name FROM gst_invoices gi JOIN customers c
├── Generate Invoice  → Multi-step process involving delivery_challans
├── Tax Calculations  → Frontend calculations based on GST rates
└── Payment Tracking  → JOIN with payments table

InvoiceDialog:
├── Challan Selection → SELECT dc.* FROM delivery_challans dc WHERE status = 'delivered'
├── Item Details      → SELECT ci.* FROM challan_items ci WHERE challan_id IN (selected_challans)
├── Tax Computation   → Calculate CGST, SGST, IGST based on customer location
└── Save Invoice      → INSERT into gst_invoices + invoice_challans linking table
```

#### **Financial Transactions**
```typescript
// Generate GST Invoice
const generateInvoice = async (invoiceData) => {
    // Create invoice header
    const { data: invoice } = await supabase
        .from('gst_invoices')
        .insert([{
            invoice_number: await generateInvoiceNumber(),
            customer_id: invoiceData.customerId,
            invoice_date: new Date(),
            total_amount: invoiceData.totalAmount,
            cgst_amount: invoiceData.cgst,
            sgst_amount: invoiceData.sgst,
            igst_amount: invoiceData.igst,
            created_by_user_id: userId
        }])
        .select()
        .single();

    // Link to delivery challans
    const challanLinks = invoiceData.selectedChallans.map(challanId => ({
        invoice_id: invoice.id,
        challan_id: challanId
    }));

    await supabase
        .from('invoice_challans')
        .insert(challanLinks);

    // Update challan status
    await supabase
        .from('delivery_challans')
        .update({ delivery_status: 'invoiced' })
        .in('id', invoiceData.selectedChallans);
};
```

---

### 7. 📈 **Reports Page** (`/reports`)

#### **Dynamic Report Generation**
```
ReportFilters Component:
├── Date Range Picker → WHERE created_at BETWEEN start_date AND end_date
├── Customer Filter   → WHERE customer_id IN (selected_customers)  
├── Material Filter   → WHERE material_type IN (selected_types)
└── Status Filter     → WHERE status IN (selected_statuses)

ReportCharts Component:
├── Revenue Chart     → SELECT DATE(order_date), SUM(total_amount) GROUP BY DATE(order_date)
├── Material Usage    → SELECT material_type, SUM(quantity) FROM material_out GROUP BY material_type
├── Designer Performance → SELECT designer_id, COUNT(*), AVG(completion_hours) FROM designer_workload
└── Customer Analytics → SELECT customer_id, COUNT(*), SUM(total_amount) GROUP BY customer_id

ExportOptions Component:
├── PDF Generation    → Frontend PDF library using fetched data
├── Excel Export      → Convert JSON data to Excel format
└── CSV Download      → Transform query results to CSV
```

#### **Complex Analytics Queries**
```sql
-- Revenue trend analysis
SELECT 
    DATE_TRUNC('month', order_date) as month,
    COUNT(*) as order_count,
    SUM(total_amount) as revenue,
    AVG(total_amount) as avg_order_value
FROM orders 
WHERE order_date >= $start_date AND order_date <= $end_date
GROUP BY DATE_TRUNC('month', order_date)
ORDER BY month;

-- Designer productivity report
SELECT 
    u.raw_user_meta_data->>'full_name' as designer_name,
    COUNT(da.id) as total_assignments,
    COUNT(CASE WHEN da.status = 'completed' THEN 1 END) as completed_assignments,
    AVG(EXTRACT(EPOCH FROM (da.actual_completion_time - da.actual_start_time))/3600) as avg_hours,
    COUNT(CASE WHEN da.actual_completion_time <= da.expected_delivery_date THEN 1 END) * 100.0 / 
    COUNT(CASE WHEN da.status = 'completed' THEN 1 END) as on_time_percentage
FROM auth.users u
LEFT JOIN designer_assignments da ON u.id = da.designer_id
WHERE u.raw_user_meta_data->>'role' = 'designer'
GROUP BY u.id, u.raw_user_meta_data->>'full_name';
```

---

## 🔄 Real-time Data Synchronization

### **Supabase Realtime Integration**
```typescript
// Real-time subscriptions for live updates
useEffect(() => {
    // Listen for order changes
    const orderSubscription = supabase
        .channel('orders_channel')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'orders' },
            (payload) => {
                console.log('Order change:', payload);
                refreshOrders();
            }
        )
        .subscribe();

    // Listen for assignment changes  
    const assignmentSubscription = supabase
        .channel('assignments_channel')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'designer_assignments' },
            (payload) => {
                console.log('Assignment change:', payload);
                refreshAssignments();
            }
        )
        .subscribe();

    return () => {
        orderSubscription.unsubscribe();
        assignmentSubscription.unsubscribe();
    };
}, []);
```

### **Database Triggers for Auto-Updates**
```sql
-- Auto-update order totals when items change
CREATE OR REPLACE FUNCTION update_order_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE orders 
    SET 
        total_amount = (
            SELECT COALESCE(SUM(quantity * unit_price), 0)
            FROM order_items 
            WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_order_total
AFTER INSERT OR UPDATE OR DELETE ON order_items
FOR EACH ROW EXECUTE FUNCTION update_order_total();
```

---

## 📊 Performance Optimization Strategies

### **Query Optimization**
```typescript
// Efficient data fetching with selective fields
const fetchOrdersOptimized = async () => {
    const { data } = await supabase
        .from('orders')
        .select(`
            id, order_number, order_date, status, total_amount,
            customers:customer_id (name, phone),
            order_items (count)
        `)
        .order('order_date', { ascending: false })
        .range(0, 49);  // Pagination
};

// Use indexes effectively
const searchCustomers = async (searchTerm) => {
    const { data } = await supabase
        .from('customers')
        .select('id, name, phone, email')
        .or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
        .limit(20);
};
```

### **Caching Strategy**
```typescript
// Frontend caching for reference data
const useReferenceData = () => {
    const [materialTypes, setMaterialTypes] = useState([]);
    const [orderStatuses, setOrderStatuses] = useState([]);
    
    useEffect(() => {
        // Cache reference data (changes rarely)
        const cacheKey = 'reference_data_v1';
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
            const data = JSON.parse(cached);
            setMaterialTypes(data.materialTypes);
            setOrderStatuses(data.orderStatuses);
        } else {
            fetchReferenceData().then(data => {
                localStorage.setItem(cacheKey, JSON.stringify(data));
                setMaterialTypes(data.materialTypes);
                setOrderStatuses(data.orderStatuses);
            });
        }
    }, []);
};
```

---

## 🎯 Data Flow Summary

### **High-Level Flow Pattern**
```
1. User Action (UI Event)
    ↓
2. Frontend Validation
    ↓  
3. API Call (Supabase Client)
    ↓
4. Database Transaction
    ↓
5. Business Logic (Functions/Triggers)
    ↓
6. Data Response
    ↓
7. UI State Update
    ↓
8. Real-time Sync (Other Connected Clients)
```

### **Performance Characteristics**
| Operation Type | Response Time | Database Impact | UI Update |
|----------------|---------------|-----------------|-----------|
| **Simple Read** | <100ms | Single table query | Immediate |
| **Complex Read** | 200-500ms | Multi-table joins | Loading state |
| **Simple Write** | <200ms | Single INSERT/UPDATE | Optimistic update |
| **Complex Write** | 500-1000ms | Multi-table transaction | Progress indicator |
| **Report Generation** | 1-3 seconds | Aggregate queries | Async with loading |

This data flow architecture ensures **efficient, scalable, and maintainable** operations between the React frontend and PostgreSQL database through Supabase's optimized API layer.