import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Receipt,
  Visibility,
  Edit,
  CheckCircle,
  Send,
  Error as ErrorIcon,
  Schedule,
  CurrencyRupee,
  Print,
  PictureAsPdf,
  DateRange,
  LocalShipping,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { GST_Invoice, Customer, Order } from '../types';
import { gstInvoiceApi, customerApi, orderApi } from '../services/supabaseApi';
import { componentLogger } from '../utils/debug';
import PrintService, { PrintConfig } from '../services/printService';

// Form validation schema
const invoiceCreateSchema = yup.object({
  customer_id: yup.string().required('Customer is required'),
  order_id: yup.string().required('Order is required'),
  invoice_date: yup.string().required('Invoice date is required'),
  subtotal: yup.number().positive('Subtotal must be positive').required('Subtotal is required'),
  tax_amount: yup.number().min(0, 'Tax amount cannot be negative').required('Tax amount is required'),
  total_amount: yup.number().positive('Total amount must be positive').required('Total amount is required'),
  status: yup.string().required('Status is required'),
  due_date: yup.string(),
  notes: yup.string(),
});

const invoiceEditSchema = yup.object({
  invoice_date: yup.string().required('Invoice date is required'),
  subtotal: yup.number().positive('Subtotal must be positive').required('Subtotal is required'),
  tax_amount: yup.number().min(0, 'Tax amount cannot be negative').required('Tax amount is required'),
  total_amount: yup.number().positive('Total amount must be positive').required('Total amount is required'),
  status: yup.string().required('Status is required'),
  due_date: yup.string(),
  notes: yup.string(),
});

const GSTInvoices: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<GST_Invoice[]>([]);
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
  const [selectedInvoice, setSelectedInvoice] = useState<GST_Invoice | null>(null);

  // Create invoice form
  const { control, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(invoiceCreateSchema),
    defaultValues: {
      customer_id: '',
      order_id: '',
      invoice_date: new Date().toISOString().split('T')[0],
      subtotal: 0,
      tax_amount: 0,
      total_amount: 0,
      status: 'draft',
      due_date: '',
      notes: '',
    },
  });

  // Edit invoice form
  const { 
    control: editControl, 
    handleSubmit: handleEditSubmit, 
    reset: editReset, 
    watch: editWatch,
    setValue: editSetValue,
    formState: { errors: editErrors, isSubmitting: isEditSubmitting } 
  } = useForm({
    resolver: yupResolver(invoiceEditSchema),
    defaultValues: {
      invoice_date: '',
      subtotal: 0,
      tax_amount: 0,
      total_amount: 0,
      status: 'draft',
      due_date: '',
      notes: '',
    },
  });

  // Watch for subtotal and tax changes to auto-calculate total
  const subtotal = watch('subtotal');
  const taxAmount = watch('tax_amount');
  const editSubtotal = editWatch('subtotal');
  const editTaxAmount = editWatch('tax_amount');

  useEffect(() => {
    if (subtotal !== undefined && taxAmount !== undefined) {
      setValue('total_amount', Number(subtotal || 0) + Number(taxAmount || 0));
    }
  }, [subtotal, taxAmount, setValue]);

  useEffect(() => {
    if (editSubtotal !== undefined && editTaxAmount !== undefined) {
      editSetValue('total_amount', Number(editSubtotal || 0) + Number(editTaxAmount || 0));
    }
  }, [editSubtotal, editTaxAmount, editSetValue]);

  const loadGSTInvoices = useCallback(async () => {
    componentLogger.info('Loading GST invoices...');
    try {
      setLoading(true);
      const invoicesData = await gstInvoiceApi.getGSTInvoices();
      componentLogger.info('GST invoices loaded successfully', { count: invoicesData.length });
      setInvoices(invoicesData);
    } catch (error: any) {
      componentLogger.error('Failed to load GST invoices', error);
      setError('Failed to load GST invoices: ' + error.message);
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
    loadGSTInvoices();
    loadCustomers();
    loadOrders();
  }, [loadGSTInvoices, loadCustomers, loadOrders]);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const handleCreateInvoice = () => {
    reset();
    setDialogOpen(true);
  };

  const onSubmit = async (data: any) => {
    try {
      await gstInvoiceApi.createGSTInvoice(data);
      setSuccess('GST Invoice created successfully');
      setDialogOpen(false);
      loadGSTInvoices();
    } catch (error: any) {
      setError('Failed to create GST invoice: ' + error.message);
    }
  };

  const handleCreateFromDeliveryChallan = () => {
    navigate('/challans');
  };

  const handleViewInvoice = async (invoiceId: string) => {
    componentLogger.info('Viewing GST invoice details', { invoiceId });
    try {
      const invoiceDetails = await gstInvoiceApi.getGSTInvoice(invoiceId);
      setSelectedInvoice(invoiceDetails);
      setViewDialogOpen(true);
    } catch (error: any) {
      componentLogger.error('Failed to load GST invoice details', error);
      setError('Failed to load GST invoice details: ' + error.message);
    }
  };

  const handleEditInvoice = async (invoiceId: string) => {
    componentLogger.info('Editing GST invoice', { invoiceId });
    try {
      const invoiceDetails = await gstInvoiceApi.getGSTInvoice(invoiceId);
      setSelectedInvoice(invoiceDetails);
      // Reset edit form with invoice data
      editReset({
        invoice_date: invoiceDetails.invoice_date,
        subtotal: invoiceDetails.subtotal,
        tax_amount: invoiceDetails.tax_amount,
        total_amount: invoiceDetails.total_amount,
        status: invoiceDetails.status,
        due_date: invoiceDetails.due_date || '',
        notes: invoiceDetails.notes || '',
      });
      setEditDialogOpen(true);
    } catch (error: any) {
      componentLogger.error('Failed to load GST invoice for editing', error);
      setError('Failed to load GST invoice for editing: ' + error.message);
    }
  };

  const handleUpdateInvoice = async (data: any) => {
    if (!selectedInvoice) return;
    
    try {
      await gstInvoiceApi.updateGSTInvoice(selectedInvoice.id, data);
      setSuccess(`GST Invoice ${selectedInvoice.invoice_number} updated successfully`);
      setEditDialogOpen(false);
      setSelectedInvoice(null);
      loadGSTInvoices();
    } catch (error: any) {
      setError('Failed to update GST invoice: ' + error.message);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Schedule />;
      case 'sent':
        return <Send />;
      case 'paid':
        return <CheckCircle />;
      case 'overdue':
        return <ErrorIcon />;
      default:
        return <Schedule />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'default';
      case 'sent':
        return 'info';
      case 'paid':
        return 'success';
      case 'overdue':
        return 'error';
      default:
        return 'default';
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch = 
      invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.order?.order_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || invoice.status === statusFilter;
    
    // Date filtering
    const invoiceDate = new Date(invoice.invoice_date);
    const matchesFromDate = !fromDate || invoiceDate >= new Date(fromDate);
    const matchesToDate = !toDate || invoiceDate <= new Date(toDate + 'T23:59:59');
    
    return matchesSearch && matchesStatus && matchesFromDate && matchesToDate;
  });

  // Print Functions
  const handlePrintInvoice = useCallback(async (invoice: GST_Invoice) => {
    try {
      // Create a default item since GST_Invoice doesn't have line_items property
      const invoiceItems = [
        {
          description: `Invoice: ${invoice.invoice_number}`,
          quantity: 1,
          unit_price: invoice.subtotal,
          line_total: invoice.subtotal
        }
      ];
      const itemsWithIndex = invoiceItems.map((item, index) => ({
        ...item,
        index: index + 1
      }));

      PrintService.generateInvoicePDF({
        ...invoice,
        customer_name: invoice.customer?.name || 'Unknown Customer'
      }, itemsWithIndex);
      
      setSuccess('Invoice PDF generated successfully!');
    } catch (error: any) {
      setError('Failed to generate invoice PDF: ' + error.message);
    }
  }, []);

  const handlePrintInvoiceDirect = useCallback(async (invoice: GST_Invoice) => {
    try {
      // Create a default item since GST_Invoice doesn't have line_items property
      const invoiceItems = [
        {
          description: `Invoice: ${invoice.invoice_number}`,
          quantity: 1,
          unit_price: invoice.subtotal,
          line_total: invoice.subtotal
        }
      ];
      const itemsWithIndex = invoiceItems.map((item, index) => ({
        ...item,
        index: index + 1
      }));

      const config: PrintConfig = {
        title: `GST INVOICE`,
        subtitle: `Invoice No: ${invoice.invoice_number} | Date: ${new Date(invoice.invoice_date).toLocaleDateString('en-IN')}`,
        data: itemsWithIndex,
        columns: [
          { header: 'S.No', dataKey: 'index', align: 'center' },
          { header: 'Description', dataKey: 'description' },
          { header: 'Qty', dataKey: 'quantity', align: 'right', format: 'number' },
          { header: 'Rate', dataKey: 'unit_price', align: 'right', format: 'currency' },
          { header: 'Amount', dataKey: 'line_total', align: 'right', format: 'currency' }
        ],
        summary: [
          { label: 'Subtotal', value: invoice.subtotal, format: 'currency' },
          { label: 'GST (18%)', value: invoice.tax_amount, format: 'currency' },
          { label: 'Total Amount', value: invoice.total_amount, format: 'currency' }
        ],
        footer: `Customer: ${invoice.customer?.name || 'Unknown'} | Due Date: ${new Date(invoice.due_date || '').toLocaleDateString('en-IN')}`
      };

      PrintService.printDocument(config);
      setSuccess('Invoice sent to printer!');
    } catch (error: any) {
      setError('Failed to print invoice: ' + error.message);
    }
  }, []);

  const handlePrintInvoiceStatement = useCallback(() => {
    try {
      if (filteredInvoices.length === 0) {
        setError('No invoices found for the selected criteria');
        return;
      }

      const config: PrintConfig = {
        title: `INVOICE STATEMENT`,
        subtitle: `Total Invoices: ${filteredInvoices.length}`,
        dateRange: fromDate && toDate ? { from: fromDate, to: toDate } : undefined,
        data: filteredInvoices.map((invoice, index) => ({
          index: index + 1,
          invoice_number: invoice.invoice_number,
          invoice_date: invoice.invoice_date,
          customer_name: invoice.customer?.name || 'Unknown',
          status: invoice.status.toUpperCase(),
          subtotal: invoice.subtotal,
          tax_amount: invoice.tax_amount,
          total_amount: invoice.total_amount
        })),
        columns: [
          { header: 'S.No', dataKey: 'index', align: 'center' },
          { header: 'Invoice No', dataKey: 'invoice_number' },
          { header: 'Date', dataKey: 'invoice_date', format: 'date' },
          { header: 'Customer', dataKey: 'customer_name' },
          { header: 'Status', dataKey: 'status', align: 'center' },
          { header: 'Subtotal', dataKey: 'subtotal', align: 'right', format: 'currency' },
          { header: 'Tax', dataKey: 'tax_amount', align: 'right', format: 'currency' },
          { header: 'Total', dataKey: 'total_amount', align: 'right', format: 'currency' }
        ],
        summary: [
          { label: 'Total Invoices', value: filteredInvoices.length, format: 'number' },
          { label: 'Total Value', value: filteredInvoices.reduce((sum, inv) => sum + inv.total_amount, 0), format: 'currency' },
          { label: 'Total Tax', value: filteredInvoices.reduce((sum, inv) => sum + inv.tax_amount, 0), format: 'currency' }
        ]
      };

      PrintService.generatePDF(config);
      setSuccess('Invoice statement generated successfully!');
    } catch (error: any) {
      setError('Failed to generate invoice statement: ' + error.message);
    }
  }, [filteredInvoices, fromDate, toDate]);

  const statusOptions = ['draft', 'sent', 'paid', 'overdue'];

  const totalInvoiceValue = invoices.reduce((sum, invoice) => sum + invoice.total_amount, 0);
  const totalOutstanding = invoices
    .filter(invoice => invoice.status !== 'paid')
    .reduce((sum, invoice) => sum + invoice.total_amount, 0);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          GST Invoices
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<LocalShipping />}
            onClick={handleCreateFromDeliveryChallan}
          >
            From Delivery Challan
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={handleCreateInvoice} sx={{ px: 3 }}>
            Create Invoice
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
              Total Invoices
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {invoices.length}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Total Value
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="primary.main">
              ₹{totalInvoiceValue.toFixed(2)}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Outstanding
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="warning.main">
              ₹{totalOutstanding.toFixed(2)}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Paid Invoices
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="success.main">
              {invoices.filter(i => i.status === 'paid').length}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, mb: 2 }}>
            <Box sx={{ flex: 2 }}>
              <TextField
                fullWidth
                placeholder="Search by invoice number, customer, or order..."
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
                      {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
          
          {/* Date Range Filters */}
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
              <DateRange sx={{ color: 'text.secondary' }} />
              <TextField
                label="From Date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ minWidth: 150 }}
              />
              <TextField
                label="To Date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ minWidth: 150 }}
              />
            </Box>
            
            {/* Print Statement Button */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<PictureAsPdf />}
                onClick={handlePrintInvoiceStatement}
                disabled={filteredInvoices.length === 0}
                size="small"
              >
                Generate Statement
              </Button>
              {(fromDate || toDate) && (
                <Button
                  variant="text"
                  onClick={() => {
                    setFromDate('');
                    setToDate('');
                  }}
                  size="small"
                >
                  Clear Dates
                </Button>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* GST Invoices Table */}
      <Card>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredInvoices.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Receipt sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                {searchTerm || statusFilter ? 'No invoices found matching your criteria' : 'No GST invoices yet'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {searchTerm || statusFilter ? 'Try adjusting your search or filters' : 'Create your first GST invoice to get started'}
              </Typography>
              {!searchTerm && !statusFilter && (
                <Button variant="contained" startIcon={<Add />} onClick={handleCreateInvoice}>
                  Create First Invoice
                </Button>
              )}
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Invoice Number</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Order Number</TableCell>
                    <TableCell>Invoice Date</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Receipt sx={{ mr: 1, color: 'text.secondary' }} />
                          {invoice.invoice_number}
                        </Box>
                      </TableCell>
                      <TableCell>{invoice.customer?.name || 'Unknown'}</TableCell>
                      <TableCell>{invoice.order?.order_number || 'N/A'}</TableCell>
                      <TableCell>
                        {new Date(invoice.invoice_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CurrencyRupee sx={{ fontSize: 16, mr: 0.5 }} />
                          {invoice.total_amount.toFixed(2)}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={invoice.status ? invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1) : 'Unknown'}
                          color={getStatusColor(invoice.status) as any}
                          variant="outlined"
                          size="small"
                          icon={getStatusIcon(invoice.status)}
                        />
                      </TableCell>
                      <TableCell>
                        {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton 
                            size="small" 
                            onClick={() => handleViewInvoice(invoice.id)}
                            title="View Details"
                          >
                            <Visibility />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => handleEditInvoice(invoice.id)}
                            title="Edit Invoice"
                          >
                            <Edit />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => handlePrintInvoice(invoice)}
                            title="Generate PDF"
                            color="primary"
                          >
                            <PictureAsPdf />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => handlePrintInvoiceDirect(invoice)}
                            title="Print Invoice"
                            color="secondary"
                          >
                            <Print />
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

      {/* Create Invoice Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New GST Invoice</DialogTitle>
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
                  name="order_id"
                  control={control}
                  rules={{ required: 'Order is required' }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.order_id}>
                      <InputLabel>Order</InputLabel>
                      <Select {...field} label="Order">
                        {orders.map((order) => (
                          <MenuItem key={order.id} value={order.id}>
                            {order.order_number} - {order.customer?.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                <Controller
                  name="invoice_date"
                  control={control}
                  rules={{ required: 'Invoice date is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Invoice Date"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.invoice_date}
                      helperText={errors.invoice_date?.message}
                    />
                  )}
                />
                <Controller
                  name="due_date"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Due Date"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                <Controller
                  name="subtotal"
                  control={control}
                  rules={{ required: 'Subtotal is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Subtotal (₹)"
                      type="number"
                      inputProps={{ step: "0.01" }}
                      error={!!errors.subtotal}
                      helperText={errors.subtotal?.message}
                    />
                  )}
                />
                <Controller
                  name="tax_amount"
                  control={control}
                  rules={{ required: 'Tax amount is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Tax Amount (₹)"
                      type="number"
                      inputProps={{ step: "0.01" }}
                      error={!!errors.tax_amount}
                      helperText={errors.tax_amount?.message}
                    />
                  )}
                />
                <Controller
                  name="total_amount"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Total Amount (₹)"
                      type="number"
                      inputProps={{ step: "0.01", readOnly: true }}
                      InputProps={{
                        readOnly: true,
                        style: { backgroundColor: '#f5f5f5' }
                      }}
                      helperText="Auto-calculated from subtotal + tax"
                    />
                  )}
                />
              </Box>
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
                    placeholder="Any special notes or terms for this invoice..."
                  />
                )}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Invoice'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Receipt />
            <Typography variant="h6">GST Invoice Details</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedInvoice && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        Invoice Information
                      </Typography>
                      <Typography variant="body2" color="text.secondary">Invoice Number</Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>{selectedInvoice.invoice_number}</Typography>
                      
                      <Typography variant="body2" color="text.secondary">Invoice Date</Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {new Date(selectedInvoice.invoice_date).toLocaleDateString()}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary">Due Date</Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {selectedInvoice.due_date ? new Date(selectedInvoice.due_date).toLocaleDateString() : 'Not set'}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary">Status</Typography>
                      <Box sx={{ mb: 2 }}>
                        <Chip
                          label={selectedInvoice.status ? selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1) : 'Unknown'}
                          color={getStatusColor(selectedInvoice.status) as any}
                          variant="outlined"
                          icon={getStatusIcon(selectedInvoice.status)}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        Amount Breakdown
                      </Typography>
                      <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>₹{selectedInvoice.subtotal.toFixed(2)}</Typography>
                      
                      <Typography variant="body2" color="text.secondary">Tax Amount</Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>₹{selectedInvoice.tax_amount.toFixed(2)}</Typography>
                      
                      <Typography variant="body2" color="text.secondary">Total Amount</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        ₹{selectedInvoice.total_amount.toFixed(2)}
                      </Typography>
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
                      <Typography variant="body1" sx={{ mb: 2 }}>{selectedInvoice.customer?.name}</Typography>
                      
                      <Typography variant="body2" color="text.secondary">Phone</Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {selectedInvoice.customer?.phone || 'Not provided'}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary">Email</Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {selectedInvoice.customer?.email || 'Not provided'}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary">GST Number</Typography>
                      <Typography variant="body1">
                        {selectedInvoice.customer?.gst_number || 'Not provided'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        Order Information
                      </Typography>
                      <Typography variant="body2" color="text.secondary">Order Number</Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>{selectedInvoice.order?.order_number}</Typography>
                      
                      <Typography variant="body2" color="text.secondary">Order Status</Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {selectedInvoice.order?.status ? 
                          selectedInvoice.order?.status ? selectedInvoice.order.status.charAt(0).toUpperCase() + selectedInvoice.order.status.slice(1) : 'Unknown' : 
                          'Unknown'
                        }
                      </Typography>
                      
                      {selectedInvoice.notes && (
                        <>
                          <Typography variant="body2" color="text.secondary">Invoice Notes</Typography>
                          <Typography variant="body1">{selectedInvoice.notes}</Typography>
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
              handleEditInvoice(selectedInvoice!.id);
            }}
          >
            Edit Invoice
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Invoice Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit GST Invoice</DialogTitle>
        <form onSubmit={handleEditSubmit(handleUpdateInvoice)}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {selectedInvoice && (
                <Alert severity="info">
                  Editing Invoice: {selectedInvoice.invoice_number}
                </Alert>
              )}
              
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                <Controller
                  name="invoice_date"
                  control={editControl}
                  rules={{ required: 'Invoice date is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Invoice Date"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      error={!!editErrors.invoice_date}
                      helperText={editErrors.invoice_date?.message}
                    />
                  )}
                />
                <Controller
                  name="due_date"
                  control={editControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Due Date"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                />
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                <Controller
                  name="subtotal"
                  control={editControl}
                  rules={{ required: 'Subtotal is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Subtotal (₹)"
                      type="number"
                      inputProps={{ step: "0.01" }}
                      error={!!editErrors.subtotal}
                      helperText={editErrors.subtotal?.message}
                    />
                  )}
                />
                <Controller
                  name="tax_amount"
                  control={editControl}
                  rules={{ required: 'Tax amount is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Tax Amount (₹)"
                      type="number"
                      inputProps={{ step: "0.01" }}
                      error={!!editErrors.tax_amount}
                      helperText={editErrors.tax_amount?.message}
                    />
                  )}
                />
                <Controller
                  name="total_amount"
                  control={editControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Total Amount (₹)"
                      type="number"
                      inputProps={{ step: "0.01", readOnly: true }}
                      InputProps={{
                        readOnly: true,
                        style: { backgroundColor: '#f5f5f5' }
                      }}
                      helperText="Auto-calculated from subtotal + tax"
                    />
                  )}
                />
              </Box>
              
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
                    placeholder="Any special notes or terms for this invoice..."
                  />
                )}
              />
              
              <Alert severity="info">
                You can edit all invoice details. To modify customer or order, please create a new invoice.
              </Alert>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isEditSubmitting}>
              {isEditSubmitting ? 'Updating...' : 'Update Invoice'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default GSTInvoices;