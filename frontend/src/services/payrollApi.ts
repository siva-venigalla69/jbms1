// Payroll Management API Service
import { supabase } from '../lib/supabase';
import { withApiLogging } from './supabaseApi';

// Salary Payment Types
export interface SalaryPayment {
  id: string;
  employee_id: string;
  payment_period_start: string;
  payment_period_end: string;
  payment_date: string;
  base_amount: number;
  overtime_hours: number;
  overtime_rate: number;
  overtime_amount: number;
  bonus_amount: number;
  allowances: number;
  incentives: number;
  tax_deduction: number;
  pf_deduction: number;
  esi_deduction: number;
  loan_deduction: number;
  other_deductions: number;
  gross_salary: number;
  total_deductions: number;
  net_salary: number;
  payment_method: 'BANK_TRANSFER' | 'CASH' | 'CHEQUE';
  payment_reference?: string;
  payment_status: 'PENDING' | 'PAID' | 'CANCELLED';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateSalaryPaymentRequest {
  employee_id: string;
  payment_period_start: string;
  payment_period_end: string;
  payment_date?: string;
  base_amount: number;
  overtime_hours?: number;
  overtime_rate?: number;
  overtime_amount?: number;
  bonus_amount?: number;
  allowances?: number;
  incentives?: number;
  tax_deduction?: number;
  pf_deduction?: number;
  esi_deduction?: number;
  loan_deduction?: number;
  other_deductions?: number;
  payment_method?: 'BANK_TRANSFER' | 'CASH' | 'CHEQUE';
  payment_reference?: string;
  notes?: string;
}

export interface UpdateSalaryPaymentRequest extends Partial<CreateSalaryPaymentRequest> {
  payment_status?: 'PENDING' | 'PAID' | 'CANCELLED';
  overtime_amount?: number;
}

export interface SalaryPaymentWithEmployee extends SalaryPayment {
  employee_name: string;
  employee_code: string;
  department?: string;
  designation: string;
}

export interface MonthlySalarySummary {
  salary_month: string;
  total_employees_paid: number;
  total_gross_salary: number;
  total_deductions: number;
  total_net_salary: number;
  average_net_salary: number;
}

export interface PayrollDashboard {
  current_month_total: number;
  pending_payments_count: number;
  pending_payments_amount: number;
  this_month_paid_count: number;
  this_month_paid_amount: number;
  last_month_total: number;
  average_salary: number;
}

export const payrollApi = {
  // Get all salary payments
  getSalaryPayments: async (): Promise<SalaryPaymentWithEmployee[]> => {
    return withApiLogging('payrollApi.getSalaryPayments', async () => {
      const { data, error } = await supabase
        .from('salary_payments')
        .select(`
          *,
          employees!inner (
            first_name,
            last_name,
            employee_code,
            department,
            designation
          )
        `)
        .order('payment_date', { ascending: false });

      if (error) throw new Error(error.message);
      
      return (data || []).map(payment => ({
        ...payment,
        employee_name: `${payment.employees.first_name} ${payment.employees.last_name}`,
        employee_code: payment.employees.employee_code,
        department: payment.employees.department,
        designation: payment.employees.designation
      }));
    });
  },

  // Get salary payments for a specific employee
  getEmployeeSalaryPayments: async (employeeId: string): Promise<SalaryPayment[]> => {
    return withApiLogging('payrollApi.getEmployeeSalaryPayments', async () => {
      const { data, error } = await supabase
        .from('salary_payments')
        .select('*')
        .eq('employee_id', employeeId)
        .order('payment_date', { ascending: false });

      if (error) throw new Error(error.message);
      return data || [];
    }, { employeeId });
  },

  // Get salary payment by ID
  getSalaryPayment: async (id: string): Promise<SalaryPaymentWithEmployee> => {
    return withApiLogging('payrollApi.getSalaryPayment', async () => {
      const { data, error } = await supabase
        .from('salary_payments')
        .select(`
          *,
          employees!inner (
            first_name,
            last_name,
            employee_code,
            department,
            designation
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw new Error(error.message);
      
      return {
        ...data,
        employee_name: `${data.employees.first_name} ${data.employees.last_name}`,
        employee_code: data.employees.employee_code,
        department: data.employees.department,
        designation: data.employees.designation
      };
    }, { id });
  },

  // Create salary payment
  createSalaryPayment: async (paymentData: CreateSalaryPaymentRequest): Promise<SalaryPayment> => {
    return withApiLogging('payrollApi.createSalaryPayment', async () => {
      // Calculate overtime amount
      const overtimeAmount = (paymentData.overtime_hours || 0) * (paymentData.overtime_rate || 0);

      const paymentPayload = {
        ...paymentData,
        overtime_amount: overtimeAmount,
        payment_date: paymentData.payment_date || new Date().toISOString().split('T')[0]
      };

      const { data, error } = await supabase
        .from('salary_payments')
        .insert([paymentPayload])
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }, paymentData);
  },

  // Update salary payment
  updateSalaryPayment: async (id: string, paymentData: UpdateSalaryPaymentRequest): Promise<SalaryPayment> => {
    return withApiLogging('payrollApi.updateSalaryPayment', async () => {
      // Calculate overtime amount if overtime data is being updated
      let updateData = { ...paymentData };
      if (paymentData.overtime_hours !== undefined || paymentData.overtime_rate !== undefined) {
        updateData.overtime_amount = 
          (paymentData.overtime_hours || 0) * (paymentData.overtime_rate || 0);
      }

      const { data, error } = await supabase
        .from('salary_payments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }, { id, ...paymentData });
  },

  // Delete salary payment
  deleteSalaryPayment: async (id: string): Promise<void> => {
    return withApiLogging('payrollApi.deleteSalaryPayment', async () => {
      const { error } = await supabase
        .from('salary_payments')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
    }, { id });
  },

  // Get monthly salary summary
  getMonthlySalarySummary: async (): Promise<MonthlySalarySummary[]> => {
    return withApiLogging('payrollApi.getMonthlySalarySummary', async () => {
      const { data, error } = await supabase
        .from('monthly_salary_summary')
        .select('*')
        .order('salary_month', { ascending: false })
        .limit(12);

      if (error) throw new Error(error.message);
      return data || [];
    });
  },

  // Get payroll dashboard data
  getPayrollDashboard: async (): Promise<PayrollDashboard> => {
    return withApiLogging('payrollApi.getPayrollDashboard', async () => {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);

      // Get current month data
      const { data: currentMonthData, error: currentError } = await supabase
        .from('salary_payments')
        .select('net_salary, payment_status')
        .gte('payment_date', `${currentMonth}-01`)
        .lt('payment_date', `${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().slice(0, 10)}`);

      if (currentError) throw new Error(currentError.message);

      // Get last month data
      const { data: lastMonthData, error: lastError } = await supabase
        .from('salary_payments')
        .select('net_salary')
        .gte('payment_date', `${lastMonth}-01`)
        .lt('payment_date', `${currentMonth}-01`)
        .eq('payment_status', 'PAID');

      if (lastError) throw new Error(lastError.message);

      // Calculate dashboard metrics
      const currentMonthPayments = currentMonthData || [];
      const pendingPayments = currentMonthPayments.filter(p => p.payment_status === 'PENDING');
      const paidPayments = currentMonthPayments.filter(p => p.payment_status === 'PAID');
      
      const dashboard: PayrollDashboard = {
        current_month_total: currentMonthPayments.reduce((sum, p) => sum + p.net_salary, 0),
        pending_payments_count: pendingPayments.length,
        pending_payments_amount: pendingPayments.reduce((sum, p) => sum + p.net_salary, 0),
        this_month_paid_count: paidPayments.length,
        this_month_paid_amount: paidPayments.reduce((sum, p) => sum + p.net_salary, 0),
        last_month_total: (lastMonthData || []).reduce((sum, p) => sum + p.net_salary, 0),
        average_salary: currentMonthPayments.length > 0 
          ? currentMonthPayments.reduce((sum, p) => sum + p.net_salary, 0) / currentMonthPayments.length 
          : 0
      };

      return dashboard;
    });
  },

  // Generate salary for employee (based on base salary and attendance)
  generateSalaryPayment: async (employeeId: string, periodStart: string, periodEnd: string): Promise<CreateSalaryPaymentRequest> => {
    return withApiLogging('payrollApi.generateSalaryPayment', async () => {
      // Get employee data
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('base_salary, salary_type')
        .eq('id', employeeId)
        .single();

      if (empError) throw new Error(empError.message);

      // Get attendance data for the period
      const { data: attendance, error: attError } = await supabase
        .from('employee_attendance')
        .select('status, total_hours')
        .eq('employee_id', employeeId)
        .gte('attendance_date', periodStart)
        .lte('attendance_date', periodEnd);

      if (attError) {
        console.warn('Could not fetch attendance data:', attError.message);
      }

      // Calculate base amount based on salary type and attendance
      let baseAmount = employee.base_salary;
      
      if (employee.salary_type === 'DAILY' && attendance) {
        const presentDays = attendance.filter(a => a.status === 'PRESENT').length;
        baseAmount = employee.base_salary * presentDays;
      } else if (employee.salary_type === 'HOURLY' && attendance) {
        const totalHours = attendance.reduce((sum, a) => sum + (a.total_hours || 0), 0);
        baseAmount = employee.base_salary * totalHours;
      }

      // Basic salary calculation (can be enhanced with more complex logic)
      const salaryPayment: CreateSalaryPaymentRequest = {
        employee_id: employeeId,
        payment_period_start: periodStart,
        payment_period_end: periodEnd,
        base_amount: baseAmount,
        overtime_hours: 0,
        overtime_rate: 0,
        bonus_amount: 0,
        allowances: 0,
        incentives: 0,
        tax_deduction: Math.round(baseAmount * 0.1), // 10% tax (simplified)
        pf_deduction: Math.round(baseAmount * 0.12), // 12% PF (simplified)
        esi_deduction: Math.round(baseAmount * 0.0175), // 1.75% ESI (simplified)
        loan_deduction: 0,
        other_deductions: 0,
        payment_method: 'BANK_TRANSFER'
      };

      return salaryPayment;
    }, { employeeId, periodStart, periodEnd });
  },

  // Bulk generate salary payments for all active employees
  bulkGenerateSalaryPayments: async (periodStart: string, periodEnd: string): Promise<SalaryPayment[]> => {
    return withApiLogging('payrollApi.bulkGenerateSalaryPayments', async () => {
      // Get all active employees
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id')
        .eq('employee_status', 'ACTIVE');

      if (empError) throw new Error(empError.message);

      const payments: SalaryPayment[] = [];

      // Generate salary for each employee
      for (const employee of employees || []) {
        try {
          const salaryData = await payrollApi.generateSalaryPayment(employee.id, periodStart, periodEnd);
          const payment = await payrollApi.createSalaryPayment(salaryData);
          payments.push(payment);
        } catch (error) {
          console.error(`Failed to generate salary for employee ${employee.id}:`, error);
        }
      }

      return payments;
    }, { periodStart, periodEnd });
  }
};