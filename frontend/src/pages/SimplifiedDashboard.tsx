import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Button,
  List,
  ListItem,
  ListItemText,
  Chip,
  Paper,
  LinearProgress,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Inventory,
  People,
  ShoppingCart,
  LocalShipping,
  Receipt,
  Warning,
  TrendingUp,
  CheckCircle,
  Factory,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { simplifiedApi, StockByCustomer, OutstandingPayment, OutstandingOrder } from '../services/simplifiedApi';

const SimplifiedDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dashboard data
  const [stockSummary, setStockSummary] = useState<StockByCustomer[]>([]);
  const [outstandingPayments, setOutstandingPayments] = useState<OutstandingPayment[]>([]);
  const [outstandingOrders, setOutstandingOrders] = useState<OutstandingOrder[]>([]);
  const [misprintStock, setMisprintStock] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [stock, payments, orders, misprint] = await Promise.all([
        simplifiedApi.reports.getStockByCustomer(),
        simplifiedApi.reports.getOutstandingPayments(),
        simplifiedApi.reports.getOutstandingOrders(),
        simplifiedApi.reports.getMisprintStock(),
      ]);

      setStockSummary(stock);
      setOutstandingPayments(payments);
      setOutstandingOrders(orders);
      setMisprintStock(misprint);
      setError(null);
    } catch (err: any) {
      setError('Failed to load dashboard data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate overall statistics
  const getTotalStock = () => {
    return stockSummary.reduce((sum, item) => sum + (item.total_quantity || 0), 0);
  };

  const getStockByStage = (stage: string) => {
    return stockSummary.reduce((sum, item) => {
      const stageKey = stage.toLowerCase() as keyof StockByCustomer;
      return sum + ((item[stageKey] as number) || 0);
    }, 0);
  };

  const getTotalOutstanding = () => {
    return outstandingPayments.reduce((sum, item) => sum + (item.outstanding_amount || 0), 0);
  };

  const getPendingDeliveries = () => {
    return outstandingOrders.reduce((sum, item) => sum + (item.pending_quantity || 0), 0);
  };

  const getTotalMisprintStock = () => {
    return misprintStock.reduce((sum, item) => sum + (item.quantity || 0), 0);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <DashboardIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h4" fontWeight="bold">
            Dashboard
          </Typography>
        </Box>
        <Button variant="outlined" onClick={loadDashboardData}>
          Refresh
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }}
            onClick={() => navigate('/production-stock')}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Total Stock
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {getTotalStock()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    All materials in system
                  </Typography>
                </Box>
                <Inventory sx={{ fontSize: 60, color: 'primary.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 }, bgcolor: 'warning.50' }}
            onClick={() => navigate('/production-stock')}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    In Production
                  </Typography>
                  <Typography variant="h3" fontWeight="bold" color="warning.dark">
                    {getStockByStage('printing') + getStockByStage('preprocessing') + getStockByStage('postprocessing')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Currently processing
                  </Typography>
                </Box>
                <Factory sx={{ fontSize: 60, color: 'warning.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 }, bgcolor: 'success.50' }}
            onClick={() => navigate('/deliveries')}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Completed
                  </Typography>
                  <Typography variant="h3" fontWeight="bold" color="success.dark">
                    {getStockByStage('completed')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ready for delivery
                  </Typography>
                </Box>
                <CheckCircle sx={{ fontSize: 60, color: 'success.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 }, bgcolor: 'error.50' }}
            onClick={() => navigate('/returns')}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Misprint Stock
                  </Typography>
                  <Typography variant="h3" fontWeight="bold" color="error.dark">
                    {getTotalMisprintStock()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Needs attention
                  </Typography>
                </Box>
                <Warning sx={{ fontSize: 60, color: 'error.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Financial Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Receipt color="primary" />
                <Typography variant="h6">Outstanding Payments</Typography>
              </Box>

              {outstandingPayments.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  All payments are up to date
                </Typography>
              ) : (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h4" fontWeight="bold" color="error.main">
                      ₹{getTotalOutstanding().toFixed(2)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total outstanding from {outstandingPayments.length} customers
                    </Typography>
                  </Box>

                  <List dense>
                    {outstandingPayments.slice(0, 5).map((payment, index) => (
                      <ListItem
                        key={index}
                        sx={{
                          bgcolor: 'grey.50',
                          borderRadius: 1,
                          mb: 1,
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'grey.100' },
                        }}
                        onClick={() => navigate('/payments')}
                      >
                        <ListItemText
                          primary={payment.customer_name}
                          secondary={`${payment.invoice_count} invoices`}
                        />
                        <Chip
                          label={`₹${payment.outstanding_amount.toFixed(2)}`}
                          color="error"
                          size="small"
                        />
                      </ListItem>
                    ))}
                  </List>

                  {outstandingPayments.length > 5 && (
                    <Button
                      size="small"
                      onClick={() => navigate('/payments')}
                      sx={{ mt: 1 }}
                    >
                      View All ({outstandingPayments.length})
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <LocalShipping color="primary" />
                <Typography variant="h6">Pending Deliveries</Typography>
              </Box>

              {outstandingOrders.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No pending deliveries
                </Typography>
              ) : (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h4" fontWeight="bold" color="warning.main">
                      {getPendingDeliveries()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Items pending delivery from {outstandingOrders.length} orders
                    </Typography>
                  </Box>

                  <List dense>
                    {outstandingOrders.slice(0, 5).map((order, index) => (
                      <ListItem
                        key={index}
                        sx={{
                          bgcolor: 'grey.50',
                          borderRadius: 1,
                          mb: 1,
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'grey.100' },
                        }}
                        onClick={() => navigate('/deliveries')}
                      >
                        <ListItemText
                          primary={order.customer_name}
                          secondary={`${order.order_number} - ${order.material_type}`}
                        />
                        <Chip
                          label={`${order.pending_quantity} pending`}
                          color="warning"
                          size="small"
                        />
                      </ListItem>
                    ))}
                  </List>

                  {outstandingOrders.length > 5 && (
                    <Button
                      size="small"
                      onClick={() => navigate('/deliveries')}
                      sx={{ mt: 1 }}
                    >
                      View All ({outstandingOrders.length})
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Production Pipeline */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <TrendingUp color="primary" />
            <Typography variant="h6">Production Pipeline</Typography>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} md={2.4}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Received
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {getStockByStage('received')}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={2.4}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.50' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Preprocessing
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="info.main">
                  {getStockByStage('preprocessing')}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={2.4}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.50' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Printing
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="primary.main">
                  {getStockByStage('printing')}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={2.4}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'secondary.50' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Postprocessing
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="secondary.main">
                  {getStockByStage('postprocessing')}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={2.4}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.50' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Completed
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {getStockByStage('completed')}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Overall Progress
            </Typography>
            <LinearProgress
              variant="determinate"
              value={getTotalStock() > 0 ? (getStockByStage('completed') / getTotalStock()) * 100 : 0}
              sx={{ height: 10, borderRadius: 5 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {getTotalStock() > 0
                ? `${((getStockByStage('completed') / getTotalStock()) * 100).toFixed(1)}% completed`
                : 'No stock in production'}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Quick Actions
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Inventory />}
                onClick={() => navigate('/material-receipt')}
                sx={{ py: 2 }}
              >
                Receive Material
              </Button>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Factory />}
                onClick={() => navigate('/production-stock')}
                sx={{ py: 2 }}
              >
                Manage Production
              </Button>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<LocalShipping />}
                onClick={() => navigate('/deliveries')}
                sx={{ py: 2 }}
              >
                Create Delivery
              </Button>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Receipt />}
                onClick={() => navigate('/invoices')}
                sx={{ py: 2 }}
              >
                Generate Invoice
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SimplifiedDashboard;
