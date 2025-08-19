import { supabase, TABLES } from '../lib/supabase';
import { authLogger } from './debug';

export const loginDebugHelper = {
  // Complete login flow test
  testLoginFlow: async (email: string, password: string) => {
    authLogger.info('=== STARTING COMPLETE LOGIN FLOW TEST ===');
    
    try {
      // Step 1: Check if user exists in auth
      authLogger.info('Step 1: Checking auth system...');
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      authLogger.info('Auth users check result:', { error: authError, userCount: authUsers?.users?.length });
      
      // Step 2: Attempt login
      authLogger.info('Step 2: Attempting Supabase login...');
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (loginError) {
        authLogger.error('Login failed at Supabase level:', loginError);
        return { success: false, step: 'supabase_login', error: loginError };
      }
      
      authLogger.info('Supabase login successful:', {
        userId: loginData.user?.id,
        email: loginData.user?.email,
        hasSession: !!loginData.session
      });
      
      // Step 3: Check user profile
      authLogger.info('Step 3: Checking user profile...');
      const { data: profile, error: profileError } = await supabase
        .from(TABLES.USERS)
        .select('*')
        .eq('email', email)
        .single();
      
      if (profileError) {
        authLogger.error('User profile not found:', profileError);
        
        // Try to create profile
        authLogger.info('Step 4: Creating missing user profile...');
        const newProfile = {
          id: loginData.user!.id,
          email: loginData.user!.email!,
          username: loginData.user!.email!.split('@')[0],
          full_name: loginData.user!.email!.split('@')[0],
          role: 'admin' as const,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { data: createdProfile, error: createError } = await supabase
          .from(TABLES.USERS)
          .insert(newProfile)
          .select()
          .single();
        
        if (createError) {
          authLogger.error('Failed to create user profile:', createError);
          return { success: false, step: 'create_profile', error: createError };
        }
        
        authLogger.info('User profile created successfully:', createdProfile);
        return { success: true, step: 'completed_with_profile_creation', profile: createdProfile };
      }
      
      authLogger.info('User profile found:', profile);
      authLogger.info('=== LOGIN FLOW TEST COMPLETED SUCCESSFULLY ===');
      return { success: true, step: 'completed', profile };
      
    } catch (error) {
      authLogger.error('Exception during login flow test:', error);
      return { success: false, step: 'exception', error };
    }
  },

  // Quick profile check for current auth user
  checkCurrentUserProfile: async () => {
    authLogger.info('=== CHECKING CURRENT USER PROFILE ===');
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        authLogger.warn('No current auth user found');
        return { hasAuthUser: false };
      }
      
      authLogger.info('Current auth user:', { id: user.id, email: user.email });
      
      // Check profile
      const { data: profile, error: profileError } = await supabase
        .from(TABLES.USERS)
        .select('*')
        .eq('email', user.email!)
        .single();
      
      return {
        hasAuthUser: true,
        authUser: user,
        hasProfile: !profileError && !!profile,
        profile: profile || null,
        profileError: profileError || null
      };
      
    } catch (error) {
      authLogger.error('Exception checking current user profile:', error);
      return { hasAuthUser: false, error };
    }
  },

  // Fix missing profile for current auth user
  fixCurrentUserProfile: async () => {
    authLogger.info('=== FIXING CURRENT USER PROFILE ===');
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        authLogger.error('No current auth user to fix profile for');
        return { success: false, error: 'No auth user' };
      }
      
      const newProfile = {
        id: user.id,
        email: user.email!,
        username: user.email!.split('@')[0],
        full_name: user.email!.split('@')[0],
        role: 'admin' as const,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data: createdProfile, error: createError } = await supabase
        .from(TABLES.USERS)
        .insert(newProfile)
        .select()
        .single();
      
      if (createError) {
        authLogger.error('Failed to create profile:', createError);
        return { success: false, error: createError };
      }
      
      authLogger.info('Profile created successfully:', createdProfile);
      return { success: true, profile: createdProfile };
      
    } catch (error) {
      authLogger.error('Exception fixing user profile:', error);
      return { success: false, error };
    }
  }
};

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).loginDebug = loginDebugHelper;
}