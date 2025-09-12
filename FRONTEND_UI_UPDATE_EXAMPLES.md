# Frontend UI Update Process Examples
## JBMS Production Screen - Design & Production Status Updates

**Generated**: 2025-09-12  
**Component**: Production Screen (`/home/siva/sandboxes/jbms1/frontend/src/pages/Production.tsx`)  
**API Service**: Supabase API (`/home/siva/sandboxes/jbms1/frontend/src/services/supabaseApi.ts`)

---

## Complete Update Flow Examples

### Example 1: Design Status Update

#### 1. User Initiates Design Update

**UI Action**: User clicks the design status button (👁️ eye icon) for an order item

```typescript
// In Production.tsx table row
<IconButton 
  size="small" 
  onClick={() => handleDesignUpdate(item)}
  title="Update Design Status"
  color={designReady ? 'success' : 'warning'}
>
  <Visibility />
</IconButton>
```

#### 2. Dialog Opens with Current Data

```typescript
const handleDesignUpdate = (orderItem: OrderItem) => {
  // Set selected item for dialog
  setSelectedOrderItem(orderItem);
  
  // Parse current design status from multiple possible sources
  const currentDesignStatus = parseDesignStatus(orderItem.customization_details, orderItem);
  
  // Pre-populate form with current values
  designReset({
    design_status: currentDesignStatus,
    design_file_url: orderItem.design_file_url || '',
    design_notes: orderItem.design_notes || '',
  });
  
  // Open the dialog
  setDesignDialogOpen(true);
};
```

**Example Current Status Parsing**:
```typescript
// From productionUtils.ts
export const parseDesignStatus = (customization_details?: string, item?: any): DesignStatus => {
  // Method 1: Check new design_status column (preferred)
  if (item?.design_status) {
    return item.design_status as DesignStatus;
  }
  
  // Method 2: Check legacy boolean columns
  if (item?.design_received !== undefined && item?.design_ready !== undefined) {
    if (item.design_ready) return 'design_ready';
    if (item.design_received) return 'design_received_from_customer';
    return 'pending_from_customer';
  }

  // Method 3: Parse from customization_details text
  if (!customization_details) {
    return 'pending_from_customer';
  }

  const designReceived = customization_details.includes('Design Status: Received')
  const designReady = customization_details.includes('Ready: Yes')
  
  if (designReady) return 'design_ready';
  if (designReceived) return 'design_received_from_customer';
  return 'pending_from_customer';
}
```

#### 3. User Updates Form and Submits

**Dialog Form Structure**:
```typescript
// Design update dialog with form controls
<form onSubmit={handleDesignSubmit(onDesignSubmit)}>
  <DialogContent>
    {selectedOrderItem && (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        
        {/* Design Status Dropdown */}
        <Controller
          name="design_status"
          control={designControl}
          render={({ field }) => (
            <FormControl fullWidth>
              <InputLabel>Design Status</InputLabel>
              <Select {...field} label="Design Status">
                <MenuItem value="pending_from_customer">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Pending />
                    Pending from Customer
                  </Box>
                </MenuItem>
                <MenuItem value="design_received_from_customer">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Assignment />
                    Design Received from Customer
                  </Box>
                </MenuItem>
                <MenuItem value="design_ready">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle />
                    Design Ready for Production
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          )}
        />

        {/* Optional Design File URL */}
        <Controller
          name="design_file_url"
          control={designControl}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Design File URL (Optional)"
              placeholder="https://example.com/design-file.pdf"
              helperText="Provide a link to the design file if available"
            />
          )}
        />

        {/* Design Notes */}
        <Controller
          name="design_notes"
          control={designControl}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Design Notes"
              multiline
              rows={4}
              placeholder="Add notes about the design, special requirements, or status updates..."
            />
          )}
        />
      </Box>
    )}
  </DialogContent>
</form>
```

#### 4. Form Submission Triggers API Update

```typescript
const onDesignSubmit = async (data: any) => {
  if (!selectedOrderItem) return;

  try {
    // Call API update method
    await orderItemApi.updateDesignStatus(
      selectedOrderItem.id, 
      data.design_status,
      {
        design_file_url: data.design_file_url,
        design_notes: data.design_notes,
      }
    );
    
    // Show success message
    setSuccess(`Design status updated successfully for order item ${selectedOrderItem.id}`);
    
    // Close dialog and reset state
    setDesignDialogOpen(false);
    setSelectedOrderItem(null);
    
    // Refresh data to show updates
    loadProductionData();
  } catch (error: any) {
    setError('Failed to update design status: ' + error.message);
  }
};
```

#### 5. API Method Handles Database Update

```typescript
// In supabaseApi.ts
updateDesignStatus: async (id: string, designStatus: string, designData?: {
  design_file_url?: string;
  design_notes?: string;
}): Promise<OrderItem> => {
  return withApiLogging('orderItem.updateDesignStatus', async () => {
    console.log('👁️ [DESIGN STATUS UPDATE] Starting:', { id, designStatus, designData });
    
    const updateData: any = {};

    try {
      // Primary approach: Update new columns
      updateData.design_status = designStatus;
      if (designData?.design_file_url) updateData.design_file_url = designData.design_file_url;
      if (designData?.design_notes) updateData.design_notes = designData.design_notes;
      
      const { data, error } = await supabaseHelpers.update(TABLES.ORDER_ITEMS, id, updateData);
      
      if (error) {
        // Fallback approach: Update customization_details
        console.log('📋 [FALLBACK] Using customization_details for design status');
        const statusText = designStatus === 'design_ready' ? 'Ready: Yes' : 
                         designStatus === 'design_received_from_customer' ? 'Received' : 'Pending';
        updateData.customization_details = `Design Status: ${statusText}${designData?.design_notes ? ', Notes: ' + designData.design_notes : ''}`;
        delete updateData.design_status;
        if (designData?.design_file_url) updateData.design_file_url = designData.design_file_url;
        
        const fallbackResult = await supabaseHelpers.update(TABLES.ORDER_ITEMS, id, updateData);
        if (fallbackResult.error) throw new Error(fallbackResult.error.message);
        
        return fallbackResult.data;
      }
      
      return data;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }, { id, designStatus, designData })
}
```

#### 6. UI Reflects Updated Status

After successful update, the UI refreshes to show:

```typescript
// Updated status chip in table
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

### Example 2: Production Status Update

#### 1. User Initiates Production Update

**UI Action**: User clicks the production status button (🏭 factory icon)

```typescript
<IconButton 
  size="small" 
  onClick={() => handleProductionUpdate(item)}
  title="Update Fabric Processing Stage"
  color="primary"
>
  <Factory />
</IconButton>
```

#### 2. Dialog Opens with Current Production Status

```typescript
const handleProductionUpdate = (orderItem: OrderItem) => {
  setSelectedOrderItem(orderItem);
  
  // Parse current production status
  const currentProductionStatus = parseProductionStatus(orderItem.customization_details, orderItem);
  
  // Pre-populate form
  productionReset({
    production_status: currentProductionStatus,
  });
  
  setFabricStageDialogOpen(true);
};
```

**Production Status Parsing**:
```typescript
export const parseProductionStatus = (customization_details?: string, item?: any): ProductionStatus => {
  // Method 1: Check new production_status column (preferred)
  if (item?.production_status) {
    return item.production_status as ProductionStatus;
  }
  
  // Method 2: Check legacy current_stage column  
  if (item?.current_stage) {
    if (item.current_stage === 'post_process') return 'post_process';
    if (item.current_stage === 'printing') return 'printing';
    if (item.current_stage === 'pre_treatment') return 'pre_treatment';
    return 'pending';
  }

  // Method 3: Parse from customization_details
  if (!customization_details) {
    return 'pending';
  }

  if (customization_details.includes('Production Stage: POST PROCESS')) return 'post_process';
  if (customization_details.includes('Production Stage: PRINTING')) return 'printing';
  if (customization_details.includes('Production Stage: PRE_TREATMENT')) return 'pre_treatment';
  return 'pending';
}
```

#### 3. Production Status Form

```typescript
// Production status update dialog
<Controller
  name="production_status"
  control={productionControl}
  render={({ field }) => (
    <FormControl fullWidth>
      <InputLabel>Production Status</InputLabel>
      <Select {...field} label="Production Status">
        <MenuItem value="pending">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Pending />
            Pending
          </Box>
        </MenuItem>
        <MenuItem value="pre_treatment">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assignment />
            Pre-treatment
          </Box>
        </MenuItem>
        <MenuItem value="printing">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Factory />
            Printing
          </Box>
        </MenuItem>
        <MenuItem value="post_process">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircle />
            Post Process
          </Box>
        </MenuItem>
      </Select>
    </FormControl>
  )}
/>
```

#### 4. Production Update API Call

```typescript
const onProductionSubmit = async (data: any) => {
  if (!selectedOrderItem) return;

  try {
    // API call to update production status
    await orderItemApi.updateProductionStatus(selectedOrderItem.id, data.production_status);
    
    setSuccess(`Production status updated successfully for order item ${selectedOrderItem.id}`);
    setFabricStageDialogOpen(false);
    setSelectedOrderItem(null);
    loadProductionData();
  } catch (error: any) {
    setError('Failed to update production status: ' + error.message);
  }
};
```

#### 5. Production Status API Implementation

```typescript
updateProductionStatus: async (id: string, productionStatus: string): Promise<OrderItem> => {
  return withApiLogging('orderItem.updateProductionStatus', async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')
    
    console.log('🏭 [PRODUCTION STATUS UPDATE] Starting:', { id, productionStatus });
    
    const updateData: any = {};

    try {
      // Primary approach: Update production_status column
      updateData.production_status = productionStatus;
      const { data, error } = await supabaseHelpers.update(TABLES.ORDER_ITEMS, id, updateData);
      
      if (error) {
        // Fallback approach: Update customization_details
        console.log('📋 [FALLBACK] Using customization_details for production status');
        updateData.customization_details = `Production Stage: ${productionStatus.toUpperCase()}, Updated: ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;
        delete updateData.production_status;
        
        const fallbackResult = await supabaseHelpers.update(TABLES.ORDER_ITEMS, id, updateData);
        if (fallbackResult.error) throw new Error(fallbackResult.error.message);
        
        return fallbackResult.data;
      }
      
      return data;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }, { id, productionStatus });
}
```

---

## Complete Database Update Examples

### Example 3: Order Item with Both Status Updates

#### Initial Order Item Creation
```sql
INSERT INTO order_items (
    order_id,
    material_type, 
    quantity,
    unit_price,
    design_status,
    production_status
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'saree',
    3, 
    2500.00,
    'pending_from_customer',
    'pending'
);
```

#### Design Status Update Sequence
```sql
-- Step 1: Customer provides design
UPDATE order_items 
SET design_status = 'design_received_from_customer',
    design_file_url = 'https://drive.google.com/design123.pdf',
    design_notes = 'Customer wants golden border with red flowers',
    updated_at = NOW()
WHERE id = 'order-item-uuid';

-- Step 2: Design approved
UPDATE order_items 
SET design_status = 'design_ready',
    design_notes = 'Approved by design team - ready for production',
    updated_at = NOW()
WHERE id = 'order-item-uuid';
```

#### Production Status Update Sequence
```sql
-- Step 1: Start production
UPDATE order_items 
SET production_status = 'pre_treatment',
    updated_at = NOW()
WHERE id = 'order-item-uuid' 
AND design_status = 'design_ready'; -- Business rule: design must be ready

-- Step 2: Begin printing
UPDATE order_items 
SET production_status = 'printing',
    updated_at = NOW()  
WHERE id = 'order-item-uuid';

-- Step 3: Final processing
UPDATE order_items 
SET production_status = 'post_process',
    updated_at = NOW()
WHERE id = 'order-item-uuid';
```

---

## Filtering and Search Examples

### Example 4: Status Combination Filters

#### UI Filter Implementation
```typescript
// Status filter components in Production.tsx
<FormControl fullWidth>
  <InputLabel>Design Status</InputLabel>
  <Select
    value={designStatusFilter}
    onChange={(e) => setDesignStatusFilter(e.target.value as DesignStatus | 'all')}
  >
    <MenuItem value="all">All Design Status</MenuItem>
    <MenuItem value="pending_from_customer">Pending from Customer</MenuItem>
    <MenuItem value="design_received_from_customer">Design Received</MenuItem>
    <MenuItem value="design_ready">Design Ready</MenuItem>
  </Select>
</FormControl>

<FormControl fullWidth>
  <InputLabel>Production Status</InputLabel>
  <Select
    value={productionStatusFilter}
    onChange={(e) => setProductionStatusFilter(e.target.value as ProductionStatus | 'all')}
  >
    <MenuItem value="all">All Production Status</MenuItem>
    <MenuItem value="pending">Pending</MenuItem>
    <MenuItem value="pre_treatment">Pre-treatment</MenuItem>
    <MenuItem value="printing">Printing</MenuItem>
    <MenuItem value="post_process">Post Process</MenuItem>
  </Select>
</FormControl>
```

#### Filter Logic Implementation
```typescript
const filteredOrderItems = orderItems.filter((item) => {
  const order = getOrderByItemId(item.id);
  
  // Search filter
  const matchesSearch = searchTerm === '' || (
    item.material_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.customization_details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order?.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order?.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Status filters using new parsing approach
  const itemDesignStatus = parseDesignStatus(item.customization_details, item);
  const itemProductionStatus = parseProductionStatus(item.customization_details, item);
  
  const matchesDesignStatus = designStatusFilter === 'all' || itemDesignStatus === designStatusFilter;
  const matchesProductionStatus = productionStatusFilter === 'all' || itemProductionStatus === productionStatusFilter;
  
  return matchesSearch && matchesDesignStatus && matchesProductionStatus;
});
```

### Example 5: Clickable Summary Cards

#### Summary Statistics Calculation
```typescript
const getItemStats = () => {
  const stats = {
    designPending: 0,
    designReceived: 0, 
    designReady: 0,
    productionPending: 0,
    productionPrinting: 0,
    productionPostProcess: 0,
    designReadyAndPrintingReady: 0,
    designReadyButProductionPending: 0,
    designPendingAndProductionPending: 0,
  };
  
  orderItems.forEach(item => {
    const designStatus = parseDesignStatus(item.customization_details, item);
    const productionStatus = parseProductionStatus(item.customization_details, item);
    
    // Count individual statuses
    switch (designStatus) {
      case 'design_ready':
        stats.designReady++;
        break;
      case 'design_received_from_customer':
        stats.designReceived++;
        break;
      case 'pending_from_customer':
      default:
        stats.designPending++;
        break;
    }
    
    // Count status combinations
    const isDesignReady = designStatus === 'design_ready';
    const isDesignPending = designStatus === 'pending_from_customer';
    const isProductionStarted = productionStatus !== 'pending';
    
    if (isDesignReady && isProductionStarted) stats.designReadyAndPrintingReady++;
    if (isDesignReady && !isProductionStarted) stats.designReadyButProductionPending++;
    if (isDesignPending && !isProductionStarted) stats.designPendingAndProductionPending++;
  });
  
  return stats;
};
```

#### Clickable Filter Cards
```typescript
{/* Design Ready + Production Pending Card */}
<Card 
  sx={{ 
    bgcolor: 'warning.50', 
    cursor: 'pointer', 
    '&:hover': { elevation: 4, bgcolor: 'warning.100' } 
  }}
  onClick={() => {
    setDesignStatusFilter('design_ready');
    setProductionStatusFilter('pending');
  }}
>
  <CardContent>
    <Typography variant="h6" color="text.secondary" gutterBottom>
      Design Ready + Production Pending
    </Typography>
    <Typography variant="h4" fontWeight="bold" color="warning.main">
      {stats.designReadyButProductionPending}
    </Typography>
    <Typography variant="body2" color="warning.main">
      Can Start Production (Click to Filter)
    </Typography>
  </CardContent>
</Card>
```

---

## Error Handling Examples

### Example 6: API Error Recovery

#### Client-Side Error Handling
```typescript
const onDesignSubmit = async (data: any) => {
  if (!selectedOrderItem) return;

  try {
    await orderItemApi.updateDesignStatus(
      selectedOrderItem.id, 
      data.design_status,
      {
        design_file_url: data.design_file_url,
        design_notes: data.design_notes,
      }
    );
    
    setSuccess(`Design status updated successfully for order item ${selectedOrderItem.id}`);
    setDesignDialogOpen(false);
    setSelectedOrderItem(null);
    loadProductionData();
  } catch (error: any) {
    // Show user-friendly error message
    setError('Failed to update design status: ' + error.message);
    
    // Log detailed error for debugging
    console.error('Design update failed:', {
      orderItemId: selectedOrderItem.id,
      designStatus: data.design_status,
      error: error
    });
  }
};
```

#### Server-Side Fallback Logic
```typescript
// API method with automatic fallback
try {
  // Primary: Try updating new columns
  updateData.design_status = designStatus;
  const { data, error } = await supabaseHelpers.update(TABLES.ORDER_ITEMS, id, updateData);
  
  if (error) {
    // Fallback: Use customization_details if columns don't exist
    console.log('📋 [FALLBACK] Using customization_details for design status');
    const statusText = designStatus === 'design_ready' ? 'Ready: Yes' : 
                     designStatus === 'design_received_from_customer' ? 'Received' : 'Pending';
    updateData.customization_details = `Design Status: ${statusText}`;
    delete updateData.design_status;
    
    const fallbackResult = await supabaseHelpers.update(TABLES.ORDER_ITEMS, id, updateData);
    if (fallbackResult.error) throw new Error(fallbackResult.error.message);
    
    return fallbackResult.data;
  }
  
  return data;
} catch (error) {
  throw new Error(error instanceof Error ? error.message : 'Unknown error occurred');
}
```

---

## Performance Optimization Examples

### Example 7: Efficient Data Loading

#### Optimized Production Data Query
```typescript
const loadProductionData = useCallback(async () => {
  componentLogger.info('Loading production data...');
  try {
    setLoading(true);
    
    // Load order items with minimal necessary joins
    const orderItemsData = await orderItemApi.getProductionStatus();
    setOrderItems(orderItemsData);
    
    // Load orders for reference (cached by relationship)
    const ordersData = await orderApi.getOrders();
    setOrders(ordersData);
    
    componentLogger.info('Production data loaded successfully', { 
      orderItems: orderItemsData.length,
      orders: ordersData.length 
    });
  } catch (error: any) {
    componentLogger.error('Failed to load production data', error);
    setError('Failed to load production data: ' + error.message);
  } finally {
    setLoading(false);
  }
}, []);
```

#### Debounced Search Implementation
```typescript
// Debounced search to avoid excessive API calls
const [searchTerm, setSearchTerm] = useState('');
const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

useEffect(() => {
  // Filter is applied client-side for better performance
  // Only triggers on debounced search term changes
}, [debouncedSearchTerm, designStatusFilter, productionStatusFilter]);
```

---

## Testing Examples

### Example 8: Component Testing Scenarios

#### Test Design Status Update Flow
```typescript
describe('Production Screen - Design Status Update', () => {
  it('should update design status successfully', async () => {
    // 1. Render production screen with mock data
    const mockOrderItem = {
      id: 'test-item-1',
      design_status: 'pending_from_customer',
      material_type: 'saree',
      quantity: 2
    };
    
    render(<Production />);
    
    // 2. Click design update button
    fireEvent.click(screen.getByTitle('Update Design Status'));
    
    // 3. Verify dialog opens
    expect(screen.getByText('Design Management')).toBeInTheDocument();
    
    // 4. Change design status
    fireEvent.change(screen.getByLabelText('Design Status'), {
      target: { value: 'design_ready' }
    });
    
    // 5. Submit form
    fireEvent.click(screen.getByText('Update Design'));
    
    // 6. Verify API call
    await waitFor(() => {
      expect(mockUpdateDesignStatus).toHaveBeenCalledWith(
        'test-item-1',
        'design_ready',
        expect.any(Object)
      );
    });
    
    // 7. Verify success message
    expect(screen.getByText(/Design status updated successfully/)).toBeInTheDocument();
  });
});
```

---

## Summary

The frontend UI update process follows a consistent pattern:
1. **User Interaction** → Button click triggers handler
2. **Dialog State** → Current data parsed and form populated  
3. **Form Submission** → Validation and API call
4. **API Processing** → Primary column update with fallback logic
5. **UI Refresh** → Success/error feedback and data reload
6. **Visual Update** → Status chips and progress indicators reflect changes

This architecture provides robust error handling, backward compatibility, and a smooth user experience during the database migration process.