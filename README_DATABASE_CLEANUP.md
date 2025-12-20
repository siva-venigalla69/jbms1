# 🗑️ Database Cleanup Instructions - Complete Guide

## 📁 Files Created

I've created **4 executable SQL scripts** for complete database cleanup and optimization:

### 📋 **Script Files:**

1. **`01_BACKUP_DATABASE.sql`** - Backup commands and verification
2. **`02_CLEANUP_ALL_DATA.sql`** - Complete data removal script
3. **`03_VERIFY_CLEANUP.sql`** - Cleanup verification and reporting
4. **`04_OPTIMIZE_DATABASE.sql`** - Database optimization and maintenance

---

## 🚀 **Quick Start - How to Use**

### **Step 1: Backup Database**
```bash
# Run these commands from your terminal/command prompt
# Replace with your actual Supabase connection details

# For Supabase users:
pg_dump -h db.your-project-ref.supabase.co -U postgres -d postgres --no-password > backup_$(date +%Y%m%d_%H%M%S).sql

# Or run the verification queries from 01_BACKUP_DATABASE.sql in your SQL editor
```

### **Step 2: Clean All Data**
```bash
# Run this SQL file in your database editor (Supabase SQL Editor, pgAdmin, etc.)
# Execute: 02_CLEANUP_ALL_DATA.sql
```

### **Step 3: Verify Cleanup**
```bash
# Run this SQL file to verify everything was cleaned properly
# Execute: 03_VERIFY_CLEANUP.sql
```

### **Step 4: Optimize Database (Optional)**
```bash
# Run this SQL file to optimize performance after cleanup
# Execute: 04_OPTIMIZE_DATABASE.sql
```

---

## 🎯 **What Each Script Does**

### 📄 **01_BACKUP_DATABASE.sql**
- 📊 **Database size and status reporting**
- 📋 **Table row counts for backup verification**
- 💾 **pg_dump commands for different backup types**
- ✅ **Pre-cleanup data verification**

### 🗑️ **02_CLEANUP_ALL_DATA.sql**
- 🔄 **Complete transaction-based cleanup**
- 📊 **Before/after status reporting**
- 🗃️ **Phased deletion in dependency order**:
  - Phase 1: Financial data (payments, invoices, challans)
  - Phase 2: Production data (batches, orders)
  - Phase 3: Employee data
  - Phase 4: Customer and base data
- 🔢 **Sequence reset (auto-increment counters)**
- ✅ **Built-in verification**

### 🔍 **03_VERIFY_CLEANUP.sql**
- 📊 **Comprehensive cleanup verification report**
- 📋 **Table-by-table row count check**
- 🎯 **Critical business tables verification**
- 🔢 **Sequence reset confirmation**
- 📈 **Cleanup summary with pass/fail status**
- 💡 **Recommendations for next steps**

### ⚡ **04_OPTIMIZE_DATABASE.sql**
- 🧹 **VACUUM FULL (reclaim disk space)**
- 📊 **ANALYZE (update table statistics)**
- 🔧 **REINDEX (rebuild all indexes)**
- 📏 **Before/after size comparisons**
- 🎯 **Performance health check**
- 💡 **Performance recommendations**

---

## ⚠️ **Important Safety Notes**

### 🚨 **Before Running:**
- ✅ **BACKUP FIRST** - Use `01_BACKUP_DATABASE.sql`
- ✅ **Test Environment Only** - Never run on production without approval
- ✅ **Verify Connection** - Make sure you're connected to the right database
- ✅ **Check Permissions** - Ensure you have DELETE privileges

### 🔒 **What Will Happen:**
- ❌ **ALL TEST DATA DELETED** - Customers, orders, production batches, invoices, payments, employees
- ✅ **SCHEMA PRESERVED** - Table structures, indexes, constraints remain
- ✅ **SEQUENCES RESET** - Auto-increment counters start from 1
- ✅ **DATABASE OPTIMIZED** - Performance tuned for fresh start

---

## 💻 **Execution Methods**

### **Option 1: Supabase SQL Editor**
1. Open Supabase Dashboard → SQL Editor
2. Create new query
3. Copy and paste script contents
4. Click "RUN" button

### **Option 2: Command Line (psql)**
```bash
# Connect to your database
psql -h your_host -U your_user -d your_database

# Run scripts
\i 02_CLEANUP_ALL_DATA.sql
\i 03_VERIFY_CLEANUP.sql
\i 04_OPTIMIZE_DATABASE.sql
```

### **Option 3: Database GUI Tools**
- **pgAdmin**: Open query tool, paste script, execute
- **DBeaver**: New SQL script, paste content, run
- **DataGrip**: New console, execute script

---

## 📊 **Expected Results**

### **After Cleanup:**
```sql
-- All main tables should show 0 rows:
customers: 0 rows
orders: 0 rows
production_batches: 0 rows
employees: 0 rows
payments: 0 rows
gst_invoices: 0 rows
```

### **Verification Output:**
```
✅ CLEANUP SUCCESSFUL
Total Tables: 45
Empty Tables: 45
Tables with Data: 0
Total Rows Remaining: 0
```

---

## 🔧 **Troubleshooting**

### **Common Issues:**

1. **Foreign Key Constraint Errors:**
   ```sql
   -- The scripts handle this with proper dependency order
   -- But if needed, temporarily disable constraints:
   SET CONSTRAINTS ALL DEFERRED;
   ```

2. **Permission Denied:**
   - Connect as database owner or superuser
   - Ensure you have DELETE and ALTER privileges

3. **Table Not Found Errors:**
   - Some tables might not exist in your schema
   - This is normal - the script handles missing tables gracefully

4. **Large Database Performance:**
   - Cleanup might take time on large datasets
   - Consider running during low-traffic periods

---

## ✅ **Success Checklist**

After running all scripts, verify:

- [ ] **Backup created** successfully
- [ ] **All data removed** (verification script shows 0 rows)
- [ ] **Sequences reset** to start values
- [ ] **Database optimized** (VACUUM/ANALYZE completed)
- [ ] **No errors** in script execution
- [ ] **Application tested** with clean database

---

## 🎯 **File Locations**

All scripts are located in your project root:
```
/home/siva/sandboxes/jbms1/
├── 01_BACKUP_DATABASE.sql      ← Backup commands and verification
├── 02_CLEANUP_ALL_DATA.sql     ← Main cleanup script
├── 03_VERIFY_CLEANUP.sql       ← Cleanup verification
├── 04_OPTIMIZE_DATABASE.sql    ← Performance optimization
└── README_DATABASE_CLEANUP.md  ← This instructions file
```

---

## 🎉 **Ready to Clean!**

Your database cleanup scripts are ready to use. Follow the steps in order:

1. **Backup** → 2. **Cleanup** → 3. **Verify** → 4. **Optimize**

After cleanup, your database will be clean, optimized, and ready for fresh data! 🚀

---

*Created: September 16, 2025*
*Purpose: Complete database cleanup for textile manufacturing system*
*Status: Ready for execution*