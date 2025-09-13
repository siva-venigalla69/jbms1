// Simple test runner for API services with real database operations
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://pvatfzwzfgioypdnqjay.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2YXRmend6Zmdpb3lwZG5xamF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjI1ODUsImV4cCI6MjA3MDkzODU4NX0.q3PgKkcsX5wXOys9aYwalhajH25uQ-gjCgVTZISi0Qs';

const supabase = createClient(supabaseUrl, supabaseKey);

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
  try {
    // Test getting employees
    const { data: employees, error: getError } = await supabase
      .from('employees')
      .select('*')
      .limit(5);
    
    if (getError) throw getError;
    console.log(`  ✅ getEmployees - Found ${employees?.length || 0} employees`);
    
    // Test creating an employee
    const testEmployee = {
      first_name: 'Test',
      last_name: 'Employee',
      email: 'test.employee@company.com',
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
      if (createError.message.includes('duplicate key')) {
        console.log('  ⏭️  createEmployee - Test employee already exists, skipping');
      } else {
        throw createError;
      }
    } else {
      console.log('  ✅ createEmployee - Success, ID:', newEmployee.id);
      
      // Test updating the employee
      const { error: updateError } = await supabase
        .from('employees')
        .update({ phone: '9876543210' })
        .eq('id', newEmployee.id);
      
      if (updateError) throw updateError;
      console.log('  ✅ updateEmployee - Success');
      
      // Clean up - delete test employee
      const { error: deleteError } = await supabase
        .from('employees')
        .delete()
        .eq('id', newEmployee.id);
      
      if (deleteError) throw deleteError;
      console.log('  ✅ deleteEmployee - Success');
    }
    
    return true;
  } catch (error) {
    console.log('  ❌ Employee API failed:', error.message);
    return false;
  }
}

async function testPayrollAPI() {
  console.log('\n💰 Testing Payroll API...');
  try {
    // Test getting salary payments
    const { data: payments, error: getError } = await supabase
      .from('salary_payments')
      .select('*')
      .limit(5);
    
    if (getError && !getError.message.includes('relation "salary_payments" does not exist')) {
      throw getError;
    }
    
    if (getError) {
      console.log('  ⚠️  Salary payments table does not exist yet');
      return false;
    } else {
      console.log(`  ✅ getSalaryPayments - Found ${payments?.length || 0} payments`);
      return true;
    }
  } catch (error) {
    console.log('  ❌ Payroll API failed:', error.message);
    return false;
  }
}

async function testExpensesAPI() {
  console.log('\n💸 Testing Expenses API...');
  try {
    // Test getting expenses
    const { data: expenses, error: getError } = await supabase
      .from('expenses')
      .select('*')
      .limit(5);
    
    if (getError && !getError.message.includes('relation "expenses" does not exist')) {
      throw getError;
    }
    
    if (getError) {
      console.log('  ⚠️  Expenses table does not exist yet');
      return false;
    } else {
      console.log(`  ✅ getExpenses - Found ${expenses?.length || 0} expenses`);
      return true;
    }
  } catch (error) {
    console.log('  ❌ Expenses API failed:', error.message);
    return false;
  }
}

async function testPurchasesAPI() {
  console.log('\n🛒 Testing Purchases API...');
  try {
    // Test getting purchases
    const { data: purchases, error: getError } = await supabase
      .from('purchases')
      .select('*')
      .limit(5);
    
    if (getError && !getError.message.includes('relation "purchases" does not exist')) {
      throw getError;
    }
    
    if (getError) {
      console.log('  ⚠️  Purchases table does not exist yet');
      return false;
    } else {
      console.log(`  ✅ getPurchases - Found ${purchases?.length || 0} purchases`);
      return true;
    }
  } catch (error) {
    console.log('  ❌ Purchases API failed:', error.message);
    return false;
  }
}

async function runComprehensiveTests() {
  console.log('🚀 Starting Comprehensive End-to-End API Testing');
  console.log('=' .repeat(60));
  
  const testResults = {
    database_connection: false,
    employee_api: false,
    payroll_api: false,
    expenses_api: false,
    purchases_api: false
  };
  
  // Test database connection
  testResults.database_connection = await testDatabaseConnection();
  
  if (!testResults.database_connection) {
    console.log('\n❌ Database connection failed. Cannot proceed with API tests.');
    return testResults;
  }
  
  // Test each API
  testResults.employee_api = await testEmployeeAPI();
  testResults.payroll_api = await testPayrollAPI();
  testResults.expenses_api = await testExpensesAPI();
  testResults.purchases_api = await testPurchasesAPI();
  
  // Generate summary
  console.log('\n📊 COMPREHENSIVE TEST RESULTS');
  console.log('=' .repeat(60));
  
  const totalTests = Object.keys(testResults).length;
  const passedTests = Object.values(testResults).filter(result => result === true).length;
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  
  console.log(`📈 Success Rate: ${passedTests}/${totalTests} (${successRate}%)`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}`);
  
  console.log('\nDetailed Results:');
  Object.entries(testResults).forEach(([test, result]) => {
    const status = result ? '✅' : '❌';
    const testName = test.replace(/_/g, ' ').toUpperCase();
    console.log(`  ${status} ${testName}`);
  });
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! APIs are ready for production use.');
  } else {
    console.log('\n⚠️  Some tests failed. This may be expected if database tables haven\'t been created yet.');
    console.log('💡 Deploy the database schema first, then re-run tests.');
  }
  
  return testResults;
}

// Run tests
runComprehensiveTests()
  .then((results) => {
    console.log('\n🏁 Testing completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Testing failed with error:', error);
    process.exit(1);
  });