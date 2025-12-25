import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { User, LoginRequest } from '../types';
import { supabase, authHelpers } from '../lib/supabase';
import { authLogger, logAuthState, performance } from '../utils/debug';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'SET_USER'; payload: User }
  | { type: 'CLEAR_ERROR' };

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('access_token'),
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  authLogger.debug('Auth reducer action', { 
    type: action.type, 
    payload: 'payload' in action ? action.payload : undefined 
  });
  
  switch (action.type) {
    case 'LOGIN_START':
      logAuthState('LOGIN_START');
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'LOGIN_SUCCESS':
      logAuthState('LOGIN_SUCCESS', { user: action.payload.user.email, hasToken: !!action.payload.token });
      // Store token in localStorage
      localStorage.setItem('access_token', action.payload.token);
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'LOGIN_FAILURE':
      logAuthState('LOGIN_FAILURE', { error: action.payload });
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      logAuthState('LOGOUT');
      // Clear token from localStorage
      localStorage.removeItem('access_token');
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        error: null,
      };
    case 'SET_USER':
      logAuthState('SET_USER', { user: action.payload.email });
      const token = state.token || localStorage.getItem('access_token');
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!token, // Only authenticated if we have a token
        token: token,
        isLoading: false,
        error: null,
      };
    case 'CLEAR_ERROR':
      logAuthState('CLEAR_ERROR');
      return {
        ...state,
        error: null,
      };
    default:
      authLogger.warn('Unknown auth action type', action);
      return state;
  }
};

interface AuthContextType {
  state: AuthState;
  token: string | null;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check if user is already logged in on app start
  useEffect(() => {
    const checkAuth = async () => {
      authLogger.info('Starting auth check');
      performance.mark('auth-check-start');

      try {
        // First check if we have a valid session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          authLogger.warn('Session check error', sessionError);
          // Clear stale token
          localStorage.removeItem('access_token');
          dispatch({ type: 'LOGOUT' });
          return;
        }

        if (!session) {
          authLogger.info('No active session found');
          // Clear stale token if exists
          localStorage.removeItem('access_token');
          dispatch({ type: 'LOGOUT' });
          return;
        }

        // Session exists, now get user profile
        const { user, error } = await authHelpers.getCurrentUser();
        performance.measure('auth-check', 'auth-check-start');

        if (error) {
          authLogger.warn('Auth check error', error);
          // Clear stale token
          localStorage.removeItem('access_token');
          dispatch({ type: 'LOGOUT' });
          return;
        }

        if (user) {
          authLogger.info('User found in auth check', { email: user.email, id: user.id });
          // Store/update token
          localStorage.setItem('access_token', session.access_token);
          dispatch({
            type: 'SET_USER',
            payload: user
          });
        } else {
          authLogger.info('No user found in auth check');
          // Clear stale token
          localStorage.removeItem('access_token');
          dispatch({ type: 'LOGOUT' });
        }
      } catch (error) {
        authLogger.error('Auth check failed', error);
        // Clear stale token on any error
        localStorage.removeItem('access_token');
        dispatch({ type: 'LOGOUT' });
      }
    };

    checkAuth();

    // Listen for auth changes
    authLogger.info('Setting up auth state change listener');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        authLogger.info('Auth state change event', { event, hasSession: !!session });

        if (event === 'SIGNED_IN' && session) {
          authLogger.info('Processing SIGNED_IN event', {
            sessionId: session.access_token?.slice(0, 10) + '...',
            expiresAt: session.expires_at
          });

          const { user, error } = await authHelpers.getCurrentUser();
          if (error) {
            authLogger.error('Failed to get user after SIGNED_IN', error);
            localStorage.removeItem('access_token');
            dispatch({ type: 'LOGOUT' });
            return;
          }

          if (user) {
            authLogger.info('Successfully got user after SIGNED_IN', { email: user.email });
            // Store token in localStorage
            localStorage.setItem('access_token', session.access_token);
            dispatch({
              type: 'LOGIN_SUCCESS',
              payload: {
                user,
                token: session.access_token
              }
            });
          }
        } else if (event === 'SIGNED_OUT') {
          authLogger.info('Processing SIGNED_OUT event');
          localStorage.removeItem('access_token');
          dispatch({ type: 'LOGOUT' });
        } else if (event === 'TOKEN_REFRESHED' && session) {
          authLogger.info('Processing TOKEN_REFRESHED event');
          // Update token in localStorage
          localStorage.setItem('access_token', session.access_token);
        } else if (event === 'USER_UPDATED' && session) {
          authLogger.info('Processing USER_UPDATED event');
          // Refresh user data
          const { user, error } = await authHelpers.getCurrentUser();
          if (!error && user) {
            dispatch({ type: 'SET_USER', payload: user });
          }
        } else {
          authLogger.debug('Other auth event', { event });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (credentials: LoginRequest) => {
    authLogger.info('Starting login process', { 
      email: credentials.email || credentials.username,
      hasPassword: !!credentials.password 
    });
    performance.mark('login-start');
    
    dispatch({ type: 'LOGIN_START' });

    try {
      // Use email field if available, otherwise use username as email
      const email = credentials.email || credentials.username;

      if (!email) {
        throw new Error('Email or username is required');
      }

      authLogger.debug('Attempting Supabase signInWithPassword', { email });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: credentials.password,
      });

      if (error) {
        authLogger.error('Supabase signInWithPassword failed', error);
        throw new Error(error.message);
      }

      if (!data.user || !data.session) {
        authLogger.error('Login failed - no user data received', { data });
        throw new Error('Login failed - no user data received');
      }

      authLogger.info('Supabase signInWithPassword successful', { 
        userId: data.user.id,
        email: data.user.email,
        hasSession: !!data.session 
      });

      // Get user profile
      authLogger.debug('Getting user profile');
      const { user: userProfile, error: profileError } = await authHelpers.getCurrentUser();
      
      if (profileError) {
        authLogger.error('Failed to get user profile', profileError);
        throw new Error('Failed to get user profile');
      }
      
      if (!userProfile) {
        authLogger.error('User profile is null');
        throw new Error('Failed to get user profile');
      }

      authLogger.info('User profile retrieved successfully', { 
        email: userProfile.email,
        role: userProfile.role 
      });

      performance.measure('login-success', 'login-start');
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user: userProfile,
          token: data.session.access_token,
        },
      });
      
      authLogger.info('Login completed successfully');
    } catch (error: any) {
      const errorMessage = error.message || 'Login failed. Please try again.';
      authLogger.error('Login failed', { error: errorMessage, originalError: error });
      performance.measure('login-failure', 'login-start');
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage });
    }
  };

  const logout = async () => {
    authLogger.info('Starting logout process');

    try {
      // Clear local state first
      dispatch({ type: 'LOGOUT' });

      // Try to sign out from Supabase (may fail with 404, that's ok)
      try {
        await supabase.auth.signOut();
        authLogger.info('Supabase signOut successful');
      } catch (signOutError) {
        // 404 errors are ok - session might already be expired
        authLogger.debug('Supabase signOut error (ignored)', signOutError);
      }

      authLogger.info('Logout completed successfully');

      // Force page reload to clear all state
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
      
    } catch (error) {
      authLogger.error('Logout error', error);
      // Force logout even if signOut fails
      dispatch({ type: 'LOGOUT' });
      authLogger.info('Forced logout due to signOut failure');
      
      // Still try to redirect
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value = {
    state,
    token: state.token,
    login,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 