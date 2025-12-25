# Execution Plan - Next Steps
## Digital Textile Printing System - Movement History & Design Tracking

---

## ✅ What's Been Completed

### Database Files Created:
1. ✅ `1_FIX_DASHBOARD.sql` - Executed by you
2. ✅ `2_ADD_DESIGN_TRACKING.sql` - Executed by you
3. ✅ `2_1_FIX_UNIQUE_CONSTRAINT.sql` - Created, needs execution
4. ✅ `2_2_ADD_MOVEMENT_HISTORY_AND_DESIGN_TABLE.sql` - Created, needs execution
5. ✅ `3_TEST_CUSTOMER_99.sql` - Updated for new architecture

### Frontend Files Updated:
1. ✅ `simplifiedApi.ts` - Updated with new interfaces and table
2. ⏳ `ProductionStock.tsx` - Needs update for new architecture

### Documentation Created:
1. ✅ `SESSION_CONTEXT_2025-12-22.md` - Complete architecture documentation
2. ✅ `EXECUTION_PLAN_NEXT_STEPS.md` - This file

---

## 🎯 Execute These Steps IN ORDER

### Step 1: Ensure Orders Table & Lineage (3 minutes)
**File:** `/home/siva/sandboxes/jbms1/database/2_3_ENSURE_ORDERS_TABLE_AND_LINEAGE.sql`

**Why:** Ensures orders table exists and order_id is tracked throughout workflow

**Execute in Supabase SQL Editor:**
```sql
-- Copy entire content of 2_3_ENSURE_ORDERS_TABLE_AND_LINEAGE.sql
-- Paste and click RUN
```

**Expected Output:**
```
STEP 2.3 COMPLETE - Orders table and lineage tracking ensured!
```

**What This Does:**
- Creates orders table if not exists
- Auto-generates order numbers (ORD-000001, ORD-000002, etc.)
- Ensures order_id column exists in all related tables
- Creates v_order_lifecycle view for complete order tracking
- Creates get_order_summary() function
- Verifies order lineage in material_in, material_stock, delivery_challans, gst_invoices

---

### Step 2: Fix Unique Constraint (2 minutes)
**File:** `/home/siva/sandboxes/jbms1/database/2_1_FIX_UNIQUE_CONSTRAINT.sql`

**Why:** Adds unique index required for move_stock_to_stage() function to work

**Execute in Supabase SQL Editor:**
```sql
-- Copy entire content of 2_1_FIX_UNIQUE_CONSTRAINT.sql
-- Paste and click RUN
```

**Expected Output:**
```
UNIQUE CONSTRAINT ADDED - move_stock_to_stage will now work!
```

---

### Step 3: Add Movement History & Design Tracking (5 minutes)
**File:** `/home/siva/sandboxes/jbms1/database/2_2_ADD_MOVEMENT_HISTORY_AND_DESIGN_TABLE.sql`

**Why:** Implements core new architecture:
- Adds `is_active` column for movement history
- Creates `material_design_tracking` table
- Updates all functions to work with new architecture
- Migrates existing design data

**Execute in Supabase SQL Editor:**
```sql
-- Copy entire content of 2_2_ADD_MOVEMENT_HISTORY_AND_DESIGN_TABLE.sql
-- Paste and click RUN
```

**Expected Output:**
```
STEP 2.2 COMPLETE - Movement history and design tracking table added!
```

**What This Does:**
- Material_stock table: `is_active` column added
- New table: `material_design_tracking` created
- Function: `move_stock_to_stage()` recreated with history tracking
- Function: `update_design_count()` recreated to use design table
- View: `v_pending_designs` updated to use design table
- View: `v_stock_movement_history` created for audit trail
- Existing design data migrated to new table

---

### Step 4: Test Complete Workflow (5 minutes)
**File:** `/home/siva/sandboxes/jbms1/database/3_TEST_CUSTOMER_99.sql`

**Why:** Validates everything works end-to-end with new architecture

**Execute in Supabase SQL Editor:**
```sql
-- Copy entire content of 3_TEST_CUSTOMER_99.sql
-- Paste and click RUN
```

**Expected Output:**
```
SAREE RECONCILIATION:
Total RECEIVED:     90 units
Total in STOCK:     90 units (all stages including delivered)
DELIVERED:          37 units (in delivered stage)
Balance check: Total in stock = 90 units
Expected: 90 units
Status: RECONCILED!

Stock Breakdown:
- 50 in received stage (pending designs)
- 37 in delivered stage (invoiced)
- 3 in misprint stage (to be sold separately)

Next Steps:
1. Follow up for 50 pending designs
2. Collect payment Rs.4,012
3. Sell 3 misprint sarees

STEP 3 COMPLETE - Test successful!
```

**What This Tests:**
- Customer creation
- Multi-batch material receipt (50 + 40 sarees = 90 total)
- Design tracking (30 given → 60 pending → 40 total with repetition)
- Movement through all stages with history preserved
- Quality check (37 pass → completed, 3 fail → misprint)
- Delivery (completed → delivered stage)
- Complete stock reconciliation
- Movement history audit trail

---

### Step 5: Verify in Database (2 minutes)

**Check Active Stock:**
```sql
SELECT
  customer_id,
  material_type,
  stage,
  quantity,
  is_active,
  created_at
FROM material_stock
WHERE customer_id = (SELECT id FROM customers WHERE name = 'test customer 99')
ORDER BY created_at DESC
LIMIT 20;
```

**Expected:** See active (true) and inactive (false) records showing complete history

**Check Design Tracking:**
```sql
SELECT * FROM material_design_tracking
WHERE customer_id = (SELECT id FROM customers WHERE name = 'test customer 99');
```

**Expected:** One record showing designs_given = 40, designs_pending = 50

**Check Pending Designs View:**
```sql
SELECT * FROM v_pending_designs
WHERE customer_name = 'test customer 99';
```

**Expected:** Shows design status for follow-up

**Check Movement History View:**
```sql
SELECT * FROM v_stock_movement_history
WHERE customer_name = 'test customer 99'
ORDER BY moved_at DESC
LIMIT 10;
```

**Expected:** Complete audit trail of all movements

---

### Step 6: Update Frontend API (10 minutes)

**File:** `/home/siva/sandboxes/jbms1/frontend/src/services/simplifiedApi.ts`

**Status:** ✅ Already updated with:
- MATERIAL_DESIGN_TRACKING table
- DELIVERED stage enum
- is_active field in MaterialStock
- MaterialDesignTracking interface

**Additional API Functions Needed:**

Add these functions to simplifiedApi.ts:

```typescript
// In stock section, add:

// Get active stock with design tracking
async getActiveWithDesigns(): Promise<(MaterialStock & {
  designs_given?: number;
  designs_pending?: number;
  design_notes?: string;
})[]> {
  const { data, error } = await supabase
    .from(SIMPLE_TABLES.MATERIAL_STOCK)
    .select(`
      *,
      material_design_tracking (
        designs_given,
        designs_pending,
        design_notes
      )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return data.map(item => ({
    ...item,
    designs_given: item.material_design_tracking?.[0]?.designs_given,
    designs_pending: item.material_design_tracking?.[0]?.designs_pending,
    design_notes: item.material_design_tracking?.[0]?.design_notes,
  }));
},

// Update design count via RPC
async updateDesignCount(params: {
  customer_id: string;
  material_type: string;
  designs_to_add: number;
  batch_identifier?: string;
}): Promise<void> {
  const { error } = await supabase.rpc('update_design_count', {
    p_customer_id: params.customer_id,
    p_material_type: params.material_type,
    p_designs_to_add: params.designs_to_add,
    p_batch_identifier: params.batch_identifier || null,
  });

  if (error) throw new Error(error.message);
},

// Get movement history
async getMovementHistory(customer_id: string, material_type?: string): Promise<MaterialStock[]> {
  let query = supabase
    .from(SIMPLE_TABLES.MATERIAL_STOCK)
    .select('*')
    .eq('customer_id', customer_id)
    .order('created_at', { ascending: false });

  if (material_type) {
    query = query.eq('material_type', material_type);
  }

  const { data, error } = await query.limit(50);
  if (error) throw new Error(error.message);
  return data;
},
```

---

### Step 7: Update ProductionStock.tsx (15 minutes)

**File:** `/home/siva/sandboxes/jbms1/frontend/src/pages/ProductionStock.tsx`

**Changes Needed:**

1. **Update loadData() to fetch active stock with designs:**
```typescript
const loadData = async () => {
  try {
    setLoading(true);
    const [stock, customerData, types] = await Promise.all([
      simplifiedApi.stock.getActiveWithDesigns(), // CHANGED: Use new method
      simplifiedApi.customers.getAll(),
      simplifiedApi.materialTypes.getAll(),
    ]);
    setStockData(stock);
    setCustomers(customerData);
    setMaterialTypes(types.map(t => t.type_code));
    setError(null);
  } catch (err: any) {
    setError('Failed to load data: ' + err.message);
  } finally {
    setLoading(false);
  }
};
```

2. **Update handleUpdateDesign() to use new RPC:**
```typescript
const handleUpdateDesign = async () => {
  if (!selectedStock) return;

  try {
    await simplifiedApi.stock.updateDesignCount({
      customer_id: selectedStock.customer_id!,
      material_type: selectedStock.material_type,
      designs_to_add: designsGiven - (selectedStock.designs_given || 0),
      batch_identifier: undefined, // or ask user for batch identifier
    });

    setSuccess(`Updated design status for ${selectedStock.material_type}`);
    setDesignDialogOpen(false);
    setSelectedStock(null);
    loadData();
  } catch (err: any) {
    setError('Failed to update design status: ' + err.message);
  }
};
```

3. **Add DELIVERED to stage list:**
```typescript
const getNextStage = (currentStage: string): string => {
  const stages = [
    SIMPLE_ENUMS.STAGE.RECEIVED,
    SIMPLE_ENUMS.STAGE.PREPROCESSING,
    SIMPLE_ENUMS.STAGE.PRINTING,
    SIMPLE_ENUMS.STAGE.POSTPROCESSING,
    SIMPLE_ENUMS.STAGE.COMPLETED,
    SIMPLE_ENUMS.STAGE.DELIVERED,  // ADDED
  ];
  const currentIndex = stages.indexOf(currentStage as any);
  return currentIndex >= 0 && currentIndex < stages.length - 1 ? stages[currentIndex + 1] : currentStage;
};

const getStageColor = (stage: string) => {
  switch (stage) {
    case SIMPLE_ENUMS.STAGE.RECEIVED:
      return 'default';
    case SIMPLE_ENUMS.STAGE.PREPROCESSING:
      return 'info';
    case SIMPLE_ENUMS.STAGE.PRINTING:
      return 'primary';
    case SIMPLE_ENUMS.STAGE.POSTPROCESSING:
      return 'secondary';
    case SIMPLE_ENUMS.STAGE.COMPLETED:
      return 'success';
    case SIMPLE_ENUMS.STAGE.DELIVERED:  // ADDED
      return 'info';
    case SIMPLE_ENUMS.STAGE.MISPRINT:
      return 'error';
    case SIMPLE_ENUMS.STAGE.DAMAGED:
      return 'warning';
    default:
      return 'default';
  }
};
```

4. **Add DELIVERED tab:**
```typescript
// In the Tabs component, add:
<Tab label={`Delivered (${stats.delivered})`} />

// In getStockByTab, add case for delivered:
case 7: stageFilter = SIMPLE_ENUMS.STAGE.DELIVERED; break;

// In getSummaryStats, add delivered counter:
delivered: 0,

// In the forEach loop:
case SIMPLE_ENUMS.STAGE.DELIVERED:
  stats.delivered += stock.quantity;
  break;
```

5. **Optional: Add Movement History Button & Dialog:**
```typescript
// Add state
const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
const [movementHistory, setMovementHistory] = useState<MaterialStock[]>([]);

// Add function
const viewMovementHistory = async (stock: MaterialStock) => {
  try {
    const history = await simplifiedApi.stock.getMovementHistory(
      stock.customer_id!,
      stock.material_type
    );
    setMovementHistory(history);
    setHistoryDialogOpen(true);
  } catch (err: any) {
    setError('Failed to load movement history: ' + err.message);
  }
};

// Add button in table actions:
<IconButton
  size="small"
  onClick={() => viewMovementHistory(stock)}
  title="View Movement History"
>
  <Info />
</IconButton>

// Add dialog component (add to bottom of return):
<Dialog open={historyDialogOpen} onClose={() => setHistoryDialogOpen(false)} maxWidth="md" fullWidth>
  <DialogTitle>Movement History</DialogTitle>
  <DialogContent>
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Stage</TableCell>
            <TableCell>Quantity</TableCell>
            <TableCell>Active</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {movementHistory.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{new Date(item.created_at).toLocaleString()}</TableCell>
              <TableCell>
                <Chip label={item.stage} color={getStageColor(item.stage) as any} size="small" />
              </TableCell>
              <TableCell>{item.quantity}</TableCell>
              <TableCell>
                {item.is_active ? <CheckCircle color="success" /> : <Clear color="disabled" />}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setHistoryDialogOpen(false)}>Close</Button>
  </DialogActions>
</Dialog>
```

---

### Step 8: Build & Test Frontend (10 minutes)

```bash
cd /home/siva/sandboxes/jbms1/frontend
npm run build
```

**Expected:** Build successful with no errors

**If successful:**
```bash
npm start
```

**Test:**
1. Go to Production Stock page
2. Should see customer 99 data
3. Click on a stock item, try moving between stages
4. Check movement history (if implemented)
5. Update design count
6. Verify all tabs working (including Delivered tab)

---

### Step 9: Update Other Pages (Optional, 20 minutes)

**Pages that may need updates:**

1. **DeliveriesSimplified.tsx**
   - Change from reducing quantity to moving to delivered stage
   - Use `simplifiedApi.stock.moveToStage()` instead of quantity updates

2. **ReportsSimplified.tsx**
   - Update stock queries to filter `is_active = true`
   - Show delivered quantity in reports

3. **Dashboard.tsx**
   - Update stock queries for active stock only
   - Add delivered stage to metrics

---

## 📊 Verification Checklist

After completing all steps, verify:

### Database:
- [ ] Unique constraint added
- [ ] is_active column exists in material_stock
- [ ] material_design_tracking table created
- [ ] move_stock_to_stage() function works with history
- [ ] update_design_count() function works with design table
- [ ] Test customer 99 data reconciles correctly
- [ ] Movement history shows all transitions
- [ ] Design tracking shows correct counts

### Frontend:
- [ ] Build successful
- [ ] Production Stock loads without errors
- [ ] Active stock displayed correctly
- [ ] Design tracking shows correct counts
- [ ] Move stock preserves history
- [ ] Delivered stage visible
- [ ] Movement history viewable (if implemented)

### Business Logic:
- [ ] Stock movements create new records
- [ ] Old records marked inactive
- [ ] Design status tracked separately
- [ ] Delivered items in delivered stage
- [ ] Reconciliation balances (IN = STOCK)
- [ ] Design follow-up list works

---

## 🚨 Common Issues & Solutions

### Issue: Build fails with TypeScript errors
**Solution:** Make sure simplifiedApi.ts is updated with new interfaces

### Issue: "is_active column doesn't exist"
**Solution:** Execute 2_2_ADD_MOVEMENT_HISTORY_AND_DESIGN_TABLE.sql

### Issue: "material_design_tracking table doesn't exist"
**Solution:** Execute 2_2_ADD_MOVEMENT_HISTORY_AND_DESIGN_TABLE.sql

### Issue: "ON CONFLICT" error
**Solution:** Execute 2_1_FIX_UNIQUE_CONSTRAINT.sql first

### Issue: Design tracking not showing
**Solution:** Make sure getActiveWithDesigns() joins with material_design_tracking table

### Issue: Movement history shows duplicates
**Solution:** This is expected - each movement creates new record

---

## 📝 Summary

**Total Execution Time:** ~1 hour 15 minutes

**Critical Path:**
1. Execute SQL files (4) → 15 minutes
2. Verify in database → 5 minutes
3. Update frontend API → 10 minutes
4. Update ProductionStock.tsx → 15 minutes
5. Build & test → 10 minutes
6. Fix any issues → 20 minutes

**Key Benefits of New Architecture:**
✅ Complete movement audit trail
✅ Design tracking independent of movements
✅ Delivered stage for full workflow
✅ Easy reconciliation
✅ Historical data preserved
✅ Single source of truth for designs

---

**Ready to execute!** Start with Step 1 (2_1_FIX_UNIQUE_CONSTRAINT.sql)
