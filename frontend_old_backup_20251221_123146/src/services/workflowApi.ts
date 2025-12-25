// Comprehensive Workflow API - All Business Operations
// Combines all workflow APIs for easy access across the application

import businessReportsApi from './businessReportsApi';
import materialStockWorkflowApi from './materialStockWorkflowApi';
import deliveryWorkflowApi from './deliveryWorkflowApi';
import invoiceWorkflowApi from './invoiceWorkflowApi';
import orderWorkflowApi from './orderWorkflowApi';

// Export all workflow APIs as a single comprehensive service
export const workflowApi = {
  // Business Reports & Analytics
  reports: businessReportsApi,
  
  // Core Workflow Operations
  orders: orderWorkflowApi,
  materialStock: materialStockWorkflowApi,
  delivery: deliveryWorkflowApi,
  invoicing: invoiceWorkflowApi,
  
  // Convenience methods for common cross-workflow operations
  quickStats: {
    // Get dashboard overview combining multiple workflows
    getDashboardOverview: async () => {
      try {
        const [
          businessOverview,
          pendingDeliveries,
          outstandingInvoices,
          productionQueue,
          lowStockAlerts
        ] = await Promise.allSettled([
          businessReportsApi.dashboard.getBusinessOverview(),
          deliveryWorkflowApi.getPendingDeliveries(),
          invoiceWorkflowApi.getOutstandingInvoices(),
          orderWorkflowApi.getProductionQueue(),
          materialStockWorkflowApi.getLowStockAlerts()
        ]);

        return {
          business: businessOverview.status === 'fulfilled' ? businessOverview.value : null,
          deliveries: pendingDeliveries.status === 'fulfilled' ? pendingDeliveries.value : [],
          invoices: outstandingInvoices.status === 'fulfilled' ? outstandingInvoices.value : [],
          production: productionQueue.status === 'fulfilled' ? productionQueue.value : [],
          alerts: lowStockAlerts.status === 'fulfilled' ? lowStockAlerts.value : []
        };
      } catch (error) {
        throw new Error(`Failed to get dashboard overview: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
      }
    },

    // Get customer complete status
    getCustomerCompleteStatus: async (customerId: string) => {
      try {
        const [
          orders,
          deliveries,
          invoices,
          payments,
          stock
        ] = await Promise.allSettled([
          orderWorkflowApi.getOrdersByStatus(undefined, customerId),
          deliveryWorkflowApi.getItemsReadyForDelivery(customerId),
          invoiceWorkflowApi.getOutstandingInvoices(customerId),
          invoiceWorkflowApi.getCustomerPaymentHistory(customerId),
          materialStockWorkflowApi.getCustomerStockSummary(customerId)
        ]);

        return {
          customerId,
          orders: orders.status === 'fulfilled' ? orders.value : [],
          readyForDelivery: deliveries.status === 'fulfilled' ? deliveries.value : [],
          outstandingInvoices: invoices.status === 'fulfilled' ? invoices.value : [],
          paymentHistory: payments.status === 'fulfilled' ? payments.value : [],
          stockSummary: stock.status === 'fulfilled' ? stock.value : []
        };
      } catch (error) {
        throw new Error(`Failed to get customer status: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
      }
    }
  },

  // Cross-workflow operations
  endToEnd: {
    // Complete order to delivery workflow
    processOrderToDelivery: async (orderId: string) => {
      try {
        // Get order details
        const order = await orderWorkflowApi.getOrderDetails(orderId);
        if (!order) throw new Error('Order not found');

        // Get items ready for delivery
        const readyItems = await deliveryWorkflowApi.getItemsReadyForDelivery(order.customer_id);
        const orderReadyItems = readyItems.filter((item: any) => item.order_id === orderId);

        if (orderReadyItems.length === 0) {
          throw new Error('No items ready for delivery in this order');
        }

        return {
          order,
          readyItems: orderReadyItems,
          canCreateDelivery: orderReadyItems.length > 0
        };
      } catch (error) {
        throw new Error(`Failed to process order to delivery: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
      }
    },

    // Complete delivery to invoice workflow
    processDeliveryToInvoice: async (challanId: string) => {
      try {
        // Get delivery challan details
        const challan = await deliveryWorkflowApi.getDeliveryChallanDetails(challanId);
        if (!challan) throw new Error('Delivery challan not found');

        // Generate invoice from challan
        const invoice = await invoiceWorkflowApi.generateInvoiceFromChallans({
          customer_id: challan.customer_info.id,
          challan_ids: [challanId]
        });

        return {
          challan,
          invoice,
          success: true
        };
      } catch (error) {
        throw new Error(`Failed to process delivery to invoice: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
      }
    },

    // Complete payment allocation workflow
    processPaymentAllocation: async (
      customerId: string, 
      totalPayment: number, 
      paymentMethod: any,
      referenceNumber?: string
    ) => {
      try {
        // Get outstanding invoices for customer
        const outstandingInvoices = await invoiceWorkflowApi.getOutstandingInvoices(customerId);
        
        if (outstandingInvoices.length === 0) {
          throw new Error('No outstanding invoices for this customer');
        }

        // Auto-allocate payment to oldest invoices first
        let remainingPayment = totalPayment;
        const allocations = [];

        for (const invoice of outstandingInvoices) {
          if (remainingPayment <= 0) break;
          
          const outstandingAmount = invoice.total_amount - invoice.paid_amount;
          const allocationAmount = Math.min(remainingPayment, outstandingAmount);
          
          allocations.push({
            invoice_id: invoice.id,
            allocated_amount: allocationAmount
          });
          
          remainingPayment -= allocationAmount;
        }

        // Apply payment to multiple invoices
        const result = await invoiceWorkflowApi.applyPaymentToMultipleInvoices({
          customer_id: customerId,
          total_payment_amount: totalPayment,
          payment_method: paymentMethod,
          reference_number: referenceNumber,
          invoice_allocations: allocations
        });

        return {
          allocations,
          remainingPayment,
          result,
          success: true
        };
      } catch (error) {
        throw new Error(`Failed to process payment allocation: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
      }
    }
  }
};

// Export individual APIs for direct access
export {
  businessReportsApi,
  materialStockWorkflowApi,
  deliveryWorkflowApi,
  invoiceWorkflowApi,
  orderWorkflowApi
};

// Default export
export default workflowApi;