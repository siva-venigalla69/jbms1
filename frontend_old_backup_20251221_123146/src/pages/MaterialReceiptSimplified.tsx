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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
} from '@mui/material';
import {
  Add,
  Refresh,
  Visibility,
  LocalShipping,
} from '@mui/icons-material';
import { simplifiedApi, Customer, Order, MaterialIn, SIMPLE_ENUMS } from '../services/simplifiedApi';

const MaterialReceiptSimplified: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [materialTypes, setMaterialTypes] = useState<string[]>([]);
  const [receipts, setReceipts] = useState<MaterialIn[]>([]);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [materialType, setMaterialType] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(0);
  const [ownership, setOwnership] = useState<'customer' | 'self'>('customer');
  const [notes, setNotes] = useState('');

  // Dialog state
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<MaterialIn | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [customerData, orderData, materialTypesData, receiptsData] = await Promise.all([
        simplifiedApi.customers.getAll(),
        simplifiedApi.orders.getAll(),
        simplifiedApi.materialTypes.getAll(),
        simplifiedApi.materialIn.getAll(),
      ]);

      setCustomers(customerData);
      setOrders(orderData);
      setMaterialTypes(materialTypesData.map(t => t.type_code));
      setReceipts(receiptsData);
    } catch (err: any) {
      setError('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!materialType || quantity <= 0) {
      setError('Please fill in all required fields');
      return;
    }

    if (ownership === 'customer' && !selectedCustomerId) {
      setError('Please select a customer for customer material');
      return;
    }

    try {
      setLoading(true);

      const receiptData = {
        customer_id: ownership === 'customer' ? selectedCustomerId : null,
        order_id: selectedOrderId || null,
        material_type: materialType,
        quantity,
        ownership,
        receipt_date: new Date().toISOString(),
        notes,
      };

      await simplifiedApi.materialIn.create(receiptData);

      setSuccess(`Material receipt created successfully! ${quantity} ${materialType} received.`);

      // Reset form
      setSelectedCustomerId('');
      setSelectedOrderId('');
      setMaterialType('');
      setQuantity(0);
      setNotes('');

      // Reload receipts
      const receiptsData = await simplifiedApi.materialIn.getAll();
      setReceipts(receiptsData);
    } catch (err: any) {
      setError('Failed to create receipt: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewReceipt = (receipt: MaterialIn) => {
    setSelectedReceipt(receipt);
    setViewDialogOpen(true);
  };

  const getCustomerName = (customerId: string | null) => {
    if (!customerId) return 'Own Stock';
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || 'Unknown Customer';
  };

  const getOrderNumber = (orderId: string | null) => {
    if (!orderId) return '-';
    const order = orders.find(o => o.id === orderId);
    return order?.order_number || 'Unknown Order';
  };

  const filteredOrders = orders.filter(o => o.customer_id === selectedCustomerId);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Material Receipt
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadInitialData}
          disabled={loading}
        >
          Refresh
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

      <Grid container spacing={3}>
        {/* Receipt Form */}
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Add color="primary" />
                <Typography variant="h6">Create Material Receipt</Typography>
              </Box>

              <form onSubmit={handleSubmit}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Ownership Type */}
                  <FormControl fullWidth required>
                    <InputLabel>Ownership Type</InputLabel>
                    <Select
                      value={ownership}
                      onChange={(e) => {
                        setOwnership(e.target.value as 'customer' | 'self');
                        setSelectedCustomerId('');
                        setSelectedOrderId('');
                      }}
                      label="Ownership Type"
                    >
                      <MenuItem value="customer">Customer Material (Job Work)</MenuItem>
                      <MenuItem value="self">Own Stock</MenuItem>
                    </Select>
                  </FormControl>

                  {/* Customer Selection (only for customer material) */}
                  {ownership === 'customer' && (
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
                  )}

                  {/* Order Selection (optional) */}
                  {ownership === 'customer' && selectedCustomerId && (
                    <FormControl fullWidth>
                      <InputLabel>Link to Order (Optional)</InputLabel>
                      <Select
                        value={selectedOrderId}
                        onChange={(e) => setSelectedOrderId(e.target.value)}
                        label="Link to Order (Optional)"
                      >
                        <MenuItem value="">None</MenuItem>
                        {filteredOrders.map(order => (
                          <MenuItem key={order.id} value={order.id}>
                            {order.order_number} ({order.total_quantity} items)
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}

                  {/* Material Type */}
                  <FormControl fullWidth required>
                    <InputLabel>Material Type</InputLabel>
                    <Select
                      value={materialType}
                      onChange={(e) => setMaterialType(e.target.value)}
                      label="Material Type"
                    >
                      {materialTypes.map(type => (
                        <MenuItem key={type} value={type}>
                          {type.toUpperCase()}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Quantity */}
                  <TextField
                    label="Quantity"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    inputProps={{ min: 1 }}
                    fullWidth
                    required
                  />

                  {/* Notes */}
                  <TextField
                    label="Notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    multiline
                    rows={3}
                    fullWidth
                    placeholder="Add any additional notes about this receipt..."
                  />

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : <Add />}
                    sx={{ mt: 2 }}
                  >
                    {loading ? 'Creating...' : 'Create Receipt'}
                  </Button>
                </Box>
              </form>

              {/* Info Box */}
              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  <strong>Note:</strong> Creating a receipt will automatically add the material to stock in the 'Received' stage.
                  You can move it to other production stages from the Production Stock page.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Receipts */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <LocalShipping color="primary" />
                <Typography variant="h6">Recent Material Receipts</Typography>
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : receipts.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <LocalShipping sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No receipts yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Create your first material receipt using the form
                  </Typography>
                </Box>
              ) : (
                <TableContainer sx={{ maxHeight: '60vh' }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Customer/Type</TableCell>
                        <TableCell>Material</TableCell>
                        <TableCell>Quantity</TableCell>
                        <TableCell>Ownership</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {receipts.slice(0, 20).map((receipt) => (
                        <TableRow key={receipt.id} hover>
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(receipt.receipt_date).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {getCustomerName(receipt.customer_id)}
                            </Typography>
                            {receipt.order_id && (
                              <Typography variant="caption" color="text.secondary">
                                {getOrderNumber(receipt.order_id)}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {receipt.material_type.toUpperCase()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={receipt.quantity} color="primary" size="small" />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={receipt.ownership.toUpperCase()}
                              color={receipt.ownership === 'customer' ? 'info' : 'secondary'}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() => handleViewReceipt(receipt)}
                              title="View Details"
                            >
                              <Visibility />
                            </IconButton>
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

      {/* View Receipt Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Material Receipt Details</DialogTitle>
        <DialogContent>
          {selectedReceipt && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">Receipt Date</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {new Date(selectedReceipt.receipt_date).toLocaleString()}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">Customer</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {getCustomerName(selectedReceipt.customer_id)}
                </Typography>
              </Box>

              {selectedReceipt.order_id && (
                <Box>
                  <Typography variant="body2" color="text.secondary">Order Number</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {getOrderNumber(selectedReceipt.order_id)}
                  </Typography>
                </Box>
              )}

              <Box>
                <Typography variant="body2" color="text.secondary">Material Type</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {selectedReceipt.material_type.toUpperCase()}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">Quantity</Typography>
                <Typography variant="h4" fontWeight="bold" color="primary.main">
                  {selectedReceipt.quantity}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">Ownership</Typography>
                <Chip
                  label={selectedReceipt.ownership.toUpperCase()}
                  color={selectedReceipt.ownership === 'customer' ? 'info' : 'secondary'}
                />
              </Box>

              {selectedReceipt.notes && (
                <Box>
                  <Typography variant="body2" color="text.secondary">Notes</Typography>
                  <Typography variant="body1">
                    {selectedReceipt.notes}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MaterialReceiptSimplified;
