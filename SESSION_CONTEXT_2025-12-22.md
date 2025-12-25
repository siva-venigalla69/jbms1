# Session Context - 2025-12-22
## Digital Textile Printing Job Work Management System

---

## 🎯 Major Changes in This Session

### 1. **Movement History Architecture Implemented**
- **Problem:** Stock movements were updating records, losing history
- **Solution:** Introduced `is_active` flag to `material_stock` table
  - Active records (is_active = true) = current stock
  - Inactive records (is_active = false) = movement history

### 2. **Separate Design Tracking Table Created**
- **Problem:** Design status tied to movements, causing duplication and complexity
- **Solution:** Created `material_design_tracking` table
  - One batch = one design tracking record
  - Design updates don't affect movement history
  - Single source of truth for design status

### 3. **"Delivered" Stage Added**
- **Problem:** Deliveries reduced stock quantity, losing audit trail
- **Solution:** Move stock to "delivered" stage instead of reducing quantity
  - Complete movement history maintained
  - Easy to query total delivered quantity
  - Can track what was delivered when

---

## 📁 Files Modified/Created in This Session

### Database Files (SQL)

#### 1. `/database/1_FIX_DASHBOARD.sql` ✅ Executed by User
- Fixed dashboard view with `pending_quantity` column
- Status: Working

#### 2. `/database/2_ADD_DESIGN_TRACKING.sql` ✅ Executed by User
- Added design tracking columns to material_stock
- Created `v_pending_designs` view
- Created `update_design_count()` function
- Status: Working, but will be superseded by 2.2

#### 3. `/database/2_1_FIX_UNIQUE_CONSTRAINT.sql` ⚠️ Must Execute
- Adds unique index to material_stock for ON CONFLICT support
- Required for move_stock_to_stage() function
- **Status: PENDING - Execute before 2.2**

#### 4. `/database/2_2_ADD_MOVEMENT_HISTORY_AND_DESIGN_TABLE.sql` ⚠️ Must Execute
- **NEW ARCHITECTURE - Execute after 2.1**
- Adds `is_active` column to material_stock
- Creates `material_design_tracking` table
- Recreates `move_stock_to_stage()` with history tracking
- Recreates `update_design_count()` to use design tracking table
- Creates `v_stock_movement_history` view
- Updates `v_pending_designs` to use design tracking table
- Migrates existing design data to new table
- **Status: PENDING**

#### 5. `/database/3_TEST_CUSTOMER_99.sql` ⚠️ Execute After 2.2
- Complete test case updated for new architecture
- Tests movement history and design tracking
- Creates customer 99, receives 90 sarees, moves through stages
- Shows movement history audit trail
- **Status: UPDATED, PENDING EXECUTION**

### Frontend Files (TypeScript/React)

#### 1. `/frontend/src/services/simplifiedApi.ts` ✅ Updated
**Changes:**
- Added `MATERIAL_DESIGN_TRACKING` table constant
- Added `DELIVERED` to STAGE enum
- Added `is_active` field to MaterialStock interface
- Created new `MaterialDesignTracking` interface
- **Status: UPDATED, needs rebuild**

#### 2. `/frontend/src/pages/ProductionStock.tsx` ⏳ Needs Update
**Required Changes:**
- Query only active stock (is_active = true)
- Join with material_design_tracking to get design status
- Update move stock to work with new function
- Add "View Movement History" feature
- **Status: PENDING UPDATE**

---

## 🗄️ New Database Architecture

### Material Stock Table (with History)
```sql
material_stock (
  id UUID PRIMARY KEY,
  customer_id UUID,
  order_id UUID,
  material_type VARCHAR,
  stage VARCHAR,  -- received, preprocessing, printing, postprocessing, completed, delivered, misprint
  quantity INTEGER,
  ownership VARCHAR,  -- 'customer' or 'self'
  is_active BOOLEAN,  -- true = current, false = history
  notes TEXT,
  created_at TIMESTAMP,  -- when this movement happened
  updated_at TIMESTAMP
)

-- Unique constraint for ON CONFLICT
UNIQUE INDEX (customer_id, COALESCE(order_id, '00..00'), material_type, stage, ownership)
```

### Material Design Tracking Table (NEW)
```sql
material_design_tracking (
  id UUID PRIMARY KEY,
  customer_id UUID NOT NULL,
  material_type VARCHAR NOT NULL,
  material_in_id UUID,  -- Link to original receipt
  batch_identifier VARCHAR,  -- e.g., 'Batch-20Dec2025-1'
  total_quantity INTEGER,  -- Total in this batch across all stages
  designs_given INTEGER,  -- Designs provided by customer
  designs_pending INTEGER,  -- Auto-calculated: total - given
  design_notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Key Concept: Separation of Concerns
- **material_stock** = Physical movements (WHERE is_active = true for current stock)
- **material_design_tracking** = Design status per batch (single source of truth)

---

## 🔄 Stock Movement Workflow

### Old Approach (Before This Session):
```
Move 40 sarees: received → preprocessing
  - UPDATE received: quantity = 50 - 40 = 10
  - INSERT/UPDATE preprocessing: quantity = 40
  ❌ Lost history of original 50 in received stage
```

### New Approach (Current):
```
Move 40 sarees: received → preprocessing
  1. Mark original received record as inactive (is_active = false)
  2. Create new received record with 10 remaining (is_active = true)
  3. Create new preprocessing record with 40 (is_active = true)
  ✅ Complete audit trail preserved!
```

---

## 🎨 Design Tracking Workflow

### Example: Customer gives designs progressively

**Initial Receipt:**
```sql
-- 90 sarees received
INSERT INTO material_stock (..., stage = 'received', quantity = 90, is_active = true)
INSERT INTO material_design_tracking (..., total_quantity = 90, designs_given = 0, designs_pending = 90)
```

**Customer gives 30 designs:**
```sql
-- Update design tracking (NOT material_stock)
SELECT update_design_count(customer_id, 'SAREE', 30, 'Batch-X');
-- Result: designs_given = 30, designs_pending = 60
```

**Prepare 40 designs (repeat 10):**
```sql
-- Update design tracking again
SELECT update_design_count(customer_id, 'SAREE', 10, 'Batch-X');
-- Result: designs_given = 40, designs_pending = 50
-- Can now process 40 sarees even though only 40 designs provided
```

**Move 40 sarees through stages:**
```sql
-- Design status stays in tracking table, material moves
SELECT move_stock_to_stage(..., 'received', 'preprocessing', 40, ...);
-- Design tracking unchanged: still shows 40 given, 50 pending for the batch
```

---

## 📊 Querying the New Architecture

### Get Current Active Stock
```sql
SELECT * FROM material_stock
WHERE customer_id = '...'
  AND is_active = true
ORDER BY stage, material_type;
```

### Get Movement History
```sql
SELECT * FROM material_stock
WHERE customer_id = '...'
ORDER BY created_at DESC;
-- Shows all movements, active and inactive
```

### Get Design Status for Stock
```sql
SELECT
  ms.*,
  dt.designs_given,
  dt.designs_pending,
  dt.design_notes
FROM material_stock ms
LEFT JOIN material_design_tracking dt
  ON ms.customer_id = dt.customer_id
  AND ms.material_type = dt.material_type
WHERE ms.is_active = true;
```

### Get Pending Designs (Follow-up List)
```sql
SELECT * FROM v_pending_designs
WHERE designs_pending > 0
ORDER BY designs_pending DESC;
```

---

## 🚀 Execution Steps (In Order)

### Step 1: ✅ DONE (by user)
```
Execute: 1_FIX_DASHBOARD.sql
```

### Step 2: ✅ DONE (by user)
```
Execute: 2_ADD_DESIGN_TRACKING.sql
```

### Step 3: ⚠️ TODO - Execute This Now
```
Execute: 2_1_FIX_UNIQUE_CONSTRAINT.sql
```
**Why:** Adds unique constraint needed for move_stock_to_stage()

### Step 4: ⚠️ TODO - Execute After Step 3
```
Execute: 2_2_ADD_MOVEMENT_HISTORY_AND_DESIGN_TABLE.sql
```
**Why:** Implements new architecture with history and separate design tracking

### Step 5: ⚠️ TODO - Execute After Step 4
```
Execute: 3_TEST_CUSTOMER_99.sql
```
**Why:** Validates complete workflow with new architecture

### Step 6: ⏳ TODO - Frontend Update
```
Update: ProductionStock.tsx
- Query is_active = true only
- Join with material_design_tracking for design status
- Add movement history viewer
```

---

## 🔍 Key Business Rules

### 1. Design Tracking
- Designs belong to a BATCH, not a movement
- Customer can give 30 designs but we can prepare 40 (repeat 10)
- Design pending = total_quantity - designs_given
- When material moves stages, design status stays with the batch

### 2. Stock Movements
- Every movement creates new records
- Old records marked inactive (is_active = false)
- Current stock = WHERE is_active = true
- History = all records ordered by created_at

### 3. Delivery Flow
- completed stage → delivered stage (NOT delete/reduce)
- Maintains audit trail
- Can query "how much delivered on what date"

### 4. Reconciliation
```
Material IN (material_in.quantity)
= Current Active Stock (WHERE is_active = true)
= Sum of all stages (received + preprocessing + ... + delivered + misprint)
```

---

## 🐛 Known Issues Fixed

### Issue 1: ON CONFLICT Error
**Error:** `there is no unique or exclusion constraint matching the ON CONFLICT specification`
**Fix:** File `2_1_FIX_UNIQUE_CONSTRAINT.sql` adds unique index

### Issue 2: Lost Movement History
**Error:** Stock updates overwrite previous stage quantities
**Fix:** File `2_2_ADD_MOVEMENT_HISTORY_AND_DESIGN_TABLE.sql` implements is_active pattern

### Issue 3: Design Status Duplication
**Error:** designs_given duplicated across all movement records
**Fix:** Separate `material_design_tracking` table with single source of truth

---

## 🎯 User's Original Requirements (Met)

✅ Track designs given vs pending (e.g., 30/90 with 60 pending)
✅ Allow design repetition (30 unique → 40 total)
✅ Quality check after postprocessing → completed OR misprint
✅ Customer material vs Own stock (ownership flag)
✅ Complete stock reconciliation
✅ Movement history tracking
✅ Customer follow-up capability
✅ Simple for non-technical users
✅ Delivery tracking with audit trail

---

## 💡 Next Session TODO

1. **Execute SQL files in order:** 2.1 → 2.2 → 3
2. **Update ProductionStock.tsx:**
   - Fetch active stock with design status join
   - Add movement history modal/view
   - Update stock movement calls
3. **Test complete workflow:**
   - Execute test case
   - Verify movement history shows all transitions
   - Verify design tracking works independently
   - Check reconciliation balances
4. **Update other frontend pages if needed:**
   - DeliveriesSimplified.tsx (use delivered stage)
   - ReportsSimplified.tsx (query active stock only)

---

## 📝 Important Notes

- **Do NOT delete old design columns from material_stock** until frontend updated
- **Movement history records are permanent** - never delete, only mark inactive
- **Design tracking is batch-level** - one record per material receipt batch
- **Always query is_active = true** for current stock
- **Use created_at for movement timestamp**, updated_at for record changes

---

## 🗂️ File Locations

### Database SQL Files:
```
/home/siva/sandboxes/jbms1/database/
  ├── 1_FIX_DASHBOARD.sql (✅ executed)
  ├── 2_ADD_DESIGN_TRACKING.sql (✅ executed)
  ├── 2_1_FIX_UNIQUE_CONSTRAINT.sql (⚠️ execute next)
  ├── 2_2_ADD_MOVEMENT_HISTORY_AND_DESIGN_TABLE.sql (⚠️ then this)
  └── 3_TEST_CUSTOMER_99.sql (⚠️ then test)
```

### Frontend Files:
```
/home/siva/sandboxes/jbms1/frontend/src/
  ├── services/simplifiedApi.ts (✅ updated)
  └── pages/ProductionStock.tsx (⏳ needs update)
```

### Documentation:
```
/home/siva/sandboxes/jbms1/
  ├── AUTOMATED_VERIFICATION_SUMMARY.md
  ├── COMPLETE_VERIFICATION_GUIDE.md
  └── SESSION_CONTEXT_2025-12-22.md (this file)
```

---

**Session Summary:** Implemented complete movement history tracking and separated design tracking into dedicated table. Ready for database execution and frontend updates.
