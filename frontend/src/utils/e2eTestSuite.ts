// Comprehensive End-to-End API Test Suite
// Tests all APIs with real database operations and detailed result capturing

import { employeeApi, CreateEmployeeRequest } from '../services/employeeApi';
import { payrollApi, CreateSalaryPaymentRequest } from '../services/payrollApi';
import { expensesApi, CreateExpenseRequest } from '../services/expensesApi';
import { purchasesApi, CreatePurchaseRequest } from '../services/purchasesApi';
import { paymentsApi } from '../services/paymentsApi';

export interface TestResult {
  module: string;
  operation: string;
  success: boolean;
  duration: number;
  data?: any;
  error?: string;
  timestamp: string;
}

export interface E2ETestResults {
  startTime: string;
  endTime: string;
  totalDuration: number;
  totalTests: number;
  successCount: number;
  failureCount: number;
  results: TestResult[];
  summary: {
    employee: { success: number; total: number };
    payroll: { success: number; total: number };
    expenses: { success: number; total: number };
    purchases: { success: number; total: number };
    payments: { success: number; total: number };
    integration: { success: number; total: number };
  };
}

class E2ETestRunner {
  private results: TestResult[] = [];
  private testData: {
    employees: any[];
    salaryPayments: any[];
    expenses: any[];
    purchases: any[];
    payments: any[];
  } = {
    employees: [],
    salaryPayments: [],
    expenses: [],
    purchases: [],
    payments: []
  };

  private async runTest(module: string, operation: string, testFunction: () => Promise<any>): Promise<TestResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    try {
      const data = await testFunction();
      const duration = Date.now() - startTime;
      
      const result: TestResult = {
        module,
        operation,
        success: true,
        duration,
        data,
        timestamp
      };
      
      this.results.push(result);
      console.log(`✅ ${module}.${operation} - ${duration}ms`);
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      const result: TestResult = {
        module,
        operation,
        success: false,
        duration,
        error: error.message,
        timestamp
      };
      
      this.results.push(result);
      console.log(`❌ ${module}.${operation} - ${error.message} (${duration}ms)`);
      return result;
    }
  }

  // Employee API Tests
  async testEmployeeAPI(): Promise<void> {
    console.log('\n🧑‍💼 Testing Employee API...');
    console.log('==================================');

    // Test READ operations
    await this.runTest('Employee', 'getEmployees', async () => {
      const employees = await employeeApi.getEmployees();
      this.testData.employees = employees || [];
      return { count: employees?.length || 0, employees };
    });

    await this.runTest('Employee', 'getEmployeeSummary', async () => {
      const summary = await employeeApi.getEmployeeSummary();
      return { count: summary?.length || 0, summary };
    });

    await this.runTest('Employee', 'getEmployeeDashboard', async () => {
      const dashboard = await employeeApi.getEmployeeDashboard();
      return dashboard;
    });

    // Test CREATE operation
    const testEmployee: CreateEmployeeRequest = {
      first_name: 'Test',
      last_name: 'Employee E2E',
      email: `test.e2e.${Date.now()}@example.com`,
      phone: '9876543210',
      department: 'IT',
      designation: 'Test Engineer',
      employment_type: 'FULL_TIME',
      base_salary: 75000,
      hire_date: '2024-01-15',
      address: '123 Test Street, Test City',
      date_of_birth: '1990-05-15'
    };

    let createdEmployee: any = null;
    await this.runTest('Employee', 'createEmployee', async () => {
      createdEmployee = await employeeApi.createEmployee(testEmployee);
      this.testData.employees.push(createdEmployee);
      return createdEmployee;
    });

    // Test READ single operation
    if (createdEmployee) {
      await this.runTest('Employee', 'getEmployee', async () => {
        const employee = await employeeApi.getEmployee(createdEmployee.id);
        return employee;
      });

      // Test UPDATE operation
      await this.runTest('Employee', 'updateEmployee', async () => {
        const updatedEmployee = await employeeApi.updateEmployee(createdEmployee.id, {
          phone: '9999999999',
          base_salary: 80000
        });
        return updatedEmployee;
      });

      // Test DELETE operation (cleanup)
      await this.runTest('Employee', 'deleteEmployee', async () => {
        await employeeApi.deleteEmployee(createdEmployee.id);
        return { deleted: true, id: createdEmployee.id };
      });
    }
  }

  // Payroll API Tests
  async testPayrollAPI(): Promise<void> {
    console.log('\n💰 Testing Payroll API...');
    console.log('==================================');

    // Test READ operations
    await this.runTest('Payroll', 'getSalaryPayments', async () => {
      const payments = await payrollApi.getSalaryPayments();
      this.testData.salaryPayments = payments || [];
      return { count: payments?.length || 0, payments };
    });

    await this.runTest('Payroll', 'getPayrollDashboard', async () => {
      const dashboard = await payrollApi.getPayrollDashboard();
      return dashboard;
    });

    // Test CREATE operation (if we have employees)
    if (this.testData.employees.length > 0) {
      const testPayment: CreateSalaryPaymentRequest = {
        employee_id: this.testData.employees[0].id,
        payment_period_start: '2024-01-01',
        payment_period_end: '2024-01-31',
        base_amount: 50000,
        overtime_hours: 10,
        overtime_rate: 200,
        overtime_amount: 2000,
        payment_method: 'BANK_TRANSFER'
      };

      let createdPayment: any = null;
      await this.runTest('Payroll', 'createSalaryPayment', async () => {
        createdPayment = await payrollApi.createSalaryPayment(testPayment);
        this.testData.salaryPayments.push(createdPayment);
        return createdPayment;
      });

      // Test bulk salary generation
      await this.runTest('Payroll', 'generateSalaryPayment', async () => {
        const generated = await payrollApi.generateSalaryPayment(
          this.testData.employees[0].id,
          '2024-02-01',
          '2024-02-28'
        );
        return generated;
      });

      // Cleanup
      if (createdPayment) {
        await this.runTest('Payroll', 'deleteSalaryPayment', async () => {
          await payrollApi.deleteSalaryPayment(createdPayment.id);
          return { deleted: true, id: createdPayment.id };
        });
      }
    }
  }

  // Expenses API Tests
  async testExpensesAPI(): Promise<void> {
    console.log('\n💸 Testing Expenses API...');
    console.log('==================================');

    // Test READ operations
    await this.runTest('Expenses', 'getExpenses', async () => {
      const expenses = await expensesApi.getExpenses();
      this.testData.expenses = expenses || [];
      return { count: expenses?.length || 0, expenses };
    });

    await this.runTest('Expenses', 'getExpenseDashboard', async () => {
      const dashboard = await expensesApi.getExpenseDashboard();
      return dashboard;
    });

    // Test CREATE operation
    const testExpense: CreateExpenseRequest = {
      employee_id: this.testData.employees[0]?.id,
      expense_date: '2024-01-15',
      expense_type: 'Travel',
      category: 'Transportation',
      subcategory: 'Taxi',
      description: 'Client meeting transport - E2E Test',
      amount: 500,
      tax_amount: 90,
      business_purpose: 'Client meeting for project discussion'
    };

    let createdExpense: any = null;
    await this.runTest('Expenses', 'createExpense', async () => {
      createdExpense = await expensesApi.createExpense(testExpense);
      this.testData.expenses.push(createdExpense);
      return createdExpense;
    });

    if (createdExpense) {
      // Test UPDATE operation
      await this.runTest('Expenses', 'updateExpense', async () => {
        const updatedExpense = await expensesApi.updateExpense(createdExpense.id, {
          amount: 600,
          description: 'Updated expense description - E2E Test'
        });
        return updatedExpense;
      });

      // Test approve/reject operations
      await this.runTest('Expenses', 'approveExpense', async () => {
        const approved = await expensesApi.approveExpense(createdExpense.id, 'test-approver');
        return approved;
      });

      // Cleanup
      await this.runTest('Expenses', 'deleteExpense', async () => {
        await expensesApi.deleteExpense(createdExpense.id);
        return { deleted: true, id: createdExpense.id };
      });
    }
  }

  // Purchases API Tests
  async testPurchasesAPI(): Promise<void> {
    console.log('\n🛒 Testing Purchases API...');
    console.log('==================================');

    // Test READ operations
    await this.runTest('Purchases', 'getPurchases', async () => {
      const purchases = await purchasesApi.getPurchases();
      this.testData.purchases = purchases || [];
      return { count: purchases?.length || 0, purchases };
    });

    await this.runTest('Purchases', 'getPurchaseDashboard', async () => {
      const dashboard = await purchasesApi.getPurchaseDashboard();
      return dashboard;
    });

    // Test CREATE operation
    const testPurchase: CreatePurchaseRequest = {
      vendor_name: 'Test Vendor Ltd',
      vendor_contact: 'vendor@example.com',
      purchase_date: '2024-01-15',
      category: 'Office Supplies',
      description: 'Office stationery purchase - E2E Test',
      quantity: 10,
      unit_price: 50,
      total_amount: 500,
      tax_amount: 90,
      payment_terms: 'NET_30'
    };

    let createdPurchase: any = null;
    await this.runTest('Purchases', 'createPurchase', async () => {
      createdPurchase = await purchasesApi.createPurchase(testPurchase);
      this.testData.purchases.push(createdPurchase);
      return createdPurchase;
    });

    if (createdPurchase) {
      // Test UPDATE operation
      await this.runTest('Purchases', 'updatePurchase', async () => {
        const updatedPurchase = await purchasesApi.updatePurchase(createdPurchase.id, {
          quantity: 15,
          total_amount: 750
        });
        return updatedPurchase;
      });

      // Cleanup
      await this.runTest('Purchases', 'deletePurchase', async () => {
        await purchasesApi.deletePurchase(createdPurchase.id);
        return { deleted: true, id: createdPurchase.id };
      });
    }
  }

  // Payments API Tests
  async testPaymentsAPI(): Promise<void> {
    console.log('\n💳 Testing Payments API...');
    console.log('==================================');

    // Test READ operations
    await this.runTest('Payments', 'getPayments', async () => {
      const payments = await paymentsApi.getPayments();
      this.testData.payments = payments || [];
      return { count: payments?.length || 0, payments };
    });

    await this.runTest('Payments', 'getPaymentDashboard', async () => {
      const dashboard = await paymentsApi.getPaymentDashboard();
      return dashboard;
    });

    // Additional payment-specific tests would go here
    // Note: Payment creation is typically handled by other modules
  }

  // Cross-module Integration Tests
  async testIntegrations(): Promise<void> {
    console.log('\n🔗 Testing Cross-Module Integrations...');
    console.log('==================================');

    // Test Employee -> Payroll integration
    if (this.testData.employees.length > 0) {
      await this.runTest('Integration', 'employeePayrollLink', async () => {
        const employee = this.testData.employees[0];
        
        // Create salary payment for employee
        const payment = await payrollApi.createSalaryPayment({
          employee_id: employee.id,
          payment_period_start: '2024-03-01',
          payment_period_end: '2024-03-31',
          base_amount: employee.base_salary || 50000,
          payment_method: 'BANK_TRANSFER'
        });
        
        // Verify the payment links to employee
        const paymentWithEmployee = await payrollApi.getSalaryPayment(payment.id);
        
        // Cleanup
        await payrollApi.deleteSalaryPayment(payment.id);
        
        return {
          employeeId: employee.id,
          paymentId: payment.id,
          linkedCorrectly: paymentWithEmployee.employee_id === employee.id
        };
      });
    }

    // Test Employee -> Expense integration
    if (this.testData.employees.length > 0) {
      await this.runTest('Integration', 'employeeExpenseLink', async () => {
        const employee = this.testData.employees[0];
        
        // Create expense for employee
        const expense = await expensesApi.createExpense({
          employee_id: employee.id,
          expense_date: '2024-01-20',
          expense_type: 'Travel',
          category: 'Transportation',
          description: 'Integration test expense',
          amount: 300
        });
        
        // Cleanup
        await expensesApi.deleteExpense(expense.id);
        
        return {
          employeeId: employee.id,
          expenseId: expense.id,
          linkedCorrectly: expense.employee_id === employee.id
        };
      });
    }
  }

  // Generate comprehensive test report
  generateReport(): E2ETestResults {
    const endTime = new Date().toISOString();
    const startTime = this.results[0]?.timestamp || endTime;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    
    const successCount = this.results.filter(r => r.success).length;
    const failureCount = this.results.filter(r => !r.success).length;
    
    const summary = {
      employee: {
        success: this.results.filter(r => r.module === 'Employee' && r.success).length,
        total: this.results.filter(r => r.module === 'Employee').length
      },
      payroll: {
        success: this.results.filter(r => r.module === 'Payroll' && r.success).length,
        total: this.results.filter(r => r.module === 'Payroll').length
      },
      expenses: {
        success: this.results.filter(r => r.module === 'Expenses' && r.success).length,
        total: this.results.filter(r => r.module === 'Expenses').length
      },
      purchases: {
        success: this.results.filter(r => r.module === 'Purchases' && r.success).length,
        total: this.results.filter(r => r.module === 'Purchases').length
      },
      payments: {
        success: this.results.filter(r => r.module === 'Payments' && r.success).length,
        total: this.results.filter(r => r.module === 'Payments').length
      },
      integration: {
        success: this.results.filter(r => r.module === 'Integration' && r.success).length,
        total: this.results.filter(r => r.module === 'Integration').length
      }
    };

    return {
      startTime,
      endTime,
      totalDuration,
      totalTests: this.results.length,
      successCount,
      failureCount,
      results: this.results,
      summary
    };
  }

  // Run all tests
  async runAllTests(): Promise<E2ETestResults> {
    console.log('🚀 Starting Comprehensive End-to-End API Testing...');
    console.log('====================================================');
    
    const startTime = Date.now();
    
    try {
      await this.testEmployeeAPI();
      await this.testPayrollAPI();
      await this.testExpensesAPI();
      await this.testPurchasesAPI();
      await this.testPaymentsAPI();
      await this.testIntegrations();
      
      const report = this.generateReport();
      
      console.log('\n📊 COMPREHENSIVE TEST REPORT');
      console.log('====================================================');
      console.log(`⏱️  Total Duration: ${report.totalDuration}ms`);
      console.log(`📋 Total Tests: ${report.totalTests}`);
      console.log(`✅ Successful: ${report.successCount}`);
      console.log(`❌ Failed: ${report.failureCount}`);
      console.log(`📈 Success Rate: ${((report.successCount / report.totalTests) * 100).toFixed(1)}%`);
      
      console.log('\n📊 Module Summary:');
      Object.entries(report.summary).forEach(([module, stats]) => {
        const rate = stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : '0.0';
        console.log(`  ${module.padEnd(12)}: ${stats.success}/${stats.total} (${rate}%)`);
      });
      
      if (report.failureCount > 0) {
        console.log('\n❌ Failed Tests:');
        report.results.filter(r => !r.success).forEach(r => {
          console.log(`  ${r.module}.${r.operation}: ${r.error}`);
        });
      }
      
      console.log('\n🎉 End-to-End Testing Complete!');
      return report;
      
    } catch (error) {
      console.error('💥 Testing suite failed:', error);
      throw error;
    }
  }
}

// Export the main testing function
export async function runE2ETests(): Promise<E2ETestResults> {
  const runner = new E2ETestRunner();
  return await runner.runAllTests();
}

export default E2ETestRunner;