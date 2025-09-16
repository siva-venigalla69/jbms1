import { supabase } from '../lib/supabase';
import {
  ProductionBatch,
  ProductionBatchCreate,
  ProductionBatchUpdate,
  ProductionBatchFilter,
  ProductionStatus,
  ProductionBatchStatus
} from '../types';
import { withApiLogging } from './supabaseApi';

const TABLES = {
  PRODUCTION_BATCHES: 'production_batches'
};

export const productionBatchApi = {
  // Create a new production batch
  createProductionBatch: async (batchData: ProductionBatchCreate): Promise<ProductionBatch> => {
    return withApiLogging('productionBatch.create', async () => {
      // Generate production batch number
      const batchNumber = `PB-${Date.now()}`;

      const { data, error } = await supabase
        .from(TABLES.PRODUCTION_BATCHES)
        .insert({
          production_batch_number: batchNumber,
          order_id: batchData.order_id,
          order_item_id: batchData.order_item_id,
          material_type: batchData.material_type,
          planned_quantity: batchData.planned_quantity,
          design_status: batchData.design_status || 'pending_from_customer',
          production_status: batchData.production_status || 'pending',
          batch_status: 'planned',
          priority: batchData.priority || 'medium',
          planned_start_date: batchData.planned_start_date,
          planned_completion_date: batchData.planned_completion_date,
          design_notes: batchData.design_notes,
          production_notes: batchData.production_notes,
        })
        .select(`
          *,
          order:orders(
            id,
            order_number,
            customer_id,
            status,
            customer:customers(id, name, phone)
          ),
          order_item:order_items(
            id,
            material_type,
            quantity,
            unit_price
          )
        `)
        .single();

      if (error) throw new Error(error.message);
      return data;
    }, batchData);
  },

  // Get all production batches with filters
  getProductionBatches: async (filters?: ProductionBatchFilter): Promise<ProductionBatch[]> => {
    return withApiLogging('productionBatch.getAll', async () => {
      let query = supabase
        .from(TABLES.PRODUCTION_BATCHES)
        .select(`
          *,
          order:orders(
            id,
            order_number,
            customer_id,
            status,
            customer:customers(id, name, phone)
          ),
          order_item:order_items(
            id,
            material_type,
            quantity,
            unit_price
          )
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.order_id) {
        query = query.eq('order_id', filters.order_id);
      }

      if (filters?.order_item_id) {
        query = query.eq('order_item_id', filters.order_item_id);
      }

      if (filters?.material_type && filters.material_type !== 'all') {
        query = query.eq('material_type', filters.material_type);
      }

      if (filters?.design_status && filters.design_status !== 'all') {
        query = query.eq('design_status', filters.design_status);
      }

      if (filters?.production_status && filters.production_status !== 'all') {
        query = query.eq('production_status', filters.production_status);
      }

      if (filters?.batch_status && filters.batch_status !== 'all') {
        query = query.eq('batch_status', filters.batch_status);
      }

      if (filters?.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority);
      }

      if (filters?.from_date) {
        query = query.gte('planned_start_date', filters.from_date);
      }

      if (filters?.to_date) {
        query = query.lte('planned_start_date', filters.to_date);
      }

      const { data, error } = await query;

      if (error) throw new Error(error.message);
      return data || [];
    }, filters);
  },

  // Get a single production batch by ID
  getProductionBatch: async (batchId: string): Promise<ProductionBatch> => {
    return withApiLogging('productionBatch.getById', async () => {
      const { data, error } = await supabase
        .from(TABLES.PRODUCTION_BATCHES)
        .select(`
          *,
          order:orders(
            id,
            order_number,
            customer_id,
            status,
            customer:customers(id, name, phone)
          ),
          order_item:order_items(
            id,
            material_type,
            quantity,
            unit_price
          )
        `)
        .eq('id', batchId)
        .single();

      if (error) throw new Error(error.message);
      return data;
    }, { batchId });
  },

  // Get production batches for a specific order
  getBatchesByOrder: async (orderId: string): Promise<ProductionBatch[]> => {
    return withApiLogging('productionBatch.getByOrder', async () => {
      const { data, error } = await supabase
        .from(TABLES.PRODUCTION_BATCHES)
        .select(`
          *,
          order:orders(
            id,
            order_number,
            customer_id,
            status,
            customer:customers(id, name, phone)
          ),
          order_item:order_items(
            id,
            material_type,
            quantity,
            unit_price
          )
        `)
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) throw new Error(error.message);
      return data || [];
    }, { orderId });
  },

  // Update production batch
  updateProductionBatch: async (batchId: string, updates: ProductionBatchUpdate): Promise<ProductionBatch> => {
    return withApiLogging('productionBatch.update', async () => {
      const { data, error } = await supabase
        .from(TABLES.PRODUCTION_BATCHES)
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', batchId)
        .select(`
          *,
          order:orders(
            id,
            order_number,
            customer_id,
            status,
            customer:customers(id, name, phone)
          ),
          order_item:order_items(
            id,
            material_type,
            quantity,
            unit_price
          )
        `)
        .single();

      if (error) throw new Error(error.message);
      return data;
    }, { batchId, updates });
  },

  // Update production status and track stage completion
  updateProductionStatus: async (
    batchId: string,
    newStatus: ProductionStatus,
    completedBy?: string
  ): Promise<ProductionBatch> => {
    return withApiLogging('productionBatch.updateProductionStatus', async () => {
      const now = new Date().toISOString();
      const updates: any = {
        production_status: newStatus,
        updated_at: now
      };

      // Track stage completion timestamps
      switch (newStatus) {
        case 'pre_treatment':
          updates.pre_treatment_started_at = now;
          updates.actual_start_date = updates.actual_start_date || now;
          updates.batch_status = 'in_progress';
          break;
        case 'printing':
          updates.pre_treatment_completed_at = now;
          updates.pre_treatment_completed_by = completedBy;
          updates.printing_started_at = now;
          break;
        case 'post_process':
          updates.printing_completed_at = now;
          updates.printing_completed_by = completedBy;
          updates.post_process_started_at = now;
          break;
        case 'completed':
          updates.post_process_completed_at = now;
          updates.post_process_completed_by = completedBy;
          updates.actual_completion_date = now;
          updates.batch_status = 'completed';
          updates.actual_quantity = updates.actual_quantity || undefined; // Will be set separately
          break;
      }

      const { data, error } = await supabase
        .from(TABLES.PRODUCTION_BATCHES)
        .update(updates)
        .eq('id', batchId)
        .select(`
          *,
          order:orders(
            id,
            order_number,
            customer_id,
            status,
            customer:customers(id, name, phone)
          ),
          order_item:order_items(
            id,
            material_type,
            quantity,
            unit_price
          )
        `)
        .single();

      if (error) throw new Error(error.message);
      return data;
    }, { batchId, newStatus, completedBy });
  },

  // Mark batch as delivered (links to delivery challan)
  markBatchDelivered: async (
    batchId: string,
    deliveryChallanId: string,
    deliveredQuantity: number
  ): Promise<ProductionBatch> => {
    return withApiLogging('productionBatch.markDelivered', async () => {
      const { data, error } = await supabase
        .from(TABLES.PRODUCTION_BATCHES)
        .update({
          delivery_challan_id: deliveryChallanId,
          delivered_quantity: deliveredQuantity,
          delivery_date: new Date().toISOString().split('T')[0],
          batch_status: 'delivered',
          updated_at: new Date().toISOString()
        })
        .eq('id', batchId)
        .select(`
          *,
          order:orders(
            id,
            order_number,
            customer_id,
            status,
            customer:customers(id, name, phone)
          ),
          order_item:order_items(
            id,
            material_type,
            quantity,
            unit_price
          )
        `)
        .single();

      if (error) throw new Error(error.message);
      return data;
    }, { batchId, deliveryChallanId, deliveredQuantity });
  },

  // Delete production batch
  deleteProductionBatch: async (batchId: string): Promise<void> => {
    return withApiLogging('productionBatch.delete', async () => {
      const { error } = await supabase
        .from(TABLES.PRODUCTION_BATCHES)
        .delete()
        .eq('id', batchId);

      if (error) throw new Error(error.message);
    }, { batchId });
  },

  // Get production batch statistics
  getProductionBatchStats: async (filters?: ProductionBatchFilter) => {
    return withApiLogging('productionBatch.getStats', async () => {
      let query = supabase
        .from(TABLES.PRODUCTION_BATCHES)
        .select('production_status, batch_status, planned_quantity, actual_quantity, delivered_quantity');

      // Apply same filters as getProductionBatches
      if (filters?.order_id) {
        query = query.eq('order_id', filters.order_id);
      }

      if (filters?.material_type && filters.material_type !== 'all') {
        query = query.eq('material_type', filters.material_type);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      const stats = {
        total: data?.length || 0,
        byProductionStatus: {
          pending: 0,
          pre_treatment: 0,
          printing: 0,
          post_process: 0,
          completed: 0
        },
        byBatchStatus: {
          planned: 0,
          in_progress: 0,
          completed: 0,
          delivered: 0,
          cancelled: 0
        },
        quantities: {
          total_planned: 0,
          total_actual: 0,
          total_delivered: 0
        }
      };

      data?.forEach(batch => {
        stats.byProductionStatus[batch.production_status as keyof typeof stats.byProductionStatus]++;
        stats.byBatchStatus[batch.batch_status as keyof typeof stats.byBatchStatus]++;
        stats.quantities.total_planned += batch.planned_quantity || 0;
        stats.quantities.total_actual += batch.actual_quantity || 0;
        stats.quantities.total_delivered += batch.delivered_quantity || 0;
      });

      return stats;
    }, filters);
  }
};

export default productionBatchApi;