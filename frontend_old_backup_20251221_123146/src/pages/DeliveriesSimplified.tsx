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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Add,
  Refresh,
  LocalShipping,
  Delete,
  Visibility,
} from '@mui/icons-material';
import { simplifiedApi, Customer, Order, DeliveryChallan, ChallanItem, MaterialStock } from '../services/simplifiedApi';

interface ChallanItemInput {
  material_type: string;
  quantity: number;
  notes?: string;
}

const DeliveriesSimplified: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [challans, setChallans] = useState<DeliveryChallan[]>([]);
  const [completedStock, setCompletedStock] = useState<MaterialStock[]>([]);
  const [materialTypes, setMaterialTypes] = useState<string[]>([]);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ChallanItemInput[]>([]);

  // Dialog state
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedChallan, setSelectedChallan] = useState<DeliveryChallan | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [customerData, orderData, challanData, stockData, materialTypesData] = await Promise.all([
        simplifiedApi.customers.getAll(),
        simplifiedApi.orders.getAll(),
        simplifiedApi.deliveries.getAll(),
        simplifiedApi.stock.getAll(),
        simplifiedApi.materialTypes.getAll(),
      ]);

      setCustomers(customerData);
      setOrders(orderData);
      setChallans(challanData);
      const completed = stockData.filter(s => s.stage === 'completed');
      setCompletedStock(completed);
      setMaterialTypes(materialTypesData.map(t => t.type_code));
    } catch (err: any) {
      setError('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setItems([...items, { material_type: '', quantity: 0, notes: '' }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ChallanItemInput, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomerId || !selectedOrderId || items.length === 0) {
      setError('Please fill in all required fields and add at least one item');
      return;
    }

    const invalidItems = items.filter(item => !item.material_type || item.quantity <= 0);
    if (invalidItems.length > 0) {
      setError('All items must have material type and quantity > 0');
      return;
    }

    try {
      setLoading(true);

      const challanData = {
        challan_number: '', // Auto-generated
        customer_id: selectedCustomerId,
        order_id: selectedOrderId,
        delivery_date: deliveryDate,
        status: 'delivered',
        notes,
      };

      await simplifiedApi.deliveries.createChallan(challanData, items);

      setSuccess(`Delivery challan created successfully with ${items.length} items!`);

      // Reset form
      setSelectedCustomerId('');
      setSelectedOrderId('');
      setDeliveryDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setItems([]);

      // Reload data
      const [latestChallans, stockData] = await Promise.all([
        simplifiedApi.deliveries.getAll(),
        simplifiedApi.stock.getAll(),
      ]);
      setChallans(latestChallans);
      const completed = stockData.filter(s => s.stage === 'completed');
      setCompletedStock(completed);
    } catch (err: any) {
      setError('Failed to create challan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewChallan = (challan: DeliveryChallan) => {
    setSelectedChallan(challan);
    setViewDialogOpen(true);
  };

  const getCustomerName = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || 'Unknown Customer';
  };

  const getOrderNumber = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    return order?.order_number || 'Unknown Order';
  };

  const getAvailableStock = (customerId: string, orderId: string, materialType: string) => {
    const stock = completedStock.find(
      s => s.customer_id === customerId && s.order_id === orderId && s.material_type === materialType
    );
    return stock?.quantity || 0;
  };

  const filteredOrders = orders.filter(o => o.customer_id === selectedCustomerId);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Delivery Challans
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
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Add color="primary" />
                <Typography variant="h6">Create Delivery Challan</Typography>
              </Box>

              <form onSubmit={handleSubmit}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <FormControl fullWidth required>
                    <InputLabel>Customer</InputLabel>
                    <Select
                      value={selectedCustomerId}
                      onChange={(e) => {
                        setSelectedCustomerId(e.target.value);
                        setSelectedOrderId('');
                        setItems([]);
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
                            {order.order_number} ({order.total_quantity} items)
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}

                  <TextField
                    label="Delivery Date"
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    required
                  />

                  <TextField
                    label="Notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    multiline
                    rows={2}
                    fullWidth
                  />

                  {/* Challan Items */}
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2">Challan Items</Typography>
                      <Button size="small" startIcon={<Add />} onClick={addItem}>
                        Add Item
                      </Button>
                    </Box>

                    {items.map((item, index) => (
                      <Card key={index} variant="outlined" sx={{ p: 2, mb: 1 }}>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                          <FormControl size="small" sx={{ flex: 1 }}>
                            <InputLabel>Material</InputLabel>
                            <Select
                              value={item.material_type}
                              onChange={(e) => updateItem(index, 'material_type', e.target.value)}
                              label="Material"
                            >
                              {materialTypes.map(type => (
                                <MenuItem key={type} value={type}>
                                  {type.toUpperCase()}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>

                          <TextField
                            label="Quantity"
                            type="number"
                            size="small"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                            inputProps={{ min: 1 }}
                            sx={{ width: 100 }}
                          />

                          <IconButton size="small" color="error" onClick={() => removeItem(index)}>
                            <Delete />
                          </IconButton>
                        </Box>
                        {selectedCustomerId && selectedOrderId && item.material_type && (
                          <Typography variant="caption" color="text.secondary">
                            Available: {getAvailableStock(selectedCustomerId, selectedOrderId, item.material_type)}
                          </Typography>
                        )}
                      </Card>
                    ))}
                  </Box>

                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    disabled={loading || items.length === 0}
                    startIcon={loading ? <CircularProgress size={20} /> : <LocalShipping />}
                    sx={{ mt: 2 }}
                  >
                    {loading ? 'Creating...' : 'Create Delivery Challan'}
                  </Button>
                </Box>
              </form>

              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  <strong>Note:</strong> Creating a challan will reduce stock from the 'completed' stage.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <LocalShipping color="primary" />
                <Typography variant="h6">Recent Delivery Challans</Typography>
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : challans.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <LocalShipping sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No challans yet
                  </Typography>
                </Box>
              ) : (
                <TableContainer sx={{ maxHeight: '60vh' }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Challan No.</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Customer</TableCell>
                        <TableCell>Order</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {challans.slice(0, 20).map((challan) => (
                        <TableRow key={challan.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {challan.challan_number}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {new Date(challan.delivery_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{getCustomerName(challan.customer_id)}</TableCell>
                          <TableCell>{getOrderNumber(challan.order_id)}</TableCell>
                          <TableCell>
                            <Chip label={challan.status.toUpperCase()} color="success" size="small" />
                          </TableCell>
                          <TableCell align="right">
                            <IconButton size="small" onClick={() => handleViewChallan(challan)}>
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

      {/* View Challan Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Delivery Challan Details</DialogTitle>
        <DialogContent>
          {selectedChallan && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">Challan Number</Typography>
                <Typography variant="h6" fontWeight="bold">{selectedChallan.challan_number}</Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">Delivery Date</Typography>
                <Typography variant="body1">
                  {new Date(selectedChallan.delivery_date).toLocaleDateString()}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">Customer</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {getCustomerName(selectedChallan.customer_id)}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">Order Number</Typography>
                <Typography variant="body1">{getOrderNumber(selectedChallan.order_id)}</Typography>
              </Box>

              {selectedChallan.notes && (
                <Box>
                  <Typography variant="body2" color="text.secondary">Notes</Typography>
                  <Typography variant="body1">{selectedChallan.notes}</Typography>
                </Box>
              )}

              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>Items</Typography>
                {(selectedChallan as any).challan_items && (
                  <List dense>
                    {(selectedChallan as any).challan_items.map((item: ChallanItem, index: number) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={item.material_type.toUpperCase()}
                          secondary={`Qty: ${item.quantity}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
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

export default DeliveriesSimplified;
