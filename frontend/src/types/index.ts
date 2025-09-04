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
    email?: string;
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
export type DesignStatus = 'pending_from_customer' | 'design_received_from_customer' | 'design_ready';
export type ProductionStatus = 'pending' | 'pre_treatment' | 'printing' | 'post_process';
// @deprecated - Use DesignStatus and ProductionStatus instead
export type ProductionStage = 'design_pending' | 'design_ready' | 'pre_treatment' | 'printing' | 'post_process';

export interface StageStockFilter {
  designStatus?: DesignStatus | 'all';
  productionStatus?: ProductionStatus | 'all';
  customerId?: string;
  materialType?: MaterialType | 'all';
}

export interface StageStockSummary {
  designStatus: DesignStatus;
  productionStatus: ProductionStatus;
  count: number;
  items: OrderItem[];
}

// @deprecated - Design info is now tracked in OrderItem.design_status
export interface DesignInfo {
    id?: string;
    order_item_id: string;
    design_received: boolean;
    design_ready: boolean;
    design_file_url?: string;
    design_notes?: string;
    design_received_date?: string;
    design_ready_date?: string;
    created_at?: string;
    updated_at?: string;
}

export interface OrderItem {
    id: string;
    order_id: string;
    material_type: MaterialType;
    quantity: number;
    unit_price: number;
    design_status: DesignStatus;
    production_status: ProductionStatus;
    design_file_url?: string;
    design_notes?: string;
    created_at: string;
    
    // @deprecated - Legacy columns for backward compatibility
    customization_details?: string;
    current_stage?: ProductionStage;
    design_received?: boolean;
    design_ready?: boolean;
    design_received_date?: string;
    design_ready_date?: string;
    pre_treatment_completed_at?: string;
    printing_completed_at?: string;
    post_process_completed_at?: string;
}

export interface OrderItemCreate {
    material_type: MaterialType;
    quantity: number;
    unit_price: number;
    design_status?: DesignStatus;
    production_status?: ProductionStatus;
    design_notes?: string;
    design_file_url?: string;
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

// Additional types for Supabase integration
export interface MaterialIn {
    id: string;
    customer_id: string;
    order_id?: string;
    material_type: string;
    quantity: number;
    received_date: string;
    notes?: string;
    created_at: string;
    customer?: Customer;
    order?: Order;
}

export interface MaterialOut {
    id: string;
    order_id: string;
    material_type: string;
    quantity: number;
    dispatch_date: string;
    notes?: string;
    created_at: string;
    order?: Order;
}



export interface Payment {
    id: string;
    customer_id?: string;
    invoice_id: string;
    payment_amount: number;
    payment_date: string;
    payment_method: 'cash' | 'upi' | 'bank_transfer' | 'cheque';
    reference_number?: string;
    notes?: string;
    created_at: string;
    invoice?: GST_Invoice;
}

export interface InventoryItem {
    id: string;
    item_name: string;
    item_type: string;
    quantity: number;
    unit_price: number;
    supplier?: string;
    last_updated: string;
    created_at: string;
}

export interface Expense {
    id: string;
    expense_type: string;
    amount: number;
    expense_date: string;
    description?: string;
    receipt_number?: string;
    created_at: string;
}

export interface ReturnItem {
    id: string;
    order_item_id: string;
    return_quantity: number;
    return_date: string;
    return_reason: string;
    notes?: string;
    created_at: string;
    order_item?: OrderItem;
}

// Delivery Challan types
export interface DeliveryChallan {
    id: string;
    challan_number: string;
    customer_id: string;
    order_id: string;
    delivery_date: string;
    status: 'pending' | 'delivered' | 'returned';
    notes?: string;
    created_at: string;
    customer?: Customer;
    order?: Order;
}

export interface DeliveryChallanItem {
    id?: string;
    delivery_challan_id?: string;
    order_id: string;
    order_item_id: string;
    material_type: string;
    quantity_delivered: number;
    unit_price: number;
    subtotal: number;
    notes?: string;
    created_at?: string;
}

export interface DeliveryChallanCreate {
    challan_number?: string;
    customer_id: string;
    delivery_date: string;
    status: 'pending' | 'delivered' | 'returned';
    notes?: string;
    items: Array<{
        order_id: string;
        order_item_id: string;
        material_type: string;
        quantity_delivered: number;
        unit_price: number;
        notes?: string;
    }>;
}

// Material stock tracking
export interface MaterialStock {
    id: string;
    customer_id: string;
    material_type: string;
    total_received: number;
    total_delivered: number;
    current_stock: number;
    last_updated: string;
    customer?: Customer;
}

// GST Invoice types
export interface GST_Invoice {
    id: string;
    invoice_number: string;
    customer_id: string;
    order_id: string;
    invoice_date: string;
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    status: 'draft' | 'sent' | 'paid' | 'overdue';
    due_date?: string;
    notes?: string;
    created_at: string;
    customer?: Customer;
    order?: Order;
}

export interface GST_InvoiceCreate {
    invoice_number: string;
    customer_id: string;
    order_id: string;
    invoice_date: string;
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    status: 'draft' | 'sent' | 'paid' | 'overdue';
    due_date?: string;
    notes?: string;
} 