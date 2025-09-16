import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
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
  LinearProgress,
  Autocomplete,
} from '@mui/material';
import {
  Add,
  Search,
  Payment,
  AccountBalance,
  TrendingUp,
  Warning,
  CheckCircle,
  Schedule,
  Person,
  CalendarToday,
  Receipt,
  MonetizationOn,
  Edit,
  Visibility,
  Print,
  PictureAsPdf,
  DateRange,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Payment as PaymentType, Customer, GST_Invoice } from '../types';
import { paymentApi, customerApi, gstInvoiceApi } from '../services/supabaseApi';
import { componentLogger } from '../utils/debug';
import PrintService, { PrintConfig } from '../services/printService';

// Payment validation schema
const paymentCreateSchema = yup.object({
  customer_id: yup.string().required('Customer is required'),
  invoice_id: yup.string().required('Invoice is required'),
  payment_amount: yup.number().positive('Amount must be positive').required('Payment amount is required'),
  payment_method: yup.string().required('Payment method is required'),
  payment_date: yup.string().required('Payment date is required'),
  reference_number: yup.string(),
  notes: yup.string(),
});

const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
];

interface PaymentWithDetails extends PaymentType {
  customer?: Customer;
  invoice?: GST_Invoice;
  outstanding_amount?: number;
  days_overdue?: number;
}

const Payments: React.FC = () => {
  const location = useLocation();
  const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<GST_Invoice[]>([]);
  const [outstandingInvoices, setOutstandingInvoices] = useState<GST_Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  const { control, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(paymentCreateSchema),
    defaultValues: {
      customer_id: '',
      invoice_id: '',
      payment_amount: 0,
      payment_method: 'upi',
      payment_date: new Date().toISOString().split('T')[0],
      reference_number: '',
      notes: '',
    },
  });

  const watchedCustomerId = watch('customer_id');
  const watchedInvoiceId = watch('invoice_id');

  const loadPayments = useCallback(async () => {
    componentLogger.info('Loading payments...');
    try {
      setLoading(true);
      const [paymentsData, customersData, invoicesData] = await Promise.all([
        paymentApi.getPayments().catch(() => []),
        customerApi.getCustomers().catch(() => []),
        gstInvoiceApi.getGSTInvoices().catch(() => [])
      ]);

      // Calculate outstanding amounts and aging
      const paymentsWithDetails = paymentsData.map(payment => {
        const invoice = invoicesData.find(i => i.id === payment.invoice_id);
        const customer = customersData.find(c => c.id === invoice?.customer_id);
        
        let outstanding_amount = 0;
        let days_overdue = 0;
        
        if (invoice) {
          const totalPaid = paymentsData
            .filter(p => p.invoice_id === invoice.id)
            .reduce((sum, p) => sum + p.payment_amount, 0);
          outstanding_amount = invoice.total_amount - totalPaid;
          
          // Calculate days overdue
          if (invoice.due_date && outstanding_amount > 0) {
            const today = new Date();
            const dueDate = new Date(invoice.due_date);
            days_overdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
          }
        }

        return {
          ...payment,
          customer,
          invoice,
          outstanding_amount,
          days_overdue,
          customer_id: invoice?.customer_id
        };
      });

      // Get outstanding invoices
      const outstanding = invoicesData.filter(invoice => {
        const totalPaid = paymentsData
          .filter(p => p.invoice_id === invoice.id)
          .reduce((sum, p) => sum + p.payment_amount, 0);
        return (invoice.total_amount - totalPaid) > 0;
      });

      setPayments(paymentsWithDetails);
      setCustomers(customersData);
      setInvoices(invoicesData);
      setOutstandingInvoices(outstanding);
      
      componentLogger.info('Payments loaded successfully', { 
        payments: paymentsData.length,
        outstanding: outstanding.length 
      });
    } catch (error: any) {
      componentLogger.error('Failed to load payments', error);
      setError('Failed to load payments: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  // Handle URL parameters for pre-filling the payment form
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const invoiceId = urlParams.get('invoice_id');
    const customerId = urlParams.get('customer_id');

    if (invoiceId && customerId) {
      // Pre-fill the form and open dialog
      setTimeout(() => {
        reset({
          customer_id: customerId,
          invoice_id: invoiceId,
          payment_amount: 0,
          payment_method: 'upi',
          payment_date: new Date().toISOString().split('T')[0],
          reference_number: '',
          notes: `Payment for invoice from GST Invoices page`,
        });
        setDialogOpen(true);
      }, 1000); // Give time for data to load
    }
  }, [location.search, reset]);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const handleCreatePayment = () => {
    reset({
      customer_id: '',
      invoice_id: '',
      payment_amount: 0,
      payment_method: 'upi',
      payment_date: new Date().toISOString().split('T')[0],
      reference_number: '',
      notes: '',
    });
    setDialogOpen(true);
  };

  const getCustomerInvoices = () => {
    if (!watchedCustomerId) return [];
    return outstandingInvoices.filter(invoice => invoice.customer_id === watchedCustomerId);
  };

  const getSelectedInvoiceDetails = () => {
    if (!watchedInvoiceId) return null;
    const invoice = invoices.find(i => i.id === watchedInvoiceId);
    if (!invoice) return null;

    const totalPaid = payments
      .filter(p => p.invoice_id === invoice.id)
      .reduce((sum, p) => sum + p.payment_amount, 0);
    
    const outstanding = invoice.total_amount - totalPaid;
    
    return { ...invoice, totalPaid, outstanding };
  };

  // Print Functions
  const handlePrintPaymentReceipt = useCallback(async (payment: PaymentWithDetails) => {
    try {
      PrintService.generatePaymentReceiptPDF({
        ...payment,
        customer_name: payment.customer?.name || 'Unknown Customer',
        invoice_number: payment.invoice?.invoice_number || 'N/A'
      });
      
      setSuccess('Payment receipt PDF generated successfully!');
    } catch (error: any) {
      setError('Failed to generate payment receipt PDF: ' + error.message);
    }
  }, []);

  const handlePrintPaymentReceiptDirect = useCallback(async (payment: PaymentWithDetails) => {
    try {
      const config: PrintConfig = {
        title: `PAYMENT RECEIPT`,
        subtitle: `Receipt Date: ${new Date(payment.payment_date).toLocaleDateString('en-IN')}`,
        data: [{
          index: 1,
          description: `Payment for Invoice: ${payment.invoice?.invoice_number || 'N/A'}`,
          payment_method: payment.payment_method.toUpperCase(),
          reference_number: payment.reference_number || 'N/A',
          payment_amount: payment.payment_amount,
          outstanding: payment.outstanding_amount || 0
        }],
        columns: [
          { header: 'Description', dataKey: 'description' },
          { header: 'Method', dataKey: 'payment_method' },
          { header: 'Reference', dataKey: 'reference_number' },
          { header: 'Amount', dataKey: 'payment_amount', align: 'right', format: 'currency' }
        ],
        summary: [
          { label: 'Payment Amount', value: payment.payment_amount, format: 'currency' },
          { label: 'Outstanding Balance', value: payment.outstanding_amount || 0, format: 'currency' },
          { label: 'Payment Method', value: payment.payment_method.toUpperCase() }
        ],
        footer: `Customer: ${payment.customer?.name || 'Unknown'} | Invoice: ${payment.invoice?.invoice_number || 'N/A'}`
      };

      PrintService.printDocument(config);
      setSuccess('Payment receipt sent to printer!');
    } catch (error: any) {
      setError('Failed to print payment receipt: ' + error.message);
    }
  }, []);


  const onSubmit = async (data: any) => {
    try {
      componentLogger.info('Creating payment', data);
      await paymentApi.createPayment({
        customer_id: data.customer_id,
        invoice_id: data.invoice_id,
        payment_amount: Number(data.payment_amount),
        payment_method: data.payment_method,
        payment_date: data.payment_date,
        reference_number: data.reference_number || null,
        notes: data.notes || null,
      });

      setSuccess('Payment recorded successfully');
      setDialogOpen(false);
      loadPayments();
    } catch (error: any) {
      componentLogger.error('Failed to create payment', error);
      setError('Failed to record payment: ' + error.message);
    }
  };

  // Calculate summary metrics
  const totalOutstanding = outstandingInvoices.reduce((sum, inv) => {
    const paid = payments.filter(p => p.invoice_id === inv.id).reduce((s, p) => s + p.payment_amount, 0);
    return sum + (inv.total_amount - paid);
  }, 0);

  const overdueInvoices = outstandingInvoices.filter(inv => {
    if (!inv.due_date) return false;
    const today = new Date();
    const dueDate = new Date(inv.due_date);
    return today > dueDate;
  });

  const totalOverdue = overdueInvoices.reduce((sum, inv) => {
    const paid = payments.filter(p => p.invoice_id === inv.id).reduce((s, p) => s + p.payment_amount, 0);
    return sum + (inv.total_amount - paid);
  }, 0);

  const totalReceived = payments.reduce((sum, payment) => sum + payment.payment_amount, 0);

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch = 
      payment.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.invoice?.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.reference_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMethod = !methodFilter || payment.payment_method === methodFilter;
    const matchesCustomer = !customerFilter || payment.customer_id === customerFilter;
    
    // Date filtering
    const paymentDate = new Date(payment.payment_date);
    const matchesFromDate = !fromDate || paymentDate >= new Date(fromDate);
    const matchesToDate = !toDate || paymentDate <= new Date(toDate + 'T23:59:59');
    
    return matchesSearch && matchesMethod && matchesCustomer && matchesFromDate && matchesToDate;
  });

  const handlePrintPaymentStatement = useCallback(() => {
    try {
      if (filteredPayments.length === 0) {
        setError('No payments found for the selected criteria');
        return;
      }

      const config: PrintConfig = {
        title: `PAYMENT STATEMENT`,
        subtitle: `Total Payments: ${filteredPayments.length}`,
        dateRange: fromDate && toDate ? { from: fromDate, to: toDate } : undefined,
        data: filteredPayments.map((payment, index) => ({
          index: index + 1,
          payment_date: payment.payment_date,
          customer_name: payment.customer?.name || 'Unknown',
          invoice_number: payment.invoice?.invoice_number || 'N/A',
          payment_method: payment.payment_method.toUpperCase(),
          reference_number: payment.reference_number || 'N/A',
          payment_amount: payment.payment_amount,
          outstanding_amount: payment.outstanding_amount || 0
        })),
        columns: [
          { header: 'S.No', dataKey: 'index', align: 'center' },
          { header: 'Date', dataKey: 'payment_date', format: 'date' },
          { header: 'Customer', dataKey: 'customer_name' },
          { header: 'Invoice', dataKey: 'invoice_number' },
          { header: 'Method', dataKey: 'payment_method' },
          { header: 'Reference', dataKey: 'reference_number' },
          { header: 'Amount', dataKey: 'payment_amount', align: 'right', format: 'currency' },
          { header: 'Outstanding', dataKey: 'outstanding_amount', align: 'right', format: 'currency' }
        ],
        summary: [
          { label: 'Total Payments', value: filteredPayments.length, format: 'number' },
          { label: 'Total Amount Received', value: filteredPayments.reduce((sum, payment) => sum + payment.payment_amount, 0), format: 'currency' },
          { label: 'Total Outstanding', value: filteredPayments.reduce((sum, payment) => sum + (payment.outstanding_amount || 0), 0), format: 'currency' }
        ]
      };

      PrintService.generatePDF(config);
      setSuccess('Payment statement generated successfully!');
    } catch (error: any) {
      setError('Failed to generate payment statement: ' + error.message);
    }
  }, [filteredPayments, fromDate, toDate]);

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'cash': return 'success';
      case 'upi': return 'primary';
      case 'bank_transfer': return 'info';
      case 'cheque': return 'warning';
      default: return 'default';
    }
  };

  const selectedInvoiceDetails = getSelectedInvoiceDetails();

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Payment Management
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleCreatePayment} sx={{ px: 3 }}>
          Record Payment
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

      {/* Payment Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 3, mb: 3 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <MonetizationOn sx={{ mr: 1, color: 'success.main' }} />
              <Typography variant="h6" color="text.secondary">
                Total Received
              </Typography>
            </Box>
            <Typography variant="h4" fontWeight="bold" color="success.main">
              ₹{totalReceived.toFixed(2)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {payments.length} payments recorded
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <TrendingUp sx={{ mr: 1, color: 'warning.main' }} />
              <Typography variant="h6" color="text.secondary">
                Total Outstanding
              </Typography>
            </Box>
            <Typography variant="h4" fontWeight="bold" color="warning.main">
              ₹{totalOutstanding.toFixed(2)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {outstandingInvoices.length} pending invoices
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Warning sx={{ mr: 1, color: 'error.main' }} />
              <Typography variant="h6" color="text.secondary">
                Overdue Amount
              </Typography>
            </Box>
            <Typography variant="h4" fontWeight="bold" color="error.main">
              ₹{totalOverdue.toFixed(2)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {overdueInvoices.length} overdue invoices
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <AccountBalance sx={{ mr: 1, color: 'info.main' }} />
              <Typography variant="h6" color="text.secondary">
                Collection Rate
              </Typography>
            </Box>
            <Typography variant="h4" fontWeight="bold" color="info.main">
              {totalReceived + totalOutstanding > 0 ? 
                ((totalReceived / (totalReceived + totalOutstanding)) * 100).toFixed(1) : 0}%
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={totalReceived + totalOutstanding > 0 ? 
                (totalReceived / (totalReceived + totalOutstanding)) * 100 : 0} 
              sx={{ mt: 1, height: 8, borderRadius: 4 }}
              color="info"
            />
          </CardContent>
        </Card>
      </Box>

      {/* Outstanding Invoices Alert */}
      {overdueInvoices.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2" fontWeight="medium">
            {overdueInvoices.length} invoice(s) are overdue! Total overdue amount: ₹{totalOverdue.toFixed(2)}
          </Typography>
        </Alert>
      )}

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, mb: 2 }}>
            <Box sx={{ flex: 2 }}>
              <TextField
                fullWidth
                placeholder="Search by customer, invoice number, or reference..."
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
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value)}
                  label="Payment Method"
                >
                  <MenuItem value="">All Methods</MenuItem>
                  {paymentMethods.map((method) => (
                    <MenuItem key={method.value} value={method.value}>
                      {method.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: 1 }}>
              <FormControl fullWidth>
                <InputLabel>Customer</InputLabel>
                <Select
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  label="Customer"
                >
                  <MenuItem value="">All Customers</MenuItem>
                  {customers.map((customer) => (
                    <MenuItem key={customer.id} value={customer.id}>
                      {customer.name}
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
                onClick={handlePrintPaymentStatement}
                disabled={filteredPayments.length === 0}
                size="small"
              >
                Generate Statement
              </Button>
              {(searchTerm || methodFilter || customerFilter || fromDate || toDate) && (
                <Button
                  variant="text"
                  onClick={() => {
                    setSearchTerm('');
                    setMethodFilter('');
                    setCustomerFilter('');
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

      {/* Payments Table */}
      <Card>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredPayments.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Payment sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                {searchTerm || methodFilter || customerFilter ? 'No payments found matching your criteria' : 'No payments recorded yet'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {searchTerm || methodFilter || customerFilter ? 'Try adjusting your search or filters' : 'Record your first payment to get started'}
              </Typography>
              {!searchTerm && !methodFilter && !customerFilter && (
                <Button variant="contained" startIcon={<Add />} onClick={handleCreatePayment}>
                  Record First Payment
                </Button>
              )}
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Payment Date</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Invoice</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Reference</TableCell>
                    <TableCell>Outstanding</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CalendarToday sx={{ mr: 1, color: 'text.secondary', fontSize: 16 }} />
                          {new Date(payment.payment_date).toLocaleDateString()}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Person sx={{ mr: 1, color: 'text.secondary' }} />
                          {payment.customer?.name || 'Unknown'}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Receipt sx={{ mr: 1, color: 'text.secondary' }} />
                          {payment.invoice?.invoice_number || 'N/A'}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium" color="success.main">
                          ₹{payment.payment_amount.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={payment.payment_method.toUpperCase()}
                          color={getPaymentMethodColor(payment.payment_method) as any}
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{payment.reference_number || '-'}</TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          color={(payment.outstanding_amount || 0) > 0 ? 'warning.main' : 'success.main'}
                          fontWeight="medium"
                        >
                          ₹{payment.outstanding_amount?.toFixed(2) || '0.00'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={(payment.outstanding_amount || 0) > 0 ? 'Partial' : 'Paid'}
                          color={(payment.outstanding_amount || 0) > 0 ? 'warning' : 'success'}
                          variant="outlined"
                          size="small"
                          icon={(payment.outstanding_amount || 0) > 0 ? <Schedule /> : <CheckCircle />}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton 
                            size="small" 
                            onClick={() => handlePrintPaymentReceipt(payment)}
                            title="Generate Receipt PDF"
                            color="primary"
                          >
                            <PictureAsPdf />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => handlePrintPaymentReceiptDirect(payment)}
                            title="Print Receipt"
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

      {/* Create Payment Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Record New Payment</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                <Controller
                  name="customer_id"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <Autocomplete
                      options={customers}
                      getOptionLabel={(customer) => `${customer.name} (${customer.phone || customer.email})`}
                      value={customers.find(c => c.id === value) || null}
                      onChange={(_, customer) => {
                        onChange(customer?.id || '');
                        // Reset invoice selection when customer changes
                        reset(prev => ({ ...prev, invoice_id: '', payment_amount: 0 }));
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Customer"
                          error={!!errors.customer_id}
                          helperText={errors.customer_id?.message}
                        />
                      )}
                      sx={{ flex: 1 }}
                    />
                  )}
                />
              </Box>

              {watchedCustomerId && (
                <Controller
                  name="invoice_id"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.invoice_id}>
                      <InputLabel>Outstanding Invoice</InputLabel>
                      <Select {...field} label="Outstanding Invoice">
                        {getCustomerInvoices().map((invoice) => {
                          const paid = payments
                            .filter(p => p.invoice_id === invoice.id)
                            .reduce((sum, p) => sum + p.payment_amount, 0);
                          const outstanding = invoice.total_amount - paid;
                          
                          return (
                            <MenuItem key={invoice.id} value={invoice.id}>
                              {invoice.invoice_number} - Outstanding: ₹{outstanding.toFixed(2)}
                            </MenuItem>
                          );
                        })}
                      </Select>
                      {errors.invoice_id && (
                        <Typography variant="caption" color="error">
                          {errors.invoice_id.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />
              )}

              {selectedInvoiceDetails && (
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Invoice:</strong> {selectedInvoiceDetails.invoice_number}<br/>
                    <strong>Total Amount:</strong> ₹{selectedInvoiceDetails.total_amount.toFixed(2)}<br/>
                    <strong>Already Paid:</strong> ₹{selectedInvoiceDetails.totalPaid.toFixed(2)}<br/>
                    <strong>Outstanding:</strong> ₹{selectedInvoiceDetails.outstanding.toFixed(2)}
                  </Typography>
                </Alert>
              )}

              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                <Controller
                  name="payment_amount"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="number"
                      label="Payment Amount (₹)"
                      inputProps={{ min: 0, step: 0.01 }}
                      error={!!errors.payment_amount}
                      helperText={errors.payment_amount?.message || 
                        (selectedInvoiceDetails ? `Max: ₹${selectedInvoiceDetails.outstanding.toFixed(2)}` : '')}
                      sx={{ flex: 1 }}
                    />
                  )}
                />

                <Controller
                  name="payment_method"
                  control={control}
                  render={({ field }) => (
                    <FormControl sx={{ flex: 1 }}>
                      <InputLabel>Payment Method</InputLabel>
                      <Select {...field} label="Payment Method">
                        {paymentMethods.map((method) => (
                          <MenuItem key={method.value} value={method.value}>
                            {method.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />

                <Controller
                  name="payment_date"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="date"
                      label="Payment Date"
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.payment_date}
                      helperText={errors.payment_date?.message}
                      sx={{ flex: 1 }}
                    />
                  )}
                />
              </Box>

              <Controller
                name="reference_number"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Reference Number"
                    placeholder="Transaction ID, Cheque number, etc."
                  />
                )}
              />

              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Payment Notes"
                    multiline
                    rows={3}
                    placeholder="Any additional notes about this payment..."
                  />
                )}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Payments;