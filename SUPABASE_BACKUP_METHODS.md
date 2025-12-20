# 💾 Supabase Backup Methods - Complete Guide

## 🎯 **Two Main Backup Approaches**

### **Method 1: SQL Editor Backup (Limited but Easy)**
### **Method 2: Direct Database Access (Full Backup)**

---

## 📝 **METHOD 1: Backup from Supabase SQL Editor**

### ✅ **What You CAN Do in SQL Editor:**

#### **1. Export Table Data as SQL INSERT Statements**

```sql
-- Copy and run this in Supabase SQL Editor to generate backup SQL

-- Generate INSERT statements for customers table
SELECT 'INSERT INTO customers (id, name, phone, email, address, gst_number, created_at, updated_at) VALUES ' ||
       string_agg(
         '(' || quote_literal(id::text) || ', ' ||
             quote_literal(name) || ', ' ||
             quote_literal(phone) || ', ' ||
             quote_literal(email) || ', ' ||
             quote_literal(address) || ', ' ||
             quote_literal(gst_number) || ', ' ||
             quote_literal(created_at::text) || ', ' ||
             quote_literal(updated_at::text) || ')',
         ', '
       ) || ';'
FROM customers
WHERE created_at IS NOT NULL;

-- Generate INSERT statements for orders table
SELECT 'INSERT INTO orders (id, order_number, customer_id, order_date, delivery_date, total_amount, status, created_at, updated_at) VALUES ' ||
       string_agg(
         '(' || quote_literal(id::text) || ', ' ||
             quote_literal(order_number) || ', ' ||
             quote_literal(customer_id::text) || ', ' ||
             quote_literal(order_date::text) || ', ' ||
             quote_literal(delivery_date::text) || ', ' ||
             quote_literal(total_amount::text) || ', ' ||
             quote_literal(status) || ', ' ||
             quote_literal(created_at::text) || ', ' ||
             quote_literal(updated_at::text) || ')',
         ', '
       ) || ';'
FROM orders
WHERE created_at IS NOT NULL;

-- Repeat for other important tables:
-- production_batches, payments, gst_invoices, delivery_challans, employees
```

#### **2. Export Individual Table Data as CSV**

```sql
-- Get all customers data (copy results to CSV)
SELECT * FROM customers ORDER BY created_at;

-- Get all orders data
SELECT * FROM orders ORDER BY created_at;

-- Get all production batches
SELECT * FROM production_batches ORDER BY created_at;

-- Get all payments
SELECT * FROM payments ORDER BY created_at;

-- Get all invoices
SELECT * FROM gst_invoices ORDER BY created_at;
```

#### **3. Create Table Schema Backup**

```sql
-- Get table creation statements
SELECT
    'CREATE TABLE ' || table_name || ' (' ||
    string_agg(
        column_name || ' ' || data_type ||
        CASE
            WHEN character_maximum_length IS NOT NULL
            THEN '(' || character_maximum_length || ')'
            ELSE ''
        END ||
        CASE
            WHEN is_nullable = 'NO' THEN ' NOT NULL'
            ELSE ''
        END,
        ', '
    ) || ');' as create_statement
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name IN ('customers', 'orders', 'production_batches', 'payments', 'gst_invoices')
GROUP BY table_name
ORDER BY table_name;
```

### ❌ **Limitations of SQL Editor Method:**
- **No automatic file download**
- **Manual copy-paste required**
- **Limited to visible query results**
- **No schema structure backup**
- **Time-consuming for large datasets**

---

## 🔐 **METHOD 2: Get Database Password & Use pg_dump (RECOMMENDED)**

### **Step 1: Get Database Password from Supabase Dashboard**

#### **🔍 Finding Your Database Password:**

1. **Login to Supabase Dashboard:**
   - Go to https://supabase.com/dashboard
   - Login with your account
   - Select your project: `pvatfzwzfgioypdnqjay`

2. **Navigate to Database Settings:**
   ```
   Dashboard → Settings (gear icon) → Database
   ```

3. **Find Connection Info:**
   - Look for **"Connection info"** section
   - OR look for **"Connection pooling"** section
   - OR look for **"Direct connection"** section

4. **Locate Database Password:**
   - You'll see connection details like:
   ```
   Host: db.pvatfzwzfgioypdnqjay.supabase.co
   Database name: postgres
   Port: 5432
   User: postgres
   Password: [HIDDEN] 👁️ (click eye icon to reveal)
   ```

5. **Reveal and Copy Password:**
   - Click the **eye icon (👁️)** next to password field
   - Copy the revealed password (long string starting with special characters)

### **Step 2: Alternative - Reset Database Password**

If you can't find the password:

1. **In Database Settings:**
   - Look for **"Reset database password"** button
   - Click it to generate a new password
   - **⚠️ WARNING:** This will invalidate any existing connections

2. **Generate New Password:**
   - Supabase will generate a new secure password
   - Copy and save it immediately
   - Update your applications if needed

### **Step 3: Use pg_dump with Database Password**

Once you have the password:

```bash
# Set your database password as environment variable (SECURE)
export PGPASSWORD="your_actual_database_password_here"

# Create full backup
pg_dump -h db.pvatfzwzfgioypdnqjay.supabase.co \
        -p 5432 \
        -U postgres \
        -d postgres \
        --format=custom \
        --verbose \
        --file=backup_full_$(date +%Y%m%d_%H%M%S).backup

# Create SQL format backup (human readable)
pg_dump -h db.pvatfzwzfgioypdnqjay.supabase.co \
        -p 5432 \
        -U postgres \
        -d postgres \
        --format=plain \
        --verbose \
        --file=backup_sql_$(date +%Y%m%d_%H%M%S).sql
```

---

## 🔄 **METHOD 3: Hybrid Approach (Best of Both)**

### **Use SQL Editor for Quick Data Exports + pg_dump for Full Backups**

#### **For Quick Data Checks (SQL Editor):**
```sql
-- Quick table counts verification
SELECT 'customers' as table_name, COUNT(*) as row_count FROM customers
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'production_batches', COUNT(*) FROM production_batches
UNION ALL SELECT 'payments', COUNT(*) FROM payments;

-- Export specific data ranges
SELECT * FROM orders
WHERE order_date >= '2024-01-01'
ORDER BY order_date DESC;
```

#### **For Complete Backups (pg_dump):**
```bash
# Weekly full backup
pg_dump -h db.pvatfzwzfgioypdnqjay.supabase.co -U postgres -d postgres \
    --format=custom --file=weekly_backup_$(date +%Y%m%d).backup

# Daily data-only backup
pg_dump -h db.pvatfzwzfgioypdnqjay.supabase.co -U postgres -d postgres \
    --data-only --format=custom --file=daily_data_$(date +%Y%m%d).backup
```

---

## 🎯 **Step-by-Step Backup Process**

### **📋 QUICK START CHECKLIST:**

#### **Phase 1: Get Database Access**
- [ ] Login to Supabase Dashboard
- [ ] Go to Settings → Database
- [ ] Find and copy database password
- [ ] Test connection with psql

#### **Phase 2: Create Backup**
- [ ] Set PGPASSWORD environment variable
- [ ] Run pg_dump command
- [ ] Verify backup file was created
- [ ] Test backup by listing contents

#### **Phase 3: Verify Backup**
- [ ] Check backup file size
- [ ] List backup contents
- [ ] Test restore on development database

### **🔧 Detailed Steps:**

```bash
# 1. Set database password (replace with your actual password)
export PGPASSWORD="your_database_password_from_supabase"

# 2. Test connection
psql -h db.pvatfzwzfgioypdnqjay.supabase.co -U postgres -d postgres -c "SELECT NOW();"

# 3. Create backup directory
mkdir -p ~/supabase_backups
cd ~/supabase_backups

# 4. Create full backup
pg_dump -h db.pvatfzwzfgioypdnqjay.supabase.co \
        -U postgres \
        -d postgres \
        --format=custom \
        --verbose \
        --file=backup_$(date +%Y%m%d_%H%M%S).backup

# 5. Verify backup
pg_restore --list backup_$(date +%Y%m%d_%H%M%S).backup | head -20

# 6. Check backup file size
ls -lh backup_*.backup
```

---

## 🚨 **Troubleshooting Common Issues**

### **Problem 1: Can't Find Database Password**
**Solution:**
1. Check Settings → Database → Connection info
2. Look for "Direct connection" section
3. Try resetting database password
4. Check project API keys (service_role key might work)

### **Problem 2: Connection Refused**
**Solution:**
```bash
# Verify connection details
psql -h db.pvatfzwzfgioypdnqjay.supabase.co -p 5432 -U postgres -d postgres -c "SELECT version();"

# Check if pg_dump is installed
pg_dump --version

# Try with different port or connection string
```

### **Problem 3: Permission Denied**
**Solution:**
- Make sure you're using the correct database password
- Try using service_role key as password
- Check if your IP is allowed (Supabase usually allows all IPs)

### **Problem 4: Backup Too Large**
**Solution:**
```bash
# Use compressed backup
pg_dump --format=custom --compress=9 --file=backup_compressed.backup

# Or backup specific tables only
pg_dump --table=customers --table=orders --file=backup_essential.backup
```

---

## 💡 **Recommendations**

### **For Development/Testing:**
- Use **SQL Editor** for quick data exports
- Use **pg_dump** for complete backups

### **For Production:**
- Always use **pg_dump** for full backups
- Set up automated backup scripts
- Store backups in multiple locations

### **Backup Schedule:**
- **Daily:** Data-only backup
- **Weekly:** Full backup with schema
- **Monthly:** Archive backup to external storage

---

## 🎯 **Final Scripts for Your Use**

### **Quick Backup Script:**
```bash
#!/bin/bash
# Save as: backup_supabase.sh

export PGPASSWORD="your_password_here"
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR

echo "Creating Supabase backup..."
pg_dump -h db.pvatfzwzfgioypdnqjay.supabase.co \
        -U postgres \
        -d postgres \
        --format=custom \
        --file=$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).backup

echo "Backup completed: $BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).backup"
```

### **SQL Editor Restore Queries (For Option 1):**

#### **Step 1: Clear existing data (if restoring)**
```sql
-- Clear data in proper order (respect foreign key constraints)
DELETE FROM delivery_challans;
DELETE FROM gst_invoices;
DELETE FROM payments;
DELETE FROM production_batches;
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM material_stock;
DELETE FROM inventory;
DELETE FROM expenses;
DELETE FROM employees;
DELETE FROM customers;

-- Reset sequences (optional)
SELECT setval('customers_id_seq', 1, false);
SELECT setval('orders_id_seq', 1, false);
SELECT setval('production_batches_id_seq', 1, false);
SELECT setval('payments_id_seq', 1, false);
SELECT setval('gst_invoices_id_seq', 1, false);
```

#### **Step 2: Restore data using generated INSERT statements**
```sql
-- Paste the INSERT statements generated from backup queries
-- Example (replace with your actual generated INSERT statements):

INSERT INTO customers (id, name, phone, email, address, gst_number, created_at, updated_at) VALUES
('1', 'Customer Name', '+91 9876543210', 'customer@email.com', 'Address', 'GST123', '2024-01-01 10:00:00', '2024-01-01 10:00:00');

INSERT INTO orders (id, order_number, customer_id, order_date, delivery_date, total_amount, status, created_at, updated_at) VALUES
('1', 'ORD001', '1', '2024-01-01', '2024-01-05', '1000.00', 'pending', '2024-01-01 10:00:00', '2024-01-01 10:00:00');

-- Continue with other tables...
```

#### **Step 3: Verify restore**
```sql
-- Check data counts after restore
SELECT 'customers' as table_name, COUNT(*) as rows FROM customers
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'production_batches', COUNT(*) FROM production_batches
UNION ALL SELECT 'payments', COUNT(*) FROM payments
UNION ALL SELECT 'gst_invoices', COUNT(*) FROM gst_invoices;

-- Check recent data
SELECT * FROM customers ORDER BY created_at DESC LIMIT 5;
SELECT * FROM orders ORDER BY created_at DESC LIMIT 5;
```

### **SQL Editor Data Export (Copy-Paste):**
```sql
-- Run this in Supabase SQL Editor for quick data export
SELECT 'Table: customers, Rows: ' || COUNT(*) FROM customers
UNION ALL SELECT 'Table: orders, Rows: ' || COUNT(*) FROM orders
UNION ALL SELECT 'Table: production_batches, Rows: ' || COUNT(*) FROM production_batches;

-- Then export individual tables:
SELECT * FROM customers ORDER BY created_at DESC LIMIT 1000;
```

**Your best approach: Get the database password from Supabase dashboard and use pg_dump for complete, reliable backups!** 🚀