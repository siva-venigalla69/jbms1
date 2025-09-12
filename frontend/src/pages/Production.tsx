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
import { OrderItem, Order, ProductionStage, DesignStatus, ProductionStatus, MaterialIn } from '../types';
import { orderItemApi, orderApi, materialInApi } from '../services/supabaseApi';
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
  const [materialStock, setMaterialStock] = useState<MaterialIn[]>([]);
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
      
      // Load material stock for design requirement analysis
      const materialStockData = await materialInApi.getMaterialIn();
      setMaterialStock(materialStockData);
      
      componentLogger.info('Production data loaded successfully', { 
        orderItems: orderItemsData.length,
        orders: ordersData.length,
        materialStock: materialStockData.length 
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

  // Design Requirement Analytics - NEW FEATURE
  const getDesignRequirementStats = () => {
    const designStats = {
      // Overall totals
      totalCustomers: 0,
      totalOrderItems: orderItems.length,
      totalMaterialStock: 0,
      
      // Design coverage
      orderItemsWithDesignReady: 0,
      designCoverageForOrders: 0,
      designShortageForOrders: 0,
      
      // Material vs Design analysis
      totalStockNeedingDesigns: 0,
      designCoverageForStock: 0,
      designShortageForStock: 0,
      
      // Customer-wise breakdown
      customerBreakdown: new Map<string, any>()
    };

    // Get unique customers
    const customerIds = new Set(orders.map(order => order.customer_id));
    designStats.totalCustomers = customerIds.size;

    // Calculate total material stock
    designStats.totalMaterialStock = materialStock.reduce((sum, material) => sum + material.quantity, 0);

    // Calculate design coverage for orders
    designStats.orderItemsWithDesignReady = orderItems.filter(item => {
      const designStatus = parseDesignStatus(item.customization_details, item);
      return designStatus === 'design_ready';
    }).reduce((sum, item) => sum + item.quantity, 0);

    const totalOrderQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    designStats.designCoverageForOrders = totalOrderQuantity > 0 ? 
      (designStats.orderItemsWithDesignReady / totalOrderQuantity) * 100 : 0;
    designStats.designShortageForOrders = totalOrderQuantity - designStats.orderItemsWithDesignReady;

    // Calculate design coverage for stock
    designStats.totalStockNeedingDesigns = designStats.totalMaterialStock;
    designStats.designCoverageForStock = designStats.totalMaterialStock > 0 ? 
      (designStats.orderItemsWithDesignReady / designStats.totalMaterialStock) * 100 : 0;
    designStats.designShortageForStock = designStats.totalMaterialStock - designStats.orderItemsWithDesignReady;

    // Customer-wise analysis
    customerIds.forEach(customerId => {
      const customer = orders.find(o => o.customer_id === customerId)?.customer;
      if (!customer) return;

      const customerOrders = orders.filter(o => o.customer_id === customerId);
      const customerOrderItems = orderItems.filter(item => 
        customerOrders.some(order => order.id === item.order_id)
      );
      const customerMaterials = materialStock.filter(m => m.customer_id === customerId);

      // Calculate per material type
      const materialTypes = ['saree', 'dupatta', 'voni', 'running_material', 'blouse_material'];
      const customerStats: any = {
        customerName: customer.name,
        materialBreakdown: {}
      };

      materialTypes.forEach(materialType => {
        const orderQty = customerOrderItems
          .filter(item => item.material_type === materialType)
          .reduce((sum, item) => sum + item.quantity, 0);
        
        const stockQty = customerMaterials
          .filter(m => m.material_type === materialType)
          .reduce((sum, m) => sum + m.quantity, 0);
        
        const designReadyQty = customerOrderItems
          .filter(item => {
            const designStatus = parseDesignStatus(item.customization_details, item);
            return item.material_type === materialType && designStatus === 'design_ready';
          })
          .reduce((sum, item) => sum + item.quantity, 0);

        if (orderQty > 0 || stockQty > 0) {
          customerStats.materialBreakdown[materialType] = {
            orderQty,
            stockQty,
            designReadyQty,
            designShortageForOrders: Math.max(0, orderQty - designReadyQty),
            designShortageForStock: Math.max(0, stockQty - designReadyQty),
            designCoverageOrders: orderQty > 0 ? (designReadyQty / orderQty) * 100 : 0,
            designCoverageStock: stockQty > 0 ? (designReadyQty / stockQty) * 100 : 0
          };
        }
      });

      designStats.customerBreakdown.set(customerId, customerStats);
    });

    return designStats;
  };

  const stats = getItemStats();
  const designRequirementStats = getDesignRequirementStats();

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

      {/* Design Requirement Analytics - NEW FEATURE */}
      <Typography variant="h5" sx={{ mb: 2 }}>📊 Design Requirement Analytics</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 2, mb: 4 }}>
        {/* Design Coverage for Orders */}
        <Card 
          sx={{ 
            bgcolor: designRequirementStats.designCoverageForOrders >= 80 ? 'success.50' : 
                    designRequirementStats.designCoverageForOrders >= 50 ? 'warning.50' : 'error.50',
            cursor: 'pointer', 
            '&:hover': { elevation: 4 } 
          }}
          onClick={() => {
            setDesignStatusFilter('design_ready');
            setProductionStatusFilter('all');
          }}
        >
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Design Coverage - Orders
            </Typography>
            <Typography variant="h4" fontWeight="bold" 
              color={designRequirementStats.designCoverageForOrders >= 80 ? 'success.main' : 
                    designRequirementStats.designCoverageForOrders >= 50 ? 'warning.main' : 'error.main'}>
              {designRequirementStats.designCoverageForOrders.toFixed(1)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {designRequirementStats.orderItemsWithDesignReady} designs ready of {orderItems.reduce((sum, item) => sum + item.quantity, 0)} ordered items
            </Typography>
            {designRequirementStats.designShortageForOrders > 0 && (
              <Typography variant="body2" color="error.main" sx={{ mt: 1 }}>
                ⚠️ {designRequirementStats.designShortageForOrders} designs needed
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Design Coverage for Stock */}
        <Card 
          sx={{ 
            bgcolor: designRequirementStats.designCoverageForStock >= 50 ? 'success.50' : 
                    designRequirementStats.designCoverageForStock >= 20 ? 'warning.50' : 'error.50',
            cursor: 'pointer', 
            '&:hover': { elevation: 4 } 
          }}
          onClick={() => {
            // Show all material stock vs design status
            setDesignStatusFilter('all');
            setProductionStatusFilter('all');
          }}
        >
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Design Coverage - Total Stock
            </Typography>
            <Typography variant="h4" fontWeight="bold" 
              color={designRequirementStats.designCoverageForStock >= 50 ? 'success.main' : 
                    designRequirementStats.designCoverageForStock >= 20 ? 'warning.main' : 'error.main'}>
              {designRequirementStats.designCoverageForStock.toFixed(1)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {designRequirementStats.orderItemsWithDesignReady} designs ready of {designRequirementStats.totalMaterialStock} total stock
            </Typography>
            {designRequirementStats.designShortageForStock > 0 && (
              <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                📋 {designRequirementStats.designShortageForStock} more designs possible
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Design Shortage Alert */}
        <Card 
          sx={{ 
            bgcolor: designRequirementStats.designShortageForOrders > 0 ? 'error.50' : 'success.50',
            cursor: 'pointer', 
            '&:hover': { elevation: 4 } 
          }}
          onClick={() => {
            setDesignStatusFilter('pending_from_customer');
            setProductionStatusFilter('all');
          }}
        >
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Priority Design Shortage
            </Typography>
            <Typography variant="h4" fontWeight="bold" 
              color={designRequirementStats.designShortageForOrders > 0 ? 'error.main' : 'success.main'}>
              {designRequirementStats.designShortageForOrders}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {designRequirementStats.designShortageForOrders > 0 ? 
                'Designs urgently needed for current orders' : 
                'All current orders have designs ready!'}
            </Typography>
            {designRequirementStats.designShortageForOrders > 0 && (
              <Typography variant="body2" color="error.main" sx={{ mt: 1 }}>
                🚨 Action Required
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Customer Summary */}
        <Card 
          sx={{ 
            bgcolor: 'info.50',
            cursor: 'pointer', 
            '&:hover': { elevation: 4 } 
          }}
        >
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Customer Overview
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="info.main">
              {designRequirementStats.totalCustomers}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Active customers with material/orders
            </Typography>
            <Typography variant="body2" color="info.main" sx={{ mt: 1 }}>
              📈 Click individual cards to filter
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Customer-wise Design Breakdown */}
      {designRequirementStats.customerBreakdown.size > 0 && (
        <>
          <Typography variant="h6" sx={{ mb: 2 }}>🏢 Customer Design Status Breakdown</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2, mb: 4 }}>
            {Array.from(designRequirementStats.customerBreakdown.entries()).map(([customerId, customerStats]) => (
              <Card key={customerId} variant="outlined">
                <CardContent>
                  <Typography variant="h6" color="primary" gutterBottom>
                    {customerStats.customerName}
                  </Typography>
                  {Object.entries(customerStats.materialBreakdown).map(([materialType, breakdown]: [string, any]) => (
                    <Box key={materialType} sx={{ mb: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="subtitle2" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>
                        {materialType.replace('_', ' ')}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                        <Typography variant="body2">
                          Orders: <strong>{breakdown.orderQty}</strong>
                        </Typography>
                        <Typography variant="body2">
                          Stock: <strong>{breakdown.stockQty}</strong>
                        </Typography>
                        <Typography variant="body2">
                          Designs: <strong>{breakdown.designReadyQty}</strong>
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                        <Typography variant="body2" 
                          color={breakdown.designCoverageOrders >= 80 ? 'success.main' : 
                                breakdown.designCoverageOrders >= 50 ? 'warning.main' : 'error.main'}>
                          Order Coverage: {breakdown.designCoverageOrders.toFixed(0)}%
                        </Typography>
                        {breakdown.designShortageForOrders > 0 && (
                          <Typography variant="body2" color="error.main">
                            Need: {breakdown.designShortageForOrders}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            ))}
          </Box>
        </>
      )}

      {/* Existing Summary Cards - Your Requested Combinations */}
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
            <TableContainer sx={{ maxHeight: '70vh', overflowX: 'auto' }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ minWidth: 120, position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 2 }}>Order Number</TableCell>
                    <TableCell sx={{ minWidth: 150 }}>Customer</TableCell>
                    <TableCell sx={{ minWidth: 100 }}>Material</TableCell>
                    <TableCell sx={{ minWidth: 60 }}>Qty</TableCell>
                    <TableCell sx={{ minWidth: 120 }}>Design Status</TableCell>
                    <TableCell sx={{ minWidth: 120 }}>Production Status</TableCell>
                    <TableCell sx={{ minWidth: 100 }}>Progress</TableCell>
                    <TableCell sx={{ minWidth: 200, display: { xs: 'none', md: 'table-cell' } }}>Customization</TableCell>
                    <TableCell sx={{ minWidth: 100, position: 'sticky', right: 0, bgcolor: 'background.paper', zIndex: 2 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredOrderItems.map((item) => {
                    const order = getOrderByItemId(item.id);
                    const progress = getStageProgress(item.current_stage || 'design_pending');
                    
                    // FIX: Use consistent parsing methods - same as dialogs
                    const designStatus = parseDesignStatus(item.customization_details, item);
                    const productionStatus = parseProductionStatus(item.customization_details, item);
                    
                    const getDesignChip = () => {
                      // FIX: Use new consistent status values instead of legacy boolean logic
                      switch (designStatus) {
                        case 'design_ready':
                          return <Chip label="Ready" color="success" size="small" icon={<CheckCircle />} />;
                        case 'design_received_from_customer':
                          return <Chip label="Received" color="warning" size="small" icon={<Assignment />} />;
                        case 'pending_from_customer':
                        default:
                          return <Chip label="Pending" color="error" size="small" icon={<Pending />} />;
                      }
                    };
                    
                    const getProductionChip = () => {
                      // FIX: Use production status instead of current_stage mapping
                      switch (productionStatus) {
                        case 'post_process':
                          return <Chip label="Post Process" color="success" size="small" icon={<CheckCircle />} />;
                        case 'printing':
                          return <Chip label="Printing" color="primary" size="small" icon={<Factory />} />;
                        case 'pre_treatment':
                          return <Chip label="Pre-treatment" color="info" size="small" icon={<Assignment />} />;
                        case 'pending':
                        default:
                          return <Chip label="Pending" color="warning" size="small" icon={<Pending />} />;
                      }
                    };
                    
                    return (
                      <TableRow key={item.id} hover>
                        <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Assignment sx={{ mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2" fontWeight="medium">
                              {order?.order_number || 'Unknown'}
                            </Typography>
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
                        
                        {/* Production Status Column - FIXED to use consistent parsing */}
                        <TableCell>
                          {getProductionChip()}
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
                        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.customization_details || 'None'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ position: 'sticky', right: 0, bgcolor: 'background.paper', zIndex: 1 }}>
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <IconButton 
                              size="small" 
                              onClick={() => handleDesignUpdate(item)}
                              title="Update Design Status"
                              color={designStatus === 'design_ready' ? 'success' : 'warning'}
                            >
                              <Visibility />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              onClick={() => handleProductionUpdate(item)}
                              title="Update Production Status"
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