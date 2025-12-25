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
  Payment,
} from '@mui/icons-material';
import { simplifiedApi, Customer, GSTInvoice, Payment as PaymentType, SIMPLE_ENUMS } from '../services/simplifiedApi';

const PaymentsSimplified: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<GSTInvoice[]>([]);
  const [payments, setPayments] = useState<PaymentType[]>([]);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [customerData, invoiceData, paymentData] = await Promise.all([
        simplifiedApi.customers.getAll(),
        simplifiedApi.invoices.getAll(),
        simplifiedApi.payments.getAll(),
      ]);

      setCustomers(customerData);
      setInvoices(invoiceData);
      setPayments(paymentData);
    } catch (err: any) {
      setError('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomerId || amount <= 0) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      const paymentData = {
        customer_id: selectedCustomerId,
        invoice_id: selectedInvoiceId || undefined,
        payment_date: paymentDate,
        amount,
        payment_method: paymentMethod,
        transaction_reference: transactionRef || undefined,
        notes,
      };

      await simplifiedApi.payments.create(paymentData);

      setSuccess(`Payment of ₹${amount.toFixed(2)} recorded successfully!`);

      // Reset form
      setSelectedCustomerId('');
      setSelectedInvoiceId('');
      setAmount(0);
      setTransactionRef('');
      setNotes('');

      // Reload payments
      const paymentData2 = await simplifiedApi.payments.getAll();
      setPayments(paymentData2);
    } catch (err: any) {
      setError('Failed to record payment: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getCustomerName = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || 'Unknown Customer';
  };

  const getInvoiceNumber = (invoiceId: string | undefined) => {
    if (!invoiceId) return '-';
    const invoice = invoices.find(i => i.id === invoiceId);
    return invoice?.invoice_number || 'Unknown Invoice';
  };

  const filteredInvoices = invoices.filter(i => i.customer_id === selectedCustomerId && i.status === 'unpaid');

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Payments
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
                <Typography variant="h6">Record Payment</Typography>
              </Box>

              <form onSubmit={handleSubmit}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <FormControl fullWidth required>
                    <InputLabel>Customer</InputLabel>
                    <Select
                      value={selectedCustomerId}
                      onChange={(e) => {
                        setSelectedCustomerId(e.target.value);
                        setSelectedInvoiceId('');
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
                    <FormControl fullWidth>
                      <InputLabel>Invoice (Optional)</InputLabel>
                      <Select
                        value={selectedInvoiceId}
                        onChange={(e) => setSelectedInvoiceId(e.target.value)}
                        label="Invoice (Optional)"
                      >
                        <MenuItem value="">None (Advance Payment)</MenuItem>
                        {filteredInvoices.map(invoice => (
                          <MenuItem key={invoice.id} value={invoice.id}>
                            {invoice.invoice_number} - ₹{invoice.total_amount.toFixed(2)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}

                  <TextField
                    label="Payment Date"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    required
                  />

                  <TextField
                    label="Amount (₹)"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    inputProps={{ min: 0, step: 0.01 }}
                    fullWidth
                    required
                  />

                  <FormControl fullWidth required>
                    <InputLabel>Payment Method</InputLabel>
                    <Select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      label="Payment Method"
                    >
                      <MenuItem value="cash">Cash</MenuItem>
                      <MenuItem value="upi">UPI</MenuItem>
                      <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                      <MenuItem value="cheque">Cheque</MenuItem>
                      <MenuItem value="online">Online</MenuItem>
                    </Select>
                  </FormControl>

                  {paymentMethod !== 'cash' && (
                    <TextField
                      label="Transaction Reference"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      fullWidth
                      placeholder="Transaction ID, Cheque No., etc."
                    />
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
                    {loading ? 'Recording...' : 'Record Payment'}
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
                <Payment color="primary" />
                <Typography variant="h6">Recent Payments</Typography>
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : payments.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Payment sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No payments yet
                  </Typography>
                </Box>
              ) : (
                <TableContainer sx={{ maxHeight: '60vh' }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Customer</TableCell>
                        <TableCell>Invoice</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Method</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id} hover>
                          <TableCell>
                            {new Date(payment.payment_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{getCustomerName(payment.customer_id)}</TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {getInvoiceNumber(payment.invoice_id)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={`₹${payment.amount.toFixed(2)}`} color="success" size="small" />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={payment.payment_method?.toUpperCase().replace('_', ' ')}
                              size="small"
                              variant="outlined"
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

export default PaymentsSimplified;
