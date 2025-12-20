# 📋 QUICK REFERENCE: All Tables & APIs

## 🗄️ DATABASE TABLES (22 Total)

| # | Table Name | Purpose | Essential? | Records |
|---|------------|---------|-----------|---------|
| 1 | **customers** | Customer master data | ✅ YES | 0 |
| 2 | **orders** | Order header records | ✅ YES | 0 |
| 3 | **order_items** | Order line items with production tracking | ✅ YES | 0 |
| 4 | **production_batches** | Production batch tracking | 🟡 Optional | 0 |
| 5 | **material_in** | Material receipt records | ✅ YES | 0 |
| 6 | **material_out** | Material consumption records | 🟡 Optional | 0 |
| 7 | **material_stock** | Real-time stock balances | ✅ YES | 0 |
| 8 | **delivery_challans** | Delivery documentation | ✅ YES | 0 |
| 9 | **challan_items** | Delivery challan line items | ✅ YES | 0 |
| 10 | **gst_invoices** | GST-compliant invoices | ✅ YES | 0 |
| 11 | **invoice_challans** | Invoice-challan mapping | 🟡 Optional | 0 |
| 12 | **payments** | Payment records | ✅ YES | 0 |
| 13 | **employees** | Employee master | 🟡 Optional | 3 |
| 14 | **salary_payments** | Payroll records | 🔴 Skip | 1 |
| 15 | **expenses** | Business expenses | 🟡 Optional | 1 |
| 16 | **purchases** | Purchase orders | 🟡 Optional | 1 |
| 17 | **purchase_items** | Purchase line items | 🟡 Optional | 0 |
| 18 | **design_library** | Reusable designs | 🟡 Optional | 5 |
| 19 | **customer_designs** | Customer-specific designs | 🟡 Optional | 0 |
| 20 | **design_assignments** | Design workflow | 🔴 Skip | 0 |
| 21 | **user_profiles** | System users | ✅ YES | 0 |
| 22 | **inventory** | Generic inventory | 🟡 Optional | 0 |

### Legend:
- ✅ **Essential** - Core business operations
- 🟡 **Optional** - Use if needed
- 🔴 **Skip** - Overkill for small business

---

## 🌐 API ENDPOINTS (40+ Total)

### Authentication (4 endpoints)
```
POST   /api/auth/login
POST   /api/auth/register
GET    /api/auth/me
GET    /api/auth/users
```

### Customers (5 endpoints)
```
GET    /api/customers
GET    /api/customers/{id}
POST   /api/customers
PUT    /api/customers/{id}
DELETE /api/customers/{id}
```

### Orders (5 endpoints)
```
GET    /api/orders
GET    /api/orders/{id}
POST   /api/orders
PUT    /api/orders/{id}
GET    /api/orders/workflow
```

### Production (4 endpoints)
```
GET    /api/production/status
POST   /api/production/update-stage
GET    /api/production/queue
GET    /api/production/workload
```

### Material Stock (5 endpoints)
```
GET    /api/material-stock
POST   /api/material-stock/receive
POST   /api/material-stock/deliver
POST   /api/material-stock/transfer
POST   /api/material-stock/reconcile
```

### Delivery Management (4 endpoints)
```
GET    /api/delivery/challans
POST   /api/delivery/create
GET    /api/delivery/track
GET    /api/delivery/items-ready
```

### Invoices & Payments (6 endpoints)
```
GET    /api/invoices/gst
POST   /api/invoices/from-challans
GET    /api/payments
POST   /api/payments
GET    /api/invoices/outstanding
GET    /api/invoices/overdue
```

### Business Reports (10+ endpoints)
```
GET    /api/reports/dashboard
GET    /api/reports/sales-performance
GET    /api/reports/customer-analysis
GET    /api/reports/production-efficiency
GET    /api/reports/financial-summary
GET    /api/reports/stock-comprehensive
GET    /api/reports/stock-movement
GET    /api/intelligence/customer-profitability
GET    /api/intelligence/production-bottlenecks
GET    /api/intelligence/material-waste
```

---

## 🔑 KEY BUSINESS WORKFLOWS

### 1. Order Processing Flow
```
Customer Request → Create Order → Add Order Items
→ Set design_status (pending/received/ready)
→ Set production_status (pending/pre_treatment/printing/post_process/completed)
```

### 2. Material Management Flow
```
Customer Brings Fabric → Record Material In → Update Stock
→ Production Consumes → Material Out → Update Stock
→ Delivery to Customer → Reduce Stock
```

### 3. Production Workflow (THE CORE)
```
Order Item Created (design: pending, production: pending)
     ↓
Pre-treatment Started (design: can be anything, production: pre_treatment)
     ↓
Design Approved (design: ready, production: pre_treatment)
     ↓
Printing Started (REQUIRES both design: ready AND production: pre_treatment)
     ↓
Post-Processing → Completed
```

### 4. Delivery & Invoicing Flow
```
Production Complete → Create Delivery Challan → Deliver
→ Generate GST Invoice → Record Payment → Reconcile
```

---

## 🎯 RECOMMENDED MINIMAL SETUP

### Phase 1: Core Operations (Start Here)
```
✅ Use: customers, orders, order_items
✅ Use: material_in, material_stock
✅ Use: delivery_challans, challan_items
✅ Use: gst_invoices, payments
❌ Skip: Everything else
```

### Phase 2: Add as Needed (Month 2-3)
```
🟡 design_library - If you have standard designs
🟡 expenses - If you want P&L tracking
🟡 employees - If you hire people
```

### Never Use (Unless You Scale Big)
```
🔴 production_batches - order_items is sufficient
🔴 salary_payments - Use external payroll
🔴 design_assignments - Only if you have design team
```

---

## 💡 EXCEL vs THIS SYSTEM

### What Excel is Good At:
- ✅ Quick setup
- ✅ Familiar interface
- ✅ Free

### What Excel is Bad At:
- ❌ Data integrity (easy to break formulas)
- ❌ Multi-user access (file locking)
- ❌ Scalability (crashes with large data)
- ❌ Automation (manual everything)
- ❌ Relationships (hard to link customers → orders → items → stock)

### What This System Excels At:
- ✅ Data integrity (database constraints)
- ✅ Multi-user (everyone can work simultaneously)
- ✅ Scalability (handles thousands of records)
- ✅ Automation (auto-calculate stock, auto-generate invoices)
- ✅ Relationships (everything linked properly)
- ✅ Audit trail (know who changed what when)
- ✅ Real-time status (see production status live)

---

## 🚦 DECISION MATRIX

### Use Excel If:
- [ ] You process < 3 orders per month
- [ ] You're a one-person hobby business
- [ ] You don't plan to grow
- [ ] You're comfortable with manual work

### Use This System If:
- [x] You process 5+ orders per month
- [x] You have 3+ regular customers
- [x] You plan to grow
- [x] You want to save time
- [x] You want professional operations
- [x] You want to avoid disputes (material tracking)
- [x] You need GST compliance

---

## 📊 TIME SAVINGS ESTIMATE

### With Excel (Monthly):
- Order tracking: 5 hours
- Stock reconciliation: 8 hours
- Invoice generation: 4 hours
- Payment tracking: 3 hours
- **Total: 20 hours/month**

### With This System (Monthly):
- Order tracking: 1 hour
- Stock reconciliation: 1 hour (auto-calculated)
- Invoice generation: 0.5 hours (auto-generated)
- Payment tracking: 0.5 hours
- **Total: 3 hours/month**

### Savings:
- **17 hours/month saved**
- **204 hours/year saved**
- **At ₹500/hour value = ₹102,000/year saved**

---

## ✅ MY RECOMMENDATION

**Don't restart. Don't switch to Excel. Use this system selectively.**

1. **Week 1**: Start using customers, orders, order_items
2. **Week 2**: Add material_in, material_stock
3. **Week 3**: Add delivery_challans, gst_invoices
4. **Week 4**: Add payments

**Ignore everything else until you need it.**

**You'll know if it's working within 1 month.**

---

*Created: 2025-12-20*
*System Status: Production-Ready ✅*
