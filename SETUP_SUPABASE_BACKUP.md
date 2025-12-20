# 🔧 Supabase Backup Setup Guide

## 🎯 **Your Current Setup**

Based on your `.env` file, here are your Supabase connection details:

```
Database Host: db.pvatfzwzfgioypdnqjay.supabase.co
Database Port: 5432
Database Name: postgres
Database User: postgres
Project URL: https://pvatfzwzfgioypdnqjay.supabase.co
```

## 🔑 **Missing: Service Role Key**

Your `.env` file shows `[SERVICE_ROLE_KEY]` as a placeholder. You need to get your actual service role key from Supabase.

### **How to Get Your Service Role Key:**

1. **Go to Supabase Dashboard:**
   - Visit: https://pvatfzwzfgioypdnqjay.supabase.co
   - Login to your account

2. **Navigate to API Settings:**
   - Click **Settings** (gear icon)
   - Click **API** in the left sidebar

3. **Copy Service Role Key:**
   - Look for **Project API keys**
   - Find **service_role** key (NOT the anon key)
   - It starts with `eyJ...` and is much longer
   - Click the copy button

4. **Update Your .env File:**
   ```bash
   # Replace [SERVICE_ROLE_KEY] with your actual key:
   DATABASE_URL=postgresql://postgres:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...@db.pvatfzwzfgioypdnqjay.supabase.co:5432/postgres
   ```

## 🚀 **Quick Backup Commands (After Getting Service Role Key)**

### **Method 1: Using Environment Variables**

```bash
# Set your connection details:
export PGHOST="db.pvatfzwzfgioypdnqjay.supabase.co"
export PGPORT="5432"
export PGUSER="postgres"
export PGDATABASE="postgres"
export PGPASSWORD="your_service_role_key_here"

# Create backup:
pg_dump --format=custom --file=backup_$(date +%Y%m%d_%H%M%S).backup
```

### **Method 2: Direct Command**

```bash
# Replace YOUR_SERVICE_ROLE_KEY with actual key:
pg_dump -h db.pvatfzwzfgioypdnqjay.supabase.co \
        -p 5432 \
        -U postgres \
        -d postgres \
        --format=custom \
        --file=backup_$(date +%Y%m%d_%H%M%S).backup

# You'll be prompted for password (enter your service role key)
```

### **Method 3: Using the Automated Script**

I've created `SUPABASE_BACKUP_COMMANDS.sh` for you:

```bash
# Make script executable:
chmod +x SUPABASE_BACKUP_COMMANDS.sh

# Run the script:
./SUPABASE_BACKUP_COMMANDS.sh
```

## 🔧 **Complete Setup Steps**

### **Step 1: Get Service Role Key**
1. Visit Supabase Dashboard → Settings → API
2. Copy the **service_role** key (long key starting with `eyJ...`)

### **Step 2: Update .env File**
```bash
# Edit your .env file:
nano .env

# Replace [SERVICE_ROLE_KEY] with your actual key:
DATABASE_URL=postgresql://postgres:YOUR_ACTUAL_SERVICE_ROLE_KEY@db.pvatfzwzfgioypdnqjay.supabase.co:5432/postgres
```

### **Step 3: Test Connection**
```bash
# Test if you can connect:
export PGPASSWORD="your_service_role_key"
psql -h db.pvatfzwzfgioypdnqjay.supabase.co -U postgres -d postgres -c "SELECT NOW();"
```

### **Step 4: Create Your First Backup**
```bash
# Create backup:
pg_dump -h db.pvatfzwzfgioypdnqjay.supabase.co \
        -U postgres \
        -d postgres \
        --format=custom \
        --file=backup_first_$(date +%Y%m%d_%H%M%S).backup
```

## 📋 **Ready-to-Use Commands (Just Replace Key)**

### **Backup Commands:**
```bash
# Full backup:
pg_dump -h db.pvatfzwzfgioypdnqjay.supabase.co -U postgres -d postgres \
    --format=custom --file=backup_full_$(date +%Y%m%d_%H%M%S).backup

# Data-only backup:
pg_dump -h db.pvatfzwzfgioypdnqjay.supabase.co -U postgres -d postgres \
    --data-only --format=custom --file=backup_data_$(date +%Y%m%d_%H%M%S).backup

# Compressed backup:
pg_dump -h db.pvatfzwzfgioypdnqjay.supabase.co -U postgres -d postgres \
    --format=custom --compress=9 --file=backup_compressed_$(date +%Y%m%d_%H%M%S).backup
```

### **Restore Commands:**
```bash
# Full restore:
pg_restore -h db.pvatfzwzfgioypdnqjay.supabase.co -U postgres -d postgres \
    --clean --if-exists backup_file.backup

# Selective restore:
pg_restore -h db.pvatfzwzfgioypdnqjay.supabase.co -U postgres -d postgres \
    --table=customers --table=orders backup_file.backup
```

## 🛡️ **Security Best Practices**

### **1. Environment Variables (Recommended):**
```bash
# Create a backup script with environment variables:
cat > backup.sh << 'EOF'
#!/bin/bash
export PGHOST="db.pvatfzwzfgioypdnqjay.supabase.co"
export PGPORT="5432"
export PGUSER="postgres"
export PGDATABASE="postgres"
export PGPASSWORD="your_service_role_key_here"

pg_dump --format=custom --file=backup_$(date +%Y%m%d_%H%M%S).backup
EOF

chmod +x backup.sh
```

### **2. .pgpass File (Alternative):**
```bash
# Create .pgpass file (more secure):
echo "db.pvatfzwzfgioypdnqjay.supabase.co:5432:postgres:postgres:your_service_role_key" > ~/.pgpass
chmod 600 ~/.pgpass

# Now you can run pg_dump without password prompts:
pg_dump -h db.pvatfzwzfgioypdnqjay.supabase.co -U postgres -d postgres --format=custom --file=backup.backup
```

## 🎯 **Next Steps**

1. **✅ Get your service role key** from Supabase Dashboard
2. **✅ Update your .env file** with the actual key
3. **✅ Test connection** with psql command
4. **✅ Create your first backup** using pg_dump
5. **✅ Set up automated backups** using the provided scripts

## 🆘 **If You Need Help**

- **Can't find service role key?** Check Supabase Dashboard → Settings → API
- **Connection refused?** Make sure you're using the service_role key, not anon key
- **Permission denied?** Verify you have the correct service_role key with database access
- **Backup too large?** Use compressed format: `--format=custom --compress=9`

Your database is ready for backup once you get the service role key! 🚀