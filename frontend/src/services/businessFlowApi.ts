// Business Flow API - Direct implementation of business_flow_queries.sql
// Provides APIs for all 8 sections of business workflow queries

import { supabase } from '../lib/supabase';
import { withApiLogging } from './supabaseApi';
import { apiLogger } from '../utils/debug';

export const businessFlowApi = {
  // =====================================================
  // 1. MATERIAL RECEIVED FROM CUSTOMER
  // =====================================================
  
  getMaterialReceipts: async (fromDate?: string, toDate?: string, customerId?: string) => {
    return withApiLogging('businessFlow.getMaterialReceipts', async () => {
      let query = supabase
        .from('material_in')
        .select(`
          id,
          received_date,
          material_type,
          quantity,
          supplier_name,
          notes,
          created_at,
          customer:customers(name, phone)
        `)
        .order('received_date', { ascending: false });

      if (fromDate && toDate) {
        query = query.gte('received_date', fromDate).lte('received_date', toDate);
      }
      
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      
      return data?.map((item: any) => ({
        receipt_id: item.id,
        received_date: item.received_date,
        customer_name: item.customer.name,
        customer_phone: item.customer.phone,
        material_type: item.material_type,
        quantity_received: item.quantity,
        supplier_name: item.supplier_name,
        notes: item.notes,
        created_at: item.created_at
      })) || [];
    });
  },

  getMaterialReceiptSummary: async (fromDate?: string, toDate?: string) => {
    return withApiLogging('businessFlow.getMaterialReceiptSummary', async () => {
      let query = supabase
        .from('material_in')
        .select(`
          customer_id,
          material_type,
          quantity,
          received_date,
          customer:customers(name)
        `);

      if (fromDate && toDate) {
        query = query.gte('received_date', fromDate).lte('received_date', toDate);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      // Group and aggregate data
      const summary = data?.reduce((acc: any, item: any) => {
        const key = `${item.customer_id}-${item.material_type}`;
        if (!acc[key]) {
          acc[key] = {
            customer_name: item.customer.name,
            material_type: item.material_type,
            total_received: 0,
            number_of_receipts: 0,
            first_receipt: item.received_date,
            last_receipt: item.received_date
          };
        }
        
        acc[key].total_received += item.quantity;
        acc[key].number_of_receipts += 1;
        if (item.received_date < acc[key].first_receipt) {
          acc[key].first_receipt = item.received_date;
        }
        if (item.received_date > acc[key].last_receipt) {
          acc[key].last_receipt = item.received_date;
        }
        
        return acc;
      }, {}) || {};

      return Object.values(summary);
    });
  },

  // =====================================================
  // 2. DESIGN RECEIVED FROM CUSTOMER
  // =====================================================

  getOrdersWithDesignReceived: async () => {
    return withApiLogging('businessFlow.getOrdersWithDesignReceived', async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          order_date,
          design_status,
          production_status,
          customer:customers(name, phone),
          order_items(id, quantity)
        `)
        .eq('design_status', 'design_received_from_customer')
        .order('order_date', { ascending: false });

      if (error) throw new Error(error.message);

      return data?.map((order: any) => ({
        order_id: order.id,
        order_number: order.order_number,
        order_date: order.order_date,
        customer_name: order.customer.name,
        customer_phone: order.customer.phone,
        design_status: order.design_status,
        production_status: order.production_status,
        total_items: order.order_items.length,
        total_quantity: order.order_items.reduce((sum: number, item: any) => sum + item.quantity, 0)
      })) || [];
    });
  },

  getOrderItemsWithDesignDetails: async () => {
    return withApiLogging('businessFlow.getOrderItemsWithDesignDetails', async () => {
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          id,
          material_type,
          quantity,
          design_status,
          production_status,
          order:orders(order_number, customer:customers(name))
        `)
        .eq('design_status', 'design_received_from_customer');

      if (error) throw new Error(error.message);

      return data?.map((item: any) => ({
        order_number: item.order.order_number,
        customer_name: item.order.customer.name,
        order_item_id: item.id,
        material_type: item.material_type,
        quantity: item.quantity,
        design_status: item.design_status,
        production_status: item.production_status
      })) || [];
    });
  },

  // =====================================================
  // 3. DESIGNS READIED
  // =====================================================

  getOrdersWithDesignReady: async () => {
    return withApiLogging('businessFlow.getOrdersWithDesignReady', async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          order_date,
          design_status,
          production_status,
          customer:customers(name),
          order_items(id, quantity)
        `)
        .eq('design_status', 'design_ready')
        .order('order_date');

      if (error) throw new Error(error.message);

      return data?.map((order: any) => ({
        order_id: order.id,
        order_number: order.order_number,
        order_date: order.order_date,
        customer_name: order.customer.name,
        design_status: order.design_status,
        production_status: order.production_status,
        items_ready: order.order_items.length,
        total_quantity: order.order_items.reduce((sum: number, item: any) => sum + item.quantity, 0)
      })) || [];
    });
  },

  // =====================================================
  // 4. PRINTING COMPLETED
  // =====================================================

  getCompletedPrintingJobs: async (fromDate?: string, toDate?: string) => {
    return withApiLogging('businessFlow.getCompletedPrintingJobs', async () => {
      let query = supabase
        .from('order_items')
        .select(`
          id,
          material_type,
          quantity,
          production_status,
          updated_at,
          order:orders(order_number, customer:customers(name))
        `)
        .in('production_status', ['completed', 'post_process']);

      if (fromDate && toDate) {
        query = query.gte('updated_at', fromDate).lte('updated_at', toDate);
      }

      const { data, error } = await query.order('updated_at', { ascending: false });
      if (error) throw new Error(error.message);

      return data?.map((item: any) => ({
        order_number: item.order.order_number,
        customer_name: item.order.customer.name,
        material_type: item.material_type,
        quantity: item.quantity,
        production_status: item.production_status,
        completion_date: item.updated_at
      })) || [];
    });
  },

  getItemsReadyForDelivery: async (customerId?: string) => {
    return withApiLogging('businessFlow.getItemsReadyForDelivery', async () => {
      let query = supabase
        .from('order_items')
        .select(`
          id,
          material_type,
          quantity,
          design_status,
          production_status,
          order:orders(id, order_number, customer_id, customer:customers(name, phone))
        `)
        .in('production_status', ['completed', 'post_process'])
        .neq('delivery_status', 'delivered');

      if (customerId) {
        query = query.eq('orders.customer_id', customerId);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      return data?.map((item: any) => ({
        order_id: item.order.id,
        order_number: item.order.order_number,
        customer_name: item.order.customer.name,
        customer_phone: item.order.customer.phone,
        order_item_id: item.id,
        material_type: item.material_type,
        quantity: item.quantity,
        production_status: item.production_status
      })) || [];
    });
  },

  // =====================================================
  // 5. ITEMS DELIVERED TO CUSTOMER
  // =====================================================

  getDeliveryChallansWithItems: async (fromDate?: string, toDate?: string, customerId?: string) => {
    return withApiLogging('businessFlow.getDeliveryChallansWithItems', async () => {
      let query = supabase
        .from('delivery_challans')
        .select(`
          id,
          challan_number,
          challan_date,
          total_amount,
          status,
          customer:customers(name, phone),
          challan_items(
            quantity,
            order_items(material_type, orders(order_number))
          )
        `);

      if (fromDate && toDate) {
        query = query.gte('challan_date', fromDate).lte('challan_date', toDate);
      }
      
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query.order('challan_date', { ascending: false });
      if (error) throw new Error(error.message);

      // Flatten the data structure
      const deliveries: any[] = [];
      data?.forEach((challan: any) => {
        challan.challan_items.forEach((item: any) => {
          deliveries.push({
            challan_id: challan.id,
            challan_number: challan.challan_number,
            challan_date: challan.challan_date,
            customer_name: challan.customer.name,
            customer_phone: challan.customer.phone,
            material_type: item.order_item.material_type,
            quantity_delivered: item.quantity,
            order_number: item.order_item.order.order_number,
            total_amount: challan.total_amount,
            challan_status: challan.status
          });
        });
      });

      return deliveries;
    });
  },

  // =====================================================
  // 6. COMPREHENSIVE STOCK TRACKING
  // =====================================================

  getCurrentStockSnapshot: async (customerId?: string) => {
    return withApiLogging('businessFlow.getCurrentStockSnapshot', async () => {
      let query = supabase
        .from('material_stock')
        .select(`
          material_type,
          total_received,
          total_delivered,
          current_stock,
          last_updated,
          customer:customers(name, phone)
        `);

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query
        .neq('current_stock', 0)
        .order('customer:customers(name)');

      if (error) throw new Error(error.message);

      return data?.map((stock: any) => ({
        customer_name: stock.customer.name,
        customer_phone: stock.customer.phone,
        material_type: stock.material_type,
        total_received: stock.total_received,
        total_delivered: stock.total_delivered,
        current_stock: stock.current_stock,
        stock_status: stock.current_stock < 0 ? 'OVER-DELIVERED' :
                     stock.current_stock === 0 ? 'EMPTY' :
                     stock.current_stock < 10 ? 'LOW STOCK' :
                     stock.current_stock < 50 ? 'MEDIUM STOCK' : 'GOOD STOCK',
        last_updated: stock.last_updated,
        remaining_percentage: stock.total_received > 0 ? 
          Math.round((stock.current_stock * 100) / stock.total_received) : 0
      })) || [];
    });
  },

  // =====================================================
  // 7. BUSINESS INTELLIGENCE
  // =====================================================

  getTopCustomersByVolume: async () => {
    return withApiLogging('businessFlow.getTopCustomersByVolume', async () => {
      const { data, error } = await supabase
        .from('material_stock')
        .select(`
          customer_id,
          material_type,
          total_received,
          total_delivered,
          current_stock,
          customer:customers(name)
        `)
        .gt('total_received', 0);

      if (error) throw new Error(error.message);

      // Group by customer and aggregate
      const customerStats = data?.reduce((acc: any, item: any) => {
        if (!acc[item.customer_id]) {
          acc[item.customer_id] = {
            customer_name: item.customer.name,
            total_materials_received: 0,
            total_materials_delivered: 0,
            current_stock_holding: 0,
            material_types_count: new Set()
          };
        }
        
        acc[item.customer_id].total_materials_received += item.total_received;
        acc[item.customer_id].total_materials_delivered += item.total_delivered;
        acc[item.customer_id].current_stock_holding += item.current_stock;
        acc[item.customer_id].material_types_count.add(item.material_type);
        
        return acc;
      }, {}) || {};

      return Object.values(customerStats).map((customer: any) => ({
        ...customer,
        material_types_count: customer.material_types_count.size
      })).sort((a: any, b: any) => b.total_materials_received - a.total_materials_received);
    });
  },

  // =====================================================
  // 8. TROUBLESHOOTING
  // =====================================================

  detectStockDiscrepancies: async () => {
    return withApiLogging('businessFlow.detectStockDiscrepancies', async () => {
      apiLogger.info('Detecting stock discrepancies by comparing calculated vs stored values');
      
      // This would require complex joins and calculations
      // For now, return basic stock validation
      const { data, error } = await supabase
        .from('material_stock')
        .select(`
          id,
          customer_id,
          material_type,
          total_received,
          total_delivered,
          current_stock,
          customer:customers(name)
        `);

      if (error) throw new Error(error.message);

      return data?.filter((stock: any) => {
        const calculated_stock = stock.total_received - stock.total_delivered;
        const discrepancy = Math.abs(stock.current_stock - calculated_stock);
        return discrepancy > 0.01; // Any discrepancy
      }).map((stock: any) => ({
        customer_name: stock.customer.name,
        material_type: stock.material_type,
        stored_current_stock: stock.current_stock,
        calculated_current_stock: stock.total_received - stock.total_delivered,
        discrepancy: Math.abs(stock.current_stock - (stock.total_received - stock.total_delivered))
      })) || [];
    });
  }
};

export default businessFlowApi;