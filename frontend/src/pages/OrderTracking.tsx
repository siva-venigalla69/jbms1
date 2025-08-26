import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Tooltip,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  LocalShipping as ShippingIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  Timeline as TimelineIcon,
  Inventory as InventoryIcon
} from '@mui/icons-material';
import { deliveryChallanApi } from '../services/supabaseApi';
import { componentLogger } from '../utils/debug';

interface OrderDeliveryStatus {
  order_id: string;
  order_number: string;
  order_date: string;
  customer_name: string;
  customer_id: string;
  total_amount: number;
  delivery_status: string;
  delivery_progress_percent: number;
  total_items: number;
  total_quantity_ordered: number;
  total_quantity_delivered: number;
  total_quantity_remaining: number;
  actual_delivery_progress_percent: number;
  calculated_delivery_status: string;
  total_challans_created: number;
  last_challan_date: string;
  challan_numbers: string;
  expected_completion_date: string;
  last_delivery_date: string;
  is_overdue: boolean;
}

interface OrderItemDetail {
  order_item_id: string;
  order_id: string;
  order_number: string;
  customer_name: string;
  material_type_name: string;
  ordered_quantity: number;
  delivered_quantity: number;
  remaining_quantity: number;
  unit_price: number;
  total_value: number;
  delivered_value: number;
  remaining_value: number;
  design_url: string;
  design_notes: string;
  design_ready: boolean;
  print_priority: number;
  production_stage_name: string;
  stage_completed_at: string;
  delivery_progress_percent: number;
  delivery_status: string;
  total_deliveries: number;
  delivery_history: string;
  last_delivery_date: string;
}

interface PendingDelivery {
  customer_name: string;
  customer_id: string;
  order_number: string;
  order_id: string;
  order_date: string;
  expected_completion_date: string;
  material_type: string;
  ordered_qty: number;
  delivered_qty: number;
  pending_qty: number;
  unit_price: number;
  pending_value: number;
  design_ready: boolean;
  print_priority: number;
  production_stage: string;
  urgency_level: string;
  days_until_due: number;
}

const OrderTracking: React.FC = () => {
  const [orderDeliveryStatus, setOrderDeliveryStatus] = useState<OrderDeliveryStatus[]>([]);
  const [pendingDeliveries, setPendingDeliveries] = useState<PendingDelivery[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderDeliveryStatus | null>(null);
  const [orderItemDetails, setOrderItemDetails] = useState<OrderItemDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');

  useEffect(() => {
    loadOrderTrackingData();
  }, []);

  const loadOrderTrackingData = async () => {
    try {
      setLoading(true);
      setError(null);
      componentLogger.info('Loading order tracking data');

      const [orderStatusData, pendingData] = await Promise.all([
        deliveryChallanApi.getOrderDeliveryStatus(),
        deliveryChallanApi.getPendingDeliveries()
      ]);

      setOrderDeliveryStatus(orderStatusData);
      setPendingDeliveries(pendingData);
      componentLogger.info('Order tracking data loaded', {
        orders: orderStatusData.length,
        pending: pendingData.length
      });
    } catch (err: any) {
      componentLogger.error('Failed to load order tracking data', err);
      setError('Failed to load order tracking data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadOrderItemDetails = async (orderId: string) => {
    try {
      const itemDetails = await deliveryChallanApi.getOrderItemDeliveryDetails();
      const orderItems = itemDetails.filter(item => item.order_id === orderId);
      setOrderItemDetails(orderItems);
    } catch (err: any) {
      componentLogger.error('Failed to load order item details', err);
      setError('Failed to load order item details: ' + err.message);
    }
  };

  const handleViewOrderDetails = async (order: OrderDeliveryStatus) => {
    setSelectedOrder(order);
    await loadOrderItemDetails(order.order_id);
    setDetailsDialogOpen(true);
  };

  const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'warning';
      case 'not_started': return 'error';
      case 'overdue': return 'error';
      default: return 'default';
    }
  };

  const getUrgencyColor = (urgency: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (urgency) {
      case 'overdue': return 'error';
      case 'urgent': return 'warning';
      case 'upcoming': return 'info';
      default: return 'default';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  // Filter functions
  const filteredOrders = orderDeliveryStatus.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customer_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.calculated_delivery_status === statusFilter;
    const matchesCustomer = customerFilter === 'all' || order.customer_id === customerFilter;
    
    return matchesSearch && matchesStatus && matchesCustomer;
  });

  const uniqueCustomers = Array.from(new Set(orderDeliveryStatus.map(o => ({ id: o.customer_id, name: o.customer_name }))))
    .map(({ id, name }) => ({ id, name }));

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>Order Tracking Dashboard</Typography>
        <LinearProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>Order Tracking Dashboard</Typography>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TimelineIcon />
        Order Tracking Dashboard
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <div>
                  <Typography color="textSecondary" gutterBottom>Total Orders</Typography>
                  <Typography variant="h4">{orderDeliveryStatus.length}</Typography>
                </div>
                <AssignmentIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <div>
                  <Typography color="textSecondary" gutterBottom>Completed</Typography>
                  <Typography variant="h4">
                    {orderDeliveryStatus.filter(o => o.calculated_delivery_status === 'completed').length}
                  </Typography>
                </div>
                <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <div>
                  <Typography color="textSecondary" gutterBottom>In Progress</Typography>
                  <Typography variant="h4">
                    {orderDeliveryStatus.filter(o => o.calculated_delivery_status === 'in_progress').length}
                  </Typography>
                </div>
                <ShippingIcon color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <div>
                  <Typography color="textSecondary" gutterBottom>Overdue</Typography>
                  <Typography variant="h4" color="error">
                    {orderDeliveryStatus.filter(o => o.is_overdue).length}
                  </Typography>
                </div>
                <WarningIcon color="error" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              placeholder="Search orders or customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth>
              <InputLabel>Delivery Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Delivery Status"
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="not_started">Not Started</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth>
              <InputLabel>Customer</InputLabel>
              <Select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                label="Customer"
              >
                <MenuItem value="all">All Customers</MenuItem>
                {uniqueCustomers.map((customer) => (
                  <MenuItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Orders Table */}
      <Paper sx={{ mb: 4 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Order Number</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Order Date</TableCell>
                <TableCell>Total Amount</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Items</TableCell>
                <TableCell>Challans</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.order_id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {order.order_number}
                    </Typography>
                  </TableCell>
                  <TableCell>{order.customer_name}</TableCell>
                  <TableCell>{formatDate(order.order_date)}</TableCell>
                  <TableCell>{formatCurrency(order.total_amount)}</TableCell>
                  <TableCell>
                    <Box sx={{ width: '100%', mr: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={order.actual_delivery_progress_percent} 
                        sx={{ mb: 1 }}
                      />
                      <Typography variant="caption">
                        {order.actual_delivery_progress_percent.toFixed(1)}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={order.calculated_delivery_status.replace('_', ' ')}
                      color={getStatusColor(order.calculated_delivery_status)}
                      size="small"
                    />
                    {order.is_overdue && (
                      <Chip 
                        label="Overdue"
                        color="error"
                        size="small"
                        sx={{ ml: 0.5 }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {order.total_quantity_delivered}/{order.total_quantity_ordered}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {order.total_items} items
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {order.total_challans_created} challans
                    </Typography>
                    {order.last_challan_date && (
                      <Typography variant="caption" color="textSecondary">
                        Last: {formatDate(order.last_challan_date)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View Details">
                      <IconButton 
                        onClick={() => handleViewOrderDetails(order)}
                        size="small"
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Pending Deliveries Section */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InventoryIcon />
            Pending Deliveries ({pendingDeliveries.length} items)
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Customer</TableCell>
                  <TableCell>Order</TableCell>
                  <TableCell>Material</TableCell>
                  <TableCell>Pending Qty</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Urgency</TableCell>
                  <TableCell>Design Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingDeliveries.slice(0, 20).map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.customer_name}</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {item.order_number}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {formatDate(item.order_date)}
                      </Typography>
                    </TableCell>
                    <TableCell>{item.material_type}</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {item.pending_qty} / {item.ordered_qty}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatCurrency(item.pending_value)}</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(item.expected_completion_date)}
                      </Typography>
                      {item.days_until_due !== null && (
                        <Typography variant="caption" color="textSecondary">
                          {item.days_until_due > 0 ? `${item.days_until_due} days` : 'Overdue'}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={item.urgency_level}
                        color={getUrgencyColor(item.urgency_level)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={item.design_ready ? 'Ready' : 'Pending'}
                        color={item.design_ready ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>

      {/* Order Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Order Details - {selectedOrder?.order_number}
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="h6" gutterBottom>Order Summary</Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography><strong>Customer:</strong> {selectedOrder.customer_name}</Typography>
                  <Typography><strong>Order Date:</strong> {formatDate(selectedOrder.order_date)}</Typography>
                  <Typography><strong>Total Amount:</strong> {formatCurrency(selectedOrder.total_amount)}</Typography>
                  <Typography><strong>Expected Completion:</strong> {formatDate(selectedOrder.expected_completion_date)}</Typography>
                </Box>
                <Typography variant="h6" gutterBottom>Delivery Progress</Typography>
                <Box sx={{ mb: 2 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={selectedOrder.actual_delivery_progress_percent} 
                    sx={{ mb: 1, height: 10 }}
                  />
                  <Typography>
                    {selectedOrder.actual_delivery_progress_percent.toFixed(1)}% Complete
                  </Typography>
                  <Typography color="textSecondary">
                    {selectedOrder.total_quantity_delivered} of {selectedOrder.total_quantity_ordered} items delivered
                  </Typography>
                </Box>
                <Typography variant="h6" gutterBottom>Challans</Typography>
                <Typography>{selectedOrder.challan_numbers || 'No challans created yet'}</Typography>
              </Grid>
              
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="h6" gutterBottom>Item Details</Typography>
                {orderItemDetails.length > 0 ? (
                  <TableContainer sx={{ maxHeight: 400 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Material</TableCell>
                          <TableCell>Ordered</TableCell>
                          <TableCell>Delivered</TableCell>
                          <TableCell>Remaining</TableCell>
                          <TableCell>Progress</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {orderItemDetails.map((item) => (
                          <TableRow key={item.order_item_id}>
                            <TableCell>{item.material_type_name}</TableCell>
                            <TableCell>{item.ordered_quantity}</TableCell>
                            <TableCell>{item.delivered_quantity}</TableCell>
                            <TableCell>{item.remaining_quantity}</TableCell>
                            <TableCell>
                              <LinearProgress 
                                variant="determinate" 
                                value={item.delivery_progress_percent} 
                                sx={{ width: 60 }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography color="textSecondary">No item details available</Typography>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default OrderTracking;