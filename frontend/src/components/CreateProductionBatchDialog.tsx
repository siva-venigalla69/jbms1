import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Typography,
  Box,
  Alert,
  Divider
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { ProductionBatchCreate, Order, OrderItem } from '../types';
import { productionBatchApi, orderApi } from '../services/supabaseApi';
import { componentLogger } from '../utils/debug';

interface CreateProductionBatchDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preSelectedOrderId?: string;
  preSelectedOrderItemId?: string;
}

const CreateProductionBatchDialog: React.FC<CreateProductionBatchDialogProps> = ({
  open,
  onClose,
  onSuccess,
  preSelectedOrderId,
  preSelectedOrderItemId
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<ProductionBatchCreate>({
    defaultValues: {
      order_id: preSelectedOrderId || '',
      order_item_id: preSelectedOrderItemId || '',
      planned_quantity: 1,
      material_type: 'saree' as any,
      priority: 'medium' as any,
      planned_start_date: new Date().toISOString().split('T')[0],
      design_status: 'pending_from_customer' as any,
      design_notes: '',
      production_notes: ''
    }
  });

  const selectedOrderId = watch('order_id');
  const selectedOrderItemId = watch('order_item_id');

  // Load orders on mount
  useEffect(() => {
    loadOrders();
  }, []);

  // Load order items when order changes
  useEffect(() => {
    if (selectedOrderId) {
      loadOrderItems(selectedOrderId);
    } else {
      setOrderItems([]);
      setValue('order_item_id', '');
    }
  }, [selectedOrderId, setValue]);

  // Auto-fill material type and suggested quantity when order item changes
  useEffect(() => {
    if (selectedOrderItemId && orderItems.length > 0) {
      const selectedItem = orderItems.find(item => item.id === selectedOrderItemId);
      if (selectedItem) {
        // Suggest a reasonable batch size (up to 50% of total quantity, min 1)
        const suggestedQuantity = Math.max(1, Math.floor(selectedItem.quantity * 0.5));
        setValue('planned_quantity', suggestedQuantity);
        setValue('material_type', selectedItem.material_type);
      }
    }
  }, [selectedOrderItemId, orderItems, setValue]);

  const loadOrders = async () => {
    try {
      const data = await orderApi.getOrders();
      // Filter to orders that might need production batches (not completed)
      const activeOrders = data.filter(order =>
        order.status !== 'completed' && order.status !== 'cancelled'
      );
      setOrders(activeOrders);
    } catch (err: any) {
      setError('Failed to load orders: ' + err.message);
      componentLogger.error('Failed to load orders', err);
    }
  };

  const loadOrderItems = async (orderId: string) => {
    try {
      // Get order with items
      const orderData = await orderApi.getOrder(orderId);
      setOrderItems(orderData.order_items || []);
    } catch (err: any) {
      setError('Failed to load order items: ' + err.message);
      componentLogger.error('Failed to load order items', err);
    }
  };

  const onSubmit = async (data: ProductionBatchCreate) => {
    setLoading(true);
    setError(null);

    try {
      componentLogger.info('Creating production batch', data);
      await productionBatchApi.createProductionBatch(data);

      onSuccess();
      onClose();
      reset();
    } catch (err: any) {
      setError('Failed to create production batch: ' + err.message);
      componentLogger.error('Failed to create production batch', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      reset();
      setError(null);
    }
  };

  const selectedOrder = orders.find(order => order.id === selectedOrderId);
  const selectedOrderItem = orderItems.find(item => item.id === selectedOrderItemId);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Create Production Batch</DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Order Selection */}
            <Grid size={12}>
              <Controller
                name="order_id"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.order_id}>
                    <InputLabel>Order</InputLabel>
                    <Select
                      {...field}
                      label="Order"
                      disabled={!!preSelectedOrderId}
                    >
                      {orders.map(order => (
                        <MenuItem key={order.id} value={order.id}>
                          <Box>
                            <Typography>
                              {order.order_number} - {order.customer?.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Status: {order.status} • Total: ${order.total_amount}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.order_id && (
                      <Typography variant="caption" color="error">
                        {errors.order_id.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>

            {/* Order Item Selection */}
            <Grid size={12}>
              <Controller
                name="order_item_id"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.order_item_id}>
                    <InputLabel>Order Item</InputLabel>
                    <Select
                      {...field}
                      label="Order Item"
                      disabled={!selectedOrderId || !!preSelectedOrderItemId}
                    >
                      {orderItems.map(item => (
                        <MenuItem key={item.id} value={item.id}>
                          <Box>
                            <Typography>
                              {item.material_type} - {item.quantity} units @ ${item.unit_price}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Total Value: ${(item.quantity * item.unit_price).toFixed(2)}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.order_item_id && (
                      <Typography variant="caption" color="error">
                        {errors.order_item_id.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>

            {/* Selected Item Summary */}
            {selectedOrder && selectedOrderItem && (
              <Grid size={12}>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Batch for: {selectedOrder.order_number}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Customer: {selectedOrder.customer?.name} •
                    Item: {selectedOrderItem.material_type} •
                    Total Available: {selectedOrderItem.quantity} units
                  </Typography>
                </Box>
              </Grid>
            )}

            <Grid size={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>

            {/* Batch Details */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="planned_quantity"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Planned Quantity"
                    type="number"
                    inputProps={{ min: 1, max: selectedOrderItem?.quantity }}
                    error={!!errors.planned_quantity}
                    helperText={
                      errors.planned_quantity?.message ||
                      (selectedOrderItem ? `Max: ${selectedOrderItem.quantity} units` : '')
                    }
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.priority}>
                    <InputLabel>Priority</InputLabel>
                    <Select {...field} label="Priority">
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                      <MenuItem value="urgent">Urgent</MenuItem>
                    </Select>
                    {errors.priority && (
                      <Typography variant="caption" color="error">
                        {errors.priority.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="planned_start_date"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Planned Start Date"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.planned_start_date}
                    helperText={errors.planned_start_date?.message}
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="planned_completion_date"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Planned Completion Date (Optional)"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.planned_completion_date}
                    helperText={errors.planned_completion_date?.message}
                  />
                )}
              />
            </Grid>

            <Grid size={12}>
              <Controller
                name="design_status"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.design_status}>
                    <InputLabel>Design Status</InputLabel>
                    <Select {...field} label="Design Status">
                      <MenuItem value="pending_from_customer">Pending from Customer</MenuItem>
                      <MenuItem value="design_received_from_customer">Design Received from Customer</MenuItem>
                      <MenuItem value="design_ready">Design Ready</MenuItem>
                    </Select>
                    {errors.design_status && (
                      <Typography variant="caption" color="error">
                        {errors.design_status.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>

            <Grid size={12}>
              <Controller
                name="design_notes"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Design Notes (Optional)"
                    multiline
                    rows={2}
                    placeholder="Any special design requirements or notes..."
                  />
                )}
              />
            </Grid>

            <Grid size={12}>
              <Controller
                name="production_notes"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Production Notes (Optional)"
                    multiline
                    rows={2}
                    placeholder="Any special production instructions..."
                  />
                )}
              />
            </Grid>
          </Grid>
        </form>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          variant="contained"
          disabled={isSubmitting || loading}
        >
          {isSubmitting ? 'Creating...' : 'Create Batch'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateProductionBatchDialog;