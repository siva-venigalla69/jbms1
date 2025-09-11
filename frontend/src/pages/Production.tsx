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
} from '@mui/material';
import {
  Search,
  CheckCircle,
  Pending,
  Assignment,
  Factory,
  Visibility,
  Clear,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { OrderItem, Order, ProductionStage, DesignStatus, ProductionStatus } from '../types';
import { orderItemApi, orderApi } from '../services/supabaseApi';
import { componentLogger } from '../utils/debug';
import { parseDesignStatus, parseDesignStatusLegacy, parseProductionStatus, getDesignStatusLabel, getProductionStatusLabel } from '../utils/productionUtils';

// Form validation schema for updating production stage
const productionUpdateSchema = yup.object({
  stage: yup.string().required('Production stage is required'),
  notes: yup.string(),
});

// Form validation schema for design updates
const designUpdateSchema = yup.object({
  design_status: yup.string().required('Design status is required'),
  design_file_url: yup.string().url('Must be a valid URL'),
  design_notes: yup.string(),
});

// Form validation schema for production updates
const productionStatusUpdateSchema = yup.object({
  production_status: yup.string().required('Production status is required'),
});

const Production: React.FC = () => {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  // Clean 2-column filters
  const [designStatusFilter, setDesignStatusFilter] = useState<DesignStatus | 'all'>('all');
  const [productionStatusFilter, setProductionStatusFilter] = useState<ProductionStatus | 'all'>('all');
  
  // @deprecated - Legacy filters for backward compatibility
  const [stageFilter, setStageFilter] = useState<ProductionStage | 'all'>('all');
  const [designFilter, setDesignFilter] = useState<'all' | 'received' | 'ready' | 'pending'>('all');
  const [fabricStageFilter, setFabricStageFilter] = useState<'all' | 'not_started' | 'pre_treatment' | 'printing' | 'post_process'>('all');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fabricStageDialogOpen, setFabricStageDialogOpen] = useState(false);
  const [designDialogOpen, setDesignDialogOpen] = useState(false);
  const [selectedOrderItem, setSelectedOrderItem] = useState<OrderItem | null>(null);

  // const form = useForm({
  //   resolver: yupResolver(productionUpdateSchema),
  //   defaultValues: {
  //     stage: 'design_pending' as ProductionStage,
  //     notes: '',
  //   },
  // });

  // Design update form
  // Design update form with new structure
  const { 
    control: designControl, 
    handleSubmit: handleDesignSubmit, 
    reset: designReset, 
    formState: { errors: designErrors, isSubmitting: isDesignSubmitting } 
  } = useForm({
    resolver: yupResolver(designUpdateSchema),
    defaultValues: {
      design_status: 'pending_from_customer' as DesignStatus,
      design_file_url: '',
      design_notes: '',
    },
  });

  // Production status update form
  const { 
    control: productionControl, 
    handleSubmit: handleProductionSubmit, 
    reset: productionReset, 
    formState: { errors: productionErrors, isSubmitting: isProductionSubmitting } 
  } = useForm({
    resolver: yupResolver(productionStatusUpdateSchema),
    defaultValues: {
      production_status: 'pending' as ProductionStatus,
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

  // const handleUpdateFabricStage = (orderItem: OrderItem) => {
  //   setSelectedOrderItem(orderItem);
  //   reset({
  //     stage: orderItem.current_stage || 'design_pending',
  //     notes: '',
  //   });
  //   setFabricStageDialogOpen(true);
  // };

  const handleDesignUpdate = (orderItem: OrderItem) => {
    setSelectedOrderItem(orderItem);
    const currentDesignStatus = parseDesignStatus(orderItem.customization_details, orderItem);
    designReset({
      design_status: currentDesignStatus,
      design_file_url: orderItem.design_file_url || '',
      design_notes: orderItem.design_notes || '',
    });
    setDesignDialogOpen(true);
  };

  const handleProductionUpdate = (orderItem: OrderItem) => {
    setSelectedOrderItem(orderItem);
    const currentProductionStatus = parseProductionStatus(orderItem.customization_details, orderItem);
    productionReset({
      production_status: currentProductionStatus,
    });
    setFabricStageDialogOpen(true);
  };

  const onDesignSubmit = async (data: any) => {
    if (!selectedOrderItem) return;

    try {
      // Update design status using new 2-column approach
      await orderItemApi.updateDesignStatus(
        selectedOrderItem.id, 
        data.design_status,
        {
          design_file_url: data.design_file_url,
          design_notes: data.design_notes,
        }
      );
      
      setSuccess(`Design status updated successfully for order item ${selectedOrderItem.id}`);
      setDesignDialogOpen(false);
      setSelectedOrderItem(null);
      loadProductionData();
    } catch (error: any) {
      setError('Failed to update design status: ' + error.message);
    }
  };

  const onProductionSubmit = async (data: any) => {
    if (!selectedOrderItem) return;

    try {
      // Update production status using new 2-column approach
      await orderItemApi.updateProductionStatus(selectedOrderItem.id, data.production_status);
      
      setSuccess(`Production status updated successfully for order item ${selectedOrderItem.id}`);
      setFabricStageDialogOpen(false);
      setSelectedOrderItem(null);
      loadProductionData();
    } catch (error: any) {
      setError('Failed to update production status: ' + error.message);
    }
  };

  // @deprecated - Use onProductionSubmit instead
  // const onFabricStageSubmit = onProductionSubmit;

  const getStageProgress = (stage: ProductionStage): number => {
    switch (stage) {
      case 'design_pending':
        return 10;
      case 'design_ready':
        return 25;
      case 'pre_treatment':
        return 50;
      case 'printing':
        return 75;
      case 'post_process':
        return 100;
      default:
        return 0;
    }
  };

  const getStageColor = (stage: ProductionStage) => {
    switch (stage) {
      case 'design_pending':
        return 'error';
      case 'design_ready':
        return 'warning';
      case 'pre_treatment':
        return 'info';
      case 'printing':
        return 'primary';
      case 'post_process':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStageIcon = (stage: ProductionStage) => {
    switch (stage) {
      case 'design_pending':
        return <Pending />;
      case 'design_ready':
        return <CheckCircle />;
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

  const getOrderByItemId = (orderItemId: string) => {
    const orderItem = orderItems.find(item => item.id === orderItemId);
    return orders.find(order => order.id === orderItem?.order_id);
  };

  const filteredOrderItems = orderItems.filter((item) => {
    const order = getOrderByItemId(item.id);
    
    // Search filter
    const matchesSearch = searchTerm === '' || (
      item.material_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customization_details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order?.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order?.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // New 2-column filtering approach
    const itemDesignStatus = parseDesignStatus(item.customization_details, item);
    const itemProductionStatus = parseProductionStatus(item.customization_details, item);
    
    const matchesDesignStatus = designStatusFilter === 'all' || itemDesignStatus === designStatusFilter;
    const matchesProductionStatus = productionStatusFilter === 'all' || itemProductionStatus === productionStatusFilter;
    
    // Legacy filters for backward compatibility (can be removed after migration)
    const { designReceived, designReady } = parseDesignStatusLegacy(item.customization_details, item);
    const matchesStage = stageFilter === 'all' || (item.current_stage || 'design_pending') === stageFilter;
    const matchesDesign = designFilter === 'all' || (
      (designFilter === 'received' && designReceived) ||
      (designFilter === 'ready' && designReady) ||
      (designFilter === 'pending' && !designReceived)
    );
    
    const fabricStage = item.current_stage || 'design_pending';
    const matchesFabricStage = fabricStageFilter === 'all' || (
      (fabricStageFilter === 'not_started' && ['design_pending', 'design_ready'].includes(fabricStage)) ||
      (fabricStageFilter === 'pre_treatment' && fabricStage === 'pre_treatment') ||
      (fabricStageFilter === 'printing' && fabricStage === 'printing') ||
      (fabricStageFilter === 'post_process' && fabricStage === 'post_process')
    );
    
    return matchesSearch && matchesDesignStatus && matchesProductionStatus && matchesStage && matchesDesign && matchesFabricStage;
  });

  // Removed stageOptions as we now have separate design and fabric stage handling

  // Calculate summary statistics with design + fabric combinations
  const totalItems = orderItems.length;
  
  const getItemStats = () => {
    const stats = {
      // New 2-column design status counts
      designPending: 0,
      designReceived: 0, 
      designReady: 0,
      
      // New 2-column production status counts
      productionPending: 0,
      productionPrinting: 0,
      productionPostProcess: 0,
      
      // Combination stats using new structure
      designReadyAndPrintingReady: 0,  // Ready for printing
      designReadyButProductionPending: 0, // Can start production
      designPendingAndProductionPending: 0, // Waiting for design
      designPendingButProductionStarted: 0, // Production ahead of design
      designReceivedNotReadyAndProductionStarted: 0, // Production started but design not ready
    };
    
    orderItems.forEach(item => {
      const designStatus = parseDesignStatus(item.customization_details, item);
      const productionStatus = parseProductionStatus(item.customization_details, item);
      
      // Design status counts
      switch (designStatus) {
        case 'design_ready':
          stats.designReady++;
          break;
        case 'design_received_from_customer':
          stats.designReceived++;
          break;
        case 'pending_from_customer':
        default:
          stats.designPending++;
          break;
      }
      
      // Production status counts
      switch (productionStatus) {
        case 'printing':
          stats.productionPrinting++;
          break;
        case 'post_process':
          stats.productionPostProcess++;
          break;
        case 'pending':
        default:
          stats.productionPending++;
          break;
      }
      
      // Combination stats
      const isDesignReady = designStatus === 'design_ready';
      const isDesignReceived = designStatus === 'design_received_from_customer';
      const isDesignPending = designStatus === 'pending_from_customer';
      const isProductionStarted = productionStatus !== 'pending';
      
      if (isDesignReady && isProductionStarted) stats.designReadyAndPrintingReady++;
      if (isDesignReady && !isProductionStarted) stats.designReadyButProductionPending++;
      if (isDesignPending && !isProductionStarted) stats.designPendingAndProductionPending++;
      if (isDesignPending && isProductionStarted) stats.designPendingButProductionStarted++;
      if (isDesignReceived && !isDesignReady && isProductionStarted) stats.designReceivedNotReadyAndProductionStarted++;
    });
    
    return stats;
  };
  
  const stats = getItemStats();

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

      {/* Clickable Summary Cards - Your Requested Combinations */}
      <Typography variant="h5" sx={{ mb: 2 }}>Design + Fabric Processing Combinations (Click to Filter)</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
        <Card 
          sx={{ cursor: 'pointer', '&:hover': { elevation: 4, bgcolor: 'grey.50' } }}
          onClick={() => {
            setDesignStatusFilter('all');
            setProductionStatusFilter('all');
            // Clear legacy filters
            setDesignFilter('all');
            setFabricStageFilter('all');
            setStageFilter('all');
          }}
        >
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Total Items (Clear Filters)
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {totalItems}
            </Typography>
          </CardContent>
        </Card>
        
        <Card 
          sx={{ 
            bgcolor: 'success.50', 
            cursor: 'pointer', 
            '&:hover': { elevation: 4, bgcolor: 'success.100' } 
          }}
          onClick={() => {
            setDesignStatusFilter('design_ready');
            setProductionStatusFilter('printing');
            // Clear legacy filters
            setDesignFilter('all');
            setFabricStageFilter('all');
            setStageFilter('all');
          }}
        >
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Design Ready + Production Started
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="success.main">
              {stats.designReadyAndPrintingReady}
            </Typography>
            <Typography variant="body2" color="success.main">
              Ready for Printing (Click to Filter)
            </Typography>
          </CardContent>
        </Card>
        
        <Card 
          sx={{ 
            bgcolor: 'warning.50', 
            cursor: 'pointer', 
            '&:hover': { elevation: 4, bgcolor: 'warning.100' } 
          }}
          onClick={() => {
            setDesignStatusFilter('design_ready');
            setProductionStatusFilter('pending');
            // Clear legacy filters
            setDesignFilter('all');
            setFabricStageFilter('all');
            setStageFilter('all');
          }}
        >
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Design Ready + Production Pending
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="warning.main">
              {stats.designReadyButProductionPending}
            </Typography>
            <Typography variant="body2" color="warning.main">
              Can Start Production (Click to Filter)
            </Typography>
          </CardContent>
        </Card>
        
        <Card 
          sx={{ 
            bgcolor: 'error.50', 
            cursor: 'pointer', 
            '&:hover': { elevation: 4, bgcolor: 'error.100' } 
          }}
          onClick={() => {
            setDesignStatusFilter('pending_from_customer');
            setProductionStatusFilter('pending');
            // Clear legacy filters
            setDesignFilter('all');
            setFabricStageFilter('all');
            setStageFilter('all');
          }}
        >
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Design Pending + Production Pending
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="error.main">
              {stats.designPendingAndProductionPending}
            </Typography>
            <Typography variant="body2" color="error.main">
              Waiting for Design (Click to Filter)
            </Typography>
          </CardContent>
        </Card>
        
        <Card 
          sx={{ 
            bgcolor: 'info.50', 
            cursor: 'pointer', 
            '&:hover': { elevation: 4, bgcolor: 'info.100' } 
          }}
          onClick={() => {
            setDesignFilter('pending');
            setFabricStageFilter('pre_treatment');
            setStageFilter('all');
          }}
        >
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Design Pending + Pre-treatment Done
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="info.main">
              {stats.designPendingButProductionStarted}
            </Typography>
            <Typography variant="body2" color="info.main">
              Fabric Ready, Design Pending (Click to Filter)
            </Typography>
          </CardContent>
        </Card>
        
        <Card 
          sx={{ 
            bgcolor: 'secondary.50', 
            cursor: 'pointer', 
            '&:hover': { elevation: 4, bgcolor: 'secondary.100' } 
          }}
          onClick={() => {
            setDesignFilter('received');
            setFabricStageFilter('pre_treatment');
            setStageFilter('all');
          }}
        >
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Design Received Not Ready + Pre-treatment Done
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="secondary.main">
              {stats.designReceivedNotReadyAndProductionStarted}
            </Typography>
            <Typography variant="body2" color="secondary.main">
              Waiting for Design Approval (Click to Filter)
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Search & Independent Filters</Typography>
          
          {/* Search */}
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Search by customer name, order number, material type, or customization details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton 
                      size="small" 
                      onClick={() => setSearchTerm('')}
                      title="Clear search"
                    >
                      <Clear />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {/* Separate Filters */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
            
            {/* Design Status Filter (Independent) */}
            <FormControl fullWidth>
              <InputLabel>Design Status</InputLabel>
              <Select
                value={designFilter}
                onChange={(e) => setDesignFilter(e.target.value as typeof designFilter)}
                label="Design Status"
              >
                <MenuItem value="all">All Design Status</MenuItem>
                <MenuItem value="pending">Design Pending</MenuItem>
                <MenuItem value="received">Design Received</MenuItem>
                <MenuItem value="ready">Design Ready</MenuItem>
              </Select>
            </FormControl>

            {/* Fabric Processing Filter (Independent) */}
            <FormControl fullWidth>
              <InputLabel>Fabric Processing</InputLabel>
              <Select
                value={fabricStageFilter}
                onChange={(e) => setFabricStageFilter(e.target.value as typeof fabricStageFilter)}
                label="Fabric Processing"
              >
                <MenuItem value="all">All Fabric Stages</MenuItem>
                <MenuItem value="not_started">Not Started</MenuItem>
                <MenuItem value="pre_treatment">Pre-treatment</MenuItem>
                <MenuItem value="printing">Printing</MenuItem>
                <MenuItem value="post_process">Post Process</MenuItem>
              </Select>
            </FormControl>

            {/* Legacy Combined Filter (Keep for backward compatibility) */}
            <FormControl fullWidth>
              <InputLabel>Combined Stage (Legacy)</InputLabel>
              <Select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value as ProductionStage | 'all')}
                label="Combined Stage (Legacy)"
              >
                <MenuItem value="all">All Stages</MenuItem>
                <MenuItem value="design_pending">Design Pending</MenuItem>
                <MenuItem value="design_ready">Design Ready</MenuItem>
                <MenuItem value="pre_treatment">Pre-treatment</MenuItem>
                <MenuItem value="printing">Printing</MenuItem>
                <MenuItem value="post_process">Post Process</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Filter Combination Examples */}
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              <strong>Filter Examples:</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary" component="div">
              • <strong>Design Ready + Pre-treatment:</strong> Set "Design Status" = Ready, "Fabric Processing" = Pre-treatment<br/>
              • <strong>Design Pending + Not Started:</strong> Set "Design Status" = Pending, "Fabric Processing" = Not Started<br/>
              • <strong>Design Ready + Not Started:</strong> Set "Design Status" = Ready, "Fabric Processing" = Not Started
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Production Items Table */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Production Queue
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Showing {filteredOrderItems.length} of {orderItems.length} items
            </Typography>
          </Box>
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
                {searchTerm || stageFilter !== 'all' ? 'Try adjusting your search or filters. Check if orders have been created and have order items.' : 'Items will appear here when orders are created with pending production stages.'}
              </Typography>
              {(searchTerm || stageFilter !== 'all' || designFilter !== 'all' || fabricStageFilter !== 'all') && (
                <Button 
                  variant="outlined" 
                  onClick={() => { 
                    setSearchTerm(''); 
                    setStageFilter('all'); 
                    setDesignFilter('all');
                    setFabricStageFilter('all');
                  }}
                  sx={{ mt: 2 }}
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
                    <TableCell>Material Type</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Design Status</TableCell>
                    <TableCell>Fabric Stage</TableCell>
                    <TableCell>Progress</TableCell>
                    <TableCell>Customization</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredOrderItems.map((item) => {
                    const order = getOrderByItemId(item.id);
                    const progress = getStageProgress(item.current_stage || 'design_pending');
                    const { designReceived, designReady } = parseDesignStatusLegacy(item.customization_details, item);
                    
                    const getDesignChip = () => {
                      if (designReady) {
                        return <Chip label="Ready" color="success" size="small" icon={<CheckCircle />} />;
                      } else if (designReceived) {
                        return <Chip label="Received" color="warning" size="small" icon={<Assignment />} />;
                      } else {
                        return <Chip label="Pending" color="error" size="small" icon={<Pending />} />;
                      }
                    };
                    
                    const getFabricStageChip = () => {
                      const stage = item.current_stage || 'design_pending';
                      const fabricStageMap: Record<string, string> = {
                        'design_pending': 'Not Started',
                        'design_ready': 'Not Started', 
                        'pre_treatment': 'Pre-treatment',
                        'printing': 'Printing',
                        'post_process': 'Post Process'
                      };
                      
                      return (
                        <Chip
                          label={fabricStageMap[stage] || stage}
                          color={getStageColor(stage) as any}
                          variant="outlined"
                          size="small"
                          icon={getStageIcon(stage)}
                        />
                      );
                    };
                    
                    return (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Assignment sx={{ mr: 1, color: 'text.secondary' }} />
                            {order?.order_number || 'Unknown'}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="medium" color="primary">
                              {order?.customer?.name || 'Unknown Customer'}
                            </Typography>
                            {order?.status && (
                              <Chip 
                                label={order.status.toUpperCase()} 
                                size="small" 
                                color={order.status === 'pending' ? 'warning' : order.status === 'completed' ? 'success' : 'default'}
                                variant="outlined"
                                sx={{ mt: 0.5 }}
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {item.material_type}
                          </Typography>
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        
                        {/* Design Status Column */}
                        <TableCell>
                          {getDesignChip()}
                        </TableCell>
                        
                        {/* Fabric Processing Stage Column */}
                        <TableCell>
                          {getFabricStageChip()}
                        </TableCell>
                        
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={progress}
                              sx={{ width: 100, height: 8, borderRadius: 4 }}
                              color={getStageColor(item.current_stage || 'design_pending') as any}
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
                              onClick={() => handleDesignUpdate(item)}
                              title="Update Design Status"
                              color={designReady ? 'success' : 'warning'}
                            >
                              <Visibility />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              onClick={() => handleProductionUpdate(item)}
                              title="Update Fabric Processing Stage"
                              color="primary"
                            >
                              <Factory />
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

      {/* Fabric Processing Stage Dialog */}
      <Dialog open={fabricStageDialogOpen} onClose={() => setFabricStageDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Factory />
            <Typography variant="h6">Update Production Status</Typography>
          </Box>
        </DialogTitle>
        <form onSubmit={handleProductionSubmit(onProductionSubmit)}>
          <DialogContent>
            {selectedOrderItem && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Alert severity="info">
                  Updating production status for: {selectedOrderItem.material_type} (Qty: {selectedOrderItem.quantity})
                </Alert>

                <Alert severity="warning">
                  <Typography variant="body2">
                    <strong>Note:</strong> This only updates the production status (pending, printing, post-process). 
                    Use the Design button to manage design status separately.
                  </Typography>
                </Alert>

                <Controller
                  name="production_status"
                  control={productionControl}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!productionErrors.production_status}>
                      <InputLabel>Production Status</InputLabel>
                      <Select {...field} label="Production Status">
                        <MenuItem value="pending">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Pending />
                            Pending
                          </Box>
                        </MenuItem>
                        <MenuItem value="printing">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Factory />
                            Printing
                          </Box>
                        </MenuItem>
                        <MenuItem value="post_process">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CheckCircle />
                            Post Process
                          </Box>
                        </MenuItem>
                      </Select>
                      {productionErrors.production_status && (
                        <Typography variant="caption" color="error">
                          {productionErrors.production_status.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />

              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFabricStageDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isProductionSubmitting}>
              {isProductionSubmitting ? 'Updating...' : 'Update Production Status'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Design Management Dialog */}
      <Dialog open={designDialogOpen} onClose={() => setDesignDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Visibility />
            <Typography variant="h6">Design Management</Typography>
          </Box>
        </DialogTitle>
        <form onSubmit={handleDesignSubmit(onDesignSubmit)}>
          <DialogContent>
            {selectedOrderItem && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Alert severity="info">
                  Managing design for: {selectedOrderItem.material_type} (Qty: {selectedOrderItem.quantity})
                  {selectedOrderItem.customization_details && ` - ${selectedOrderItem.customization_details}`}
                </Alert>

                <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                  <Card variant="outlined" sx={{ flex: 1 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        Design Status
                      </Typography>
                      
                      <Controller
                        name="design_status"
                        control={designControl}
                        render={({ field }) => (
                          <FormControl fullWidth error={!!designErrors.design_status}>
                            <InputLabel>Design Status</InputLabel>
                            <Select {...field} label="Design Status">
                              <MenuItem value="pending_from_customer">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Pending />
                                  Pending from Customer
                                </Box>
                              </MenuItem>
                              <MenuItem value="design_received_from_customer">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Assignment />
                                  Design Received from Customer
                                </Box>
                              </MenuItem>
                              <MenuItem value="design_ready">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <CheckCircle />
                                  Design Ready for Production
                                </Box>
                              </MenuItem>
                            </Select>
                            {designErrors.design_status && (
                              <Typography variant="caption" color="error">
                                {designErrors.design_status.message}
                              </Typography>
                            )}
                          </FormControl>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <Card variant="outlined" sx={{ flex: 1 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        Current Status
                      </Typography>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">Current Design Status</Typography>
                        <Chip
                          label={getDesignStatusLabel(selectedOrderItem.customization_details, selectedOrderItem)}
                          color="primary"
                          variant="outlined"
                          icon={<Visibility />}
                          sx={{ mt: 1 }}
                        />
                      </Box>

                      <Box>
                        <Typography variant="body2" color="text.secondary">Current Production Status</Typography>
                        <Chip
                          label={getProductionStatusLabel(selectedOrderItem.customization_details, selectedOrderItem)}
                          color="secondary"
                          variant="outlined"
                          icon={<Factory />}
                          sx={{ mt: 1 }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Box>

                <Controller
                  name="design_file_url"
                  control={designControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Design File URL (Optional)"
                      placeholder="https://example.com/design-file.pdf"
                      error={!!designErrors.design_file_url}
                      helperText={designErrors.design_file_url?.message || 'Provide a link to the design file if available'}
                    />
                  )}
                />

                <Controller
                  name="design_notes"
                  control={designControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Design Notes"
                      multiline
                      rows={4}
                      placeholder="Add notes about the design, any special requirements, or status updates..."
                    />
                  )}
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDesignDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isDesignSubmitting}>
              {isDesignSubmitting ? 'Updating...' : 'Update Design'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Production; 