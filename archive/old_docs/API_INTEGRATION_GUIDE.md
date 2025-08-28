# 🔗 API Integration Guide for Frontend

**Digital Textile Printing Management System - Frontend Integration**

---

## 🎯 **Quick Start**

### **Authentication Setup**
```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pvatfzwzfgioypdnqjay.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2YXRmend6Zmdpb3lwZG5xamF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjI1ODUsImV4cCI6MjA3MDkzODU4NX0.q3PgKkcsX5wXOys9aYwalhajH25uQ-gjCgVTZISi0Qs'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### **Login Example**
```javascript
// Login user
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'shiva.venigalla@gmail.com',
  password: 'Admin@123!'
})

// Get user profile
const { data: profile } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('id', data.user.id)
  .single()
```

---

## 📋 **Tested & Ready API Endpoints**

### **🔐 Authentication APIs**

#### **Login**
```javascript
const loginUser = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  return { data, error }
}
```

#### **Get Current User**
```javascript
const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
```

#### **Get User Profile**
```javascript
const getUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select(`
      id,
      username,
      full_name,
      role,
      phone,
      is_active,
      user_roles (name, description)
    `)
    .eq('id', userId)
    .single()
  return { data, error }
}
```

#### **Logout**
```javascript
const logoutUser = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}
```

---

### **👥 Customer Management APIs**

#### **Get All Customers**
```javascript
const getCustomers = async (limit = 50, offset = 0) => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  return { data, error }
}
```

#### **Search Customers**
```javascript
const searchCustomers = async (searchTerm) => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
    .eq('is_deleted', false)
    .order('name')
  return { data, error }
}
```

#### **Create Customer**
```javascript
const createCustomer = async (customerData) => {
  const { data, error } = await supabase
    .from('customers')
    .insert({
      name: customerData.name,
      phone: customerData.phone,
      email: customerData.email,
      address: customerData.address,
      gst_number: customerData.gst_number
    })
    .select()
    .single()
  return { data, error }
}
```

#### **Update Customer**
```javascript
const updateCustomer = async (customerId, updateData) => {
  const { data, error } = await supabase
    .from('customers')
    .update(updateData)
    .eq('id', customerId)
    .select()
    .single()
  return { data, error }
}
```

#### **Delete Customer (Soft Delete)**
```javascript
const deleteCustomer = async (customerId) => {
  const { data, error } = await supabase
    .from('customers')
    .update({ is_deleted: true })
    .eq('id', customerId)
    .select()
    .single()
  return { data, error }
}
```

#### **Get Customer with Orders**
```javascript
const getCustomerWithOrders = async (customerId) => {
  const { data, error } = await supabase
    .from('customers')
    .select(`
      *,
      orders (
        id,
        order_number,
        status,
        total_amount,
        order_date,
        order_items (
          id,
          material_type,
          quantity,
          unit_price,
          production_stage,
          material_types (name),
          production_stages (name)
        )
      )
    `)
    .eq('id', customerId)
    .single()
  return { data, error }
}
```

---

### **📦 Order Management APIs**

#### **Get All Orders**
```javascript
const getOrders = async (status = null, limit = 50) => {
  let query = supabase
    .from('orders')
    .select(`
      *,
      customers (name, phone),
      order_statuses (name)
    `)
    .eq('is_deleted', false)
    .order('order_date', { ascending: false })
    .limit(limit)
  
  if (status) {
    query = query.eq('status', status)
  }
  
  const { data, error } = await query
  return { data, error }
}
```

#### **Create Order**
```javascript
const createOrder = async (orderData) => {
  // Generate order number
  const orderNumber = `ORD-${Date.now()}`
  
  const { data, error } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      customer_id: orderData.customer_id,
      status: 'pending',
      total_amount: orderData.total_amount || 0,
      notes: orderData.notes
    })
    .select(`
      *,
      customers (name, phone)
    `)
    .single()
  return { data, error }
}
```

#### **Add Order Items**
```javascript
const addOrderItems = async (orderId, items) => {
  const orderItems = items.map(item => ({
    order_id: orderId,
    material_type: item.material_type,
    quantity: item.quantity,
    unit_price: item.unit_price,
    customization_details: item.customization_details
  }))
  
  const { data, error } = await supabase
    .from('order_items')
    .insert(orderItems)
    .select(`
      *,
      material_types (name),
      production_stages (name)
    `)
  return { data, error }
}
```

#### **Update Order Status**
```javascript
const updateOrderStatus = async (orderId, status) => {
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select(`
      *,
      customers (name),
      order_statuses (name)
    `)
    .single()
  return { data, error }
}
```

#### **Get Order Details**
```javascript
const getOrderDetails = async (orderId) => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customers (*),
      order_statuses (name),
      order_items (
        *,
        material_types (name),
        production_stages (name, sequence_order)
      )
    `)
    .eq('id', orderId)
    .single()
  return { data, error }
}
```

---

### **🏭 Production Management APIs**

#### **Update Production Stage**
```javascript
const updateProductionStage = async (orderItemId, stage) => {
  const { data, error } = await supabase
    .from('order_items')
    .update({
      production_stage: stage,
      stage_completed_at: new Date().toISOString()
    })
    .eq('id', orderItemId)
    .select(`
      *,
      production_stages (name, sequence_order),
      orders (order_number)
    `)
    .single()
  return { data, error }
}
```

#### **Get Production Dashboard**
```javascript
const getProductionDashboard = async () => {
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
  return { data, error }
}
```

#### **Track Material In**
```javascript
const trackMaterialIn = async (materialData) => {
  const { data, error } = await supabase
    .from('material_in')
    .insert({
      customer_id: materialData.customer_id,
      order_id: materialData.order_id,
      material_type: materialData.material_type,
      quantity: materialData.quantity,
      unit: materialData.unit,
      notes: materialData.notes
    })
    .select(`
      *,
      customers (name),
      orders (order_number),
      material_types (name)
    `)
    .single()
  return { data, error }
}
```

---

### **🧾 Delivery & Invoicing APIs**

#### **Create Delivery Challan**
```javascript
const createDeliveryChallan = async (challanData) => {
  const challanNumber = `CH-${Date.now()}`
  
  const { data, error } = await supabase
    .from('delivery_challans')
    .insert({
      challan_number: challanNumber,
      customer_id: challanData.customer_id,
      total_quantity: challanData.total_quantity,
      delivery_status: 'pending',
      notes: challanData.notes
    })
    .select(`
      *,
      customers (name, phone)
    `)
    .single()
  return { data, error }
}
```

#### **Create GST Invoice**
```javascript
const createGSTInvoice = async (invoiceData) => {
  const invoiceNumber = `INV-${Date.now()}`
  
  const { data, error } = await supabase
    .from('gst_invoices')
    .insert({
      invoice_number: invoiceNumber,
      customer_id: invoiceData.customer_id,
      total_amount: invoiceData.total_amount,
      cgst_rate: invoiceData.cgst_rate || 9.00,
      sgst_rate: invoiceData.sgst_rate || 9.00,
      cgst_amount: invoiceData.cgst_amount,
      sgst_amount: invoiceData.sgst_amount,
      outstanding_amount: invoiceData.outstanding_amount
    })
    .select(`
      *,
      customers (name, phone, address, gst_number)
    `)
    .single()
  return { data, error }
}
```

#### **Record Payment**
```javascript
const recordPayment = async (paymentData) => {
  const { data, error } = await supabase
    .from('payments')
    .insert({
      invoice_id: paymentData.invoice_id,
      payment_amount: paymentData.payment_amount,
      payment_method: paymentData.payment_method,
      reference_number: paymentData.reference_number,
      notes: paymentData.notes
    })
    .select(`
      *,
      payment_methods (name),
      gst_invoices (invoice_number, total_amount)
    `)
    .single()
  return { data, error }
}
```

---

### **📊 Reporting APIs**

#### **Customer Summary Report**
```javascript
const getCustomerSummaryReport = async (dateFrom, dateTo) => {
  let query = supabase
    .from('customers')
    .select(`
      id,
      name,
      phone,
      email,
      orders (
        id,
        order_number,
        status,
        total_amount,
        order_date,
        order_items (quantity, unit_price)
      )
    `)
    .eq('is_deleted', false)
  
  if (dateFrom && dateTo) {
    query = query
      .gte('orders.order_date', dateFrom)
      .lte('orders.order_date', dateTo)
  }
  
  const { data, error } = await query
  return { data, error }
}
```

#### **Financial Summary**
```javascript
const getFinancialSummary = async (dateFrom, dateTo) => {
  let query = supabase
    .from('gst_invoices')
    .select(`
      id,
      invoice_number,
      total_amount,
      outstanding_amount,
      invoice_date,
      customers (name),
      payments (
        payment_amount,
        payment_date,
        payment_method,
        payment_methods (name)
      )
    `)
    .eq('is_deleted', false)
    .order('invoice_date', { ascending: false })
  
  if (dateFrom && dateTo) {
    query = query
      .gte('invoice_date', dateFrom)
      .lte('invoice_date', dateTo)
  }
  
  const { data, error } = await query
  return { data, error }
}
```

#### **Material Flow Report**
```javascript
const getMaterialFlowReport = async (dateFrom, dateTo) => {
  const { data: materialIn, error: inError } = await supabase
    .from('material_in')
    .select(`
      material_type,
      quantity,
      received_date,
      customers (name),
      orders (order_number),
      material_types (name)
    `)
    .gte('received_date', dateFrom)
    .lte('received_date', dateTo)
    .order('received_date', { ascending: false })
  
  const { data: materialOut, error: outError } = await supabase
    .from('material_out')
    .select(`
      material_type,
      quantity,
      dispatch_date,
      customers (name),
      material_types (name)
    `)
    .gte('dispatch_date', dateFrom)
    .lte('dispatch_date', dateTo)
    .order('dispatch_date', { ascending: false })
  
  return {
    materialIn: { data: materialIn, error: inError },
    materialOut: { data: materialOut, error: outError }
  }
}
```

---

### **📋 Reference Data APIs**

#### **Get All Reference Data**
```javascript
const getReferenceData = async () => {
  const [userRoles, orderStatuses, materialTypes, productionStages, paymentMethods, returnReasons] = await Promise.all([
    supabase.from('user_roles').select('*').order('id'),
    supabase.from('order_statuses').select('*').order('id'),
    supabase.from('material_types').select('*').order('id'),
    supabase.from('production_stages').select('*').order('sequence_order'),
    supabase.from('payment_methods').select('*').order('id'),
    supabase.from('return_reasons').select('*').order('id')
  ])
  
  return {
    userRoles: userRoles.data,
    orderStatuses: orderStatuses.data,
    materialTypes: materialTypes.data,
    productionStages: productionStages.data,
    paymentMethods: paymentMethods.data,
    returnReasons: returnReasons.data
  }
}
```

---

## 🔄 **Real-time Features**

### **Order Updates Subscription**
```javascript
const subscribeToOrderUpdates = (callback) => {
  return supabase
    .channel('orders')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'orders'
    }, callback)
    .subscribe()
}
```

### **Production Updates Subscription**
```javascript
const subscribeToProductionUpdates = (callback) => {
  return supabase
    .channel('order_items')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'order_items'
    }, callback)
    .subscribe()
}
```

---

## 🛠️ **Error Handling**

### **Standard Error Handler**
```javascript
const handleApiError = (error) => {
  if (error?.code === 'PGRST301') {
    return 'Record not found'
  } else if (error?.code === '23505') {
    return 'Duplicate entry - record already exists'
  } else if (error?.code === '23503') {
    return 'Referenced record not found'
  } else if (error?.code === '23514') {
    return 'Invalid data - check constraints'
  } else {
    return error?.message || 'An unexpected error occurred'
  }
}
```

### **Usage Example**
```javascript
const createCustomerWithErrorHandling = async (customerData) => {
  try {
    const { data, error } = await createCustomer(customerData)
    
    if (error) {
      throw new Error(handleApiError(error))
    }
    
    return data
  } catch (error) {
    console.error('Customer creation failed:', error.message)
    throw error
  }
}
```

---

## 📱 **Frontend State Management**

### **Authentication Context**
```javascript
import { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        getUserProfile(session.user.id).then(({ data }) => {
          setProfile(data)
        })
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          const { data } = await getUserProfile(session.user.id)
          setProfile(data)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  return useContext(AuthContext)
}
```

---

## 🎯 **Ready-to-Use Components**

### **Login Form**
```javascript
import { useState } from 'react'

const LoginForm = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await loginUser(email, password)
      
      if (error) {
        setError(handleApiError(error))
      } else {
        // Login successful, redirect handled by AuthProvider
        console.log('Login successful:', data.user.email)
      }
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  )
}
```

---

## ✅ **Integration Checklist**

### **Before You Start**
- [x] ✅ Supabase client configured
- [x] ✅ Environment variables set
- [x] ✅ Authentication working
- [x] ✅ All APIs tested and documented

### **Authentication Setup**
- [ ] Implement login/logout functionality
- [ ] Add authentication context/state management
- [ ] Handle authentication errors
- [ ] Add role-based access control

### **Core Features**
- [ ] Customer management (CRUD)
- [ ] Order processing workflow
- [ ] Production tracking
- [ ] Material management
- [ ] Financial operations

### **Advanced Features**
- [ ] Real-time updates
- [ ] Reporting dashboard
- [ ] Search and filtering
- [ ] Data export functionality

### **Production Readiness**
- [ ] Error handling and validation
- [ ] Loading states and UX
- [ ] Performance optimization
- [ ] Testing coverage

---

## 🚀 **Performance Tips**

1. **Batch Queries**: Use `select` with joins instead of multiple requests
2. **Pagination**: Use `range()` for large datasets
3. **Real-time**: Only subscribe to necessary table changes
4. **Caching**: Cache reference data (material types, statuses)
5. **Optimization**: Use `limit()` and specific field selection

---

**🎉 Your backend is fully tested and ready for frontend integration!**

*All APIs documented above have been tested and are working perfectly.*