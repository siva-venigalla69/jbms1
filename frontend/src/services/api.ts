import { apiClient, API_ENDPOINTS } from '../config/api';
import { Customer, CustomerCreate, CustomerUpdate, User } from '../types';

// Authentication API
export const authApi = {
    login: async (username: string, password: string) => {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        const response = await apiClient.post(API_ENDPOINTS.LOGIN, formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        return response.data;
    },

    getCurrentUser: async (): Promise<User> => {
        const response = await apiClient.get(API_ENDPOINTS.ME);
        return response.data;
    },

    getUsers: async (): Promise<User[]> => {
        const response = await apiClient.get(API_ENDPOINTS.USERS);
        return response.data;
    },

    register: async (userData: any): Promise<User> => {
        const response = await apiClient.post(API_ENDPOINTS.REGISTER, userData);
        return response.data;
    },
};

// Customer API
export const customerApi = {
    getCustomers: async (params?: {
        skip?: number;
        limit?: number;
        search?: string;
    }): Promise<Customer[]> => {
        const response = await apiClient.get(API_ENDPOINTS.CUSTOMERS, { params });
        return response.data;
    },

    getCustomer: async (id: number): Promise<Customer> => {
        const response = await apiClient.get(API_ENDPOINTS.CUSTOMER_BY_ID(id));
        return response.data;
    },

    createCustomer: async (customer: CustomerCreate): Promise<Customer> => {
        const response = await apiClient.post(API_ENDPOINTS.CUSTOMERS, customer);
        return response.data;
    },

    updateCustomer: async (id: number, customer: CustomerUpdate): Promise<Customer> => {
        const response = await apiClient.put(API_ENDPOINTS.CUSTOMER_BY_ID(id), customer);
        return response.data;
    },

    deleteCustomer: async (id: number): Promise<void> => {
        await apiClient.delete(API_ENDPOINTS.CUSTOMER_BY_ID(id));
    },
};

// Generic API utilities
export const apiUtils = {
    // Health check
    healthCheck: async () => {
        const response = await apiClient.get('/health');
        return response.data;
    },

    // Handle API errors
    handleError: (error: any) => {
        if (error.response?.data?.detail) {
            return error.response.data.detail;
        }
        if (error.message) {
            return error.message;
        }
        return 'An unexpected error occurred';
    },
};

export default {
    auth: authApi,
    customers: customerApi,
    utils: apiUtils,
}; 