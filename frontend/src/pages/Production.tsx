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
  LinearProgress,
  Grid,
} from '@mui/material';
import {
  Search,
  PlayArrow,
  CheckCircle,
  Pending,
  Assignment,
  Factory,
  Edit,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { OrderItem, Order, ProductionStage } from '../types';
import { orderItemApi, orderApi } from '../services/supabaseApi';
import { componentLogger } from '../utils/debug';

// Form validation schema for updating production stage
const productionUpdateSchema = yup.object({
  stage: yup.string().required('Production stage is required'),
  notes: yup.string(),
});

const Production: React.FC = () => {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<ProductionStage | 'all'>('all');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedOrderItem, setSelectedOrderItem] = useState<OrderItem | null>(null);

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(productionUpdateSchema),
    defaultValues: {
      stage: 'pre_treatment' as ProductionStage,
      notes: '',
    },
  });

  const loadProductionData = useCallback(async () => {
    componentLogger.info('Loading production data...');
    try {
      setLoading(true);
      
      // Load order items with production status
      const orderItemsData = await orderItemApi.getProductionStatus();
      setOrderItems(orderItemsData);
      
      // Load orders for reference
      const ordersData = await orderApi.getOrders();
      setOrders(ordersData);
      
      componentLogger.info('Production data loaded successfully', { 
        orderItems: orderItemsData.length,
        orders: ordersData.length 
      });
    } catch (error: any) {
      componentLogger.error('Failed to load production data', error);
      setError('Failed to load production data: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProductionData();
  }, [loadProductionData]);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const handleUpdateStage = (orderItem: OrderItem) => {
    setSelectedOrderItem(orderItem);
    reset({
      stage: orderItem.current_stage,
      notes: '',
    });
    setUpdateDialogOpen(true);
  };

  const onSubmit = async (data: any) => {
    if (!selectedOrderItem) return;

    try {
      await orderItemApi.updateProductionStage(selectedOrderItem.id, data.stage);
      setSuccess(`Production stage updated successfully for order item ${selectedOrderItem.id}`);
      setUpdateDialogOpen(false);
      setSelectedOrderItem(null);
      loadProductionData();
    } catch (error: any) {
      setError('Failed to update production stage: ' + error.message);
    }
  };

  const getStageProgress = (stage: ProductionStage): number => {
    switch (stage) {
      case 'pre_treatment':
        return 33;
      case 'printing':
        return 66;
      case 'post_process':
        return 100;
      default:
        return 0;
    }
  };

  const getStageColor = (stage: ProductionStage) => {
    switch (stage) {
      case 'pre_treatment':
        return 'warning';
      case 'printing':
        return 'info';
      case 'post_process':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStageIcon = (stage: ProductionStage) => {
    switch (stage) {
      case 'pre_treatment':
        return <Assignment />;
      case 'printing':
        return <Factory />;
      case 'post_process':
        return <CheckCircle />;
      default:
        return <Pending />;
    }
  };

  const filteredOrderItems = orderItems.filter((item) => {
    const matchesSearch = 
      item.material_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customization_details?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = stageFilter === 'all' || item.current_stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const getOrderByItemId = (orderItemId: string) => {
    const orderItem = orderItems.find(item => item.id === orderItemId);
    return orders.find(order => order.id === orderItem?.order_id);
  };

  const stageOptions: ProductionStage[] = ['pre_treatment', 'printing', 'post_process'];

  // Calculate summary statistics
  const totalItems = orderItems.length;
  const pretreatmentItems = orderItems.filter(item => item.current_stage === 'pre_treatment').length;
  const printingItems = orderItems.filter(item => item.current_stage === 'printing').length;
  const completedItems = orderItems.filter(item => item.current_stage === 'post_process').length;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Production Tracking
        </Typography>
        <Button 
          variant="outlined" 
          onClick={loadProductionData}
          disabled={loading}
        >
          Refresh Data
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
              Total Items in Production
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {totalItems}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Pre-treatment
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="warning.main">
              {pretreatmentItems}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Printing
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="info.main">
              {printingItems}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Completed
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="success.main">
              {completedItems}
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
                placeholder="Search by material type or customization details..."
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
                <InputLabel>Production Stage</InputLabel>
                <Select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value as ProductionStage | 'all')}
                  label="Production Stage"
                >
                  <MenuItem value="all">All Stages</MenuItem>
                  <MenuItem value="pre_treatment">Pre-treatment</MenuItem>
                  <MenuItem value="printing">Printing</MenuItem>
                  <MenuItem value="post_process">Post Process</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Production Items Table */}
      <Card>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredOrderItems.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Factory sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                {searchTerm || stageFilter !== 'all' ? 'No items found matching your criteria' : 'No items in production'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {searchTerm || stageFilter !== 'all' ? 'Try adjusting your search or filters' : 'Items will appear here when orders are created'}
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Order Number</TableCell>
                    <TableCell>Material Type</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Current Stage</TableCell>
                    <TableCell>Progress</TableCell>
                    <TableCell>Customization</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredOrderItems.map((item) => {
                    const order = getOrderByItemId(item.id);
                    const progress = getStageProgress(item.current_stage);
                    
                    return (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Assignment sx={{ mr: 1, color: 'text.secondary' }} />
                            {order?.order_number || 'Unknown'}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {item.material_type}
                          </Typography>
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>
                          <Chip
                            label={item.current_stage.replace('_', ' ').toUpperCase()}
                            color={getStageColor(item.current_stage) as any}
                            variant="outlined"
                            size="small"
                            icon={getStageIcon(item.current_stage)}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={progress}
                              sx={{ width: 100, height: 8, borderRadius: 4 }}
                              color={getStageColor(item.current_stage) as any}
                            />
                            <Typography variant="caption">{progress}%</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {item.customization_details || 'None'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton 
                              size="small" 
                              onClick={() => handleUpdateStage(item)}
                              title="Update Production Stage"
                            >
                              <PlayArrow />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Update Production Stage Dialog */}
      <Dialog open={updateDialogOpen} onClose={() => setUpdateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Production Stage</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            {selectedOrderItem && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Alert severity="info">
                  Updating stage for: {selectedOrderItem.material_type} (Qty: {selectedOrderItem.quantity})
                </Alert>

                <Controller
                  name="stage"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.stage}>
                      <InputLabel>Production Stage</InputLabel>
                      <Select {...field} label="Production Stage">
                        {stageOptions.map((stage) => (
                          <MenuItem key={stage} value={stage}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {getStageIcon(stage)}
                              {stage.replace('_', ' ').toUpperCase()}
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.stage && (
                        <Typography variant="caption" color="error">
                          {errors.stage.message}
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
                      label="Notes (Optional)"
                      multiline
                      rows={3}
                      placeholder="Add any notes about this stage update..."
                    />
                  )}
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUpdateDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Stage'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Production; 