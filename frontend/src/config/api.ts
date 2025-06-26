import axios from 'axios';

// API Configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect to login if this is not an auth check request
      const isAuthCheck = error.config?.url?.includes('/api/auth/me');

      if (!isAuthCheck) {
        // Token expired or invalid for a real user action, redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');

        // Only redirect if we're not already on the login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  ME: '/api/auth/me',
  USERS: '/api/auth/users',

  // Customers
  CUSTOMERS: '/api/customers',
  CUSTOMER_BY_ID: (id: number) => `/api/customers/${id}`,

  // Orders (to be implemented in backend)
  ORDERS: '/api/orders',
  ORDER_BY_ID: (id: number) => `/api/orders/${id}`,

  // Production (to be implemented in backend)
  PRODUCTION_STATUS: '/api/production/status',
  UPDATE_PRODUCTION_STAGE: '/api/production/update-stage',

  // Reports (to be implemented in backend)
  REPORTS_PENDING_ORDERS: '/api/reports/pending-orders',
  REPORTS_PRODUCTION_STATUS: '/api/reports/production-status',
} as const; 