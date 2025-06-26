// User types
export interface User {
    id: string;
    username: string;
    email: string;
    full_name: string;
    role: 'admin' | 'manager' | 'employee';
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface LoginRequest {
    username: string;
    password: string;
}

export interface AuthToken {
    access_token: string;
    token_type: string;
}

// Customer types
export interface Customer {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    gst_number?: string;
    created_at: string;
    updated_at: string;
}

export interface CustomerCreate {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    gst_number?: string;
}

export interface CustomerUpdate extends Partial<CustomerCreate> { }

// Order types
export type MaterialType = 'saree' | 'dupatta' | 'voni' | 'running_material' | 'blouse_material';
export type OrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type ProductionStage = 'pre_treatment' | 'printing' | 'post_process';

export interface OrderItem {
    id: string;
    order_id: string;
    material_type: MaterialType;
    quantity: number;
    unit_price: number;
    customization_details?: string;
    current_stage: ProductionStage;
    pre_treatment_completed_at?: string;
    printing_completed_at?: string;
    post_process_completed_at?: string;
    created_at: string;
}

export interface OrderItemCreate {
    material_type: MaterialType;
    quantity: number;
    unit_price: number;
    customization_details?: string;
}

export interface Order {
    id: string;
    order_number: string;
    customer_id: string;
    order_date: string;
    status: OrderStatus;
    total_amount: number;
    notes?: string;
    order_items: OrderItem[];
    customer: Customer;
    created_at: string;
    updated_at: string;
}

export interface OrderCreate {
    customer_id: string;
    order_date?: string;
    status?: OrderStatus;
    notes?: string;
    order_items: OrderItemCreate[];
}

// API Response types
export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data?: T;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
}

// UI State types
export interface LoadingState {
    [key: string]: boolean;
}

export interface ErrorState {
    [key: string]: string | null;
} 