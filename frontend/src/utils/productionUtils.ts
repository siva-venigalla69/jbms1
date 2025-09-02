// Production and Design Status Utilities

import type { OrderItem, ProductionStage, StageStockSummary, DesignStatus, ProductionStatus } from '../types'

/**
 * Parse design status from new column or legacy data
 */
export const parseDesignStatus = (customization_details?: string, item?: any): DesignStatus => {
  // If the item has new design_status column, use it
  if (item?.design_status) {
    return item.design_status as DesignStatus;
  }
  
  // If the item has legacy design columns, use those
  if (item?.design_received !== undefined && item?.design_ready !== undefined) {
    if (item.design_ready) return 'design_ready';
    if (item.design_received) return 'design_received_from_customer';
    return 'pending_from_customer';
  }

  // Fallback to parsing from customization_details
  if (!customization_details) {
    return 'pending_from_customer';
  }

  const designReceived = customization_details.includes('Design Status: Received')
  const designReady = customization_details.includes('Ready: Yes')
  
  if (designReady) return 'design_ready';
  if (designReceived) return 'design_received_from_customer';
  return 'pending_from_customer';
}

/**
 * Parse design status from customization_details field or direct columns (legacy)
 * @deprecated - Use parseDesignStatus instead
 */
export const parseDesignStatusLegacy = (customization_details?: string, item?: any) => {
  // If the item has direct design status columns, use those first
  if (item?.design_received !== undefined && item?.design_ready !== undefined) {
    return {
      designReceived: item.design_received,
      designReady: item.design_ready,
      designNotes: item.design_notes || null
    }
  }

  // Fallback to parsing from customization_details
  if (!customization_details) {
    return {
      designReceived: false,
      designReady: false,
      designNotes: null
    }
  }

  const designReceived = customization_details.includes('Design Status: Received')
  const designReady = customization_details.includes('Ready: Yes')
  
  // Extract notes if available
  const notesMatch = customization_details.match(/Notes: (.+)/)
  const designNotes = notesMatch ? notesMatch[1] : null

  return {
    designReceived,
    designReady,
    designNotes
  }
}

/**
 * Parse production status from new column or legacy data
 */
export const parseProductionStatus = (customization_details?: string, item?: any): ProductionStatus => {
  // If the item has new production_status column, use it
  if (item?.production_status) {
    return item.production_status as ProductionStatus;
  }
  
  // If the item has legacy current_stage column, map it
  if (item?.current_stage) {
    if (item.current_stage === 'post_process') return 'post_process';
    if (item.current_stage === 'printing') return 'printing';
    return 'pending';
  }

  // Fallback to parsing from customization_details
  if (!customization_details) {
    return 'pending';
  }

  if (customization_details.includes('Production Stage: POST PROCESS')) return 'post_process';
  if (customization_details.includes('Production Stage: PRINTING')) return 'printing';
  return 'pending';
}

/**
 * Get readable design status label
 */
export const getDesignStatusLabel = (customization_details?: string, item?: any): string => {
  const status = parseDesignStatus(customization_details, item);
  
  switch (status) {
    case 'design_ready':
      return 'Design Ready';
    case 'design_received_from_customer':
      return 'Design Received';
    case 'pending_from_customer':
    default:
      return 'Design Pending';
  }
}

/**
 * Get readable design status label (legacy)
 * @deprecated - Use getDesignStatusLabel with new enum approach
 */
export const getDesignStatusLabelLegacy = (customization_details?: string, item?: any): string => {
  const { designReceived, designReady } = parseDesignStatusLegacy(customization_details, item)
  
  if (designReceived && designReady) {
    return 'Design Received & Ready'
  } else if (designReceived && !designReady) {
    return 'Design Received, Not Ready'
  } else if (!designReceived && designReady) {
    return 'Design Ready, Not Received' // Edge case
  } else {
    return 'Design Pending'
  }
}

/**
 * Get readable production status label
 */
export const getProductionStatusLabel = (customization_details?: string, item?: any): string => {
  const status = parseProductionStatus(customization_details, item);
  
  switch (status) {
    case 'post_process':
      return 'Post Processing';
    case 'printing':
      return 'Printing';
    case 'pending':
    default:
      return 'Pending';
  }
}

/**
 * Get production stage display name
 */
export const getStageDisplayName = (stage: ProductionStage | string): string => {
  const stageMap: Record<string, string> = {
    'design_pending': 'Design Pending',
    'design_ready': 'Design Ready', 
    'pre_treatment': 'Pre-treatment',
    'printing': 'Printing',
    'post_process': 'Post Process'
  }
  
  return stageMap[stage] || stage
}

/**
 * Group order items by design and production status combinations
 */
export const groupItemsByStageAndDesignStatus = (items: OrderItem[]): StageStockSummary[] => {
  const combinations: Record<string, OrderItem[]> = {}
  
  items.forEach(item => {
    const designStatus = parseDesignStatus(item.customization_details, item)
    const productionStatus = parseProductionStatus(item.customization_details, item)
    
    const key = `${designStatus}_${productionStatus}`
    if (!combinations[key]) {
      combinations[key] = []
    }
    combinations[key].push(item)
  })

  // Convert to array and sort
  const result = Object.entries(combinations).map(([key, items]) => {
    const [designStatus, productionStatus] = key.split('_')
    
    return {
      designStatus: designStatus as DesignStatus,
      productionStatus: productionStatus as ProductionStatus,
      count: items.length,
      items
    }
  }).filter(combo => combo.count > 0)

  // Sort by design status order, then by production status
  const designOrder: DesignStatus[] = ['pending_from_customer', 'design_received_from_customer', 'design_ready']
  const productionOrder: ProductionStatus[] = ['pending', 'printing', 'post_process']
  
  return result.sort((a, b) => {
    const designComparison = designOrder.indexOf(a.designStatus) - designOrder.indexOf(b.designStatus)
    if (designComparison !== 0) return designComparison
    return productionOrder.indexOf(a.productionStatus) - productionOrder.indexOf(b.productionStatus)
  })
}

/**
 * Filter items by design and production status criteria
 */
export const filterItemsByStatusCriteria = (
  items: OrderItem[],
  filters: {
    designStatus?: DesignStatus | 'all'
    productionStatus?: ProductionStatus | 'all'
    customerId?: string
    materialType?: string
  }
): OrderItem[] => {
  return items.filter(item => {
    // Filter by design status
    if (filters.designStatus && filters.designStatus !== 'all') {
      const itemDesignStatus = parseDesignStatus(item.customization_details, item)
      if (itemDesignStatus !== filters.designStatus) return false
    }

    // Filter by production status
    if (filters.productionStatus && filters.productionStatus !== 'all') {
      const itemProductionStatus = parseProductionStatus(item.customization_details, item)
      if (itemProductionStatus !== filters.productionStatus) return false
    }

    // Filter by customer
    if (filters.customerId) {
      // Assuming order is populated with customer_id
      const order = (item as any).order || (item as any).orders
      if (order?.customer_id !== filters.customerId) return false
    }

    // Filter by material type
    if (filters.materialType && filters.materialType !== 'all') {
      if (item.material_type !== filters.materialType) return false
    }

    return true
  })
}

/**
 * Filter items by stage and design criteria (legacy)
 * @deprecated - Use filterItemsByStatusCriteria instead
 */
export const filterItemsByStageAndDesign = (
  items: OrderItem[],
  filters: {
    stage?: ProductionStage | 'all'
    designReceived?: boolean
    designReady?: boolean
    customerId?: string
    materialType?: string
  }
): OrderItem[] => {
  return items.filter(item => {
    // Filter by stage
    if (filters.stage && filters.stage !== 'all') {
      const itemStage = item.current_stage || 'design_pending'
      if (itemStage !== filters.stage) return false
    }

    // Filter by customer
    if (filters.customerId) {
      // Assuming order is populated with customer_id
      const order = (item as any).order || (item as any).orders
      if (order?.customer_id !== filters.customerId) return false
    }

    // Filter by material type
    if (filters.materialType && filters.materialType !== 'all') {
      if (item.material_type !== filters.materialType) return false
    }

    // Filter by design status
    const { designReceived, designReady } = parseDesignStatusLegacy(item.customization_details, item)

    if (filters.designReceived !== undefined) {
      if (designReceived !== filters.designReceived) return false
    }

    if (filters.designReady !== undefined) {
      if (designReady !== filters.designReady) return false
    }

    return true
  })
}

/**
 * Get stage progress percentage
 */
export const getStageProgress = (stage: ProductionStage): number => {
  const progressMap: Record<ProductionStage, number> = {
    'design_pending': 10,
    'design_ready': 25,
    'pre_treatment': 50,
    'printing': 75,
    'post_process': 100
  }
  
  return progressMap[stage] || 0
}

/**
 * Check if an item can move to next production stage
 */
export const canProgressToNextStage = (item: OrderItem): boolean => {
  const designStatus = parseDesignStatus(item.customization_details, item)
  const productionStatus = parseProductionStatus(item.customization_details, item)
  
  // Design must be ready to start production
  if (designStatus !== 'design_ready') {
    return false
  }
  
  // Check production status progression
  switch (productionStatus) {
    case 'pending':
      return true // Can move to printing
    case 'printing':
      return true // Can move to post_process
    case 'post_process':
      return false // Final stage
    default:
      return false
  }
}

/**
 * Get next possible production status
 */
export const getNextProductionStatus = (currentStatus: ProductionStatus): ProductionStatus | null => {
  const statusFlow: Record<ProductionStatus, ProductionStatus | null> = {
    'pending': 'printing',
    'printing': 'post_process',
    'post_process': null
  }
  
  return statusFlow[currentStatus] || null
}

/**
 * Get next possible design status
 */
export const getNextDesignStatus = (currentStatus: DesignStatus): DesignStatus | null => {
  const statusFlow: Record<DesignStatus, DesignStatus | null> = {
    'pending_from_customer': 'design_received_from_customer',
    'design_received_from_customer': 'design_ready',
    'design_ready': null
  }
  
  return statusFlow[currentStatus] || null
}

/**
 * Get next possible stage for an item (legacy)
 * @deprecated - Use getNextProductionStatus and getNextDesignStatus instead
 */
export const getNextStage = (currentStage: ProductionStage): ProductionStage | null => {
  const stageFlow: Record<ProductionStage, ProductionStage | null> = {
    'design_pending': 'design_ready',
    'design_ready': 'pre_treatment',
    'pre_treatment': 'printing',
    'printing': 'post_process',
    'post_process': null
  }
  
  return stageFlow[currentStage] || null
}