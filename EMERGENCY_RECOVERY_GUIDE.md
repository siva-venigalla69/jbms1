# 🚨 Emergency Database Recovery Guide

## 🔥 **EMERGENCY CONTACT CARD** - Print and Keep Handy

```
EMERGENCY DATABASE RECOVERY
═══════════════════════════════

📞 IMMEDIATE ACTIONS:
1. Stop all applications immediately
2. Assess damage scope
3. Locate latest backup file
4. Follow recovery procedures below

⚡ QUICK BACKUP:
pg_dump -h your_host -U postgres -d postgres --format=custom --file=emergency_backup_$(date +%Y%m%d_%H%M%S).backup

⚡ QUICK RESTORE:
pg_restore -h your_host -U postgres -d postgres --clean --if-exists backup_file.backup

📂 BACKUP LOCATION: ./backups/
📋 RECOVERY PROCEDURES: See detailed steps below
```

---

## 🆘 **EMERGENCY SCENARIOS & QUICK ACTIONS**

### 🔴 **SCENARIO 1: Complete Database Crash**
```bash
# IMMEDIATE ACTION (30 seconds):
# 1. Stop applications
# 2. Check if database server is running
# 3. If server is up but database corrupt, restore immediately:

pg_restore -h db.your-project-ref.supabase.co -U postgres -d postgres \
    --verbose --clean --if-exists \
    backup_full_latest.backup
```

### 🔴 **SCENARIO 2: Accidental Data Deletion**
```bash
# IMMEDIATE ACTION (60 seconds):
# 1. STOP ALL WRITE OPERATIONS IMMEDIATELY
# 2. Create emergency backup of current state:

pg_dump -h db.your-project-ref.supabase.co -U postgres -d postgres \
    --format=custom --file=emergency_after_deletion_$(date +%Y%m%d_%H%M%S).backup

# 3. Restore from backup BEFORE the deletion:
pg_restore -h db.your-project-ref.supabase.co -U postgres -d postgres \
    --verbose --clean --if-exists \
    backup_full_before_deletion.backup
```

### 🔴 **SCENARIO 3: Application Won't Start**
```bash
# IMMEDIATE ACTION (Check database connectivity):
psql -h db.your-project-ref.supabase.co -U postgres -d postgres -c "SELECT NOW();"

# If connection fails, database may be down
# If connection works, check data integrity:
psql -h db.your-project-ref.supabase.co -U postgres -d postgres -c "SELECT COUNT(*) FROM customers;"
```

---

## 📋 **EMERGENCY RECOVERY PROCEDURES**

### **STEP 1: IMMEDIATE ASSESSMENT (2 minutes)**

```sql
-- Run these queries to assess damage:

-- Check database connectivity
SELECT 'Database is accessible' as status, NOW() as timestamp;

-- Check critical tables
SELECT
    'customers' as table_name, COUNT(*) as rows FROM customers
UNION ALL SELECT
    'orders' as table_name, COUNT(*) as rows FROM orders
UNION ALL SELECT
    'production_batches' as table_name, COUNT(*) as rows FROM production_batches;

-- Check for active connections
SELECT COUNT(*) as active_connections FROM pg_stat_activity WHERE datname = current_database();
```

### **STEP 2: EMERGENCY BACKUP (if database is accessible)**

```bash
# Create emergency backup before any recovery attempts
pg_dump -h db.your-project-ref.supabase.co -U postgres -d postgres \
    --format=custom \
    --file=emergency_backup_$(date +%Y%m%d_%H%M%S).backup
```

### **STEP 3: STOP ALL APPLICATIONS**

```bash
# Stop your applications to prevent further damage
# Kill any active database connections if needed:

# Command to terminate all connections (run as SQL):
# SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'postgres' AND pid != pg_backend_pid();
```

### **STEP 4: CHOOSE RECOVERY METHOD**

#### **🔧 METHOD A: Full Database Restore (Most Common)**

```bash
# For complete database restoration:
pg_restore -h db.your-project-ref.supabase.co -U postgres -d postgres \
    --verbose \
    --clean \
    --if-exists \
    backup_full_latest.backup

# Expected time: 5-15 minutes depending on database size
```

#### **🔧 METHOD B: Selective Table Restore**

```bash
# If only specific tables are affected:
pg_restore -h db.your-project-ref.supabase.co -U postgres -d postgres \
    --verbose \
    --table=customers \
    --table=orders \
    backup_full_latest.backup
```

#### **🔧 METHOD C: Data-Only Restore (Keep Schema)**

```bash
# If schema is intact but data is corrupted:
pg_restore -h db.your-project-ref.supabase.co -U postgres -d postgres \
    --verbose \
    --data-only \
    backup_full_latest.backup
```

---

## ✅ **POST-RECOVERY VERIFICATION**

### **Immediate Verification (2 minutes):**

```sql
-- 1. Check table counts
SELECT
    tablename,
    n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public' AND n_live_tup > 0
ORDER BY n_live_tup DESC;

-- 2. Test critical business data
SELECT
    'customers' as table, COUNT(*) as count FROM customers
UNION ALL SELECT
    'orders' as table, COUNT(*) as count FROM orders
UNION ALL SELECT
    'production_batches' as table, COUNT(*) as count FROM production_batches;

-- 3. Check recent data
SELECT 'Recent Orders' as info, COUNT(*) as count
FROM orders
WHERE order_date > CURRENT_DATE - INTERVAL '7 days';
```

### **Application Testing (5 minutes):**

1. ✅ **Start one application instance**
2. ✅ **Test login functionality**
3. ✅ **Create a test order**
4. ✅ **Check if all pages load**
5. ✅ **Verify no error messages**

---

## 📞 **COMMUNICATION TEMPLATE**

### **During Emergency:**
```
🚨 DATABASE EMERGENCY ALERT

Status: Database recovery in progress
Impact: System temporarily unavailable
ETA: Approximately 15 minutes
Action: Restoring from backup created at [BACKUP_TIME]

Next update in: 10 minutes
Point of contact: [YOUR_NAME] [YOUR_PHONE]
```

### **After Recovery:**
```
✅ DATABASE RECOVERY COMPLETED

Status: System restored and operational
Resolution: Database restored from backup
Data loss: [NONE / Minimal / X hours of data]
Testing: All critical functions verified

System is now available for normal use.
Please report any issues immediately.
```

---

## 🛠️ **EMERGENCY TOOLKIT**

### **Essential Commands Card:**

```bash
# Quick Status Check:
psql -h your_host -U postgres -d postgres -c "SELECT NOW(), COUNT(*) FROM customers;"

# Emergency Backup:
pg_dump -h your_host -U postgres -d postgres --format=custom --file=emergency_$(date +%H%M%S).backup

# Quick Restore:
pg_restore -h your_host -U postgres -d postgres --clean --if-exists backup_file.backup

# Kill All Connections:
psql -h your_host -U postgres -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'postgres' AND pid != pg_backend_pid();"

# Check Database Size:
psql -h your_host -U postgres -d postgres -c "SELECT pg_size_pretty(pg_database_size('postgres'));"
```

---

## 🎯 **PREVENTION CHECKLIST**

### **Daily:**
- [ ] Automated backup completed
- [ ] Backup file size is reasonable
- [ ] Application logs show no database errors

### **Weekly:**
- [ ] Test backup restoration (on test environment)
- [ ] Verify backup file integrity
- [ ] Clean old backup files (keep last 30 days)

### **Monthly:**
- [ ] Review and update recovery procedures
- [ ] Test emergency recovery simulation
- [ ] Update emergency contact information

---

## 📂 **BACKUP STRATEGY SUMMARY**

### **Backup Schedule:**
- **Hourly:** Incremental backup (if supported)
- **Daily:** Full database backup
- **Weekly:** Archive backup to external storage
- **Monthly:** Long-term archive backup

### **Backup Retention:**
- **Last 24 hours:** Keep all hourly backups
- **Last 7 days:** Keep all daily backups
- **Last 30 days:** Keep weekly backups
- **Last 12 months:** Keep monthly backups

### **Backup Storage:**
- **Primary:** Local backup directory
- **Secondary:** Cloud storage (AWS S3, Google Drive, etc.)
- **Archive:** External drive or tape storage

---

## 🚨 **WORST-CASE SCENARIO PLAN**

### **If All Backups Are Corrupted:**

1. **🔍 Check for any working backup files**
2. **📞 Contact hosting provider (Supabase) for point-in-time recovery**
3. **🔄 Reconstruct critical data from application logs**
4. **📋 Manually recreate essential business data**
5. **🎯 Implement improved backup strategy immediately**

### **If Hosting Provider Database Is Down:**

1. **📞 Contact Supabase support immediately**
2. **🔄 Set up temporary database on alternative platform**
3. **🔄 Restore latest backup to temporary database**
4. **🔄 Update application connection strings**
5. **📊 Monitor for service restoration**

---

## 🎉 **RECOVERY SUCCESS INDICATORS**

### **Green Signals (Recovery Successful):**
- ✅ All critical tables have expected row counts
- ✅ Application starts without errors
- ✅ Users can log in successfully
- ✅ Recent data is present (check last 24 hours)
- ✅ Foreign key relationships are intact
- ✅ Sequences are at correct values

### **Red Signals (Need Further Action):**
- ❌ Missing tables or zero row counts
- ❌ Application shows database connection errors
- ❌ Users report missing recent data
- ❌ Foreign key constraint violations
- ❌ Sequence values are incorrect

---

*Emergency Guide Created: September 16, 2025*
*Keep this guide accessible during emergencies*
*Print emergency contact card and keep near workstation*