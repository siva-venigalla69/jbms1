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
  Checkbox,
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
  Receipt,
  DateRange,
  Print,
  PictureAsPdf,
} from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { DeliveryChallan, Customer, Order } from '../types';
import { deliveryChallanApi, customerApi, orderApi } from '../services/supabaseApi';
import { componentLogger } from '../utils/debug';
import PrintService, { PrintConfig } from '../services/printService';

// Form validation schema
const challanCreateSchema = yup.object({
  customer_id: yup.string().required('Customer is required'),
  delivery_date: yup.string().required('Delivery date is required'),
  status: yup.string().required('Status is required'),
  notes: yup.string(),
  items: yup.array().of(
    yup.object({
      order_id: yup.string().required(),
      order_item_id: yup.string().required(),
      material_type: yup.string().required(),
      quantity_delivered: yup.number().positive('Quantity must be positive').required('Quantity is required'),
      unit_price: yup.number().min(0, 'Price cannot be negative').required('Unit price is required'),
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
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedChallan, setSelectedChallan] = useState<DeliveryChallan | null>(null);
  const [challanItems, setChallanItems] = useState<any[]>([]);
  const [selectedChallans, setSelectedChallans] = useState<string[]>([]);
  const [bulkInvoiceDialogOpen, setBulkInvoiceDialogOpen] = useState(false);
  const [gstRate, setGstRate] = useState<number>(5); // Default 5% GST

  // Create challan form
  const { control, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(challanCreateSchema),
    defaultValues: {
      customer_id: '',
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
      delivery_date: new Date().toISOString().split('T')[0],
      status: 'pending',
      notes: '',
      items: [],
    });
    setDialogOpen(true);
  };

  // Get customer orders with items
  const getCustomerOrders = () => {
    if (!watchedCustomerId) return [];
    return orders.filter(order => 
      order.customer_id === watchedCustomerId && 
      order.status !== 'cancelled' &&
      order.order_items && 
      order.order_items.length > 0
    );
  };

  // Get all available order items for delivery
  const getAvailableOrderItems = () => {
    const customerOrders = getCustomerOrders();
    const availableItems: Array<{
      order_id: string;
      order_item_id: string;
      order_number: string;
      material_type: string;
      total_quantity: number;
      unit_price: number;
      customization_details?: string;
    }> = [];
    
    customerOrders.forEach(order => {
      order.order_items?.forEach(item => {
        availableItems.push({
          order_id: order.id,
          order_item_id: item.id,
          order_number: order.order_number,
          material_type: item.material_type,
          total_quantity: item.quantity,
          unit_price: item.unit_price,
          customization_details: item.customization_details
        });
      });
    });
    
    return availableItems;
  };

  const addDeliveryItem = () => {
    const availableItems = getAvailableOrderItems();
    if (availableItems.length > 0) {
      const firstItem = availableItems[0];
      appendItem({
        order_id: firstItem.order_id,
        order_item_id: firstItem.order_item_id,
        material_type: firstItem.material_type,
        quantity_delivered: 1,
        unit_price: firstItem.unit_price,
        notes: ''
      });
    }
  };

  const removeDeliveryItem = (index: number) => {
    removeItem(index);
  };

  const onSubmit = async (data: any) => {
    try {
      componentLogger.info('Creating delivery challan with items', data);
      
      // Calculate total amount
      const totalAmount = data.items.reduce((sum: number, item: any) => 
        sum + (item.quantity_delivered * item.unit_price), 0
      );
      
      const challanData = {
        customer_id: data.customer_id,
        delivery_date: data.delivery_date,
        status: data.status,
        notes: data.notes,
        total_amount: totalAmount,
        items: data.items.map((item: any) => ({
          order_id: item.order_id,
          order_item_id: item.order_item_id,
          material_type: item.material_type,
          quantity_delivered: Number(item.quantity_delivered),
          unit_price: Number(item.unit_price),
          notes: item.notes || '',
        }))
      };
      
      await deliveryChallanApi.createDeliveryChallan(challanData);
      setSuccess(`Delivery challan created successfully with ${data.items.length} items`);
      setDialogOpen(false);
      loadDeliveryChallans();
    } catch (error: any) {
      componentLogger.error('Failed to create delivery challan', error);
      setError('Failed to create delivery challan: ' + error.message);
    }
  };

  const handleViewChallan = async (challanId: string) => {
    componentLogger.info('Viewing delivery challan details', { challanId });
    try {
      const [challanDetails, items] = await Promise.all([
        deliveryChallanApi.getDeliveryChallan(challanId),
        deliveryChallanApi.getDeliveryChallanItems(challanId)
      ]);
      
      setSelectedChallan(challanDetails);
      setChallanItems(items);
      setViewDialogOpen(true);
    } catch (error: any) {
      componentLogger.error('Failed to load delivery challan details', error);
      setError('Failed to load delivery challan details: ' + error.message);
    }
  };

  const handleEditChallan = async (challanId: string) => {
    componentLogger.info('Editing delivery challan', { challanId });
    try {
      const [challanDetails, items] = await Promise.all([
        deliveryChallanApi.getDeliveryChallan(challanId),
        deliveryChallanApi.getDeliveryChallanItems(challanId)
      ]);
      
      setSelectedChallan(challanDetails);
      setChallanItems(items);
      
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

  // Print Functions
  const handlePrintChallan = useCallback(async (challan: DeliveryChallan) => {
    try {
      // Get challan items
      const items = await deliveryChallanApi.getDeliveryChallanItems(challan.id);
      const itemsWithIndex = items.map((item, index) => ({
        ...item,
        index: index + 1,
        material_type: item.order_item?.material_type || 'Unknown',
        quantity: item.quantity,
        unit_price: item.order_item?.unit_price || 0,
        line_total: item.quantity * (item.order_item?.unit_price || 0),
        description: `${item.order_item?.material_type || 'Item'} - ${item.order_item?.design_notes || 'No details'}`
      }));

      PrintService.generateChallanPDF({
        ...challan,
        customer_name: challan.customer?.name || 'Unknown Customer'
      }, itemsWithIndex);
      
      setSuccess('Challan PDF generated successfully!');
    } catch (error: any) {
      setError('Failed to generate challan PDF: ' + error.message);
    }
  }, []);

  const handlePrintChallanDirect = useCallback(async (challan: DeliveryChallan) => {
    try {
      // Get challan items
      const items = await deliveryChallanApi.getDeliveryChallanItems(challan.id);
      const itemsWithIndex = items.map((item, index) => ({
        ...item,
        index: index + 1,
        material_type: item.order_item?.material_type || 'Unknown',
        quantity: item.quantity,
        unit_price: item.order_item?.unit_price || 0,
        line_total: item.quantity * (item.order_item?.unit_price || 0),
        description: `${item.order_item?.material_type || 'Item'} - ${item.order_item?.design_notes || 'No details'}`
      }));

      const config: PrintConfig = {
        title: `DELIVERY CHALLAN`,
        subtitle: `Challan No: ${challan.challan_number} | Date: ${new Date(challan.delivery_date).toLocaleDateString('en-IN')}`,
        data: itemsWithIndex,
        columns: [
          { header: 'S.No', dataKey: 'index', align: 'center' },
          { header: 'Description', dataKey: 'description' },
          { header: 'Material', dataKey: 'material_type' },
          { header: 'Qty Delivered', dataKey: 'quantity', align: 'right', format: 'number' },
          { header: 'Rate', dataKey: 'unit_price', align: 'right', format: 'currency' },
          { header: 'Amount', dataKey: 'line_total', align: 'right', format: 'currency' }
        ],
        summary: [
          { label: 'Total Items', value: items.length, format: 'number' },
          { label: 'Total Quantity', value: items.reduce((sum, item) => sum + item.quantity, 0), format: 'number' },
          { label: 'Total Amount', value: items.reduce((sum, item) => sum + (item.quantity * (item.order_item?.unit_price || 0)), 0), format: 'currency' }
        ],
        footer: `Customer: ${challan.customer?.name || 'Unknown'} | Status: ${challan.status.toUpperCase()}`
      };

      PrintService.printDocument(config);
      setSuccess('Challan sent to printer!');
    } catch (error: any) {
      setError('Failed to print challan: ' + error.message);
    }
  }, []);


  const handleGenerateInvoice = async (challanId: string, challanNumber: string) => {
    const gstRateInput = prompt(`Enter GST rate (%) for invoice generation:`, gstRate.toString());
    if (gstRateInput === null) return; // User cancelled
    
    const inputGstRate = parseFloat(gstRateInput);
    if (isNaN(inputGstRate) || inputGstRate < 0 || inputGstRate > 100) {
      setError('Please enter a valid GST rate between 0 and 100');
      return;
    }

    if (!window.confirm(`Generate invoice for delivery challan ${challanNumber} with ${inputGstRate}% GST?`)) {
      return;
    }

    try {
      componentLogger.info('Generating invoice from delivery challan', { challanId, gstRate: inputGstRate });
      const invoice = await deliveryChallanApi.generateInvoiceFromChallan(challanId, inputGstRate);
      setSuccess(`Invoice ${invoice.invoice_number} generated successfully from challan ${challanNumber} with ${inputGstRate}% GST!`);
    } catch (error: any) {
      componentLogger.error('Failed to generate invoice from challan', error);
      setError('Failed to generate invoice: ' + error.message);
    }
  };

  const handleBulkInvoiceGeneration = async () => {
    const deliveredChallans = selectedChallans.filter(challanId => {
      const challan = challans.find(c => c.id === challanId);
      return challan?.status === 'delivered';
    });

    if (deliveredChallans.length === 0) {
      setError('Please select at least one delivered challan to generate invoices.');
      return;
    }

    if (isNaN(gstRate) || gstRate < 0 || gstRate > 100) {
      setError('Please enter a valid GST rate between 0 and 100');
      return;
    }

    if (!window.confirm(`Generate ${deliveredChallans.length} separate invoice(s) for selected delivery challans with ${gstRate}% GST?`)) {
      return;
    }

    try {
      const invoices = [];
      for (const challanId of deliveredChallans) {
        const challan = challans.find(c => c.id === challanId);
        if (challan) {
          const invoice = await deliveryChallanApi.generateInvoiceFromChallan(challanId, gstRate);
          invoices.push(invoice);
        }
      }
      
      setSuccess(`Successfully generated ${invoices.length} separate invoice(s) from selected delivery challans with ${gstRate}% GST!`);
      setSelectedChallans([]);
      setBulkInvoiceDialogOpen(false);
    } catch (error: any) {
      componentLogger.error('Failed to generate bulk invoices', error);
      setError('Failed to generate invoices: ' + error.message);
    }
  };

  const handleConsolidatedInvoiceGeneration = async () => {
    const deliveredChallans = selectedChallans.filter(challanId => {
      const challan = challans.find(c => c.id === challanId);
      return challan?.status === 'delivered';
    });

    if (deliveredChallans.length === 0) {
      setError('Please select at least one delivered challan to generate consolidated invoice.');
      return;
    }

    // Check if all challans belong to the same customer
    const customers = Array.from(new Set(deliveredChallans.map(challanId => {
      const challan = challans.find(c => c.id === challanId);
      return challan?.customer_id;
    })));

    if (customers.length > 1) {
      setError('All selected delivery challans must belong to the same customer for consolidated invoicing.');
      return;
    }

    if (isNaN(gstRate) || gstRate < 0 || gstRate > 100) {
      setError('Please enter a valid GST rate between 0 and 100');
      return;
    }

    if (!window.confirm(`Generate 1 consolidated invoice for ${deliveredChallans.length} selected delivery challans with ${gstRate}% GST?`)) {
      return;
    }

    try {
      const invoice = await deliveryChallanApi.generateConsolidatedInvoice(deliveredChallans, gstRate);
      setSuccess(`Successfully generated consolidated invoice ${invoice.invoice_number} from ${deliveredChallans.length} delivery challans with ${gstRate}% GST!`);
      setSelectedChallans([]);
      setBulkInvoiceDialogOpen(false);
    } catch (error: any) {
      componentLogger.error('Failed to generate consolidated invoice', error);
      setError('Failed to generate consolidated invoice: ' + error.message);
    }
  };

  const handleSelectChallan = (challanId: string) => {
    setSelectedChallans(prev => 
      prev.includes(challanId) 
        ? prev.filter(id => id !== challanId)
        : [...prev, challanId]
    );
  };

  const handleSelectAllChallans = () => {
    const deliveredChallanIds = filteredChallans
      .filter(challan => challan.status === 'delivered')
      .map(challan => challan.id);
    
    if (selectedChallans.length === deliveredChallanIds.length) {
      setSelectedChallans([]);
    } else {
      setSelectedChallans(deliveredChallanIds);
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
    
    const challanDate = new Date(challan.delivery_date);
    const matchesFromDate = !fromDate || challanDate >= new Date(fromDate);
    const matchesToDate = !toDate || challanDate <= new Date(toDate + 'T23:59:59');
    
    return matchesSearch && matchesStatus && matchesFromDate && matchesToDate;
  });

  const handlePrintChallanStatement = useCallback(() => {
    try {
      if (filteredChallans.length === 0) {
        setError('No challans found for the selected criteria');
        return;
      }

      // For the statement, we'll omit amount information since DeliveryChallan doesn't have total_amount
      const config: PrintConfig = {
        title: `DELIVERY CHALLAN STATEMENT`,
        subtitle: `Total Challans: ${filteredChallans.length}`,
        dateRange: fromDate && toDate ? { from: fromDate, to: toDate } : undefined,
        data: filteredChallans.map((challan, index) => ({
          index: index + 1,
          challan_number: challan.challan_number,
          delivery_date: challan.delivery_date,
          customer_name: challan.customer?.name || 'Unknown',
          status: challan.status.toUpperCase(),
          created_date: challan.created_at
        })),
        columns: [
          { header: 'S.No', dataKey: 'index', align: 'center' },
          { header: 'Challan No', dataKey: 'challan_number' },
          { header: 'Delivery Date', dataKey: 'delivery_date', format: 'date' },
          { header: 'Customer', dataKey: 'customer_name' },
          { header: 'Status', dataKey: 'status', align: 'center' },
          { header: 'Created', dataKey: 'created_date', format: 'date' }
        ],
        summary: [
          { label: 'Total Challans', value: filteredChallans.length, format: 'number' },
          { label: 'Pending', value: filteredChallans.filter(c => c.status === 'pending').length, format: 'number' },
          { label: 'Delivered', value: filteredChallans.filter(c => c.status === 'delivered').length, format: 'number' },
          { label: 'Returned', value: filteredChallans.filter(c => c.status === 'returned').length, format: 'number' }
        ]
      };

      PrintService.generatePDF(config);
      setSuccess('Challan statement generated successfully!');
    } catch (error: any) {
      setError('Failed to generate challan statement: ' + error.message);
    }
  }, [filteredChallans, fromDate, toDate]);

  const statusOptions = ['pending', 'delivered', 'returned'];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Delivery Challans
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {selectedChallans.length > 0 && (
            <Button 
              variant="outlined" 
              startIcon={<Receipt />} 
              onClick={() => setBulkInvoiceDialogOpen(true)}
              color="success"
            >
              Generate Invoices ({selectedChallans.length})
            </Button>
          )}
          <Button variant="contained" startIcon={<Add />} onClick={handleCreateChallan} sx={{ px: 3 }}>
            Create Challan
          </Button>
        </Box>
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
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', lg: 'row' }, flexWrap: 'wrap' }}>
            <Box sx={{ flex: 2, minWidth: 250 }}>
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
            <Box sx={{ flex: 1, minWidth: 150 }}>
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
                      {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
                    </MenuItem>
                  ))}
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

            {/* Print Statement Button */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<PictureAsPdf />}
                onClick={handlePrintChallanStatement}
                disabled={filteredChallans.length === 0}
                size="small"
              >
                Generate Statement
              </Button>
              {/* Clear Filters Button */}
              {(searchTerm || statusFilter || fromDate || toDate) && (
                <Button
                  variant="text"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('');
                    setFromDate('');
                    setToDate('');
                  }}
                  size="small"
                >
                  Clear Filters
                </Button>
              )}
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
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={selectedChallans.length > 0 && selectedChallans.length < filteredChallans.filter(c => c.status === 'delivered').length}
                        checked={filteredChallans.filter(c => c.status === 'delivered').length > 0 && selectedChallans.length === filteredChallans.filter(c => c.status === 'delivered').length}
                        onChange={handleSelectAllChallans}
                        title="Select all delivered challans"
                      />
                    </TableCell>
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
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedChallans.includes(challan.id)}
                          onChange={() => handleSelectChallan(challan.id)}
                          disabled={challan.status !== 'delivered'}
                          title={challan.status === 'delivered' ? 'Select for invoice generation' : 'Only delivered challans can be selected'}
                        />
                      </TableCell>
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
                          label={challan.status ? challan.status.charAt(0).toUpperCase() + challan.status.slice(1) : 'Unknown'}
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
                          <IconButton 
                            size="small" 
                            onClick={() => handlePrintChallan(challan)}
                            title="Generate PDF"
                            color="primary"
                          >
                            <PictureAsPdf />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => handlePrintChallanDirect(challan)}
                            title="Print Challan"
                            color="secondary"
                          >
                            <Print />
                          </IconButton>
                          {challan.status === 'delivered' && (
                            <IconButton 
                              size="small" 
                              onClick={() => handleGenerateInvoice(challan.id, challan.challan_number)}
                              title="Generate Invoice"
                              color="success"
                            >
                              <Receipt />
                            </IconButton>
                          )}
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6">Available Orders</Typography>
                  {!watchedCustomerId && (
                    <Typography variant="caption" color="text.secondary">
                      Select a customer first to see available orders
                    </Typography>
                  )}
                </Box>
                
                {watchedCustomerId && getCustomerOrders().length === 0 && (
                  <Alert severity="info">
                    No pending orders found for this customer with items ready for delivery.
                  </Alert>
                )}
                
                {watchedCustomerId && getCustomerOrders().length > 0 && (
                  <Alert severity="success">
                    Found {getCustomerOrders().length} orders with {getAvailableOrderItems().length} items available for delivery.
                  </Alert>
                )}
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
                            {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Box>

              {/* Delivery Items Section */}
              {watchedCustomerId && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Delivery Items</Typography>
                    <Button
                      startIcon={<AddCircle />}
                      onClick={addDeliveryItem}
                      variant="outlined"
                      size="small"
                      disabled={getAvailableOrderItems().length === 0}
                    >
                      Add Item
                    </Button>
                  </Box>
                  
                  {deliveryItems.map((field, index) => {
                    const availableItems = getAvailableOrderItems();
                    const selectedOrderItemId = watch(`items.${index}.order_item_id`);
                    const selectedItem = availableItems.find(item => 
                      item.order_item_id === selectedOrderItemId
                    );
                    
                    return (
                      <Card key={field.id} variant="outlined" sx={{ mb: 2 }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="subtitle1">Delivery Item {index + 1}</Typography>
                            <IconButton
                              size="small"
                              onClick={() => removeDeliveryItem(index)}
                              color="error"
                            >
                              <RemoveCircle />
                            </IconButton>
                          </Box>
                          
                          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, mb: 2 }}>
                            <Controller
                              name={`items.${index}.order_item_id`}
                              control={control}
                              render={({ field }) => (
                                <FormControl fullWidth>
                                  <InputLabel>Order Item</InputLabel>
                                  <Select 
                                    {...field} 
                                    label="Order Item"
                                    onChange={(e) => {
                                      field.onChange(e);
                                      // Auto-fill other fields when order item is selected
                                      const selectedItem = availableItems.find(item => item.order_item_id === e.target.value);
                                      if (selectedItem) {
                                        // Update other fields automatically
                                        const formData = {
                                          [`items.${index}.order_id`]: selectedItem.order_id,
                                          [`items.${index}.material_type`]: selectedItem.material_type,
                                          [`items.${index}.unit_price`]: selectedItem.unit_price,
                                        };
                                        Object.entries(formData).forEach(([path, value]) => {
                                          setValue(path as any, value);
                                        });
                                      }
                                    }}
                                  >
                                    {availableItems.map((item) => (
                                      <MenuItem key={item.order_item_id} value={item.order_item_id}>
                                        {item.order_number} - {item.material_type} (Qty: {item.total_quantity})
                                        {item.customization_details && ` - ${item.customization_details}`}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              )}
                            />
                          </Box>
                          
                          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                            <Controller
                              name={`items.${index}.quantity_delivered`}
                              control={control}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  type="number"
                                  label="Quantity to Deliver"
                                  inputProps={{ min: 1 }}
                                  sx={{ minWidth: 150 }}
                                  helperText={selectedItem ? `Max: ${selectedItem.total_quantity}` : ''}
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
                                  label="Unit Price"
                                  inputProps={{ min: 0, step: 0.01 }}
                                  sx={{ minWidth: 120 }}
                                />
                              )}
                            />
                            
                            <TextField
                              label="Subtotal"
                              value={(watch(`items.${index}.quantity_delivered`) || 0) * (watch(`items.${index}.unit_price`) || 0)}
                              disabled
                              sx={{ minWidth: 120 }}
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
                          
                          {/* Hidden fields for auto-populated data */}
                          <Controller
                            name={`items.${index}.order_id`}
                            control={control}
                            render={({ field }) => <input type="hidden" {...field} />}
                          />
                          <Controller
                            name={`items.${index}.material_type`}
                            control={control}
                            render={({ field }) => <input type="hidden" {...field} />}
                          />
                        </CardContent>
                      </Card>
                    );
                  })}
                  
                  {deliveryItems.length === 0 && watchedCustomerId && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      No delivery items added yet. Click "Add Item" to specify what materials to deliver from the customer's orders.
                    </Alert>
                  )}
                  
                  {getAvailableOrderItems().length === 0 && watchedCustomerId && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      No order items available for delivery for this customer. Make sure the customer has pending orders with items.
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
                          label={selectedChallan.status ? selectedChallan.status.charAt(0).toUpperCase() + selectedChallan.status.slice(1) : 'Unknown'}
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

                {/* Challan Items */}
                <Grid size={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        Delivery Items ({challanItems.length})
                      </Typography>
                      
                      {challanItems.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          No items found for this challan
                        </Typography>
                      ) : (
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Material Type</TableCell>
                                <TableCell align="center">Quantity Delivered</TableCell>
                                <TableCell>Order Item Details</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {challanItems.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell>
                                    <Typography variant="body2" fontWeight="medium">
                                      {item.order_item?.material_type ? 
                                        item.order_item.material_type.charAt(0).toUpperCase() + item.order_item.material_type.slice(1) : 
                                        'Unknown'
                                      }
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="center">
                                    <Chip
                                      label={item.quantity}
                                      color="primary"
                                      size="small"
                                      variant="outlined"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="caption" color="text.secondary">
                                      {item.order_item?.design_notes || 'No design notes'}
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
                            {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
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
              
              {/* Challan Items */}
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Delivery Items ({challanItems.length})
                </Typography>
                
                {challanItems.length === 0 ? (
                  <Alert severity="warning">
                    No items found for this challan
                  </Alert>
                ) : (
                  <Card variant="outlined">
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Material Type</TableCell>
                            <TableCell align="center">Current Quantity</TableCell>
                            <TableCell>Order Item Details</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {challanItems.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <Typography variant="body2" fontWeight="medium">
                                  {item.order_item?.material_type ? 
                                    item.order_item.material_type.charAt(0).toUpperCase() + item.order_item.material_type.slice(1) : 
                                    'Unknown'
                                  }
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <TextField
                                  size="small"
                                  type="number"
                                  inputProps={{ min: 0 }}
                                  defaultValue={item.quantity}
                                  onChange={(e) => {
                                    const newQuantity = parseInt(e.target.value) || 0;
                                    setChallanItems(prev => 
                                      prev.map((prevItem, prevIndex) => 
                                        prevIndex === index 
                                          ? { ...prevItem, quantity: newQuantity }
                                          : prevItem
                                      )
                                    );
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption" color="text.secondary">
                                  {item.order_item?.design_notes || 'No design notes'}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Card>
                )}
              </Box>

              <Alert severity="info">
                You can edit delivery date, status, notes, and item quantities. To modify customer or order, please create a new challan.
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

      {/* Bulk Invoice Generation Dialog */}
      <Dialog open={bulkInvoiceDialogOpen} onClose={() => setBulkInvoiceDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Receipt />
            <Typography variant="h6">Generate Invoices for Selected Challans</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>            
            <Typography variant="h6" gutterBottom>
              Selected Challans ({selectedChallans.length}):
            </Typography>
            
            <Box sx={{ maxHeight: 300, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1, p: 2, mb: 3 }}>
              {selectedChallans.map(challanId => {
                const challan = challans.find(c => c.id === challanId);
                return challan ? (
                  <Box key={challan.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
                    <LocalShipping sx={{ color: 'text.secondary' }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight="medium">
                        {challan.challan_number}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {challan.customer?.name} - {new Date(challan.delivery_date).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Chip 
                      label={challan.status ? challan.status.charAt(0).toUpperCase() + challan.status.slice(1) : 'Unknown'}
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                  </Box>
                ) : null;
              })}
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <TextField
                label="GST Rate (%)"
                type="number"
                value={gstRate}
                onChange={(e) => setGstRate(parseFloat(e.target.value) || 0)}
                inputProps={{ min: 0, max: 100, step: 0.1 }}
                sx={{ width: 150 }}
                size="small"
              />
            </Box>

            <Typography variant="h6" gutterBottom>
              Choose Invoice Generation Method:
            </Typography>
            
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Card variant="outlined" sx={{ p: 2, height: '100%', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Receipt color="primary" />
                    <Typography variant="h6" color="primary">
                      Separate Invoices
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Generate {selectedChallans.length} individual invoice(s), one for each delivery challan.
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    • Each challan becomes a separate invoice
                    • Individual invoice numbers (INV-DC-[CHALLAN_NUMBER]-[TIMESTAMP])
                    • GST rate will be provided during generation
                  </Typography>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Card variant="outlined" sx={{ p: 2, height: '100%', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Receipt color="success" />
                    <Typography variant="h6" color="success">
                      Consolidated Invoice
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Generate 1 consolidated invoice combining all {selectedChallans.length} delivery challan(s).
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    • All challans combined into single invoice
                    • Single invoice number (INV-CONSOLIDATED-[TIMESTAMP])
                    • GST rate will be provided during generation
                    • Must belong to same customer
                  </Typography>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkInvoiceDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="outlined" 
            onClick={handleBulkInvoiceGeneration}
            startIcon={<Receipt />}
            color="primary"
          >
            Generate {selectedChallans.length} Separate Invoice(s)
          </Button>
          <Button 
            variant="contained" 
            onClick={handleConsolidatedInvoiceGeneration}
            startIcon={<Receipt />}
            color="success"
          >
            Generate 1 Consolidated Invoice
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DeliveryChallans;