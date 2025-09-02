# Production Stock Filtering by Stage and Design Readiness

This implementation provides comprehensive stock tracking by production stages with design readiness filtering.

## Features Implemented

### 1. API Endpoints

#### `orderItemApi.getProductionStockByStage(params)`
Filter production stock by multiple criteria:
```typescript
const params = {
  stage?: 'design_pending' | 'design_ready' | 'pre_treatment' | 'printing' | 'post_process' | 'all',
  designReady?: boolean,
  designReceived?: boolean,
  customerId?: string,
  materialType?: 'saree' | 'dupatta' | 'voni' | 'running_material' | 'blouse_material' | 'all'
}

const filteredItems = await orderItemApi.getProductionStockByStage(params)
```

#### `orderItemApi.getStageReadinessCombinations()`
Get summary of all stage and design status combinations:
```typescript
const combinations = await orderItemApi.getStageReadinessCombinations()
// Returns: [{ stage, designStatus, count, items }]
```

### 2. Utility Functions

#### `parseDesignStatus(customization_details)`
Extract design status from order item details:
```typescript
const { designReceived, designReady, designNotes } = parseDesignStatus(item.customization_details)
```

#### `filterItemsByStageAndDesign(items, filters)`
Client-side filtering of order items:
```typescript
const filtered = filterItemsByStageAndDesign(orderItems, {
  stage: 'pre_treatment',
  designReady: true,
  designReceived: true
})
```

#### `groupItemsByStageAndDesignStatus(items)`
Group items by stage and design combinations:
```typescript
const grouped = groupItemsByStageAndDesignStatus(orderItems)
```

### 3. React Component

#### `ProductionStockFilter`
Complete filtering interface with:
- Stage selection dropdown
- Material type filtering
- Design status checkboxes (received/ready)
- Summary cards showing combinations
- Filtered results table

Usage:
```tsx
import ProductionStockFilter from '../components/ProductionStockFilter'

// In your component
<ProductionStockFilter customerId={selectedCustomerId} />
```

## Example Filtering Scenarios

### Scenario 1: Pre-treatment Complete, Design Ready
```typescript
const readyForPrinting = await orderItemApi.getProductionStockByStage({
  stage: 'pre_treatment',
  designReady: true,
  designReceived: true
})
// Returns items at pre-treatment stage with designs received and ready
```

### Scenario 2: Pre-treatment Complete, Design Not Ready
```typescript
const waitingForDesign = await orderItemApi.getProductionStockByStage({
  stage: 'pre_treatment',
  designReady: false,
  designReceived: true  // or false for completely pending
})
// Returns items at pre-treatment but waiting for design approval
```

### Scenario 3: All Saree Items at Various Stages
```typescript
const sareeStock = await orderItemApi.getProductionStockByStage({
  materialType: 'saree',
  stage: 'all'
})
// Returns all saree items regardless of stage
```

### Scenario 4: Customer-specific Production Status
```typescript
const customerProduction = await orderItemApi.getProductionStockByStage({
  customerId: 'customer-uuid',
  stage: 'printing'
})
// Returns all printing stage items for specific customer
```

## Database Fields Used

The system tracks design status through the `customization_details` field which contains:
- `Design Status: Received` or `Design Status: Pending`
- `Ready: Yes` or `Ready: No` 
- `Notes: <design notes>` (optional)

Production stages are stored in the `current_stage` field:
- `design_pending`
- `design_ready`
- `pre_treatment`
- `printing`
- `post_process`

## Integration Points

### Existing Pages
1. **Production.tsx**: Add filtering controls to existing production management
2. **EnhancedReports.tsx**: Include stage-design combination summaries
3. **Dashboard**: Show production bottlenecks by stage + design status

### Usage in Reports
```typescript
// Get summary data for dashboard
const combinations = await orderItemApi.getStageReadinessCombinations()

// Show items stuck at pre-treatment waiting for designs
const stuckItems = combinations.find(c => 
  c.stage === 'pre_treatment' && 
  c.designStatus === 'Design Received, Not Ready'
)
```

### Custom Filtering
```typescript
// Complex multi-criteria filtering
const criticalItems = filterItemsByStageAndDesign(allItems, {
  stage: 'printing',
  designReady: true,
  customerId: urgentCustomerId
})
```

This implementation provides comprehensive stock tracking capabilities that align with your textile printing workflow where design readiness is critical at each production stage.