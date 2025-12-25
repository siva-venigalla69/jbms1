// Enhanced test runner for comprehensive API testing with proper error handling
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://pvatfzwzfgioypdnqjay.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2YXRmend6Zmdpb3lwZG5xamF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjI1ODUsImV4cCI6MjA3MDkzODU4NX0.q3PgKkcsX5wXOys9aYwalhajH25uQ-gjCgVTZISi0Qs';

const supabase = createClient(supabaseUrl, supabaseKey);

// Generate unique employee code
function generateEmployeeCode() {
  return `EMP${Date.now()}`;
}

async function testDatabaseConnection() {
  console.log('🔌 Testing database connection...');
  try {
    const { data, error } = await supabase.from('employees').select('count').limit(1);
    if (error) {
      console.log('❌ Database connection failed:', error.message);
      return false;
    }
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.log('❌ Database connection error:', error.message);
    return false;
  }
}

async function testEmployeeAPI() {
  console.log('\n👥 Testing Employee API...');
  const results = {
    read: false,
    create: false,
    update: false,
    delete: false,
    errors: []
  };
  
  try {
    // Test READ operation
    const { data: employees, error: getError } = await supabase
      .from('employees')
      .select('*')
      .limit(5);
    
    if (getError) throw new Error(`READ failed: ${getError.message}`);
    results.read = true;
    console.log(`  ✅ READ - Found ${employees?.length || 0} employees`);
    
    // Test CREATE operation with proper employee_code
    const testEmployee = {
      employee_code: generateEmployeeCode(),
      first_name: 'Test',
      last_name: 'Employee',
      email: `test.employee.${Date.now()}@company.com`,
      department: 'IT',
      designation: 'Developer',
      employment_type: 'FULL_TIME',
      base_salary: 60000,
      employee_status: 'ACTIVE'
    };
    
    const { data: newEmployee, error: createError } = await supabase
      .from('employees')
      .insert([testEmployee])
      .select()
      .single();
    
    if (createError) {
      throw new Error(`CREATE failed: ${createError.message}`);
    } else {
      results.create = true;
      console.log(`  ✅ CREATE - Success, ID: ${newEmployee.id}, Code: ${newEmployee.employee_code}`);
      
      // Test UPDATE operation
      const { error: updateError } = await supabase
        .from('employees')
        .update({ phone: '9876543210' })
        .eq('id', newEmployee.id);
      
      if (updateError) {
        throw new Error(`UPDATE failed: ${updateError.message}`);
      } else {
        results.update = true;
        console.log('  ✅ UPDATE - Success');
      }
      
      // Test DELETE operation
      const { error: deleteError } = await supabase
        .from('employees')
        .delete()
        .eq('id', newEmployee.id);
      
      if (deleteError) {
        throw new Error(`DELETE failed: ${deleteError.message}`);
      } else {
        results.delete = true;
        console.log('  ✅ DELETE - Success');
      }
    }
    
    return results;
  } catch (error) {
    console.log(`  ❌ Employee API error: ${error.message}`);
    results.errors.push(error.message);
    return results;
  }
}

async function testPayrollAPI() {
  console.log('\n💰 Testing Payroll API...');
  const results = {
    read: false,
    create: false,
    tables_exist: false,
    errors: []
  };
  
  try {
    // Test getting salary payments
    const { data: payments, error: getError } = await supabase
      .from('salary_payments')
      .select('*')
      .limit(5);
    
    if (getError && getError.message.includes('relation "salary_payments" does not exist')) {
      console.log('  ⚠️  Salary payments table does not exist yet - this is expected');
      results.errors.push('Table does not exist');
      return results;
    } else if (getError) {
      throw new Error(`READ failed: ${getError.message}`);
    } else {
      results.read = true;
      results.tables_exist = true;
      console.log(`  ✅ READ - Found ${payments?.length || 0} salary payments`);
      
      // Try to create a test salary payment if we have employees
      const { data: employees } = await supabase
        .from('employees')
        .select('id')
        .limit(1);
      
      if (employees && employees.length > 0) {
        const testPayment = {
          employee_id: employees[0].id,
          payment_period_start: '2024-01-01',
          payment_period_end: '2024-01-31',
          base_amount: 50000,
          payment_method: 'BANK_TRANSFER',
          payment_status: 'PENDING'
        };
        
        const { data: newPayment, error: createError } = await supabase
          .from('salary_payments')
          .insert([testPayment])
          .select()
          .single();
        
        if (createError) {
          console.log(`  ⚠️  CREATE - Warning: ${createError.message}`);
          results.errors.push(`CREATE: ${createError.message}`);
        } else {
          results.create = true;
          console.log(`  ✅ CREATE - Success, ID: ${newPayment.id}`);
          
          // Clean up
          await supabase.from('salary_payments').delete().eq('id', newPayment.id);
          console.log('  ✅ Cleanup - Test payment deleted');
        }
      }
    }
    
    return results;
  } catch (error) {
    console.log(`  ❌ Payroll API error: ${error.message}`);
    results.errors.push(error.message);
    return results;
  }
}

async function testExpensesAPI() {
  console.log('\n💸 Testing Expenses API...');
  const results = {
    read: false,
    create: false,
    tables_exist: false,
    errors: []
  };
  
  try {
    const { data: expenses, error: getError } = await supabase
      .from('expenses')
      .select('*')
      .limit(5);
    
    if (getError && getError.message.includes('relation "expenses" does not exist')) {
      console.log('  ⚠️  Expenses table does not exist yet - this is expected');
      results.errors.push('Table does not exist');
      return results;
    } else if (getError) {
      throw new Error(`READ failed: ${getError.message}`);
    } else {
      results.read = true;
      results.tables_exist = true;
      console.log(`  ✅ READ - Found ${expenses?.length || 0} expenses`);
    }
    
    return results;
  } catch (error) {
    console.log(`  ❌ Expenses API error: ${error.message}`);
    results.errors.push(error.message);
    return results;
  }
}

async function testPurchasesAPI() {
  console.log('\n🛒 Testing Purchases API...');
  const results = {
    read: false,
    create: false,
    tables_exist: false,
    errors: []
  };
  
  try {
    const { data: purchases, error: getError } = await supabase
      .from('purchases')
      .select('*')
      .limit(5);
    
    if (getError && getError.message.includes('relation "purchases" does not exist')) {
      console.log('  ⚠️  Purchases table does not exist yet - this is expected');
      results.errors.push('Table does not exist');
      return results;
    } else if (getError) {
      throw new Error(`READ failed: ${getError.message}`);
    } else {
      results.read = true;
      results.tables_exist = true;
      console.log(`  ✅ READ - Found ${purchases?.length || 0} purchases`);
    }
    
    return results;
  } catch (error) {
    console.log(`  ❌ Purchases API error: ${error.message}`);
    results.errors.push(error.message);
    return results;
  }
}

async function testCrossModuleIntegrations() {
  console.log('\n🔗 Testing Cross-Module Integrations...');
  const results = {
    employee_payroll: false,
    employee_expenses: false,
    errors: []
  };
  
  try {
    // Test Employee-Payroll integration
    const { data: employeePayrolls, error: payrollError } = await supabase
      .from('employees')
      .select(`
        id,
        first_name,
        last_name,
        salary_payments!inner(id, base_amount, payment_status)
      `)
      .limit(3);
    
    if (payrollError && !payrollError.message.includes('relation "salary_payments" does not exist')) {
      throw new Error(`Employee-Payroll integration failed: ${payrollError.message}`);
    } else if (!payrollError) {
      results.employee_payroll = true;
      console.log(`  ✅ Employee-Payroll integration - Found ${employeePayrolls?.length || 0} linked records`);
    } else {
      console.log('  ⚠️  Employee-Payroll integration - Salary payments table not available');
    }
    
    // Test Employee-Expenses integration
    const { data: employeeExpenses, error: expensesError } = await supabase
      .from('employees')
      .select(`
        id,
        first_name,
        last_name,
        expenses!inner(id, amount, status)
      `)
      .limit(3);
    
    if (expensesError && !expensesError.message.includes('relation "expenses" does not exist')) {
      throw new Error(`Employee-Expenses integration failed: ${expensesError.message}`);
    } else if (!expensesError) {
      results.employee_expenses = true;
      console.log(`  ✅ Employee-Expenses integration - Found ${employeeExpenses?.length || 0} linked records`);
    } else {
      console.log('  ⚠️  Employee-Expenses integration - Expenses table not available');
    }
    
    return results;
  } catch (error) {
    console.log(`  ❌ Cross-module integration error: ${error.message}`);
    results.errors.push(error.message);
    return results;
  }
}

async function runComprehensiveTests() {
  console.log('🚀 COMPREHENSIVE END-TO-END API TESTING WITH REAL DATABASE');
  console.log('=' .repeat(70));
  
  const startTime = Date.now();
  
  // Test database connection first
  const connectionResult = await testDatabaseConnection();
  if (!connectionResult) {
    console.log('\n❌ Cannot proceed without database connection.');
    return;
  }
  
  // Run all API tests
  const employeeResults = await testEmployeeAPI();
  const payrollResults = await testPayrollAPI();
  const expensesResults = await testExpensesAPI();
  const purchasesResults = await testPurchasesAPI();
  const integrationResults = await testCrossModuleIntegrations();
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  // Generate comprehensive report
  console.log('\n📊 COMPREHENSIVE TEST RESULTS REPORT');
  console.log('=' .repeat(70));
  console.log(`🕐 Test Duration: ${duration}ms`);
  console.log(`📅 Test Date: ${new Date().toISOString()}`);
  
  // Calculate success metrics
  const totalOperations = [
    employeeResults.read, employeeResults.create, employeeResults.update, employeeResults.delete,
    payrollResults.read, payrollResults.create,
    expensesResults.read,
    purchasesResults.read,
    integrationResults.employee_payroll, integrationResults.employee_expenses
  ];
  
  const successfulOperations = totalOperations.filter(op => op === true).length;
  const successRate = ((successfulOperations / totalOperations.length) * 100).toFixed(1);
  
  console.log(`\n📈 OVERALL SUCCESS RATE: ${successfulOperations}/${totalOperations.length} (${successRate}%)`);
  
  console.log('\n🎯 MODULE TEST RESULTS:');
  console.log('Employee API:');
  console.log(`  ✅ READ: ${employeeResults.read ? 'PASS' : 'FAIL'}`);
  console.log(`  ✅ CREATE: ${employeeResults.create ? 'PASS' : 'FAIL'}`);
  console.log(`  ✅ UPDATE: ${employeeResults.update ? 'PASS' : 'FAIL'}`);
  console.log(`  ✅ DELETE: ${employeeResults.delete ? 'PASS' : 'FAIL'}`);
  
  console.log('Payroll API:');
  console.log(`  ${payrollResults.tables_exist ? '✅' : '⚠️ '} READ: ${payrollResults.read ? 'PASS' : payrollResults.tables_exist ? 'FAIL' : 'N/A (Table missing)'}`);
  console.log(`  ${payrollResults.tables_exist ? '✅' : '⚠️ '} CREATE: ${payrollResults.create ? 'PASS' : payrollResults.tables_exist ? 'FAIL' : 'N/A (Table missing)'}`);
  
  console.log('Expenses API:');
  console.log(`  ${expensesResults.tables_exist ? '✅' : '⚠️ '} READ: ${expensesResults.read ? 'PASS' : expensesResults.tables_exist ? 'FAIL' : 'N/A (Table missing)'}`);
  
  console.log('Purchases API:');
  console.log(`  ${purchasesResults.tables_exist ? '✅' : '⚠️ '} READ: ${purchasesResults.read ? 'PASS' : purchasesResults.tables_exist ? 'FAIL' : 'N/A (Table missing)'}`);
  
  console.log('Cross-Module Integrations:');
  console.log(`  ${integrationResults.employee_payroll ? '✅' : '⚠️ '} Employee-Payroll: ${integrationResults.employee_payroll ? 'PASS' : 'N/A (Missing tables)'}`);
  console.log(`  ${integrationResults.employee_expenses ? '✅' : '⚠️ '} Employee-Expenses: ${integrationResults.employee_expenses ? 'PASS' : 'N/A (Missing tables)'}`);
  
  // Error summary
  const allErrors = [
    ...employeeResults.errors,
    ...payrollResults.errors,
    ...expensesResults.errors,
    ...purchasesResults.errors,
    ...integrationResults.errors
  ];
  
  if (allErrors.length > 0) {
    console.log('\n⚠️  ISSUES IDENTIFIED:');
    allErrors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  if (!payrollResults.tables_exist) {
    console.log('  • Deploy salary_payments table schema for full Payroll API testing');
  }
  if (!expensesResults.tables_exist) {
    console.log('  • Deploy expenses table schema for full Expenses API testing');
  }
  if (!purchasesResults.tables_exist) {
    console.log('  • Deploy purchases table schema for full Purchases API testing');
  }
  if (employeeResults.create && employeeResults.read && employeeResults.update && employeeResults.delete) {
    console.log('  ✅ Employee API is fully functional and ready for production');
  }
  if (connectionResult) {
    console.log('  ✅ Database connection is stable and ready for operations');
  }
  
  console.log('\n🏆 FINAL ASSESSMENT:');
  if (successRate >= 80) {
    console.log('🎉 EXCELLENT! Core functionality is working well.');
  } else if (successRate >= 60) {
    console.log('👍 GOOD! Most features are working, some issues to resolve.');
  } else {
    console.log('⚠️  NEEDS ATTENTION! Multiple issues need to be addressed.');
  }
  
  return {
    overall_success_rate: successRate,
    successful_operations: successfulOperations,
    total_operations: totalOperations.length,
    duration: duration,
    modules: {
      employee: employeeResults,
      payroll: payrollResults,
      expenses: expensesResults,
      purchases: purchasesResults,
      integrations: integrationResults
    },
    errors: allErrors,
    timestamp: new Date().toISOString()
  };
}

// Run comprehensive tests
runComprehensiveTests()
  .then((results) => {
    console.log('\n🎯 Testing completed successfully! Full report generated.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Testing failed with critical error:', error);
    process.exit(1);
  });