import { supabase } from '../lib/supabase';
import { componentLogger } from '../utils/debug';

// Audit Trail Types
export interface AuditLogEntry {
  id?: string;
  transaction_type: 'order' | 'material' | 'cash_flow' | 'delivery' | 'production' | 'invoice' | 'payment';
  event_type: string;
  entity_type: string;
  entity_id: string;
  customer_id?: string;
  user_id?: string;
  timestamp: string;
  description: string;
  amount?: number;
  quantity?: number;
  previous_values?: Record<string, any>;
  new_values?: Record<string, any>;
  metadata?: Record<string, any>;
  reference_number?: string;
  status: string;
  impact_type: 'financial' | 'inventory' | 'production' | 'delivery' | 'administrative';
  business_context: Record<string, any>;
}

export interface MaterialStockAudit {
  customer_id: string;
  material_type: string;
  previous_stock: number;
  quantity_change: number;
  new_stock: number;
  reason: 'material_in' | 'delivery_out' | 'adjustment' | 'return';
  reference_type: string;
  reference_id: string;
}

export interface CashFlowAudit {
  customer_id: string;
  amount: number;
  type: 'payment_received' | 'invoice_generated' | 'credit_note' | 'adjustment';
  previous_balance: number;
  new_balance: number;
  payment_method?: string;
  reference_number: string;
}

class AuditTrailService {
  private static instance: AuditTrailService;
  
  public static getInstance(): AuditTrailService {
    if (!AuditTrailService.instance) {
      AuditTrailService.instance = new AuditTrailService();
    }
    return AuditTrailService.instance;
  }

  /**
   * Log a comprehensive audit entry
   */
  async logTransaction(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    try {
      const auditEntry: AuditLogEntry = {
        ...entry,
        timestamp: new Date().toISOString(),
      };

      // Check if audit_logs table exists first
      const { error } = await supabase
        .from('audit_logs')
        .insert(auditEntry);

      if (error) {
        componentLogger.warn('Audit logging disabled or table missing', { 
          error: error.message,
          code: error.code 
        });
        // Don't throw - just log the warning
      } else {
        componentLogger.debug('Audit entry logged', { 
          type: entry.transaction_type, 
          event: entry.event_type 
        });
      }
    } catch (error) {
      componentLogger.warn('Audit logging not available', error);
      // Don't throw - audit logging is optional
    }
  }

  /**
   * Log Order Transactions
   */
  async logOrderTransaction(
    eventType: 'created' | 'updated' | 'cancelled' | 'completed',
    orderId: string,
    customerId: string,
    orderData: any,
    previousData?: any
  ): Promise<void> {
    await this.logTransaction({
      transaction_type: 'order',
      event_type: eventType,
      entity_type: 'order',
      entity_id: orderId,
      customer_id: customerId,
      description: `Order ${eventType}: ${orderData.order_number || orderId}`,
      amount: orderData.total_amount,
      previous_values: previousData,
      new_values: orderData,
      reference_number: orderData.order_number,
      status: orderData.status,
      impact_type: 'administrative',
      business_context: {
        items_count: orderData.order_items?.length || 0,
        order_date: orderData.order_date,
        design_requirements: orderData.order_items?.map((item: any) => ({
          material_type: item.material_type,
          design_received: item.design_received,
          design_ready: item.design_ready
        }))
      }
    });
  }

  /**
   * Log Material Movement Transactions
   */
  async logMaterialTransaction(
    eventType: 'material_in' | 'material_out' | 'stock_adjustment',
    stockAudit: MaterialStockAudit,
    description: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logTransaction({
      transaction_type: 'material',
      event_type: eventType,
      entity_type: 'material_stock',
      entity_id: `${stockAudit.customer_id}-${stockAudit.material_type}`,
      customer_id: stockAudit.customer_id,
      description: description,
      quantity: stockAudit.quantity_change,
      previous_values: { stock: stockAudit.previous_stock },
      new_values: { stock: stockAudit.new_stock },
      reference_number: stockAudit.reference_id,
      status: 'completed',
      impact_type: 'inventory',
      metadata: {
        ...metadata,
        material_type: stockAudit.material_type,
        reason: stockAudit.reason,
        reference_type: stockAudit.reference_type
      },
      business_context: {
        material_type: stockAudit.material_type,
        stock_before: stockAudit.previous_stock,
        stock_after: stockAudit.new_stock,
        movement_type: stockAudit.reason
      }
    });
  }

  /**
   * Log Cash Flow Transactions
   */
  async logCashFlowTransaction(
    eventType: 'payment_received' | 'invoice_generated' | 'credit_adjustment',
    cashFlowAudit: CashFlowAudit,
    description: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logTransaction({
      transaction_type: 'cash_flow',
      event_type: eventType,
      entity_type: eventType === 'payment_received' ? 'payment' : 'invoice',
      entity_id: cashFlowAudit.reference_number,
      customer_id: cashFlowAudit.customer_id,
      description: description,
      amount: cashFlowAudit.amount,
      previous_values: { balance: cashFlowAudit.previous_balance },
      new_values: { balance: cashFlowAudit.new_balance },
      reference_number: cashFlowAudit.reference_number,
      status: 'completed',
      impact_type: 'financial',
      metadata: {
        ...metadata,
        payment_method: cashFlowAudit.payment_method,
        transaction_type: cashFlowAudit.type
      },
      business_context: {
        amount: cashFlowAudit.amount,
        previous_balance: cashFlowAudit.previous_balance,
        new_balance: cashFlowAudit.new_balance,
        payment_method: cashFlowAudit.payment_method
      }
    });
  }

  /**
   * Log Delivery Transactions
   */
  async logDeliveryTransaction(
    eventType: 'challan_created' | 'delivered' | 'returned',
    challanId: string,
    customerId: string,
    deliveryData: any,
    materialImpact?: MaterialStockAudit[]
  ): Promise<void> {
    await this.logTransaction({
      transaction_type: 'delivery',
      event_type: eventType,
      entity_type: 'delivery_challan',
      entity_id: challanId,
      customer_id: customerId,
      description: `Delivery ${eventType}: ${deliveryData.challan_number}`,
      amount: deliveryData.total_amount,
      new_values: deliveryData,
      reference_number: deliveryData.challan_number,
      status: deliveryData.status,
      impact_type: 'delivery',
      metadata: {
        orders_included: deliveryData.order_ids,
        items_delivered: deliveryData.items?.length || 0,
        material_impact: materialImpact
      },
      business_context: {
        delivery_date: deliveryData.delivery_date,
        challan_number: deliveryData.challan_number,
        items_count: deliveryData.items?.length || 0,
        material_movements: materialImpact?.map(impact => ({
          material_type: impact.material_type,
          quantity: impact.quantity_change,
          stock_after: impact.new_stock
        }))
      }
    });
  }

  /**
   * Log Production Transactions
   */
  async logProductionTransaction(
    eventType: 'stage_changed' | 'design_updated' | 'quality_check',
    orderItemId: string,
    customerId: string,
    productionData: any,
    previousData?: any
  ): Promise<void> {
    await this.logTransaction({
      transaction_type: 'production',
      event_type: eventType,
      entity_type: 'order_item',
      entity_id: orderItemId,
      customer_id: customerId,
      description: `Production ${eventType}: ${productionData.material_type} - ${productionData.design_status || productionData.production_status || 'unknown'}`,
      previous_values: previousData,
      new_values: productionData,
      reference_number: `PROD-${orderItemId.slice(-6)}`,
      status: productionData.design_status || productionData.production_status || 'unknown',
      impact_type: 'production',
      business_context: {
        material_type: productionData.material_type,
        quantity: productionData.quantity,
        current_design_status: productionData.design_status,
        current_production_status: productionData.production_status,
        previous_design_status: previousData?.design_status,
        previous_production_status: previousData?.production_status,
        design_status: {
          received: productionData.design_received,
          ready: productionData.design_ready
        }
      }
    });
  }

  /**
   * Log Payment Transactions
   */
  async logPaymentTransaction(
    paymentId: string,
    customerId: string,
    paymentData: any,
    outstandingImpact: { previous: number; new: number }
  ): Promise<void> {
    await this.logTransaction({
      transaction_type: 'payment',
      event_type: 'payment_received',
      entity_type: 'payment',
      entity_id: paymentId,
      customer_id: customerId,
      description: `Payment received: ${paymentData.payment_method.toUpperCase()} - ₹${paymentData.payment_amount}`,
      amount: paymentData.payment_amount,
      new_values: paymentData,
      reference_number: paymentData.reference_number || `PAY-${paymentId.slice(-6)}`,
      status: 'completed',
      impact_type: 'financial',
      metadata: {
        payment_method: paymentData.payment_method,
        invoice_id: paymentData.invoice_id
      },
      business_context: {
        payment_amount: paymentData.payment_amount,
        payment_method: paymentData.payment_method,
        payment_date: paymentData.payment_date,
        outstanding_before: outstandingImpact.previous,
        outstanding_after: outstandingImpact.new,
        outstanding_reduction: outstandingImpact.previous - outstandingImpact.new
      }
    });
  }

  /**
   * Log Invoice Transactions
   */
  async logInvoiceTransaction(
    eventType: 'generated' | 'updated' | 'cancelled',
    invoiceId: string,
    customerId: string,
    invoiceData: any,
    challanReferences?: string[]
  ): Promise<void> {
    await this.logTransaction({
      transaction_type: 'invoice',
      event_type: eventType,
      entity_type: 'invoice',
      entity_id: invoiceId,
      customer_id: customerId,
      description: `Invoice ${eventType}: ${invoiceData.invoice_number} - ₹${invoiceData.total_amount}`,
      amount: invoiceData.total_amount,
      new_values: invoiceData,
      reference_number: invoiceData.invoice_number,
      status: invoiceData.status,
      impact_type: 'financial',
      metadata: {
        challan_references: challanReferences,
        subtotal: invoiceData.subtotal,
        tax_amount: invoiceData.tax_amount,
        due_date: invoiceData.due_date
      },
      business_context: {
        invoice_number: invoiceData.invoice_number,
        subtotal: invoiceData.subtotal,
        tax_amount: invoiceData.tax_amount,
        total_amount: invoiceData.total_amount,
        challan_count: challanReferences?.length || 0,
        due_date: invoiceData.due_date
      }
    });
  }

  /**
   * Get comprehensive transaction history
   */
  async getTransactionHistory(filters?: {
    customer_id?: string;
    transaction_type?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
  }): Promise<AuditLogEntry[]> {
    try {
      let query = supabase
        .from('audit_trail')
        .select('*')
        .order('timestamp', { ascending: false });

      if (filters?.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
      }
      
      if (filters?.transaction_type) {
        query = query.eq('transaction_type', filters.transaction_type);
      }
      
      if (filters?.date_from) {
        query = query.gte('timestamp', filters.date_from);
      }
      
      if (filters?.date_to) {
        query = query.lte('timestamp', filters.date_to);
      }
      
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data || [];
    } catch (error: any) {
      componentLogger.error('Failed to fetch transaction history', error);
      return [];
    }
  }

  /**
   * Get business analytics from audit trail
   */
  async getBusinessAnalytics(dateFrom?: string, dateTo?: string): Promise<{
    totalTransactions: number;
    revenueTransactions: number;
    materialMovements: number;
    deliveryTransactions: number;
    productionStageChanges: number;
    customerActivitySummary: Record<string, number>;
  }> {
    try {
      let query = supabase
        .from('audit_trail')
        .select('transaction_type, customer_id, amount');

      if (dateFrom) {
        query = query.gte('timestamp', dateFrom);
      }
      
      if (dateTo) {
        query = query.lte('timestamp', dateTo);
      }

      const { data, error } = await query;
      
      if (error) {
        throw new Error(error.message);
      }

      const analytics = {
        totalTransactions: data?.length || 0,
        revenueTransactions: data?.filter(t => t.transaction_type === 'cash_flow' || t.transaction_type === 'payment').length || 0,
        materialMovements: data?.filter(t => t.transaction_type === 'material').length || 0,
        deliveryTransactions: data?.filter(t => t.transaction_type === 'delivery').length || 0,
        productionStageChanges: data?.filter(t => t.transaction_type === 'production').length || 0,
        customerActivitySummary: data?.reduce((acc: Record<string, number>, transaction) => {
          if (transaction.customer_id) {
            acc[transaction.customer_id] = (acc[transaction.customer_id] || 0) + 1;
          }
          return acc;
        }, {}) || {}
      };

      return analytics;
    } catch (error: any) {
      componentLogger.error('Failed to generate business analytics', error);
      return {
        totalTransactions: 0,
        revenueTransactions: 0,
        materialMovements: 0,
        deliveryTransactions: 0,
        productionStageChanges: 0,
        customerActivitySummary: {}
      };
    }
  }
}

// Export singleton instance
export const auditTrail = AuditTrailService.getInstance();

// Convenience functions for common operations
export const logOrderCreated = (orderId: string, customerId: string, orderData: any) =>
  auditTrail.logOrderTransaction('created', orderId, customerId, orderData);

export const logMaterialReceived = (stockAudit: MaterialStockAudit, description: string) =>
  auditTrail.logMaterialTransaction('material_in', stockAudit, description);

export const logPaymentReceived = (paymentId: string, customerId: string, paymentData: any, balanceImpact: { previous: number; new: number }) =>
  auditTrail.logPaymentTransaction(paymentId, customerId, paymentData, balanceImpact);

export const logDeliveryCompleted = (challanId: string, customerId: string, deliveryData: any, materialImpact?: MaterialStockAudit[]) =>
  auditTrail.logDeliveryTransaction('delivered', challanId, customerId, deliveryData, materialImpact);

export const logProductionStageChange = (orderItemId: string, customerId: string, productionData: any, previousData?: any) =>
  auditTrail.logProductionTransaction('stage_changed', orderItemId, customerId, productionData, previousData);

export const logInvoiceGenerated = (invoiceId: string, customerId: string, invoiceData: any, challanRefs?: string[]) =>
  auditTrail.logInvoiceTransaction('generated', invoiceId, customerId, invoiceData, challanRefs);