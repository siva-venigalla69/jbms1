import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Button,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Dashboard,
  TrendingUp,
  Inventory,
  Assignment,
  CheckCircle,
  Warning,
  Schedule,
  Search,
  Person,
  Receipt,
  LocalShipping,
  AccountBalance,
  Refresh,
  PictureAsPdf,
} from '@mui/icons-material';
import { Customer } from '../types';
import { orderApi, customerApi } from '../services/supabaseApi';
import { componentLogger } from '../utils/debug';
import PrintService, { PrintConfig } from '../services/printService';

interface SimpleBatch {
  id: string;
  production_batch_number: string;
  batch_status: string;
  actual_quantity: number;
}

interface OrderSummary {
  id: string;
  order_number: string;
  customer_id: string;
  order_date: string;
  delivery_date?: string;
  total_amount: number;
  status?: string;
  customer?: Customer;
  production_batches?: SimpleBatch[];
  total_produced?: number;
  total_delivered?: number;
  completion_percentage?: number;
  status_display?: string;
  days_since_order?: number;
}

interface StockMetrics {
  totalOrders: number;
  completedOrders: number;
  activeOrders: number;
  overdueOrders: number;
  totalValueOrders: number;
  totalValueCompleted: number;
  completionRate: number;
  averageCompletionDays: number;
  topCustomers: Array<{
    customer: Customer;
    orderCount: number;
    totalValue: number;
    completionRate: number;
  }>;
}

const StockReconciliation: React.FC = () => {
  const [ordersSummary, setOrdersSummary] = useState<OrderSummary[]>([]);
  const [metrics, setMetrics] = useState<StockMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadStockData = useCallback(async () => {
    componentLogger.info('Loading stock reconciliation data...');
    try {
      setLoading(true);

      // In a real implementation, we'd fetch actual data from APIs
      // For now, creating comprehensive mock data
      const mockOrdersSummary: OrderSummary[] = [
        {
          id: 'order-1',
          order_number: 'ORD-2024-001',
          customer_id: 'customer-1',
          customer: { id: 'customer-1', name: 'Premium Textiles', phone: '+91-9876543210', email: 'premium@textiles.com', address: 'Mumbai, Maharashtra', gst_number: '27ABCDE1234F1Z5', created_at: '2024-01-01', updated_at: '2024-01-01' },
          order_date: '2024-01-10',
          delivery_date: '2024-02-10',
          total_amount: 125000,
          status: 'in_production',
          total_produced: 450,
          total_delivered: 300,
          completion_percentage: 75,
          status_display: 'In Production',
          days_since_order: 37,
          production_batches: [
            { id: 'batch-1', production_batch_number: 'PB-001', batch_status: 'completed', actual_quantity: 200 },
            { id: 'batch-2', production_batch_number: 'PB-002', batch_status: 'completed', actual_quantity: 150 },
            { id: 'batch-3', production_batch_number: 'PB-003', batch_status: 'production', actual_quantity: 100 }
          ]
        },
        {
          id: 'order-2',
          order_number: 'ORD-2024-002',
          customer_id: 'customer-2',
          customer: { id: 'customer-2', name: 'Royal Fabrics', phone: '+91-9876543211', email: 'royal@fabrics.com', address: 'Delhi, India', gst_number: '07FGHIJ5678K2L9', created_at: '2024-01-01', updated_at: '2024-01-01' },
          order_date: '2024-01-15',
          delivery_date: '2024-02-15',
          total_amount: 87500,
          status: 'completed',
          total_produced: 250,
          total_delivered: 250,
          completion_percentage: 100,
          status_display: 'Completed',
          days_since_order: 32,
          production_batches: [
            { id: 'batch-4', production_batch_number: 'PB-004', batch_status: 'completed', actual_quantity: 250 }
          ]
        },
        {
          id: 'order-3',
          order_number: 'ORD-2024-003',
          customer_id: 'customer-3',
          customer: { id: 'customer-3', name: 'Elite Garments', phone: '+91-9876543212', email: 'elite@garments.com', address: 'Bangalore, Karnataka', gst_number: '29KLMNO9012P3Q6', created_at: '2024-01-01', updated_at: '2024-01-01' },
          order_date: '2024-01-20',
          delivery_date: '2024-02-05',
          total_amount: 156000,
          status: 'overdue',
          total_produced: 180,
          total_delivered: 0,
          completion_percentage: 45,
          status_display: 'Overdue',
          days_since_order: 27,
          production_batches: [
            { id: 'batch-5', production_batch_number: 'PB-005', batch_status: 'completed', actual_quantity: 120 },
            { id: 'batch-6', production_batch_number: 'PB-006', batch_status: 'post_process', actual_quantity: 60 },
            { id: 'batch-7', production_batch_number: 'PB-007', batch_status: 'pending', actual_quantity: 0 }
          ]
        },
        {
          id: 'order-4',
          order_number: 'ORD-2024-004',
          customer_id: 'customer-1',
          customer: { id: 'customer-1', name: 'Premium Textiles', phone: '+91-9876543210', email: 'premium@textiles.com', address: 'Mumbai, Maharashtra', gst_number: '27ABCDE1234F1Z5', created_at: '2024-01-01', updated_at: '2024-01-01' },
          order_date: '2024-01-25',
          delivery_date: '2024-02-25',
          total_amount: 93750,
          status: 'design_pending',
          total_produced: 0,
          total_delivered: 0,
          completion_percentage: 15,
          status_display: 'Design Pending',
          days_since_order: 22,
          production_batches: []
        },
        {
          id: 'order-5',
          order_number: 'ORD-2024-005',
          customer_id: 'customer-4',
          customer: { id: 'customer-4', name: 'Fashion Forward', phone: '+91-9876543213', email: 'fashion@forward.com', address: 'Chennai, Tamil Nadu', gst_number: '33RSTUY4567V8W2', created_at: '2024-01-01', updated_at: '2024-01-01' },
          order_date: '2024-02-01',
          delivery_date: '2024-03-01',
          total_amount: 234000,
          status: 'in_production',
          total_produced: 320,
          total_delivered: 160,
          completion_percentage: 68,
          status_display: 'In Production',
          days_since_order: 15,
          production_batches: [
            { id: 'batch-8', production_batch_number: 'PB-008', batch_status: 'completed', actual_quantity: 160 },
            { id: 'batch-9', production_batch_number: 'PB-009', batch_status: 'completed', actual_quantity: 160 },
            { id: 'batch-10', production_batch_number: 'PB-010', batch_status: 'printing', actual_quantity: 140 }
          ]
        }
      ];

      // Calculate comprehensive metrics
      const totalOrders = mockOrdersSummary.length;
      const completedOrders = mockOrdersSummary.filter(o => o.status === 'completed').length;
      const activeOrders = mockOrdersSummary.filter(o => ['in_production', 'design_pending'].includes(o.status || '')).length;
      const overdueOrders = mockOrdersSummary.filter(o => o.status === 'overdue').length;
      const totalValueOrders = mockOrdersSummary.reduce((sum, o) => sum + o.total_amount, 0);
      const totalValueCompleted = mockOrdersSummary.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.total_amount, 0);
      const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
      const averageCompletionDays = mockOrdersSummary.filter(o => o.status === 'completed').reduce((sum, o) => sum + (o.days_since_order || 0), 0) / completedOrders || 0;

      // Calculate top customers
      const customerStats = mockOrdersSummary.reduce((stats, order) => {
        const customerId = order.customer_id;
        if (!stats[customerId]) {
          stats[customerId] = {
            customer: order.customer!,
            orderCount: 0,
            totalValue: 0,
            completedOrders: 0
          };
        }
        stats[customerId].orderCount++;
        stats[customerId].totalValue += order.total_amount;
        if (order.status === 'completed') {
          stats[customerId].completedOrders++;
        }
        return stats;
      }, {} as any);

      const topCustomers = Object.values(customerStats).map((stat: any) => ({
        customer: stat.customer,
        orderCount: stat.orderCount,
        totalValue: stat.totalValue,
        completionRate: stat.orderCount > 0 ? (stat.completedOrders / stat.orderCount) * 100 : 0
      })).sort((a, b) => b.totalValue - a.totalValue).slice(0, 5);

      const calculatedMetrics: StockMetrics = {
        totalOrders,
        completedOrders,
        activeOrders,
        overdueOrders,
        totalValueOrders,
        totalValueCompleted,
        completionRate,
        averageCompletionDays,
        topCustomers
      };

      setOrdersSummary(mockOrdersSummary);
      setMetrics(calculatedMetrics);
      componentLogger.info('Stock reconciliation data loaded successfully', { totalOrders, completedOrders });
    } catch (error: any) {
      componentLogger.error('Failed to load stock reconciliation data', error);
      setError('Failed to load stock data: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStockData();
  }, [loadStockData]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_production':
        return 'info';
      case 'design_pending':
        return 'warning';
      case 'overdue':
        return 'error';
      default:
        return 'default';
    }
  };

  const getCompletionColor = (percentage: number) => {
    if (percentage >= 90) return 'success';
    if (percentage >= 60) return 'info';
    if (percentage >= 30) return 'warning';
    return 'error';
  };

  const filteredOrders = ordersSummary.filter((order) => {
    const matchesSearch =
      order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || order.status === statusFilter;
    const matchesCustomer = !customerFilter || order.customer_id === customerFilter;

    return matchesSearch && matchesStatus && matchesCustomer;
  });

  const handlePrintStockReport = useCallback(() => {
    try {
      if (!metrics || filteredOrders.length === 0) {
        setError('No data available for report generation');
        return;
      }

      const config: PrintConfig = {
        title: `STOCK RECONCILIATION REPORT`,
        subtitle: `Generated on ${new Date().toLocaleDateString('en-IN')}`,
        data: filteredOrders.map((order, index) => ({
          index: index + 1,
          order_number: order.order_number,
          customer_name: order.customer?.name || 'Unknown',
          order_date: order.order_date,
          delivery_date: order.delivery_date,
          status: order.status_display,
          total_produced: order.total_produced,
          total_delivered: order.total_delivered,
          completion_percentage: order.completion_percentage,
          total_amount: order.total_amount,
          days_since_order: order.days_since_order
        })),
        columns: [
          { header: 'S.No', dataKey: 'index', align: 'center' },
          { header: 'Order No', dataKey: 'order_number' },
          { header: 'Customer', dataKey: 'customer_name' },
          { header: 'Order Date', dataKey: 'order_date', format: 'date' },
          { header: 'Delivery Date', dataKey: 'delivery_date', format: 'date' },
          { header: 'Status', dataKey: 'status' },
          { header: 'Produced', dataKey: 'total_produced', align: 'right', format: 'number' },
          { header: 'Delivered', dataKey: 'total_delivered', align: 'right', format: 'number' },
          { header: 'Progress', dataKey: 'completion_percentage', align: 'right', format: 'number' },
          { header: 'Value', dataKey: 'total_amount', align: 'right', format: 'currency' },
          { header: 'Days', dataKey: 'days_since_order', align: 'right', format: 'number' }
        ],
        summary: [
          { label: 'Total Orders', value: metrics.totalOrders, format: 'number' },
          { label: 'Completed Orders', value: metrics.completedOrders, format: 'number' },
          { label: 'Active Orders', value: metrics.activeOrders, format: 'number' },
          { label: 'Overdue Orders', value: metrics.overdueOrders, format: 'number' },
          { label: 'Total Value', value: metrics.totalValueOrders, format: 'currency' },
          { label: 'Completed Value', value: metrics.totalValueCompleted, format: 'currency' },
          { label: 'Completion Rate', value: metrics.completionRate, format: 'number' },
          { label: 'Avg Completion Days', value: metrics.averageCompletionDays, format: 'number' }
        ]
      };

      PrintService.generatePDF(config);
      componentLogger.info('Stock reconciliation report generated successfully');
    } catch (error: any) {
      setError('Failed to generate stock report: ' + error.message);
    }
  }, [filteredOrders, metrics]);

  const statusOptions = [
    { value: 'design_pending', label: 'Design Pending' },
    { value: 'in_production', label: 'In Production' },
    { value: 'completed', label: 'Completed' },
    { value: 'overdue', label: 'Overdue' }
  ];

  const uniqueCustomers = Array.from(new Set(ordersSummary.map(o => o.customer_id)))
    .map(id => ordersSummary.find(o => o.customer_id === id)?.customer)
    .filter(Boolean);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Dashboard />
          <Typography variant="h4" fontWeight="bold">
            Stock Reconciliation Dashboard
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadStockData}
          >
            Refresh Data
          </Button>
          <Button
            variant="contained"
            startIcon={<PictureAsPdf />}
            onClick={handlePrintStockReport}
            disabled={filteredOrders.length === 0}
          >
            Generate Report
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {metrics && (
        <>
          {/* Key Metrics Cards */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3, mb: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Assignment sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" color="text.secondary">
                    Total Orders
                  </Typography>
                </Box>
                <Typography variant="h3" fontWeight="bold" color="primary.main">
                  {metrics.totalOrders}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ₹{metrics.totalValueOrders.toLocaleString()} total value
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CheckCircle sx={{ mr: 1, color: 'success.main' }} />
                  <Typography variant="h6" color="text.secondary">
                    Completed Orders
                  </Typography>
                </Box>
                <Typography variant="h3" fontWeight="bold" color="success.main">
                  {metrics.completedOrders}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {metrics.completionRate.toFixed(1)}% completion rate
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Schedule sx={{ mr: 1, color: 'info.main' }} />
                  <Typography variant="h6" color="text.secondary">
                    Active Orders
                  </Typography>
                </Box>
                <Typography variant="h3" fontWeight="bold" color="info.main">
                  {metrics.activeOrders}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Currently in production
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Warning sx={{ mr: 1, color: 'error.main' }} />
                  <Typography variant="h6" color="text.secondary">
                    Overdue Orders
                  </Typography>
                </Box>
                <Typography variant="h3" fontWeight="bold" color="error.main">
                  {metrics.overdueOrders}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Require immediate attention
                </Typography>
              </CardContent>
            </Card>
          </Box>

          {/* Top Customers */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Customers by Value
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                {metrics.topCustomers.map((customerStat, index) => (
                  <Card key={index} variant="outlined">
                    <CardContent sx={{ p: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        #{index + 1}
                      </Typography>
                      <Typography variant="h6" gutterBottom>
                        {customerStat.customer.name}
                      </Typography>
                      <Typography variant="body2" color="primary.main" fontWeight="medium">
                        ₹{customerStat.totalValue.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {customerStat.orderCount} orders • {customerStat.completionRate.toFixed(0)}% completed
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </CardContent>
          </Card>
        </>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
            <Box sx={{ flex: 2 }}>
              <TextField
                fullWidth
                placeholder="Search by order number or customer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  {statusOptions.map((status) => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: 1 }}>
              <FormControl fullWidth>
                <InputLabel>Customer</InputLabel>
                <Select
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  label="Customer"
                >
                  <MenuItem value="">All Customers</MenuItem>
                  {uniqueCustomers.map((customer) => (
                    <MenuItem key={customer!.id} value={customer!.id}>
                      {customer!.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Inventory sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                {searchTerm || statusFilter || customerFilter ? 'No orders found matching your criteria' : 'No orders available'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {searchTerm || statusFilter || customerFilter ? 'Try adjusting your search or filters' : 'Orders will appear here once created'}
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Order Number</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Order Date</TableCell>
                    <TableCell>Delivery Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Progress</TableCell>
                    <TableCell>Produced</TableCell>
                    <TableCell>Delivered</TableCell>
                    <TableCell>Value</TableCell>
                    <TableCell>Days</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Receipt sx={{ mr: 1, color: 'text.secondary' }} />
                          {order.order_number}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Person sx={{ mr: 1, color: 'text.secondary' }} />
                          {order.customer?.name}
                        </Box>
                      </TableCell>
                      <TableCell>{new Date(order.order_date).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(order.delivery_date!).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Chip
                          label={order.status_display}
                          color={getStatusColor(order.status!) as any}
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 100 }}>
                            <LinearProgress
                              variant="determinate"
                              value={order.completion_percentage || 0}
                              color={getCompletionColor(order.completion_percentage || 0) as any}
                              sx={{ height: 8, borderRadius: 4 }}
                            />
                          </Box>
                          <Typography variant="body2" fontWeight="medium">
                            {order.completion_percentage}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium" color="info.main">
                          {order.total_produced || 0}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium" color="success.main">
                          {order.total_delivered || 0}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          ₹{order.total_amount.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {order.days_since_order} days
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default StockReconciliation;