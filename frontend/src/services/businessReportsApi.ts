// Business Reports API - Advanced Analytics and Intelligence
// Integrates with comprehensive business logic SQLs

import { supabase } from '../lib/supabase';
import { apiLogger, withApiLogging } from './supabaseApi';

// Business Dashboard APIs
export const businessDashboardApi = {
  // Get comprehensive business overview
  getBusinessOverview: async (fromDate?: string, toDate?: string) => {
    return withApiLogging('businessDashboard.getBusinessOverview', async () => {
      const { data, error } = await supabase
        .rpc('get_business_overview', {
          p_from_date: fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          p_to_date: toDate || new Date().toISOString().split('T')[0]
        });
      
      if (error) throw new Error(error.message);
      return data;
    }, { fromDate, toDate });
  },

  // Get sales performance with time grouping
  getSalesPerformance: async (fromDate?: string, toDate?: string, groupBy: 'day' | 'week' | 'month' = 'month') => {
    return withApiLogging('businessDashboard.getSalesPerformance', async () => {
      const { data, error } = await supabase
        .rpc('get_sales_performance', {
          p_from_date: fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          p_to_date: toDate || new Date().toISOString().split('T')[0],
          p_group_by: groupBy
        });
      
      if (error) throw new Error(error.message);
      return data;
    }, { fromDate, toDate, groupBy });
  },

  // Get detailed customer analysis
  getCustomerAnalysis: async () => {
    return withApiLogging('businessDashboard.getCustomerAnalysis', async () => {
      const { data, error } = await supabase.rpc('get_customer_analysis');
      if (error) throw new Error(error.message);
      return data;
    });
  },

  // Get production efficiency report
  getProductionEfficiencyReport: async (fromDate?: string, toDate?: string) => {
    return withApiLogging('businessDashboard.getProductionEfficiencyReport', async () => {
      const { data, error } = await supabase
        .rpc('get_production_efficiency_report', {
          p_from_date: fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          p_to_date: toDate || new Date().toISOString().split('T')[0]
        });
      
      if (error) throw new Error(error.message);
      return data;
    }, { fromDate, toDate });
  },

  // Get financial summary
  getFinancialSummary: async (fromDate?: string, toDate?: string) => {
    return withApiLogging('businessDashboard.getFinancialSummary', async () => {
      const { data, error } = await supabase
        .rpc('get_financial_summary', {
          p_from_date: fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          p_to_date: toDate || new Date().toISOString().split('T')[0]
        });
      
      if (error) throw new Error(error.message);
      return data && data.length > 0 ? data[0] : null;
    }, { fromDate, toDate });
  }
};

// Inventory Reports APIs
export const inventoryReportsApi = {
  // Get comprehensive stock report
  getComprehensiveStockReport: async (customerId?: string, materialType?: string) => {
    return withApiLogging('inventoryReports.getComprehensiveStockReport', async () => {
      const { data, error } = await supabase
        .rpc('get_comprehensive_stock_report', {
          p_customer_id: customerId,
          p_material_type: materialType
        });
      
      if (error) throw new Error(error.message);
      return data;
    }, { customerId, materialType });
  },

  // Get stock movement analysis
  getStockMovementAnalysis: async (
    customerId?: string, 
    materialType?: string,
    fromDate?: string, 
    toDate?: string
  ) => {
    return withApiLogging('inventoryReports.getStockMovementAnalysis', async () => {
      const { data, error } = await supabase
        .rpc('get_stock_movement_analysis', {
          p_customer_id: customerId,
          p_material_type: materialType,
          p_from_date: fromDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          p_to_date: toDate || new Date().toISOString().split('T')[0]
        });
      
      if (error) throw new Error(error.message);
      return data;
    }, { customerId, materialType, fromDate, toDate });
  },

  // Get stock aging report
  getStockAgingReport: async (customerId?: string) => {
    return withApiLogging('inventoryReports.getStockAgingReport', async () => {
      const { data, error } = await supabase
        .rpc('get_stock_aging_report', {
          p_customer_id: customerId
        });
      
      if (error) throw new Error(error.message);
      return data;
    }, { customerId });
  },

  // Get low stock alerts
  getLowStockAlerts: async (thresholdDays: number = 30) => {
    return withApiLogging('inventoryReports.getLowStockAlerts', async () => {
      const { data, error } = await supabase
        .rpc('get_low_stock_alerts', {
          p_threshold_days: thresholdDays
        });
      
      if (error) throw new Error(error.message);
      return data;
    }, { thresholdDays });
  }
};

// Business Intelligence APIs (Adhoc Queries)
export const businessIntelligenceApi = {
  // Customer profitability analysis
  getCustomerProfitabilityAnalysis: async () => {
    return withApiLogging('businessIntelligence.getCustomerProfitabilityAnalysis', async () => {
      // Execute the customer profitability adhoc query
      const { data, error } = await supabase
        .rpc('execute_sql', {
          query: `
            WITH customer_profitability AS (
              SELECT 
                c.id,
                c.name as customer_name,
                COUNT(DISTINCT o.id) as total_orders,
                COALESCE(SUM(gi.total_amount), 0) as total_revenue,
                COALESCE(SUM(p.payment_amount), 0) as total_payments,
                COALESCE(SUM(gi.total_amount - p.payment_amount), 0) as outstanding_amount,
                AVG(p.payment_date - gi.invoice_date) as avg_payment_days,
                COALESCE(SUM(gi.total_amount), 0) / NULLIF(COUNT(DISTINCT o.id), 0) as avg_order_value,
                MAX(o.order_date) as last_order_date,
                (CURRENT_DATE - MAX(o.order_date))::INTEGER as days_since_last_order
              FROM customers c
              LEFT JOIN orders o ON c.id = o.customer_id AND o.is_deleted = FALSE
              LEFT JOIN gst_invoices gi ON c.id = gi.customer_id AND gi.is_deleted = FALSE
              LEFT JOIN payments p ON gi.id = p.invoice_id
              WHERE c.is_deleted = FALSE
              GROUP BY c.id, c.name
              HAVING COUNT(DISTINCT o.id) > 0
            )
            SELECT 
              customer_name,
              total_orders,
              total_revenue,
              total_payments,
              outstanding_amount,
              avg_payment_days,
              avg_order_value,
              last_order_date,
              days_since_last_order,
              CASE 
                WHEN avg_payment_days <= 15 AND total_revenue > 10000 THEN 'PREMIUM'
                WHEN avg_payment_days <= 30 AND total_revenue > 5000 THEN 'GOLD'
                WHEN avg_payment_days <= 45 AND total_revenue > 1000 THEN 'SILVER'
                ELSE 'BRONZE'
              END as customer_tier,
              ROUND((total_payments / NULLIF(total_revenue, 0)) * 100, 2) as payment_reliability_percentage
            FROM customer_profitability
            ORDER BY total_revenue DESC, avg_payment_days ASC
          `
        });
      
      if (error) throw new Error(error.message);
      return data;
    });
  },

  // Production bottleneck analysis
  getProductionBottleneckAnalysis: async () => {
    return withApiLogging('businessIntelligence.getProductionBottleneckAnalysis', async () => {
      // Since we can't directly execute raw SQL, use existing tables
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          design_status,
          production_status,
          material_type,
          quantity,
          unit_price,
          created_at,
          orders!inner(
            customer_id,
            order_date,
            customers!inner(name)
          )
        `)
        .neq('production_status', 'post_process')
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);

      // Process data to identify bottlenecks
      const bottlenecks = data?.map(item => ({
        design_status: item.design_status,
        production_status: item.production_status,
        material_type: item.material_type,
        customer_name: item.orders.customers.name,
        quantity: item.quantity,
        value: item.quantity * item.unit_price,
        days_in_status: Math.floor((Date.now() - new Date(item.orders.order_date).getTime()) / (1000 * 60 * 60 * 24)),
        bottleneck_severity: (() => {
          const days = Math.floor((Date.now() - new Date(item.orders.order_date).getTime()) / (1000 * 60 * 60 * 24));
          if (days > 30) return 'CRITICAL';
          if (days > 14) return 'HIGH';  
          if (days > 7) return 'MEDIUM';
          return 'LOW';
        })(),
        workflow_stage: `${item.design_status} → ${item.production_status}`
      })) || [];

      return bottlenecks.sort((a, b) => b.days_in_status - a.days_in_status);
    });
  },

  // Material waste analysis
  getMaterialWasteAnalysis: async () => {
    return withApiLogging('businessIntelligence.getMaterialWasteAnalysis', async () => {
      const { data, error } = await supabase
        .from('material_stock')
        .select(`
          *,
          customers(name)
        `)
        .gt('total_received', 0);

      if (error) throw new Error(error.message);

      // Process data to calculate waste risk
      const wasteAnalysis = data?.map(stock => {
        const utilization_percentage = (stock.total_delivered / stock.total_received) * 100;
        const excess_stock = stock.current_stock;
        const days_since_last_movement = Math.floor(
          (Date.now() - new Date(stock.last_updated).getTime()) / (1000 * 60 * 60 * 24)
        );

        let waste_risk_category = 'HEALTHY';
        if (utilization_percentage < 50 && stock.current_stock > 20) {
          waste_risk_category = 'HIGH_WASTE_RISK';
        } else if (utilization_percentage < 70 && excess_stock > 10) {
          waste_risk_category = 'MEDIUM_WASTE_RISK';
        } else if (days_since_last_movement > 90 && stock.current_stock > 5) {
          waste_risk_category = 'STAGNANT_STOCK';
        } else if (excess_stock > 50) {
          waste_risk_category = 'OVER_STOCKED';
        }

        const estimated_waste_value = 
          excess_stock > 0 && days_since_last_movement > 60 ? excess_stock * 0.1 : 0;

        return {
          customer_name: stock.customers?.name,
          material_type: stock.material_type,
          total_received: stock.total_received,
          total_delivered: stock.total_delivered,
          current_stock: stock.current_stock,
          utilization_percentage: Math.round(utilization_percentage * 100) / 100,
          excess_stock,
          days_since_last_movement,
          waste_risk_category,
          estimated_waste_value
        };
      }) || [];

      // Sort by risk and estimated waste value
      return wasteAnalysis.sort((a, b) => {
        const riskOrder = { HIGH_WASTE_RISK: 1, OVER_STOCKED: 2, MEDIUM_WASTE_RISK: 3, STAGNANT_STOCK: 4, HEALTHY: 5 };
        return riskOrder[a.waste_risk_category] - riskOrder[b.waste_risk_category] ||
               b.estimated_waste_value - a.estimated_waste_value;
      });
    });
  },

  // Seasonal demand analysis  
  getSeasonalDemandAnalysis: async () => {
    return withApiLogging('businessIntelligence.getSeasonalDemandAnalysis', async () => {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      const { data, error } = await supabase
        .from('order_items')
        .select(`
          quantity,
          unit_price,
          material_type,
          orders!inner(
            order_date,
            customers(name)
          )
        `)
        .gte('orders.order_date', twoYearsAgo.toISOString().split('T')[0])
        .eq('orders.is_deleted', false);

      if (error) throw new Error(error.message);

      // Process seasonal data
      const seasonalData = data?.map(item => {
        const orderDate = new Date(item.orders.order_date);
        const month = orderDate.getMonth() + 1;
        const quarter = Math.ceil(month / 3);
        
        let season = 'Spring';
        if ([12, 1, 2].includes(month)) season = 'Winter';
        else if ([6, 7, 8].includes(month)) season = 'Summer'; 
        else if ([9, 10, 11].includes(month)) season = 'Fall';

        return {
          order_month: month,
          order_quarter: quarter,
          month_name: orderDate.toLocaleString('default', { month: 'long' }),
          season,
          material_type: item.material_type,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_value: item.quantity * item.unit_price
        };
      }) || [];

      // Group and aggregate by season and material type
      const aggregated = seasonalData.reduce((acc, item) => {
        const key = `${item.season}-${item.material_type}`;
        if (!acc[key]) {
          acc[key] = {
            season: item.season,
            material_type: item.material_type,
            order_count: 0,
            total_quantity: 0,
            total_value: 0,
            avg_unit_price: 0
          };
        }
        
        acc[key].order_count += 1;
        acc[key].total_quantity += item.quantity;
        acc[key].total_value += item.total_value;
        acc[key].avg_unit_price = acc[key].total_value / acc[key].total_quantity;
        
        return acc;
      }, {});

      return Object.values(aggregated);
    });
  }
};

export default {
  dashboard: businessDashboardApi,
  inventory: inventoryReportsApi,
  intelligence: businessIntelligenceApi
};