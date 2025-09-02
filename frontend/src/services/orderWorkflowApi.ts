// Order Workflow API - Advanced Order Management Operations
// Integrates with order management business logic SQLs

import { supabase } from '../lib/supabase';
import { withApiLogging } from './supabaseApi';

export interface OrderItemInput {
  material_type: string;
  quantity: number;
  unit_price: number;
  customization_details?: string;
  design_file_url?: string;
  special_instructions?: string;
}

export interface CreateOrderData {
  customer_id: string;
  order_number?: string;
  order_date?: string;
  expected_delivery_date?: string;
  priority_level?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  special_instructions?: string;
  items: OrderItemInput[];
}

export const orderWorkflowApi = {
  // Create order with items using business logic
  createOrderWithItems: async (orderData: CreateOrderData) => {
    return withApiLogging('orderWorkflow.createOrderWithItems', async () => {
      const { data, error } = await supabase
        .rpc('create_order_with_items', {
          p_customer_id: orderData.customer_id,
          p_order_number: orderData.order_number,
          p_order_date: orderData.order_date || new Date().toISOString().split('T')[0],
          p_expected_delivery_date: orderData.expected_delivery_date,
          p_priority_level: orderData.priority_level || 'MEDIUM',
          p_special_instructions: orderData.special_instructions,
          p_items: JSON.stringify(orderData.items)
        });

      if (error) throw new Error(error.message);
      return data;
    }, orderData);
  },

  // Update order status with workflow validation
  updateOrderStatus: async (orderId: string, status: string, notes?: string) => {
    return withApiLogging('orderWorkflow.updateOrderStatus', async () => {
      const { data, error } = await supabase
        .rpc('update_order_status', {
          p_order_id: orderId,
          p_status: status,
          p_notes: notes
        });

      if (error) throw new Error(error.message);
      return data;
    }, { orderId, status, notes });
  },

  // Update design status for order item
  updateDesignStatus: async (
    orderItemId: string, 
    designStatus: 'pending_from_customer' | 'design_received_from_customer' | 'design_ready',
    designData?: {
      design_file_url?: string;
      design_notes?: string;
      design_approved_by?: string;
    }
  ) => {
    return withApiLogging('orderWorkflow.updateDesignStatus', async () => {
      const { data, error } = await supabase
        .rpc('update_design_status', {
          p_order_item_id: orderItemId,
          p_design_status: designStatus,
          p_design_file_url: designData?.design_file_url,
          p_design_notes: designData?.design_notes,
          p_design_approved_by: designData?.design_approved_by
        });

      if (error) throw new Error(error.message);
      return data;
    }, { orderItemId, designStatus, designData });
  },

  // Update production status for order item
  updateProductionStatus: async (
    orderItemId: string, 
    productionStatus: 'pending' | 'printing' | 'post_process',
    productionData?: {
      production_notes?: string;
      quality_check_passed?: boolean;
      completed_by?: string;
    }
  ) => {
    return withApiLogging('orderWorkflow.updateProductionStatus', async () => {
      const { data, error } = await supabase
        .rpc('update_production_status', {
          p_order_item_id: orderItemId,
          p_production_status: productionStatus,
          p_production_notes: productionData?.production_notes,
          p_quality_check_passed: productionData?.quality_check_passed,
          p_completed_by: productionData?.completed_by
        });

      if (error) throw new Error(error.message);
      return data;
    }, { orderItemId, productionStatus, productionData });
  },

  // Get production queue with priorities
  getProductionQueue: async (filterBy?: {
    material_type?: string;
    priority_level?: string;
    design_status?: string;
    production_status?: string;
  }) => {
    return withApiLogging('orderWorkflow.getProductionQueue', async () => {
      const { data, error } = await supabase
        .rpc('get_production_queue', {
          p_material_type: filterBy?.material_type,
          p_priority_level: filterBy?.priority_level,
          p_design_status: filterBy?.design_status,
          p_production_status: filterBy?.production_status
        });

      if (error) throw new Error(error.message);
      return data;
    }, filterBy);
  },

  // Get order with complete details
  getOrderDetails: async (orderId: string) => {
    return withApiLogging('orderWorkflow.getOrderDetails', async () => {
      const { data, error } = await supabase
        .rpc('get_order_details', {
          p_order_id: orderId
        });

      if (error) throw new Error(error.message);
      return data && data.length > 0 ? data[0] : null;
    }, { orderId });
  },

  // Get orders by status with workflow context
  getOrdersByStatus: async (
    status?: string, 
    customerId?: string,
    fromDate?: string, 
    toDate?: string
  ) => {
    return withApiLogging('orderWorkflow.getOrdersByStatus', async () => {
      const { data, error } = await supabase
        .rpc('get_orders_by_status', {
          p_status: status,
          p_customer_id: customerId,
          p_from_date: fromDate,
          p_to_date: toDate
        });

      if (error) throw new Error(error.message);
      return data;
    }, { status, customerId, fromDate, toDate });
  },

  // Cancel order with workflow validation
  cancelOrder: async (orderId: string, cancellationReason: string) => {
    return withApiLogging('orderWorkflow.cancelOrder', async () => {
      const { data, error } = await supabase
        .rpc('cancel_order', {
          p_order_id: orderId,
          p_cancellation_reason: cancellationReason
        });

      if (error) throw new Error(error.message);
      return data;
    }, { orderId, cancellationReason });
  },

  // Rush order (high priority processing)
  rushOrder: async (orderId: string, rushReason: string, additionalCharge?: number) => {
    return withApiLogging('orderWorkflow.rushOrder', async () => {
      const { data, error } = await supabase
        .rpc('rush_order', {
          p_order_id: orderId,
          p_rush_reason: rushReason,
          p_additional_charge: additionalCharge || 0
        });

      if (error) throw new Error(error.message);
      return data;
    }, { orderId, rushReason, additionalCharge });
  },

  // Get order progress tracking
  getOrderProgress: async (orderId: string) => {
    return withApiLogging('orderWorkflow.getOrderProgress', async () => {
      const { data, error } = await supabase
        .rpc('get_order_progress', {
          p_order_id: orderId
        });

      if (error) throw new Error(error.message);
      return data;
    }, { orderId });
  },

  // Batch update order items
  batchUpdateOrderItems: async (updates: Array<{
    order_item_id: string;
    design_status?: string;
    production_status?: string;
    notes?: string;
  }>) => {
    return withApiLogging('orderWorkflow.batchUpdateOrderItems', async () => {
      const { data, error } = await supabase
        .rpc('batch_update_order_items', {
          p_updates: JSON.stringify(updates)
        });

      if (error) throw new Error(error.message);
      return data;
    }, { updates });
  },

  // Get orders requiring attention
  getOrdersRequiringAttention: async () => {
    return withApiLogging('orderWorkflow.getOrdersRequiringAttention', async () => {
      const { data, error } = await supabase.rpc('get_orders_requiring_attention');

      if (error) throw new Error(error.message);
      return data;
    });
  },

  // Assign order to production team
  assignOrderToProduction: async (orderItemId: string, assignedTo: string, priority?: number) => {
    return withApiLogging('orderWorkflow.assignOrderToProduction', async () => {
      const { data, error } = await supabase
        .rpc('assign_order_to_production', {
          p_order_item_id: orderItemId,
          p_assigned_to: assignedTo,
          p_priority: priority || 1
        });

      if (error) throw new Error(error.message);
      return data;
    }, { orderItemId, assignedTo, priority });
  },

  // Get production workload
  getProductionWorkload: async (teamMember?: string) => {
    return withApiLogging('orderWorkflow.getProductionWorkload', async () => {
      const { data, error } = await supabase
        .rpc('get_production_workload', {
          p_team_member: teamMember
        });

      if (error) throw new Error(error.message);
      return data;
    }, { teamMember });
  },

  // Schedule production slot
  scheduleProductionSlot: async (scheduleData: {
    order_item_id: string;
    scheduled_start: string;
    estimated_duration_hours: number;
    machine_id?: string;
    operator_id?: string;
  }) => {
    return withApiLogging('orderWorkflow.scheduleProductionSlot', async () => {
      const { data, error } = await supabase
        .rpc('schedule_production_slot', {
          p_order_item_id: scheduleData.order_item_id,
          p_scheduled_start: scheduleData.scheduled_start,
          p_estimated_duration_hours: scheduleData.estimated_duration_hours,
          p_machine_id: scheduleData.machine_id,
          p_operator_id: scheduleData.operator_id
        });

      if (error) throw new Error(error.message);
      return data;
    }, scheduleData);
  },

  // Record production activity
  recordProductionActivity: async (activityData: {
    order_item_id: string;
    activity_type: 'START' | 'PAUSE' | 'RESUME' | 'COMPLETE' | 'QUALITY_CHECK';
    notes?: string;
    recorded_by?: string;
    quality_rating?: number;
  }) => {
    return withApiLogging('orderWorkflow.recordProductionActivity', async () => {
      const { data, error } = await supabase
        .from('production_activities')
        .insert({
          order_item_id: activityData.order_item_id,
          activity_type: activityData.activity_type,
          activity_timestamp: new Date().toISOString(),
          notes: activityData.notes,
          recorded_by: activityData.recorded_by,
          quality_rating: activityData.quality_rating
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }, activityData);
  },

  // Get production timeline
  getProductionTimeline: async (orderItemId: string) => {
    return withApiLogging('orderWorkflow.getProductionTimeline', async () => {
      const { data, error } = await supabase
        .from('production_activities')
        .select(`
          *,
          order_items(
            material_type,
            quantity,
            orders(order_number, customers(name))
          )
        `)
        .eq('order_item_id', orderItemId)
        .order('activity_timestamp', { ascending: true });

      if (error) throw new Error(error.message);
      return data;
    }, { orderItemId });
  }
};

export default orderWorkflowApi;