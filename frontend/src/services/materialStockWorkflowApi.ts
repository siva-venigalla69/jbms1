// Material Stock Workflow API - Advanced Stock Operations
// Integrates with material stock management business logic SQLs

import { supabase } from '../lib/supabase';
import { withApiLogging } from './supabaseApi';

export const materialStockWorkflowApi = {
  // Receive material with full workflow integration
  receiveMaterial: async (materialData: {
    customer_id: string;
    material_type: string;
    quantity: number;
    unit_cost?: number;
    supplier_name?: string;
    supplier_invoice?: string;
    received_date?: string;
    quality_notes?: string;
    received_by?: string;
  }) => {
    return withApiLogging('materialStockWorkflow.receiveMaterial', async () => {
      const { data, error } = await supabase
        .rpc('receive_material', {
          p_customer_id: materialData.customer_id,
          p_material_type: materialData.material_type,
          p_quantity: materialData.quantity,
          p_unit_cost: materialData.unit_cost,
          p_supplier_name: materialData.supplier_name,
          p_supplier_invoice: materialData.supplier_invoice,
          p_received_date: materialData.received_date || new Date().toISOString().split('T')[0],
          p_quality_notes: materialData.quality_notes,
          p_received_by: materialData.received_by
        });

      if (error) throw new Error(error.message);
      return data;
    }, materialData);
  },

  // Deliver material (for production use)
  deliverMaterial: async (deliveryData: {
    challan_id: string;
    customer_id: string;
    material_type: string;
    quantity: number;
  }) => {
    return withApiLogging('materialStockWorkflow.deliverMaterial', async () => {
      const { data, error } = await supabase
        .rpc('deliver_material', {
          p_challan_id: deliveryData.challan_id,
          p_customer_id: deliveryData.customer_id,
          p_material_type: deliveryData.material_type,
          p_quantity: deliveryData.quantity
        });

      if (error) throw new Error(error.message);
      return data;
    }, deliveryData);
  },

  // Get customer stock summary
  getCustomerStockSummary: async (customerId: string) => {
    return withApiLogging('materialStockWorkflow.getCustomerStockSummary', async () => {
      const { data, error } = await supabase
        .rpc('get_customer_stock_summary', {
          p_customer_id: customerId
        });

      if (error) throw new Error(error.message);
      return data;
    }, { customerId });
  },

  // Get low stock alerts
  getLowStockAlerts: async (thresholdQuantity: number = 10) => {
    return withApiLogging('materialStockWorkflow.getLowStockAlerts', async () => {
      const { data, error } = await supabase
        .rpc('get_low_stock_alerts', {
          p_threshold_quantity: thresholdQuantity
        });

      if (error) throw new Error(error.message);
      return data;
    }, { thresholdQuantity });
  },

  // Transfer stock between customers
  transferStock: async (transferData: {
    from_customer_id: string;
    to_customer_id: string;
    material_type: string;
    quantity: number;
    transfer_reason?: string;
    authorized_by?: string;
  }) => {
    return withApiLogging('materialStockWorkflow.transferStock', async () => {
      const { data, error } = await supabase
        .rpc('transfer_stock', {
          p_from_customer_id: transferData.from_customer_id,
          p_to_customer_id: transferData.to_customer_id,
          p_material_type: transferData.material_type,
          p_quantity: transferData.quantity,
          p_transfer_reason: transferData.transfer_reason,
          p_authorized_by: transferData.authorized_by
        });

      if (error) throw new Error(error.message);
      return data;
    }, transferData);
  },

  // Reconcile stock (adjust for discrepancies)
  reconcileStock: async (reconcileData: {
    customer_id: string;
    material_type: string;
    actual_quantity: number;
    reconcile_reason: string;
    reconciled_by?: string;
  }) => {
    return withApiLogging('materialStockWorkflow.reconcileStock', async () => {
      const { data, error } = await supabase
        .rpc('reconcile_stock', {
          p_customer_id: reconcileData.customer_id,
          p_material_type: reconcileData.material_type,
          p_actual_quantity: reconcileData.actual_quantity,
          p_reconcile_reason: reconcileData.reconcile_reason,
          p_reconciled_by: reconcileData.reconciled_by
        });

      if (error) throw new Error(error.message);
      return data;
    }, reconcileData);
  },

  // Adjust stock for wastage/loss
  adjustStockForWastage: async (adjustData: {
    customer_id: string;
    material_type: string;
    wastage_quantity: number;
    wastage_reason: string;
    reported_by?: string;
  }) => {
    return withApiLogging('materialStockWorkflow.adjustStockForWastage', async () => {
      const { data, error } = await supabase
        .rpc('adjust_stock_wastage', {
          p_customer_id: adjustData.customer_id,
          p_material_type: adjustData.material_type,
          p_wastage_quantity: adjustData.wastage_quantity,
          p_wastage_reason: adjustData.wastage_reason,
          p_reported_by: adjustData.reported_by
        });

      if (error) throw new Error(error.message);
      return data;
    }, adjustData);
  },

  // Get material stock history
  getStockHistory: async (customerId?: string, materialType?: string, fromDate?: string, toDate?: string) => {
    return withApiLogging('materialStockWorkflow.getStockHistory', async () => {
      const { data, error } = await supabase
        .rpc('get_material_stock_history', {
          p_customer_id: customerId,
          p_material_type: materialType,
          p_from_date: fromDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          p_to_date: toDate || new Date().toISOString().split('T')[0]
        });

      if (error) throw new Error(error.message);
      return data;
    }, { customerId, materialType, fromDate, toDate });
  },

  // Get pending stock movements
  getPendingStockMovements: async () => {
    return withApiLogging('materialStockWorkflow.getPendingStockMovements', async () => {
      const { data, error } = await supabase
        .from('material_stock_movements')
        .select(`
          *,
          customers(name),
          material_types(name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data;
    });
  },

  // Approve stock movement
  approveStockMovement: async (movementId: string, approvedBy?: string) => {
    return withApiLogging('materialStockWorkflow.approveStockMovement', async () => {
      const { data, error } = await supabase
        .rpc('approve_stock_movement', {
          p_movement_id: movementId,
          p_approved_by: approvedBy
        });

      if (error) throw new Error(error.message);
      return data;
    }, { movementId, approvedBy });
  },

  // Get stock valuation
  getStockValuation: async (customerId?: string, valuationDate?: string) => {
    return withApiLogging('materialStockWorkflow.getStockValuation', async () => {
      const { data, error } = await supabase
        .rpc('get_stock_valuation', {
          p_customer_id: customerId,
          p_valuation_date: valuationDate || new Date().toISOString().split('T')[0]
        });

      if (error) throw new Error(error.message);
      return data;
    }, { customerId, valuationDate });
  }
};

export default materialStockWorkflowApi;