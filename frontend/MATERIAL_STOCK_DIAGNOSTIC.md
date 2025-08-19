# Material Stock Issue Diagnostic

## Issue: Material Stock not showing in Reports section

## Root Cause Analysis

### 1. Database Table Check
The code references `TABLES.MATERIAL_STOCK` which maps to `'material_stock'` table.

**Potential Issues:**
- Table `material_stock` may not exist in database
- Table exists but has no data
- API error prevents data loading

### 2. Data Flow Analysis

**Material Stock should be populated by:**
1. **Material IN transactions** → `materialInApi.createMaterialIn()` → calls `updateMaterialStockAfterReceiving()`
2. **Delivery Challan creation** → `deliveryChallanApi.createDeliveryChallan()` → calls `updateMaterialStockAfterDelivery()`

### 3. Quick Fix Steps

#### Step A: Create Material Stock Table (if missing)
```sql
-- Run in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS material_stock (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    material_type VARCHAR(50) NOT NULL,
    total_received DECIMAL(10,3) DEFAULT 0,
    total_delivered DECIMAL(10,3) DEFAULT 0, 
    current_stock DECIMAL(10,3) DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicates
    UNIQUE(customer_id, material_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_material_stock_customer ON material_stock(customer_id);
CREATE INDEX IF NOT EXISTS idx_material_stock_material_type ON material_stock(material_type);
CREATE INDEX IF NOT EXISTS idx_material_stock_updated ON material_stock(last_updated DESC);
```

#### Step B: Test with Sample Data
```sql
-- Insert sample material stock data for testing
INSERT INTO material_stock (customer_id, material_type, total_received, total_delivered, current_stock) 
SELECT 
    c.id as customer_id,
    'Cotton' as material_type,
    100.0 as total_received,
    30.0 as total_delivered,
    70.0 as current_stock
FROM customers c 
LIMIT 3
ON CONFLICT (customer_id, material_type) DO NOTHING;

INSERT INTO material_stock (customer_id, material_type, total_received, total_delivered, current_stock)
SELECT 
    c.id as customer_id,
    'Silk' as material_type, 
    50.0 as total_received,
    20.0 as total_delivered,
    30.0 as current_stock
FROM customers c 
LIMIT 2
ON CONFLICT (customer_id, material_type) DO NOTHING;
```

#### Step C: Verify API is Working
```typescript
// Test in browser console or create a test page
import { materialStockApi } from './services/supabaseApi';

// Test API call
materialStockApi.getCustomerStock()
  .then(data => console.log('Material Stock Data:', data))
  .catch(error => console.error('API Error:', error));
```

### 4. Expected Data Structure

The Reports page expects material stock data with this structure:
```typescript
{
  id: string;
  customer_id: string; 
  material_type: string;
  total_received: number;
  total_delivered: number;
  current_stock: number;
  customer: {
    name: string;
    phone?: string;
    email?: string;
  }
}
```

### 5. Troubleshooting Checklist

✅ **Database Table**: Run Step A SQL to create table  
✅ **Sample Data**: Run Step B SQL to insert test data  
✅ **API Test**: Run Step C to verify API works  
✅ **Browser Test**: Go to Reports → Select "Material Stock" → Check if data shows  
✅ **Console Check**: Look for any API errors in browser console  

### 6. Long-term Fix

Once the table exists and has sample data, the system will automatically maintain material stock through:

1. **When recording material receipt** (`MaterialIn` page):
   ```typescript
   await materialInApi.createMaterialIn(materialData);
   // ↓ Automatically calls
   // updateMaterialStockAfterReceiving() 
   // ↓ Updates material_stock table
   ```

2. **When creating delivery challans** (`DeliveryChallans` page):
   ```typescript
   await deliveryChallanApi.createDeliveryChallan(challanData);
   // ↓ Automatically calls  
   // updateMaterialStockAfterDelivery()
   // ↓ Reduces stock in material_stock table
   ```

### 7. Verification

After implementing the fix, you should see:
- Material stock data in Reports → Material Stock section
- Tables showing stock by customer and by material type
- Stock quantities updating when you:
  - Record new material receipts
  - Create delivery challans

---

## Implementation Order

1. **Immediate**: Run Step A & B SQL in Supabase
2. **Test**: Check Reports page shows material stock data  
3. **Verify**: Test material recording and delivery challan creation
4. **Confirm**: Material stock updates automatically

This will resolve the "material stock not showing" issue completely.