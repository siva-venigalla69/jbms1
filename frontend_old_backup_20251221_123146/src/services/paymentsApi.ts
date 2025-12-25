// Enhanced Payments Management API Service
// Integrates with existing invoicing system and new modules
import { supabase } from '../lib/supabase';
import { withApiLogging } from './supabaseApi';

// Enhanced Payment Types
export interface Payment {
  id: string;
  payment_number: string;
  payment_type: 'CUSTOMER_PAYMENT' | 'SALARY_PAYMENT' | 'EXPENSE_PAYMENT' | 'VENDOR_PAYMENT' | 'REFUND';
  payment_category: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  customer_id?: string;
  employee_id?: string;
  invoice_id?: string;
  expense_id?: string;
  purchase_id?: string;
  salary_payment_id?: string;
  payment_date: string;
  amount: number;
  payment_method: 'CASH' | 'CHEQUE' | 'BANK_TRANSFER' | 'UPI' | 'CARD' | 'OTHER';
  payment_status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  transaction_reference?: string;
  bank_details?: string;
  cheque_number?: string;
  cheque_date?: string;
  upi_transaction_id?: string;
  card_last_four?: string;
  description?: string;
  notes?: string;
  processed_by?: string;
  processed_date?: string;
  failure_reason?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePaymentRequest {
  payment_type: 'CUSTOMER_PAYMENT' | 'SALARY_PAYMENT' | 'EXPENSE_PAYMENT' | 'VENDOR_PAYMENT' | 'REFUND';
  customer_id?: string;
  employee_id?: string;
  invoice_id?: string;
  expense_id?: string;
  purchase_id?: string;
  salary_payment_id?: string;
  payment_date?: string;
  amount: number;
  payment_method: 'CASH' | 'CHEQUE' | 'BANK_TRANSFER' | 'UPI' | 'CARD' | 'OTHER';
  transaction_reference?: string;
  bank_details?: string;
  cheque_number?: string;
  cheque_date?: string;
  upi_transaction_id?: string;
  card_last_four?: string;
  description?: string;
  notes?: string;
}

export interface UpdatePaymentRequest extends Partial<CreatePaymentRequest> {
  payment_status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  processed_by?: string;
  processed_date?: string;
  failure_reason?: string;
}

export interface PaymentWithDetails extends Payment {
  customer_name?: string;
  employee_name?: string;
  invoice_number?: string;
  expense_description?: string;
  purchase_description?: string;
  processed_by_name?: string;
}

export interface PaymentSummary {
  payment_type: string;
  payment_method: string;
  total_payments: number;
  total_amount: number;
  average_amount: number;
  completed_amount: number;
  pending_amount: number;
}

export interface PaymentDashboard {
  total_income_this_month: number;
  total_expenses_this_month: number;
  pending_payments_count: number;
  pending_payments_amount: number;
  failed_payments_count: number;
  failed_payments_amount: number;
  cash_payments_this_month: number;
  digital_payments_this_month: number;
  net_cash_flow: number;
}

export const paymentsApi = {
  // Get all payments with enhanced details
  getPayments: async (): Promise<PaymentWithDetails[]> => {
    return withApiLogging('paymentsApi.getPayments', async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          customer:customers!payments_customer_id_fkey (
            name
          ),
          employee:employees!payments_employee_id_fkey (
            first_name,
            last_name
          ),
          gst_invoice:gst_invoices!payments_invoice_id_fkey (
            invoice_number
          ),
          expense:expenses!payments_expense_id_fkey (
            description
          ),
          purchase:purchases!payments_purchase_id_fkey (
            description
          ),
          processed_by_employee:employees!payments_processed_by_fkey (
            first_name,
            last_name
          )
        `)
        .order('payment_date', { ascending: false });

      if (error) throw new Error(error.message);
      
      return (data || []).map(payment => ({
        ...payment,
        customer_name: payment.customer?.name,
        employee_name: payment.employee ? `${payment.employee.first_name} ${payment.employee.last_name}` : undefined,
        invoice_number: payment.gst_invoice?.invoice_number,
        expense_description: payment.expense?.description,
        purchase_description: payment.purchase?.description,
        processed_by_name: payment.processed_by_employee ? `${payment.processed_by_employee.first_name} ${payment.processed_by_employee.last_name}` : undefined
      }));
    });
  },

  // Get payment by ID
  getPayment: async (id: string): Promise<PaymentWithDetails> => {
    return withApiLogging('paymentsApi.getPayment', async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          customer:customers!payments_customer_id_fkey (
            name
          ),
          employee:employees!payments_employee_id_fkey (
            first_name,
            last_name
          ),
          gst_invoice:gst_invoices!payments_invoice_id_fkey (
            invoice_number
          ),
          expense:expenses!payments_expense_id_fkey (
            description
          ),
          purchase:purchases!payments_purchase_id_fkey (
            description
          ),
          processed_by_employee:employees!payments_processed_by_fkey (
            first_name,
            last_name
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw new Error(error.message);
      
      return {
        ...data,
        customer_name: data.customer?.name,
        employee_name: data.employee ? `${data.employee.first_name} ${data.employee.last_name}` : undefined,
        invoice_number: data.gst_invoice?.invoice_number,
        expense_description: data.expense?.description,
        purchase_description: data.purchase?.description,
        processed_by_name: data.processed_by_employee ? `${data.processed_by_employee.first_name} ${data.processed_by_employee.last_name}` : undefined
      };
    }, { id });
  },

  // Create payment
  createPayment: async (paymentData: CreatePaymentRequest): Promise<Payment> => {
    return withApiLogging('paymentsApi.createPayment', async () => {
      const { data, error } = await supabase
        .from('payments')
        .insert([{
          ...paymentData,
          payment_date: paymentData.payment_date || new Date().toISOString().split('T')[0]
        }])
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }, paymentData);
  },

  // Update payment
  updatePayment: async (id: string, paymentData: UpdatePaymentRequest): Promise<Payment> => {
    return withApiLogging('paymentsApi.updatePayment', async () => {
      const { data, error } = await supabase
        .from('payments')
        .update(paymentData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }, { id, ...paymentData });
  },

  // Delete payment
  deletePayment: async (id: string): Promise<void> => {
    return withApiLogging('paymentsApi.deletePayment', async () => {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
    }, { id });
  },

  // Process payment (mark as completed)
  processPayment: async (id: string, processedBy: string): Promise<Payment> => {
    return withApiLogging('paymentsApi.processPayment', async () => {
      const { data, error } = await supabase
        .from('payments')
        .update({
          payment_status: 'COMPLETED',
          processed_by: processedBy,
          processed_date: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }, { id, processedBy });
  },

  // Fail payment
  failPayment: async (id: string, failureReason: string, processedBy?: string): Promise<Payment> => {
    return withApiLogging('paymentsApi.failPayment', async () => {
      const { data, error } = await supabase
        .from('payments')
        .update({
          payment_status: 'FAILED',
          failure_reason: failureReason,
          processed_by: processedBy,
          processed_date: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }, { id, failureReason, processedBy });
  },

  // Get payments by type
  getPaymentsByType: async (paymentType: 'CUSTOMER_PAYMENT' | 'SALARY_PAYMENT' | 'EXPENSE_PAYMENT' | 'VENDOR_PAYMENT' | 'REFUND'): Promise<PaymentWithDetails[]> => {
    return withApiLogging('paymentsApi.getPaymentsByType', async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          customer:customers!payments_customer_id_fkey (
            name
          ),
          employee:employees!payments_employee_id_fkey (
            first_name,
            last_name
          )
        `)
        .eq('payment_type', paymentType)
        .order('payment_date', { ascending: false });

      if (error) throw new Error(error.message);
      
      return (data || []).map(payment => ({
        ...payment,
        customer_name: payment.customer?.name,
        employee_name: payment.employee ? `${payment.employee.first_name} ${payment.employee.last_name}` : undefined
      }));
    }, { paymentType });
  },

  // Get pending payments
  getPendingPayments: async (): Promise<PaymentWithDetails[]> => {
    return withApiLogging('paymentsApi.getPendingPayments', async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          customer:customers!payments_customer_id_fkey (
            name
          ),
          employee:employees!payments_employee_id_fkey (
            first_name,
            last_name
          )
        `)
        .eq('payment_status', 'PENDING')
        .order('payment_date', { ascending: true });

      if (error) throw new Error(error.message);
      
      return (data || []).map(payment => ({
        ...payment,
        customer_name: payment.customer?.name,
        employee_name: payment.employee ? `${payment.employee.first_name} ${payment.employee.last_name}` : undefined
      }));
    });
  },

  // Get payment summary
  getPaymentSummary: async (): Promise<PaymentSummary[]> => {
    return withApiLogging('paymentsApi.getPaymentSummary', async () => {
      const { data, error } = await supabase
        .from('payment_summary')
        .select('*')
        .order('total_amount', { ascending: false });

      if (error) throw new Error(error.message);
      return data || [];
    });
  },

  // Get payment dashboard data
  getPaymentDashboard: async (): Promise<PaymentDashboard> => {
    return withApiLogging('paymentsApi.getPaymentDashboard', async () => {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

      // Get current month payments
      const { data: monthlyPayments, error: monthlyError } = await supabase
        .from('payments')
        .select('amount, payment_category, payment_status, payment_method')
        .gte('payment_date', `${currentMonth}-01`)
        .lt('payment_date', `${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().slice(0, 10)}`);

      if (monthlyError) throw new Error(monthlyError.message);

      // Get pending payments
      const { data: pendingPayments, error: pendingError } = await supabase
        .from('payments')
        .select('amount')
        .eq('payment_status', 'PENDING');

      if (pendingError) throw new Error(pendingError.message);

      // Get failed payments
      const { data: failedPayments, error: failedError } = await supabase
        .from('payments')
        .select('amount')
        .eq('payment_status', 'FAILED');

      if (failedError) throw new Error(failedError.message);

      const payments = monthlyPayments || [];
      const pending = pendingPayments || [];
      const failed = failedPayments || [];

      const incomePayments = payments.filter(p => p.payment_category === 'INCOME');
      const expensePayments = payments.filter(p => p.payment_category === 'EXPENSE');
      const cashPayments = payments.filter(p => p.payment_method === 'CASH');
      const digitalPayments = payments.filter(p => ['UPI', 'BANK_TRANSFER', 'CARD'].includes(p.payment_method));

      const dashboard: PaymentDashboard = {
        total_income_this_month: incomePayments.reduce((sum, p) => sum + p.amount, 0),
        total_expenses_this_month: expensePayments.reduce((sum, p) => sum + p.amount, 0),
        pending_payments_count: pending.length,
        pending_payments_amount: pending.reduce((sum, p) => sum + p.amount, 0),
        failed_payments_count: failed.length,
        failed_payments_amount: failed.reduce((sum, p) => sum + p.amount, 0),
        cash_payments_this_month: cashPayments.reduce((sum, p) => sum + p.amount, 0),
        digital_payments_this_month: digitalPayments.reduce((sum, p) => sum + p.amount, 0),
        net_cash_flow: incomePayments.reduce((sum, p) => sum + p.amount, 0) - expensePayments.reduce((sum, p) => sum + p.amount, 0)
      };

      return dashboard;
    });
  },

  // Search payments
  searchPayments: async (searchTerm: string): Promise<PaymentWithDetails[]> => {
    return withApiLogging('paymentsApi.searchPayments', async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          customer:customers!payments_customer_id_fkey (
            name
          ),
          employee:employees!payments_employee_id_fkey (
            first_name,
            last_name
          )
        `)
        .or(`payment_number.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,transaction_reference.ilike.%${searchTerm}%`)
        .order('payment_date', { ascending: false });

      if (error) throw new Error(error.message);
      
      return (data || []).map(payment => ({
        ...payment,
        customer_name: payment.customer?.name,
        employee_name: payment.employee ? `${payment.employee.first_name} ${payment.employee.last_name}` : undefined
      }));
    }, { searchTerm });
  },

  // Get payment methods for dropdowns
  getPaymentMethods: async (): Promise<string[]> => {
    return withApiLogging('paymentsApi.getPaymentMethods', async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('payment_method')
        .not('payment_method', 'is', null);

      if (error) throw new Error(error.message);

      const methods = Array.from(new Set((data || []).map(p => p.payment_method).filter(Boolean)));
      return methods.sort();
    });
  },

  // Integration with existing invoice system
  recordInvoicePayment: async (invoiceId: string, paymentData: {
    amount: number;
    payment_method: 'CASH' | 'CHEQUE' | 'BANK_TRANSFER' | 'UPI' | 'CARD' | 'OTHER';
    payment_date?: string;
    transaction_reference?: string;
    bank_details?: string;
    notes?: string;
  }): Promise<Payment> => {
    return withApiLogging('paymentsApi.recordInvoicePayment', async () => {
      // Get invoice details to determine customer
      const { data: invoice, error: invoiceError } = await supabase
        .from('gst_invoices')
        .select('customer_id')
        .eq('id', invoiceId)
        .single();

      if (invoiceError) throw new Error(invoiceError.message);

      const payment = await paymentsApi.createPayment({
        payment_type: 'CUSTOMER_PAYMENT',
        customer_id: invoice.customer_id,
        invoice_id: invoiceId,
        amount: paymentData.amount,
        payment_method: paymentData.payment_method,
        payment_date: paymentData.payment_date,
        transaction_reference: paymentData.transaction_reference,
        bank_details: paymentData.bank_details,
        description: `Payment for invoice`,
        notes: paymentData.notes
      });

      return payment;
    }, { invoiceId, ...paymentData });
  },

  // Record salary payment
  recordSalaryPayment: async (salaryPaymentId: string, paymentData: {
    amount: number;
    payment_method: 'CASH' | 'CHEQUE' | 'BANK_TRANSFER' | 'UPI' | 'CARD' | 'OTHER';
    payment_date?: string;
    transaction_reference?: string;
    bank_details?: string;
    notes?: string;
  }): Promise<Payment> => {
    return withApiLogging('paymentsApi.recordSalaryPayment', async () => {
      // Get salary payment details to determine employee
      const { data: salaryPayment, error: salaryError } = await supabase
        .from('salary_payments')
        .select('employee_id')
        .eq('id', salaryPaymentId)
        .single();

      if (salaryError) throw new Error(salaryError.message);

      const payment = await paymentsApi.createPayment({
        payment_type: 'SALARY_PAYMENT',
        employee_id: salaryPayment.employee_id,
        salary_payment_id: salaryPaymentId,
        amount: paymentData.amount,
        payment_method: paymentData.payment_method,
        payment_date: paymentData.payment_date,
        transaction_reference: paymentData.transaction_reference,
        bank_details: paymentData.bank_details,
        description: `Salary payment`,
        notes: paymentData.notes
      });

      return payment;
    }, { salaryPaymentId, ...paymentData });
  },

  // Record expense payment
  recordExpensePayment: async (expenseId: string, paymentData: {
    amount: number;
    payment_method: 'CASH' | 'CHEQUE' | 'BANK_TRANSFER' | 'UPI' | 'CARD' | 'OTHER';
    payment_date?: string;
    transaction_reference?: string;
    bank_details?: string;
    notes?: string;
  }): Promise<Payment> => {
    return withApiLogging('paymentsApi.recordExpensePayment', async () => {
      // Get expense details to determine employee
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .select('employee_id')
        .eq('id', expenseId)
        .single();

      if (expenseError) throw new Error(expenseError.message);

      const payment = await paymentsApi.createPayment({
        payment_type: 'EXPENSE_PAYMENT',
        employee_id: expense.employee_id,
        expense_id: expenseId,
        amount: paymentData.amount,
        payment_method: paymentData.payment_method,
        payment_date: paymentData.payment_date,
        transaction_reference: paymentData.transaction_reference,
        bank_details: paymentData.bank_details,
        description: `Expense reimbursement`,
        notes: paymentData.notes
      });

      return payment;
    }, { expenseId, ...paymentData });
  },

  // Record vendor payment
  recordVendorPayment: async (purchaseId: string, paymentData: {
    amount: number;
    payment_method: 'CASH' | 'CHEQUE' | 'BANK_TRANSFER' | 'UPI' | 'CARD' | 'OTHER';
    payment_date?: string;
    transaction_reference?: string;
    bank_details?: string;
    notes?: string;
  }): Promise<Payment> => {
    return withApiLogging('paymentsApi.recordVendorPayment', async () => {
      const payment = await paymentsApi.createPayment({
        payment_type: 'VENDOR_PAYMENT',
        purchase_id: purchaseId,
        amount: paymentData.amount,
        payment_method: paymentData.payment_method,
        payment_date: paymentData.payment_date,
        transaction_reference: paymentData.transaction_reference,
        bank_details: paymentData.bank_details,
        description: `Vendor payment for purchase`,
        notes: paymentData.notes
      });

      return payment;
    }, { purchaseId, ...paymentData });
  }
};