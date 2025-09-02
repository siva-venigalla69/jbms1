# Customer Stock Management Logic

## Overview

The customer stock system tracks materials that belong to customers but are stored at your facility. This is common in textile printing where customers provide raw materials (fabric, paper, etc.) that get processed and returned as finished products.

## 📊 Stock Calculation Formula

```
current_stock = total_received - total_delivered
```

- **total_received**: Sum of all materials received from customer
- **total_delivered**: Sum of all materials delivered back to customer  
- **current_stock**: Materials currently in your facility

## 🔄 Stock Flow Process

### 1. Material Receipt (Increases Stock)
When materials are received from customers:

```sql
-- materials_in table gets new record
INSERT INTO material_in (
    customer_id, 
    material_type, 
    quantity, 
    received_date
);

-- material_stock table gets updated
UPDATE material_stock SET
    total_received = total_received + quantity,
    current_stock = total_received - total_delivered
WHERE customer_id = ? AND material_type = ?;
```

### 2. Delivery Challan Creation (Decreases Stock)
When a delivery challan is created, the system:

#### Step 1: Extract Material Information
```javascript
// For each delivery item in the challan
for (const item of deliveryItems) {
    // Get material type from order_items table
    const { data: orderItem } = await supabase
        .from('order_items')
        .select('material_type')
        .eq('id', item.order_item_id)
        .single();
    
    const materialType = orderItem.material_type;
    const quantity = item.quantity_delivered;
    
    // Group by material type
    materialSummary[materialType] = (materialSummary[materialType] || 0) + quantity;
}
```

#### Step 2: Update Stock for Each Material Type
```javascript
for (const [materialType, quantityDelivered] of Object.entries(materialSummary)) {
    // Get current stock record
    const { data: stockRecord } = await supabase
        .from('material_stock')
        .select('*')
        .eq('customer_id', customerId)
        .eq('material_type', materialType)
        .single();

    if (stockRecord) {
        // Update existing stock record
        const newTotalDelivered = stockRecord.total_delivered + quantityDelivered;
        const newCurrentStock = stockRecord.total_received - newTotalDelivered;

        await supabase
            .from('material_stock')
            .update({
                total_delivered: newTotalDelivered,
                current_stock: newCurrentStock,
                last_updated: new Date().toISOString()
            })
            .eq('id', stockRecord.id);
    } else {
        // Create new record (over-delivery scenario)
        await supabase
            .from('material_stock')
            .insert({
                customer_id: customerId,
                material_type: materialType,
                total_received: 0,
                total_delivered: quantityDelivered,
                current_stock: -quantityDelivered, // Negative stock
                last_updated: new Date().toISOString()
            });
    }
}
```

## 📋 Database Schema

### material_stock Table
```sql
CREATE TABLE material_stock (
    id UUID PRIMARY KEY,
    customer_id UUID REFERENCES customers(id),
    material_type VARCHAR(100),
    total_received DECIMAL(10,2) DEFAULT 0,
    total_delivered DECIMAL(10,2) DEFAULT 0,
    current_stock DECIMAL(10,2) DEFAULT 0,
    last_updated TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(customer_id, material_type)
);
```

### Supporting Tables
```sql
-- Material receipts
CREATE TABLE material_in (
    id UUID PRIMARY KEY,
    customer_id UUID REFERENCES customers(id),
    material_type VARCHAR(100),
    quantity DECIMAL(10,2),
    received_date DATE,
    supplier_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Delivery items (linked to order items)
CREATE TABLE delivery_challan_items (
    id UUID PRIMARY KEY,
    challan_id UUID REFERENCES delivery_challans(id),
    order_item_id UUID REFERENCES order_items(id),
    quantity DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 🎯 Stock Status Scenarios

### Scenario 1: Normal Operations
- **Received**: 100 units of Cotton Fabric
- **Delivered**: 80 units of Cotton Fabric  
- **Current Stock**: 20 units (stored at your facility)
- **Status**: ✅ Normal

### Scenario 2: Over-Delivery
- **Received**: 50 units of Silk Fabric
- **Delivered**: 70 units of Silk Fabric
- **Current Stock**: -20 units (customer owes you material)
- **Status**: ⚠️ Over-delivered

### Scenario 3: No Stock Record
- **Received**: 0 units (no material_in record)
- **Delivered**: 30 units (delivery challan created)
- **Current Stock**: -30 units (created automatically)
- **Status**: ⚠️ Over-delivered (no prior receipt)

## 🔍 Current Stock Query

### Using material_stock Table (Preferred)
```javascript
const { data } = await supabase
    .from('material_stock')
    .select(`
        *,
        customer:customers(name, phone, email)
    `)
    .eq('customer_id', customerId)
    .order('last_updated', { ascending: false });
```

### Dynamic Calculation (Fallback)
```javascript
// Get all material receipts
const materialInData = await supabase
    .from('material_in')
    .select('customer_id, material_type, quantity')
    .eq('customer_id', customerId);

// Get all deliveries
const deliveryData = await supabase
    .from('delivery_challan_items')
    .select(`
        quantity,
        challan:delivery_challans!inner(customer_id),
        order_item:order_items(material_type)
    `);

// Calculate stock dynamically
const stockMap = {};
materialInData.forEach(record => {
    const key = `${record.customer_id}-${record.material_type}`;
    stockMap[key] = stockMap[key] || { total_received: 0, total_delivered: 0 };
    stockMap[key].total_received += record.quantity;
});

deliveryData.forEach(record => {
    if (record.challan?.customer_id === customerId) {
        const key = `${record.challan.customer_id}-${record.order_item.material_type}`;
        stockMap[key] = stockMap[key] || { total_received: 0, total_delivered: 0 };
        stockMap[key].total_delivered += record.quantity;
    }
});

// Calculate current stock
Object.values(stockMap).forEach(stock => {
    stock.current_stock = stock.total_received - stock.total_delivered;
});
```

## ⚡ API Endpoints for Stock Management

### Get Customer Stock
```javascript
// Get all customer stock
const allStock = await materialStockApi.getCustomerStock();

// Get specific customer stock
const customerStock = await materialStockApi.getCustomerStock(customerId);
```

### Stock Operations
```javascript
// Receive material (increases stock)
await materialInApi.createMaterialIn({
    customer_id: customerId,
    material_type: 'Cotton Fabric',
    quantity: 100,
    received_date: '2025-01-15'
});

// Create delivery challan (decreases stock)
await deliveryChallanApi.createDeliveryChallan({
    customer_id: customerId,
    items: [{
        order_item_id: orderItemId,
        quantity_delivered: 50
    }]
});
```

## 📊 Stock Reporting Features

### Low Stock Alerts
```javascript
const lowStockItems = stockData.filter(item => 
    item.current_stock > 0 && item.current_stock < 10
);
```

### Over-Delivery Detection
```javascript
const overDeliveredItems = stockData.filter(item => 
    item.current_stock < 0
);
```

### Stock Aging Analysis
```javascript
const stagnantStock = stockData.filter(item => {
    const daysSinceUpdate = (Date.now() - new Date(item.last_updated)) / (1000 * 60 * 60 * 24);
    return item.current_stock > 0 && daysSinceUpdate > 90;
});
```

## 🛠️ How to View Current Stock

1. **Navigate to Customer Stock page** (`/customer-stock`)
2. **Or use the CustomerStockDemo component** for detailed view
3. **Or check the Advanced Dashboard** for stock summary

The system automatically tracks all stock movements and provides real-time visibility into what materials you're holding for each customer.

## 🔧 Troubleshooting

### Stock Discrepancies
If stock levels don't match physical inventory:

1. Use the stock reconciliation function
2. Check for missing material_in records
3. Verify delivery challan items are correctly linked to order items
4. Look for manual adjustments needed

### Negative Stock
Negative stock indicates over-delivery and may require:

1. Recording missing material receipts
2. Customer credit for excess delivery
3. Stock adjustment entries

The system is designed to handle these scenarios gracefully and provide clear visibility into all stock movements.