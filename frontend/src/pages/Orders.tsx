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
} from '@mui/material';
import {
  Add,
  Search,
  ShoppingCart,
  Person,
  CalendarToday,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';

// API service for orders
const ordersApi = {
  getOrders: async () => {
    const token = localStorage.getItem('access_token');
    const response = await fetch('https://jbms1.onrender.com/api/orders/', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Failed to fetch orders');
    return response.json();
  },

  getOrdersSummary: async () => {
    const token = localStorage.getItem('access_token');
    const response = await fetch('https://jbms1.onrender.com/api/orders/pending/summary', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Failed to fetch orders summary');
    return response.json();
  },

  createOrder: async (orderData: any) => {
    const token = localStorage.getItem('access_token');
    const response = await fetch('https://jbms1.onrender.com/api/orders/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });
    if (!response.ok) throw new Error('Failed to create order');
    return response.json();
  },
};

// Customer API for dropdown
const customerApi = {
  getCustomers: async () => {
    const token = localStorage.getItem('access_token');
    const response = await fetch('https://jbms1.onrender.com/api/customers/', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Failed to fetch customers');
    return response.json();
  },
};

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      customer_id: '',
      notes: '',
      order_items: [
        {
          material_type: 'saree',
          quantity: 1,
          unit_price: 0,
          customization_details: '',
        },
      ],
    },
  });

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const [ordersData, summaryData] = await Promise.all([
        ordersApi.getOrders(),
        ordersApi.getOrdersSummary().catch(() => ({ status_summary: [], production_summary: [] })),
      ]);
      setOrders(ordersData);
      setSummary(summaryData);
    } catch (error: any) {
      setError('Failed to load orders: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    try {
      const data = await customerApi.getCustomers();
      setCustomers(data);
    } catch (error: any) {
      console.error('Failed to load customers:', error);
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

  const handleCreateOrder = () => {
    reset();
    setDialogOpen(true);
  };

  const onSubmit = async (data: any) => {
    try {
      await ordersApi.createOrder(data);
      setSuccess('Order created successfully');
      setDialogOpen(false);
      loadOrders();
    } catch (error: any) {
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

  const filteredOrders = orders.filter((order) =>
    order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

      {/* Summary Cards */}
      {summary && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 3, mb: 3 }}>
          {summary.status_summary?.map((item: any, index: number) => (
            <Card key={index}>
              <CardContent>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  {item.status.replace('_', ' ').toUpperCase()}
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {item.count}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total: ₹{item.total_amount?.toFixed(2) || '0.00'}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
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
                {searchTerm ? 'No orders found matching your search' : 'No orders yet'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {searchTerm ? 'Try adjusting your search terms' : 'Create your first order to get started'}
              </Typography>
              {!searchTerm && (
                <Button variant="contained" startIcon={<Add />} onClick={handleCreateOrder}>
                  Create First Order
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
              <Controller
                name="customer_id"
                control={control}
                rules={{ required: 'Customer is required' }}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.customer_id}>
                    <InputLabel>Customer</InputLabel>
                    <Select {...field} label="Customer">
                      {customers.map((customer) => (
                        <MenuItem key={customer.id} value={customer.id}>
                          {customer.name} ({customer.phone})
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.customer_id && (
                      <Typography variant="caption" color="error">
                        {errors.customer_id.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
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
    </Box>
  );
};

export default Orders; 