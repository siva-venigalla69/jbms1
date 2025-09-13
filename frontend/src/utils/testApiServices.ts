// API Services Test Suite
import { employeeApi } from '../services/employeeApi';
import { payrollApi } from '../services/payrollApi';
import { expensesApi } from '../services/expensesApi';
import { purchasesApi } from '../services/purchasesApi';
import { paymentsApi } from '../services/paymentsApi';

export async function runAPITests() {
  console.log('🧪 Starting API Services Test Suite...');
  console.log('==========================================');
  
  const results = {
    employee: { tested: false, success: false, error: null },
    payroll: { tested: false, success: false, error: null },
    expenses: { tested: false, success: false, error: null },
    purchases: { tested: false, success: false, error: null },
    payments: { tested: false, success: false, error: null }
  };

  // Test Employee API
  try {
    console.log('📋 Testing Employee API...');
    results.employee.tested = true;
    
    // Test getEmployees (should work even if table doesn't exist yet)
    await employeeApi.getEmployees();
    console.log('  ✅ getEmployees - Success');
    
    results.employee.success = true;
  } catch (error: any) {
    console.log('  ❌ Employee API - Error:', error.message);
    results.employee.error = error.message;
  }

  // Test Payroll API
  try {
    console.log('💰 Testing Payroll API...');
    results.payroll.tested = true;
    
    await payrollApi.getSalaryPayments();
    console.log('  ✅ getSalaryPayments - Success');
    
    results.payroll.success = true;
  } catch (error: any) {
    console.log('  ❌ Payroll API - Error:', error.message);
    results.payroll.error = error.message;
  }

  // Test Expenses API
  try {
    console.log('💸 Testing Expenses API...');
    results.expenses.tested = true;
    
    await expensesApi.getExpenses();
    console.log('  ✅ getExpenses - Success');
    
    results.expenses.success = true;
  } catch (error: any) {
    console.log('  ❌ Expenses API - Error:', error.message);
    results.expenses.error = error.message;
  }

  // Test Purchases API
  try {
    console.log('🛒 Testing Purchases API...');
    results.purchases.tested = true;
    
    await purchasesApi.getPurchases();
    console.log('  ✅ getPurchases - Success');
    
    results.purchases.success = true;
  } catch (error: any) {
    console.log('  ❌ Purchases API - Error:', error.message);
    results.purchases.error = error.message;
  }

  // Test Payments API
  try {
    console.log('💳 Testing Payments API...');
    results.payments.tested = true;
    
    await paymentsApi.getPayments();
    console.log('  ✅ getPayments - Success');
    
    results.payments.success = true;
  } catch (error: any) {
    console.log('  ❌ Payments API - Error:', error.message);
    results.payments.error = error.message;
  }

  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('==========================================');
  
  const totalTests = Object.keys(results).length;
  const successfulTests = Object.values(results).filter(r => r.success).length;
  const failedTests = Object.values(results).filter(r => r.tested && !r.success).length;
  
  console.log(`Total APIs: ${totalTests}`);
  console.log(`Successful: ${successfulTests}`);
  console.log(`Failed: ${failedTests}`);
  
  Object.entries(results).forEach(([api, result]) => {
    const status = result.success ? '✅' : (result.tested ? '❌' : '⏭️');
    console.log(`${status} ${api.toUpperCase()} API - ${result.success ? 'PASS' : (result.error || 'Not tested')}`);
  });

  if (failedTests > 0) {
    console.log('\n⚠️  Some APIs failed. This is expected if database tables haven\'t been created yet.');
    console.log('📋 Next step: Deploy the SQL schema to create the required tables.');
  } else {
    console.log('\n🎉 All API services are working correctly!');
  }

  return results;
}

// Individual API test functions for debugging
export const testFunctions = {
  async testEmployeeAPI() {
    console.log('Testing Employee API functions...');
    try {
      const employees = await employeeApi.getEmployees();
      console.log('✅ getEmployees:', employees?.length || 0, 'records');
      
      const summary = await employeeApi.getEmployeeSummary();
      console.log('✅ getEmployeeSummary:', summary?.length || 0, 'records');
      
      return { success: true, data: { employees, summary } };
    } catch (error) {
      console.error('❌ Employee API test failed:', error);
      return { success: false, error };
    }
  },

  async testPayrollAPI() {
    console.log('Testing Payroll API functions...');
    try {
      const payments = await payrollApi.getSalaryPayments();
      console.log('✅ getSalaryPayments:', payments?.length || 0, 'records');
      
      const dashboard = await payrollApi.getPayrollDashboard();
      console.log('✅ getPayrollDashboard:', dashboard);
      
      return { success: true, data: { payments, dashboard } };
    } catch (error) {
      console.error('❌ Payroll API test failed:', error);
      return { success: false, error };
    }
  },

  async testExpensesAPI() {
    console.log('Testing Expenses API functions...');
    try {
      const expenses = await expensesApi.getExpenses();
      console.log('✅ getExpenses:', expenses?.length || 0, 'records');
      
      const dashboard = await expensesApi.getExpenseDashboard();
      console.log('✅ getExpenseDashboard:', dashboard);
      
      return { success: true, data: { expenses, dashboard } };
    } catch (error) {
      console.error('❌ Expenses API test failed:', error);
      return { success: false, error };
    }
  },

  async testPurchasesAPI() {
    console.log('Testing Purchases API functions...');
    try {
      const purchases = await purchasesApi.getPurchases();
      console.log('✅ getPurchases:', purchases?.length || 0, 'records');
      
      const dashboard = await purchasesApi.getPurchaseDashboard();
      console.log('✅ getPurchaseDashboard:', dashboard);
      
      return { success: true, data: { purchases, dashboard } };
    } catch (error) {
      console.error('❌ Purchases API test failed:', error);
      return { success: false, error };
    }
  },

  async testPaymentsAPI() {
    console.log('Testing Payments API functions...');
    try {
      const payments = await paymentsApi.getPayments();
      console.log('✅ getPayments:', payments?.length || 0, 'records');
      
      const dashboard = await paymentsApi.getPaymentDashboard();
      console.log('✅ getPaymentDashboard:', dashboard);
      
      return { success: true, data: { payments, dashboard } };
    } catch (error) {
      console.error('❌ Payments API test failed:', error);
      return { success: false, error };
    }
  }
};