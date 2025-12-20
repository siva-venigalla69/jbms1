# Database Migration Analysis and Execution Order

## Current Database: Supabase PostgreSQL

**Connection**: `pvatfzwzfgioypdnqjay.supabase.co`
**Active Migration Folder**: `/supabase/migrations/`

---

## Executed Migrations (In Order)

### 1. `20250101000000_initial_schema.sql`
**Date**: Aug 17, 2025 10:47
**Purpose**: Initial schema creation with all base tables
**Status**: ✅ Applied
**Key Changes**:
- Created all base tables (customers, orders, order_items, etc.)
- Initial RLS policies
- Basic triggers

### 2. `20250101000001_updated_schema.sql`
**Date**: Sep 4, 2025 16:16
**Purpose**: Schema updates and enhancements
**Status**: ✅ Applied
**Key Changes**:
- Added missing columns
- Updated relationships
- Enhanced constraints

### 3. `20250902182117_complete_2_column_migration_with_trigger_fixes.sql`
**Date**: Sep 4, 2025 16:15
**Purpose**: Migrate to 2-column design system (design_status + production_status)
**Status**: ✅ Applied
**Key Changes**:
- Added `design_status` column
- Added `production_status` column
- Migrated data from old columns
- Created validation triggers

### 4. `20250902182118_production_stage_column_fix.sql`
**Date**: Sep 4, 2025 16:16
**Purpose**: Fix "record 'old' has no field 'production_stage'" error
**Status**: ✅ Applied
**Key Changes**:
- Dropped old columns causing errors
- Fixed triggers and functions
- **CURRENT ISSUE**: Blocks pre_treatment until design ready (Line 141-142)

---

## Current Schema State

### Order Items Table Structure
```sql
order_items (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL,
    material_type VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,

    -- NEW: Independent status columns
    design_status TEXT NOT NULL DEFAULT 'pending_from_customer',
        -- Values: 'pending_from_customer', 'design_received_from_customer', 'design_ready'

    production_status TEXT NOT NULL DEFAULT 'pending',
        -- Values: 'pending', 'pre_treatment', 'printing', 'post_process'

    design_file_url TEXT,
    design_notes TEXT,
    designs_provided_quantity INTEGER DEFAULT 0,
    designs_approved_quantity INTEGER DEFAULT 0,
    design_last_updated TIMESTAMP,

    -- Legacy columns (kept for backward compatibility)
    customization_details TEXT,
    pre_treatment_completed_at TIMESTAMP,
    printing_completed_at TIMESTAMP,
    post_process_completed_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
)
```

### Current Validation Logic (ISSUE!)
```sql
-- From: validate_design_production_status() function
-- Line 141-142 in migration 20250902182118

IF NEW.production_status IN ('pre_treatment', 'printing', 'post_process')
   AND NEW.design_status != 'design_ready' THEN
    RAISE EXCEPTION 'Cannot start production until design is ready';
END IF;
```

**Problem**: This blocks `pre_treatment` (padding) until design is ready.

---

## Required Changes

### Business Requirement
> "Fabric can go to padding while design is being prepared. Only when BOTH padding AND design are completed, move to printing."

### Fix Required
```sql
-- NEW LOGIC:
-- Allow pre_treatment WITHOUT design ready
-- Block printing UNTIL BOTH pre_treatment done AND design ready
```

---

## Migration Files Organization

### Active Folder: `/supabase/migrations/`
```
supabase/migrations/
├── 20250101000000_initial_schema.sql (Applied ✅)
├── 20250101000001_updated_schema.sql (Applied ✅)
├── 20250902182117_complete_2_column_migration_with_trigger_fixes.sql (Applied ✅)
├── 20250902182118_production_stage_column_fix.sql (Applied ✅ but has issue)
└── 20251210_production_workflow_fix.sql (NEW - To be created)
```

### Backup Folder: `/db/migrations/`
Contains copies of active migrations for reference.

### Other SQL Folders:
- `/ root_folder/` - Various utility and analysis SQL files
- `/frontend/` - Business logic queries for reporting
- `/database/` - Schema backups
- `/production/database/` - Old production deployment scripts
- `/outdated_sql_files/` - Deprecated migrations

---

## Next Steps

### Step 1: Create New Migration
**File**: `supabase/migrations/20251210_production_workflow_fix.sql`

**Purpose**:
1. Drop and recreate `validate_design_production_status()` function
2. Update validation logic to allow pre_treatment without design
3. Block printing until BOTH conditions met
4. Update RPC functions
5. Add helpful views for status tracking

### Step 2: Test Migration
1. Backup current database
2. Apply migration to test environment
3. Run comprehensive test scenarios
4. Verify all business rules

### Step 3: Update Frontend
1. Update `productionUtils.ts` validation functions
2. Update UI components to show combined status
3. Add blocking reason indicators

### Step 4: API Testing
1. Test all order item status update APIs
2. Test validation scenarios
3. Test error handling
4. Document all test results

---

## Database Backup Before Migration

```bash
# Create backup
pg_dump -h db.pvatfzwzfgioypdnqjay.supabase.co \
  -U postgres \
  -d postgres \
  -F c \
  -f backup_before_workflow_fix_$(date +%Y%m%d_%H%M%S).dump

# Or using Supabase CLI
supabase db dump -f backup_before_workflow_fix.sql
```

---

## Migration Execution Checklist

- [ ] Database backed up
- [ ] Migration file created and reviewed
- [ ] Test environment migration successful
- [ ] All test scenarios passed
- [ ] Frontend code updated
- [ ] API tests passed
- [ ] Documentation updated
- [ ] Ready for production deployment

---

**Document Last Updated**: 2025-12-10
