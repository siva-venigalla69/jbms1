# Database Column Mapping Guide
## JBMS Production & Design Tracking System

**Generated**: 2025-09-12  
**Status**: Database Migration In Progress  
**Version**: 2.0 (2-Column Approach)

---

## Overview

This document maps the database columns used in the production and design tracking system, showing the relationship between legacy columns, current columns, and their UI representations.

---

## Order Items Table Column Mapping

### Primary Table: `order_items`

| **UI Field** | **Current Column** | **Legacy Columns** | **Data Type** | **Default Value** | **Purpose** |
|---|---|---|---|---|---|
| Design Status | `design_status` | `design_received`, `design_ready` | TEXT | `'pending_from_customer'` | Track design workflow state |
| Production Status | `production_status` | `current_stage` | TEXT | `'pending'` | Track production workflow state |
| Design File URL | `design_file_url` | N/A | TEXT | NULL | Store design file references |
| Design Notes | `design_notes` | N/A | TEXT | NULL | Store design-related notes |
| Customization Details | `customization_details` | `customization_details` | TEXT | NULL | **Legacy**: Combined field for all custom data |

### Design Status Values

| **Database Value** | **UI Display** | **Legacy Equivalent** | **Description** |
|---|---|---|---|
| `pending_from_customer` | "Design Pending" | `design_received = false` | Waiting for customer to provide design |
| `design_received_from_customer` | "Design Received" | `design_received = true, design_ready = false` | Design received but not approved |
| `design_ready` | "Design Ready" | `design_ready = true` | Design approved and ready for production |

### Production Status Values

| **Database Value** | **UI Display** | **Legacy Equivalent** | **Description** |
|---|---|---|---|
| `pending` | "Pending" | `current_stage = 'design_pending'` or `'design_ready'` | Production not started |
| `pre_treatment` | "Pre-treatment" | `current_stage = 'pre_treatment'` | Fabric pre-processing stage |
| `printing` | "Printing" | `current_stage = 'printing'` | Printing process stage |
| `post_process` | "Post Process" | `current_stage = 'post_process'` | Final processing stage |

---

## Data Migration Strategy

### Current State (Hybrid Approach)
The system supports both legacy and new column formats simultaneously:

1. **New Installations**: Use `design_status` and `production_status` columns
2. **Legacy Data**: Parse from `customization_details` field
3. **Migration**: Gradual migration from legacy to new format

### Parsing Logic Location
**File**: `/home/siva/sandboxes/jbms1/frontend/src/utils/productionUtils.ts`

```typescript
// Primary: Check new columns
if (item?.design_status) {
    return item.design_status as DesignStatus;
}

// Fallback 1: Check legacy columns  
if (item?.design_received !== undefined && item?.design_ready !== undefined) {
    if (item.design_ready) return 'design_ready';
    if (item.design_received) return 'design_received_from_customer';
    return 'pending_from_customer';
}

// Fallback 2: Parse customization_details
const designReceived = customization_details.includes('Design Status: Received')
const designReady = customization_details.includes('Ready: Yes')
```

---

## API Update Methods

### Design Status Update
**Method**: `orderItemApi.updateDesignStatus(id, designStatus, designData)`  
**File**: `/home/siva/sandboxes/jbms1/frontend/src/services/supabaseApi.ts:778`

**Update Strategy**:
1. Try updating `design_status`, `design_file_url`, `design_notes`
2. If fails, fallback to `customization_details` with parsed format
3. Include comprehensive error logging

### Production Status Update  
**Method**: `orderItemApi.updateProductionStatus(id, productionStatus)`  
**File**: `/home/siva/sandboxes/jbms1/frontend/src/services/supabaseApi.ts:523`

**Update Strategy**:
1. Try updating `production_status`
2. If fails, fallback to `customization_details` with parsed format  
3. Include comprehensive error logging

---

## Frontend UI Components

### Production Screen
**File**: `/home/siva/sandboxes/jbms1/frontend/src/pages/Production.tsx`

**Key UI Elements**:
- Design status chips with color coding
- Production status progress indicators  
- Update dialogs for both design and production status
- Filter combinations for different status states

### Status Display Logic

```typescript
// Design Status Chip
const getDesignChip = () => {
    if (designReady) {
        return <Chip label="Ready" color="success" size="small" icon={<CheckCircle />} />;
    } else if (designReceived) {
        return <Chip label="Received" color="warning" size="small" icon={<Assignment />} />;
    } else {
        return <Chip label="Pending" color="error" size="small" icon={<Pending />} />;
    }
};
```

---

## Database Schema Files

### Current Production Schema
**File**: `/home/siva/sandboxes/jbms1/production/database/01_COMPLETE_SCHEMA_CREATION.sql`

### Migration Scripts  
**File**: `/home/siva/sandboxes/jbms1/db/migrations/08_COMPLETE_2_COLUMN_MIGRATION_WITH_TRIGGER_FIXES.sql`

### Supabase Migrations
- `/home/siva/sandboxes/jbms1/supabase/migrations/20250902182117_complete_2_column_migration_with_trigger_fixes.sql`
- `/home/siva/sandboxes/jbms1/supabase/migrations/20250902182118_production_stage_column_fix.sql`

---

## Troubleshooting Guide

### Issue: Design status not updating in UI
**Check**: 
1. Browser console for API errors
2. Database has `design_status` column
3. Fallback parsing is working correctly

### Issue: Production status update failing
**Check**:
1. User authentication status
2. Database has `production_status` column  
3. RLS policies allow updates

### Issue: Data not persisting
**Check**:
1. Database migration completion status
2. Column exists in actual schema
3. API method fallback logic triggered

---

## Migration Completion Checklist

- [ ] Verify `design_status` column exists in `order_items`
- [ ] Verify `production_status` column exists in `order_items`  
- [ ] Verify `design_file_url` column exists in `order_items`
- [ ] Verify `design_notes` column exists in `order_items`
- [ ] Test design status updates work without fallback
- [ ] Test production status updates work without fallback
- [ ] Migrate all legacy data to new columns
- [ ] Remove legacy column dependencies
- [ ] Update API methods to remove fallback logic

---

## Contact Information

**System Architecture**: See `/home/siva/sandboxes/jbms1/UI_DATABASE_DATA_FLOW.md`  
**API Documentation**: See `/home/siva/sandboxes/jbms1/docs/API_DOCUMENTATION_SUPABASE.md`  
**Business Logic**: See `/home/siva/sandboxes/jbms1/frontend/business_flow_queries.sql`