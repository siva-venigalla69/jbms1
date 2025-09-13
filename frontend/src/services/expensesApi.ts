// Expenses Management API Service
import { supabase } from '../lib/supabase';
import { withApiLogging } from './supabaseApi';

// Expense Types
export interface Expense {
  id: string;
  expense_number: string;
  employee_id?: string;
  expense_date: string;
  expense_type: string;
  category: string;
  subcategory?: string;
  description: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  vendor_name?: string;
  vendor_contact?: string;
  vendor_gst?: string;
  invoice_number?: string;
  invoice_date?: string;
  policy_limit?: number;
  exceeds_policy?: boolean;
  business_purpose?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID' | 'REIMBURSED';
  submitted_by?: string;
  submitted_date?: string;
  approved_by?: string;
  approved_date?: string;
  rejection_reason?: string;
  payment_method?: string;
  payment_reference?: string;
  payment_date?: string;
  payment_id?: string;
  reimbursement_status: 'PENDING' | 'PROCESSED' | 'COMPLETED';
  receipt_url?: string;
  additional_documents?: string[];
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateExpenseRequest {
  employee_id?: string;
  expense_date?: string;
  expense_type: string;
  category: string;
  subcategory?: string;
  description: string;
  amount: number;
  tax_amount?: number;
  vendor_name?: string;
  vendor_contact?: string;
  vendor_gst?: string;
  invoice_number?: string;
  invoice_date?: string;
  policy_limit?: number;
  business_purpose?: string;
  receipt_url?: string;
  additional_documents?: string[];
  notes?: string;
}

export interface UpdateExpenseRequest extends Partial<CreateExpenseRequest> {
  status?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID' | 'REIMBURSED';
  rejection_reason?: string;
  payment_method?: string;
  payment_reference?: string;
  payment_date?: string;
  reimbursement_status?: 'PENDING' | 'PROCESSED' | 'COMPLETED';
}

export interface ExpenseWithEmployee extends Expense {
  employee_name?: string;
  employee_code?: string;
  department?: string;
  submitted_by_name?: string;
  approved_by_name?: string;
}

export interface ExpenseSummary {
  expense_type: string;
  category: string;
  total_expenses: number;
  total_amount: number;
  average_amount: number;
  approved_amount: number;
  paid_amount: number;
}

export interface ExpenseDashboard {
  total_expenses_this_month: number;
  pending_approval_count: number;
  pending_approval_amount: number;
  approved_pending_payment_count: number;
  approved_pending_payment_amount: number;
  total_paid_this_month: number;
  average_expense_amount: number;
  policy_violations_count: number;
}

export const expensesApi = {
  // Get all expenses
  getExpenses: async (): Promise<ExpenseWithEmployee[]> => {
    return withApiLogging('expensesApi.getExpenses', async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          employee:employees!expenses_employee_id_fkey (
            first_name,
            last_name,
            employee_code,
            department
          ),
          submitted_by_employee:employees!expenses_submitted_by_fkey (
            first_name,
            last_name
          ),
          approved_by_employee:employees!expenses_approved_by_fkey (
            first_name,
            last_name
          )
        `)
        .order('expense_date', { ascending: false });

      if (error) throw new Error(error.message);
      
      return (data || []).map(expense => ({
        ...expense,
        employee_name: expense.employee ? `${expense.employee.first_name} ${expense.employee.last_name}` : undefined,
        employee_code: expense.employee?.employee_code,
        department: expense.employee?.department,
        submitted_by_name: expense.submitted_by_employee ? `${expense.submitted_by_employee.first_name} ${expense.submitted_by_employee.last_name}` : undefined,
        approved_by_name: expense.approved_by_employee ? `${expense.approved_by_employee.first_name} ${expense.approved_by_employee.last_name}` : undefined
      }));
    });
  },

  // Get expense by ID
  getExpense: async (id: string): Promise<ExpenseWithEmployee> => {
    return withApiLogging('expensesApi.getExpense', async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          employee:employees!expenses_employee_id_fkey (
            first_name,
            last_name,
            employee_code,
            department
          ),
          submitted_by_employee:employees!expenses_submitted_by_fkey (
            first_name,
            last_name
          ),
          approved_by_employee:employees!expenses_approved_by_fkey (
            first_name,
            last_name
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw new Error(error.message);
      
      return {
        ...data,
        employee_name: data.employee ? `${data.employee.first_name} ${data.employee.last_name}` : undefined,
        employee_code: data.employee?.employee_code,
        department: data.employee?.department,
        submitted_by_name: data.submitted_by_employee ? `${data.submitted_by_employee.first_name} ${data.submitted_by_employee.last_name}` : undefined,
        approved_by_name: data.approved_by_employee ? `${data.approved_by_employee.first_name} ${data.approved_by_employee.last_name}` : undefined
      };
    }, { id });
  },

  // Create expense
  createExpense: async (expenseData: CreateExpenseRequest): Promise<Expense> => {
    return withApiLogging('expensesApi.createExpense', async () => {
      const { data, error } = await supabase
        .from('expenses')
        .insert([expenseData])
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }, expenseData);
  },

  // Update expense
  updateExpense: async (id: string, expenseData: UpdateExpenseRequest): Promise<Expense> => {
    return withApiLogging('expensesApi.updateExpense', async () => {
      const { data, error } = await supabase
        .from('expenses')
        .update(expenseData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }, { id, ...expenseData });
  },

  // Delete expense
  deleteExpense: async (id: string): Promise<void> => {
    return withApiLogging('expensesApi.deleteExpense', async () => {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
    }, { id });
  },

  // Submit expense for approval
  submitExpense: async (id: string, submittedBy: string): Promise<Expense> => {
    return withApiLogging('expensesApi.submitExpense', async () => {
      const { data, error } = await supabase
        .from('expenses')
        .update({
          status: 'SUBMITTED',
          submitted_by: submittedBy,
          submitted_date: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }, { id, submittedBy });
  },

  // Approve expense
  approveExpense: async (id: string, approvedBy: string): Promise<Expense> => {
    return withApiLogging('expensesApi.approveExpense', async () => {
      const { data, error } = await supabase
        .from('expenses')
        .update({
          status: 'APPROVED',
          approved_by: approvedBy,
          approved_date: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }, { id, approvedBy });
  },

  // Reject expense
  rejectExpense: async (id: string, approvedBy: string, rejectionReason: string): Promise<Expense> => {
    return withApiLogging('expensesApi.rejectExpense', async () => {
      const { data, error } = await supabase
        .from('expenses')
        .update({
          status: 'REJECTED',
          approved_by: approvedBy,
          approved_date: new Date().toISOString(),
          rejection_reason: rejectionReason
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }, { id, approvedBy, rejectionReason });
  },

  // Get expenses by employee
  getEmployeeExpenses: async (employeeId: string): Promise<Expense[]> => {
    return withApiLogging('expensesApi.getEmployeeExpenses', async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('employee_id', employeeId)
        .order('expense_date', { ascending: false });

      if (error) throw new Error(error.message);
      return data || [];
    }, { employeeId });
  },

  // Get expenses requiring approval
  getPendingApprovalExpenses: async (): Promise<ExpenseWithEmployee[]> => {
    return withApiLogging('expensesApi.getPendingApprovalExpenses', async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          employee:employees!expenses_employee_id_fkey (
            first_name,
            last_name,
            employee_code,
            department
          )
        `)
        .eq('status', 'SUBMITTED')
        .order('submitted_date', { ascending: true });

      if (error) throw new Error(error.message);
      
      return (data || []).map(expense => ({
        ...expense,
        employee_name: expense.employee ? `${expense.employee.first_name} ${expense.employee.last_name}` : undefined,
        employee_code: expense.employee?.employee_code,
        department: expense.employee?.department
      }));
    });
  },

  // Get expense summary
  getExpenseSummary: async (): Promise<ExpenseSummary[]> => {
    return withApiLogging('expensesApi.getExpenseSummary', async () => {
      const { data, error } = await supabase
        .from('expense_summary')
        .select('*')
        .order('total_amount', { ascending: false });

      if (error) throw new Error(error.message);
      return data || [];
    });
  },

  // Get expense dashboard data
  getExpenseDashboard: async (): Promise<ExpenseDashboard> => {
    return withApiLogging('expensesApi.getExpenseDashboard', async () => {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

      // Get current month expenses
      const { data: monthlyExpenses, error: monthlyError } = await supabase
        .from('expenses')
        .select('total_amount, status, exceeds_policy')
        .gte('expense_date', `${currentMonth}-01`)
        .lt('expense_date', `${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().slice(0, 10)}`);

      if (monthlyError) throw new Error(monthlyError.message);

      // Get pending approval expenses
      const { data: pendingExpenses, error: pendingError } = await supabase
        .from('expenses')
        .select('total_amount')
        .eq('status', 'SUBMITTED');

      if (pendingError) throw new Error(pendingError.message);

      // Get approved but unpaid expenses
      const { data: approvedExpenses, error: approvedError } = await supabase
        .from('expenses')
        .select('total_amount')
        .eq('status', 'APPROVED');

      if (approvedError) throw new Error(approvedError.message);

      const expenses = monthlyExpenses || [];
      const pending = pendingExpenses || [];
      const approved = approvedExpenses || [];

      const dashboard: ExpenseDashboard = {
        total_expenses_this_month: expenses.reduce((sum, e) => sum + e.total_amount, 0),
        pending_approval_count: pending.length,
        pending_approval_amount: pending.reduce((sum, e) => sum + e.total_amount, 0),
        approved_pending_payment_count: approved.length,
        approved_pending_payment_amount: approved.reduce((sum, e) => sum + e.total_amount, 0),
        total_paid_this_month: expenses.filter(e => e.status === 'PAID').reduce((sum, e) => sum + e.total_amount, 0),
        average_expense_amount: expenses.length > 0 ? expenses.reduce((sum, e) => sum + e.total_amount, 0) / expenses.length : 0,
        policy_violations_count: expenses.filter(e => e.exceeds_policy).length
      };

      return dashboard;
    });
  },

  // Search expenses
  searchExpenses: async (searchTerm: string): Promise<ExpenseWithEmployee[]> => {
    return withApiLogging('expensesApi.searchExpenses', async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          employee:employees!expenses_employee_id_fkey (
            first_name,
            last_name,
            employee_code,
            department
          )
        `)
        .or(`expense_number.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,vendor_name.ilike.%${searchTerm}%,expense_type.ilike.%${searchTerm}%`)
        .order('expense_date', { ascending: false });

      if (error) throw new Error(error.message);
      
      return (data || []).map(expense => ({
        ...expense,
        employee_name: expense.employee ? `${expense.employee.first_name} ${expense.employee.last_name}` : undefined,
        employee_code: expense.employee?.employee_code,
        department: expense.employee?.department
      }));
    }, { searchTerm });
  },

  // Get expense types and categories for dropdowns
  getExpenseCategories: async (): Promise<{ expense_types: string[], categories: string[], subcategories: string[] }> => {
    return withApiLogging('expensesApi.getExpenseCategories', async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('expense_type, category, subcategory')
        .not('expense_type', 'is', null)
        .not('category', 'is', null);

      if (error) throw new Error(error.message);

      const expenseTypes = Array.from(new Set((data || []).map(e => e.expense_type).filter(Boolean)));
      const categories = Array.from(new Set((data || []).map(e => e.category).filter(Boolean)));
      const subcategories = Array.from(new Set((data || []).map(e => e.subcategory).filter(Boolean)));

      return {
        expense_types: expenseTypes.sort(),
        categories: categories.sort(),
        subcategories: subcategories.sort()
      };
    });
  }
};