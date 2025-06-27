# Complete Database Schema Fix for JBMS

## Analysis Results
Our remote schema analysis revealed these specific issues:

1. ❌ **Orders table**: Missing `order_number` column or auto-generation logic
2. ❌ **Material_in table**: Missing `customer_id` column  
3. ❌ **Material_out table**: Missing `customer_id` column
4. ❌ **Inventory table**: Supplier field mapping issues
5. ❌ **Expenses API**: Not deployed yet

## Required Database Schema Changes

### 1. Add Missing Columns

```sql
-- Add order_number column to orders table (if missing)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number VARCHAR(50) UNIQUE;

-- Add challan_number column to delivery_challans table (if missing)  
ALTER TABLE delivery_challans ADD COLUMN IF NOT EXISTS challan_number VARCHAR(50) UNIQUE;

-- Add invoice_number column to gst_invoices table (if missing)
ALTER TABLE gst_invoices ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50) UNIQUE;

-- Add customer_id to material_in table
ALTER TABLE material_in ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

-- Add customer_id to material_out table
ALTER TABLE material_out ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
```

### 2. Populate Missing Data

```sql
-- Generate order numbers for existing orders without them
UPDATE orders 
SET order_number = 'ORD-' || EXTRACT(YEAR FROM order_date) || '-' || 
    LPAD((ROW_NUMBER() OVER (ORDER BY created_at))::text, 4, '0')
WHERE order_number IS NULL;

-- Generate challan numbers for existing challans without them
UPDATE delivery_challans 
SET challan_number = 'CH-' || EXTRACT(YEAR FROM challan_date) || '-' || 
    LPAD((ROW_NUMBER() OVER (ORDER BY created_at))::text, 4, '0')
WHERE challan_number IS NULL;

-- Generate invoice numbers for existing invoices without them
UPDATE gst_invoices 
SET invoice_number = 'INV-' || EXTRACT(YEAR FROM invoice_date) || '-' || 
    LPAD((ROW_NUMBER() OVER (ORDER BY created_at))::text, 4, '0')
WHERE invoice_number IS NULL;

-- Link customer_id in material_in from orders
UPDATE material_in 
SET customer_id = orders.customer_id 
FROM orders 
WHERE material_in.order_id = orders.id 
AND material_in.customer_id IS NULL;

-- Link customer_id in material_out from delivery challans
UPDATE material_out 
SET customer_id = delivery_challans.customer_id 
FROM delivery_challans 
WHERE material_out.challan_id = delivery_challans.id 
AND material_out.customer_id IS NULL;
```

### 3. Add Constraints

```sql
-- Make order_number NOT NULL after populating
ALTER TABLE orders ALTER COLUMN order_number SET NOT NULL;

-- Make challan_number NOT NULL after populating  
ALTER TABLE delivery_challans ALTER COLUMN challan_number SET NOT NULL;

-- Make invoice_number NOT NULL after populating
ALTER TABLE gst_invoices ALTER COLUMN invoice_number SET NOT NULL;
```

## Complete Migration Script

Create and run this SQL script on the production database:

```sql
-- JBMS Complete Schema Migration
-- Run after deploying the backend code changes

BEGIN;

-- 1. Add missing columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number VARCHAR(50);
ALTER TABLE delivery_challans ADD COLUMN IF NOT EXISTS challan_number VARCHAR(50);
ALTER TABLE gst_invoices ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50);
ALTER TABLE material_in ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
ALTER TABLE material_out ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

-- 2. Populate missing order numbers
UPDATE orders 
SET order_number = 'ORD-' || EXTRACT(YEAR FROM COALESCE(order_date, created_at)) || '-' || 
    LPAD((ROW_NUMBER() OVER (ORDER BY created_at))::text, 4, '0')
WHERE order_number IS NULL OR order_number = '';

-- 3. Populate missing challan numbers
UPDATE delivery_challans 
SET challan_number = 'CH-' || EXTRACT(YEAR FROM COALESCE(challan_date, created_at)) || '-' || 
    LPAD((ROW_NUMBER() OVER (ORDER BY created_at))::text, 4, '0')
WHERE challan_number IS NULL OR challan_number = '';

-- 4. Populate missing invoice numbers
UPDATE gst_invoices 
SET invoice_number = 'INV-' || EXTRACT(YEAR FROM COALESCE(invoice_date, created_at)) || '-' || 
    LPAD((ROW_NUMBER() OVER (ORDER BY created_at))::text, 4, '0')
WHERE invoice_number IS NULL OR invoice_number = '';

-- 5. Link customer_id in material_in
UPDATE material_in 
SET customer_id = orders.customer_id 
FROM orders 
WHERE material_in.order_id = orders.id 
AND material_in.customer_id IS NULL;

-- 6. Link customer_id in material_out
UPDATE material_out 
SET customer_id = delivery_challans.customer_id 
FROM delivery_challans 
WHERE material_out.challan_id = delivery_challans.id 
AND material_out.customer_id IS NULL;

-- 7. Add constraints
ALTER TABLE orders ALTER COLUMN order_number SET NOT NULL;
ALTER TABLE delivery_challans ALTER COLUMN challan_number SET NOT NULL;
ALTER TABLE gst_invoices ALTER COLUMN invoice_number SET NOT NULL;

-- 8. Add unique constraints
ALTER TABLE orders ADD CONSTRAINT IF NOT EXISTS orders_order_number_unique UNIQUE (order_number);
ALTER TABLE delivery_challans ADD CONSTRAINT IF NOT EXISTS challans_challan_number_unique UNIQUE (challan_number);
ALTER TABLE gst_invoices ADD CONSTRAINT IF NOT EXISTS invoices_invoice_number_unique UNIQUE (invoice_number);

-- 9. Verify changes
SELECT 
    'orders' as table_name,
    COUNT(*) as total_records,
    COUNT(order_number) as records_with_number
FROM orders
UNION ALL
SELECT 
    'delivery_challans' as table_name,
    COUNT(*) as total_records,
    COUNT(challan_number) as records_with_number
FROM delivery_challans
UNION ALL
SELECT 
    'gst_invoices' as table_name,
    COUNT(*) as total_records,
    COUNT(invoice_number) as records_with_number
FROM gst_invoices
UNION ALL
SELECT 
    'material_in' as table_name,
    COUNT(*) as total_records,
    COUNT(customer_id) as records_with_customer_id
FROM material_in
UNION ALL
SELECT 
    'material_out' as table_name,
    COUNT(*) as total_records,
    COUNT(customer_id) as records_with_customer_id
FROM material_out;

COMMIT;
```

## Deployment Order

1. **Deploy Backend Code First**
   ```bash
   git add .
   git commit -m "feat: complete functional requirements implementation"
   git push origin main
   ```

2. **Wait for Deployment to Complete** (5-10 minutes)

3. **Run Database Migration Script** 
   - Connect to production database
   - Run the complete migration script above

4. **Restart Application** (if needed)
   - Force restart on Render.com if endpoints don't appear

5. **Verify Functionality**
   ```bash
   python test_api_functionality.py
   python remote_schema_check.py
   ```

## Expected Results After Fix

All these should work:
- ✅ Order creation with auto-generated order numbers (ORD-YYYY-NNNN)
- ✅ Material tracking with customer linking
- ✅ Inventory creation and management
- ✅ Expense recording and reporting
- ✅ Challan creation with auto-generated numbers
- ✅ Invoice creation with auto-generated numbers

## Verification Queries

After running the migration, verify with these queries:

```sql
-- Check order numbers
SELECT order_number, customer_id, created_at FROM orders LIMIT 5;

-- Check material linking
SELECT m.id, m.material_type, m.customer_id, c.name 
FROM material_in m 
LEFT JOIN customers c ON m.customer_id = c.id 
LIMIT 5;

-- Check all number formats
SELECT 
    'Order samples' as type,
    string_agg(order_number, ', ') as examples
FROM (SELECT order_number FROM orders LIMIT 3) t
UNION ALL
SELECT 
    'Challan samples' as type,
    string_agg(challan_number, ', ') as examples  
FROM (SELECT challan_number FROM delivery_challans LIMIT 3) t
UNION ALL
SELECT 
    'Invoice samples' as type,
    string_agg(invoice_number, ', ') as examples
FROM (SELECT invoice_number FROM gst_invoices LIMIT 3) t;
``` 