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
  PersonAdd,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { OrderItem, Order, ProductionStage, DesignStatus, ProductionStatus, MaterialIn } from '../types';
import { orderItemApi, orderApi, materialInApi, customerDesignApi, designerApi } from '../services/supabaseApi';
import { componentLogger } from '../utils/debug';
import { parseDesignStatus, parseDesignStatusLegacy, parseProductionStatus, getDesignStatusLabel, getProductionStatusLabel } from '../utils/productionUtils';

// Form validation schema for design updates
const designUpdateSchema = yup.object({
  design_status: yup.string().required('Design status is required'),
  design_file_url: yup.string().url('Must be a valid URL'),
  design_notes: yup.string(),
  designs_provided_quantity: yup.number().min(0, 'Must be 0 or greater').nullable(),
  designs_approved_quantity: yup.number().min(0, 'Must be 0 or greater').nullable(),
});

// Form validation schema for production updates
const productionStatusUpdateSchema = yup.object({
  production_status: yup.string().required('Production status is required'),
});

// Form validation schema for assignment creation
const assignmentCreateSchema = yup.object({
  designer_id: yup.string().required('Designer is required'),
  priority_level: yup.string().required('Priority level is required'),
  expected_delivery_date: yup.string().required('Expected delivery date is required'),
  estimated_hours: yup.number().min(0.5, 'Must be at least 0.5 hours').required('Estimated hours is required'),
  assigned_design_quantity: yup.number().min(1, 'Must assign at least 1 design').required('Design quantity is required'),
  assignment_notes: yup.string(),
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
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [selectedOrderItem, setSelectedOrderItem] = useState<OrderItem | null>(null);
  const [designerWorkloads, setDesignerWorkloads] = useState<any[]>([]);
  const [designAssignmentSummary, setDesignAssignmentSummary] = useState<any>(null);
  const [existingAssignments, setExistingAssignments] = useState<any[]>([]);
  const [allAssignmentSummaries, setAllAssignmentSummaries] = useState<Map<string, any>>(new Map());

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
      designs_provided_quantity: 0,
      designs_approved_quantity: 0,
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

  // Assignment creation form
  const { 
    control: assignmentControl, 
    handleSubmit: handleAssignmentSubmit, 
    reset: assignmentReset, 
    formState: { errors: assignmentErrors, isSubmitting: isAssignmentSubmitting } 
  } = useForm({
    resolver: yupResolver(assignmentCreateSchema),
    defaultValues: {
      designer_id: '',
      priority_level: 'normal',
      expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
      estimated_hours: 2.0,
      assigned_design_quantity: 1,
      assignment_notes: '',
    },
  });

  const loadAssignmentSummaries = async (orderItems: OrderItem[]) => {
    try {
      const summaries = await Promise.all(
        orderItems.map(async (item) => {
          try {
            const summary = await designerApi.getDesignAssignmentSummary(item.id);
            return { orderItemId: item.id, summary };
          } catch (error) {
            // Return default summary if API call fails
            return {
              orderItemId: item.id,
              summary: {
                order_item_id: item.id,
                designs_approved_quantity: item.designs_approved_quantity || 0,
                total_assigned_designs: 0,
                unassigned_designs: item.designs_approved_quantity || 0,
                number_of_designers: 0
              }
            };
          }
        })
      );

      const summaryMap = new Map();
      summaries.forEach(({ orderItemId, summary }) => {
        summaryMap.set(orderItemId, summary);
      });
      setAllAssignmentSummaries(summaryMap);
    } catch (error) {
      console.error('Failed to load assignment summaries:', error);
    }
  };

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
      
      // Load customer design summaries for stock-wide tracking
      const customerDesignData = await customerDesignApi.getCustomerDesignSummaries();
      
      // Load designer workloads for assignment creation
      const designerWorkloadData = await designerApi.getDesignerWorkloads();
      setDesignerWorkloads(designerWorkloadData);
      
      // Load assignment summaries for all order items
      await loadAssignmentSummaries(orderItemsData);
      
      componentLogger.info('Production data loaded successfully', { 
        orderItems: orderItemsData.length,
        orders: ordersData.length,
        materialStock: materialStockData.length,
        customerDesignSummaries: customerDesignData.length,
        designerWorkloads: designerWorkloadData.length
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
      designs_provided_quantity: orderItem.designs_provided_quantity || 0,
      designs_approved_quantity: orderItem.designs_approved_quantity || 0,
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

  const handleAssignmentCreate = async (orderItem: OrderItem) => {
    setSelectedOrderItem(orderItem);
    
    try {
      // Load design assignment summary and existing assignments
      const [summary, assignments] = await Promise.all([
        designerApi.getDesignAssignmentSummary(orderItem.id).catch(() => ({
          order_item_id: orderItem.id,
          designs_approved_quantity: orderItem.designs_approved_quantity || 0,
          total_assigned_designs: 0,
          unassigned_designs: orderItem.designs_approved_quantity || 0,
          number_of_designers: 0,
          designer_assignments: []
        })),
        designerApi.getOrderItemAssignments(orderItem.id).catch(() => [])
      ]);
      
      setDesignAssignmentSummary(summary);
      setExistingAssignments(assignments);
      
      const maxAssignable = summary.unassigned_designs || (orderItem.designs_approved_quantity || 1);
      
      assignmentReset({
        designer_id: '',
        priority_level: 'normal',
        expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        estimated_hours: 2.0,
        assigned_design_quantity: Math.min(maxAssignable, 1),
        assignment_notes: '',
      });
      
    } catch (error) {
      console.error('Failed to load assignment data:', error);
      // Set defaults if loading fails
      setDesignAssignmentSummary(null);
      setExistingAssignments([]);
      assignmentReset({
        designer_id: '',
        priority_level: 'normal',
        expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        estimated_hours: 2.0,
        assigned_design_quantity: 1,
        assignment_notes: '',
      });
    }
    
    setAssignmentDialogOpen(true);
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
          designs_provided_quantity: data.designs_provided_quantity,
          designs_approved_quantity: data.designs_approved_quantity,
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

  const onAssignmentSubmit = async (data: any) => {
    if (!selectedOrderItem) return;
    try {
      // Create design assignment
      await designerApi.createAssignment({
        order_item_id: selectedOrderItem.id,
        designer_id: data.designer_id,
        priority_level: data.priority_level,
        expected_delivery_date: data.expected_delivery_date,
        estimated_hours: data.estimated_hours,
        assigned_design_quantity: data.assigned_design_quantity,
        assignment_notes: data.assignment_notes,
      });
      
      setSuccess(`Design assignment created successfully! Assigned ${data.assigned_design_quantity} design(s) to designer.`);
      setAssignmentDialogOpen(false);
      setSelectedOrderItem(null);
      setDesignAssignmentSummary(null);
      setExistingAssignments([]);
      loadProductionData();
    } catch (error: any) {
      setError('Failed to create assignment: ' + error.message);
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

  // Design Requirement Analytics - ENHANCED with actual quantities
  const getDesignRequirementStats = () => {
    const designStats = {
      // Overall totals
      totalCustomers: 0,
      totalOrderItems: orderItems.length,
      totalMaterialStock: 0,
      
      // Design coverage (using actual quantities now)
      totalDesignsProvided: 0,
      totalDesignsApproved: 0,
      totalOrderQuantity: 0,
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

    // Calculate design coverage for orders using ACTUAL quantities
    designStats.totalOrderQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    designStats.totalDesignsProvided = orderItems.reduce((sum, item) => sum + (item.designs_provided_quantity || 0), 0);
    designStats.totalDesignsApproved = orderItems.reduce((sum, item) => sum + (item.designs_approved_quantity || 0), 0);
    
    designStats.designCoverageForOrders = designStats.totalOrderQuantity > 0 ? 
      (designStats.totalDesignsApproved / designStats.totalOrderQuantity) * 100 : 0;
    designStats.designShortageForOrders = Math.max(0, designStats.totalOrderQuantity - designStats.totalDesignsApproved);

    // Calculate design coverage for stock
    designStats.totalStockNeedingDesigns = designStats.totalMaterialStock;
    designStats.designCoverageForStock = designStats.totalMaterialStock > 0 ? 
      (designStats.totalDesignsApproved / designStats.totalMaterialStock) * 100 : 0;
    designStats.designShortageForStock = Math.max(0, designStats.totalMaterialStock - designStats.totalDesignsApproved);

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
        
        // Use actual design quantities instead of just status
        const designsProvidedQty = customerOrderItems
          .filter(item => item.material_type === materialType)
          .reduce((sum, item) => sum + (item.designs_provided_quantity || 0), 0);
          
        const designsApprovedQty = customerOrderItems
          .filter(item => item.material_type === materialType)
          .reduce((sum, item) => sum + (item.designs_approved_quantity || 0), 0);

        if (orderQty > 0 || stockQty > 0) {
          customerStats.materialBreakdown[materialType] = {
            orderQty,
            stockQty,
            designsProvidedQty,
            designsApprovedQty,
            designShortageForOrders: Math.max(0, orderQty - designsApprovedQty),
            designShortageForStock: Math.max(0, stockQty - designsApprovedQty),
            designCoverageOrders: orderQty > 0 ? (designsApprovedQty / orderQty) * 100 : 0,
            designCoverageStock: stockQty > 0 ? (designsApprovedQty / stockQty) * 100 : 0
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
              {designRequirementStats.totalDesignsApproved} designs approved of {designRequirementStats.totalOrderQuantity} ordered items
            </Typography>
            <Typography variant="body2" color="info.main" sx={{ mt: 0.5 }}>
              📋 {designRequirementStats.totalDesignsProvided} total designs provided by customers
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
              {designRequirementStats.totalDesignsApproved} designs approved of {designRequirementStats.totalMaterialStock} total stock
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
                        <Typography variant="body2" color="info.main">
                          Provided: <strong>{breakdown.designsProvidedQty}</strong>
                        </Typography>
                        <Typography variant="body2" color="success.main">
                          Approved: <strong>{breakdown.designsApprovedQty}</strong>
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
                            Need: {breakdown.designShortageForOrders} more
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
                    <TableCell sx={{ minWidth: 100 }}>Design Qty</TableCell>
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
                        
                        {/* Design Quantity Column - NEW FEATURE */}
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              Provided: <strong>{item.designs_provided_quantity || 0}</strong>
                            </Typography>
                            <Typography variant="caption" color="success.main">
                              Approved: <strong>{item.designs_approved_quantity || 0}</strong>
                            </Typography>
                            {(() => {
                              const assignmentSummary = allAssignmentSummaries.get(item.id);
                              if (assignmentSummary && (item.designs_approved_quantity || 0) > 0) {
                                const totalAssigned = assignmentSummary.total_assigned_designs || 0;
                                const unassigned = assignmentSummary.unassigned_designs || 0;
                                const designerCount = assignmentSummary.number_of_designers || 0;
                                
                                return (
                                  <>
                                    <Typography variant="caption" color="primary.main">
                                      Assigned: <strong>{totalAssigned}</strong>
                                    </Typography>
                                    {unassigned > 0 && (
                                      <Typography variant="caption" color="warning.main">
                                        Unassigned: <strong>{unassigned}</strong>
                                      </Typography>
                                    )}
                                    {designerCount > 0 && (
                                      <Typography variant="caption" color="info.main">
                                        {designerCount} designer{designerCount > 1 ? 's' : ''}
                                      </Typography>
                                    )}
                                  </>
                                );
                              }
                              return null;
                            })()}
                            {item.quantity > 0 && (
                              <Typography 
                                variant="caption" 
                                color={(item.designs_approved_quantity || 0) >= item.quantity ? 'success.main' : 
                                      (item.designs_approved_quantity || 0) >= item.quantity * 0.8 ? 'warning.main' : 'error.main'}>
                                {Math.round(((item.designs_approved_quantity || 0) / item.quantity) * 100)}% ready
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        
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
                            <IconButton 
                              size="small" 
                              onClick={() => handleAssignmentCreate(item)}
                              title="Create Design Assignment"
                              color="secondary"
                            >
                              <PersonAdd />
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

                {/* NEW: Design Quantity Tracking Section */}
                <Card variant="outlined" sx={{ bgcolor: 'info.50', mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      📊 Design Quantity Tracking (NEW FEATURE)
                    </Typography>
                    
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Track exactly how many designs provided vs needed for <strong>{selectedOrderItem.material_type}</strong> (Order Qty: <strong>{selectedOrderItem.quantity}</strong>)
                    </Alert>
                    
                    <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                      <Controller
                        name="designs_provided_quantity"
                        control={designControl}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            type="number"
                            fullWidth
                            label="Designs Provided by Customer"
                            placeholder="0"
                            inputProps={{ min: 0, max: selectedOrderItem.quantity }}
                            error={!!designErrors.designs_provided_quantity}
                            helperText={designErrors.designs_provided_quantity?.message || `How many designs customer provided for this order`}
                            sx={{ flex: 1 }}
                          />
                        )}
                      />
                      
                      <Controller
                        name="designs_approved_quantity"
                        control={designControl}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            type="number"
                            fullWidth
                            label="Designs Approved for Production"
                            placeholder="0"
                            inputProps={{ min: 0, max: selectedOrderItem.quantity }}
                            error={!!designErrors.designs_approved_quantity}
                            helperText={designErrors.designs_approved_quantity?.message || `How many designs approved and ready`}
                            sx={{ flex: 1 }}
                          />
                        )}
                      />
                    </Box>
                    
                    {/* Design Quantity Analysis */}
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                      <Typography variant="body2" fontWeight="medium" gutterBottom>
                        📈 Analysis for this Order:
                      </Typography>
                      <Typography variant="body2">
                        • Ordered Quantity: <strong>{selectedOrderItem.quantity} {selectedOrderItem.material_type}s</strong>
                      </Typography>
                      <Typography variant="body2">
                        • Current Designs Provided: <strong>{selectedOrderItem.designs_provided_quantity || 0}</strong>
                      </Typography>
                      <Typography variant="body2">
                        • Current Designs Approved: <strong>{selectedOrderItem.designs_approved_quantity || 0}</strong>
                      </Typography>
                      <Typography variant="body2" color={
                        (selectedOrderItem.designs_approved_quantity || 0) >= selectedOrderItem.quantity ? 'success.main' : 
                        (selectedOrderItem.designs_approved_quantity || 0) >= selectedOrderItem.quantity * 0.8 ? 'warning.main' : 'error.main'
                      }>
                        • Coverage: <strong>
                          {selectedOrderItem.quantity > 0 ? 
                            Math.round(((selectedOrderItem.designs_approved_quantity || 0) / selectedOrderItem.quantity) * 100) : 0
                          }% 
                        </strong>
                        ({(selectedOrderItem.designs_approved_quantity || 0) >= selectedOrderItem.quantity ? '✅ Complete' : 
                          `⚠️ Need ${selectedOrderItem.quantity - (selectedOrderItem.designs_approved_quantity || 0)} more`})
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>

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

      {/* Assignment Creation Dialog */}
      <Dialog open={assignmentDialogOpen} onClose={() => setAssignmentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <PersonAdd />
            <Typography variant="h6">Create Design Assignment</Typography>
          </Box>
        </DialogTitle>
        <form onSubmit={handleAssignmentSubmit(onAssignmentSubmit)}>
          <DialogContent>
            {selectedOrderItem && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Creating assignment for: <strong>{selectedOrderItem.material_type}</strong> (Order Qty: {selectedOrderItem.quantity})
                  <br />
                  Order: {orders.find(o => o.order_items?.some(oi => oi.id === selectedOrderItem.id))?.order_number || 'Unknown'}
                </Alert>

                {/* Design Allocation Summary */}
                {designAssignmentSummary && (
                  <Card variant="outlined" sx={{ bgcolor: 'primary.50', mb: 2 }}>
                    <CardContent sx={{ py: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        📊 Design Allocation Status
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Chip 
                          label={`${designAssignmentSummary.designs_approved_quantity || 0} Designs Available`} 
                          color="info" 
                          variant="outlined" 
                        />
                        <Chip 
                          label={`${designAssignmentSummary.total_assigned_designs || 0} Already Assigned`} 
                          color="warning" 
                          variant="outlined" 
                        />
                        <Chip 
                          label={`${designAssignmentSummary.unassigned_designs || 0} Unassigned`} 
                          color={designAssignmentSummary.unassigned_designs > 0 ? 'success' : 'error'} 
                          variant="filled" 
                        />
                        <Chip 
                          label={`${designAssignmentSummary.number_of_designers || 0} Designer(s)`} 
                          color="default" 
                          variant="outlined" 
                        />
                      </Box>
                    </CardContent>
                  </Card>
                )}

                {/* Existing Assignments Display */}
                {existingAssignments.length > 0 && (
                  <Card variant="outlined" sx={{ bgcolor: 'grey.50', mb: 2 }}>
                    <CardContent sx={{ py: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        👥 Existing Assignments ({existingAssignments.length})
                      </Typography>
                      {existingAssignments.map((assignment, index) => (
                        <Box key={assignment.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
                          <Typography variant="body2">
                            Designer {index + 1}: {assignment.assigned_design_quantity} design(s)
                          </Typography>
                          <Chip label={assignment.status} size="small" variant="outlined" />
                        </Box>
                      ))}
                    </CardContent>
                  </Card>
                )}

                <Controller
                  name="designer_id"
                  control={assignmentControl}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!assignmentErrors.designer_id}>
                      <InputLabel>Assign to Designer</InputLabel>
                      <Select {...field} label="Assign to Designer">
                        {designerWorkloads.map((designer) => (
                          <MenuItem key={designer.designer_id} value={designer.designer_id}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2">
                                  {designer.designer_name || designer.designer_email}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Workload: {designer.pending_hours}h • {designer.pending_assignments} pending
                                </Typography>
                              </Box>
                              <Chip
                                label={designer.pending_hours > 30 ? 'Busy' : 'Available'}
                                color={designer.pending_hours > 30 ? 'error' : designer.pending_hours > 20 ? 'warning' : 'success'}
                                size="small"
                              />
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                      {assignmentErrors.designer_id && (
                        <Typography variant="caption" color="error">
                          {assignmentErrors.designer_id.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />

                <Controller
                  name="priority_level"
                  control={assignmentControl}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!assignmentErrors.priority_level}>
                      <InputLabel>Priority Level</InputLabel>
                      <Select {...field} label="Priority Level">
                        <MenuItem value="urgent">
                          <Chip label="URGENT" color="error" size="small" />
                          <Typography sx={{ ml: 1 }}>Urgent</Typography>
                        </MenuItem>
                        <MenuItem value="high">
                          <Chip label="HIGH" color="warning" size="small" />
                          <Typography sx={{ ml: 1 }}>High</Typography>
                        </MenuItem>
                        <MenuItem value="normal">
                          <Chip label="NORMAL" color="info" size="small" />
                          <Typography sx={{ ml: 1 }}>Normal</Typography>
                        </MenuItem>
                        <MenuItem value="low">
                          <Chip label="LOW" color="default" size="small" />
                          <Typography sx={{ ml: 1 }}>Low</Typography>
                        </MenuItem>
                      </Select>
                      {assignmentErrors.priority_level && (
                        <Typography variant="caption" color="error">
                          {assignmentErrors.priority_level.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />

                <Controller
                  name="expected_delivery_date"
                  control={assignmentControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="date"
                      label="Expected Delivery Date"
                      InputLabelProps={{ shrink: true }}
                      error={!!assignmentErrors.expected_delivery_date}
                      helperText={assignmentErrors.expected_delivery_date?.message}
                    />
                  )}
                />

                <Controller
                  name="estimated_hours"
                  control={assignmentControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="number"
                      label="Estimated Hours"
                      inputProps={{ min: 0.5, step: 0.5 }}
                      error={!!assignmentErrors.estimated_hours}
                      helperText={assignmentErrors.estimated_hours?.message || "Hours needed to complete this design work"}
                    />
                  )}
                />

                <Controller
                  name="assigned_design_quantity"
                  control={assignmentControl}
                  render={({ field }) => {
                    const maxAvailable = designAssignmentSummary?.unassigned_designs || 1;
                    const isOverMax = field.value && field.value > maxAvailable;
                    
                    return (
                      <TextField
                        {...field}
                        fullWidth
                        type="number"
                        label="Design Quantity"
                        inputProps={{ 
                          min: 1, 
                          max: maxAvailable,
                          step: 1 
                        }}
                        error={!!assignmentErrors.assigned_design_quantity || !!isOverMax}
                        helperText={
                          isOverMax 
                            ? `Cannot exceed ${maxAvailable} available designs`
                            : assignmentErrors.assigned_design_quantity?.message || 
                              `Number of designs to assign (Available: ${maxAvailable})`
                        }
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          field.onChange(Math.min(value, maxAvailable));
                        }}
                      />
                    );
                  }}
                />

                <Controller
                  name="assignment_notes"
                  control={assignmentControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Assignment Notes (Optional)"
                      multiline
                      rows={3}
                      placeholder="Special instructions, requirements, or notes for the designer..."
                      error={!!assignmentErrors.assignment_notes}
                      helperText={assignmentErrors.assignment_notes?.message}
                    />
                  )}
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAssignmentDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isAssignmentSubmitting}>
              {isAssignmentSubmitting ? 'Creating Assignment...' : 'Create Assignment'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Production; 