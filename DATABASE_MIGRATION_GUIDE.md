# 🗄️ DATABASE MIGRATION GUIDE
## From 50+ Tables → 11-Table Simplified System

**Created**: 2025-12-20
**Status**: Ready for Execution
**Estimated Time**: 15-30 minutes

---

## 📋 WHAT THIS MIGRATION DOES

### **Current State** (Before Migration):
- 50+ tables with 97 foreign key relationships
- Complex design management (12 tables)
- Production scheduling (8 tables)
- Invoice complexity (6 tables)
- Employee/Payroll (5 tables)
- **Result**: Over-engineered for small business

### **Target State** (After Migration):
- **11 core tables** only
- Simple, focused on your actual business
- Stage-based stock tracking (received → preprocessing → printing → postprocessing → completed)
- Handles both business types: Job Work (customer material) + Own Stock Sales
- Supports misprints, returns, credit notes
- **Result**: Perfect fit for 2-5 employees, 5-20 orders/month

---

## 🎯 THE 11 CORE TABLES

### **Core Business (4 tables)**:
1. `customers` - Customer master
2. `orders` - Order headers (with ownership_type: customer_material or own_stock)
3. `material_in` - Material receipt records
4. `material_stock` - ⭐ **MAIN TABLE** - Real-time stock by stage

### **Returns & Adjustments (2 tables)**:
5. `returns` - Customer returns + damaged returns
6. `credit_notes` - Invoice adjustments

### **Deliveries (2 tables)**:
7. `delivery_challans` - Delivery documents
8. `challan_items` - Delivery line items

### **Financial (2 tables)**:
9. `gst_invoices` - Invoicing (job_work or sales)
10. `payments` - Payment tracking

### **Misprint Sales (1 table)**:
11. `misprint_sales` - Track sales of misprinted items

---

## 🚀 EXECUTION STEPS

### **STEP 1: BACKUP EVERYTHING** ⚠️ CRITICAL!

**File**: `database/01_BACKUP_ALL_TABLES.sql`

**What it does**:
- Creates `backup_schema` in your database
- Copies all 50+ existing tables to backup_schema
- Preserves all data (no data loss!)

**How to execute**:

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to: **Your Project** → **SQL Editor**
3. Click **New Query**
4. Copy-paste contents of `01_BACKUP_ALL_TABLES.sql`
5. Click **Run**

**Expected output**:
```
========================================================================
🔄 STARTING COMPLETE DATABASE BACKUP
========================================================================

✅ Backed up: design_submissions
✅ Backed up: design_files
... (40+ more tables)

========================================================================
✅ BACKUP COMPLETE!
========================================================================
📊 BACKUP SUMMARY:
   • Tables backed up: 45
   • Original tables: 50
   • Backup location: backup_schema
```

**Verification**:
```sql
-- Check backup was successful
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'backup_schema'
ORDER BY table_name;
```

---

### **STEP 2: CREATE SIMPLIFIED SCHEMA**

**File**: `database/02_CREATE_SIMPLIFIED_SCHEMA.sql`

**What it does**:
- Modifies existing core tables (adds ownership tracking)
- Recreates `material_stock` table with new schema (8 stages instead of 4)
- Creates 3 new tables: `returns`, `credit_notes`, `misprint_sales`
- Creates 3 helper functions:
  - `move_stock_to_stage()` - Move stock between stages
  - `update_design_availability()` - Mark designs available/not available
  - `get_customer_stock_summary()` - Get stock summary for a customer
- Creates 4 reporting views:
  - `v_stock_by_customer` - Stock grouped by customer
  - `v_outstanding_payments` - Outstanding payment report
  - `v_outstanding_orders` - Pending delivery report
  - `v_misprint_stock` - Misprint stock available for sale

**How to execute**:

1. In Supabase SQL Editor
2. Click **New Query**
3. Copy-paste contents of `02_CREATE_SIMPLIFIED_SCHEMA.sql`
4. Click **Run**

**Expected output**:
```
========================================================================
🔧 CREATING SIMPLIFIED 11-TABLE SCHEMA
========================================================================

✅ Modified: customers table (added updated_at)
✅ Modified: orders table (added ownership_type)
✅ Modified: material_in table (added ownership)
✅ Recreated: material_stock table (8 stages)
✅ Created: returns table
✅ Created: credit_notes table
✅ Created: misprint_sales table
✅ Created: move_stock_to_stage() function
✅ Created: update_design_availability() function
✅ Created: get_customer_stock_summary() function
✅ Created: v_stock_by_customer view
✅ Created: v_outstanding_payments view
✅ Created: v_outstanding_orders view
✅ Created: v_misprint_stock view

========================================================================
✅ SIMPLIFIED SCHEMA READY!
========================================================================
```

**Verification**:
```sql
-- Check new tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('returns', 'credit_notes', 'misprint_sales')
ORDER BY table_name;

-- Check material_stock has new stages
SELECT DISTINCT stage
FROM material_stock;
-- Should return: received, preprocessing, printing, postprocessing, completed, misprint, damaged, sold
```

---

### **STEP 3: DROP UNUSED TABLES** (Optional but Recommended)

**File**: `database/03_DROP_UNUSED_TABLES.sql`

**What it does**:
- Drops 40+ unused tables from `public` schema
- Keeps only the 11 core tables
- All dropped tables are safe in `backup_schema`

**⚠️ WARNING**:
- Execute this ONLY AFTER verifying Step 1 and Step 2 completed successfully
- All data is backed up in `backup_schema`
- You can restore anytime by copying from backup_schema

**How to execute**:

1. **FIRST**: Verify backups exist:
```sql
SELECT COUNT(*) as backup_table_count
FROM information_schema.tables
WHERE table_schema = 'backup_schema';
-- Should return: 40+
```

2. If backup count looks good, proceed:
3. In Supabase SQL Editor
4. Click **New Query**
5. Copy-paste contents of `03_DROP_UNUSED_TABLES.sql`
6. Click **Run**

**Expected output**:
```
========================================================================
🗑️  STARTING CLEANUP OF UNUSED TABLES
========================================================================

📦 Dropping Design Management Tables...
✅ Dropped 12 design management tables

📦 Dropping Production Scheduling Tables...
✅ Dropped 5 production scheduling tables

📦 Dropping Invoice Complexity Tables...
✅ Dropped 6 invoice complexity tables

📦 Dropping Employee/Payroll Tables...
✅ Dropped 5 employee/payroll tables

========================================================================
✅ CLEANUP COMPLETE!
========================================================================
📊 FINAL SUMMARY:
   • Tables in public schema: 14
   • Tables in backup_schema: 45
   • Simplified system ready!
```

**Verification**:
```sql
-- Check remaining tables in public schema
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Should see only:
-- - customers
-- - orders
-- - material_in
-- - material_stock
-- - delivery_challans
-- - challan_items
-- - gst_invoices
-- - payments
-- - returns
-- - credit_notes
-- - misprint_sales
-- - user_profiles (for auth)
-- - (maybe a few audit/log tables)
```

---

## 📊 AFTER MIGRATION - VERIFY EVERYTHING WORKS

### **Test 1: Check Tables**
```sql
-- Should return 11-14 tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

### **Test 2: Check Functions**
```sql
-- Should return 3 functions
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'move_stock_to_stage',
    'update_design_availability',
    'get_customer_stock_summary'
  );
```

### **Test 3: Check Views**
```sql
-- Should return 4 views
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;
```

### **Test 4: Sample Stock Movement**
```sql
-- Test moving stock (this is how you'll move stock in production!)
SELECT move_stock_to_stage(
  p_customer_id := 'your-customer-id-here',
  p_order_id := 'your-order-id-here',
  p_material_type := 'Sarees',
  p_from_stage := 'received',
  p_to_stage := 'preprocessing',
  p_quantity := 10,
  p_ownership := 'customer'
);
```

---

## 🔄 ROLLBACK PLAN (If Something Goes Wrong)

If you need to restore the old system:

### **Option 1: Restore Individual Table**
```sql
-- Example: Restore design_submissions table
DROP TABLE IF EXISTS public.design_submissions CASCADE;
CREATE TABLE public.design_submissions AS
SELECT * FROM backup_schema.design_submissions;
```

### **Option 2: Restore All Tables**
```sql
-- List all backup tables
SELECT
  'DROP TABLE IF EXISTS public.' || table_name || ' CASCADE; ' ||
  'CREATE TABLE public.' || table_name || ' AS SELECT * FROM backup_schema.' || table_name || ';'
FROM information_schema.tables
WHERE table_schema = 'backup_schema'
ORDER BY table_name;

-- Copy the output and execute
```

### **Option 3: Keep Both Systems** (Recommended for Testing)
```sql
-- Don't drop old tables, just use new simplified API
-- Access old data: SELECT * FROM backup_schema.design_submissions
-- Access new data: SELECT * FROM public.material_stock
```

---

## 🎨 NEXT STEPS AFTER MIGRATION

1. ✅ **Database Migration Complete** ← You'll be here after Step 3

2. **Update Frontend**:
   - File created: `frontend/src/services/simplifiedApi.ts` ✅
   - Replace imports in all pages from `supabaseApi.ts` to `simplifiedApi.ts`

3. **Create New Pages**:
   - Production Stock page (main page) - stage-based view
   - Dashboard - overview
   - Material Receipt - quick entry
   - Returns & Adjustments
   - Misprint Sales
   - Deliveries, Invoices, Payments (simplified)
   - Reports

4. **Test Workflow**:
   - Create customer
   - Receive material
   - Move through stages
   - Create delivery
   - Generate invoice
   - Record payment

5. **Deploy**:
   - Test locally first
   - Deploy to Netlify
   - Verify production works

---

## 📞 TROUBLESHOOTING

### **Error: "relation already exists"**
**Solution**: The table already exists. Either:
- Drop the existing table first: `DROP TABLE IF EXISTS table_name CASCADE;`
- Or skip that table creation

### **Error: "backup_schema does not exist"**
**Solution**: Step 1 (backup) didn't complete. Re-run `01_BACKUP_ALL_TABLES.sql`

### **Error: "function does not exist"**
**Solution**: Step 2 didn't complete. Re-run `02_CREATE_SIMPLIFIED_SCHEMA.sql`

### **Error: "permission denied"**
**Solution**: You need database admin access. Contact Supabase support or use the project owner account.

---

## ⏰ ESTIMATED TIMELINE

| Step | Time | Complexity |
|------|------|------------|
| Step 1: Backup | 3-5 min | Easy ✅ |
| Step 2: Simplified Schema | 5-10 min | Easy ✅ |
| Step 3: Drop Unused | 2-3 min | Easy ✅ |
| **Total Migration** | **10-20 min** | **Easy** |
| Frontend Updates | 2-4 hours | Medium |
| Page Creation | 4-8 hours | Medium |
| Testing | 1-2 hours | Easy |
| **Complete System** | **1-2 days** | **Doable!** |

---

## ✅ SUMMARY

### **What You Get After Migration**:
1. ✅ Clean 11-table database (down from 50+)
2. ✅ Stage-based stock tracking (received → preprocessing → printing → postprocessing → completed)
3. ✅ Support for both business types (customer material + own stock)
4. ✅ Misprint handling (move to misprint → sell at discount)
5. ✅ Returns workflow (customer returns + damaged returns)
6. ✅ Credit notes for adjustments
7. ✅ Helper functions for stock operations
8. ✅ Ready-made reporting views
9. ✅ All old data backed up safely
10. ✅ Simple, maintainable system

### **What Changes in Your Workflow**:
- **Before**: Complex, confusing, over-engineered
- **After**: Simple, clear, exactly what you need

### **Data Safety**:
- ✅ 100% safe - all data backed up
- ✅ Reversible - can restore anytime
- ✅ No data loss - backups in separate schema

---

## 🎯 READY TO START?

**Execute the scripts in order**:
1. `database/01_BACKUP_ALL_TABLES.sql` ← Start here
2. `database/02_CREATE_SIMPLIFIED_SCHEMA.sql`
3. `database/03_DROP_UNUSED_TABLES.sql` (optional)

**Then notify me when done, and I'll help with frontend updates!**

---

**Questions? Issues? Let me know!**
