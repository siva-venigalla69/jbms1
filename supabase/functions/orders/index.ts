// Supabase Edge Function for Order Management
// Handles complex order operations and business logic

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface OrderItem {
  material_type: string
  quantity: number
  unit_price: number
  customization_details?: string
}

interface CreateOrderRequest {
  customer_id: string
  order_date?: string
  notes?: string
  items: OrderItem[]
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear()
  
  // Get the last order number for this year
  const { data, error } = await supabase
    .from('orders')
    .select('order_number')
    .like('order_number', `ORD-${year}-%`)
    .order('order_number', { ascending: false })
    .limit(1)
  
  if (error) {
    throw new Error(`Failed to generate order number: ${error.message}`)
  }
  
  let nextNumber = 1
  if (data && data.length > 0) {
    const lastOrderNumber = data[0].order_number
    const lastNumber = parseInt(lastOrderNumber.split('-')[2])
    nextNumber = lastNumber + 1
  }
  
  return `ORD-${year}-${nextNumber.toString().padStart(4, '0')}`
}

async function createOrder(request: CreateOrderRequest, userId: string) {
  try {
    // Generate order number
    const orderNumber = await generateOrderNumber()
    
    // Calculate total amount
    const totalAmount = request.items.reduce((sum, item) => 
      sum + (item.quantity * item.unit_price), 0
    )
    
    // Start transaction by creating order first
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        order_number: orderNumber,
        customer_id: request.customer_id,
        order_date: request.order_date || new Date().toISOString(),
        total_amount: totalAmount,
        notes: request.notes,
        status: 'pending',
        created_by_user_id: userId
      }])
      .select()
      .single()
    
    if (orderError) {
      throw new Error(`Failed to create order: ${orderError.message}`)
    }
    
    // Create order items
    const orderItems = request.items.map(item => ({
      order_id: order.id,
      material_type: item.material_type,
      quantity: item.quantity,
      unit_price: item.unit_price,
      customization_details: item.customization_details,
      production_stage: 'pre_treatment'
    }))
    
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)
      .select()
    
    if (itemsError) {
      // Rollback order creation
      await supabase.from('orders').delete().eq('id', order.id)
      throw new Error(`Failed to create order items: ${itemsError.message}`)
    }
    
    // Return complete order with items
    return {
      ...order,
      items: items
    }
  } catch (error) {
    throw new Error(`Order creation failed: ${error.message}`)
  }
}

async function updateOrderStatus(orderId: string, status: string, userId: string) {
  const { data, error } = await supabase
    .from('orders')
    .update({
      status: status,
      updated_by_user_id: userId,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to update order status: ${error.message}`)
  }
  
  return data
}

async function getOrderWithDetails(orderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customer:customers(*),
      order_items(*),
      created_by:users!created_by_user_id(username, full_name)
    `)
    .eq('id', orderId)
    .eq('is_deleted', false)
    .single()
  
  if (error) {
    throw new Error(`Failed to get order: ${error.message}`)
  }
  
  return data
}

async function getOrdersByCustomer(customerId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items(*)
    `)
    .eq('customer_id', customerId)
    .eq('is_deleted', false)
    .order('order_date', { ascending: false })
  
  if (error) {
    throw new Error(`Failed to get customer orders: ${error.message}`)
  }
  
  return data
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL(req.url)
    const path = url.pathname
    const method = req.method

    // Route handling
    if (method === 'POST' && path.endsWith('/orders')) {
      // Create new order
      const body: CreateOrderRequest = await req.json()
      
      if (!body.customer_id || !body.items || body.items.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Customer ID and items are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      const order = await createOrder(body, user.id)
      
      return new Response(
        JSON.stringify({ data: order }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (method === 'GET' && path.includes('/orders/')) {
      // Get specific order
      const orderId = path.split('/orders/')[1]
      const order = await getOrderWithDetails(orderId)
      
      return new Response(
        JSON.stringify({ data: order }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (method === 'PUT' && path.includes('/orders/') && path.includes('/status')) {
      // Update order status
      const orderId = path.split('/orders/')[1].split('/status')[0]
      const { status } = await req.json()
      
      if (!status) {
        return new Response(
          JSON.stringify({ error: 'Status is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      const order = await updateOrderStatus(orderId, status, user.id)
      
      return new Response(
        JSON.stringify({ data: order }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (method === 'GET' && path.includes('/customers/') && path.includes('/orders')) {
      // Get orders by customer
      const customerId = path.split('/customers/')[1].split('/orders')[0]
      const orders = await getOrdersByCustomer(customerId)
      
      return new Response(
        JSON.stringify({ data: orders }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Route not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})