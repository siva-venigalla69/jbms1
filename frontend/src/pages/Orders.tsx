import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Autocomplete,
  Divider,
} from '@mui/material';
import {
  Add,
  Search,
  ShoppingCart,
  Person,
  CalendarToday,
  Delete,
  Edit,
  Visibility,
  DateRange,
} from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Order, Customer } from '../types';
import { orderApi, orderItemApi, customerApi } from '../services/supabaseApi';
import { componentLogger } from '../utils/debug';

// Form validation schema
const orderCreateSchema = yup.object({
  customer_id: yup.string().required('Customer is required'),
  notes: yup.string(),
  items: yup.array().of(
    yup.object({
      material_type: yup.string().required('Material type is required'),
      quantity: yup.number().positive('Quantity must be positive').required('Quantity is required'),
      unit_price: yup.number().min(0, 'Price cannot be negative').required('Unit price is required'),
      customization_details: yup.string(),
      design_received: yup.string(),
      design_ready: yup.string(),
      design_notes: yup.string(),
    })
  ).min(1, 'At least one item is required'),
});

const orderEditSchema = yup.object({
  customer_id: yup.string().required('Customer is required'),
  status: yup.string().required('Status is required'),
  notes: yup.string(),
  items: yup.array().of(
    yup.object({
      material_type: yup.string().required('Material type is required'),
      quantity: yup.number().positive('Quantity must be positive').required('Quantity is required'),
      unit_price: yup.number().min(0, 'Price cannot be negative').required('Unit price is required'),
      customization_details: yup.string(),
      design_received: yup.string(),
      design_ready: yup.string(),
      design_notes: yup.string(),
    })
  ).min(1, 'At least one item is required'),
});

const materialTypes = [
  { value: 'saree', label: 'Saree' },
  { value: 'dupatta', label: 'Dupatta' },
  { value: 'voni', label: 'Voni' },
  { value: 'running_material', label: 'Running Material' },
  { value: 'blouse_material', label: 'Blouse Material' },
];

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerSearch, setCustomerSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Create order form
  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(orderCreateSchema),
    defaultValues: {
      customer_id: '',
      notes: '',
      items: [
        {
          material_type: 'saree',
          quantity: 1,
          unit_price: 0,
          customization_details: '',
          design_received: '',
          design_ready: '',
          design_notes: '',
        },
      ],
    },
  });

  // Edit order form
  const { 
    control: editControl, 
    handleSubmit: handleEditSubmit, 
    reset: editReset, 
    formState: { errors: editErrors, isSubmitting: isEditSubmitting } 
  } = useForm({
    resolver: yupResolver(orderEditSchema),
    defaultValues: {
      customer_id: '',
      status: 'pending',
      notes: '',
      items: [
        {
          material_type: 'saree',
          quantity: 1,
          unit_price: 0,
          customization_details: '',
          design_received: '',
          design_ready: '',
          design_notes: '',
        },
      ],
    },
  });

  // Edit order field array for items
  const { fields: editFields, append: editAppend, remove: editRemove } = useFieldArray({
    control: editControl,
    name: 'items',
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const loadOrders = useCallback(async () => {
    componentLogger.info('Loading orders...');
    try {
      setLoading(true);
      const ordersData = await orderApi.getOrders();
      componentLogger.info('Orders loaded successfully', { count: ordersData.length });
      setOrders(ordersData);
    } catch (error: any) {
      componentLogger.error('Failed to load orders', error);
      setError('Failed to load orders: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    componentLogger.info('Loading customers...');
    try {
      const customersData = await customerApi.getCustomers();
      componentLogger.info('Customers loaded successfully', { count: customersData.length });
      setCustomers(customersData);
      setFilteredCustomers(customersData);
    } catch (error: any) {
      componentLogger.error('Failed to load customers', error);
      setError('Failed to load customers: ' + error.message);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    loadCustomers();
  }, [loadOrders, loadCustomers]);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Filter customers based on search
  useEffect(() => {
    if (customerSearch.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        customer.email?.toLowerCase().includes(customerSearch.toLowerCase()) ||
        customer.phone?.includes(customerSearch)
      );
      setFilteredCustomers(filtered);
    }
  }, [customerSearch, customers]);

  const handleCreateOrder = () => {
    componentLogger.info('Opening create order dialog');
    reset();
    setDialogOpen(true);
  };

  const onSubmit = async (data: any) => {
    componentLogger.info('Submitting order creation', data);
    try {
      const orderData = {
        customer_id: data.customer_id,
        notes: data.notes,
        items: data.items.map((item: any) => ({
          material_type: item.material_type,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          customization_details: item.customization_details,
        })),
      };

      componentLogger.debug('Final order data being sent', orderData);
      
      const createdOrder = await orderApi.createOrder(orderData);
      
      componentLogger.info('Order created successfully', { 
        orderId: createdOrder.id, 
        orderNumber: createdOrder.order_number 
      });
      
      setSuccess(`Order ${createdOrder.order_number} created successfully`);
      setDialogOpen(false);
      loadOrders();
    } catch (error: any) {
      componentLogger.error('Failed to create order', { 
        error: error.message, 
        stack: error.stack,
        originalData: data
      });
      setError('Failed to create order: ' + error.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'in_progress': return 'info';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = 
      order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    const orderDate = new Date(order.created_at);
    const matchesFromDate = !fromDate || orderDate >= new Date(fromDate);
    const matchesToDate = !toDate || orderDate <= new Date(toDate + 'T23:59:59');
    
    return matchesSearch && matchesStatus && matchesFromDate && matchesToDate;
  });

  const addOrderItem = () => {
    append({
      material_type: 'saree',
      quantity: 1,
      unit_price: 0,
      customization_details: '',
      design_received: '',
      design_ready: '',
      design_notes: '',
    });
  };

  const removeOrderItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  // Edit order item helper functions
  const addEditOrderItem = () => {
    editAppend({
      material_type: 'saree',
      quantity: 1,
      unit_price: 0,
      customization_details: '',
    });
  };

  const removeEditOrderItem = (index: number) => {
    if (editFields.length > 1) {
      editRemove(index);
    }
  };

  const handleViewOrder = async (orderId: string) => {
    componentLogger.info('Viewing order details', { orderId });
    try {
      const orderDetails = await orderApi.getOrder(orderId);
      setSelectedOrder(orderDetails);
      setViewDialogOpen(true);
    } catch (error: any) {
      componentLogger.error('Failed to load order details', error);
      setError('Failed to load order details: ' + error.message);
    }
  };

  const handleEditOrder = async (orderId: string) => {
    componentLogger.info('Opening edit order dialog', { orderId });
    try {
      const orderDetails = await orderApi.getOrder(orderId);
      setSelectedOrder(orderDetails);
      // Reset edit form with order data
      editReset({
        customer_id: orderDetails.customer_id,
        status: orderDetails.status || 'pending',
        notes: orderDetails.notes || '',
        items: orderDetails.order_items?.map(item => ({
          material_type: item.material_type,
          quantity: item.quantity,
          unit_price: item.unit_price,
          customization_details: item.customization_details || '',
        })) || [],
      });
      setEditDialogOpen(true);
    } catch (error: any) {
      componentLogger.error('Failed to load order for editing', error);
      setError('Failed to load order for editing: ' + error.message);
    }
  };

  const handleUpdateOrder = async (data: any) => {
    if (!selectedOrder) return;
    
    componentLogger.info('Updating order with items', { orderId: selectedOrder.id, data });
    try {
      // Update basic order information
      const orderUpdateData = {
        status: data.status,
        customer_id: data.customer_id,
        notes: data.notes,
        updated_at: new Date().toISOString(),
      };

      await orderApi.updateOrder(selectedOrder.id, orderUpdateData);

      // Handle order items changes
      const existingItems = selectedOrder.order_items || [];
      const newItems = data.items || [];

      // Create a map of existing items by their position/index for easier comparison
      const existingItemsMap = new Map(existingItems.map((item, index) => [index, item]));

      // Process each new item
      for (let i = 0; i < newItems.length; i++) {
        const newItem = newItems[i];
        const existingItem = existingItemsMap.get(i);

        if (existingItem) {
          // Update existing item if it has changed
          const hasChanged = 
            existingItem.material_type !== newItem.material_type ||
            existingItem.quantity !== newItem.quantity ||
            existingItem.unit_price !== newItem.unit_price ||
            (existingItem.customization_details || '') !== (newItem.customization_details || '');

          if (hasChanged) {
            await orderItemApi.updateOrderItem(existingItem.id, {
              material_type: newItem.material_type,
              quantity: newItem.quantity,
              unit_price: newItem.unit_price,
              customization_details: newItem.customization_details || null,
            });
          }
        } else {
          // Create new item
          await orderItemApi.createOrderItem({
            order_id: selectedOrder.id,
            material_type: newItem.material_type,
            quantity: newItem.quantity,
            unit_price: newItem.unit_price,
            customization_details: newItem.customization_details || null,
          });
        }
      }

      // Delete items that were removed (if new items array is shorter)
      if (newItems.length < existingItems.length) {
        for (let i = newItems.length; i < existingItems.length; i++) {
          const itemToDelete = existingItems[i];
          if (itemToDelete?.id) {
            await orderItemApi.deleteOrderItem(itemToDelete.id);
          }
        }
      }

      // Recalculate and update order total
      const newTotal = newItems.reduce((sum: number, item: any) => 
        sum + (item.quantity * item.unit_price), 0);
      
      await orderApi.updateOrder(selectedOrder.id, {
        total_amount: newTotal,
        updated_at: new Date().toISOString(),
      });
      
      setSuccess(`Order ${selectedOrder.order_number} updated successfully with ${newItems.length} items`);
      setEditDialogOpen(false);
      setSelectedOrder(null);
      loadOrders();
    } catch (error: any) {
      componentLogger.error('Failed to update order', error);
      setError('Failed to update order: ' + error.message);
    }
  };

  const handleDeleteOrder = async (orderId: string, orderNumber: string) => {
    componentLogger.info('Deleting order', { orderId, orderNumber });
    
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete order ${orderNumber}? This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      await orderApi.deleteOrder(orderId);
      setSuccess(`Order ${orderNumber} deleted successfully`);
      loadOrders();
    } catch (error: any) {
      componentLogger.error('Failed to delete order', error);
      setError('Failed to delete order: ' + error.message);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Order Management
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleCreateOrder} sx={{ px: 3 }}>
          Create Order
        </Button>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Summary Cards - Clickable Status Filters */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 3, mb: 3 }}>
        <Card 
          sx={{ 
            cursor: 'pointer', 
            transition: 'all 0.2s',
            transform: statusFilter === 'all' ? 'scale(1.02)' : 'scale(1)',
            boxShadow: statusFilter === 'all' ? 3 : 1,
            borderColor: statusFilter === 'all' ? 'primary.main' : 'transparent',
            borderWidth: 2,
            borderStyle: 'solid',
            '&:hover': { transform: 'scale(1.02)', boxShadow: 3 }
          }}
          onClick={() => setStatusFilter('all')}
        >
          <CardContent>
            <Typography variant="h6" color={statusFilter === 'all' ? 'primary.main' : 'text.secondary'} gutterBottom>
              ALL ORDERS
            </Typography>
            <Typography variant="h4" fontWeight="bold" color={statusFilter === 'all' ? 'primary.main' : 'inherit'}>
              {orders.length}
            </Typography>
            {statusFilter === 'all' && (
              <Typography variant="caption" color="primary.main" sx={{ mt: 1, display: 'block' }}>
                Currently viewing all orders
              </Typography>
            )}
          </CardContent>
        </Card>
        
        <Card 
          sx={{ 
            cursor: 'pointer', 
            transition: 'all 0.2s',
            transform: statusFilter === 'pending' ? 'scale(1.02)' : 'scale(1)',
            boxShadow: statusFilter === 'pending' ? 3 : 1,
            borderColor: statusFilter === 'pending' ? 'warning.main' : 'transparent',
            borderWidth: 2,
            borderStyle: 'solid',
            '&:hover': { transform: 'scale(1.02)', boxShadow: 3 }
          }}
          onClick={() => setStatusFilter('pending')}
        >
          <CardContent>
            <Typography variant="h6" color={statusFilter === 'pending' ? 'warning.main' : 'text.secondary'} gutterBottom>
              PENDING
            </Typography>
            <Typography variant="h4" fontWeight="bold" color={statusFilter === 'pending' ? 'warning.main' : 'inherit'}>
              {orders.filter(o => o.status === 'pending').length}
            </Typography>
            {statusFilter === 'pending' && (
              <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: 'block' }}>
                Showing pending orders only
              </Typography>
            )}
          </CardContent>
        </Card>
        
        <Card 
          sx={{ 
            cursor: 'pointer', 
            transition: 'all 0.2s',
            transform: statusFilter === 'in_progress' ? 'scale(1.02)' : 'scale(1)',
            boxShadow: statusFilter === 'in_progress' ? 3 : 1,
            borderColor: statusFilter === 'in_progress' ? 'info.main' : 'transparent',
            borderWidth: 2,
            borderStyle: 'solid',
            '&:hover': { transform: 'scale(1.02)', boxShadow: 3 }
          }}
          onClick={() => setStatusFilter('in_progress')}
        >
          <CardContent>
            <Typography variant="h6" color={statusFilter === 'in_progress' ? 'info.main' : 'text.secondary'} gutterBottom>
              IN PROGRESS
            </Typography>
            <Typography variant="h4" fontWeight="bold" color={statusFilter === 'in_progress' ? 'info.main' : 'inherit'}>
              {orders.filter(o => o.status === 'in_progress').length}
            </Typography>
            {statusFilter === 'in_progress' && (
              <Typography variant="caption" color="info.main" sx={{ mt: 1, display: 'block' }}>
                Showing in-progress orders only
              </Typography>
            )}
          </CardContent>
        </Card>
        
        <Card 
          sx={{ 
            cursor: 'pointer', 
            transition: 'all 0.2s',
            transform: statusFilter === 'completed' ? 'scale(1.02)' : 'scale(1)',
            boxShadow: statusFilter === 'completed' ? 3 : 1,
            borderColor: statusFilter === 'completed' ? 'success.main' : 'transparent',
            borderWidth: 2,
            borderStyle: 'solid',
            '&:hover': { transform: 'scale(1.02)', boxShadow: 3 }
          }}
          onClick={() => setStatusFilter('completed')}
        >
          <CardContent>
            <Typography variant="h6" color={statusFilter === 'completed' ? 'success.main' : 'text.secondary'} gutterBottom>
              COMPLETED
            </Typography>
            <Typography variant="h4" fontWeight="bold" color={statusFilter === 'completed' ? 'success.main' : 'inherit'}>
              {orders.filter(o => o.status === 'completed').length}
            </Typography>
            {statusFilter === 'completed' && (
              <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
                Showing completed orders only
              </Typography>
            )}
          </CardContent>
        </Card>
        
        <Card 
          sx={{ 
            cursor: 'pointer', 
            transition: 'all 0.2s',
            transform: statusFilter === 'cancelled' ? 'scale(1.02)' : 'scale(1)',
            boxShadow: statusFilter === 'cancelled' ? 3 : 1,
            borderColor: statusFilter === 'cancelled' ? 'error.main' : 'transparent',
            borderWidth: 2,
            borderStyle: 'solid',
            '&:hover': { transform: 'scale(1.02)', boxShadow: 3 }
          }}
          onClick={() => setStatusFilter('cancelled')}
        >
          <CardContent>
            <Typography variant="h6" color={statusFilter === 'cancelled' ? 'error.main' : 'text.secondary'} gutterBottom>
              CANCELLED
            </Typography>
            <Typography variant="h4" fontWeight="bold" color={statusFilter === 'cancelled' ? 'error.main' : 'inherit'}>
              {orders.filter(o => o.status === 'cancelled').length}
            </Typography>
            {statusFilter === 'cancelled' && (
              <Typography variant="caption" color="error.main" sx={{ mt: 1, display: 'block' }}>
                Showing cancelled orders only
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', lg: 'row' }, flexWrap: 'wrap' }}>
            {/* Search Field */}
            <Box sx={{ flex: 2, minWidth: 250 }}>
              <TextField
                fullWidth
                placeholder="Search orders by order number or customer name..."
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
            
            {/* Status Filter Dropdown */}
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <FormControl fullWidth>
                <InputLabel>Filter by Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Filter by Status"
                >
                  <MenuItem value="all">All Orders</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Date Range Filters */}
            <Box sx={{ flex: 1, minWidth: 150 }}>
              <TextField
                fullWidth
                type="date"
                label="From Date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <DateRange />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            
            <Box sx={{ flex: 1, minWidth: 150 }}>
              <TextField
                fullWidth
                type="date"
                label="To Date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <DateRange />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            
            {/* Clear Filters Button */}
            {(searchTerm || statusFilter !== 'all' || fromDate || toDate) && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setFromDate('');
                    setToDate('');
                  }}
                  sx={{ height: 'fit-content', alignSelf: 'center' }}
                >
                  Clear Filters
                </Button>
              </Box>
            )}
          </Box>
          
          {/* Active Filters Display */}
          {(searchTerm || statusFilter !== 'all') && (
            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Active filters:
              </Typography>
              {searchTerm && (
                <Chip
                  label={`Search: "${searchTerm}"`}
                  size="small"
                  onDelete={() => setSearchTerm('')}
                  deleteIcon={<Delete />}
                />
              )}
              {statusFilter !== 'all' && (
                <Chip
                  label={`Status: ${statusFilter.replace('_', ' ').toUpperCase()}`}
                  size="small"
                  onDelete={() => setStatusFilter('all')}
                  deleteIcon={<Delete />}
                  color={
                    statusFilter === 'pending' ? 'warning' :
                    statusFilter === 'in_progress' ? 'info' :
                    statusFilter === 'completed' ? 'success' :
                    statusFilter === 'cancelled' ? 'error' : 'default'
                  }
                />
              )}
              <Typography variant="body2" color="text.secondary">
                ({filteredOrders.length} of {orders.length} orders)
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredOrders.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <ShoppingCart sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                {searchTerm || statusFilter !== 'all' 
                  ? `No ${statusFilter !== 'all' ? statusFilter.replace('_', ' ') + ' ' : ''}orders found`
                  : 'No orders yet'
                }
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search terms or filters'
                  : 'Create your first order to get started'
                }
              </Typography>
              {(!searchTerm && statusFilter === 'all') ? (
                <Button variant="contained" startIcon={<Add />} onClick={handleCreateOrder}>
                  Create First Order
                </Button>
              ) : (
                <Button 
                  variant="outlined" 
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                  }}
                >
                  Clear All Filters
                </Button>
              )}
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Order Number</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Order Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Total Amount</TableCell>
                    <TableCell>Items</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id} hover>
                      <TableCell>{order.order_number}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Person sx={{ mr: 1, color: 'text.secondary' }} />
                          {order.customer?.name || 'Unknown Customer'}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CalendarToday sx={{ mr: 1, color: 'text.secondary', fontSize: 16 }} />
                          {new Date(order.order_date).toLocaleDateString()}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={order.status.replace('_', ' ').toUpperCase()}
                          color={getStatusColor(order.status) as any}
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>₹{order.total_amount?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell>{order.order_items?.length || 0} items</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton 
                            size="small" 
                            onClick={() => handleViewOrder(order.id)}
                            title="View Order Details"
                          >
                            <Visibility />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => handleEditOrder(order.id)}
                            title="Edit Order"
                          >
                            <Edit />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeleteOrder(order.id, order.order_number)}
                            title="Delete Order"
                            sx={{ color: 'error.main' }}
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Create Order Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Order</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Customer Selection with Search */}
              <Controller
                name="customer_id"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Autocomplete
                    options={filteredCustomers}
                    getOptionLabel={(customer) => `${customer.name} (${customer.phone || customer.email})`}
                    value={customers.find(c => c.id === value) || null}
                    onChange={(_, customer) => onChange(customer?.id || '')}
                    onInputChange={(_, newInputValue) => setCustomerSearch(newInputValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Search and Select Customer"
                        error={!!errors.customer_id}
                        helperText={errors.customer_id?.message}
                        placeholder="Type customer name, phone, or email..."
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <InputAdornment position="start">
                              <Search />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                    renderOption={(props, customer) => (
                      <li {...props}>
                        <Box>
                          <Typography variant="body1">{customer.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {customer.phone && `Phone: ${customer.phone}`}
                            {customer.phone && customer.email && ' • '}
                            {customer.email && `Email: ${customer.email}`}
                          </Typography>
                        </Box>
                      </li>
                    )}
                    loading={customers.length === 0}
                    loadingText="Loading customers..."
                    noOptionsText={customerSearch ? 'No customers found' : 'Start typing to search customers'}
                  />
                )}
              />

              {/* Order Notes */}
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Order Notes"
                    multiline
                    rows={3}
                    placeholder="Any special instructions or notes for this order..."
                  />
                )}
              />

              <Divider />

              {/* Order Items */}
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Order Items</Typography>
                  <Button startIcon={<Add />} onClick={addOrderItem} variant="outlined" size="small">
                    Add Item
                  </Button>
                </Box>

                {fields.map((field, index) => (
                  <Card key={field.id} sx={{ mb: 2, bgcolor: 'grey.50' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle1">Item {index + 1}</Typography>
                        {fields.length > 1 && (
                          <IconButton onClick={() => removeOrderItem(index)} color="error" size="small">
                            <Delete />
                          </IconButton>
                        )}
                      </Box>
                      
                      <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 2, mb: 2 }}>
                        <Controller
                          name={`items.${index}.material_type`}
                          control={control}
                          render={({ field }) => (
                            <FormControl fullWidth>
                              <InputLabel>Material Type</InputLabel>
                              <Select {...field} label="Material Type">
                                {materialTypes.map((type) => (
                                  <MenuItem key={type.value} value={type.value}>
                                    {type.label}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          )}
                        />
                        
                        <Controller
                          name={`items.${index}.quantity`}
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              type="number"
                              label="Quantity"
                              inputProps={{ min: 1 }}
                              error={!!errors.items?.[index]?.quantity}
                              helperText={errors.items?.[index]?.quantity?.message}
                            />
                          )}
                        />
                        
                        <Controller
                          name={`items.${index}.unit_price`}
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              type="number"
                              label="Unit Price (₹)"
                              inputProps={{ min: 0, step: '0.01' }}
                              error={!!errors.items?.[index]?.unit_price}
                              helperText={errors.items?.[index]?.unit_price?.message}
                            />
                          )}
                        />
                      </Box>
                      
                      <Controller
                        name={`items.${index}.customization_details`}
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="Customization Details"
                            multiline
                            rows={2}
                            placeholder="Any specific requirements or customization details..."
                          />
                        )}
                      />

                      {/* Design Status Section */}
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
                        <Typography variant="subtitle2" gutterBottom color="primary">
                          Design Status
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                          <Controller
                            name={`items.${index}.design_received`}
                            control={control}
                            render={({ field }) => (
                              <FormControl fullWidth size="small">
                                <InputLabel>Design Received</InputLabel>
                                <Select {...field} label="Design Received">
                                  <MenuItem value="">Not specified</MenuItem>
                                  <MenuItem value="pending">Pending from Customer</MenuItem>
                                  <MenuItem value="received">Received from Customer</MenuItem>
                                  <MenuItem value="not_required">Design Not Required</MenuItem>
                                </Select>
                              </FormControl>
                            )}
                          />
                          
                          <Controller
                            name={`items.${index}.design_ready`}
                            control={control}
                            render={({ field }) => (
                              <FormControl fullWidth size="small">
                                <InputLabel>Design Ready</InputLabel>
                                <Select {...field} label="Design Ready">
                                  <MenuItem value="">Not ready</MenuItem>
                                  <MenuItem value="in_progress">Design in Progress</MenuItem>
                                  <MenuItem value="ready">Ready for Printing</MenuItem>
                                  <MenuItem value="approved">Customer Approved</MenuItem>
                                </Select>
                              </FormControl>
                            )}
                          />
                        </Box>
                        
                        <Controller
                          name={`items.${index}.design_notes`}
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              fullWidth
                              label="Design Notes"
                              size="small"
                              placeholder="Design requirements, customer preferences, etc."
                            />
                          )}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Order'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* View Order Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Order Details</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Order Information */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Order Information</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Order Number</Typography>
                      <Typography variant="body1">{selectedOrder.order_number}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Order Date</Typography>
                      <Typography variant="body1">{new Date(selectedOrder.order_date).toLocaleDateString()}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Status</Typography>
                      <Chip 
                        label={selectedOrder.status.replace('_', ' ').toUpperCase()} 
                        color={getStatusColor(selectedOrder.status) as any}
                        size="small"
                      />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Total Amount</Typography>
                      <Typography variant="body1">₹{selectedOrder.total_amount?.toFixed(2) || '0.00'}</Typography>
                    </Box>
                  </Box>
                  {selectedOrder.notes && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="text.secondary">Notes</Typography>
                      <Typography variant="body1">{selectedOrder.notes}</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* Customer Information */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Customer Information</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Name</Typography>
                      <Typography variant="body1">{selectedOrder.customer?.name}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Phone</Typography>
                      <Typography variant="body1">{selectedOrder.customer?.phone || 'N/A'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Email</Typography>
                      <Typography variant="body1">{selectedOrder.customer?.email || 'N/A'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Address</Typography>
                      <Typography variant="body1">{selectedOrder.customer?.address || 'N/A'}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              {/* Order Items */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Order Items</Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Material Type</TableCell>
                          <TableCell>Quantity</TableCell>
                          <TableCell>Unit Price</TableCell>
                          <TableCell>Subtotal</TableCell>
                          <TableCell>Customization</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedOrder.order_items?.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Chip 
                                label={materialTypes.find(m => m.value === item.material_type)?.label || item.material_type}
                                variant="outlined"
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>₹{item.unit_price?.toFixed(2)}</TableCell>
                            <TableCell>₹{(item.quantity * item.unit_price)?.toFixed(2)}</TableCell>
                            <TableCell>{item.customization_details || 'None'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          <Button 
            variant="contained" 
            startIcon={<Edit />}
            onClick={() => {
              setViewDialogOpen(false);
              if (selectedOrder) handleEditOrder(selectedOrder.id);
            }}
          >
            Edit Order
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Order</DialogTitle>
        <form onSubmit={handleEditSubmit(handleUpdateOrder)}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {selectedOrder && (
                <Alert severity="info">
                  Editing Order: {selectedOrder.order_number}
                </Alert>
              )}
              
              {/* Order Status */}
              <Controller
                name="status"
                control={editControl}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Order Status</InputLabel>
                    <Select {...field} label="Order Status">
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="in_progress">In Progress</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                      <MenuItem value="cancelled">Cancelled</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />

              {/* Customer Selection */}
              <Controller
                name="customer_id"
                control={editControl}
                render={({ field: { onChange, value } }) => (
                  <Autocomplete
                    options={filteredCustomers}
                    getOptionLabel={(customer) => `${customer.name} (${customer.phone || customer.email})`}
                    value={customers.find(c => c.id === value) || null}
                    onChange={(_, customer) => onChange(customer?.id || '')}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Customer"
                        placeholder="Select customer..."
                      />
                    )}
                    loading={customers.length === 0}
                    loadingText="Loading customers..."
                    noOptionsText="No customers found"
                  />
                )}
              />
              
              {/* Order Notes */}
              <Controller
                name="notes"
                control={editControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Order Notes"
                    multiline
                    rows={3}
                    placeholder="Any special instructions or notes for this order..."
                  />
                )}
              />

              <Divider sx={{ my: 2 }} />

              {/* Order Items Section */}
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Order Items</Typography>
                  <Button startIcon={<Add />} onClick={addEditOrderItem} variant="outlined" size="small">
                    Add Item
                  </Button>
                </Box>

                {editFields.map((field, index) => (
                  <Card key={field.id} variant="outlined" sx={{ mb: 2, p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="subtitle2" color="primary">
                        Item {index + 1}
                      </Typography>
                      {editFields.length > 1 && (
                        <IconButton onClick={() => removeEditOrderItem(index)} color="error" size="small">
                          <Delete />
                        </IconButton>
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                        <Controller
                          name={`items.${index}.material_type`}
                          control={editControl}
                          render={({ field }) => (
                            <FormControl fullWidth>
                              <InputLabel>Material Type</InputLabel>
                              <Select {...field} label="Material Type">
                                {materialTypes.map((type) => (
                                  <MenuItem key={type.value} value={type.value}>
                                    {type.label}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          )}
                        />
                        <Controller
                          name={`items.${index}.quantity`}
                          control={editControl}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              fullWidth
                              label="Quantity"
                              type="number"
                              inputProps={{ min: 1 }}
                              error={!!editErrors.items?.[index]?.quantity}
                              helperText={editErrors.items?.[index]?.quantity?.message}
                            />
                          )}
                        />
                        <Controller
                          name={`items.${index}.unit_price`}
                          control={editControl}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              fullWidth
                              label="Unit Price (₹)"
                              type="number"
                              inputProps={{ min: 0, step: 0.01 }}
                              error={!!editErrors.items?.[index]?.unit_price}
                              helperText={editErrors.items?.[index]?.unit_price?.message}
                            />
                          )}
                        />
                      </Box>
                      <Controller
                        name={`items.${index}.customization_details`}
                        control={editControl}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="Customization Details"
                            placeholder="Specify any customization requirements..."
                            multiline
                            rows={2}
                          />
                        )}
                      />
                    </Box>
                  </Card>
                ))}
              </Box>
              
              <Alert severity="success">
                You can now edit all order details including items, quantities, prices, and customization details.
              </Alert>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isEditSubmitting}>
              {isEditSubmitting ? 'Updating...' : 'Update Order'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Orders;