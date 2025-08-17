// Supabase API Service - Digital Textile Printing System
// Replaces the FastAPI backend with Supabase client calls

import { supabase, supabaseHelpers, businessHelpers, TABLES, ENUMS } from '../../lib/supabase'
import type { Customer, Order, OrderItem, User, MaterialIn, DeliveryChallan, GST_Invoice, Payment, ReturnItem, InventoryItem, Expense } from '../types'

// Authentication API
export const authApi = {
  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw new Error(error.message)
    
    return {
      access_token: data.session?.access_token,
      token_type: 'Bearer',
      user: data.user
    }
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
  },

  getCurrentUser: async (): Promise<User | null> => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw new Error(error.message)
    
    if (!user) return null
    
    // Get user profile from users table
    const { data: profile, error: profileError } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('email', user.email)
      .single()
    
    if (profileError) throw new Error(profileError.message)
    
    return profile
  },

  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabaseHelpers.getAll(TABLES.USERS, {
      orderBy: { column: 'full_name' }
    })
    if (error) throw new Error(error.message)
    return data || []
  },

  register: async (userData: Partial<User>): Promise<User> => {
    // This would typically be handled by admin through Supabase dashboard
    // For now, we'll create a user record (password handled separately)
    const { data, error } = await supabaseHelpers.create(TABLES.USERS, userData)
    if (error) throw new Error(error.message)
    return data
  }
}

// Customer API
export const customerApi = {
  getCustomers: async (params?: {
    skip?: number
    limit?: number
    search?: string
  }): Promise<Customer[]> => {
    const options: any = {
      orderBy: { column: 'name' },
      filters: { is_deleted: false }
    }
    
    if (params?.limit) {
      options.limit = params.limit
    }
    
    if (params?.skip) {
      options.range = { from: params.skip, to: params.skip + (params.limit || 25) - 1 }
    }
    
    let data, error
    
    if (params?.search) {
      ({ data, error } = await businessHelpers.customers.search(params.search))
    } else {
      ({ data, error } = await supabaseHelpers.getAll(TABLES.CUSTOMERS, options))
    }
    
    if (error) throw new Error(error.message)
    return data || []
  },

  getCustomer: async (id: string): Promise<Customer> => {
    const { data, error } = await supabaseHelpers.getById(TABLES.CUSTOMERS, id)
    if (error) throw new Error(error.message)
    return data
  },

  createCustomer: async (customerData: Partial<Customer>): Promise<Customer> => {
    const { data, error } = await businessHelpers.customers.create(customerData)
    if (error) throw new Error(error.message)
    return data
  },

  updateCustomer: async (id: string, customerData: Partial<Customer>): Promise<Customer> => {
    const { data, error } = await supabaseHelpers.update(TABLES.CUSTOMERS, id, customerData)
    if (error) throw new Error(error.message)
    return data
  },

  deleteCustomer: async (id: string): Promise<void> => {
    const { error } = await supabaseHelpers.softDelete(TABLES.CUSTOMERS, id)
    if (error) throw new Error(error.message)
  }
}

// Order API
export const orderApi = {
  getOrders: async (params?: {
    skip?: number
    limit?: number
    customer_id?: string
    status?: string
  }): Promise<Order[]> => {
    const options: any = {
      orderBy: { column: 'order_date', ascending: false },
      filters: { is_deleted: false }
    }
    
    if (params?.customer_id) {
      options.filters.customer_id = params.customer_id
    }
    
    if (params?.status) {
      options.filters.status = params.status
    }
    
    if (params?.limit) {
      options.limit = params.limit
    }
    
    if (params?.skip) {
      options.range = { from: params.skip, to: params.skip + (params.limit || 25) - 1 }
    }
    
    const { data, error } = await supabase
      .from(TABLES.ORDERS)
      .select(`
        *,
        customer:customers(*)
      `)
      .eq('is_deleted', false)
      .order('order_date', { ascending: false })
    
    if (error) throw new Error(error.message)
    return data || []
  },

  getOrder: async (id: string): Promise<Order> => {
    const { data, error } = await businessHelpers.orders.getWithItems(id)
    if (error) throw new Error(error.message)
    return data
  },

  createOrder: async (orderData: {
    customer_id: string
    notes?: string
    items: Array<{
      material_type: string
      quantity: number
      unit_price: number
      customization_details?: string
    }>
  }): Promise<Order> => {
    // This would call the Supabase Edge Function for complex order creation
    const { data: { session } } = await supabase.auth.getSession()
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    })
    
    const result = await response.json()
    if (!response.ok) throw new Error(result.error)
    
    return result.data
  },

  updateOrder: async (id: string, orderData: Partial<Order>): Promise<Order> => {
    const { data, error } = await supabaseHelpers.update(TABLES.ORDERS, id, orderData)
    if (error) throw new Error(error.message)
    return data
  },

  updateOrderStatus: async (id: string, status: string): Promise<Order> => {
    const { data, error } = await businessHelpers.orders.updateStatus(id, status)
    if (error) throw new Error(error.message)
    return data
  },

  deleteOrder: async (id: string): Promise<void> => {
    const { error } = await supabaseHelpers.softDelete(TABLES.ORDERS, id)
    if (error) throw new Error(error.message)
  }
}

// Order Items API
export const orderItemApi = {
  updateProductionStage: async (id: string, stage: string): Promise<OrderItem> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')
    
    const { data, error } = await businessHelpers.production.updateStage(id, stage, user.id)
    if (error) throw new Error(error.message)
    return data
  },

  getProductionStatus: async (): Promise<OrderItem[]> => {
    const { data, error } = await businessHelpers.production.getProductionStatus()
    if (error) throw new Error(error.message)
    return data || []
  }
}

// Material In API
export const materialInApi = {
  getMaterialIn: async (params?: {
    skip?: number
    limit?: number
    customer_id?: string
  }): Promise<MaterialIn[]> => {
    const options: any = {
      orderBy: { column: 'received_date', ascending: false }
    }
    
    if (params?.customer_id) {
      options.filters = { customer_id: params.customer_id }
    }
    
    if (params?.limit) {
      options.limit = params.limit
    }
    
    const { data, error } = await supabase
      .from(TABLES.MATERIAL_IN)
      .select(`
        *,
        customer:customers(name),
        order:orders(order_number)
      `)
      .order('received_date', { ascending: false })
    
    if (error) throw new Error(error.message)
    return data || []
  },

  createMaterialIn: async (materialData: Partial<MaterialIn>): Promise<MaterialIn> => {
    const { data, error } = await supabaseHelpers.create(TABLES.MATERIAL_IN, materialData)
    if (error) throw new Error(error.message)
    return data
  }
}

// Delivery Challan API
export const challanApi = {
  getChallans: async (params?: {
    skip?: number
    limit?: number
    customer_id?: string
  }): Promise<DeliveryChallan[]> => {
    const options: any = {
      orderBy: { column: 'challan_date', ascending: false },
      filters: { is_deleted: false }
    }
    
    if (params?.customer_id) {
      options.filters.customer_id = params.customer_id
    }
    
    const { data, error } = await supabase
      .from(TABLES.DELIVERY_CHALLANS)
      .select(`
        *,
        customer:customers(*)
      `)
      .eq('is_deleted', false)
      .order('challan_date', { ascending: false })
    
    if (error) throw new Error(error.message)
    return data || []
  },

  createChallan: async (challanData: Partial<DeliveryChallan>): Promise<DeliveryChallan> => {
    const { data, error } = await supabaseHelpers.create(TABLES.DELIVERY_CHALLANS, challanData)
    if (error) throw new Error(error.message)
    return data
  }
}

// Invoice API
export const invoiceApi = {
  getInvoices: async (params?: {
    skip?: number
    limit?: number
    customer_id?: string
  }): Promise<GST_Invoice[]> => {
    const options: any = {
      orderBy: { column: 'invoice_date', ascending: false },
      filters: { is_deleted: false }
    }
    
    if (params?.customer_id) {
      options.filters.customer_id = params.customer_id
    }
    
    const { data, error } = await supabase
      .from(TABLES.GST_INVOICES)
      .select(`
        *,
        customer:customers(*)
      `)
      .eq('is_deleted', false)
      .order('invoice_date', { ascending: false })
    
    if (error) throw new Error(error.message)
    return data || []
  },

  createInvoice: async (invoiceData: Partial<GST_Invoice>): Promise<GST_Invoice> => {
    const { data, error } = await supabaseHelpers.create(TABLES.GST_INVOICES, invoiceData)
    if (error) throw new Error(error.message)
    return data
  }
}

// Payment API
export const paymentApi = {
  getPayments: async (params?: {
    skip?: number
    limit?: number
    invoice_id?: string
  }): Promise<Payment[]> => {
    const options: any = {
      orderBy: { column: 'payment_date', ascending: false }
    }
    
    if (params?.invoice_id) {
      options.filters = { invoice_id: params.invoice_id }
    }
    
    const { data, error } = await supabase
      .from(TABLES.PAYMENTS)
      .select(`
        *,
        invoice:gst_invoices(
          invoice_number,
          customer:customers(name)
        )
      `)
      .order('payment_date', { ascending: false })
    
    if (error) throw new Error(error.message)
    return data || []
  },

  createPayment: async (paymentData: Partial<Payment>): Promise<Payment> => {
    const { data, error } = await supabaseHelpers.create(TABLES.PAYMENTS, paymentData)
    if (error) throw new Error(error.message)
    return data
  }
}

// Reports API
export const reportsApi = {
  getPendingOrders: async (): Promise<Order[]> => {
    const { data, error } = await businessHelpers.reports.pendingOrders()
    if (error) throw new Error(error.message)
    return data || []
  },

  getPendingReceivables: async (): Promise<GST_Invoice[]> => {
    const { data, error } = await businessHelpers.reports.pendingReceivables()
    if (error) throw new Error(error.message)
    return data || []
  },

  getPaymentsInDateRange: async (startDate: string, endDate: string): Promise<Payment[]> => {
    const { data, error } = await businessHelpers.reports.paymentsInDateRange(startDate, endDate)
    if (error) throw new Error(error.message)
    return data || []
  },

  getExpensesInDateRange: async (startDate: string, endDate: string): Promise<Expense[]> => {
    const { data, error } = await businessHelpers.reports.expensesInDateRange(startDate, endDate)
    if (error) throw new Error(error.message)
    return data || []
  }
}

// Inventory API
export const inventoryApi = {
  getInventory: async (): Promise<InventoryItem[]> => {
    const { data, error } = await supabaseHelpers.getAll(TABLES.INVENTORY, {
      orderBy: { column: 'item_name' }
    })
    if (error) throw new Error(error.message)
    return data || []
  },

  createInventoryItem: async (itemData: Partial<InventoryItem>): Promise<InventoryItem> => {
    const { data, error } = await supabaseHelpers.create(TABLES.INVENTORY, itemData)
    if (error) throw new Error(error.message)
    return data
  },

  updateInventoryItem: async (id: string, itemData: Partial<InventoryItem>): Promise<InventoryItem> => {
    const { data, error } = await supabaseHelpers.update(TABLES.INVENTORY, id, itemData)
    if (error) throw new Error(error.message)
    return data
  }
}

// Expense API
export const expenseApi = {
  getExpenses: async (params?: {
    skip?: number
    limit?: number
    startDate?: string
    endDate?: string
  }): Promise<Expense[]> => {
    let query = supabase
      .from(TABLES.EXPENSES)
      .select('*')
      .order('expense_date', { ascending: false })
    
    if (params?.startDate) {
      query = query.gte('expense_date', params.startDate)
    }
    
    if (params?.endDate) {
      query = query.lte('expense_date', params.endDate)
    }
    
    if (params?.limit) {
      query = query.limit(params.limit)
    }
    
    const { data, error } = await query
    
    if (error) throw new Error(error.message)
    return data || []
  },

  createExpense: async (expenseData: Partial<Expense>): Promise<Expense> => {
    const { data, error } = await supabaseHelpers.create(TABLES.EXPENSES, expenseData)
    if (error) throw new Error(error.message)
    return data
  }
}

// Returns API
export const returnsApi = {
  getReturns: async (params?: {
    skip?: number
    limit?: number
    startDate?: string
    endDate?: string
  }): Promise<ReturnItem[]> => {
    let query = supabase
      .from(TABLES.RETURNS)
      .select(`
        *,
        order_item:order_items(
          *,
          order:orders(
            order_number,
            customer:customers(name)
          )
        )
      `)
      .order('return_date', { ascending: false })
    
    if (params?.startDate) {
      query = query.gte('return_date', params.startDate)
    }
    
    if (params?.endDate) {
      query = query.lte('return_date', params.endDate)
    }
    
    if (params?.limit) {
      query = query.limit(params.limit)
    }
    
    const { data, error } = await query
    
    if (error) throw new Error(error.message)
    return data || []
  },

  createReturn: async (returnData: Partial<ReturnItem>): Promise<ReturnItem> => {
    const { data, error } = await supabaseHelpers.create(TABLES.RETURNS, returnData)
    if (error) throw new Error(error.message)
    return data
  }
}