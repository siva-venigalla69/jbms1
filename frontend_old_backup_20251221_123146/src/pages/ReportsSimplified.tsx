import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import {
  Refresh,
  Assessment,
  People,
  Payment,
  ShoppingCart,
  Warning,
} from '@mui/icons-material';
import { simplifiedApi, StockByCustomer, OutstandingPayment, OutstandingOrder } from '../services/simplifiedApi';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const ReportsSimplified: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState(0);

  const [stockByCustomer, setStockByCustomer] = useState<StockByCustomer[]>([]);
  const [outstandingPayments, setOutstandingPayments] = useState<OutstandingPayment[]>([]);
  const [outstandingOrders, setOutstandingOrders] = useState<OutstandingOrder[]>([]);
  const [misprintStock, setMisprintStock] = useState<any[]>([]);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const [stock, payments, orders, misprint] = await Promise.all([
        simplifiedApi.reports.getStockByCustomer(),
        simplifiedApi.reports.getOutstandingPayments(),
        simplifiedApi.reports.getOutstandingOrders(),
        simplifiedApi.reports.getMisprintStock(),
      ]);

      setStockByCustomer(stock);
      setOutstandingPayments(payments);
      setOutstandingOrders(orders);
      setMisprintStock(misprint);
      setError(null);
    } catch (err: any) {
      setError('Failed to load reports: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Assessment sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h4" fontWeight="bold">
            Reports
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<Refresh />} onClick={loadReports} disabled={loading}>
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
            <Tab icon={<People />} label="Stock by Customer" />
            <Tab icon={<Payment />} label="Outstanding Payments" />
            <Tab icon={<ShoppingCart />} label="Outstanding Orders" />
            <Tab icon={<Warning />} label="Misprint Stock" />
          </Tabs>
        </Box>

        {/* Stock by Customer Report */}
        <TabPanel value={currentTab} index={0}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : stockByCustomer.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <People sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No stock data available
              </Typography>
            </Box>
          ) : (
            <TableContainer sx={{ maxHeight: '60vh' }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Customer</TableCell>
                    <TableCell>Material Type</TableCell>
                    <TableCell>Ownership</TableCell>
                    <TableCell>Received</TableCell>
                    <TableCell>Preprocessing</TableCell>
                    <TableCell>Printing</TableCell>
                    <TableCell>Postprocessing</TableCell>
                    <TableCell>Completed</TableCell>
                    <TableCell>Misprint</TableCell>
                    <TableCell>Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stockByCustomer.map((row, index) => (
                    <TableRow key={index} hover>
                      <TableCell>{row.customer_name}</TableCell>
                      <TableCell>{row.material_type?.toUpperCase()}</TableCell>
                      <TableCell>
                        <Chip
                          label={row.ownership?.toUpperCase()}
                          size="small"
                          variant="outlined"
                          color={row.ownership === 'customer' ? 'info' : 'secondary'}
                        />
                      </TableCell>
                      <TableCell>{row.received || 0}</TableCell>
                      <TableCell>{row.preprocessing || 0}</TableCell>
                      <TableCell>{row.printing || 0}</TableCell>
                      <TableCell>{row.postprocessing || 0}</TableCell>
                      <TableCell>
                        <Chip label={row.completed || 0} color="success" size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip label={row.misprint || 0} color="error" size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip label={row.total_quantity || 0} color="primary" size="small" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* Outstanding Payments Report */}
        <TabPanel value={currentTab} index={1}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : outstandingPayments.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Payment sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No outstanding payments
              </Typography>
              <Typography variant="body2" color="text.secondary">
                All payments are up to date!
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ mb: 3, p: 2, bgcolor: 'error.50', borderRadius: 1 }}>
                <Typography variant="h5" fontWeight="bold" color="error.dark">
                  Total Outstanding: ₹
                  {outstandingPayments
                    .reduce((sum, p) => sum + (p.outstanding_amount || 0), 0)
                    .toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  From {outstandingPayments.length} customers
                </Typography>
              </Box>

              <TableContainer sx={{ maxHeight: '50vh' }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Customer</TableCell>
                      <TableCell>Total Invoiced</TableCell>
                      <TableCell>Total Paid</TableCell>
                      <TableCell>Outstanding</TableCell>
                      <TableCell>Invoice Count</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {outstandingPayments.map((row, index) => (
                      <TableRow key={index} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {row.customer_name}
                          </Typography>
                        </TableCell>
                        <TableCell>₹{row.total_invoiced?.toFixed(2)}</TableCell>
                        <TableCell>₹{row.total_paid?.toFixed(2)}</TableCell>
                        <TableCell>
                          <Chip
                            label={`₹${row.outstanding_amount?.toFixed(2)}`}
                            color="error"
                          />
                        </TableCell>
                        <TableCell>{row.invoice_count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </TabPanel>

        {/* Outstanding Orders Report */}
        <TabPanel value={currentTab} index={2}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : outstandingOrders.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <ShoppingCart sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No pending deliveries
              </Typography>
              <Typography variant="body2" color="text.secondary">
                All orders are fully delivered!
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ mb: 3, p: 2, bgcolor: 'warning.50', borderRadius: 1 }}>
                <Typography variant="h5" fontWeight="bold" color="warning.dark">
                  Total Pending: {outstandingOrders.reduce((sum, o) => sum + (o.pending_quantity || 0), 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  From {outstandingOrders.length} orders
                </Typography>
              </Box>

              <TableContainer sx={{ maxHeight: '50vh' }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Customer</TableCell>
                      <TableCell>Order Number</TableCell>
                      <TableCell>Material Type</TableCell>
                      <TableCell>Total Qty</TableCell>
                      <TableCell>Delivered</TableCell>
                      <TableCell>Pending</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {outstandingOrders.map((row, index) => (
                      <TableRow key={index} hover>
                        <TableCell>{row.customer_name}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {row.order_number}
                          </Typography>
                        </TableCell>
                        <TableCell>{row.material_type?.toUpperCase()}</TableCell>
                        <TableCell>{row.total_quantity}</TableCell>
                        <TableCell>
                          <Chip label={row.delivered_quantity} color="success" size="small" />
                        </TableCell>
                        <TableCell>
                          <Chip label={row.pending_quantity} color="warning" size="small" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </TabPanel>

        {/* Misprint Stock Report */}
        <TabPanel value={currentTab} index={3}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : misprintStock.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Warning sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No misprint stock
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Great! No misprints in stock
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ mb: 3, p: 2, bgcolor: 'error.50', borderRadius: 1 }}>
                <Typography variant="h5" fontWeight="bold" color="error.dark">
                  Total Misprint: {misprintStock.reduce((sum, s) => sum + (s.quantity || 0), 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {misprintStock.length} material types affected
                </Typography>
              </Box>

              <TableContainer sx={{ maxHeight: '50vh' }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Material Type</TableCell>
                      <TableCell>Quantity</TableCell>
                      <TableCell>Ownership</TableCell>
                      <TableCell>Notes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {misprintStock.map((row, index) => (
                      <TableRow key={index} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {row.material_type?.toUpperCase()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={row.quantity} color="error" />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={row.ownership?.toUpperCase()}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {row.design_notes || '-'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </TabPanel>
      </Card>
    </Box>
  );
};

export default ReportsSimplified;
