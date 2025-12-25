// Simplified API Service - Digital Textile Printing System
// Clean API layer for 11-table simplified schema
// Created: 2025-12-20

import { supabase } from '../lib/supabase'
import { apiLogger, performance } from '../utils/debug'

// ============================================================================
// TABLE NAMES for Simplified Schema (11 core tables)
// ============================================================================
export const SIMPLE_TABLES = {
  // Core Business (6 tables)
  CUSTOMERS: 'customers',
  ORDERS: 'orders',
  ORDER_ITEMS: 'order_items',
  MATERIAL_IN: 'material_in',
  MATERIAL_STOCK: 'material_stock',
  MATERIAL_DESIGN_TRACKING: 'material_design_tracking',

  // Returns & Adjustments (2 tables)
  RETURNS: 'returns',
  CREDIT_NOTES: 'credit_notes',

  // Deliveries (2 tables)
  DELIVERY_CHALLANS: 'delivery_challans',
  CHALLAN_ITEMS: 'challan_items',

  // Financial (2 tables)
  GST_INVOICES: 'gst_invoices',
  PAYMENTS: 'payments',

  // Misprint Sales (1 table)
  MISPRINT_SALES: 'misprint_sales',

  // User Management (optional)
  USER_PROFILES: 'user_profiles'
} as const

// ============================================================================
// ENUMS for Type Safety
// ============================================================================
export const SIMPLE_ENUMS = {
  OWNERSHIP: {
    CUSTOMER: 'customer',
    SELF: 'self'
  } as const,

  STAGE: {
    RECEIVED: 'received',
    PREPROCESSING: 'preprocessing',
    PRINTING: 'printing',
    POSTPROCESSING: 'postprocessing',
    COMPLETED: 'completed',
    DELIVERED: 'delivered',
    MISPRINT: 'misprint',
    DAMAGED: 'damaged',
    SOLD: 'sold'
  } as const,

  ORDER_STATUS: {
    ACTIVE: 'active',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
  } as const,

  INVOICE_TYPE: {
    JOB_WORK: 'job_work',
    SALES: 'sales'
  } as const,

  RETURN_TYPE: {
    CUSTOMER_RETURN: 'customer_return',
    DAMAGED_RETURN: 'damaged_return'
  } as const,

  PAYMENT_METHOD: {
    CASH: 'cash',
    UPI: 'upi',
    BANK_TRANSFER: 'bank_transfer',
    CHEQUE: 'cheque',
    ONLINE: 'online'
  } as const
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Customer {
  id: string
  name: string
  phone: string
  email?: string
  gst_number?: string
  address?: string
  city?: string
  state?: string
  is_active: boolean
  created_at: string
  updated_at?: string
}

export interface Order {
  id: string
  customer_id: string | null
  order_number: string
  ownership_type: 'customer_material' | 'own_stock'
  total_quantity: number
  status: string
  order_date: string
  expected_delivery_date?: string
  notes?: string
  created_at: string
  updated_at?: string
}

export interface OrderItem {
  id: string
  order_id: string
  material_type: string
  quantity: number
  unit_price?: number
  notes?: string
  created_at: string
  updated_at?: string
}

export interface OrderWithItems extends Order {
  items: OrderItem[]
}

export interface MaterialIn {
  id: string
  customer_id: string | null
  order_id: string | null
  material_type: string
  quantity: number
  ownership?: 'customer' | 'self'
  received_date: string
  receipt_number?: string
  notes?: string
  created_at: string
}

export interface MaterialStock {
  id: string
  customer_id: string | null
  order_id: string | null
  material_type: string
  ownership: 'customer' | 'self'
  stage: string
  quantity: number
  is_active: boolean
  designs_available: boolean
  notes?: string
  created_at: string
  updated_at?: string
}

export interface MaterialDesignTracking {
  id: string
  customer_id: string
  material_type: string
  material_in_id?: string
  batch_identifier?: string
  total_quantity: number
  designs_given: number
  designs_pending: number
  design_notes?: string
  created_at: string
  updated_at?: string
}

export interface DeliveryChallan {
  id: string
  challan_number: string
  customer_id: string
  order_id: string
  challan_date: string
  status: string
  notes?: string
  created_at: string
}

export interface ChallanItem {
  id: string
  challan_id: string
  order_id: string  // ✅ Required - links item to specific order
  material_type: string
  quantity: number
  notes?: string
}

export interface GSTInvoice {
  id: string
  invoice_number: string
  customer_id: string
  order_id: string
  invoice_type: 'job_work' | 'sales'
  invoice_date: string
  subtotal: number
  cgst_rate: number
  cgst_amount: number
  sgst_rate: number
  sgst_amount: number
  igst_rate: number
  igst_amount: number
  total_amount: number
  status: string
  notes?: string
  created_at: string
}

export interface Payment {
  id: string
  customer_id: string
  invoice_id?: string
  payment_date: string
  amount: number
  payment_method: string
  transaction_reference?: string
  notes?: string
  created_at: string
}

export interface Return {
  id: string
  customer_id: string | null
  order_id: string | null
  return_type: 'customer_return' | 'damaged_return'
  material_type: string
  quantity: number
  reason?: string
  return_date: string
  adjustment_amount?: number
  created_at: string
}

export interface CreditNote {
  id: string
  credit_note_number: string
  customer_id: string
  invoice_id?: string
  credit_amount: number
  reason?: string
  status: string
  created_at: string
}

export interface MisprintSale {
  id: string
  sale_number: string
  sale_date: string
  material_type: string
  quantity: number
  unit_price: number
  total_amount: number
  customer_name?: string
  notes?: string
  created_at: string
}

// Stock Summary Interfaces
export interface StockByCustomer {
  customer_id: string | null
  customer_name: string
  material_type: string
  ownership: string
  received: number
  preprocessing: number
  printing: number
  postprocessing: number
  completed: number
  misprint: number
  damaged: number
  total_quantity: number
}

export interface OutstandingPayment {
  customer_id: string
  customer_name: string
  total_invoiced: number
  total_paid: number
  outstanding_amount: number
  invoice_count: number
}

export interface OutstandingOrder {
  customer_id: string
  customer_name: string
  order_id: string
  order_number: string
  material_type: string
  total_quantity: number
  delivered_quantity: number
  pending_quantity: number
}

// ============================================================================
// API CALL WRAPPER with Logging
// ============================================================================
export const withApiLogging = async <T>(
  operation: string,
  fn: () => Promise<T>,
  params?: any
): Promise<T> => {
  apiLogger.info(`API: ${operation}`, params)
  performance.mark(`${operation}-start`)

  try {
    const result = await fn()
    performance.measure(operation, `${operation}-start`)
    apiLogger.info(`API Success: ${operation}`)
    return result
  } catch (error) {
    performance.measure(`${operation}-error`, `${operation}-start`)
    apiLogger.error(`API Error: ${operation}`, { error, params })
    throw error
  }
}

// ============================================================================
// AUTHENTICATION API
// ============================================================================
export const authApi = {
  login: async (email: string, password: string) => {
    return withApiLogging('auth.login', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error(error.message)
      return {
        access_token: data.session?.access_token,
        token_type: 'Bearer',
        user: data.user
      }
    }, { email })
  },

  logout: async () => {
    return withApiLogging('auth.logout', async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw new Error(error.message)
    })
  },

  getCurrentUser: async () => {
    return withApiLogging('auth.getCurrentUser', async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw new Error(error.message)
      if (!user) return null

      const { data: profile } = await supabase
        .from(SIMPLE_TABLES.USER_PROFILES)
        .select('*')
        .eq('email', user.email)
        .single()

      return profile
    })
  }
}

// ============================================================================
// CUSTOMERS API
// ============================================================================
export const customersApi = {
  getAll: async (): Promise<Customer[]> => {
    return withApiLogging('customers.getAll', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.CUSTOMERS)
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw new Error(error.message)
      return data || []
    })
  },

  getById: async (id: string): Promise<Customer> => {
    return withApiLogging('customers.getById', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.CUSTOMERS)
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw new Error(error.message)
      return data
    }, { id })
  },

  create: async (customer: Omit<Customer, 'id' | 'created_at'>): Promise<Customer> => {
    return withApiLogging('customers.create', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.CUSTOMERS)
        .insert(customer)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    }, customer)
  },

  update: async (id: string, customer: Partial<Customer>): Promise<Customer> => {
    return withApiLogging('customers.update', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.CUSTOMERS)
        .update({ ...customer, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    }, { id, customer })
  },

  search: async (searchTerm: string): Promise<Customer[]> => {
    return withApiLogging('customers.search', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.CUSTOMERS)
        .select('*')
        .or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .eq('is_active', true)
        .order('name')

      if (error) throw new Error(error.message)
      return data || []
    }, { searchTerm })
  },

  delete: async (id: string): Promise<void> => {
    return withApiLogging('customers.delete', async () => {
      // Soft delete - mark as inactive instead of hard delete
      const { error } = await supabase
        .from(SIMPLE_TABLES.CUSTOMERS)
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw new Error(error.message)
    }, { id })
  }
}

// ============================================================================
// ORDERS API
// ============================================================================
export const ordersApi = {
  getAll: async (): Promise<Order[]> => {
    return withApiLogging('orders.getAll', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.ORDERS)
        .select('*')
        .order('order_date', { ascending: false })

      if (error) throw new Error(error.message)
      return data || []
    })
  },

  getById: async (id: string): Promise<Order> => {
    return withApiLogging('orders.getById', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.ORDERS)
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw new Error(error.message)
      return data
    }, { id })
  },

  getByCustomer: async (customerId: string): Promise<Order[]> => {
    return withApiLogging('orders.getByCustomer', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.ORDERS)
        .select('*')
        .eq('customer_id', customerId)
        .order('order_date', { ascending: false })

      if (error) throw new Error(error.message)
      return data || []
    }, { customerId })
  },

  create: async (order: Omit<Order, 'id' | 'created_at'>): Promise<Order> => {
    return withApiLogging('orders.create', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.ORDERS)
        .insert(order)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    }, order)
  },

  update: async (id: string, order: Partial<Order>): Promise<Order> => {
    return withApiLogging('orders.update', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.ORDERS)
        .update({ ...order, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    }, { id, order })
  }
}

// ============================================================================
// ORDER ITEMS API
// ============================================================================
export const orderItemsApi = {
  getByOrder: async (orderId: string): Promise<OrderItem[]> => {
    return withApiLogging('orderItems.getByOrder', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.ORDER_ITEMS)
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true })

      if (error) throw new Error(error.message)
      return data || []
    }, { orderId })
  },

  create: async (item: Omit<OrderItem, 'id' | 'created_at'>): Promise<OrderItem> => {
    return withApiLogging('orderItems.create', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.ORDER_ITEMS)
        .insert(item)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    }, item)
  },

  createMultiple: async (items: Omit<OrderItem, 'id' | 'created_at'>[]): Promise<OrderItem[]> => {
    return withApiLogging('orderItems.createMultiple', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.ORDER_ITEMS)
        .insert(items)
        .select()

      if (error) throw new Error(error.message)
      return data || []
    }, { count: items.length })
  },

  update: async (id: string, item: Partial<OrderItem>): Promise<OrderItem> => {
    return withApiLogging('orderItems.update', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.ORDER_ITEMS)
        .update({ ...item, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    }, { id, item })
  },

  delete: async (id: string): Promise<void> => {
    return withApiLogging('orderItems.delete', async () => {
      const { error } = await supabase
        .from(SIMPLE_TABLES.ORDER_ITEMS)
        .delete()
        .eq('id', id)

      if (error) throw new Error(error.message)
    }, { id })
  }
}

// ============================================================================
// MATERIAL RECEIPT API
// ============================================================================
export const materialInApi = {
  create: async (receipt: Omit<MaterialIn, 'id' | 'created_at'>): Promise<MaterialIn> => {
    return withApiLogging('materialIn.create', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.MATERIAL_IN)
        .insert(receipt)
        .select()
        .single()

      if (error) throw new Error(error.message)

      // Auto-create stock entry in 'received' stage
      await stockApi.create({
        customer_id: receipt.customer_id,
        order_id: receipt.order_id,
        material_type: receipt.material_type,
        ownership: receipt.ownership || 'customer',
        stage: SIMPLE_ENUMS.STAGE.RECEIVED,
        quantity: receipt.quantity,
        is_active: true,
        designs_available: false
      })

      return data
    }, receipt)
  },

  getAll: async (): Promise<MaterialIn[]> => {
    return withApiLogging('materialIn.getAll', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.MATERIAL_IN)
        .select('*')
        .order('received_date', { ascending: false })

      if (error) throw new Error(error.message)
      return data || []
    })
  },

  getByCustomer: async (customerId: string): Promise<MaterialIn[]> => {
    return withApiLogging('materialIn.getByCustomer', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.MATERIAL_IN)
        .select('*')
        .eq('customer_id', customerId)
        .order('received_date', { ascending: false })

      if (error) throw new Error(error.message)
      return data || []
    }, { customerId })
  }
}

// ============================================================================
// STOCK OPERATIONS API (CORE - Most Important!)
// ============================================================================
export const stockApi = {
  // Get all stock records
  getAll: async (): Promise<MaterialStock[]> => {
    return withApiLogging('stock.getAll', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.MATERIAL_STOCK)
        .select('*')
        .gt('quantity', 0)
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)
      return data || []
    })
  },

  // Get stock by customer
  getByCustomer: async (customerId: string): Promise<MaterialStock[]> => {
    return withApiLogging('stock.getByCustomer', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.MATERIAL_STOCK)
        .select('*')
        .eq('customer_id', customerId)
        .gt('quantity', 0)
        .order('stage')

      if (error) throw new Error(error.message)
      return data || []
    }, { customerId })
  },

  // Get own stock (ownership = 'self')
  getOwnStock: async (): Promise<MaterialStock[]> => {
    return withApiLogging('stock.getOwnStock', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.MATERIAL_STOCK)
        .select('*')
        .eq('ownership', SIMPLE_ENUMS.OWNERSHIP.SELF)
        .gt('quantity', 0)
        .order('stage')

      if (error) throw new Error(error.message)
      return data || []
    })
  },

  // Get misprint stock
  getMisprintStock: async (): Promise<MaterialStock[]> => {
    return withApiLogging('stock.getMisprintStock', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.MATERIAL_STOCK)
        .select('*')
        .eq('stage', SIMPLE_ENUMS.STAGE.MISPRINT)
        .gt('quantity', 0)

      if (error) throw new Error(error.message)
      return data || []
    })
  },

  // Create stock entry
  create: async (stock: Omit<MaterialStock, 'id' | 'created_at'>): Promise<MaterialStock> => {
    return withApiLogging('stock.create', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.MATERIAL_STOCK)
        .insert(stock)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    }, stock)
  },

  // Move stock to different stage using database function
  moveToStage: async (params: {
    customer_id: string | null
    order_id: string | null
    material_type: string
    from_stage: string
    to_stage: string
    quantity: number
    ownership?: string
  }) => {
    return withApiLogging('stock.moveToStage', async () => {
      const { data, error } = await supabase.rpc('move_stock_to_stage', {
        p_customer_id: params.customer_id,
        p_order_id: params.order_id,
        p_material_type: params.material_type,
        p_from_stage: params.from_stage,
        p_to_stage: params.to_stage,
        p_quantity: params.quantity,
        p_ownership: params.ownership || SIMPLE_ENUMS.OWNERSHIP.CUSTOMER
      })

      if (error) throw new Error(error.message)
      return data
    }, params)
  },

  // Update design availability
  updateDesignStatus: async (params: {
    customer_id: string | null
    order_id: string | null
    material_type: string
    stage: string
    designs_available: boolean
    design_notes?: string
  }) => {
    return withApiLogging('stock.updateDesignStatus', async () => {
      const { data, error } = await supabase.rpc('update_design_availability', {
        p_customer_id: params.customer_id,
        p_order_id: params.order_id,
        p_material_type: params.material_type,
        p_stage: params.stage,
        p_designs_available: params.designs_available,
        p_design_notes: params.design_notes
      })

      if (error) throw new Error(error.message)
      return data
    }, params)
  },

  // Get customer stock summary using database function
  getCustomerSummary: async (customerId: string) => {
    return withApiLogging('stock.getCustomerSummary', async () => {
      const { data, error } = await supabase.rpc('get_customer_stock_summary', {
        p_customer_id: customerId
      })

      if (error) throw new Error(error.message)
      return data
    }, { customerId })
  }
}

// ============================================================================
// DELIVERIES API
// ============================================================================
export const deliveriesApi = {
  createChallan: async (
    challan: Omit<DeliveryChallan, 'id' | 'created_at'>,
    items: Omit<ChallanItem, 'id' | 'challan_id' | 'order_id'>[]
  ) => {
    return withApiLogging('deliveries.createChallan', async () => {
      // 1. Create delivery challan
      const { data: challanData, error: challanError } = await supabase
        .from(SIMPLE_TABLES.DELIVERY_CHALLANS)
        .insert({
          customer_id: challan.customer_id,
          order_id: challan.order_id,
          challan_date: challan.challan_date,
          notes: challan.notes
        })
        .select()
        .single()

      if (challanError) throw new Error(challanError.message)

      // 2. Create challan items with order_id
      const itemsWithChallanId = items.map(item => ({
        challan_id: challanData.id,
        order_id: challan.order_id,  // ✅ Include order_id for reference
        material_type: item.material_type,
        quantity: item.quantity,
        notes: item.notes
      }))

      const { error: itemsError } = await supabase
        .from(SIMPLE_TABLES.CHALLAN_ITEMS)
        .insert(itemsWithChallanId)

      if (itemsError) throw new Error(itemsError.message)

      // 3. Move stock to 'delivered' stage for each item using RPC
      for (const item of items) {
        const { error: moveError } = await supabase.rpc('move_stock_to_stage', {
          p_customer_id: challan.customer_id,
          p_order_id: challan.order_id,
          p_material_type: item.material_type,
          p_from_stage: 'completed',
          p_to_stage: 'delivered',
          p_quantity: item.quantity,
          p_ownership: 'customer'
        })

        if (moveError) throw new Error(`Failed to move ${item.material_type} to delivered: ${moveError.message}`)
      }

      return challanData
    }, { challan, items })
  },

  getAll: async (): Promise<DeliveryChallan[]> => {
    return withApiLogging('deliveries.getAll', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.DELIVERY_CHALLANS)
        .select('*, challan_items(*)')
        .order('challan_date', { ascending: false })

      if (error) throw new Error(error.message)
      return data || []
    })
  },

  getByCustomer: async (customerId: string): Promise<DeliveryChallan[]> => {
    return withApiLogging('deliveries.getByCustomer', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.DELIVERY_CHALLANS)
        .select('*, challan_items(*)')
        .eq('customer_id', customerId)
        .order('challan_date', { ascending: false })

      if (error) throw new Error(error.message)
      return data || []
    }, { customerId })
  },

  // Get challan details for printing (uses v_delivery_challan_details view)
  getChallanDetails: async (challanNumber: string) => {
    return withApiLogging('deliveries.getChallanDetails', async () => {
      const { data, error } = await supabase
        .from('v_delivery_challan_details')
        .select('*')
        .eq('challan_number', challanNumber)
        .order('material_type')

      if (error) throw new Error(error.message)
      return data || []
    }, { challanNumber })
  }
}

// ============================================================================
// INVOICES API
// ============================================================================
export const invoicesApi = {
  create: async (invoice: Omit<GSTInvoice, 'id' | 'created_at'>): Promise<GSTInvoice> => {
    return withApiLogging('invoices.create', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.GST_INVOICES)
        .insert(invoice)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    }, invoice)
  },

  getAll: async (): Promise<GSTInvoice[]> => {
    return withApiLogging('invoices.getAll', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.GST_INVOICES)
        .select('*')
        .order('invoice_date', { ascending: false })

      if (error) throw new Error(error.message)
      return data || []
    })
  },

  getByCustomer: async (customerId: string): Promise<GSTInvoice[]> => {
    return withApiLogging('invoices.getByCustomer', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.GST_INVOICES)
        .select('*')
        .eq('customer_id', customerId)
        .order('invoice_date', { ascending: false })

      if (error) throw new Error(error.message)
      return data || []
    }, { customerId })
  },

  update: async (id: string, invoice: Partial<GSTInvoice>): Promise<GSTInvoice> => {
    return withApiLogging('invoices.update', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.GST_INVOICES)
        .update(invoice)
        .eq('id', id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    }, { id, invoice })
  }
}

// ============================================================================
// PAYMENTS API
// ============================================================================
export const paymentsApi = {
  create: async (payment: Omit<Payment, 'id' | 'created_at'>): Promise<Payment> => {
    return withApiLogging('payments.create', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.PAYMENTS)
        .insert(payment)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    }, payment)
  },

  getAll: async (): Promise<Payment[]> => {
    return withApiLogging('payments.getAll', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.PAYMENTS)
        .select('*')
        .order('payment_date', { ascending: false })

      if (error) throw new Error(error.message)
      return data || []
    })
  },

  getByCustomer: async (customerId: string): Promise<Payment[]> => {
    return withApiLogging('payments.getByCustomer', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.PAYMENTS)
        .select('*')
        .eq('customer_id', customerId)
        .order('payment_date', { ascending: false })

      if (error) throw new Error(error.message)
      return data || []
    }, { customerId })
  },

  getByInvoice: async (invoiceId: string): Promise<Payment[]> => {
    return withApiLogging('payments.getByInvoice', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.PAYMENTS)
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('payment_date', { ascending: false })

      if (error) throw new Error(error.message)
      return data || []
    }, { invoiceId })
  }
}

// ============================================================================
// RETURNS API
// ============================================================================
export const returnsApi = {
  create: async (returnItem: Omit<Return, 'id' | 'created_at'>): Promise<Return> => {
    return withApiLogging('returns.create', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.RETURNS)
        .insert(returnItem)
        .select()
        .single()

      if (error) throw new Error(error.message)

      // If customer return (misprint), move to misprint stock
      if (returnItem.return_type === SIMPLE_ENUMS.RETURN_TYPE.CUSTOMER_RETURN) {
        await stockApi.create({
          customer_id: returnItem.customer_id,
          order_id: returnItem.order_id,
          material_type: returnItem.material_type,
          ownership: SIMPLE_ENUMS.OWNERSHIP.CUSTOMER,
          stage: SIMPLE_ENUMS.STAGE.MISPRINT,
          quantity: returnItem.quantity,
          is_active: true,
          designs_available: true
        })
      }

      return data
    }, returnItem)
  },

  getAll: async (): Promise<Return[]> => {
    return withApiLogging('returns.getAll', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.RETURNS)
        .select('*')
        .order('return_date', { ascending: false })

      if (error) throw new Error(error.message)
      return data || []
    })
  },

  getByCustomer: async (customerId: string): Promise<Return[]> => {
    return withApiLogging('returns.getByCustomer', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.RETURNS)
        .select('*')
        .eq('customer_id', customerId)
        .order('return_date', { ascending: false })

      if (error) throw new Error(error.message)
      return data || []
    }, { customerId })
  }
}

// ============================================================================
// CREDIT NOTES API
// ============================================================================
export const creditNotesApi = {
  create: async (creditNote: Omit<CreditNote, 'id' | 'created_at'>): Promise<CreditNote> => {
    return withApiLogging('creditNotes.create', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.CREDIT_NOTES)
        .insert(creditNote)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    }, creditNote)
  },

  getAll: async (): Promise<CreditNote[]> => {
    return withApiLogging('creditNotes.getAll', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.CREDIT_NOTES)
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)
      return data || []
    })
  },

  getByCustomer: async (customerId: string): Promise<CreditNote[]> => {
    return withApiLogging('creditNotes.getByCustomer', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.CREDIT_NOTES)
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)
      return data || []
    }, { customerId })
  }
}

// ============================================================================
// MISPRINT SALES API
// ============================================================================
export const misprintSalesApi = {
  create: async (sale: Omit<MisprintSale, 'id' | 'created_at'>): Promise<MisprintSale> => {
    return withApiLogging('misprintSales.create', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.MISPRINT_SALES)
        .insert(sale)
        .select()
        .single()

      if (error) throw new Error(error.message)

      // Reduce misprint stock
      // Get current stock
      const { data: stockData, error: stockError } = await supabase
        .from(SIMPLE_TABLES.MATERIAL_STOCK)
        .select('quantity')
        .eq('material_type', sale.material_type)
        .eq('stage', SIMPLE_ENUMS.STAGE.MISPRINT)
        .single()

      if (stockError) throw new Error(stockError.message)

      // Update with reduced quantity
      await supabase
        .from(SIMPLE_TABLES.MATERIAL_STOCK)
        .update({
          quantity: stockData.quantity - sale.quantity,
          updated_at: new Date().toISOString()
        })
        .eq('material_type', sale.material_type)
        .eq('stage', SIMPLE_ENUMS.STAGE.MISPRINT)

      return data
    }, sale)
  },

  getAll: async (): Promise<MisprintSale[]> => {
    return withApiLogging('misprintSales.getAll', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.MISPRINT_SALES)
        .select('*')
        .order('sale_date', { ascending: false })

      if (error) throw new Error(error.message)
      return data || []
    })
  }
}

// ============================================================================
// REPORTS API (Using Database Views)
// ============================================================================
export const reportsApi = {
  // Stock by Customer Report
  getStockByCustomer: async (): Promise<StockByCustomer[]> => {
    return withApiLogging('reports.getStockByCustomer', async () => {
      const { data, error } = await supabase
        .from('v_stock_by_customer')
        .select('*')
        .order('customer_name')

      if (error) throw new Error(error.message)
      return data || []
    })
  },

  // Outstanding Payments Report
  getOutstandingPayments: async (): Promise<OutstandingPayment[]> => {
    return withApiLogging('reports.getOutstandingPayments', async () => {
      const { data, error } = await supabase
        .from('v_outstanding_payments')
        .select('*')
        .order('outstanding_amount', { ascending: false })

      if (error) throw new Error(error.message)
      return data || []
    })
  },

  // Outstanding Orders Report
  getOutstandingOrders: async (): Promise<OutstandingOrder[]> => {
    return withApiLogging('reports.getOutstandingOrders', async () => {
      const { data, error } = await supabase
        .from('v_outstanding_orders')
        .select('*')
        .gt('pending_quantity', 0)
        .order('customer_name')

      if (error) throw new Error(error.message)
      return data || []
    })
  },

  // Misprint Stock Report
  getMisprintStock: async () => {
    return withApiLogging('reports.getMisprintStock', async () => {
      const { data, error } = await supabase
        .from('v_misprint_stock')
        .select('*')
        .order('material_type')

      if (error) throw new Error(error.message)
      return data || []
    })
  }
}

// ============================================================================
// MATERIAL TYPES API (Product Types)
// ============================================================================
export interface MaterialType {
  id: string
  type_code: string
  type_name: string
  description?: string
  unit_of_measure: string
  is_active: boolean
  created_at: string
}

export const materialTypesApi = {
  getAll: async (): Promise<MaterialType[]> => {
    return withApiLogging('materialTypes.getAll', async () => {
      const { data, error } = await supabase
        .from('material_types')
        .select('*')
        .eq('is_active', true)
        .order('type_name')

      if (error) throw new Error(error.message)
      return data || []
    })
  },

  getByCode: async (typeCode: string): Promise<MaterialType> => {
    return withApiLogging('materialTypes.getByCode', async () => {
      const { data, error } = await supabase
        .from('material_types')
        .select('*')
        .eq('type_code', typeCode)
        .single()

      if (error) throw new Error(error.message)
      return data
    }, { typeCode })
  },

  create: async (materialType: Omit<MaterialType, 'id' | 'created_at'>): Promise<MaterialType> => {
    return withApiLogging('materialTypes.create', async () => {
      const { data, error } = await supabase
        .from('material_types')
        .insert(materialType)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    }, materialType)
  }
}

// ============================================================================
// DESIGN TRACKING API
// ============================================================================
export interface PendingDesign {
  customer_id: string
  customer_name: string
  customer_phone: string
  order_id: string
  order_number: string
  order_date: string
  material_type: string
  total_quantity: number
  designs_given: number
  designs_pending: number
  design_completion_pct: number
  design_notes?: string
  batch_identifier?: string
  tracking_started: string
  last_updated: string
}

export const designTrackingApi = {
  // Add designs to an order using RPC
  addDesigns: async (params: {
    customer_id: string
    order_id: string
    material_type: string
    designs_to_add: number
    batch_identifier?: string
  }) => {
    return withApiLogging('designTracking.addDesigns', async () => {
      const { error } = await supabase.rpc('update_design_count', {
        p_customer_id: params.customer_id,
        p_order_id: params.order_id,
        p_material_type: params.material_type,
        p_designs_to_add: params.designs_to_add,
        p_batch_identifier: params.batch_identifier || null
      })

      if (error) throw new Error(error.message)
    }, params)
  },

  // Get all pending designs (designs_pending > 0)
  getPendingDesigns: async (): Promise<PendingDesign[]> => {
    return withApiLogging('designTracking.getPendingDesigns', async () => {
      const { data, error } = await supabase
        .from('v_pending_designs')
        .select('*')

      if (error) throw new Error(error.message)
      return data || []
    })
  },

  // Get pending designs for a specific customer
  getPendingDesignsByCustomer: async (customerId: string): Promise<PendingDesign[]> => {
    return withApiLogging('designTracking.getPendingDesignsByCustomer', async () => {
      const { data, error } = await supabase
        .from('v_pending_designs')
        .select('*')
        .eq('customer_id', customerId)

      if (error) throw new Error(error.message)
      return data || []
    }, { customerId })
  },

  // Get all design tracking records (including completed)
  getAllDesignTracking: async (): Promise<MaterialDesignTracking[]> => {
    return withApiLogging('designTracking.getAll', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.MATERIAL_DESIGN_TRACKING)
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw new Error(error.message)
      return data || []
    })
  },

  // Get design tracking for a specific order
  getByOrder: async (orderId: string): Promise<MaterialDesignTracking[]> => {
    return withApiLogging('designTracking.getByOrder', async () => {
      const { data, error } = await supabase
        .from(SIMPLE_TABLES.MATERIAL_DESIGN_TRACKING)
        .select('*')
        .eq('order_id', orderId)
        .order('material_type')

      if (error) throw new Error(error.message)
      return data || []
    }, { orderId })
  }
}

// ============================================================================
// INVOICE-CHALLAN LINKING API
// ============================================================================
export interface InvoiceChallan {
  id: string
  invoice_id: string
  challan_id: string
  created_at: string
}

export const invoiceChallanApi = {
  // Link invoice to challan
  linkInvoiceToChallan: async (invoiceId: string, challanId: string): Promise<InvoiceChallan> => {
    return withApiLogging('invoiceChallan.link', async () => {
      const { data, error } = await supabase
        .from('invoice_challans')
        .insert({ invoice_id: invoiceId, challan_id: challanId })
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    }, { invoiceId, challanId })
  },

  // Link invoice to multiple challans
  linkInvoiceToChallans: async (invoiceId: string, challanIds: string[]): Promise<InvoiceChallan[]> => {
    return withApiLogging('invoiceChallan.linkMultiple', async () => {
      const links = challanIds.map(challanId => ({
        invoice_id: invoiceId,
        challan_id: challanId
      }))

      const { data, error } = await supabase
        .from('invoice_challans')
        .insert(links)
        .select()

      if (error) throw new Error(error.message)
      return data || []
    }, { invoiceId, challanIds })
  },

  // Get challans for an invoice
  getChallansByInvoice: async (invoiceId: string): Promise<DeliveryChallan[]> => {
    return withApiLogging('invoiceChallan.getChallansByInvoice', async () => {
      const { data, error } = await supabase
        .from('invoice_challans')
        .select('delivery_challans(*)')
        .eq('invoice_id', invoiceId)

      if (error) throw new Error(error.message)
      return data?.map((item: any) => item.delivery_challans) || []
    }, { invoiceId })
  },

  // Get invoice for a challan
  getInvoiceByChallan: async (challanId: string): Promise<GSTInvoice | null> => {
    return withApiLogging('invoiceChallan.getInvoiceByChallan', async () => {
      const { data, error } = await supabase
        .from('invoice_challans')
        .select('invoice_id')
        .eq('challan_id', challanId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null // Not found
        throw new Error(error.message)
      }

      if (!data?.invoice_id) return null

      // Fetch the actual invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from(SIMPLE_TABLES.GST_INVOICES)
        .select('*')
        .eq('id', data.invoice_id)
        .single()

      if (invoiceError) throw new Error(invoiceError.message)

      return invoice
    }, { challanId })
  },

  // Create invoice from challan(s)
  createInvoiceFromChallans: async (
    challanIds: string[],
    invoiceDetails: Omit<GSTInvoice, 'id' | 'created_at' | 'invoice_number'>
  ): Promise<{ invoice: GSTInvoice; links: InvoiceChallan[] }> => {
    return withApiLogging('invoiceChallan.createFromChallans', async () => {
      // 1. Create invoice (invoice_number auto-generated)
      const { data: invoice, error: invoiceError } = await supabase
        .from(SIMPLE_TABLES.GST_INVOICES)
        .insert(invoiceDetails)
        .select()
        .single()

      if (invoiceError) throw new Error(invoiceError.message)

      // 2. Link to challans
      const links = challanIds.map(challanId => ({
        invoice_id: invoice.id,
        challan_id: challanId
      }))

      const { data: linkData, error: linkError } = await supabase
        .from('invoice_challans')
        .insert(links)
        .select()

      if (linkError) throw new Error(linkError.message)

      return {
        invoice,
        links: linkData || []
      }
    }, { challanIds, invoiceDetails })
  }
}

// ============================================================================
// EXPORT ALL APIs
// ============================================================================
export const simplifiedApi = {
  auth: authApi,
  customers: customersApi,
  orders: ordersApi,
  orderItems: orderItemsApi,
  materialIn: materialInApi,
  stock: stockApi,
  deliveries: deliveriesApi,
  invoices: invoicesApi,
  payments: paymentsApi,
  returns: returnsApi,
  creditNotes: creditNotesApi,
  misprintSales: misprintSalesApi,
  reports: reportsApi,
  materialTypes: materialTypesApi,
  designTracking: designTrackingApi,
  invoiceChallan: invoiceChallanApi
}

export default simplifiedApi
