import { supabase, TABLES } from '../lib/supabase';
import { supabaseLogger } from './debug';

export const debugDatabase = {
  // Check what users exist in the database
  checkUsers: async () => {
    supabaseLogger.info('Checking users in database...');
    
    try {
      const { data: users, error } = await supabase
        .from(TABLES.USERS)
        .select('id, email, username, full_name, role, is_active, created_at')
        .limit(10);
      
      if (error) {
        supabaseLogger.error('Error fetching users', error);
        return;
      }
      
      supabaseLogger.info(`Found ${users?.length || 0} users in database:`, users);
      
      // Also log to console for easy viewing
      console.table(users);
      
      return users;
    } catch (error) {
      supabaseLogger.error('Exception while checking users', error);
    }
  },

  // Check current auth user
  checkAuthUser: async () => {
    supabaseLogger.info('Checking current auth user...');
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        supabaseLogger.error('Error getting auth user', error);
        return;
      }
      
      if (user) {
        supabaseLogger.info('Current auth user:', {
          id: user.id,
          email: user.email,
          email_confirmed_at: user.email_confirmed_at,
          created_at: user.created_at,
          app_metadata: user.app_metadata,
          user_metadata: user.user_metadata
        });
        
        console.log('Auth User Details:', user);
        return user;
      } else {
        supabaseLogger.info('No auth user found');
      }
    } catch (error) {
      supabaseLogger.error('Exception while checking auth user', error);
    }
  },

  // Check if current auth user has a profile
  checkUserProfile: async () => {
    supabaseLogger.info('Checking user profile for current auth user...');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        supabaseLogger.warn('No auth user to check profile for');
        return;
      }
      
      // Try by email
      const { data: profileByEmail, error: emailError } = await supabase
        .from(TABLES.USERS)
        .select('*')
        .eq('email', user.email)
        .single();
      
      // Try by ID
      const { data: profileById, error: idError } = await supabase
        .from(TABLES.USERS)
        .select('*')
        .eq('id', user.id)
        .single();
      
      supabaseLogger.info('Profile lookup results:', {
        userEmail: user.email,
        userId: user.id,
        profileByEmail: profileByEmail || 'Not found',
        emailError: emailError?.message || 'None',
        profileById: profileById || 'Not found', 
        idError: idError?.message || 'None'
      });
      
      return { profileByEmail, profileById, emailError, idError };
    } catch (error) {
      supabaseLogger.error('Exception while checking user profile', error);
    }
  },

  // Create a user profile for current auth user if missing
  createUserProfile: async () => {
    supabaseLogger.info('Creating user profile for current auth user...');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        supabaseLogger.error('No auth user to create profile for');
        return;
      }
      
      const userData = {
        id: user.id,
        email: user.email,
        username: user.email?.split('@')[0] || 'user',
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        role: 'admin' as const, // Default to admin for testing
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data: newUser, error } = await supabase
        .from(TABLES.USERS)
        .insert(userData)
        .select()
        .single();
      
      if (error) {
        supabaseLogger.error('Error creating user profile', error);
        return;
      }
      
      supabaseLogger.info('Created user profile successfully:', newUser);
      return newUser;
    } catch (error) {
      supabaseLogger.error('Exception while creating user profile', error);
    }
  },

  // Check if required tables exist and are accessible
  checkTables: async () => {
    supabaseLogger.info('Checking database tables...');
    
    const tables = ['customers', 'orders', 'order_items'];
    const results: any = {};
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          results[table] = { status: 'error', error: error.message };
          supabaseLogger.error(`Table ${table} error:`, error);
        } else {
          results[table] = { status: 'accessible', recordCount: data?.length || 0 };
          supabaseLogger.info(`Table ${table} is accessible`);
        }
      } catch (error) {
        results[table] = { status: 'exception', error };
        supabaseLogger.error(`Exception checking table ${table}:`, error);
      }
    }
    
    console.table(results);
    return results;
  },

  // Test order creation with minimal data
  testOrderCreation: async () => {
    supabaseLogger.info('Testing order creation...');
    
    try {
      // First check if we have any customers
      const { data: customers } = await supabase
        .from('customers')
        .select('id, name')
        .limit(1);
      
      let customerList = customers || [];
      
      if (customerList.length === 0) {
        supabaseLogger.warn('No customers found, creating a test customer...');
        
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            name: 'Test Customer',
            phone: '1234567890',
            email: 'test@example.com'
          })
          .select()
          .single();
        
        if (customerError) {
          supabaseLogger.error('Failed to create test customer:', customerError);
          return;
        }
        
        if (!newCustomer) {
          supabaseLogger.error('Customer creation returned null');
          return;
        }
        
        supabaseLogger.info('Test customer created:', newCustomer);
        customerList = [newCustomer];
      }
      
      const customer = customerList[0];
      
      if (!customer) {
        supabaseLogger.error('No customer available for testing');
        return;
      }
      
      // Test order creation
      const orderNumber = `TEST-${Date.now()}`;
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_id: customer.id,
          order_date: new Date().toISOString().split('T')[0],
          status: 'pending',
          total_amount: 100.00,
          notes: 'Test order from debug function',
        })
        .select()
        .single();
      
      if (orderError) {
        supabaseLogger.error('Failed to create test order:', orderError);
        return;
      }
      
      supabaseLogger.info('Test order created successfully:', order);
      
      // Test order item creation
      const { data: orderItem, error: itemError } = await supabase
        .from('order_items')
        .insert({
          order_id: order.id,
          material_type: 'saree',
          quantity: 1,
          unit_price: 100.00,
          customization_details: 'Test item',
          subtotal: 100.00,
        })
        .select()
        .single();
      
      if (itemError) {
        supabaseLogger.error('Failed to create test order item:', itemError);
        return;
      }
      
      supabaseLogger.info('Test order item created successfully:', orderItem);
      
      return { order, orderItem };
    } catch (error) {
      supabaseLogger.error('Exception during test order creation:', error);
    }
  }
};

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).debugDb = debugDatabase;
}