# Simplified Frontend User Guide
## Digital Textile Printing Management System

**Version**: 1.0
**Date**: 2025-12-21
**Author**: Automated Documentation System

---

## Table of Contents
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Page-by-Page Guide](#page-by-page-guide)
4. [Common Workflows](#common-workflows)
5. [Tips and Best Practices](#tips-and-best-practices)

---

## Introduction

This system is designed to manage the complete workflow of a digital textile printing business, from material receipt to delivery and invoicing. The system uses a simplified 13-table database schema for optimal performance.

### System Features
- **Material Receipt Management** - Track incoming materials (customer & own stock)
- **Production Tracking** - Move materials through production stages
- **Delivery Management** - Create delivery challans
- **Invoice Generation** - Generate GST-compliant invoices
- **Payment Tracking** - Record and track customer payments
- **Returns & Adjustments** - Handle customer returns and misprints
- **Misprint Sales** - Sell misprint materials
- **Real-time Reports** - View stock, payments, and orders

---

## Getting Started

### Login
1. Navigate to the application URL
2. Enter your email and password
3. Click "Login"

### Dashboard Overview
After login, you'll see the **Simplified Dashboard** with:
- **Total Stock** - All materials in the system
- **In Production** - Materials being processed
- **Completed** - Ready for delivery
- **Misprint Stock** - Materials needing attention

---

## Page-by-Page Guide

### 1. Dashboard (`/simplified-dashboard`)

**Purpose**: Overview of the entire system

**Key Metrics**:
- Total Stock count
- Items in production
- Completed items
- Misprint stock

**Financial Overview**:
- Outstanding Payments (total ₹ amount)
- Pending Deliveries

**Production Pipeline**:
- Received → Preprocessing → Printing → Postprocessing → Completed

**Quick Actions**:
- Receive Material
- Manage Production
- Create Delivery
- Generate Invoice

---

### 2. Material Receipt (`/material-receipt`)

**Purpose**: Record incoming materials from customers or purchases

#### How to Create a Material Receipt:

1. **Select Ownership Type**:
   - `Customer Material (Job Work)` - For customer's material
   - `Own Stock` - For company-owned material

2. **For Customer Material**:
   - Select **Customer** from dropdown
   - Optionally link to an **Order**

3. **Enter Material Details**:
   - Select **Material Type** (SAREE, DUPATTA, VONI, etc.)
   - Enter **Quantity**
   - Add optional **Notes**

4. Click **Create Receipt**

**What Happens**:
- Material is added to stock in `Received` stage
- Auto-generated receipt number created
- Stock visible in Production Stock page

**Recent Receipts Table**:
- View all recent material receipts
- Click eye icon to view details

---

### 3. Production Stock (`/production-stock`)

**Purpose**: Manage materials through production stages

#### Stage-Based View:

**Tabs**:
- **All** - All stock
- **Received** - Newly received materials
- **Preprocessing** - In preprocessing
- **Printing** - Being printed
- **Postprocessing** - Post-processing
- **Completed** - Ready for delivery
- **Misprint** - Misprint materials

#### How to Move Stock:

1. Find the material in the table
2. Click the **Move** icon
3. Select **Quantity to Move**
4. Select **Destination Stage**:
   - Preprocessing
   - Printing
   - Postprocessing
   - Completed
   - Misprint
   - Damaged
5. Click **Move Stock**

**What Happens**:
- Material moves from current stage to new stage
- Stock quantity updated automatically
- Database function handles validation

#### How to Update Design Status:

1. Click the **Design** icon
2. Select **Design Availability**:
   - `Design Pending`
   - `Design Ready`
3. Add **Design Notes**
4. Click **Update Design**

**Filters Available**:
- Search by material type or notes
- Filter by material type
- Filter by stage (via tabs)

---

### 4. Deliveries (`/deliveries`)

**Purpose**: Create delivery challans for completed materials

#### How to Create a Delivery Challan:

1. **Select Customer** from dropdown
2. **Select Order** linked to this delivery
3. **Set Delivery Date**
4. **Add Items**:
   - Click "Add Item"
   - Select Material Type
   - Enter Quantity
   - (System shows available completed stock)
5. Add optional **Notes**
6. Click **Create Delivery Challan**

**What Happens**:
- Delivery challan created with auto-generated number
- Stock reduced from `Completed` stage
- Challan items linked to challan
- Challan ready for invoice generation

**Recent Challans Table**:
- View all delivery challans
- Click eye icon to view details with items

---

### 5. Invoices (`/invoices-simplified`)

**Purpose**: Generate GST-compliant invoices

#### How to Create an Invoice:

1. **Select Invoice Type**:
   - `Job Work` - For job work charges
   - `Sales` - For selling own stock

2. **Select Customer**
3. **Select Order**
4. **Set Invoice Date**
5. **Enter Subtotal** (₹)
6. **Set GST Rates**:
   - CGST Rate (default 9%)
   - SGST Rate (default 9%)
   - IGST Rate (default 0%)
   - (System auto-calculates amounts)
7. Add optional **Notes**
8. Click **Create Invoice**

**What Happens**:
- Invoice created with auto-generated number
- GST amounts calculated automatically
- Total amount computed
- Status set to `Unpaid`

**Invoice Details Shown**:
- CGST Amount
- SGST Amount
- IGST Amount
- **Total Amount**

---

### 6. Payments (`/payments-simplified`)

**Purpose**: Record customer payments

#### How to Record a Payment:

1. **Select Customer**
2. **Link to Invoice** (Optional):
   - Select from unpaid invoices
   - Or leave empty for advance payment
3. **Set Payment Date**
4. **Enter Amount** (₹)
5. **Select Payment Method**:
   - Cash
   - UPI
   - Bank Transfer
   - Cheque
   - Online
6. **Add Transaction Reference** (for non-cash)
7. Add optional **Notes**
8. Click **Record Payment**

**What Happens**:
- Payment recorded in system
- Linked to invoice if selected
- Transaction reference stored

---

### 7. Returns (`/returns`)

**Purpose**: Handle customer returns and damaged materials

#### How to Create a Return:

1. **Select Return Type**:
   - `Customer Return (Misprint)` - Customer returned due to misprint
   - `Damaged Return` - Damaged during production

2. **Select Customer** (Optional)
3. **Link to Order** (Optional)
4. **Select Material Type**
5. **Enter Quantity**
6. **Enter Reason** for return
7. **For Customer Returns**: Enter **Adjustment Amount** (₹) if applicable
8. Click **Create Return**

**What Happens**:
- Return recorded in system
- If customer return → Material moved to `Misprint` stock
- If damaged → Material marked as damaged
- Adjustment amount tracked for credit notes

---

### 8. Misprint Sales (`/misprint-sales`)

**Purpose**: Sell misprint materials at discounted prices

**Misprint Stock Summary**:
- View available misprint stock by material type

#### How to Create a Misprint Sale:

1. **Select Material Type**
   - System shows available quantity
2. **Enter Quantity** (≤ available)
3. **Enter Unit Price** (₹)
   - System shows total amount
4. **Enter Customer Name** (Optional)
5. Add optional **Notes**
6. Click **Create Sale**

**What Happens**:
- Sale recorded with auto-generated sale number
- Misprint stock reduced
- Total amount calculated

---

### 9. Reports (`/reports-simplified`)

**Purpose**: View comprehensive business reports

#### Report Types:

**1. Stock by Customer**
- Shows stock distribution by customer
- Breakdown by material type
- Stage-wise quantities (Received, Preprocessing, Printing, etc.)
- Total stock per customer

**2. Outstanding Payments**
- Customers with unpaid invoices
- Total invoiced amount
- Total paid amount
- Outstanding balance
- Number of unpaid invoices

**3. Outstanding Orders**
- Orders with pending deliveries
- Total quantity ordered
- Delivered quantity
- Pending quantity
- Filterable by customer

**4. Misprint Stock**
- All materials in misprint stage
- Grouped by material type
- Ownership information
- Design notes

**How to Use**:
1. Click on the tab for desired report
2. Data loads automatically
3. Scroll through the table
4. Use for business decisions

---

## Common Workflows

### Workflow 1: Job Work Order (Customer Material)

**Scenario**: Customer brings material for printing

1. **Material Receipt** (`/material-receipt`)
   - Select `Customer Material`
   - Choose customer
   - Enter material details
   - Create receipt
   - ✓ Material in `Received` stage

2. **Production** (`/production-stock`)
   - Update design status when ready
   - Move to `Preprocessing`
   - Move to `Printing`
   - Move to `Postprocessing`
   - Move to `Completed`
   - ✓ Material ready for delivery

3. **Delivery** (`/deliveries`)
   - Select customer and order
   - Add completed items
   - Create challan
   - ✓ Challan created

4. **Invoice** (`/invoices-simplified`)
   - Select customer and order
   - Enter job work charges
   - Set GST rates
   - Create invoice
   - ✓ Invoice generated

5. **Payment** (`/payments-simplified`)
   - Select customer
   - Link to invoice
   - Record payment
   - ✓ Payment recorded

---

### Workflow 2: Handling Misprints

**Scenario**: Customer returns misprint materials

1. **Returns** (`/returns`)
   - Select `Customer Return (Misprint)`
   - Choose customer and order
   - Enter quantity and reason
   - Add adjustment amount if giving credit
   - Create return
   - ✓ Material moved to misprint stock

2. **Misprint Sales** (`/misprint-sales`)
   - Check available misprint stock
   - Select material type
   - Set discounted price
   - Record sale
   - ✓ Misprint stock cleared

---

### Workflow 3: Own Stock Sales

**Scenario**: Selling company-owned material

1. **Material Receipt** (`/material-receipt`)
   - Select `Own Stock`
   - Enter material details and quantity
   - Create receipt
   - ✓ Own stock added

2. **Production** (`/production-stock`)
   - Process through stages as needed
   - Move to completed

3. **Delivery & Invoice** (Same as job work)
   - Create delivery challan
   - Generate invoice (type: Sales)
   - Record payment

---

## Tips and Best Practices

### Data Entry
1. **Always link to orders** when possible for better tracking
2. **Add notes** for important information
3. **Verify quantities** before submitting
4. **Check available stock** before creating deliveries

### Production Management
1. **Update design status** immediately when designs arrive
2. **Move stock progressively** through stages (don't skip)
3. **Use filters** to find specific materials quickly
4. **Monitor misprint stock** regularly

### Financial Management
1. **Create invoices promptly** after deliveries
2. **Record payments** immediately when received
3. **Link payments to invoices** for accurate tracking
4. **Check outstanding reports** weekly

### Reports
1. **Review outstanding payments** daily
2. **Check pending orders** regularly
3. **Monitor stock levels** by customer
4. **Track misprint trends** for quality control

### Error Prevention
1. **Double-check customer selection** before creating records
2. **Verify material types** match actual materials
3. **Ensure quantities are realistic**
4. **Use transaction references** for all digital payments

---

## Keyboard Shortcuts

- **Refresh Button**: Available on all pages for latest data
- **Tab Navigation**: Use Tab key to move between form fields
- **Enter Key**: Submits forms (when focused on submit button)

---

## Support and Troubleshooting

### Common Issues

**Problem**: Cannot create delivery
**Solution**: Ensure material is in `Completed` stage first

**Problem**: No orders show for customer
**Solution**: Create order first or select different customer

**Problem**: Invoice calculation incorrect
**Solution**: Verify GST rates entered correctly

**Problem**: Stock not appearing
**Solution**: Click Refresh button or check filters

### Getting Help
- Check this user guide
- Refer to manual testing steps document
- Contact system administrator

---

## Glossary

- **Job Work**: Processing customer's own material
- **Own Stock**: Company-owned material for sale
- **Challan**: Delivery document
- **GST**: Goods and Services Tax
- **Misprint**: Printing defect/error
- **RLS**: Row Level Security (database feature)
- **Material Type**: Category of textile (SAREE, DUPATTA, etc.)

---

**End of User Guide**
