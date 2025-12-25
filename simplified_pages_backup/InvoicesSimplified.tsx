import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import {
  Add,
  Refresh,
  Receipt,
} from '@mui/icons-material';
import { simplifiedApi, Customer, Order, GSTInvoice } from '../services/simplifiedApi';

const InvoicesSimplified: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<GSTInvoice[]>([]);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [invoiceType, setInvoiceType] = useState<'job_work' | 'sales'>('job_work');
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [cgstRate, setCgstRate] = useState<number>(9);
  const [sgstRate, setSgstRate] = useState<number>(9);
  const [igstRate, setIgstRate] = useState<number>(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [customerData, orderData, invoiceData] = await Promise.all([
        simplifiedApi.customers.getAll(),
        simplifiedApi.orders.getAll(),
        simplifiedApi.invoices.getAll(),
      ]);

      setCustomers(customerData);
      setOrders(orderData);
      setInvoices(invoiceData);
    } catch (err: any) {
      setError('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    const cgstAmount = (subtotal * cgstRate) / 100;
    const sgstAmount = (subtotal * sgstRate) / 100;
    const igstAmount = (subtotal * igstRate) / 100;
    const totalAmount = subtotal + cgstAmount + sgstAmount + igstAmount;

    return { cgstAmount, sgstAmount, igstAmount, totalAmount };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomerId || !selectedOrderId || subtotal <= 0) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      const { cgstAmount, sgstAmount, igstAmount, totalAmount } = calculateTotals();

      const invoiceData = {
        invoice_number: '', // Auto-generated
        customer_id: selectedCustomerId,
        order_id: selectedOrderId,
        invoice_type: invoiceType,
        invoice_date: invoiceDate,
        subtotal,
        cgst_rate: cgstRate,
        cgst_amount: cgstAmount,
        sgst_rate: sgstRate,
        sgst_amount: sgstAmount,
        igst_rate: igstRate,
        igst_amount: igstAmount,
        total_amount: totalAmount,
        status: 'unpaid',
        notes,
      };

      await simplifiedApi.invoices.create(invoiceData);

      setSuccess(`Invoice created successfully! Total: ₹${totalAmount.toFixed(2)}`);

      // Reset form
      setSelectedCustomerId('');
      setSelectedOrderId('');
      setSubtotal(0);
      setNotes('');

      // Reload invoices
      const invoiceData2 = await simplifiedApi.invoices.getAll();
      setInvoices(invoiceData2);
    } catch (err: any) {
      setError('Failed to create invoice: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getCustomerName = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || 'Unknown Customer';
  };

  const getOrderNumber = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    return order?.order_number || 'Unknown Order';
  };

  const filteredOrders = orders.filter(o => o.customer_id === selectedCustomerId);
  const { cgstAmount, sgstAmount, igstAmount, totalAmount } = calculateTotals();

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          GST Invoices
        </Typography>
        <Button variant="outlined" startIcon={<Refresh />} onClick={loadInitialData} disabled={loading}>
          Refresh
        </Button>
      </Box>

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

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Add color="primary" />
                <Typography variant="h6">Create Invoice</Typography>
              </Box>

              <form onSubmit={handleSubmit}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <FormControl fullWidth required>
                    <InputLabel>Invoice Type</InputLabel>
                    <Select
                      value={invoiceType}
                      onChange={(e) => setInvoiceType(e.target.value as 'job_work' | 'sales')}
                      label="Invoice Type"
                    >
                      <MenuItem value="job_work">Job Work</MenuItem>
                      <MenuItem value="sales">Sales</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth required>
                    <InputLabel>Customer</InputLabel>
                    <Select
                      value={selectedCustomerId}
                      onChange={(e) => {
                        setSelectedCustomerId(e.target.value);
                        setSelectedOrderId('');
                      }}
                      label="Customer"
                    >
                      {customers.map(customer => (
                        <MenuItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {selectedCustomerId && (
                    <FormControl fullWidth required>
                      <InputLabel>Order</InputLabel>
                      <Select
                        value={selectedOrderId}
                        onChange={(e) => setSelectedOrderId(e.target.value)}
                        label="Order"
                      >
                        {filteredOrders.map(order => (
                          <MenuItem key={order.id} value={order.id}>
                            {order.order_number}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}

                  <TextField
                    label="Invoice Date"
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    required
                  />

                  <TextField
                    label="Subtotal (₹)"
                    type="number"
                    value={subtotal}
                    onChange={(e) => setSubtotal(Number(e.target.value))}
                    inputProps={{ min: 0, step: 0.01 }}
                    fullWidth
                    required
                  />

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        label="CGST Rate (%)"
                        type="number"
                        value={cgstRate}
                        onChange={(e) => setCgstRate(Number(e.target.value))}
                        inputProps={{ min: 0, max: 100, step: 0.01 }}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="SGST Rate (%)"
                        type="number"
                        value={sgstRate}
                        onChange={(e) => setSgstRate(Number(e.target.value))}
                        inputProps={{ min: 0, max: 100, step: 0.01 }}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                  </Grid>

                  <TextField
                    label="IGST Rate (%)"
                    type="number"
                    value={igstRate}
                    onChange={(e) => setIgstRate(Number(e.target.value))}
                    inputProps={{ min: 0, max: 100, step: 0.01 }}
                    fullWidth
                    size="small"
                  />

                  {subtotal > 0 && (
                    <Alert severity="info">
                      <Typography variant="body2">
                        CGST: ₹{cgstAmount.toFixed(2)} | SGST: ₹{sgstAmount.toFixed(2)} | IGST: ₹{igstAmount.toFixed(2)}
                      </Typography>
                      <Typography variant="h6" sx={{ mt: 1 }}>
                        <strong>Total: ₹{totalAmount.toFixed(2)}</strong>
                      </Typography>
                    </Alert>
                  )}

                  <TextField
                    label="Notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    multiline
                    rows={2}
                    fullWidth
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : <Add />}
                    sx={{ mt: 2 }}
                  >
                    {loading ? 'Creating...' : 'Create Invoice'}
                  </Button>
                </Box>
              </form>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Receipt color="primary" />
                <Typography variant="h6">Recent Invoices</Typography>
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : invoices.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Receipt sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No invoices yet
                  </Typography>
                </Box>
              ) : (
                <TableContainer sx={{ maxHeight: '60vh' }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Invoice No.</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Customer</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow key={invoice.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {invoice.invoice_number}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {new Date(invoice.invoice_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{getCustomerName(invoice.customer_id)}</TableCell>
                          <TableCell>
                            <Chip
                              label={invoice.invoice_type.toUpperCase().replace('_', ' ')}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip label={`₹${invoice.total_amount.toFixed(2)}`} color="primary" size="small" />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={invoice.status.toUpperCase()}
                              color={invoice.status === 'paid' ? 'success' : 'warning'}
                              size="small"
                            />
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
  );
};

export default InvoicesSimplified;
