// Supabase API Service - Digital Textile Printing System
// Replaces the FastAPI backend with Supabase client calls

import { supabase, supabaseHelpers, businessHelpers, TABLES } from '../lib/supabase'
import type { Customer, Order, OrderItem, User, MaterialIn, DeliveryChallan, DeliveryChallanCreate, GST_Invoice, GST_InvoiceCreate, Payment, ReturnItem, InventoryItem, Expense, StageStockSummary, CustomerDesignSummary } from '../types'
import { apiLogger, performance, componentLogger } from '../utils/debug'
import { auditTrail, logOrderCreated, logMaterialReceived, logPaymentReceived, logInvoiceGenerated } from './auditTrailService'
import { /* filterItemsByStageAndDesign, */ groupItemsByStageAndDesignStatus, parseDesignStatus, parseProductionStatus } from '../utils/productionUtils'
import { designerApi } from './designerApi'

// Helper functions for parsing status from legacy data
const parseDesignStatusFromItem = (item: any): string => {
  const parsed = parseDesignStatus(item.customization_details, item);
  if (item.design_ready) return 'design_ready';
  if (item.design_received || parsed === 'design_received_from_customer') return 'design_received_from_customer';
  return 'pending_from_customer';
};

const parseProductionStatusFromItem = (item: any): string => {
  const parsed = parseProductionStatus(item.customization_details, item);
  if (item.current_stage === 'post_process' || parsed === 'post_process') return 'post_process';
  if (item.current_stage === 'printing' || parsed === 'printing') return 'printing';
  return 'pending';
};

// API call wrapper with logging
export const withApiLogging = async <T>(
  operation: string,
  fn: () => Promise<T>,
  params?: any
): Promise<T> => {
  // const operationId = `${operation}-${Date.now()}`;
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
        customer:customers(*),
        order_items:order_items(*)
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

      apiLogger.info('Creating order items...', { orderItemsCount: orderData.items.length });
      
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

      apiLogger.debug('Order items data', orderItems);

      const { data: items, error: itemsError } = await supabase
        .from(TABLES.ORDER_ITEMS)
        .insert(orderItems)
        .select('*');

      if (itemsError) {
        apiLogger.error('Order items creation failed', itemsError);
        // Rollback: delete the order if items creation fails
        await supabase.from(TABLES.ORDERS).delete().eq('id', order.id);
        throw new Error(`Failed to create order items: ${itemsError.message}`);
      }

      apiLogger.info('Order items created successfully', { itemsCreated: items?.length });
      
      // Auto-assign designers to order items (non-blocking)
      if (items && items.length > 0) {
        apiLogger.info('Auto-assigning designers to order items...');
        
        const assignmentPromises = items.map(async (item) => {
          try {
            // Check if design exists in library for this material type
            let designExists = false;
            
            // Simple design code check from customization details
            const designCode = item.customization_details?.match(/design[:\s]*([A-Z0-9_]+)/i)?.[1];
            if (designCode) {
              designExists = await designerApi.checkDesignAvailability(designCode, item.material_type);
            }
            
            // Determine priority based on order total and material type
            let priority: 'urgent' | 'high' | 'normal' | 'low' = 'normal';
            if (totalAmount > 10000) priority = 'high';
            if (totalAmount > 20000) priority = 'urgent';
            if (['wedding', 'bridal'].some(keyword => 
                item.customization_details?.toLowerCase().includes(keyword))) {
              priority = 'urgent';
            }
            
            // Calculate estimated hours based on material type and quantity
            const baseHours = {
              'saree': 3.0,
              'dupatta': 2.0,
              'voni': 4.0,
              'blouse': 2.5,
              'lehenga': 6.0
            };
            const estimatedHours = (baseHours[item.material_type as keyof typeof baseHours] || 2.0) * item.quantity;
            
            // Set expected delivery date (3 days for normal, 2 days for high, 1 day for urgent)
            const deliveryDays = priority === 'urgent' ? 1 : priority === 'high' ? 2 : 3;
            const expectedDate = new Date();
            expectedDate.setDate(expectedDate.getDate() + deliveryDays);
            
            // Auto-assign designer using the built-in workload balancing function
            await designerApi.autoAssignDesigner(
              item.id,
              priority,
              estimatedHours
            );
            
            apiLogger.info('Designer auto-assigned', { 
              orderItemId: item.id, 
              priority, 
              estimatedHours,
              designExists 
            });
          } catch (assignmentError) {
            apiLogger.warn('Failed to auto-assign designer', { 
              orderItemId: item.id, 
              error: assignmentError 
            });
            // Continue with other assignments even if one fails
          }
        });
        
        // Execute all assignments in parallel but don't wait for completion
        Promise.allSettled(assignmentPromises)
          .then(results => {
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;
            apiLogger.info('Designer auto-assignment completed', { 
              successful, 
              failed, 
              total: items.length 
            });
          })
          .catch(error => {
            apiLogger.warn('Designer auto-assignment batch failed', error);
          });
      }

      const completeOrder = {
        ...order,
        order_items: items,
      };

      // Log order creation to audit trail (non-blocking)
      logOrderCreated(order.id, orderData.customer_id, completeOrder)
        .catch(auditError => {
          apiLogger.warn('Failed to log order creation to audit trail', auditError);
        });

      apiLogger.info('Order created successfully', { orderId: order.id, orderNumber });
      
      // Return the complete order with items
      return completeOrder;
    }, orderData);
  },

  updateOrder: async (id: string, orderData: Partial<Order>): Promise<Order> => {
    const { data, error } = await supabaseHelpers.update(TABLES.ORDERS, id, orderData)
    if (error) throw new Error(error.message)
    return data
  },

  updateOrderStatus: async (id: string, status: string): Promise<Order> => {
    return withApiLogging('order.updateStatus', async () => {
      // Get the existing order for audit logging
      const { data: existingOrder, error: fetchError } = await supabase
        .from(TABLES.ORDERS)
        .select('*, customer:customers(*), order_items:order_items(*)')
        .eq('id', id)
        .single();
      
      if (fetchError) throw new Error(fetchError.message);
      
      const { data, error } = await businessHelpers.orders.updateStatus(id, status);
      if (error) throw new Error(error.message);
      
      // Log order update to audit trail
      try {
        await auditTrail.logOrderTransaction('updated', id, existingOrder.customer_id, data, existingOrder);
      } catch (auditError) {
        apiLogger.warn('Failed to log order status update to audit trail', auditError);
      }
      
      return data;
    }, { id, status });
  },

  deleteOrder: async (id: string): Promise<void> => {
    const { error } = await supabaseHelpers.softDelete(TABLES.ORDERS, id)
    if (error) throw new Error(error.message)
  },

  getOrdersInDateRange: async (startDate: string, endDate: string): Promise<Order[]> => {
    const { data, error } = await supabase
      .from(TABLES.ORDERS)
      .select(`
        *,
        customer:customers(*),
        order_items:order_items(*)
      `)
      .eq('is_deleted', false)
      .gte('order_date', startDate)
      .lte('order_date', endDate)
      .order('order_date', { ascending: false })
    
    if (error) throw new Error(error.message)
    return data || []
  },

  getCustomerOrders: async (customerId: string, startDate?: string, endDate?: string): Promise<Order[]> => {
    let query = supabase
      .from(TABLES.ORDERS)
      .select(`
        *,
        customer:customers(*),
        order_items:order_items(*)
      `)
      .eq('is_deleted', false)
      .eq('customer_id', customerId)
    
    if (startDate) query = query.gte('order_date', startDate)
    if (endDate) query = query.lte('order_date', endDate)
    
    query = query.order('order_date', { ascending: false })
    
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return data || []
  },

  getDesignStatusReport: async (): Promise<any[]> => {
    const { data, error } = await supabase
      .from(TABLES.ORDER_ITEMS)
      .select(`
        *,
        orders(
          order_number,
          customer:customers(name)
        )
      `)
      .eq('orders.is_deleted', false)
      .order('created_at', { ascending: false })
    
    if (error) throw new Error(error.message)
    return data || []
  },

  getProductionStatusReport: async (): Promise<any[]> => {
    const { data, error } = await supabase
      .from(TABLES.ORDER_ITEMS)
      .select(`
        *,
        orders(
          order_number,
          customer:customers(name)
        )
      `)
      .eq('orders.is_deleted', false)
      .order('created_at', { ascending: false })
    
    if (error) throw new Error(error.message)
    return data || []
  }
}

// Order Items API
export const orderItemApi = {
  updateProductionStatus: async (id: string, productionStatus: string): Promise<OrderItem> => {
    return withApiLogging('orderItem.updateProductionStatus', async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')
      
      // Get the existing order item for audit logging
      apiLogger.info('Fetching order item for audit logging', { orderItemId: id });
      
      const { data: existingItem, error: fetchError } = await supabase
        .from(TABLES.ORDER_ITEMS)
        .select(`
          *,
          order:orders(
            id,
            customer_id
          )
        `)
        .eq('id', id)
        .single();
      
      if (fetchError) {
        apiLogger.error('Failed to fetch order item', { 
          orderItemId: id, 
          error: fetchError,
          errorCode: fetchError.code,
          errorDetails: fetchError.details 
        });
        throw new Error(`Failed to fetch order item: ${fetchError.message} (Code: ${fetchError.code})`);
      }
      
      apiLogger.info('Order item fetched successfully', { 
        orderItemId: id, 
        hasOrder: !!existingItem.order,
        customerId: existingItem.order?.customer_id 
      });
      
      console.log('🏭 [PRODUCTION STATUS UPDATE] Starting:', { id, productionStatus });
      
      // Use safe update that works with existing schema
      const updateData: any = {};

      // Check if new columns exist, if not use fallback to customization_details
      try {
        updateData.production_status = productionStatus;
        const { data, error } = await supabaseHelpers.update(TABLES.ORDER_ITEMS, id, updateData);
        
        if (error) {
          // Fallback to customization_details if column doesn't exist
          console.log('📋 [FALLBACK] Using customization_details for production status');
          updateData.customization_details = `Production Stage: ${productionStatus.toUpperCase()}, Updated: ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;
          delete updateData.production_status;
          
          const fallbackResult = await supabaseHelpers.update(TABLES.ORDER_ITEMS, id, updateData);
          if (fallbackResult.error) throw new Error(fallbackResult.error.message);
          
          // Log production status change to audit trail (disabled until database migration is complete)
          try {
            console.log('🔍 [AUDIT] Skipping audit trail due to schema migration in progress');
            // await logProductionStageChange(
            //   id,
            //   existingItem.order.customer_id,
            //   { ...fallbackResult.data, production_status: productionStatus },
            //   existingItem
            // );
          } catch (auditError) {
            apiLogger.warn('Failed to log production status change to audit trail', auditError);
          }
          
          return fallbackResult.data;
        }
        
        // Log production status change to audit trail (disabled until database migration is complete)
        try {
          console.log('🔍 [AUDIT] Skipping audit trail due to schema migration in progress');
          // await logProductionStageChange(
          //   id,
          //   existingItem.order.customer_id,
          //   { ...data, production_status: productionStatus },
          //   existingItem
          // );
        } catch (auditError) {
          apiLogger.warn('Failed to log production status change to audit trail', auditError);
        }
        
        return data;
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Unknown error occurred');
      }
    }, { id, productionStatus });
  },

  // @deprecated - Use updateProductionStatus instead
  updateProductionStage: async (id: string, stage: string): Promise<OrderItem> => {
    return orderItemApi.updateProductionStatus(id, stage);
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
  },

  getProductionStockByStatus: async (params?: {
    designStatus?: string
    productionStatus?: string
    customerId?: string
    materialType?: string
  }): Promise<OrderItem[]> => {
    return withApiLogging('orderItem.getProductionStockByStatus', async () => {
      let query = supabase
        .from(TABLES.ORDER_ITEMS)
        .select(`
          *,
          order:orders(
            id,
            order_number,
            customer_id,
            order_date,
            status,
            customer:customers(name, phone, email)
          )
        `)
        .eq('orders.is_deleted', false)
        .order('created_at', { ascending: false })

      if (params?.customerId) {
        query = query.eq('orders.customer_id', params.customerId)
      }

      if (params?.materialType && params.materialType !== 'all') {
        query = query.eq('material_type', params.materialType)
      }

      const { data, error } = await query
      if (error) throw new Error(error.message)

      let filteredData = data || []

      // Filter by design and production status (works with both new columns and legacy parsing)
      if (params?.designStatus && params.designStatus !== 'all') {
        filteredData = filteredData.filter(item => {
          // Try new column first, fallback to parsing
          const designStatus = item.design_status || parseDesignStatusFromItem(item);
          return designStatus === params.designStatus;
        });
      }

      if (params?.productionStatus && params.productionStatus !== 'all') {
        filteredData = filteredData.filter(item => {
          // Try new column first, fallback to parsing
          const productionStatus = item.production_status || parseProductionStatusFromItem(item);
          return productionStatus === params.productionStatus;
        });
      }

      return filteredData
    }, params)
  },

  // @deprecated - Use getProductionStockByStatus instead
  getProductionStockByStage: async (params?: {
    stage?: string
    designReady?: boolean
    designReceived?: boolean
    customerId?: string
    materialType?: string
  }): Promise<OrderItem[]> => {
    // Map old parameters to new structure
    const newParams: any = {
      customerId: params?.customerId,
      materialType: params?.materialType
    };
    
    if (params?.designReady !== undefined || params?.designReceived !== undefined) {
      if (params.designReady) {
        newParams.designStatus = 'design_ready';
      } else if (params.designReceived) {
        newParams.designStatus = 'design_received_from_customer';
      } else {
        newParams.designStatus = 'pending_from_customer';
      }
    }
    
    if (params?.stage && params.stage !== 'all') {
      // Map old stage values to new production status
      if (params.stage === 'printing') newParams.productionStatus = 'printing';
      else if (params.stage === 'post_process') newParams.productionStatus = 'post_process';
      else newParams.productionStatus = 'pending';
    }
    
    return orderItemApi.getProductionStockByStatus(newParams);
  },

  getStageReadinessCombinations: async (): Promise<StageStockSummary[]> => {
    return withApiLogging('orderItem.getStageReadinessCombinations', async () => {
      const { data, error } = await supabase
        .from(TABLES.ORDER_ITEMS)
        .select(`
          *,
          order:orders(
            id,
            order_number,
            customer_id,
            order_date,
            customer:customers(name, phone)
          )
        `)
        .eq('orders.is_deleted', false)
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)

      const items = data || []
      
      // Use utility function to group items by stage and design status
      return groupItemsByStageAndDesignStatus(items)
    })
  },

  updateDesignStatus: async (id: string, designStatus: string, designData?: {
    design_file_url?: string;
    design_notes?: string;
    designs_provided_quantity?: number;
    designs_approved_quantity?: number;
  }): Promise<OrderItem> => {
    return withApiLogging('orderItem.updateDesignStatus', async () => {
      // Get the existing order item for audit logging (audit logging currently disabled)
      // const { data: existingItem, error: fetchError } = await supabase
      //   .from(TABLES.ORDER_ITEMS)
      //   .select(`
      //     *,
      //     order:orders(
      //       id,
      //       customer_id
      //     )
      //   `)
      //   .eq('id', id)
      //   .single();
      // 
      // if (fetchError) throw new Error(fetchError.message);
      
      console.log('👁️ [DESIGN STATUS UPDATE] Starting:', { id, designStatus, designData });
      
      // Use safe update that works with existing schema
      const updateData: any = {};

      // Check if new columns exist, if not use fallback to customization_details
      try {
        updateData.design_status = designStatus;
        if (designData?.design_file_url) updateData.design_file_url = designData.design_file_url;
        if (designData?.design_notes) updateData.design_notes = designData.design_notes;
        if (designData?.designs_provided_quantity !== undefined) updateData.designs_provided_quantity = designData.designs_provided_quantity;
        if (designData?.designs_approved_quantity !== undefined) updateData.designs_approved_quantity = designData.designs_approved_quantity;
        if (designData?.designs_provided_quantity !== undefined || designData?.designs_approved_quantity !== undefined) {
          updateData.design_last_updated = new Date().toISOString();
        }
        
        const { data, error } = await supabaseHelpers.update(TABLES.ORDER_ITEMS, id, updateData);
        
        if (error) {
          // Fallback to customization_details if column doesn't exist
          console.log('📋 [FALLBACK] Using customization_details for design status');
          const statusText = designStatus === 'design_ready' ? 'Ready: Yes' : 
                           designStatus === 'design_received_from_customer' ? 'Received' : 'Pending';
          updateData.customization_details = `Design Status: ${statusText}${designData?.design_notes ? ', Notes: ' + designData.design_notes : ''}`;
          delete updateData.design_status;
          if (designData?.design_file_url) updateData.design_file_url = designData.design_file_url;
          
          const fallbackResult = await supabaseHelpers.update(TABLES.ORDER_ITEMS, id, updateData);
          if (fallbackResult.error) throw new Error(fallbackResult.error.message);
          
          // Log design update to audit trail (disabled until database migration is complete)
          try {
            console.log('🔍 [AUDIT] Skipping audit trail due to schema migration in progress');
            // await auditTrail.logProductionTransaction(
            //   'design_updated',
            //   id,
            //   'customer_id',
            //   { ...fallbackResult.data, design_status: designStatus },
            //   {}
            // );
          } catch (auditError) {
            apiLogger.warn('Failed to log design update to audit trail', auditError);
          }
          
          return fallbackResult.data;
        }
        
        // Log design update to audit trail (disabled until database migration is complete)
        try {
          console.log('🔍 [AUDIT] Skipping audit trail due to schema migration in progress');
          // await auditTrail.logProductionTransaction(
          //   'design_updated',
          //   id,
          //   'customer_id',
          //   data,
          //   {}
          // );
        } catch (auditError) {
          apiLogger.warn('Failed to log design update to audit trail', auditError);
        }
        
        return data;
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Unknown error occurred');
      }
    }, { id, designStatus, designData })
  },

  // Keep the old function for backward compatibility
  updateDesignInfo: async (id: string, designData: any): Promise<OrderItem> => {
    return orderItemApi.updateDesignStatus(id, designData);
  }
}

// Customer Design Summary API - NEW FEATURE
export const customerDesignApi = {
  getCustomerDesignSummaries: async (customerId?: string): Promise<CustomerDesignSummary[]> => {
    return withApiLogging('customerDesign.getCustomerDesignSummaries', async () => {
      let query = supabase
        .from('customer_design_summary')
        .select(`
          *,
          customer:customers(id, name, phone, email)
        `)
        .order('last_updated', { ascending: false });

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      
      return data || [];
    }, { customerId });
  },

  updateCustomerDesignSummary: async (
    customerId: string, 
    materialType: string, 
    designData: {
      total_designs_provided?: number;
      total_designs_approved?: number;
      total_material_received?: number;
    }
  ): Promise<CustomerDesignSummary> => {
    return withApiLogging('customerDesign.updateCustomerDesignSummary', async () => {
      const updateData: any = {
        ...designData,
        last_updated: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('customer_design_summary')
        .upsert({
          customer_id: customerId,
          material_type: materialType,
          ...updateData
        })
        .select(`
          *,
          customer:customers(id, name, phone, email)
        `)
        .single();

      if (error) throw new Error(error.message);
      return data;
    }, { customerId, materialType, designData });
  },

  getDesignRequirementAnalytics: async (): Promise<{
    totalCustomers: number;
    totalOrderItems: number;
    totalMaterialStock: number;
    designCoverageForOrders: number;
    designCoverageForStock: number;
    customerBreakdown: CustomerDesignSummary[];
  }> => {
    return withApiLogging('customerDesign.getDesignRequirementAnalytics', async () => {
      // Get customer design summaries
      const summaries = await customerDesignApi.getCustomerDesignSummaries();
      
      // Get order items for detailed analysis
      const orderItems = await orderItemApi.getProductionStatus();
      
      const analytics = {
        totalCustomers: new Set(summaries.map(s => s.customer_id)).size,
        totalOrderItems: orderItems.length,
        totalMaterialStock: summaries.reduce((sum, s) => sum + s.total_material_received, 0),
        designCoverageForOrders: 0,
        designCoverageForStock: 0,
        customerBreakdown: summaries
      };

      // Calculate coverage percentages
      const totalOrderQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalDesignsApproved = orderItems.reduce((sum, item) => sum + (item.designs_approved_quantity || 0), 0);
      
      analytics.designCoverageForOrders = totalOrderQuantity > 0 ? 
        (totalDesignsApproved / totalOrderQuantity) * 100 : 0;
      
      analytics.designCoverageForStock = analytics.totalMaterialStock > 0 ? 
        (summaries.reduce((sum, s) => sum + s.total_designs_approved, 0) / analytics.totalMaterialStock) * 100 : 0;

      return analytics;
    });
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
        customer:customers(name)
      `)
      .order('received_date', { ascending: false })
    
    if (error) throw new Error(error.message)
    return data || []
  },

  createMaterialIn: async (materialData: Partial<MaterialIn>): Promise<MaterialIn> => {
    return withApiLogging('materialIn.createMaterialIn', async () => {
      const { data, error } = await supabaseHelpers.create(TABLES.MATERIAL_IN, materialData)
      if (error) throw new Error(error.message)
      
      // Update material stock after recording material receipt
      let stockAudit = null;
      if (materialData.customer_id && materialData.material_type && materialData.quantity) {
        // Get current stock for audit
        const { data: currentStock } = await supabase
          .from(TABLES.MATERIAL_STOCK)
          .select('current_stock')
          .eq('customer_id', materialData.customer_id)
          .eq('material_type', materialData.material_type)
          .single();
        
        const previousStock = currentStock?.current_stock || 0;
        
        await updateMaterialStockAfterReceiving(
          materialData.customer_id, 
          materialData.material_type, 
          materialData.quantity
        );
        
        stockAudit = {
          customer_id: materialData.customer_id,
          material_type: materialData.material_type,
          previous_stock: previousStock,
          quantity_change: materialData.quantity,
          new_stock: previousStock + materialData.quantity,
          reason: 'material_in' as const,
          reference_type: 'material_in',
          reference_id: data.id
        };
      }
      
      // Log material receipt to audit trail
      if (stockAudit) {
        try {
          await logMaterialReceived(
            stockAudit,
            `Material received: ${materialData.material_type} (Qty: ${materialData.quantity})`
          );
        } catch (auditError) {
          apiLogger.warn('Failed to log material receipt to audit trail', auditError);
        }
      }
      
      return data
    }, materialData);
  },

  updateMaterialIn: async (id: string, materialData: Partial<MaterialIn>): Promise<MaterialIn> => {
    return withApiLogging('materialIn.updateMaterialIn', async () => {
      // Get the original material record to calculate quantity difference
      const { data: originalData, error: fetchError } = await supabaseHelpers.getById(TABLES.MATERIAL_IN, id)
      if (fetchError) throw new Error(fetchError.message)
      
      const { data, error } = await supabaseHelpers.update(TABLES.MATERIAL_IN, id, materialData)
      if (error) throw new Error(error.message)
      
      // Update material stock if quantity was changed
      if (materialData.quantity && originalData && 'quantity' in originalData && 'customer_id' in originalData && 'material_type' in originalData) {
        const originalQuantity = originalData.quantity as number;
        if (originalQuantity !== materialData.quantity) {
          const quantityDifference = materialData.quantity - originalQuantity;
          if (quantityDifference !== 0) {
            await updateMaterialStockAfterReceiving(
              originalData.customer_id as string, 
              originalData.material_type as string, 
              quantityDifference
            );
          }
        }
      }
      
      return data
    }, { id, materialData });
  },

  deleteMaterialIn: async (id: string): Promise<void> => {
    return withApiLogging('materialIn.deleteMaterialIn', async () => {
      // Get the material record before deletion to adjust stock
      const { data: materialData, error: fetchError } = await supabaseHelpers.getById(TABLES.MATERIAL_IN, id)
      if (fetchError) throw new Error(fetchError.message)
      
      const { error } = await supabaseHelpers.delete(TABLES.MATERIAL_IN, id)
      if (error) throw new Error(error.message)
      
      // Remove the deleted quantity from material stock
      if (materialData && 'customer_id' in materialData && 'material_type' in materialData && 'quantity' in materialData) {
        await updateMaterialStockAfterReceiving(
          materialData.customer_id as string, 
          materialData.material_type as string, 
          -(materialData.quantity as number) // Negative to reduce stock
        );
      }
    }, { id });
  }
}

// Material Stock Management Functions
const updateMaterialStockAfterDelivery = async (customerId: string, deliveryItems: any[]) => {
  return withApiLogging('materialStock.updateAfterDelivery', async () => {
    // First, get the material types from order_items for each delivery item
    const materialSummary: { [key: string]: number } = {};
    
    for (const item of deliveryItems) {
      // Get material type from order_items table
      const { data: orderItem, error: orderItemError } = await supabase
        .from(TABLES.ORDER_ITEMS)
        .select('material_type')
        .eq('id', item.order_item_id)
        .single();
        
      if (orderItemError) {
        componentLogger.warn('Could not find order item for delivery', { order_item_id: item.order_item_id, error: orderItemError });
        continue; // Skip this item if we can't find the material type
      }
      
      const materialType = orderItem.material_type;
      const quantity = item.quantity_delivered || item.quantity;
      
      materialSummary[materialType] = (materialSummary[materialType] || 0) + quantity;
    }

    // Update material stock for each material type
    for (const [materialType, quantityDelivered] of Object.entries(materialSummary)) {
      // Get or create material stock record
      let { data: stockRecord, error: fetchError } = await supabase
        .from(TABLES.MATERIAL_STOCK)
        .select('*')
        .eq('customer_id', customerId)
        .eq('material_type', materialType)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
        if (fetchError.code === '42P01') {
          componentLogger.warn('Material stock table does not exist, skipping delivery stock update');
          continue;
        }
        throw new Error(`Failed to fetch material stock: ${fetchError.message}`);
      }

      if (!stockRecord) {
        // Create new stock record if none exists
        const { error: createError } = await supabase
          .from(TABLES.MATERIAL_STOCK)
          .insert({
            customer_id: customerId,
            material_type: materialType,
            total_received: 0,
            total_delivered: quantityDelivered,
            current_stock: -quantityDelivered, // Negative indicates over-delivery
            last_updated: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          if (createError.code === '42P01') {
            componentLogger.warn('Material stock table does not exist, skipping delivery stock creation');
            continue;
          }
          throw new Error(`Failed to create material stock record: ${createError.message}`);
        }
      } else {
        // Update existing stock record
        const newTotalDelivered = stockRecord.total_delivered + quantityDelivered;
        const newCurrentStock = stockRecord.total_received - newTotalDelivered;

        const { error: updateError } = await supabase
          .from(TABLES.MATERIAL_STOCK)
          .update({
            total_delivered: newTotalDelivered,
            current_stock: newCurrentStock,
            last_updated: new Date().toISOString()
          })
          .eq('id', stockRecord.id);

        if (updateError) {
          if (updateError.code === '42P01') {
            componentLogger.warn('Material stock table does not exist, skipping delivery stock update');
            continue;
          }
          throw new Error(`Failed to update material stock: ${updateError.message}`);
        }
      }
    }
  }, { customerId, deliveryItems });
};

const updateMaterialStockAfterReceiving = async (customerId: string, materialType: string, quantity: number) => {
  return withApiLogging('materialStock.updateAfterReceiving', async () => {
    // Get or create material stock record
    let { data: stockRecord, error: fetchError } = await supabase
      .from(TABLES.MATERIAL_STOCK)
      .select('*')
      .eq('customer_id', customerId)
      .eq('material_type', materialType)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // If table doesn't exist, log warning and skip stock update
      if (fetchError.code === '42P01') {
        componentLogger.warn('Material stock table does not exist, skipping stock update');
        return;
      }
      throw new Error(`Failed to fetch material stock: ${fetchError.message}`);
    }

    if (!stockRecord) {
      // Create new stock record
      const { error: createError } = await supabase
        .from(TABLES.MATERIAL_STOCK)
        .insert({
          customer_id: customerId,
          material_type: materialType,
          total_received: quantity,
          total_delivered: 0,
          current_stock: quantity,
          last_updated: new Date().toISOString()
        });

      if (createError) {
        if (createError.code === '42P01') {
          componentLogger.warn('Material stock table does not exist, skipping stock creation');
          return;
        }
        throw new Error(`Failed to create material stock record: ${createError.message}`);
      }
    } else {
      // Update existing stock record
      const newTotalReceived = stockRecord.total_received + quantity;
      const newCurrentStock = newTotalReceived - stockRecord.total_delivered;

      const { error: updateError } = await supabase
        .from(TABLES.MATERIAL_STOCK)
        .update({
          total_received: newTotalReceived,
          current_stock: newCurrentStock,
          last_updated: new Date().toISOString()
        })
        .eq('id', stockRecord.id);

      if (updateError) {
        if (updateError.code === '42P01') {
          componentLogger.warn('Material stock table does not exist, skipping stock update');
          return;
        }
        throw new Error(`Failed to update material stock: ${updateError.message}`);
      }
    }
  }, { customerId, materialType, quantity });
};

// Material Stock API
export const materialStockApi = {
  getCustomerStock: async (customerId?: string): Promise<any[]> => {
    return withApiLogging('materialStock.getCustomerStock', async () => {
      // Try to get from material_stock table first
      try {
        let query = supabase
          .from(TABLES.MATERIAL_STOCK)
          .select(`
            *,
            customer:customers(name, phone, email)
          `)
          .order('last_updated', { ascending: false });

        if (customerId) {
          query = query.eq('customer_id', customerId);
        }

        const { data, error } = await query;
        
        if (error) {
          // If material_stock table doesn't exist, calculate dynamically
          componentLogger.warn('Material stock table not found, calculating dynamically', error);
          return await materialStockApi.getCustomerStockDynamic(customerId);
        }
        
        return data || [];
      } catch (error: any) {
        // Fallback to dynamic calculation
        componentLogger.warn('Material stock table error, falling back to dynamic calculation', error);
        return await materialStockApi.getCustomerStockDynamic(customerId);
      }
    }, { customerId });
  },

  getCustomerStockDynamic: async (customerId?: string): Promise<any[]> => {
    return withApiLogging('materialStock.getCustomerStockDynamic', async () => {
      // Calculate stock dynamically from material_in and delivery data
      
      // Get all material_in records
      let materialInQuery = supabase
        .from(TABLES.MATERIAL_IN)
        .select(`
          customer_id,
          material_type,
          quantity,
          customer:customers(name, phone, email)
        `);

      if (customerId) {
        materialInQuery = materialInQuery.eq('customer_id', customerId);
      }

      const { data: materialInData, error: materialInError } = await materialInQuery;
      if (materialInError) throw new Error(materialInError.message);

      // Get all delivery challan items with material types
      let deliveryQuery = supabase
        .from(TABLES.DELIVERY_CHALLAN_ITEMS)
        .select(`
          quantity,
          challan:delivery_challans!inner(customer_id),
          order_item:order_items(material_type)
        `);

      const { data: deliveryData, error: deliveryError } = await deliveryQuery;
      if (deliveryError) {
        componentLogger.warn('Could not fetch delivery data for dynamic calculation', deliveryError);
      }

      // Calculate stock per customer and material type
      const stockMap: { [key: string]: any } = {};

      // Add received materials
      (materialInData || []).forEach(record => {
        const key = `${record.customer_id}-${record.material_type}`;
        if (!stockMap[key]) {
          stockMap[key] = {
            id: key,
            customer_id: record.customer_id,
            material_type: record.material_type,
            total_received: 0,
            total_delivered: 0,
            current_stock: 0,
            last_updated: new Date().toISOString(),
            customer: record.customer
          };
        }
        stockMap[key].total_received += record.quantity || 0;
      });

      // Subtract delivered materials
      if (deliveryData) {
        deliveryData.forEach((record: any) => {
          if (record.challan?.customer_id && record.order_item?.material_type) {
            const key = `${record.challan.customer_id}-${record.order_item.material_type}`;
            if (stockMap[key]) {
              stockMap[key].total_delivered += record.quantity || 0;
            }
          }
        });
      }

      // Calculate current stock
      Object.values(stockMap).forEach((stock: any) => {
        stock.current_stock = stock.total_received - stock.total_delivered;
      });

      // Filter by customer if specified
      let result = Object.values(stockMap);
      if (customerId) {
        result = result.filter((stock: any) => stock.customer_id === customerId);
      }

      return result;
    }, { customerId });
  },

  getMaterialStockSummary: async (): Promise<any[]> => {
    return withApiLogging('materialStock.getSummary', async () => {
      const { data, error } = await supabase
        .from(TABLES.MATERIAL_STOCK)
        .select(`
          material_type,
          customer:customers(name),
          total_received,
          total_delivered,
          current_stock,
          last_updated
        `)
        .order('material_type');
      
      if (error) throw new Error(error.message);
      return data || [];
    });
  },

  getStockByMaterial: async (materialType: string): Promise<any[]> => {
    return withApiLogging('materialStock.getByMaterial', async () => {
      const { data, error } = await supabase
        .from(TABLES.MATERIAL_STOCK)
        .select(`
          *,
          customer:customers(name, phone, email)
        `)
        .eq('material_type', materialType)
        .order('current_stock', { ascending: false });
      
      if (error) throw new Error(error.message);
      return data || [];
    }, { materialType });
  },

  getAllStock: async (): Promise<any[]> => {
    return withApiLogging('materialStock.getAllStock', async () => {
      const { data, error } = await supabase
        .from(TABLES.MATERIAL_STOCK)
        .select(`
          *,
          customer:customers(*)
        `)
        .order('last_updated', { ascending: false })
      
      if (error) throw new Error(error.message)
      return data || []
    })
  }
};

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
    return withApiLogging('payment.createPayment', async () => {
      // Get invoice details for audit logging
      let invoice = null;
      let previousBalance = 0;
      if (paymentData.invoice_id) {
        const { data: invoiceData } = await supabase
          .from(TABLES.GST_INVOICES)
          .select('total_amount')
          .eq('id', paymentData.invoice_id)
          .single();
        
        invoice = invoiceData;
        
        // Get existing payments for this invoice to calculate previous balance
        const { data: existingPayments } = await supabase
          .from(TABLES.PAYMENTS)
          .select('payment_amount')
          .eq('invoice_id', paymentData.invoice_id);
        
        const totalPaid = existingPayments?.reduce((sum, p) => sum + p.payment_amount, 0) || 0;
        previousBalance = (invoice?.total_amount || 0) - totalPaid;
      }
      
      const { data, error } = await supabaseHelpers.create(TABLES.PAYMENTS, paymentData);
      if (error) throw new Error(error.message);
      
      // Log payment to audit trail
      if (paymentData.customer_id && paymentData.payment_amount) {
        const newBalance = previousBalance - paymentData.payment_amount;
        try {
          await logPaymentReceived(
            data.id,
            paymentData.customer_id,
            data,
            { previous: previousBalance, new: newBalance }
          );
        } catch (auditError) {
          apiLogger.warn('Failed to log payment to audit trail', auditError);
        }
      }
      
      return data;
    }, paymentData);
  },

  getCustomerPayments: async (customerId: string, startDate?: string, endDate?: string): Promise<any[]> => {
    return withApiLogging('payment.getCustomerPayments', async () => {
      let query = supabase
        .from(TABLES.PAYMENTS)
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('customer_id', customerId)
        .eq('is_deleted', false)
      
      if (startDate) query = query.gte('payment_date', startDate)
      if (endDate) query = query.lte('payment_date', endDate)
      
      query = query.order('payment_date', { ascending: false })
      
      const { data, error } = await query
      if (error) throw new Error(error.message)
      return data || []
    }, { customerId, startDate, endDate })
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
        *
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
          customer:customers(*)
        `)
        .order('created_at', { ascending: false })
      
      if (params?.customer_id) {
        query = query.eq('customer_id', params.customer_id)
      }
      
      if (params?.status) {
        query = query.eq('delivery_status', params.status)
      }
      
      if (params?.limit) {
        query = query.limit(params.limit)
      }
      
      const { data, error } = await query
      
      if (error) throw new Error(error.message)
      
      // Map database fields to frontend expected fields
      const mappedData = (data || []).map((challan: any) => ({
        ...challan,
        delivery_date: challan.challan_date,
        status: challan.delivery_status,
        order_id: challan.order_id || null // May not exist in current schema
      }))
      
      return mappedData
    }, params)
  },

  getDeliveryChallan: async (id: string): Promise<DeliveryChallan> => {
    return withApiLogging('deliveryChallan.getDeliveryChallan', async () => {
      const { data, error } = await supabase
        .from(TABLES.DELIVERY_CHALLANS)
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('id', id)
        .single()
      
      if (error) throw new Error(error.message)
      
      // Map database fields to frontend expected fields
      const mappedData = {
        ...data,
        delivery_date: data.challan_date || data.delivery_date,
        status: data.delivery_status || data.status,
        order_id: data.order_id || null
      }
      
      return mappedData
    }, { id })
  },

  getDeliveryChallanItems: async (challanId: string): Promise<any[]> => {
    return withApiLogging('deliveryChallan.getDeliveryChallanItems', async () => {
      const { data, error } = await supabase
        .from(TABLES.DELIVERY_CHALLAN_ITEMS)
        .select(`
          *,
          order_item:order_items(
            id,
            material_type,
            quantity,
            unit_price,
            design_url,
            design_notes,
            design_status,
            design_file_url,
            production_status,
            qc_pass_status,
            quality_checked_by,
            quality_check_date,
            total_delivered,
            remaining_quantity
          )
        `)
        .eq('challan_id', challanId)
      
      if (error) throw new Error(error.message)
      return data || []
    }, { challanId })
  },

  // New method: Get available items for delivery (for challan creation)
  getAvailableDeliveryItems: async (customerId: string): Promise<any[]> => {
    return withApiLogging('deliveryChallan.getAvailableDeliveryItems', async () => {
      const { data, error } = await supabase
        .rpc('get_available_delivery_items', { p_customer_id: customerId })

      if (error) throw new Error(error.message)
      return data || []
    }, { customerId })
  },

  // New method: Get order delivery status
  getOrderDeliveryStatus: async (orderId?: string, customerId?: string): Promise<any[]> => {
    return withApiLogging('deliveryChallan.getOrderDeliveryStatus', async () => {
      let query = supabase
        .from('order_delivery_status')
        .select('*')
        .order('order_date', { ascending: false })

      if (orderId) {
        query = query.eq('order_id', orderId)
      } else if (customerId) {
        query = query.eq('customer_id', customerId)
      }

      const { data, error } = await query

      if (error) throw new Error(error.message)
      return data || []
    }, { orderId, customerId })
  },

  // New method: Get order item delivery details
  getOrderItemDeliveryDetails: async (orderItemIds?: string[]): Promise<any[]> => {
    return withApiLogging('deliveryChallan.getOrderItemDeliveryDetails', async () => {
      let query = supabase
        .from('order_item_delivery_details')
        .select('*')

      if (orderItemIds && orderItemIds.length > 0) {
        query = query.in('order_item_id', orderItemIds)
      }

      const { data, error } = await query

      if (error) throw new Error(error.message)
      return data || []
    }, { orderItemIds })
  },

  // New method: Get pending deliveries
  getPendingDeliveries: async (customerId?: string): Promise<any[]> => {
    return withApiLogging('deliveryChallan.getPendingDeliveries', async () => {
      let query = supabase
        .from('pending_deliveries_summary')
        .select('*')
        .order('urgency_level', { ascending: true })
        .order('days_until_due', { ascending: true })

      if (customerId) {
        query = query.eq('customer_id', customerId)
      }

      const { data, error } = await query

      if (error) throw new Error(error.message)
      return data || []
    }, { customerId })
  },

  // New method: Get customer delivery summary
  getCustomerDeliverySummary: async (customerId?: string): Promise<any[]> => {
    return withApiLogging('deliveryChallan.getCustomerDeliverySummary', async () => {
      let query = supabase
        .from('customer_delivery_summary')
        .select('*')
        .order('total_order_value', { ascending: false })

      if (customerId) {
        query = query.eq('customer_id', customerId)
      }

      const { data, error } = await query

      if (error) throw new Error(error.message)
      return data || []
    }, { customerId })
  },

  generateInvoiceFromChallan: async (challanId: string, gstRate: number): Promise<GST_Invoice> => {
    return withApiLogging('deliveryChallan.generateInvoiceFromChallan', async () => {
      // Get the delivery challan with items
      const challan = await deliveryChallanApi.getDeliveryChallan(challanId);
      const challanItems = await deliveryChallanApi.getDeliveryChallanItems(challanId);
      
      if (!challan) {
        throw new Error('Delivery challan not found');
      }
      
      if (challan.status !== 'delivered') {
        throw new Error('Can only generate invoices for delivered challans');
      }
      
      // Calculate invoice amounts
      const subtotal = challanItems.reduce((sum, item) => sum + item.subtotal, 0);
      const taxRate = gstRate / 100; // Convert percentage to decimal
      const taxAmount = subtotal * taxRate;
      const totalAmount = subtotal + taxAmount;
      
      // Generate invoice number
      const invoiceNumber = `INV-DC-${challan.challan_number}-${Date.now()}`;
      
      // Create invoice data
      const invoiceData = {
        invoice_number: invoiceNumber,
        customer_id: challan.customer_id,
        order_id: challan.order_id,
        invoice_date: new Date().toISOString().split('T')[0],
        subtotal: subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        status: 'sent' as const,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        notes: `Generated from Delivery Challan: ${challan.challan_number}. Items delivered on ${new Date(challan.delivery_date).toLocaleDateString()}.`
      };
      
      // Create the invoice
      const invoice = await gstInvoiceApi.createGSTInvoice(invoiceData);
      
      return invoice;
    }, { challanId })
  },

  // Generate consolidated invoice from multiple delivery challans
  generateConsolidatedInvoice: async (challanIds: string[], gstRate: number): Promise<GST_Invoice> => {
    return withApiLogging('deliveryChallan.generateConsolidatedInvoice', async () => {
      if (challanIds.length === 0) {
        throw new Error('At least one delivery challan must be selected');
      }

      // Get all challans
      const challans = await Promise.all(
        challanIds.map(id => deliveryChallanApi.getDeliveryChallan(id))
      );

      // Validate all challans belong to the same customer
      const customerId = challans[0].customer_id;
      if (!challans.every(challan => challan.customer_id === customerId)) {
        throw new Error('All delivery challans must belong to the same customer');
      }

      // Validate all challans are delivered
      const undeliveredChallans = challans.filter(challan => challan.status !== 'delivered');
      if (undeliveredChallans.length > 0) {
        throw new Error('All delivery challans must be in delivered status');
      }

      // Calculate consolidated totals
      let totalSubtotal = 0;
      const allItems: any[] = [];
      const challanNumbers: string[] = [];

      for (const challan of challans) {
        challanNumbers.push(challan.challan_number);

        // Get items for this challan
        const items = await deliveryChallanApi.getDeliveryChallanItems(challan.id);

        for (const item of items) {
          const itemSubtotal = item.quantity_delivered * item.unit_price;
          totalSubtotal += itemSubtotal;
          allItems.push({
            ...item,
            challan_number: challan.challan_number,
            delivery_date: challan.delivery_date
          });
        }
      }

      // Calculate tax using provided GST rate
      const taxRate = gstRate / 100; // Convert percentage to decimal
      const taxAmount = totalSubtotal * taxRate;
      const totalAmount = totalSubtotal + taxAmount;

      // Generate consolidated invoice number
      const invoiceNumber = `INV-CONSOLIDATED-${Date.now()}`;

      // Create consolidated invoice data
      const invoiceData = {
        invoice_number: invoiceNumber,
        customer_id: customerId,
        order_id: challans[0].order_id, // Use first challan's order_id or make it nullable
        invoice_date: new Date().toISOString().split('T')[0],
        subtotal: totalSubtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        status: 'sent' as const,
        notes: `Consolidated invoice for Delivery Challans: ${challanNumbers.join(', ')}. Total ${challans.length} deliveries processed.`
      };

      // Create the consolidated invoice
      const invoice = await gstInvoiceApi.createGSTInvoice(invoiceData);

      return invoice;
    }, { challanIds });
  },

  createDeliveryChallan: async (challanData: any): Promise<DeliveryChallan> => {
    return withApiLogging('deliveryChallan.createDeliveryChallan', async () => {
      // Generate challan number if not provided
      const challanNumber = challanData.challan_number || `DC-${Date.now()}`
      
      // Note: order_id not used in current schema
      
      // Prepare the main challan data (match database schema)
      const insertData = {
        challan_number: challanNumber,
        customer_id: challanData.customer_id,
        challan_date: new Date(challanData.delivery_date).toISOString(),
        delivery_status: challanData.status,
        notes: challanData.notes || null,
        created_at: new Date().toISOString()
      }
      
      // Create the delivery challan
      const { data: challan, error: challanError } = await supabase
        .from(TABLES.DELIVERY_CHALLANS)
        .insert(insertData)
        .select(`
          *,
          customer:customers(*)
        `)
        .single()
      
      if (challanError) {
        console.error('Delivery challan creation error:', challanError)
        throw new Error(challanError.message)
      }
      
      // Prepare material stock audit data
      let materialImpact = [];
      
      // Create delivery challan items if provided (match database schema)
      if (challanData.items && challanData.items.length > 0) {
        const challanItems = challanData.items.map((item: any) => ({
          challan_id: challan.id,
          order_item_id: item.order_item_id,
          quantity: item.quantity_delivered,
          created_at: new Date().toISOString()
        }))
        
        const { error: itemsError } = await supabase
          .from(TABLES.DELIVERY_CHALLAN_ITEMS)
          .insert(challanItems)
        
        if (itemsError) {
          // Rollback: delete the challan if items creation fails
          await supabase.from(TABLES.DELIVERY_CHALLANS).delete().eq('id', challan.id)
          console.error('Delivery challan items creation error:', itemsError)
          throw new Error(`Failed to create delivery items: ${itemsError.message}`)
        }
        
        // Collect material impact for audit logging
        for (const item of challanData.items) {
          // Get material type from order_items
          const { data: orderItem } = await supabase
            .from(TABLES.ORDER_ITEMS)
            .select('material_type')
            .eq('id', item.order_item_id)
            .single();
            
          if (!orderItem) continue;
          
          const materialType = orderItem.material_type;
          const quantity = item.quantity_delivered || item.quantity;
          
          // Get current stock for audit
          const { data: currentStock } = await supabase
            .from(TABLES.MATERIAL_STOCK)
            .select('current_stock')
            .eq('customer_id', challanData.customer_id)
            .eq('material_type', materialType)
            .single();
          
          const previousStock = currentStock?.current_stock || 0;
          materialImpact.push({
            customer_id: challanData.customer_id,
            material_type: materialType,
            previous_stock: previousStock,
            quantity_change: -quantity, // Negative for delivery
            new_stock: previousStock - quantity,
            reason: 'delivery_out' as const,
            reference_type: 'delivery_challan',
            reference_id: challan.id
          });
        }
        
        // Update material stock after successful delivery challan creation
        await updateMaterialStockAfterDelivery(challanData.customer_id, challanData.items);
      }
      
      // Log delivery challan creation to audit trail
      try {
        await auditTrail.logDeliveryTransaction(
          'challan_created',
          challan.id,
          challanData.customer_id,
          challan,
          materialImpact
        );
      } catch (auditError) {
        apiLogger.warn('Failed to log delivery challan to audit trail', auditError);
      }
      
      return challan
    }, challanData)
  },

  updateDeliveryChallan: async (id: string, updateData: Partial<DeliveryChallanCreate>): Promise<DeliveryChallan> => {
    return withApiLogging('deliveryChallan.updateDeliveryChallan', async () => {
      // Map frontend fields to database fields
      const mappedUpdateData: any = { ...updateData }
      if (updateData.delivery_date) {
        mappedUpdateData.challan_date = new Date(updateData.delivery_date).toISOString()
        delete mappedUpdateData.delivery_date
      }
      if (updateData.status) {
        mappedUpdateData.delivery_status = updateData.status
        delete mappedUpdateData.status
      }
      
      const { data, error } = await supabaseHelpers.update(TABLES.DELIVERY_CHALLANS, id, {
        ...mappedUpdateData,
        updated_at: new Date().toISOString()
      })
      
      if (error) throw new Error(error.message)
      
      // Map database fields back to frontend expected fields
      const mappedData = {
        ...data,
        delivery_date: data.challan_date,
        status: data.delivery_status,
        order_id: data.order_id || null
      }
      
      return mappedData
    }, { id, updateData })
  },

  deleteDeliveryChallan: async (id: string): Promise<void> => {
    return withApiLogging('deliveryChallan.deleteDeliveryChallan', async () => {
      const { error } = await supabaseHelpers.delete(TABLES.DELIVERY_CHALLANS, id)
      if (error) throw new Error(error.message)
    }, { id })
  },

  getDeliveriesInDateRange: async (startDate: string, endDate: string): Promise<any[]> => {
    return withApiLogging('deliveryChallan.getDeliveriesInDateRange', async () => {
      const { data, error } = await supabase
        .from(TABLES.DELIVERY_CHALLANS)
        .select(`
          *,
          customer:customers(*),
          items:challan_items(
            *,
            order_items(*)
          )
        `)
        .eq('is_deleted', false)
        .gte('challan_date', startDate)
        .lte('challan_date', endDate)
        .order('challan_date', { ascending: false })
      
      if (error) throw new Error(error.message)
      return data || []
    }, { startDate, endDate })
  },

  // Get available challans for invoice generation
  getAvailableChallansForInvoice: async (customerId?: string): Promise<any[]> => {
    return withApiLogging('deliveryChallan.getAvailableChallansForInvoice', async () => {
      // Try using the database function first
      try {
        const { data, error } = await supabase.rpc('get_available_challans_for_invoice', {
          p_customer_id: customerId || null
        });
        
        if (error) throw error;
        return data || [];
      } catch (rpcError) {
        // Fallback to manual query if RPC function doesn't exist
        console.warn('RPC function not available, using fallback query:', rpcError);
        
        let query = supabase
          .from(TABLES.DELIVERY_CHALLANS)
          .select(`
            id,
            challan_number,
            customer_id,
            challan_date,
            delivery_status,
            is_invoiced,
            customer:customers(name, phone, email)
          `)
          .eq('delivery_status', 'delivered')
          .eq('is_invoiced', false)
          .eq('is_deleted', false)
          .order('challan_date', { ascending: false });

        if (customerId) {
          query = query.eq('customer_id', customerId);
        }

        const { data, error } = await query;
        
        if (error) throw new Error(error.message);
        
        // Calculate totals for each challan
        const challansWithTotals = await Promise.all((data || []).map(async (challan: any) => {
          const { data: items, error: itemsError } = await supabase
            .from(TABLES.DELIVERY_CHALLAN_ITEMS)
            .select(`
              quantity,
              order_item:order_items(unit_price)
            `)
            .eq('challan_id', challan.id);
          
          if (itemsError) {
            console.error('Error fetching challan items:', itemsError);
            return { ...challan, total_value: 0, total_items: 0 };
          }
          
          const totalValue = (items || []).reduce((sum: number, item: any) => {
            return sum + (item.quantity * (item.order_item?.unit_price || 0));
          }, 0);
          
          return {
            ...challan,
            total_value: totalValue,
            total_items: items?.length || 0
          };
        }));
        
        return challansWithTotals;
      }
    }, { customerId })
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
      try {
        let query = supabase
          .from(TABLES.GST_INVOICES)
          .select(`
            *,
            customer:customers(*)
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
        
        if (error) {
          // If table doesn't exist, return empty array
          if (error.code === '42P01' || error.message.includes('does not exist')) {
            console.warn('GST Invoices table does not exist yet. Returning empty array.');
            return [];
          }
          throw new Error(error.message)
        }
        return data || []
      } catch (err: any) {
        // Handle table not existing gracefully
        console.warn('GST Invoices not available:', err.message);
        return [];
      }
    }, params)
  },

  getGSTInvoice: async (id: string): Promise<GST_Invoice> => {
    return withApiLogging('gstInvoice.getGSTInvoice', async () => {
      const { data, error } = await supabase
        .from(TABLES.GST_INVOICES)
        .select(`
          *,
          customer:customers(*)
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
      
      // Remove fields that don't exist in database schema
      const cleanedData = { ...invoiceData };
      delete cleanedData.due_date; // due_date column doesn't exist in gst_invoices table
      
      const { data, error } = await supabaseHelpers.create(TABLES.GST_INVOICES, {
        ...cleanedData,
        invoice_number: invoiceNumber,
        created_at: new Date().toISOString()
      })
      
      if (error) throw new Error(error.message)
      
      // Log invoice generation to audit trail
      try {
        await logInvoiceGenerated(
          data.id,
          invoiceData.customer_id,
          data,
          invoiceData.notes?.includes('Delivery Challan:') ? 
            [invoiceData.notes.match(/DC-\d+/)?.[0] || ''] : undefined
        );
      } catch (auditError) {
        apiLogger.warn('Failed to log invoice generation to audit trail', auditError);
      }
      
      return data
    }, invoiceData)
  },

  // Generate invoice from delivery challans
  generateInvoiceFromChallans: async (challanIds: string[], notes?: string): Promise<GST_Invoice> => {
    return withApiLogging('gstInvoice.generateInvoiceFromChallans', async () => {
      // Get current user (you may need to adapt this based on your auth system)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      try {
        // Try using the database function first
        const { data, error } = await supabase.rpc('generate_invoice_from_challans', {
          p_challan_ids: challanIds,
          p_created_by: user.id,
          p_invoice_notes: notes || 'Generated from delivery challans'
        });
        
        if (error) throw error;
        return data;
      } catch (rpcError) {
        console.warn('RPC function not available, using fallback:', rpcError);
        
        // Fallback implementation
        // First get challan details to calculate totals
        const { data: challans, error: challansError } = await supabase
          .from(TABLES.DELIVERY_CHALLANS)
          .select(`
            id,
            customer_id,
            challan_number,
            customer:customers(*)
          `)
          .in('id', challanIds)
          .eq('is_invoiced', false);
        
        if (challansError) throw new Error(challansError.message);
        if (!challans || challans.length === 0) throw new Error('No valid challans found');
        
        // Check all challans are for same customer
        const customerId = challans[0].customer_id;
        if (!challans.every(c => c.customer_id === customerId)) {
          throw new Error('Cannot create invoice for challans from different customers');
        }
        
        // Calculate invoice totals and get order_id from challan items
        const { data: items, error: itemsError } = await supabase
          .from(TABLES.DELIVERY_CHALLAN_ITEMS)
          .select(`
            quantity,
            order_item:order_items(unit_price, order_id)
          `)
          .in('challan_id', challanIds);
        
        if (itemsError) throw new Error(itemsError.message);
        
        const subtotal = (items || []).reduce((sum, item) => {
          const orderItem = Array.isArray(item.order_item) ? item.order_item[0] : item.order_item;
          return sum + (item.quantity * (orderItem?.unit_price || 0));
        }, 0);
        
        const taxAmount = subtotal * 0.18; // 18% GST
        const totalAmount = subtotal + taxAmount;
        
        // Get order_id from the first item (all items should be from same order typically)
        const firstOrderItem = Array.isArray(items?.[0]?.order_item) ? items[0].order_item[0] : items?.[0]?.order_item;
        const orderId = firstOrderItem?.order_id || '';

        // Generate invoice
        const invoiceData = {
          invoice_number: `INV-${Date.now()}`, // Generate unique invoice number
          customer_id: customerId,
          order_id: orderId,
          invoice_date: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
          subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          status: 'draft' as const,
          notes: notes || `Generated from delivery challans: ${challans.map(c => c.challan_number).join(', ')}`
        };
        
        const invoice = await gstInvoiceApi.createGSTInvoice(invoiceData);
        
        // Link challans to invoice
        if (challans.length > 0) {
          const { error: linkError } = await supabase
            .from(TABLES.INVOICE_CHALLANS)
            .insert(challanIds.map(challanId => ({
              invoice_id: invoice.id,
              challan_id: challanId
            })));
          
          if (linkError) {
            console.error('Failed to link challans to invoice:', linkError);
          }
        }
        
        // Mark challans as invoiced
        const { error: updateError } = await supabase
          .from(TABLES.DELIVERY_CHALLANS)
          .update({ 
            is_invoiced: true, 
            invoiced_date: new Date().toISOString(),
            invoice_id: invoice.id
          })
          .in('id', challanIds);
        
        if (updateError) {
          console.error('Failed to mark challans as invoiced:', updateError);
        }
        
        return invoice;
      }
    }, { challanIds, notes })
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
  },

  getInvoicesInDateRange: async (startDate: string, endDate: string): Promise<any[]> => {
    return withApiLogging('gstInvoice.getInvoicesInDateRange', async () => {
      const { data, error } = await supabase
        .from(TABLES.GST_INVOICES)
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('is_deleted', false)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false })
      
      if (error) throw new Error(error.message)
      return data || []
    }, { startDate, endDate })
  }
}

// Export designer API for use in components
export { designerApi }