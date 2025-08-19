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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tabs,
  Tab,
  Grid,
  Paper,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab';
import {
  Search,
  History,
  TrendingUp,
  LocalShipping,
  Inventory,
  Payment,
  Receipt,
  ShoppingCart,
  Factory,
  Person,
  CalendarToday,
  FilterList,
  Download,
  Visibility,
  MonetizationOn,
  SwapVert,
} from '@mui/icons-material';
import { 
  orderApi, 
  materialInApi, 
  deliveryChallanApi, 
  paymentApi, 
  gstInvoiceApi,
  customerApi 
} from '../services/supabaseApi';
import { componentLogger } from '../utils/debug';

interface TransactionRecord {
  id: string;
  type: 'order' | 'material_in' | 'material_out' | 'delivery_challan' | 'invoice' | 'payment';
  date: string;
  customer_id: string;
  customer_name: string;
  description: string;
  amount?: number;
  status: string;
  reference_number: string;
  details: any;
  impact: 'positive' | 'negative' | 'neutral';
}

const TransactionHistory: React.FC = () => {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [customers, setCustomers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadAllTransactions = useCallback(async () => {
    componentLogger.info('Loading all transaction history...');
    try {
      setLoading(true);
      
      const [
        orders,
        materialsIn,
        deliveryChallans,
        payments,
        invoices,
        customersData
      ] = await Promise.all([
        orderApi.getOrders().catch(() => []),
        materialInApi.getMaterialIn().catch(() => []),
        deliveryChallanApi.getDeliveryChallans().catch(() => []),
        paymentApi.getPayments().catch(() => []),
        gstInvoiceApi.getGSTInvoices().catch(() => []),
        customerApi.getCustomers().catch(() => [])
      ]);

      setCustomers(customersData);

      const allTransactions: TransactionRecord[] = [];

      // Process Orders
      orders.forEach(order => {
        allTransactions.push({
          id: `order-${order.id}`,
          type: 'order',
          date: order.order_date,
          customer_id: order.customer_id,
          customer_name: order.customer?.name || 'Unknown',
          description: `Order ${order.order_number} - ${order.order_items?.length || 0} items`,
          amount: order.total_amount,
          status: order.status,
          reference_number: order.order_number,
          details: order,
          impact: 'positive'
        });
      });

      // Process Materials In
      materialsIn.forEach(material => {
        allTransactions.push({
          id: `material-in-${material.id}`,
          type: 'material_in',
          date: material.received_date,
          customer_id: material.customer_id,
          customer_name: material.customer?.name || 'Unknown',
          description: `Material Received: ${material.material_type} (Qty: ${material.quantity})`,
          status: 'received',
          reference_number: `MAT-IN-${material.id.slice(-6)}`,
          details: material,
          impact: 'neutral'
        });
      });

      // Process Delivery Challans
      deliveryChallans.forEach(challan => {
        allTransactions.push({
          id: `challan-${challan.id}`,
          type: 'delivery_challan',
          date: challan.delivery_date,
          customer_id: challan.customer_id,
          customer_name: challan.customer?.name || 'Unknown',
          description: `Delivery Challan ${challan.challan_number}`,
          status: challan.status,
          reference_number: challan.challan_number,
          details: challan,
          impact: 'neutral'
        });
      });

      // Process Payments
      payments.forEach(payment => {
        const customer = customersData.find(c => c.id === payment.customer_id);
        allTransactions.push({
          id: `payment-${payment.id}`,
          type: 'payment',
          date: payment.payment_date,
          customer_id: payment.customer_id || '',
          customer_name: customer?.name || 'Unknown',
          description: `Payment Received - ${payment.payment_method.toUpperCase()}`,
          amount: payment.payment_amount,
          status: 'received',
          reference_number: payment.reference_number || `PAY-${payment.id.slice(-6)}`,
          details: payment,
          impact: 'positive'
        });
      });

      // Process Invoices
      invoices.forEach(invoice => {
        allTransactions.push({
          id: `invoice-${invoice.id}`,
          type: 'invoice',
          date: invoice.invoice_date,
          customer_id: invoice.customer_id,
          customer_name: invoice.customer?.name || 'Unknown',
          description: `Invoice ${invoice.invoice_number}`,
          amount: invoice.total_amount,
          status: invoice.status,
          reference_number: invoice.invoice_number,
          details: invoice,
          impact: 'positive'
        });
      });

      // Sort by date (newest first)
      allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setTransactions(allTransactions);
      setFilteredTransactions(allTransactions);
      
      componentLogger.info('Transaction history loaded successfully', { 
        total: allTransactions.length 
      });
    } catch (error: any) {
      componentLogger.error('Failed to load transaction history', error);
      setError('Failed to load transaction history: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllTransactions();
  }, [loadAllTransactions]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Filter transactions
  useEffect(() => {
    let filtered = transactions.filter(transaction => {
      const matchesSearch = 
        transaction.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.reference_number.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
      const matchesCustomer = !customerFilter || transaction.customer_id === customerFilter;
      
      const transactionDate = new Date(transaction.date);
      const matchesDateFrom = !dateFrom || transactionDate >= new Date(dateFrom);
      const matchesDateTo = !dateTo || transactionDate <= new Date(dateTo);
      
      return matchesSearch && matchesType && matchesCustomer && matchesDateFrom && matchesDateTo;
    });

    setFilteredTransactions(filtered);
  }, [transactions, searchTerm, typeFilter, customerFilter, dateFrom, dateTo]);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'order': return <ShoppingCart />;
      case 'material_in': return <Inventory />;
      case 'material_out': return <SwapVert />;
      case 'delivery_challan': return <LocalShipping />;
      case 'invoice': return <Receipt />;
      case 'payment': return <Payment />;
      default: return <History />;
    }
  };

  const getTransactionColor = (type: string, impact: string) => {
    if (impact === 'positive') return 'success';
    if (impact === 'negative') return 'error';
    
    switch (type) {
      case 'order': return 'primary';
      case 'material_in': return 'info';
      case 'delivery_challan': return 'warning';
      case 'invoice': return 'secondary';
      case 'payment': return 'success';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'delivered':
      case 'paid':
      case 'received':
        return 'success';
      case 'pending':
      case 'in_progress':
        return 'warning';
      case 'cancelled':
      case 'returned':
      case 'overdue':
        return 'error';
      default:
        return 'default';
    }
  };

  // Calculate summary metrics
  const totalRevenue = filteredTransactions
    .filter(t => t.type === 'payment')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalInvoiced = filteredTransactions
    .filter(t => t.type === 'invoice')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalOrders = filteredTransactions.filter(t => t.type === 'order').length;
  const totalDeliveries = filteredTransactions.filter(t => t.type === 'delivery_challan').length;

  const transactionTypes = [
    { value: 'all', label: 'All Transactions' },
    { value: 'order', label: 'Orders' },
    { value: 'material_in', label: 'Materials In' },
    { value: 'delivery_challan', label: 'Delivery Challans' },
    { value: 'invoice', label: 'Invoices' },
    { value: 'payment', label: 'Payments' },
  ];

  const TabPanel = ({ children, value, index }: any) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Complete Transaction History
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<Download />}>
            Export History
          </Button>
          <Button variant="contained" startIcon={<History />} onClick={loadAllTransactions}>
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 3, mb: 3 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <MonetizationOn sx={{ mr: 1, color: 'success.main' }} />
              <Typography variant="h6" color="text.secondary">
                Total Revenue
              </Typography>
            </Box>
            <Typography variant="h4" fontWeight="bold" color="success.main">
              ₹{totalRevenue.toFixed(2)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              From {filteredTransactions.filter(t => t.type === 'payment').length} payments
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Receipt sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" color="text.secondary">
                Total Invoiced
              </Typography>
            </Box>
            <Typography variant="h4" fontWeight="bold" color="primary.main">
              ₹{totalInvoiced.toFixed(2)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              From {filteredTransactions.filter(t => t.type === 'invoice').length} invoices
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <ShoppingCart sx={{ mr: 1, color: 'info.main' }} />
              <Typography variant="h6" color="text.secondary">
                Total Orders
              </Typography>
            </Box>
            <Typography variant="h4" fontWeight="bold" color="info.main">
              {totalOrders}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Order transactions
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <LocalShipping sx={{ mr: 1, color: 'warning.main' }} />
              <Typography variant="h6" color="text.secondary">
                Total Deliveries
              </Typography>
            </Box>
            <Typography variant="h4" fontWeight="bold" color="warning.main">
              {totalDeliveries}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Delivery challans
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <FilterList sx={{ mr: 1, verticalAlign: 'middle' }} />
            Transaction Filters
          </Typography>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 2 }}>
            <TextField
              placeholder="Search transactions..."
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
            
            <FormControl>
              <InputLabel>Transaction Type</InputLabel>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                label="Transaction Type"
              >
                {transactionTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl>
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

          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
            <TextField
              type="date"
              label="From Date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
            />
            <TextField
              type="date"
              label="To Date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
            />
            <Button
              variant="outlined"
              onClick={() => {
                setSearchTerm('');
                setTypeFilter('all');
                setCustomerFilter('');
                setDateFrom('');
                setDateTo('');
              }}
            >
              Clear Filters
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Tabs for different views */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)}>
            <Tab label="Table View" />
            <Tab label="Timeline View" />
            <Tab label="Cash Flow View" />
          </Tabs>
        </Box>

        <CardContent>
          {/* Table View */}
          <TabPanel value={selectedTab} index={0}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : filteredTransactions.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <History sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No transactions found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Try adjusting your filters or date range
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Reference</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <CalendarToday sx={{ mr: 1, color: 'text.secondary', fontSize: 16 }} />
                            {new Date(transaction.date).toLocaleDateString()}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={getTransactionIcon(transaction.type)}
                            label={transaction.type.replace('_', ' ').toUpperCase()}
                            color={getTransactionColor(transaction.type, transaction.impact) as any}
                            variant="outlined"
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Person sx={{ mr: 1, color: 'text.secondary' }} />
                            {transaction.customer_name}
                          </Box>
                        </TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {transaction.reference_number}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {transaction.amount ? (
                            <Typography 
                              variant="body2" 
                              fontWeight="medium"
                              color={transaction.impact === 'positive' ? 'success.main' : 'inherit'}
                            >
                              ₹{transaction.amount.toFixed(2)}
                            </Typography>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={transaction.status.replace('_', ' ').toUpperCase()}
                            color={getStatusColor(transaction.status) as any}
                            variant="outlined"
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" title="View Details">
                            <Visibility />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* Timeline View */}
          <TabPanel value={selectedTab} index={1}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Timeline>
                {filteredTransactions.slice(0, 50).map((transaction, index) => (
                  <TimelineItem key={transaction.id}>
                    <TimelineOppositeContent sx={{ m: 'auto 0' }} variant="body2" color="text.secondary">
                      {new Date(transaction.date).toLocaleDateString()}
                    </TimelineOppositeContent>
                    <TimelineSeparator>
                      <TimelineDot color={getTransactionColor(transaction.type, transaction.impact) as any}>
                        {getTransactionIcon(transaction.type)}
                      </TimelineDot>
                      {index < filteredTransactions.slice(0, 50).length - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent sx={{ py: '12px', px: 2 }}>
                      <Paper elevation={3} sx={{ p: 2 }}>
                        <Typography variant="h6" component="span">
                          {transaction.description}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Customer: {transaction.customer_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Reference: {transaction.reference_number}
                        </Typography>
                        {transaction.amount && (
                          <Typography variant="body2" fontWeight="bold" color="success.main">
                            Amount: ₹{transaction.amount.toFixed(2)}
                          </Typography>
                        )}
                      </Paper>
                    </TimelineContent>
                  </TimelineItem>
                ))}
              </Timeline>
            )}
          </TabPanel>

          {/* Cash Flow View */}
          <TabPanel value={selectedTab} index={2}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Cash Flow Analysis
              </Typography>
              
              <Grid container spacing={3}>
                <Grid size={{xs: 12, md: 6}}>
                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="h6" color="success.main" gutterBottom>
                        Cash Inflows
                      </Typography>
                      {filteredTransactions
                        .filter(t => t.type === 'payment')
                        .slice(0, 10)
                        .map((transaction) => (
                          <Box key={transaction.id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">
                              {new Date(transaction.date).toLocaleDateString()} - {transaction.customer_name}
                            </Typography>
                            <Typography variant="body2" fontWeight="bold" color="success.main">
                              +₹{transaction.amount?.toFixed(2)}
                            </Typography>
                          </Box>
                        ))}
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid size={{xs: 12, md: 6}}>
                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="h6" color="primary.main" gutterBottom>
                        Invoices Generated
                      </Typography>
                      {filteredTransactions
                        .filter(t => t.type === 'invoice')
                        .slice(0, 10)
                        .map((transaction) => (
                          <Box key={transaction.id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">
                              {new Date(transaction.date).toLocaleDateString()} - {transaction.customer_name}
                            </Typography>
                            <Typography variant="body2" fontWeight="bold" color="primary.main">
                              ₹{transaction.amount?.toFixed(2)}
                            </Typography>
                          </Box>
                        ))}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </TabPanel>
        </CardContent>
      </Card>
    </Box>
  );
};

export default TransactionHistory;