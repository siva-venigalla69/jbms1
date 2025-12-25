# Is SCD Type 2 Appropriate for Material Stock?

## ❌ Short Answer: **NO**

SCD Type 2 is **NOT the right pattern** for inventory/stock tracking.

---

## 🤔 Why You Thought It Was SCD Type 2

You observed:
- ✅ We're tracking history (`is_active` flag)
- ✅ Old records marked inactive, new records created
- ✅ Looks like versioning

**Reasonable assumption!** But let's see why it's different...

---

## 📊 Key Difference: SCD Type 2 vs Inventory Tracking

### SCD Type 2 Example (Customer Address):

```
ONE ENTITY changing over time:

Record #1: customer_id=100, address='Old Address', is_active=FALSE
Record #2: customer_id=100, address='New Address', is_active=TRUE

Only ONE active record at a time (same entity, different versions)
```

### Our Stock Scenario:

```
MULTIPLE ENTITIES active simultaneously:

Record #1: customer_id=100, material='SAREE', stage='received', qty=20, is_active=TRUE
Record #2: customer_id=100, material='SAREE', stage='preprocessing', qty=25, is_active=TRUE
Record #3: customer_id=100, material='SAREE', stage='printing', qty=5, is_active=TRUE

MULTIPLE active records at same time (different batches/lots in different stages)
```

**This is FLOW not VERSIONING!**

---

## 🎯 What Pattern IS This?

**Pattern Name:** **Inventory Transaction Log with Batch Tracking**

Similar to:
- Accounting General Ledger (debits/credits)
- Event Sourcing
- Warehouse Management Systems (WMS)

---

## 🔑 Primary Key Answer

### Your Question:
> "What is the primary key for SCD Type 2?"

### Answer:

**Current Primary Key: ✅ CORRECT**
```sql
PRIMARY KEY: id (UUID)
```

**Why this is right:**
- Each record = unique stock lot/batch
- Can have multiple active records for same customer+material+stage
- They're **different batches**, not versions

**Natural Key:**
```sql
-- NO natural key constraint needed!
-- Multiple records CAN exist for same customer+material+stage
```

**Example:**
```
Batch A: 20 SAREE in 'printing' (active)
Batch B: 30 SAREE in 'printing' (active)  ← Both valid!

They came from different receipts, different times
```

---

## ✅ Recommended Enhancements

I've created script **6_ADD_BATCH_TRACKING_COLUMNS.sql** which adds:

### New Columns:

| Column | Purpose | Example |
|--------|---------|---------|
| `batch_id` | Groups related stock from same receipt | UUID linking all portions |
| `parent_stock_id` | Tracks where stock came from | Record #3 came from Record #1 |
| `movement_type` | Why was this created | 'moved', 'split_remainder', 'quality_check' |
| `moved_at` | When did movement happen | '2025-12-22 10:30:00' |

### Benefits:

1. **Batch Tracking:**
   ```sql
   SELECT * FROM material_stock WHERE batch_id = 'abc-123';
   -- Shows all portions of the same original batch
   ```

2. **Lineage Tracking:**
   ```sql
   SELECT * FROM v_stock_lineage WHERE id = 'current-record-id';
   -- Shows complete history: where it came from, how it split
   ```

3. **Movement Audit:**
   ```sql
   SELECT movement_type, COUNT(*), SUM(quantity)
   FROM material_stock
   WHERE customer_id = ?
   GROUP BY movement_type;
   -- Shows: 10 received, 5 moved, 2 quality_check_fail
   ```

---

## 📋 Comparison Table

| Aspect | SCD Type 2 | Our Stock Pattern |
|--------|------------|-------------------|
| **Pattern Name** | Slowly Changing Dimension | Inventory Transaction Log |
| **Purpose** | Version history of entity attributes | Track inventory flow/movements |
| **Active Records** | 1 active per entity | Multiple active (different batches) |
| **Primary Key** | Surrogate key (id) | Surrogate key (id) ✅ Same! |
| **Natural Key** | Business key + effective_from | None needed |
| **Typical Columns** | effective_from, effective_to | batch_id, parent_stock_id, movement_type |
| **Use Case** | Customer address changes | Material flowing through stages |
| **Query Pattern** | "What was X on date Y?" | "What's current stock in stage Z?" |

---

## 🎯 Final Answer

### To Your Questions:

1. **"Is SCD Type 2 relevant here?"**
   - **NO** - This is Inventory Transaction Log pattern

2. **"What is the primary key?"**
   - **`id UUID`** ✅ Correct as-is
   - No natural key constraint needed
   - Multiple active records per customer+material+stage is NORMAL

3. **"Any better suggestion?"**
   - ✅ Keep current `id` as primary key
   - ✅ Add `batch_id` to group related stock
   - ✅ Add `parent_stock_id` to track lineage
   - ✅ Add `movement_type` to classify movements
   - ✅ Add `moved_at` for accurate timestamp

---

## 🚀 Next Steps

Run this script to add batch tracking:
```
6_ADD_BATCH_TRACKING_COLUMNS.sql
```

**What it does:**
- Adds 4 new columns (batch_id, parent_stock_id, movement_type, moved_at)
- Updates `move_stock_to_stage()` function to populate them
- Creates `v_stock_lineage` view for lineage queries
- Populates existing records with defaults

**Time:** ~2 minutes
**Safe:** 100% rerunnable

---

## 📖 Documentation

Full analysis in:
- `STOCK_TRACKING_PATTERN_ANALYSIS.md` - Detailed pattern analysis
- `STOCK_AND_DESIGN_LOGIC_EXPLAINED.md` - Business logic explanation

---

**Summary:**
- ❌ NOT SCD Type 2 (that's for attribute versioning)
- ✅ IS Inventory Transaction Log (for flow tracking)
- ✅ Primary Key `id UUID` is correct
- ✅ No natural key constraint needed
- ✅ Enhancement script ready to add batch tracking

