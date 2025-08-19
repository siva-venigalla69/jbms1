// Supabase API Service - Digital Textile Printing System
// Replaces the FastAPI backend with Supabase client calls

import { supabase, supabaseHelpers, businessHelpers, TABLES, ENUMS } from '../lib/supabase'
import type { Customer, Order, OrderItem, User, MaterialIn, DeliveryChallan, DeliveryChallanCreate, GST_Invoice, GST_InvoiceCreate, Payment, ReturnItem, InventoryItem, Expense } from '../types'
import { apiLogger, logNetworkRequest, performance } from '../utils/debug'

// API call wrapper with logging
const withApiLogging = async <T>(
  operation: string,
  fn: () => Promise<T>,
  params?: any
): Promise<T> => {
  const operationId = `${operation}-${Date.now()}`;
  apiLogger.info(`Starting API operation: ${operation}`, params);
  performance.mark(`${operation}-start`);
  
  try {
    const result = await fn();
    performance.measure(operation, `${operation}-start`);
    apiLogger.info(`API operation completed: ${operation}`);
    return result;
  } catch (error) {
    performance.measure(`${operation}-error`, `${operation}-start`);
    apiLogger.error(`API operation failed: ${operation}`, { error, params });
    throw error;
  }
};

// Authentication API
export const authApi = {
  login: async (email: string, password: string) => {
    return withApiLogging('auth.login', async () => {
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
    }, { email });
  },

  logout: async () => {
    return withApiLogging('auth.logout', async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw new Error(error.message)
    });
  },

  getCurrentUser: async (): Promise<User | null> => {
    return withApiLogging('auth.getCurrentUser', async () => {
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
    });
  },

  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabaseHelpers.getAll(TABLES.USERS, {
      orderBy: { column: 'full_name' }
    })
    if (error) throw new Error(error.message)
    return (data as unknown as User[]) || []
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
    return (data as unknown as Customer[]) || []
  },

  getCustomer: async (id: string): Promise<Customer> => {
    const { data, error } = await supabaseHelpers.getById(TABLES.CUSTOMERS, id)
    if (error) throw new Error(error.message)
    if (!data) throw new Error('Customer not found')
    return data as unknown as Customer
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
    return withApiLogging('order.create', async () => {
      // Log the input data for debugging
      apiLogger.info('Order creation input data', orderData);
      
      // First verify the customer exists
      const { data: customerCheck, error: customerError } = await supabase
        .from(TABLES.CUSTOMERS)
        .select('id, name')
        .eq('id', orderData.customer_id)
        .single();
      
      if (customerError || !customerCheck) {
        apiLogger.error('Customer verification failed', { customerError, customer_id: orderData.customer_id });
        throw new Error(`Invalid customer ID: ${orderData.customer_id}`);
      }
      
      apiLogger.info('Customer verified', customerCheck);
      
      // Generate order number
      const orderNumber = `ORD-${Date.now()}`;
      
      // Calculate total amount
      const totalAmount = orderData.items.reduce((sum, item) => 
        sum + (item.quantity * item.unit_price), 0
      );

      // Try minimal insert first to isolate the issue
      const orderInsertData = {
        order_number: orderNumber,
        customer_id: orderData.customer_id,
        order_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        total_amount: totalAmount,
      };
      
      apiLogger.info('Order insert data', orderInsertData);

      // Create the order first
      const { data: order, error: orderError } = await supabase
        .from(TABLES.ORDERS)
        .insert(orderInsertData)
        .select(`
          *,
          customer:customers(*)
        `)
        .single();

      if (orderError) {
        apiLogger.error('Order creation failed with detailed error', {
          error: orderError,
          code: orderError.code,
          message: orderError.message,
          details: orderError.details,
          hint: orderError.hint,
          insertData: orderInsertData
        });
        throw new Error(`Failed to create order: ${orderError.message || 'Unknown error'} (Code: ${orderError.code || 'N/A'})`);
      }

      // Create order items
      const orderItems = orderData.items.map(item => ({
        order_id: order.id,
        material_type: item.material_type,
        quantity: item.quantity,
        unit_price: item.unit_price,
        customization_details: item.customization_details || null,
        subtotal: item.quantity * item.unit_price,
        created_at: new Date().toISOString(),
      }));

      const { data: items, error: itemsError } = await supabase
        .from(TABLES.ORDER_ITEMS)
        .insert(orderItems)
        .select('*');

      if (itemsError) {
        // Rollback: delete the order if items creation fails
        await supabase.from(TABLES.ORDERS).delete().eq('id', order.id);
        throw new Error(`Failed to create order items: ${itemsError.message}`);
      }

      // Return the complete order with items
      return {
        ...order,
        order_items: items,
      };
    }, orderData);
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
  },

  updateOrderItem: async (id: string, itemData: Partial<OrderItem>): Promise<OrderItem> => {
    return withApiLogging('orderItem.updateOrderItem', async () => {
      const updateData = {
        ...itemData,
        subtotal: itemData.quantity && itemData.unit_price ? 
          itemData.quantity * itemData.unit_price : undefined,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabaseHelpers.update(TABLES.ORDER_ITEMS, id, updateData)
      if (error) throw new Error(error.message)
      return data
    }, { id, itemData })
  },

  deleteOrderItem: async (id: string): Promise<void> => {
    return withApiLogging('orderItem.deleteOrderItem', async () => {
      const { error } = await supabaseHelpers.delete(TABLES.ORDER_ITEMS, id)
      if (error) throw new Error(error.message)
    }, { id })
  },

  createOrderItem: async (itemData: any): Promise<OrderItem> => {
    return withApiLogging('orderItem.createOrderItem', async () => {
      const createData = {
        ...itemData,
        subtotal: itemData.quantity * itemData.unit_price,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabaseHelpers.create(TABLES.ORDER_ITEMS, createData)
      if (error) throw new Error(error.message)
      return data
    }, itemData)
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
  },

  updateMaterialIn: async (id: string, materialData: Partial<MaterialIn>): Promise<MaterialIn> => {
    const { data, error } = await supabaseHelpers.update(TABLES.MATERIAL_IN, id, materialData)
    if (error) throw new Error(error.message)
    return data
  },

  deleteMaterialIn: async (id: string): Promise<void> => {
    const { error } = await supabaseHelpers.delete(TABLES.MATERIAL_IN, id)
    if (error) throw new Error(error.message)
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
    return (data as unknown as InventoryItem[]) || []
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

// Delivery Challan API
export const deliveryChallanApi = {
  getDeliveryChallans: async (params?: {
    skip?: number
    limit?: number
    customer_id?: string
    status?: string
  }): Promise<DeliveryChallan[]> => {
    return withApiLogging('deliveryChallan.getDeliveryChallans', async () => {
      let query = supabase
        .from(TABLES.DELIVERY_CHALLANS)
        .select(`
          *,
          customer:customers(*),
          order:orders(
            order_number,
            status,
            customer:customers(name)
          )
        `)
        .order('created_at', { ascending: false })
      
      if (params?.customer_id) {
        query = query.eq('customer_id', params.customer_id)
      }
      
      if (params?.status) {
        query = query.eq('status', params.status)
      }
      
      if (params?.limit) {
        query = query.limit(params.limit)
      }
      
      const { data, error } = await query
      
      if (error) throw new Error(error.message)
      return data || []
    }, params)
  },

  getDeliveryChallan: async (id: string): Promise<DeliveryChallan> => {
    return withApiLogging('deliveryChallan.getDeliveryChallan', async () => {
      const { data, error } = await supabase
        .from(TABLES.DELIVERY_CHALLANS)
        .select(`
          *,
          customer:customers(*),
          order:orders(
            *,
            customer:customers(*),
            order_items(*)
          )
        `)
        .eq('id', id)
        .single()
      
      if (error) throw new Error(error.message)
      return data
    }, { id })
  },

  createDeliveryChallan: async (challanData: DeliveryChallanCreate): Promise<DeliveryChallan> => {
    return withApiLogging('deliveryChallan.createDeliveryChallan', async () => {
      // Generate challan number if not provided
      const challanNumber = challanData.challan_number || `DC-${Date.now()}`
      
      // Prepare the data for insertion
      const insertData = {
        challan_number: challanNumber,
        customer_id: challanData.customer_id,
        order_id: challanData.order_id,
        delivery_date: challanData.delivery_date,
        status: challanData.status,
        notes: challanData.notes || null,
        created_at: new Date().toISOString()
      }
      
      const { data, error } = await supabase
        .from(TABLES.DELIVERY_CHALLANS)
        .insert(insertData)
        .select(`
          *,
          customer:customers(*),
          order:orders(*)
        `)
        .single()
      
      if (error) {
        console.error('Delivery challan creation error:', error)
        throw new Error(error.message)
      }
      return data
    }, challanData)
  },

  updateDeliveryChallan: async (id: string, updateData: Partial<DeliveryChallanCreate>): Promise<DeliveryChallan> => {
    return withApiLogging('deliveryChallan.updateDeliveryChallan', async () => {
      const { data, error } = await supabaseHelpers.update(TABLES.DELIVERY_CHALLANS, id, {
        ...updateData,
        updated_at: new Date().toISOString()
      })
      
      if (error) throw new Error(error.message)
      return data
    }, { id, updateData })
  },

  deleteDeliveryChallan: async (id: string): Promise<void> => {
    return withApiLogging('deliveryChallan.deleteDeliveryChallan', async () => {
      const { error } = await supabaseHelpers.delete(TABLES.DELIVERY_CHALLANS, id)
      if (error) throw new Error(error.message)
    }, { id })
  }
}

// GST Invoice API
export const gstInvoiceApi = {
  getGSTInvoices: async (params?: {
    skip?: number
    limit?: number
    customer_id?: string
    status?: string
  }): Promise<GST_Invoice[]> => {
    return withApiLogging('gstInvoice.getGSTInvoices', async () => {
      let query = supabase
        .from(TABLES.GST_INVOICES)
        .select(`
          *,
          customer:customers(*),
          order:orders(
            order_number,
            status,
            customer:customers(name)
          )
        `)
        .order('created_at', { ascending: false })
      
      if (params?.customer_id) {
        query = query.eq('customer_id', params.customer_id)
      }
      
      if (params?.status) {
        query = query.eq('status', params.status)
      }
      
      if (params?.limit) {
        query = query.limit(params.limit)
      }
      
      const { data, error } = await query
      
      if (error) throw new Error(error.message)
      return data || []
    }, params)
  },

  getGSTInvoice: async (id: string): Promise<GST_Invoice> => {
    return withApiLogging('gstInvoice.getGSTInvoice', async () => {
      const { data, error } = await supabase
        .from(TABLES.GST_INVOICES)
        .select(`
          *,
          customer:customers(*),
          order:orders(
            *,
            customer:customers(*),
            order_items(*)
          )
        `)
        .eq('id', id)
        .single()
      
      if (error) throw new Error(error.message)
      return data
    }, { id })
  },

  createGSTInvoice: async (invoiceData: GST_InvoiceCreate): Promise<GST_Invoice> => {
    return withApiLogging('gstInvoice.createGSTInvoice', async () => {
      // Generate invoice number if not provided
      const invoiceNumber = invoiceData.invoice_number || `INV${Date.now()}`
      
      const { data, error } = await supabaseHelpers.create(TABLES.GST_INVOICES, {
        ...invoiceData,
        invoice_number: invoiceNumber,
        created_at: new Date().toISOString()
      })
      
      if (error) throw new Error(error.message)
      return data
    }, invoiceData)
  },

  updateGSTInvoice: async (id: string, updateData: Partial<GST_InvoiceCreate>): Promise<GST_Invoice> => {
    return withApiLogging('gstInvoice.updateGSTInvoice', async () => {
      const { data, error } = await supabaseHelpers.update(TABLES.GST_INVOICES, id, {
        ...updateData,
        updated_at: new Date().toISOString()
      })
      
      if (error) throw new Error(error.message)
      return data
    }, { id, updateData })
  },

  deleteGSTInvoice: async (id: string): Promise<void> => {
    return withApiLogging('gstInvoice.deleteGSTInvoice', async () => {
      const { error } = await supabaseHelpers.delete(TABLES.GST_INVOICES, id)
      if (error) throw new Error(error.message)
    }, { id })
  }
}