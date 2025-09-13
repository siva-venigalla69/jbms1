// Quick API Test to verify schema deployment
import { employeeApi } from '../services/employeeApi';
import { payrollApi } from '../services/payrollApi';
import { expensesApi } from '../services/expensesApi';
import { purchasesApi } from '../services/purchasesApi';
import { paymentsApi } from '../services/paymentsApi';

export async function quickSchemaTest() {
  console.log('🧪 Quick Schema Verification Test...');
  console.log('==========================================');
  
  const results = {
    employees: { success: false, count: 0, error: null },
    salaryPayments: { success: false, count: 0, error: null },
    expenses: { success: false, count: 0, error: null },
    purchases: { success: false, count: 0, error: null },
    payments: { success: false, count: 0, error: null }
  };

  // Test Employees API
  try {
    console.log('👥 Testing Employees...');
    const employees = await employeeApi.getEmployees();
    results.employees.success = true;
    results.employees.count = employees.length;
    console.log(`  ✅ Found ${employees.length} employees`);
    
    // Show sample employee data
    if (employees.length > 0) {
      console.log(`  📋 Sample employee: ${employees[0].first_name} ${employees[0].last_name} (${employees[0].employee_code})`);
    }
  } catch (error: any) {
    console.log(`  ❌ Employees API failed: ${error.message}`);
    results.employees.error = error.message;
  }

  // Test Salary Payments API
  try {
    console.log('💰 Testing Salary Payments...');
    const payments = await payrollApi.getSalaryPayments();
    results.salaryPayments.success = true;
    results.salaryPayments.count = payments.length;
    console.log(`  ✅ Found ${payments.length} salary payments`);
  } catch (error: any) {
    console.log(`  ❌ Salary Payments API failed: ${error.message}`);
    results.salaryPayments.error = error.message;
  }

  // Test Expenses API
  try {
    console.log('💸 Testing Expenses...');
    const expenses = await expensesApi.getExpenses();
    results.expenses.success = true;
    results.expenses.count = expenses.length;
    console.log(`  ✅ Found ${expenses.length} expenses`);
  } catch (error: any) {
    console.log(`  ❌ Expenses API failed: ${error.message}`);
    results.expenses.error = error.message;
  }

  // Test Purchases API
  try {
    console.log('🛒 Testing Purchases...');
    const purchases = await purchasesApi.getPurchases();
    results.purchases.success = true;
    results.purchases.count = purchases.length;
    console.log(`  ✅ Found ${purchases.length} purchases`);
  } catch (error: any) {
    console.log(`  ❌ Purchases API failed: ${error.message}`);
    results.purchases.error = error.message;
  }

  // Test Payments API
  try {
    console.log('💳 Testing Payments...');
    const payments = await paymentsApi.getPayments();
    results.payments.success = true;
    results.payments.count = payments.length;
    console.log(`  ✅ Found ${payments.length} payments`);
  } catch (error: any) {
    console.log(`  ❌ Payments API failed: ${error.message}`);
    results.payments.error = error.message;
  }

  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('==========================================');
  
  const totalTests = Object.keys(results).length;
  const successfulTests = Object.values(results).filter(r => r.success).length;
  
  console.log(`✅ Successful: ${successfulTests}/${totalTests} APIs working`);
  
  if (successfulTests === totalTests) {
    console.log('🎉 All APIs are working perfectly!');
    console.log('🚀 Ready to proceed with frontend UI implementation');
  } else {
    console.log('⚠️  Some APIs need attention');
    Object.entries(results).forEach(([api, result]) => {
      if (!result.success && result.error) {
        console.log(`   ${api}: ${result.error}`);
      }
    });
  }

  return results;
}

// Test individual CRUD operations
export async function testEmployeeCRUD() {
  console.log('🔧 Testing Employee CRUD Operations...');
  
  try {
    // Test creating an employee
    const newEmployee = await employeeApi.createEmployee({
      first_name: 'Test',
      last_name: 'Employee',
      email: 'test@example.com',
      department: 'IT',
      designation: 'Developer',
      employment_type: 'FULL_TIME',
      base_salary: 60000
    });
    
    console.log('✅ Created employee:', newEmployee.employee_code);
    
    // Test updating the employee
    const updatedEmployee = await employeeApi.updateEmployee(newEmployee.id, {
      phone: '9876543210'
    });
    
    console.log('✅ Updated employee phone:', updatedEmployee.phone);
    
    // Test getting the employee
    const fetchedEmployee = await employeeApi.getEmployee(newEmployee.id);
    console.log('✅ Fetched employee:', fetchedEmployee.first_name, fetchedEmployee.last_name);
    
    // Clean up - delete the test employee
    await employeeApi.deleteEmployee(newEmployee.id);
    console.log('✅ Deleted test employee');
    
    return { success: true, message: 'Employee CRUD operations working perfectly' };
  } catch (error: any) {
    console.error('❌ Employee CRUD test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Test creating sample data
export async function createSampleData() {
  console.log('🌱 Creating Sample Data...');
  
  try {
    // Create a few more employees for testing
    const employees = [
      {
        employee_code: 'EMP2001',
        first_name: 'Alice',
        last_name: 'Johnson',
        email: 'alice@company.com',
        department: 'Finance',
        designation: 'Accountant',
        employment_type: 'FULL_TIME' as const,
        base_salary: 40000
      },
      {
        employee_code: 'EMP2002',
        first_name: 'Bob',
        last_name: 'Wilson',
        email: 'bob@company.com',
        department: 'Operations',
        designation: 'Manager',
        employment_type: 'FULL_TIME' as const,
        base_salary: 55000
      }
    ];

    const createdEmployees = [];
    for (const emp of employees) {
      try {
        const created = await employeeApi.createEmployee(emp);
        createdEmployees.push(created);
        console.log(`✅ Created employee: ${created.employee_code} - ${created.first_name} ${created.last_name}`);
      } catch (error: any) {
        if (error.message.includes('duplicate key value')) {
          console.log(`⏭️  Employee ${emp.employee_code} already exists, skipping`);
        } else {
          console.log(`❌ Failed to create ${emp.employee_code}: ${error.message}`);
        }
      }
    }

    // Create a sample salary payment if we have employees
    if (createdEmployees.length > 0) {
      const samplePayment = await payrollApi.createSalaryPayment({
        employee_id: createdEmployees[0].id,
        payment_period_start: '2024-01-01',
        payment_period_end: '2024-01-31',
        base_amount: createdEmployees[0].base_salary,
        payment_method: 'BANK_TRANSFER'
      });
      console.log(`✅ Created sample salary payment: ${samplePayment.id}`);
    }

    console.log('🎉 Sample data created successfully!');
    return { success: true, employees: createdEmployees };
  } catch (error: any) {
    console.error('❌ Sample data creation failed:', error);
    return { success: false, error: error.message };
  }
}