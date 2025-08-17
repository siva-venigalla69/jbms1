# 🔧 Manual API Testing Guide

**Test Your Digital Textile Printing System APIs Manually**

---

## 🎯 **Quick Setup**

### **Prerequisites**
- Browser with developer tools (Chrome/Firefox recommended)
- Text editor (for JSON payloads)
- Your environment variables ready

### **Environment Details**
```javascript
// Your Supabase Configuration
const SUPABASE_URL = 'your_supabase_url_here'
const SUPABASE_ANON_KEY = 'your_anon_key_from_env_file'

// Test User Credentials
const TEST_EMAIL = 'your_admin_email@example.com'
const TEST_PASSWORD = 'your_admin_password'
```

---

## 🌐 **Method 1: Browser Console Testing (Recommended)**

### **Step 1: Setup Supabase Client in Browser**

1. **Open your browser** and go to any webpage
2. **Open Developer Tools** (F12)
3. **Go to Console tab**
4. **Load Supabase client**:

```javascript
// Load Supabase (paste this in console)
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
document.head.appendChild(script);

// Wait a moment, then create client
const supabase = window.supabase.createClient(
  'your_supabase_url_here',
  'your_anon_key_here'
);

console.log('✅ Supabase client ready!');
```

### **Step 2: Test Authentication**

```javascript
// Test 1: Login
const loginTest = async () => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'your_admin_email@example.com',
    password: 'your_admin_password'
  });
  
  if (error) {
    console.error('❌ Login failed:', error.message);
  } else {
    console.log('✅ Login successful:', data.user.email);
    console.log('🔑 User ID:', data.user.id);
  }
  return data;
};

// Run login test
await loginTest();
```

```javascript
// Test 2: Get User Profile
const profileTest = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (error) {
      console.error('❌ Profile fetch failed:', error.message);
    } else {
      console.log('✅ Profile retrieved:', profile);
      console.log('👤 Role:', profile.role);
      console.log('📛 Username:', profile.username);
    }
  }
};

await profileTest();
```

### **Step 3: Test Customer Management**

```javascript
// Test 3: Create Customer
const createCustomerTest = async () => {
  const uniquePhone = `9${Date.now().toString().slice(-9)}`;
  const customerData = {
    name: `Test Customer ${Date.now()}`,
    phone: uniquePhone,
    email: `test${Date.now()}@example.com`,
    address: '123 Test Street, Test City',
    gst_number: `TEST${Date.now().toString().slice(-9)}`
  };
  
  const { data, error } = await supabase
    .from('customers')
    .insert(customerData)
    .select()
    .single();
  
  if (error) {
    console.error('❌ Customer creation failed:', error.message);
  } else {
    console.log('✅ Customer created:', data);
    window.testCustomerId = data.id; // Save for next tests
    return data;
  }
};

await createCustomerTest();
```

```javascript
// Test 4: Get All Customers
const getCustomersTest = async () => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('❌ Get customers failed:', error.message);
  } else {
    console.log('✅ Customers retrieved:', data.length, 'customers');
    console.table(data.map(c => ({ 
      name: c.name, 
      phone: c.phone, 
      email: c.email 
    })));
  }
};

await getCustomersTest();
```

```javascript
// Test 5: Search Customers
const searchCustomersTest = async () => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .ilike('name', '%Test%')
    .eq('is_deleted', false);
  
  if (error) {
    console.error('❌ Customer search failed:', error.message);
  } else {
    console.log('✅ Search results:', data.length, 'customers found');
    data.forEach(c => console.log(`📍 ${c.name} - ${c.phone}`));
  }
};

await searchCustomersTest();
```

### **Step 4: Test Order Management**

```javascript
// Test 6: Create Order
const createOrderTest = async () => {
  if (!window.testCustomerId) {
    console.error('❌ No customer ID available. Run createCustomerTest() first.');
    return;
  }
  
  const orderData = {
    order_number: `ORD-TEST-${Date.now()}`,
    customer_id: window.testCustomerId,
    status: 'pending',
    total_amount: 5000.00,
    notes: 'Manual API test order'
  };
  
  const { data, error } = await supabase
    .from('orders')
    .insert(orderData)
    .select(`
      *,
      customers (name, phone)
    `)
    .single();
  
  if (error) {
    console.error('❌ Order creation failed:', error.message);
  } else {
    console.log('✅ Order created:', data);
    window.testOrderId = data.id; // Save for next tests
    return data;
  }
};

await createOrderTest();
```

```javascript
// Test 7: Add Order Items
const addOrderItemsTest = async () => {
  if (!window.testOrderId) {
    console.error('❌ No order ID available. Run createOrderTest() first.');
    return;
  }
  
  const orderItems = [
    {
      order_id: window.testOrderId,
      material_type: 'saree',
      quantity: 3,
      unit_price: 1500.00,
      customization_details: 'Red saree with gold work'
    },
    {
      order_id: window.testOrderId,
      material_type: 'dupatta',
      quantity: 2,
      unit_price: 500.00,
      customization_details: 'Matching dupatta'
    }
  ];
  
  const { data, error } = await supabase
    .from('order_items')
    .insert(orderItems)
    .select(`
      *,
      material_types (name),
      production_stages (name)
    `);
  
  if (error) {
    console.error('❌ Order items creation failed:', error.message);
  } else {
    console.log('✅ Order items added:', data.length, 'items');
    console.table(data.map(item => ({
      material: item.material_type,
      quantity: item.quantity,
      price: item.unit_price,
      stage: item.production_stage
    })));
    window.testOrderItemIds = data.map(item => item.id);
  }
};

await addOrderItemsTest();
```

### **Step 5: Test Production Management**

```javascript
// Test 8: Update Production Stage
const updateProductionStageTest = async () => {
  if (!window.testOrderItemIds || window.testOrderItemIds.length === 0) {
    console.error('❌ No order item IDs available. Run addOrderItemsTest() first.');
    return;
  }
  
  const stages = ['pre_treatment', 'printing', 'post_process'];
  
  for (const stage of stages) {
    const { data, error } = await supabase
      .from('order_items')
      .update({
        production_stage: stage,
        stage_completed_at: new Date().toISOString()
      })
      .eq('id', window.testOrderItemIds[0]) // Update first item
      .select(`
        *,
        production_stages (name, sequence_order)
      `)
      .single();
    
    if (error) {
      console.error(`❌ Stage update to ${stage} failed:`, error.message);
    } else {
      console.log(`✅ Updated to ${stage}:`, data.production_stage);
    }
    
    // Wait 1 second between updates
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
};

await updateProductionStageTest();
```

### **Step 6: Test Financial Operations**

```javascript
// Test 9: Create GST Invoice
const createInvoiceTest = async () => {
  if (!window.testCustomerId) {
    console.error('❌ No customer ID available.');
    return;
  }
  
  const invoiceData = {
    invoice_number: `INV-TEST-${Date.now()}`,
    customer_id: window.testCustomerId,
    total_amount: 5000.00,
    cgst_rate: 9.00,
    sgst_rate: 9.00,
    cgst_amount: 450.00,
    sgst_amount: 450.00,
    outstanding_amount: 5900.00
  };
  
  const { data, error } = await supabase
    .from('gst_invoices')
    .insert(invoiceData)
    .select(`
      *,
      customers (name, phone, gst_number)
    `)
    .single();
  
  if (error) {
    console.error('❌ Invoice creation failed:', error.message);
  } else {
    console.log('✅ Invoice created:', data);
    window.testInvoiceId = data.id;
    return data;
  }
};

await createInvoiceTest();
```

```javascript
// Test 10: Record Payment
const recordPaymentTest = async () => {
  if (!window.testInvoiceId) {
    console.error('❌ No invoice ID available. Run createInvoiceTest() first.');
    return;
  }
  
  const paymentData = {
    invoice_id: window.testInvoiceId,
    payment_amount: 3000.00,
    payment_method: 'upi',
    reference_number: `UPI${Date.now()}`,
    notes: 'Manual test payment'
  };
  
  const { data, error } = await supabase
    .from('payments')
    .insert(paymentData)
    .select(`
      *,
      payment_methods (name),
      gst_invoices (invoice_number, total_amount)
    `)
    .single();
  
  if (error) {
    console.error('❌ Payment recording failed:', error.message);
  } else {
    console.log('✅ Payment recorded:', data);
    console.log('💰 Amount:', `₹${data.payment_amount}`);
    console.log('💳 Method:', data.payment_method);
  }
};

await recordPaymentTest();
```

### **Step 7: Test Reporting Queries**

```javascript
// Test 11: Customer Summary Report
const customerSummaryTest = async () => {
  const { data, error } = await supabase
    .from('customers')
    .select(`
      id,
      name,
      phone,
      email,
      orders (
        order_number,
        status,
        total_amount,
        order_date,
        order_items (
          material_type,
          quantity,
          unit_price,
          production_stage
        )
      )
    `)
    .eq('is_deleted', false)
    .limit(5);
  
  if (error) {
    console.error('❌ Customer summary failed:', error.message);
  } else {
    console.log('✅ Customer summary:', data.length, 'customers');
    data.forEach(customer => {
      console.log(`👤 ${customer.name}:`);
      console.log(`   📞 ${customer.phone}`);
      console.log(`   📦 ${customer.orders.length} orders`);
      
      customer.orders.forEach(order => {
        console.log(`   📋 ${order.order_number} - ${order.status} - ₹${order.total_amount}`);
      });
    });
  }
};

await customerSummaryTest();
```

```javascript
// Test 12: Production Dashboard
const productionDashboardTest = async () => {
  const { data, error } = await supabase
    .from('order_items')
    .select(`
      id,
      quantity,
      production_stage,
      stage_completed_at,
      material_type,
      material_types (name),
      production_stages (name, sequence_order),
      orders (
        order_number,
        status,
        customers (name, phone)
      )
    `)
    .order('stage_completed_at', { ascending: true, nullsFirst: true })
    .limit(10);
  
  if (error) {
    console.error('❌ Production dashboard failed:', error.message);
  } else {
    console.log('✅ Production dashboard:', data.length, 'items');
    console.table(data.map(item => ({
      order: item.orders?.order_number,
      customer: item.orders?.customers?.name,
      material: item.material_type,
      quantity: item.quantity,
      stage: item.production_stage,
      completed: item.stage_completed_at ? 'Yes' : 'No'
    })));
  }
};

await productionDashboardTest();
```

### **Step 8: Test Reference Data**

```javascript
// Test 13: Get All Reference Data
const referenceDataTest = async () => {
  const tables = [
    'user_roles',
    'order_statuses', 
    'material_types',
    'production_stages',
    'payment_methods',
    'return_reasons'
  ];
  
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('id');
    
    if (error) {
      console.error(`❌ ${table} failed:`, error.message);
    } else {
      console.log(`✅ ${table}:`, data.length, 'records');
      console.table(data);
    }
  }
};

await referenceDataTest();
```

---

## 🔧 **Method 2: Postman/Thunder Client Testing**

### **Setup Environment**

1. **Create new environment** with variables:
```json
{
  "supabase_url": "your_supabase_url_here",
  "supabase_anon_key": "your_anon_key_here",
  "auth_token": ""
}
```

### **Authentication Request**

**POST** `{{supabase_url}}/auth/v1/token?grant_type=password`

**Headers:**
```
apikey: {{supabase_anon_key}}
Content-Type: application/json
```

**Body:**
```json
{
  "email": "your_admin_email@example.com",
  "password": "your_admin_password"
}
```

**Test Script (save token):**
```javascript
if (pm.response.code === 200) {
  const response = pm.response.json();
  pm.environment.set("auth_token", response.access_token);
}
```

### **Customer Management Requests**

#### **GET All Customers**
**GET** `{{supabase_url}}/rest/v1/customers?is_deleted=eq.false&order=created_at.desc&limit=10`

**Headers:**
```
apikey: {{supabase_anon_key}}
Authorization: Bearer {{auth_token}}
```

#### **POST Create Customer**
**POST** `{{supabase_url}}/rest/v1/customers`

**Headers:**
```
apikey: {{supabase_anon_key}}
Authorization: Bearer {{auth_token}}
Content-Type: application/json
Prefer: return=representation
```

**Body:**
```json
{
  "name": "API Test Customer",
  "phone": "9876543210",
  "email": "apitest@example.com",
  "address": "123 API Test Street",
  "gst_number": "TEST123456789"
}
```

#### **PATCH Update Customer**
**PATCH** `{{supabase_url}}/rest/v1/customers?id=eq.{{customer_id}}`

**Headers:**
```
apikey: {{supabase_anon_key}}
Authorization: Bearer {{auth_token}}
Content-Type: application/json
Prefer: return=representation
```

**Body:**
```json
{
  "name": "Updated API Test Customer",
  "address": "456 Updated Street"
}
```

### **Order Management Requests**

#### **POST Create Order**
**POST** `{{supabase_url}}/rest/v1/orders`

**Body:**
```json
{
  "order_number": "ORD-API-{{timestamp}}",
  "customer_id": "{{customer_id}}",
  "status": "pending",
  "total_amount": 5000.00,
  "notes": "API test order"
}
```

#### **GET Order with Details**
**GET** `{{supabase_url}}/rest/v1/orders?id=eq.{{order_id}}&select=*,customers(*),order_items(*,material_types(*),production_stages(*))`

---

## 🔧 **Method 3: cURL Command Line Testing**

### **Setup Environment Variables**
```bash
export SUPABASE_URL="your_supabase_url_here"
export SUPABASE_ANON_KEY="your_anon_key_here"
```

### **Login and Get Token**
```bash
# Login
AUTH_RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your_admin_email@example.com",
    "password": "your_admin_password"
  }')

# Extract token
AUTH_TOKEN=$(echo $AUTH_RESPONSE | jq -r '.access_token')
echo "Token: $AUTH_TOKEN"
```

### **Test Customer API**
```bash
# Create Customer
curl -X POST \
  "${SUPABASE_URL}/rest/v1/customers" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "name": "cURL Test Customer",
    "phone": "9999888877",
    "email": "curl@test.com"
  }'
```

```bash
# Get All Customers
curl -X GET \
  "${SUPABASE_URL}/rest/v1/customers?is_deleted=eq.false&limit=5" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
```

---

## 📊 **Manual Testing Checklist**

### **Authentication Tests**
- [ ] ✅ Login with valid credentials
- [ ] ❌ Login with invalid credentials (should fail)
- [ ] ✅ Get user session
- [ ] ✅ Get user profile
- [ ] ✅ Logout

### **Customer Management Tests**
- [ ] ✅ Create customer with complete data
- [ ] ✅ Create customer with minimal data
- [ ] ❌ Create customer with duplicate phone (should fail)
- [ ] ✅ Get all customers
- [ ] ✅ Search customers by name
- [ ] ✅ Update customer information
- [ ] ✅ Soft delete customer

### **Order Management Tests**
- [ ] ✅ Create new order
- [ ] ✅ Add order items
- [ ] ✅ Update order status
- [ ] ✅ Get order with full details
- [ ] ✅ Update production stages

### **Financial Operations Tests**
- [ ] ✅ Create delivery challan
- [ ] ✅ Create GST invoice
- [ ] ✅ Record payment
- [ ] ✅ Update outstanding amount

### **Reporting Tests**
- [ ] ✅ Customer summary report
- [ ] ✅ Production dashboard
- [ ] ✅ Financial summary
- [ ] ✅ Material flow report

### **Reference Data Tests**
- [ ] ✅ Get user roles
- [ ] ✅ Get order statuses
- [ ] ✅ Get material types
- [ ] ✅ Get production stages
- [ ] ✅ Get payment methods

---

## 🎯 **Expected Results**

### **✅ Success Indicators**
- All API calls return HTTP 200/201 status
- JSON responses contain expected data structure
- Authentication works and returns valid tokens
- CRUD operations complete successfully
- Complex queries return proper joined data

### **❌ Expected Failures (Security Working)**
- Invalid login credentials rejected
- Unauthenticated requests blocked
- Duplicate constraints enforced
- Invalid data formats rejected
- Missing required fields prevented

---

## 🔧 **Troubleshooting Common Issues**

### **Authentication Issues**
```javascript
// Check if logged in
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session ? 'Active' : 'None');

// Re-login if needed
if (!session) {
  await loginTest();
}
```

### **Permission Issues**
```javascript
// Check user role
const { data: profile } = await supabase
  .from('user_profiles')
  .select('role')
  .single();
console.log('User role:', profile?.role);
```

### **Data Constraints**
```javascript
// Check for unique constraints
const { data: existing } = await supabase
  .from('customers')
  .select('phone')
  .eq('phone', 'your_test_phone');
  
if (existing.length > 0) {
  console.log('⚠️  Phone number already exists');
}
```

---

## 🎉 **Manual Testing Complete!**

After running through these tests, you should have verified:

- ✅ **Authentication system** working
- ✅ **All CRUD operations** functional  
- ✅ **Business workflows** complete
- ✅ **Data integrity** enforced
- ✅ **Performance** acceptable
- ✅ **Security** properly implemented

**Your backend is ready for frontend integration!** 🚀