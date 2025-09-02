// Delivery Workflow API - Advanced Delivery Operations
// Integrates with delivery management business logic SQLs

import { supabase } from '../lib/supabase';
import { withApiLogging } from './supabaseApi';

export interface DeliveryItemInput {
  order_item_id: string;
  quantity_delivered: number;
}

export interface CreateDeliveryChallanData {
  customer_id: string;
  order_id?: string;
  challan_number?: string;
  challan_date?: string;
  delivery_date?: string;
  transport_mode?: string;
  vehicle_number?: string;
  driver_name?: string;
  driver_phone?: string;
  delivery_address?: string;
  special_instructions?: string;
  items: DeliveryItemInput[];
}

export const deliveryWorkflowApi = {
  // Create delivery challan with full workflow integration
  createDeliveryChallan: async (challanData: CreateDeliveryChallanData) => {
    return withApiLogging('deliveryWorkflow.createDeliveryChallan', async () => {
      const { data, error } = await supabase
        .rpc('create_delivery_challan', {
          p_customer_id: challanData.customer_id,
          p_order_id: challanData.order_id,
          p_challan_number: challanData.challan_number || `DC-${Date.now()}`,
          p_challan_date: challanData.challan_date || new Date().toISOString().split('T')[0],
          p_delivery_date: challanData.delivery_date,
          p_transport_mode: challanData.transport_mode,
          p_vehicle_number: challanData.vehicle_number,
          p_driver_name: challanData.driver_name,
          p_driver_phone: challanData.driver_phone,
          p_delivery_address: challanData.delivery_address,
          p_special_instructions: challanData.special_instructions,
          p_items: JSON.stringify(challanData.items)
        });

      if (error) throw new Error(error.message);
      return data;
    }, challanData);
  },

  // Update delivery status
  updateDeliveryStatus: async (
    challanId: string, 
    deliveryStatus: 'prepared' | 'in_transit' | 'delivered' | 'cancelled',
    actualDeliveryDate?: string,
    notes?: string
  ) => {
    return withApiLogging('deliveryWorkflow.updateDeliveryStatus', async () => {
      const { data, error } = await supabase
        .rpc('update_delivery_status', {
          p_challan_id: challanId,
          p_delivery_status: deliveryStatus,
          p_actual_delivery_date: actualDeliveryDate,
          p_notes: notes
        });

      if (error) throw new Error(error.message);
      return data;
    }, { challanId, deliveryStatus, actualDeliveryDate, notes });
  },

  // Get delivery challan with full details
  getDeliveryChallanDetails: async (challanId: string) => {
    return withApiLogging('deliveryWorkflow.getDeliveryChallanDetails', async () => {
      const { data, error } = await supabase
        .rpc('get_delivery_challan_details', {
          p_challan_id: challanId
        });

      if (error) throw new Error(error.message);
      return data && data.length > 0 ? data[0] : null;
    }, { challanId });
  },

  // Get pending deliveries with priority
  getPendingDeliveries: async () => {
    return withApiLogging('deliveryWorkflow.getPendingDeliveries', async () => {
      const { data, error } = await supabase.rpc('get_pending_deliveries');

      if (error) throw new Error(error.message);
      return data;
    });
  },

  // Get items ready for delivery
  getItemsReadyForDelivery: async (customerId?: string) => {
    return withApiLogging('deliveryWorkflow.getItemsReadyForDelivery', async () => {
      const { data, error } = await supabase
        .rpc('get_items_ready_for_delivery', {
          p_customer_id: customerId
        });

      if (error) throw new Error(error.message);
      return data;
    }, { customerId });
  },

  // Get delivery performance report
  getDeliveryPerformanceReport: async (fromDate?: string, toDate?: string) => {
    return withApiLogging('deliveryWorkflow.getDeliveryPerformanceReport', async () => {
      const { data, error } = await supabase
        .rpc('get_delivery_performance_report', {
          p_from_date: fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          p_to_date: toDate || new Date().toISOString().split('T')[0]
        });

      if (error) throw new Error(error.message);
      return data && data.length > 0 ? data[0] : null;
    }, { fromDate, toDate });
  },

  // Schedule delivery
  scheduleDelivery: async (schedulingData: {
    challan_id: string;
    scheduled_date: string;
    scheduled_time?: string;
    driver_id?: string;
    vehicle_id?: string;
    priority_level?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    delivery_instructions?: string;
  }) => {
    return withApiLogging('deliveryWorkflow.scheduleDelivery', async () => {
      const { data, error } = await supabase
        .rpc('schedule_delivery', {
          p_challan_id: schedulingData.challan_id,
          p_scheduled_date: schedulingData.scheduled_date,
          p_scheduled_time: schedulingData.scheduled_time,
          p_driver_id: schedulingData.driver_id,
          p_vehicle_id: schedulingData.vehicle_id,
          p_priority_level: schedulingData.priority_level || 'MEDIUM',
          p_delivery_instructions: schedulingData.delivery_instructions
        });

      if (error) throw new Error(error.message);
      return data;
    }, schedulingData);
  },

  // Track delivery
  trackDelivery: async (challanId: string) => {
    return withApiLogging('deliveryWorkflow.trackDelivery', async () => {
      const { data, error } = await supabase
        .from('delivery_tracking')
        .select(`
          *,
          delivery_challans(
            challan_number,
            customer:customers(name, phone),
            delivery_status
          )
        `)
        .eq('challan_id', challanId)
        .order('updated_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data;
    }, { challanId });
  },

  // Update delivery tracking
  updateDeliveryTracking: async (trackingData: {
    challan_id: string;
    current_location?: string;
    status_update: string;
    estimated_delivery_time?: string;
    delivery_notes?: string;
  }) => {
    return withApiLogging('deliveryWorkflow.updateDeliveryTracking', async () => {
      const { data, error } = await supabase
        .from('delivery_tracking')
        .insert({
          challan_id: trackingData.challan_id,
          current_location: trackingData.current_location,
          status_update: trackingData.status_update,
          estimated_delivery_time: trackingData.estimated_delivery_time,
          delivery_notes: trackingData.delivery_notes,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }, trackingData);
  },

  // Get delivery route optimization
  getDeliveryRouteOptimization: async (driverId?: string, deliveryDate?: string) => {
    return withApiLogging('deliveryWorkflow.getDeliveryRouteOptimization', async () => {
      const { data, error } = await supabase
        .rpc('get_delivery_route_optimization', {
          p_driver_id: driverId,
          p_delivery_date: deliveryDate || new Date().toISOString().split('T')[0]
        });

      if (error) throw new Error(error.message);
      return data;
    }, { driverId, deliveryDate });
  },

  // Confirm delivery receipt
  confirmDeliveryReceipt: async (receiptData: {
    challan_id: string;
    received_by: string;
    received_at: string;
    condition_notes?: string;
    customer_signature?: string;
    photo_evidence?: string[];
  }) => {
    return withApiLogging('deliveryWorkflow.confirmDeliveryReceipt', async () => {
      const { data, error } = await supabase
        .rpc('confirm_delivery_receipt', {
          p_challan_id: receiptData.challan_id,
          p_received_by: receiptData.received_by,
          p_received_at: receiptData.received_at,
          p_condition_notes: receiptData.condition_notes,
          p_customer_signature: receiptData.customer_signature,
          p_photo_evidence: receiptData.photo_evidence ? JSON.stringify(receiptData.photo_evidence) : null
        });

      if (error) throw new Error(error.message);
      return data;
    }, receiptData);
  },

  // Get delivery analytics
  getDeliveryAnalytics: async (fromDate?: string, toDate?: string) => {
    return withApiLogging('deliveryWorkflow.getDeliveryAnalytics', async () => {
      const { data, error } = await supabase
        .rpc('get_delivery_analytics', {
          p_from_date: fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          p_to_date: toDate || new Date().toISOString().split('T')[0]
        });

      if (error) throw new Error(error.message);
      return data;
    }, { fromDate, toDate });
  },

  // Handle delivery exceptions
  handleDeliveryException: async (exceptionData: {
    challan_id: string;
    exception_type: 'DAMAGE' | 'LOST' | 'REFUSED' | 'ADDRESS_ISSUE' | 'OTHER';
    description: string;
    resolution_action?: string;
    reported_by?: string;
  }) => {
    return withApiLogging('deliveryWorkflow.handleDeliveryException', async () => {
      const { data, error } = await supabase
        .from('delivery_exceptions')
        .insert({
          challan_id: exceptionData.challan_id,
          exception_type: exceptionData.exception_type,
          description: exceptionData.description,
          resolution_action: exceptionData.resolution_action,
          reported_by: exceptionData.reported_by,
          reported_at: new Date().toISOString(),
          status: 'OPEN'
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }, exceptionData);
  }
};

export default deliveryWorkflowApi;