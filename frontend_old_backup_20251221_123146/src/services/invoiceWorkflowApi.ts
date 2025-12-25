// Invoice & Payment Workflow API - Advanced Financial Operations
// Integrates with invoice and payment management business logic SQLs

import { supabase } from '../lib/supabase';
import { withApiLogging } from './supabaseApi';

export interface CreateInvoiceData {
  customer_id: string;
  order_id?: string;
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  subtotal: number;
  tax_rate?: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount: number;
  payment_terms?: string;
  notes?: string;
  challan_ids?: string[];
}

export interface PaymentData {
  customer_id: string;
  invoice_id?: string;
  payment_amount: number;
  payment_method: 'CASH' | 'CHEQUE' | 'BANK_TRANSFER' | 'UPI' | 'CARD' | 'OTHER';
  payment_date?: string;
  reference_number?: string;
  bank_details?: string;
  notes?: string;
}

export const invoiceWorkflowApi = {
  // Create GST invoice with full workflow integration
  createGSTInvoice: async (invoiceData: CreateInvoiceData) => {
    return withApiLogging('invoiceWorkflow.createGSTInvoice', async () => {
      const { data, error } = await supabase
        .rpc('create_gst_invoice', {
          p_customer_id: invoiceData.customer_id,
          p_order_id: invoiceData.order_id,
          p_invoice_number: invoiceData.invoice_number,
          p_invoice_date: invoiceData.invoice_date || new Date().toISOString().split('T')[0],
          p_due_date: invoiceData.due_date,
          p_subtotal: invoiceData.subtotal,
          p_tax_rate: invoiceData.tax_rate || 18.0,
          p_tax_amount: invoiceData.tax_amount,
          p_discount_amount: invoiceData.discount_amount || 0,
          p_total_amount: invoiceData.total_amount,
          p_payment_terms: invoiceData.payment_terms,
          p_notes: invoiceData.notes,
          p_challan_ids: invoiceData.challan_ids ? JSON.stringify(invoiceData.challan_ids) : null
        });

      if (error) throw new Error(error.message);
      return data;
    }, invoiceData);
  },

  // Record payment with full workflow integration
  recordPayment: async (paymentData: PaymentData) => {
    return withApiLogging('invoiceWorkflow.recordPayment', async () => {
      const { data, error } = await supabase
        .rpc('record_payment', {
          p_customer_id: paymentData.customer_id,
          p_invoice_id: paymentData.invoice_id,
          p_payment_amount: paymentData.payment_amount,
          p_payment_method: paymentData.payment_method,
          p_payment_date: paymentData.payment_date || new Date().toISOString().split('T')[0],
          p_reference_number: paymentData.reference_number,
          p_bank_details: paymentData.bank_details,
          p_notes: paymentData.notes
        });

      if (error) throw new Error(error.message);
      return data;
    }, paymentData);
  },

  // Get invoice with full details
  getInvoiceDetails: async (invoiceId: string) => {
    return withApiLogging('invoiceWorkflow.getInvoiceDetails', async () => {
      const { data, error } = await supabase
        .rpc('get_invoice_details', {
          p_invoice_id: invoiceId
        });

      if (error) throw new Error(error.message);
      return data && data.length > 0 ? data[0] : null;
    }, { invoiceId });
  },

  // Get outstanding invoices
  getOutstandingInvoices: async (customerId?: string) => {
    return withApiLogging('invoiceWorkflow.getOutstandingInvoices', async () => {
      const { data, error } = await supabase
        .rpc('get_outstanding_invoices', {
          p_customer_id: customerId
        });

      if (error) throw new Error(error.message);
      return data;
    }, { customerId });
  },

  // Get overdue invoices
  getOverdueInvoices: async (customerId?: string) => {
    return withApiLogging('invoiceWorkflow.getOverdueInvoices', async () => {
      const { data, error } = await supabase
        .rpc('get_overdue_invoices', {
          p_customer_id: customerId
        });

      if (error) throw new Error(error.message);
      return data;
    }, { customerId });
  },

  // Update invoice status
  updateInvoiceStatus: async (invoiceId: string, status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED') => {
    return withApiLogging('invoiceWorkflow.updateInvoiceStatus', async () => {
      const { data, error } = await supabase
        .rpc('update_invoice_status', {
          p_invoice_id: invoiceId,
          p_status: status
        });

      if (error) throw new Error(error.message);
      return data;
    }, { invoiceId, status });
  },

  // Generate invoice from delivery challan(s)
  generateInvoiceFromChallans: async (invoiceData: {
    customer_id: string;
    challan_ids: string[];
    invoice_date?: string;
    due_date?: string;
    payment_terms?: string;
    additional_charges?: number;
    discount_amount?: number;
    notes?: string;
  }) => {
    return withApiLogging('invoiceWorkflow.generateInvoiceFromChallans', async () => {
      const { data, error } = await supabase
        .rpc('generate_invoice_from_challans', {
          p_customer_id: invoiceData.customer_id,
          p_challan_ids: JSON.stringify(invoiceData.challan_ids),
          p_invoice_date: invoiceData.invoice_date || new Date().toISOString().split('T')[0],
          p_due_date: invoiceData.due_date,
          p_payment_terms: invoiceData.payment_terms,
          p_additional_charges: invoiceData.additional_charges || 0,
          p_discount_amount: invoiceData.discount_amount || 0,
          p_notes: invoiceData.notes
        });

      if (error) throw new Error(error.message);
      return data;
    }, invoiceData);
  },

  // Get customer payment history
  getCustomerPaymentHistory: async (customerId: string, fromDate?: string, toDate?: string) => {
    return withApiLogging('invoiceWorkflow.getCustomerPaymentHistory', async () => {
      const { data, error } = await supabase
        .rpc('get_customer_payment_history', {
          p_customer_id: customerId,
          p_from_date: fromDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          p_to_date: toDate || new Date().toISOString().split('T')[0]
        });

      if (error) throw new Error(error.message);
      return data;
    }, { customerId, fromDate, toDate });
  },

  // Get aging analysis
  getAgingAnalysis: async (customerId?: string) => {
    return withApiLogging('invoiceWorkflow.getAgingAnalysis', async () => {
      const { data, error } = await supabase
        .rpc('get_aging_analysis', {
          p_customer_id: customerId
        });

      if (error) throw new Error(error.message);
      return data;
    }, { customerId });
  },

  // Send invoice reminder
  sendInvoiceReminder: async (invoiceId: string, reminderType: 'FIRST' | 'SECOND' | 'FINAL') => {
    return withApiLogging('invoiceWorkflow.sendInvoiceReminder', async () => {
      const { data, error } = await supabase
        .rpc('send_invoice_reminder', {
          p_invoice_id: invoiceId,
          p_reminder_type: reminderType
        });

      if (error) throw new Error(error.message);
      return data;
    }, { invoiceId, reminderType });
  },

  // Process partial payment
  processPartialPayment: async (paymentData: PaymentData & { partial_amount: number }) => {
    return withApiLogging('invoiceWorkflow.processPartialPayment', async () => {
      const { data, error } = await supabase
        .rpc('process_partial_payment', {
          p_invoice_id: paymentData.invoice_id,
          p_customer_id: paymentData.customer_id,
          p_payment_amount: paymentData.payment_amount,
          p_payment_method: paymentData.payment_method,
          p_payment_date: paymentData.payment_date || new Date().toISOString().split('T')[0],
          p_reference_number: paymentData.reference_number,
          p_bank_details: paymentData.bank_details,
          p_notes: paymentData.notes
        });

      if (error) throw new Error(error.message);
      return data;
    }, paymentData);
  },

  // Apply payment to multiple invoices
  applyPaymentToMultipleInvoices: async (paymentData: {
    customer_id: string;
    total_payment_amount: number;
    payment_method: PaymentData['payment_method'];
    payment_date?: string;
    reference_number?: string;
    invoice_allocations: Array<{
      invoice_id: string;
      allocated_amount: number;
    }>;
    notes?: string;
  }) => {
    return withApiLogging('invoiceWorkflow.applyPaymentToMultipleInvoices', async () => {
      const { data, error } = await supabase
        .rpc('apply_payment_to_multiple_invoices', {
          p_customer_id: paymentData.customer_id,
          p_total_payment_amount: paymentData.total_payment_amount,
          p_payment_method: paymentData.payment_method,
          p_payment_date: paymentData.payment_date || new Date().toISOString().split('T')[0],
          p_reference_number: paymentData.reference_number,
          p_invoice_allocations: JSON.stringify(paymentData.invoice_allocations),
          p_notes: paymentData.notes
        });

      if (error) throw new Error(error.message);
      return data;
    }, paymentData);
  },

  // Reverse payment
  reversePayment: async (paymentId: string, reverseReason: string) => {
    return withApiLogging('invoiceWorkflow.reversePayment', async () => {
      const { data, error } = await supabase
        .rpc('reverse_payment', {
          p_payment_id: paymentId,
          p_reverse_reason: reverseReason
        });

      if (error) throw new Error(error.message);
      return data;
    }, { paymentId, reverseReason });
  },

  // Get payment reconciliation report
  getPaymentReconciliationReport: async (fromDate?: string, toDate?: string) => {
    return withApiLogging('invoiceWorkflow.getPaymentReconciliationReport', async () => {
      const { data, error } = await supabase
        .rpc('get_payment_reconciliation_report', {
          p_from_date: fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          p_to_date: toDate || new Date().toISOString().split('T')[0]
        });

      if (error) throw new Error(error.message);
      return data;
    }, { fromDate, toDate });
  },

  // Get credit notes
  getCreditNotes: async (customerId?: string) => {
    return withApiLogging('invoiceWorkflow.getCreditNotes', async () => {
      const { data, error } = await supabase
        .from('credit_notes')
        .select(`
          *,
          customers(name),
          gst_invoices(invoice_number)
        `)
        .eq(customerId ? 'customer_id' : 'id', customerId || '')
        .order('created_at', { ascending: false });

      if (error && error.code !== '42P01') throw new Error(error.message);
      return data || [];
    }, { customerId });
  },

  // Create credit note
  createCreditNote: async (creditNoteData: {
    customer_id: string;
    original_invoice_id: string;
    credit_amount: number;
    credit_reason: string;
    credit_date?: string;
    notes?: string;
  }) => {
    return withApiLogging('invoiceWorkflow.createCreditNote', async () => {
      const { data, error } = await supabase
        .rpc('create_credit_note', {
          p_customer_id: creditNoteData.customer_id,
          p_original_invoice_id: creditNoteData.original_invoice_id,
          p_credit_amount: creditNoteData.credit_amount,
          p_credit_reason: creditNoteData.credit_reason,
          p_credit_date: creditNoteData.credit_date || new Date().toISOString().split('T')[0],
          p_notes: creditNoteData.notes
        });

      if (error) throw new Error(error.message);
      return data;
    }, creditNoteData);
  }
};

export default invoiceWorkflowApi;