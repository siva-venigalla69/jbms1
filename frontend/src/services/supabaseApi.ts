// Supabase API Service - Digital Textile Printing System
// Replaces the FastAPI backend with Supabase client calls

import { supabase, supabaseHelpers, businessHelpers, TABLES, ENUMS } from '../lib/supabase'
import type { Customer, Order, OrderItem, User, MaterialIn, DeliveryChallan, DeliveryChallanCreate, GST_Invoice, GST_InvoiceCreate, Payment, ReturnItem, InventoryItem, Expense } from '../types'
import { apiLogger, logNetworkRequest, performance } from '../utils/debug'
import { auditTrail, logOrderCreated, logMaterialReceived, logPaymentReceived, logDeliveryCompleted, logInvoiceGenerated, logProductionStageChange } from './auditTrailService'

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

      const completeOrder = {
        ...order,
        order_items: items,
      };

      // Log order creation to audit trail
      try {
        await logOrderCreated(order.id, orderData.customer_id, completeOrder);
      } catch (auditError) {
        apiLogger.warn('Failed to log order creation to audit trail', auditError);
      }

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
  }
}

// Order Items API
export const orderItemApi = {
  updateProductionStage: async (id: string, stage: string): Promise<OrderItem> => {
    return withApiLogging('orderItem.updateProductionStage', async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')
      
      // Get the existing order item for audit logging
      const { data: existingItem, error: fetchError } = await supabase
        .from(TABLES.ORDER_ITEMS)
        .select('*, order:orders(customer_id)')
        .eq('id', id)
        .single();
      
      if (fetchError) throw new Error(fetchError.message);
      
      const { data, error } = await businessHelpers.production.updateStage(id, stage, user.id)
      if (error) throw new Error(error.message)
      
      // Log production stage change to audit trail
      try {
        await logProductionStageChange(
          id,
          existingItem.order.customer_id,
          { ...data, current_stage: stage },
          existingItem
        );
      } catch (auditError) {
        apiLogger.warn('Failed to log production stage change to audit trail', auditError);
      }
      
      return data;
    }, { id, stage });
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

  updateDesignInfo: async (id: string, designData: any): Promise<OrderItem> => {
    return withApiLogging('orderItem.updateDesignInfo', async () => {
      // Get the existing order item for audit logging
      const { data: existingItem, error: fetchError } = await supabase
        .from(TABLES.ORDER_ITEMS)
        .select('*, order:orders(customer_id)')
        .eq('id', id)
        .single();
      
      if (fetchError) throw new Error(fetchError.message);
      
      // Only update basic fields that exist in the current schema
      const updateData = {
        customization_details: `Design Status: ${designData.design_received ? 'Received' : 'Pending'}, Ready: ${designData.design_ready ? 'Yes' : 'No'}${designData.design_notes ? ', Notes: ' + designData.design_notes : ''}`,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabaseHelpers.update(TABLES.ORDER_ITEMS, id, updateData)
      if (error) throw new Error(error.message)
      
      const updatedItem = {
        ...data,
        design_received: designData.design_received,
        design_ready: designData.design_ready,
        design_file_url: designData.design_file_url,
        design_notes: designData.design_notes
      };
      
      // Log design update to audit trail
      try {
        await auditTrail.logProductionTransaction(
          'design_updated',
          id,
          existingItem.order.customer_id,
          updatedItem,
          existingItem
        );
      } catch (auditError) {
        apiLogger.warn('Failed to log design update to audit trail', auditError);
      }
      
      // Return the updated item with design info for consistency
      return updatedItem;
    }, { id, designData })
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
    // Group delivery items by material type
    const materialSummary: { [key: string]: number } = {};
    
    deliveryItems.forEach(item => {
      const key = `${item.material_type}`;
      materialSummary[key] = (materialSummary[key] || 0) + item.quantity_delivered;
    });

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
        throw new Error(`Failed to fetch material stock: ${fetchError.message}`);
      }

      if (!stockRecord) {
        // Create new stock record if none exists
        const { data: newStock, error: createError } = await supabase
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
        throw new Error(`Failed to update material stock: ${updateError.message}`);
      }
    }
  }, { customerId, materialType, quantity });
};

// Material Stock API
export const materialStockApi = {
  getCustomerStock: async (customerId?: string): Promise<any[]> => {
    return withApiLogging('materialStock.getCustomerStock', async () => {
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
      
      if (error) throw new Error(error.message);
      return data || [];
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

  getDeliveryChallanItems: async (challanId: string): Promise<any[]> => {
    return withApiLogging('deliveryChallan.getDeliveryChallanItems', async () => {
      const { data, error } = await supabase
        .from(TABLES.DELIVERY_CHALLAN_ITEMS)
        .select(`
          *,
          order:orders(order_number),
          order_item:order_items(material_type, customization_details)
        `)
        .eq('delivery_challan_id', challanId)
      
      if (error) throw new Error(error.message)
      return data || []
    }, { challanId })
  },

  generateInvoiceFromChallan: async (challanId: string): Promise<GST_Invoice> => {
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
      const taxRate = 0.18; // 18% GST
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

  createDeliveryChallan: async (challanData: any): Promise<DeliveryChallan> => {
    return withApiLogging('deliveryChallan.createDeliveryChallan', async () => {
      // Generate challan number if not provided
      const challanNumber = challanData.challan_number || `DC-${Date.now()}`
      
      // Use the first order ID from items for backward compatibility
      const primaryOrderId = challanData.items?.[0]?.order_id
      
      // Prepare the main challan data
      const insertData = {
        challan_number: challanNumber,
        customer_id: challanData.customer_id,
        order_id: primaryOrderId, // For backward compatibility
        delivery_date: challanData.delivery_date,
        status: challanData.status,
        total_amount: challanData.total_amount || 0,
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
      
      // Create delivery challan items if provided
      if (challanData.items && challanData.items.length > 0) {
        const challanItems = challanData.items.map((item: any) => ({
          delivery_challan_id: challan.id,
          order_id: item.order_id,
          order_item_id: item.order_item_id,
          material_type: item.material_type,
          quantity_delivered: item.quantity_delivered,
          unit_price: item.unit_price,
          subtotal: item.quantity_delivered * item.unit_price,
          notes: item.notes || null,
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
          // Get current stock for audit
          const { data: currentStock } = await supabase
            .from(TABLES.MATERIAL_STOCK)
            .select('current_stock')
            .eq('customer_id', challanData.customer_id)
            .eq('material_type', item.material_type)
            .single();
          
          const previousStock = currentStock?.current_stock || 0;
          materialImpact.push({
            customer_id: challanData.customer_id,
            material_type: item.material_type,
            previous_stock: previousStock,
            quantity_change: -item.quantity_delivered, // Negative for delivery
            new_stock: previousStock - item.quantity_delivered,
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
      try {
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