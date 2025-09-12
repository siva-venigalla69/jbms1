# Design Tracking System Architecture
## JBMS Digital Textile Printing Management System

**Generated**: 2025-09-12  
**System Version**: 2.0  
**Database Schema**: 2-Column Migration Approach

---

## System Overview

The Design Tracking System manages the end-to-end workflow of design approval and production stages for digital textile printing orders. It tracks the progression from customer design submission through production completion.

---

## Architecture Components

### 1. Database Layer

#### Core Tables
```sql
-- Primary table for tracking design and production status
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id),
    material_type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    
    -- New 2-column approach (v2.0)
    design_status TEXT DEFAULT 'pending_from_customer',
    production_status TEXT DEFAULT 'pending', 
    design_file_url TEXT,
    design_notes TEXT,
    
    -- Legacy columns (deprecated but supported)
    customization_details TEXT,
    current_stage TEXT,
    design_received BOOLEAN,
    design_ready BOOLEAN,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Design Status Workflow
```
pending_from_customer → design_received_from_customer → design_ready
```

#### Production Status Workflow  
```
pending → pre_treatment → printing → post_process
```

### 2. Backend API Layer

#### File: `/home/siva/sandboxes/jbms1/frontend/src/services/supabaseApi.ts`

**Key Methods**:

```typescript
// Design Status Management
orderItemApi.updateDesignStatus(
    id: string, 
    designStatus: DesignStatus, 
    designData?: {
        design_file_url?: string;
        design_notes?: string;
    }
): Promise<OrderItem>

// Production Status Management  
orderItemApi.updateProductionStatus(
    id: string, 
    productionStatus: ProductionStatus
): Promise<OrderItem>

// Query Methods
orderItemApi.getProductionStatus(): Promise<OrderItem[]>
businessHelpers.production.getProductionStatus(): Promise<OrderItem[]>
```

**Error Handling Strategy**:
1. **Primary**: Update new columns (`design_status`, `production_status`)
2. **Fallback**: Update `customization_details` with parsed format if columns don't exist
3. **Logging**: Comprehensive console and API logging for debugging

### 3. Frontend Layer

#### File: `/home/siva/sandboxes/jbms1/frontend/src/pages/Production.tsx`

**Key Components**:
- Production data loading and display
- Status filtering and search functionality  
- Design update dialog
- Production status update dialog
- Progress tracking and visualization

**State Management**:
```typescript
const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
const [designStatusFilter, setDesignStatusFilter] = useState<DesignStatus | 'all'>('all');
const [productionStatusFilter, setProductionStatusFilter] = useState<ProductionStatus | 'all'>('all');
```

#### File: `/home/siva/sandboxes/jbms1/frontend/src/utils/productionUtils.ts`

**Parsing Utilities**:
```typescript
// Multi-source design status parsing
parseDesignStatus(customization_details?: string, item?: any): DesignStatus

// Multi-source production status parsing  
parseProductionStatus(customization_details?: string, item?: any): ProductionStatus

// Item filtering by status combinations
filterItemsByStatusCriteria(items: OrderItem[], filters: StageStockFilter): OrderItem[]
```

---

## Design Tracking Workflow

### 1. Order Creation
```
Customer Order → Order Items Created → Initial Status: design_status='pending_from_customer', production_status='pending'
```

### 2. Design Workflow
```
Step 1: Customer provides design
Action: Update design_status to 'design_received_from_customer'
Fields: design_file_url (optional), design_notes (optional)

Step 2: Design approved for production  
Action: Update design_status to 'design_ready'
Effect: Item becomes eligible for production start
```

### 3. Production Workflow
```
Step 1: Production start (requires design_ready)
Action: Update production_status to 'pre_treatment'

Step 2: Printing phase
Action: Update production_status to 'printing'

Step 3: Final processing
Action: Update production_status to 'post_process'
```

### 4. Status Combinations & Business Logic

| **Design Status** | **Production Status** | **Business Meaning** | **Action Required** |
|---|---|---|---|
| `pending_from_customer` | `pending` | Waiting for customer design | Customer followup needed |
| `design_received_from_customer` | `pending` | Design received, needs approval | Design review required |
| `design_ready` | `pending` | Ready to start production | Production can begin |
| `design_ready` | `printing` | Production in progress | Monitor progress |
| `design_ready` | `post_process` | Near completion | Quality check & delivery prep |

---

## Database Schema Examples

### Create Order Item with Design Tracking
```sql
INSERT INTO order_items (
    order_id, material_type, quantity, unit_price,
    design_status, production_status
) VALUES (
    'order-uuid', 'saree', 5, 1500.00,
    'pending_from_customer', 'pending'
);
```

### Update Design Status
```sql
-- Method 1: Direct column update (v2.0)
UPDATE order_items 
SET design_status = 'design_received_from_customer',
    design_file_url = 'https://example.com/design.pdf',
    design_notes = 'Customer requested gold border'
WHERE id = 'item-uuid';

-- Method 2: Legacy fallback
UPDATE order_items 
SET customization_details = 'Design Status: Received, Notes: Gold border requested'
WHERE id = 'item-uuid';
```

### Update Production Status
```sql
-- Method 1: Direct column update (v2.0)
UPDATE order_items 
SET production_status = 'printing'
WHERE id = 'item-uuid';

-- Method 2: Legacy fallback
UPDATE order_items 
SET customization_details = 'Production Stage: PRINTING, Updated: 2025-09-12 10:30'
WHERE id = 'item-uuid';
```

---

## Frontend UI Update Process

### Design Status Update Flow

1. **User Interaction**: Click design update button in Production screen table
   ```typescript
   <IconButton onClick={() => handleDesignUpdate(item)} title="Update Design Status">
   ```

2. **Dialog Opening**: `handleDesignUpdate()` called
   ```typescript
   const handleDesignUpdate = (orderItem: OrderItem) => {
       setSelectedOrderItem(orderItem);
       const currentDesignStatus = parseDesignStatus(orderItem.customization_details, orderItem);
       designReset({
           design_status: currentDesignStatus,
           design_file_url: orderItem.design_file_url || '',
           design_notes: orderItem.design_notes || '',
       });
       setDesignDialogOpen(true);
   };
   ```

3. **Form Submission**: `onDesignSubmit()` called
   ```typescript
   const onDesignSubmit = async (data: any) => {
       await orderItemApi.updateDesignStatus(
           selectedOrderItem.id, 
           data.design_status,
           {
               design_file_url: data.design_file_url,
               design_notes: data.design_notes,
           }
       );
       setSuccess('Design status updated successfully');
       loadProductionData(); // Refresh UI
   };
   ```

### Production Status Update Flow

1. **User Interaction**: Click production update button
   ```typescript
   <IconButton onClick={() => handleProductionUpdate(item)} title="Update Fabric Processing Stage">
   ```

2. **Dialog Opening**: `handleProductionUpdate()` called
   ```typescript
   const handleProductionUpdate = (orderItem: OrderItem) => {
       setSelectedOrderItem(orderItem);
       const currentProductionStatus = parseProductionStatus(orderItem.customization_details, orderItem);
       productionReset({
           production_status: currentProductionStatus,
       });
       setFabricStageDialogOpen(true);
   };
   ```

3. **Form Submission**: `onProductionSubmit()` called
   ```typescript
   const onProductionSubmit = async (data: any) => {
       await orderItemApi.updateProductionStatus(selectedOrderItem.id, data.production_status);
       setSuccess('Production status updated successfully');
       loadProductionData(); // Refresh UI
   };
   ```

---

## Migration Strategy

### Current State: Hybrid Support
The system currently supports both legacy and new approaches:

#### Legacy Approach (v1.0)
- Single `customization_details` text field
- Parsed values for design and production status
- No separate fields for design files or notes

#### New Approach (v2.0) 
- Separate `design_status` and `production_status` columns
- Dedicated `design_file_url` and `design_notes` fields
- Structured data with type safety

### Migration Process
1. **Phase 1** ✅: Add new columns alongside legacy columns
2. **Phase 2** ⏳: Migrate data from legacy format to new columns
3. **Phase 3** ⏳: Update API methods to use new columns primarily
4. **Phase 4** ⏳: Remove fallback logic and legacy column dependencies

---

## Performance & Scalability

### Database Indexing
```sql
-- Recommended indexes for production queries
CREATE INDEX idx_order_items_design_status ON order_items(design_status);
CREATE INDEX idx_order_items_production_status ON order_items(production_status);  
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_created_at ON order_items(created_at);
```

### Query Optimization
- Status filtering uses direct column comparisons (fast)
- Fallback parsing only when necessary (minimizes overhead)
- Batch operations for bulk status updates

---

## Security & Access Control

### Row Level Security (RLS)
```sql
-- Supabase RLS policies
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for authenticated users" ON order_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable update access for authenticated users" ON order_items FOR UPDATE USING (auth.role() = 'authenticated');
```

### API Authentication
- All API calls require Supabase authentication
- User context maintained throughout update operations
- Audit trail logging (currently disabled during migration)

---

## Monitoring & Debugging

### Logging Locations
1. **Browser Console**: API call logging with `🏭`, `👁️` prefixes
2. **Database Logs**: Supabase real-time query monitoring
3. **Application Logs**: Component-level logging in `debug.ts`

### Common Debug Patterns
```typescript
// API method debugging
console.log('🏭 [PRODUCTION STATUS UPDATE] Starting:', { id, productionStatus });

// Fallback logic debugging  
console.log('📋 [FALLBACK] Using customization_details for production status');

// Audit trail debugging
console.log('🔍 [AUDIT] Skipping audit trail due to schema migration in progress');
```

### Error Tracking
- Comprehensive try-catch blocks in all API methods
- User-friendly error messages in UI
- Detailed error logging for debugging

---

## Future Enhancements

### Planned Features
1. **Real-time Status Updates**: WebSocket integration for live updates
2. **Batch Operations**: Bulk status updates for multiple items  
3. **Status History**: Track all status changes over time
4. **Automated Workflows**: Trigger notifications based on status changes
5. **Quality Control**: Add QC status tracking to production workflow

### Technical Debt
1. Remove legacy column dependencies after migration completion
2. Implement comprehensive audit trail system
3. Add automated testing for status transition logic
4. Optimize database queries with materialized views

---

## Related Documentation

- **Column Mapping**: `/home/siva/sandboxes/jbms1/DATABASE_COLUMN_MAPPING_GUIDE.md`
- **API Documentation**: `/home/siva/sandboxes/jbms1/docs/API_DOCUMENTATION_SUPABASE.md`  
- **Database Schema**: `/home/siva/sandboxes/jbms1/UI_DATABASE_DATA_FLOW.md`
- **Migration Scripts**: `/home/siva/sandboxes/jbms1/db/migrations/`