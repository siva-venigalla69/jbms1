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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Grid,
} from '@mui/material';
import {
  Add,
  Search,
  LocalShipping,
  Visibility,
  Edit,
  CheckCircle,
  Pending,
  Error as ErrorIcon,
  AddCircle,
  RemoveCircle,
  Delete,
} from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { DeliveryChallan, Customer, Order } from '../types';
import { deliveryChallanApi, customerApi, orderApi } from '../services/supabaseApi';
import { componentLogger } from '../utils/debug';

// Form validation schema
const challanCreateSchema = yup.object({
  customer_id: yup.string().required('Customer is required'),
  order_ids: yup.array().of(yup.string()).min(1, 'At least one order is required'),
  delivery_date: yup.string().required('Delivery date is required'),
  status: yup.string().required('Status is required'),
  notes: yup.string(),
  items: yup.array().of(
    yup.object({
      order_id: yup.string().required(),
      material_type: yup.string().required(),
      quantity_delivered: yup.number().positive().required(),
      notes: yup.string(),
    })
  ).min(1, 'At least one delivery item is required'),
});

const challanEditSchema = yup.object({
  delivery_date: yup.string().required('Delivery date is required'),
  status: yup.string().required('Status is required'),
  notes: yup.string(),
});

const DeliveryChallans: React.FC = () => {
  const [challans, setChallans] = useState<DeliveryChallan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedChallan, setSelectedChallan] = useState<DeliveryChallan | null>(null);

  // Create challan form
  const { control, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(challanCreateSchema),
    defaultValues: {
      customer_id: '',
      order_ids: [],
      delivery_date: new Date().toISOString().split('T')[0],
      status: 'pending',
      notes: '',
      items: [],
    },
  });

  const { fields: deliveryItems, append: appendItem, remove: removeItem } = useFieldArray({
    control,
    name: "items"
  });

  const watchedCustomerId = watch('customer_id');
  const watchedOrderIds = watch('order_ids');

  // Edit challan form
  const { 
    control: editControl, 
    handleSubmit: handleEditSubmit, 
    reset: editReset, 
    formState: { errors: editErrors, isSubmitting: isEditSubmitting } 
  } = useForm({
    resolver: yupResolver(challanEditSchema),
    defaultValues: {
      delivery_date: '',
      status: 'pending',
      notes: '',
    },
  });

  const loadDeliveryChallans = useCallback(async () => {
    componentLogger.info('Loading delivery challans...');
    try {
      setLoading(true);
      const challansData = await deliveryChallanApi.getDeliveryChallans();
      componentLogger.info('Delivery challans loaded successfully', { count: challansData.length });
      setChallans(challansData);
    } catch (error: any) {
      componentLogger.error('Failed to load delivery challans', error);
      setError('Failed to load delivery challans: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    try {
      const customersData = await customerApi.getCustomers();
      setCustomers(customersData);
    } catch (error: any) {
      componentLogger.error('Failed to load customers', error);
      setError('Failed to load customers: ' + error.message);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const ordersData = await orderApi.getOrders();
      setOrders(ordersData);
    } catch (error: any) {
      componentLogger.error('Failed to load orders', error);
      setError('Failed to load orders: ' + error.message);
    }
  }, []);

  useEffect(() => {
    loadDeliveryChallans();
    loadCustomers();
    loadOrders();
  }, [loadDeliveryChallans, loadCustomers, loadOrders]);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const handleCreateChallan = () => {
    reset({
      customer_id: '',
      order_ids: [],
      delivery_date: new Date().toISOString().split('T')[0],
      status: 'pending',
      notes: '',
      items: [],
    });
    setDialogOpen(true);
  };

  // Get customer orders
  const getCustomerOrders = () => {
    if (!watchedCustomerId) return [];
    return orders.filter(order => order.customer_id === watchedCustomerId && order.status !== 'cancelled');
  };

  // Get available materials from selected orders
  const getAvailableMaterials = () => {
    const customerOrders = getCustomerOrders();
    const selectedOrders = customerOrders.filter(order => watchedOrderIds?.includes(order.id));
    
    const materials: Array<{order_id: string, material_type: string, order_number: string, available_quantity: number}> = [];
    
    selectedOrders.forEach(order => {
      order.order_items?.forEach(item => {
        materials.push({
          order_id: order.id,
          material_type: item.material_type,
          order_number: order.order_number,
          available_quantity: item.quantity
        });
      });
    });
    
    return materials;
  };

  const addDeliveryItem = () => {
    const availableMaterials = getAvailableMaterials();
    if (availableMaterials.length > 0) {
      const firstMaterial = availableMaterials[0];
      appendItem({
        order_id: firstMaterial.order_id,
        material_type: firstMaterial.material_type,
        quantity_delivered: 1,
        notes: ''
      });
    }
  };

  const removeDeliveryItem = (index: number) => {
    if (deliveryItems.length > 1) {
      removeItem(index);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      // For backward compatibility, if order_ids is provided, use the first one as order_id
      const challanData = {
        ...data,
        order_id: data.order_ids?.[0] || data.order_id, // Use first order for main record
        order_ids: data.order_ids,
      };
      
      await deliveryChallanApi.createDeliveryChallan(challanData);
      setSuccess('Delivery challan created successfully');
      setDialogOpen(false);
      loadDeliveryChallans();
    } catch (error: any) {
      setError('Failed to create delivery challan: ' + error.message);
    }
  };

  const handleViewChallan = async (challanId: string) => {
    componentLogger.info('Viewing delivery challan details', { challanId });
    try {
      const challanDetails = await deliveryChallanApi.getDeliveryChallan(challanId);
      setSelectedChallan(challanDetails);
      setViewDialogOpen(true);
    } catch (error: any) {
      componentLogger.error('Failed to load delivery challan details', error);
      setError('Failed to load delivery challan details: ' + error.message);
    }
  };

  const handleEditChallan = async (challanId: string) => {
    componentLogger.info('Editing delivery challan', { challanId });
    try {
      const challanDetails = await deliveryChallanApi.getDeliveryChallan(challanId);
      setSelectedChallan(challanDetails);
      // Reset edit form with challan data
      editReset({
        delivery_date: challanDetails.delivery_date,
        status: challanDetails.status,
        notes: challanDetails.notes || '',
      });
      setEditDialogOpen(true);
    } catch (error: any) {
      componentLogger.error('Failed to load delivery challan for editing', error);
      setError('Failed to load delivery challan for editing: ' + error.message);
    }
  };

  const handleUpdateChallan = async (data: any) => {
    if (!selectedChallan) return;
    
    try {
      await deliveryChallanApi.updateDeliveryChallan(selectedChallan.id, data);
      setSuccess(`Delivery challan ${selectedChallan.challan_number} updated successfully`);
      setEditDialogOpen(false);
      setSelectedChallan(null);
      loadDeliveryChallans();
    } catch (error: any) {
      setError('Failed to update delivery challan: ' + error.message);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Pending />;
      case 'delivered':
        return <CheckCircle />;
      case 'returned':
        return <ErrorIcon />;
      default:
        return <Pending />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'delivered':
        return 'success';
      case 'returned':
        return 'error';
      default:
        return 'default';
    }
  };

  const filteredChallans = challans.filter((challan) => {
    const matchesSearch = 
      challan.challan_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      challan.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      challan.order?.order_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || challan.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusOptions = ['pending', 'delivered', 'returned'];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Delivery Challans
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleCreateChallan} sx={{ px: 3 }}>
          Create Challan
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
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 3, mb: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Total Challans
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {challans.length}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Pending Deliveries
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="warning.main">
              {challans.filter(c => c.status === 'pending').length}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Delivered
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="success.main">
              {challans.filter(c => c.status === 'delivered').length}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Returned
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="error.main">
              {challans.filter(c => c.status === 'returned').length}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
            <Box sx={{ flex: 2 }}>
              <TextField
                fullWidth
                placeholder="Search by challan number, customer, or order..."
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
                    <MenuItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Delivery Challans Table */}
      <Card>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredChallans.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <LocalShipping sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                {searchTerm || statusFilter ? 'No challans found matching your criteria' : 'No delivery challans yet'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {searchTerm || statusFilter ? 'Try adjusting your search or filters' : 'Create your first delivery challan to get started'}
              </Typography>
              {!searchTerm && !statusFilter && (
                <Button variant="contained" startIcon={<Add />} onClick={handleCreateChallan}>
                  Create First Challan
                </Button>
              )}
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Challan Number</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Order Number</TableCell>
                    <TableCell>Delivery Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredChallans.map((challan) => (
                    <TableRow key={challan.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <LocalShipping sx={{ mr: 1, color: 'text.secondary' }} />
                          {challan.challan_number}
                        </Box>
                      </TableCell>
                      <TableCell>{challan.customer?.name || 'Unknown'}</TableCell>
                      <TableCell>{challan.order?.order_number || 'N/A'}</TableCell>
                      <TableCell>
                        {new Date(challan.delivery_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={challan.status.charAt(0).toUpperCase() + challan.status.slice(1)}
                          color={getStatusColor(challan.status) as any}
                          variant="outlined"
                          size="small"
                          icon={getStatusIcon(challan.status)}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(challan.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton 
                            size="small" 
                            onClick={() => handleViewChallan(challan.id)}
                            title="View Details"
                          >
                            <Visibility />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => handleEditChallan(challan.id)}
                            title="Edit Challan"
                          >
                            <Edit />
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

      {/* Create Challan Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Delivery Challan</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
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
                            {customer.name} {customer.phone && `(${customer.phone})`}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
                <Controller
                  name="order_ids"
                  control={control}
                  rules={{ required: 'At least one order is required' }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.order_ids}>
                      <InputLabel>Orders</InputLabel>
                      <Select 
                        {...field} 
                        label="Orders" 
                        multiple
                        value={field.value || []}
                      >
                        {getCustomerOrders().map((order) => (
                          <MenuItem key={order.id} value={order.id}>
                            {order.order_number} - {order.status}
                          </MenuItem>
                        ))}
                      </Select>
                      {!watchedCustomerId && (
                        <Typography variant="caption" color="text.secondary">
                          Select a customer first to see available orders
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                <Controller
                  name="delivery_date"
                  control={control}
                  rules={{ required: 'Delivery date is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Delivery Date"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.delivery_date}
                      helperText={errors.delivery_date?.message}
                    />
                  )}
                />
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select {...field} label="Status">
                        {statusOptions.map((status) => (
                          <MenuItem key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Box>

              {/* Delivery Items Section */}
              {watchedOrderIds && watchedOrderIds.length > 0 && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Delivery Items</Typography>
                    <Button
                      startIcon={<AddCircle />}
                      onClick={addDeliveryItem}
                      variant="outlined"
                      size="small"
                      disabled={getAvailableMaterials().length === 0}
                    >
                      Add Item
                    </Button>
                  </Box>
                  
                  {deliveryItems.map((field, index) => {
                    const availableMaterials = getAvailableMaterials();
                    return (
                      <Card key={field.id} variant="outlined" sx={{ mb: 2 }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="subtitle1">Delivery Item {index + 1}</Typography>
                            {deliveryItems.length > 1 && (
                              <IconButton
                                size="small"
                                onClick={() => removeDeliveryItem(index)}
                                color="error"
                              >
                                <RemoveCircle />
                              </IconButton>
                            )}
                          </Box>
                          
                          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                            <Controller
                              name={`items.${index}.order_id`}
                              control={control}
                              render={({ field }) => (
                                <FormControl fullWidth>
                                  <InputLabel>Order</InputLabel>
                                  <Select {...field} label="Order">
                                    {availableMaterials.map((material, idx) => (
                                      <MenuItem key={`${material.order_id}-${idx}`} value={material.order_id}>
                                        {material.order_number}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              )}
                            />
                            
                            <Controller
                              name={`items.${index}.material_type`}
                              control={control}
                              render={({ field }) => (
                                <FormControl fullWidth>
                                  <InputLabel>Material Type</InputLabel>
                                  <Select {...field} label="Material Type">
                                    {availableMaterials.map((material, idx) => (
                                      <MenuItem key={`${material.material_type}-${idx}`} value={material.material_type}>
                                        {material.material_type}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              )}
                            />
                            
                            <Controller
                              name={`items.${index}.quantity_delivered`}
                              control={control}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  type="number"
                                  label="Quantity"
                                  inputProps={{ min: 1 }}
                                  sx={{ minWidth: 120 }}
                                />
                              )}
                            />
                          </Box>
                          
                          <Controller
                            name={`items.${index}.notes`}
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                fullWidth
                                label="Item Notes"
                                multiline
                                rows={2}
                                placeholder="Notes specific to this delivery item..."
                                sx={{ mt: 2 }}
                              />
                            )}
                          />
                        </CardContent>
                      </Card>
                    );
                  })}
                  
                  {deliveryItems.length === 0 && watchedOrderIds.length > 0 && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      No delivery items added yet. Click "Add Item" to specify what materials to deliver.
                    </Alert>
                  )}
                </Box>
              )}

              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Notes"
                    multiline
                    rows={3}
                    placeholder="Any special delivery instructions or notes..."
                  />
                )}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Challan'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* View Challan Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LocalShipping />
            <Typography variant="h6">Delivery Challan Details</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedChallan && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        Challan Information
                      </Typography>
                      <Typography variant="body2" color="text.secondary">Challan Number</Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>{selectedChallan.challan_number}</Typography>
                      
                      <Typography variant="body2" color="text.secondary">Delivery Date</Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {new Date(selectedChallan.delivery_date).toLocaleDateString()}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary">Status</Typography>
                      <Box sx={{ mb: 2 }}>
                        <Chip
                          label={selectedChallan.status.charAt(0).toUpperCase() + selectedChallan.status.slice(1)}
                          color={getStatusColor(selectedChallan.status) as any}
                          variant="outlined"
                          icon={getStatusIcon(selectedChallan.status)}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        Customer Information
                      </Typography>
                      <Typography variant="body2" color="text.secondary">Customer Name</Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>{selectedChallan.customer?.name}</Typography>
                      
                      <Typography variant="body2" color="text.secondary">Phone</Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {selectedChallan.customer?.phone || 'Not provided'}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary">Email</Typography>
                      <Typography variant="body1">
                        {selectedChallan.customer?.email || 'Not provided'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid size={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        Order Information
                      </Typography>
                      <Typography variant="body2" color="text.secondary">Order Number</Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>{selectedChallan.order?.order_number}</Typography>
                      
                      <Typography variant="body2" color="text.secondary">Order Status</Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {selectedChallan.order?.status ? 
                          selectedChallan.order.status.charAt(0).toUpperCase() + selectedChallan.order.status.slice(1) : 
                          'Unknown'
                        }
                      </Typography>
                      
                      {selectedChallan.notes && (
                        <>
                          <Typography variant="body2" color="text.secondary">Delivery Notes</Typography>
                          <Typography variant="body1">{selectedChallan.notes}</Typography>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
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
              handleEditChallan(selectedChallan!.id);
            }}
          >
            Edit Challan
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Challan Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Delivery Challan</DialogTitle>
        <form onSubmit={handleEditSubmit(handleUpdateChallan)}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {selectedChallan && (
                <Alert severity="info">
                  Editing Challan: {selectedChallan.challan_number}
                </Alert>
              )}
              
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                <Controller
                  name="delivery_date"
                  control={editControl}
                  rules={{ required: 'Delivery date is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Delivery Date"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      error={!!editErrors.delivery_date}
                      helperText={editErrors.delivery_date?.message}
                    />
                  )}
                />
                <Controller
                  name="status"
                  control={editControl}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select {...field} label="Status">
                        {statusOptions.map((status) => (
                          <MenuItem key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Box>
              
              <Controller
                name="notes"
                control={editControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Notes"
                    multiline
                    rows={3}
                    placeholder="Any special delivery instructions or notes..."
                  />
                )}
              />
              
              <Alert severity="info">
                You can edit delivery date, status, and notes. To modify customer or order, please create a new challan.
              </Alert>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isEditSubmitting}>
              {isEditSubmitting ? 'Updating...' : 'Update Challan'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default DeliveryChallans;