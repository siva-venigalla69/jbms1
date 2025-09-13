// Purchases Management API Service
import { supabase } from '../lib/supabase';
import { withApiLogging } from './supabaseApi';

// Purchase Order Types
export interface Purchase {
  id: string;
  purchase_number: string;
  vendor_id?: string;
  order_date: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  purchase_type: string;
  category: string;
  subcategory?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  vendor_name?: string;
  vendor_contact?: string;
  vendor_gst?: string;
  vendor_address?: string;
  invoice_number?: string;
  invoice_date?: string;
  delivery_address?: string;
  requested_by?: string;
  approved_by?: string;
  received_by?: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
  approval_date?: string;
  rejection_reason?: string;
  payment_terms?: string;
  payment_status: 'PENDING' | 'PARTIAL' | 'PAID';
  payment_amount?: number;
  payment_date?: string;
  payment_reference?: string;
  warranty_period?: number;
  warranty_expiry_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePurchaseRequest {
  vendor_id?: string;
  vendor_name?: string;
  vendor_contact?: string;
  vendor_gst?: string;
  vendor_address?: string;
  order_date?: string;
  expected_delivery_date?: string;
  purchase_type: string;
  category: string;
  subcategory?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate?: number;
  delivery_address?: string;
  requested_by?: string;
  payment_terms?: string;
  warranty_period?: number;
  notes?: string;
}

export interface UpdatePurchaseRequest extends Partial<CreatePurchaseRequest> {
  status?: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
  approved_by?: string;
  received_by?: string;
  actual_delivery_date?: string;
  rejection_reason?: string;
  invoice_number?: string;
  invoice_date?: string;
  payment_status?: 'PENDING' | 'PARTIAL' | 'PAID';
  payment_amount?: number;
  payment_date?: string;
  payment_reference?: string;
}

export interface PurchaseWithVendor extends Purchase {
  vendor_company_name?: string;
  vendor_business_address?: string;
  vendor_email?: string;
  vendor_phone?: string;
  requested_by_name?: string;
  approved_by_name?: string;
  received_by_name?: string;
}

export interface PurchaseSummary {
  purchase_type: string;
  category: string;
  total_orders: number;
  total_amount: number;
  average_amount: number;
  pending_amount: number;
  received_amount: number;
}

export interface PurchaseDashboard {
  total_orders_this_month: number;
  pending_approval_count: number;
  pending_approval_amount: number;
  pending_delivery_count: number;
  pending_delivery_amount: number;
  total_received_this_month: number;
  average_order_value: number;
  overdue_deliveries_count: number;
}

export const purchasesApi = {
  // Get all purchases
  getPurchases: async (): Promise<PurchaseWithVendor[]> => {
    return withApiLogging('purchasesApi.getPurchases', async () => {
      const { data, error } = await supabase
        .from('purchases')
        .select(`
          *,
          vendor:vendors!purchases_vendor_id_fkey (
            company_name,
            business_address,
            email,
            phone
          ),
          requested_by_employee:employees!purchases_requested_by_fkey (
            first_name,
            last_name
          ),
          approved_by_employee:employees!purchases_approved_by_fkey (
            first_name,
            last_name
          ),
          received_by_employee:employees!purchases_received_by_fkey (
            first_name,
            last_name
          )
        `)
        .order('order_date', { ascending: false });

      if (error) throw new Error(error.message);
      
      return (data || []).map(purchase => ({
        ...purchase,
        vendor_company_name: purchase.vendor?.company_name,
        vendor_business_address: purchase.vendor?.business_address,
        vendor_email: purchase.vendor?.email,
        vendor_phone: purchase.vendor?.phone,
        requested_by_name: purchase.requested_by_employee ? `${purchase.requested_by_employee.first_name} ${purchase.requested_by_employee.last_name}` : undefined,
        approved_by_name: purchase.approved_by_employee ? `${purchase.approved_by_employee.first_name} ${purchase.approved_by_employee.last_name}` : undefined,
        received_by_name: purchase.received_by_employee ? `${purchase.received_by_employee.first_name} ${purchase.received_by_employee.last_name}` : undefined
      }));
    });
  },

  // Get purchase by ID
  getPurchase: async (id: string): Promise<PurchaseWithVendor> => {
    return withApiLogging('purchasesApi.getPurchase', async () => {
      const { data, error } = await supabase
        .from('purchases')
        .select(`
          *,
          vendor:vendors!purchases_vendor_id_fkey (
            company_name,
            business_address,
            email,
            phone
          ),
          requested_by_employee:employees!purchases_requested_by_fkey (
            first_name,
            last_name
          ),
          approved_by_employee:employees!purchases_approved_by_fkey (
            first_name,
            last_name
          ),
          received_by_employee:employees!purchases_received_by_fkey (
            first_name,
            last_name
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw new Error(error.message);
      
      return {
        ...data,
        vendor_company_name: data.vendor?.company_name,
        vendor_business_address: data.vendor?.business_address,
        vendor_email: data.vendor?.email,
        vendor_phone: data.vendor?.phone,
        requested_by_name: data.requested_by_employee ? `${data.requested_by_employee.first_name} ${data.requested_by_employee.last_name}` : undefined,
        approved_by_name: data.approved_by_employee ? `${data.approved_by_employee.first_name} ${data.approved_by_employee.last_name}` : undefined,
        received_by_name: data.received_by_employee ? `${data.received_by_employee.first_name} ${data.received_by_employee.last_name}` : undefined
      };
    }, { id });
  },

  // Create purchase
  createPurchase: async (purchaseData: CreatePurchaseRequest): Promise<Purchase> => {
    return withApiLogging('purchasesApi.createPurchase', async () => {
      const { data, error } = await supabase
        .from('purchases')
        .insert([purchaseData])
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }, purchaseData);
  },

  // Update purchase
  updatePurchase: async (id: string, purchaseData: UpdatePurchaseRequest): Promise<Purchase> => {
    return withApiLogging('purchasesApi.updatePurchase', async () => {
      const { data, error } = await supabase
        .from('purchases')
        .update(purchaseData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }, { id, ...purchaseData });
  },

  // Delete purchase
  deletePurchase: async (id: string): Promise<void> => {
    return withApiLogging('purchasesApi.deletePurchase', async () => {
      const { error } = await supabase
        .from('purchases')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
    }, { id });
  },

  // Submit purchase for approval
  submitPurchase: async (id: string, requestedBy: string): Promise<Purchase> => {
    return withApiLogging('purchasesApi.submitPurchase', async () => {
      const { data, error } = await supabase
        .from('purchases')
        .update({
          status: 'PENDING_APPROVAL',
          requested_by: requestedBy
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }, { id, requestedBy });
  },

  // Approve purchase
  approvePurchase: async (id: string, approvedBy: string): Promise<Purchase> => {
    return withApiLogging('purchasesApi.approvePurchase', async () => {
      const { data, error } = await supabase
        .from('purchases')
        .update({
          status: 'APPROVED',
          approved_by: approvedBy,
          approval_date: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }, { id, approvedBy });
  },

  // Reject purchase
  rejectPurchase: async (id: string, approvedBy: string, rejectionReason: string): Promise<Purchase> => {
    return withApiLogging('purchasesApi.rejectPurchase', async () => {
      const { data, error } = await supabase
        .from('purchases')
        .update({
          status: 'CANCELLED',
          approved_by: approvedBy,
          approval_date: new Date().toISOString(),
          rejection_reason: rejectionReason
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }, { id, approvedBy, rejectionReason });
  },

  // Mark purchase as received
  markAsReceived: async (id: string, receivedBy: string, actualDeliveryDate?: string): Promise<Purchase> => {
    return withApiLogging('purchasesApi.markAsReceived', async () => {
      const { data, error } = await supabase
        .from('purchases')
        .update({
          status: 'RECEIVED',
          received_by: receivedBy,
          actual_delivery_date: actualDeliveryDate || new Date().toISOString().split('T')[0]
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }, { id, receivedBy, actualDeliveryDate });
  },

  // Get purchases requiring approval
  getPendingApprovalPurchases: async (): Promise<PurchaseWithVendor[]> => {
    return withApiLogging('purchasesApi.getPendingApprovalPurchases', async () => {
      const { data, error } = await supabase
        .from('purchases')
        .select(`
          *,
          vendor:vendors!purchases_vendor_id_fkey (
            company_name,
            business_address
          ),
          requested_by_employee:employees!purchases_requested_by_fkey (
            first_name,
            last_name
          )
        `)
        .eq('status', 'PENDING_APPROVAL')
        .order('order_date', { ascending: true });

      if (error) throw new Error(error.message);
      
      return (data || []).map(purchase => ({
        ...purchase,
        vendor_company_name: purchase.vendor?.company_name,
        vendor_business_address: purchase.vendor?.business_address,
        requested_by_name: purchase.requested_by_employee ? `${purchase.requested_by_employee.first_name} ${purchase.requested_by_employee.last_name}` : undefined
      }));
    });
  },

  // Get overdue deliveries
  getOverdueDeliveries: async (): Promise<PurchaseWithVendor[]> => {
    return withApiLogging('purchasesApi.getOverdueDeliveries', async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('purchases')
        .select(`
          *,
          vendor:vendors!purchases_vendor_id_fkey (
            company_name,
            business_address
          )
        `)
        .in('status', ['ORDERED', 'PARTIALLY_RECEIVED'])
        .lt('expected_delivery_date', today)
        .order('expected_delivery_date', { ascending: true });

      if (error) throw new Error(error.message);
      
      return (data || []).map(purchase => ({
        ...purchase,
        vendor_company_name: purchase.vendor?.company_name,
        vendor_business_address: purchase.vendor?.business_address
      }));
    });
  },

  // Get purchase summary
  getPurchaseSummary: async (): Promise<PurchaseSummary[]> => {
    return withApiLogging('purchasesApi.getPurchaseSummary', async () => {
      const { data, error } = await supabase
        .from('purchase_summary')
        .select('*')
        .order('total_amount', { ascending: false });

      if (error) throw new Error(error.message);
      return data || [];
    });
  },

  // Get purchase dashboard data
  getPurchaseDashboard: async (): Promise<PurchaseDashboard> => {
    return withApiLogging('purchasesApi.getPurchaseDashboard', async () => {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      const today = new Date().toISOString().split('T')[0];

      // Get current month purchases
      const { data: monthlyPurchases, error: monthlyError } = await supabase
        .from('purchases')
        .select('total_amount, status, expected_delivery_date')
        .gte('order_date', `${currentMonth}-01`)
        .lt('order_date', `${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().slice(0, 10)}`);

      if (monthlyError) throw new Error(monthlyError.message);

      // Get pending approval purchases
      const { data: pendingPurchases, error: pendingError } = await supabase
        .from('purchases')
        .select('total_amount')
        .eq('status', 'PENDING_APPROVAL');

      if (pendingError) throw new Error(pendingError.message);

      // Get pending delivery purchases
      const { data: pendingDelivery, error: deliveryError } = await supabase
        .from('purchases')
        .select('total_amount, expected_delivery_date')
        .in('status', ['APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED']);

      if (deliveryError) throw new Error(deliveryError.message);

      const purchases = monthlyPurchases || [];
      const pending = pendingPurchases || [];
      const delivery = pendingDelivery || [];

      const dashboard: PurchaseDashboard = {
        total_orders_this_month: purchases.reduce((sum, p) => sum + p.total_amount, 0),
        pending_approval_count: pending.length,
        pending_approval_amount: pending.reduce((sum, p) => sum + p.total_amount, 0),
        pending_delivery_count: delivery.length,
        pending_delivery_amount: delivery.reduce((sum, p) => sum + p.total_amount, 0),
        total_received_this_month: purchases.filter(p => p.status === 'RECEIVED').reduce((sum, p) => sum + p.total_amount, 0),
        average_order_value: purchases.length > 0 ? purchases.reduce((sum, p) => sum + p.total_amount, 0) / purchases.length : 0,
        overdue_deliveries_count: delivery.filter(p => p.expected_delivery_date && p.expected_delivery_date < today).length
      };

      return dashboard;
    });
  },

  // Search purchases
  searchPurchases: async (searchTerm: string): Promise<PurchaseWithVendor[]> => {
    return withApiLogging('purchasesApi.searchPurchases', async () => {
      const { data, error } = await supabase
        .from('purchases')
        .select(`
          *,
          vendor:vendors!purchases_vendor_id_fkey (
            company_name,
            business_address
          )
        `)
        .or(`purchase_number.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,vendor_name.ilike.%${searchTerm}%,purchase_type.ilike.%${searchTerm}%`)
        .order('order_date', { ascending: false });

      if (error) throw new Error(error.message);
      
      return (data || []).map(purchase => ({
        ...purchase,
        vendor_company_name: purchase.vendor?.company_name,
        vendor_business_address: purchase.vendor?.business_address
      }));
    }, { searchTerm });
  },

  // Get purchase types and categories for dropdowns
  getPurchaseCategories: async (): Promise<{ purchase_types: string[], categories: string[], subcategories: string[] }> => {
    return withApiLogging('purchasesApi.getPurchaseCategories', async () => {
      const { data, error } = await supabase
        .from('purchases')
        .select('purchase_type, category, subcategory')
        .not('purchase_type', 'is', null)
        .not('category', 'is', null);

      if (error) throw new Error(error.message);

      const purchaseTypes = Array.from(new Set((data || []).map(p => p.purchase_type).filter(Boolean)));
      const categories = Array.from(new Set((data || []).map(p => p.category).filter(Boolean)));
      const subcategories = Array.from(new Set((data || []).map(p => p.subcategory).filter(Boolean)));

      return {
        purchase_types: purchaseTypes.sort(),
        categories: categories.sort(),
        subcategories: subcategories.sort()
      };
    });
  },

  // Update payment status
  updatePaymentStatus: async (id: string, paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID', paymentAmount?: number, paymentDate?: string, paymentReference?: string): Promise<Purchase> => {
    return withApiLogging('purchasesApi.updatePaymentStatus', async () => {
      const updateData: any = { payment_status: paymentStatus };
      
      if (paymentAmount !== undefined) updateData.payment_amount = paymentAmount;
      if (paymentDate) updateData.payment_date = paymentDate;
      if (paymentReference) updateData.payment_reference = paymentReference;

      const { data, error } = await supabase
        .from('purchases')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }, { id, paymentStatus, paymentAmount, paymentDate, paymentReference });
  }
};