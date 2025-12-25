# Stock Tracking Pattern Analysis
**Question:** Is SCD Type 2 appropriate for material_stock table?
**Answer:** NO - We need an Inventory Ledger pattern instead

---

## ❌ Why SCD Type 2 is WRONG Here

### SCD Type 2 Definition:
Tracks **historical changes** to a **single entity**

**Example (Appropriate Use):**
```sql
-- Customer Address (SCD Type 2)
customer_addresses:
  id=1, customer_id=100, address='Old Address', is_active=FALSE, effective_to='2024-12-01'
  id=2, customer_id=100, address='New Address', is_active=TRUE, effective_to=NULL

ONE customer, DIFFERENT addresses over time
```

### Our Stock Scenario:
```sql
-- Material Stock (NOT SCD Type 2!)
material_stock:
  id=1, customer_id=100, material='SAREE', stage='received', qty=20, is_active=TRUE
  id=2, customer_id=100, material='SAREE', stage='preprocessing', qty=25, is_active=TRUE
  id=3, customer_id=100, material='SAREE', stage='printing', qty=5, is_active=TRUE

SAME customer, SAME material, MULTIPLE ACTIVE RECORDS at different stages
This is INVENTORY FLOW, not entity versioning!
```

### Key Differences:

| Aspect | SCD Type 2 | Our Stock |
|--------|------------|-----------|
| Active Records | 1 active record per entity | Multiple active records |
| Relationship | 1 entity → many versions | 1 batch → many portions |
| Time Tracking | Version history | Movement history |
| Primary Use | Attribute changes | Quantity movements |

---

## ✅ Correct Pattern: **Inventory Transaction Log**

### What We Actually Have:

**Pattern Name:** Inventory Ledger with Current State Snapshot
**Similar To:** Accounting General Ledger (debits/credits)

### Current Table Design:

```sql
material_stock (
  id UUID PRIMARY KEY,              -- Unique stock record
  customer_id UUID,                 -- Who owns it
  order_id UUID,                    -- Which order
  material_type VARCHAR,            -- SAREE, DUPATTA, etc.
  stage VARCHAR,                    -- Where in pipeline
  quantity INTEGER,                 -- How much
  ownership VARCHAR,                -- customer/self
  is_active BOOLEAN,                -- Current vs Historical
  created_at TIMESTAMP,             -- When created
  updated_at TIMESTAMP              -- When modified
)
```

### What Each Record Represents:

**NOT:** A version of the same entity
**BUT:** A separate batch/lot of material at a specific stage at a point in time

---

## 🎯 Recommended Enhancement: Add Batch Tracking

### Option 1: Add Batch/Lot Tracking (RECOMMENDED)

```sql
ALTER TABLE material_stock ADD COLUMN batch_id UUID;
ALTER TABLE material_stock ADD COLUMN parent_stock_id UUID REFERENCES material_stock(id);
ALTER TABLE material_stock ADD COLUMN movement_type VARCHAR;

-- Indexes
CREATE INDEX idx_material_stock_batch ON material_stock(batch_id);
CREATE INDEX idx_material_stock_parent ON material_stock(parent_stock_id);
```

**Columns Explained:**

| Column | Purpose | Example |
|--------|---------|---------|
| `batch_id` | Groups related stock portions | All stock from same receipt batch |
| `parent_stock_id` | Tracks lineage (where did this come from) | Record #3 came from Record #1 |
| `movement_type` | Why was this created | 'initial_receipt', 'movement', 'split', 'merge' |

**Example Flow:**

```sql
-- Initial Receipt
INSERT INTO material_stock (
  id, batch_id, parent_stock_id, stage, quantity, movement_type, is_active
) VALUES (
  'rec-1', 'batch-A', NULL, 'received', 50, 'initial_receipt', TRUE
);

-- Move 30 to preprocessing
-- Step 1: Mark original as historical
UPDATE material_stock SET is_active = FALSE WHERE id = 'rec-1';

-- Step 2: Create remainder record
INSERT INTO material_stock (
  id, batch_id, parent_stock_id, stage, quantity, movement_type, is_active
) VALUES (
  'rec-2', 'batch-A', 'rec-1', 'received', 20, 'split_remainder', TRUE
);

-- Step 3: Create moved record
INSERT INTO material_stock (
  id, batch_id, parent_stock_id, stage, quantity, movement_type, is_active
) VALUES (
  'rec-3', 'batch-A', 'rec-1', 'preprocessing', 30, 'moved_from_received', TRUE
);
```

**Result:**
```
material_stock:
  rec-1: 50 received, is_active=FALSE (historical)
  rec-2: 20 received, is_active=TRUE, parent=rec-1 (current)
  rec-3: 30 preprocessing, is_active=TRUE, parent=rec-1 (current)
```

**Query Current Stock by Stage:**
```sql
SELECT stage, SUM(quantity)
FROM material_stock
WHERE customer_id = ?
  AND material_type = 'SAREE'
  AND is_active = TRUE
GROUP BY stage;
```

**Query Lineage (Where did stock come from):**
```sql
WITH RECURSIVE lineage AS (
  -- Start with current record
  SELECT id, parent_stock_id, stage, quantity, movement_type, 1 as level
  FROM material_stock
  WHERE id = 'rec-3'

  UNION ALL

  -- Recursively find parents
  SELECT ms.id, ms.parent_stock_id, ms.stage, ms.quantity, ms.movement_type, l.level + 1
  FROM material_stock ms
  JOIN lineage l ON ms.id = l.parent_stock_id
)
SELECT * FROM lineage ORDER BY level;

-- Result: Shows rec-3 came from rec-1
```

---

## 🔄 Alternative Pattern: Two-Table Approach

### Option 2: Separate Current and History

```sql
-- Current stock (no history)
material_stock_current (
  id UUID PRIMARY KEY,
  customer_id UUID,
  material_type VARCHAR,
  stage VARCHAR,
  quantity INTEGER,
  is_active BOOLEAN DEFAULT TRUE
);

-- Complete movement history
material_stock_movements (
  id UUID PRIMARY KEY,
  from_stock_id UUID,
  to_stock_id UUID,
  movement_type VARCHAR,
  quantity_moved INTEGER,
  from_stage VARCHAR,
  to_stage VARCHAR,
  moved_at TIMESTAMP
);
```

**Pros:**
- Clear separation of current vs history
- Current table is small and fast
- History table has complete audit trail

**Cons:**
- More complex queries (need to JOIN)
- Need to maintain consistency between tables
- More application logic

---

## 📊 Recommended Solution

### Keep Current Design + Add These Columns:

```sql
ALTER TABLE material_stock ADD COLUMN batch_id UUID;
ALTER TABLE material_stock ADD COLUMN parent_stock_id UUID REFERENCES material_stock(id);
ALTER TABLE material_stock ADD COLUMN movement_type VARCHAR CHECK (movement_type IN (
  'initial_receipt',
  'moved',
  'split_remainder',
  'quality_check',
  'merged',
  'returned',
  'delivered'
));
ALTER TABLE material_stock ADD COLUMN moved_at TIMESTAMP;

-- Update existing records
UPDATE material_stock SET batch_id = gen_random_uuid() WHERE batch_id IS NULL;
UPDATE material_stock SET movement_type = 'initial_receipt' WHERE movement_type IS NULL;
UPDATE material_stock SET moved_at = created_at WHERE moved_at IS NULL;

-- Create indexes
CREATE INDEX idx_material_stock_batch ON material_stock(batch_id);
CREATE INDEX idx_material_stock_parent ON material_stock(parent_stock_id);
CREATE INDEX idx_material_stock_active_stage ON material_stock(is_active, stage) WHERE is_active = TRUE;
```

---

## 🎯 Primary Key Strategy

### Current Primary Key: ✅ CORRECT

```sql
PRIMARY KEY: id (UUID)
```

**Why this is right:**
- Each record is a UNIQUE stock lot/batch
- Can have multiple active records for same customer+material+stage
- Different batches, different movements

### Natural Key (for uniqueness):

**WRONG:**
```sql
UNIQUE(customer_id, material_type, stage, is_active)
-- Problem: Can't have 2 batches in same stage!
```

**CORRECT:**
```sql
-- No natural key constraint needed!
-- Multiple records CAN exist for same customer+material+stage
-- They represent different batches/lots
```

**Uniqueness is ensured by:**
- Each record has unique `id` (UUID)
- Each record can optionally link to `parent_stock_id`
- `batch_id` groups related records

---

## 📝 Updated Schema

```sql
CREATE TABLE material_stock (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership & Order
  customer_id UUID NOT NULL REFERENCES customers(id),
  order_id UUID REFERENCES orders(id),

  -- Material Info
  material_type VARCHAR(50) NOT NULL,
  stage VARCHAR(50) NOT NULL CHECK (stage IN (
    'received', 'preprocessing', 'printing', 'postprocessing',
    'completed', 'misprint', 'damaged', 'delivered'
  )),
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  ownership VARCHAR(20) DEFAULT 'customer' CHECK (ownership IN ('customer', 'self')),

  -- Batch & Lineage Tracking (NEW)
  batch_id UUID,                           -- Groups related stock
  parent_stock_id UUID REFERENCES material_stock(id),  -- Where it came from
  movement_type VARCHAR(50) CHECK (movement_type IN (
    'initial_receipt', 'moved', 'split_remainder',
    'quality_check', 'merged', 'returned', 'delivered'
  )),

  -- State Tracking
  is_active BOOLEAN DEFAULT TRUE,          -- Current vs Historical
  moved_at TIMESTAMP DEFAULT NOW(),        -- When this movement happened

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_material_stock_customer ON material_stock(customer_id);
CREATE INDEX idx_material_stock_order ON material_stock(order_id);
CREATE INDEX idx_material_stock_batch ON material_stock(batch_id);
CREATE INDEX idx_material_stock_parent ON material_stock(parent_stock_id);
CREATE INDEX idx_material_stock_active ON material_stock(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_material_stock_active_stage ON material_stock(customer_id, material_type, stage, is_active) WHERE is_active = TRUE;
```

---

## ✅ Summary

### This is NOT SCD Type 2 because:
1. ❌ Not tracking versions of a single entity
2. ❌ Multiple active records are normal
3. ❌ Stock splits and flows, doesn't "change state"

### This IS Inventory Transaction Log because:
1. ✅ Tracks inventory movements
2. ✅ Preserves complete audit trail
3. ✅ Supports splits and merges
4. ✅ Multiple batches can be active simultaneously

### Primary Key:
- ✅ `id UUID` is correct
- ✅ No natural key constraint needed
- ✅ Each record is a unique batch/lot

### Recommended Additions:
1. `batch_id` - Group related stock
2. `parent_stock_id` - Track lineage
3. `movement_type` - Why was this created
4. `moved_at` - When did movement happen

---

**Pattern Name:** Inventory Ledger with Batch Tracking
**NOT:** SCD Type 2
