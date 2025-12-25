# Database Schema Fix Instructions

## 🚨 **Issue Identified:**
Your database still uses the old column structure, but the frontend code expects the new 2-column design:

- **Old Structure**: `current_stage`, `production_stage`, `design_received`, `design_ready`
- **New Structure**: `design_status`, `production_status`

## 🔧 **Fix Steps:**

### Step 1: Apply Database Migration
Run **ONE** of these SQL files on your database:

#### Option A: Simple Fix (Recommended for Quick Fix)
```sql
-- Run this file on your Supabase database:
CLEAN_2_COLUMN_SIMPLE_FIX.sql
```

#### Option B: Complete Migration (Recommended for Production)
```sql
-- Run these files in order:
1. CLEAN_2_COLUMN_MIGRATION.sql
2. CLEAN_2_COLUMN_MIGRATION_WITH_DEPENDENCIES.sql
```

### Step 2: Verify Schema
After running the migration, verify:
```sql
-- Check that new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'order_items' 
AND column_name IN ('design_status', 'production_status');

-- Check that old columns are gone
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'order_items' 
AND column_name IN ('current_stage', 'production_stage', 'design_received', 'design_ready');
```

### Step 3: Test the Fix
After migration, the error should be resolved:
```
"Could not find a relationship between 'order_items' and 'production_stages'"
```

## 📋 **What This Fixes:**
- ✅ Order editing functionality
- ✅ Production status tracking  
- ✅ Design status workflow
- ✅ All business_flow_queries.sql queries
- ✅ Frontend API calls

## 🎯 **Next Steps:**
1. Apply the database migration
2. Test that Orders page works without errors
3. Verify that the textile stock tracker functions properly
4. Test all business workflow queries from business_flow_queries.sql