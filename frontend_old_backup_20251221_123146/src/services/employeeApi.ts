// Employee Management API Service
import { supabase } from '../lib/supabase';
import { withApiLogging } from './supabaseApi';

// Employee Types
export interface Employee {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address?: string;
  date_of_birth?: string;
  hire_date: string;
  termination_date?: string;
  department?: string;
  designation: string;
  employment_type: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';
  employee_status: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
  reporting_manager_id?: string;
  base_salary: number;
  salary_type: 'MONTHLY' | 'DAILY' | 'HOURLY';
  currency: string;
  bank_account_number?: string;
  bank_name?: string;
  bank_ifsc?: string;
  pan_number?: string;
  aadhar_number?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateEmployeeRequest {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address?: string;
  date_of_birth?: string;
  hire_date?: string;
  department?: string;
  designation: string;
  employment_type?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';
  reporting_manager_id?: string;
  base_salary: number;
  salary_type?: 'MONTHLY' | 'DAILY' | 'HOURLY';
  bank_account_number?: string;
  bank_name?: string;
  bank_ifsc?: string;
  pan_number?: string;
  aadhar_number?: string;
}

export interface UpdateEmployeeRequest extends Partial<CreateEmployeeRequest> {
  employee_status?: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
  termination_date?: string;
}

export interface EmployeeSummary {
  id: string;
  employee_code: string;
  full_name: string;
  email?: string;
  phone?: string;
  department?: string;
  designation: string;
  employment_type: string;
  employee_status: string;
  hire_date: string;
  base_salary: number;
  salary_type: string;
  reporting_manager_name?: string;
  last_salary_paid?: number;
  days_present_this_month?: number;
  created_at: string;
  updated_at: string;
}

export const employeeApi = {
  // Get all employees
  getEmployees: async (): Promise<Employee[]> => {
    return withApiLogging('employeeApi.getEmployees', async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data || [];
    });
  },

  // Get employee summary with additional info
  getEmployeeSummary: async (): Promise<EmployeeSummary[]> => {
    return withApiLogging('employeeApi.getEmployeeSummary', async () => {
      const { data, error } = await supabase
        .from('employee_summary')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data || [];
    });
  },

  // Get employee by ID
  getEmployee: async (id: string): Promise<Employee> => {
    return withApiLogging('employeeApi.getEmployee', async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw new Error(error.message);
      return data;
    }, { id });
  },

  // Create new employee
  createEmployee: async (employeeData: CreateEmployeeRequest): Promise<Employee> => {
    return withApiLogging('employeeApi.createEmployee', async () => {
      console.log('Creating employee with data:', employeeData);
      
      // Handle potential column name variations and remove fields that don't exist in DB
      const cleanedData: any = { ...employeeData };
      
      // Remove fields that don't exist in the database schema
      delete cleanedData.address; // address column doesn't exist in employees table
      
      // Clean UUID fields - convert empty strings to undefined
      if (cleanedData.reporting_manager_id === '') {
        cleanedData.reporting_manager_id = undefined;
      }
      
      // Try common variations of aadhar field
      if (cleanedData.aadhar_number) {
        // Keep original field name and add potential alternatives
        cleanedData['aadhaar_number'] = cleanedData.aadhar_number;
        cleanedData['aadhar'] = cleanedData.aadhar_number;
        cleanedData['aadhaar'] = cleanedData.aadhar_number;
      }
      
      const { data, error } = await supabase
        .from('employees')
        .insert([cleanedData])
        .select()
        .single();

      if (error) {
        console.error('Employee creation error:', error);
        
        // If error mentions aadhar/aadhaar, try with different field name
        if (error.message.includes('aadhar') || error.message.includes('aadhaar')) {
          console.log('Aadhar field error detected, trying with different field names...');
          
          // Remove all aadhar variations and try again
          const dataWithoutAadhar = { ...employeeData };
          delete dataWithoutAadhar.aadhar_number;
          
          const { data: data2, error: error2 } = await supabase
            .from('employees')
            .insert([dataWithoutAadhar])
            .select()
            .single();
            
          if (error2) {
            throw new Error(`Employee creation failed: ${error2.message} - Code: ${error2.code} - Details: ${JSON.stringify(error2.details)}`);
          }
          
          console.log('Employee created successfully without aadhar field:', data2);
          return data2;
        }
        
        throw new Error(`Employee creation failed: ${error.message} - Code: ${error.code} - Details: ${JSON.stringify(error.details)}`);
      }
      
      console.log('Employee created successfully:', data);
      return data;
    }, employeeData);
  },

  // Update employee
  updateEmployee: async (id: string, employeeData: UpdateEmployeeRequest): Promise<Employee> => {
    return withApiLogging('employeeApi.updateEmployee', async () => {
      const { data, error } = await supabase
        .from('employees')
        .update(employeeData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }, { id, ...employeeData });
  },

  // Delete employee (soft delete by setting status to TERMINATED)
  deleteEmployee: async (id: string): Promise<void> => {
    return withApiLogging('employeeApi.deleteEmployee', async () => {
      const { error } = await supabase
        .from('employees')
        .update({ 
          employee_status: 'TERMINATED',
          termination_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', id);

      if (error) throw new Error(error.message);
    }, { id });
  },

  // Get employees by department
  getEmployeesByDepartment: async (department: string): Promise<Employee[]> => {
    return withApiLogging('employeeApi.getEmployeesByDepartment', async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('department', department)
        .eq('employee_status', 'ACTIVE')
        .order('first_name');

      if (error) throw new Error(error.message);
      return data || [];
    }, { department });
  },

  // Get active employees for dropdowns
  getActiveEmployees: async (): Promise<{ id: string; name: string; employee_code: string }[]> => {
    return withApiLogging('employeeApi.getActiveEmployees', async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, employee_code, first_name, last_name')
        .eq('employee_status', 'ACTIVE')
        .order('first_name');

      if (error) throw new Error(error.message);
      
      return (data || []).map(emp => ({
        id: emp.id,
        employee_code: emp.employee_code,
        name: `${emp.first_name} ${emp.last_name}`
      }));
    });
  },

  // Search employees
  searchEmployees: async (searchTerm: string): Promise<Employee[]> => {
    return withApiLogging('employeeApi.searchEmployees', async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,employee_code.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .order('first_name');

      if (error) throw new Error(error.message);
      return data || [];
    }, { searchTerm });
  },

  // Get departments
  getDepartments: async (): Promise<string[]> => {
    return withApiLogging('employeeApi.getDepartments', async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('department')
        .not('department', 'is', null);

      if (error) throw new Error(error.message);
      
      const departments = Array.from(new Set((data || []).map(emp => emp.department).filter(Boolean)));
      return departments.sort();
    });
  }
};