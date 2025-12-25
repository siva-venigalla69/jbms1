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
  AssignmentReturn,
} from '@mui/icons-material';
import { simplifiedApi, Customer, Order, Return, SIMPLE_ENUMS } from '../services/simplifiedApi';

const ReturnsSimplified: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [materialTypes, setMaterialTypes] = useState<string[]>([]);
  const [returns, setReturns] = useState<Return[]>([]);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [returnType, setReturnType] = useState<'customer_return' | 'damaged_return'>('customer_return');
  const [materialType, setMaterialType] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [customerData, orderData, materialTypesData, returnsData] = await Promise.all([
        simplifiedApi.customers.getAll(),
        simplifiedApi.orders.getAll(),
        simplifiedApi.materialTypes.getAll(),
        simplifiedApi.returns.getAll(),
      ]);

      setCustomers(customerData);
      setOrders(orderData);
      setMaterialTypes(materialTypesData.map(t => t.type_code));
      setReturns(returnsData);
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

    try {
      setLoading(true);

      const returnData = {
        customer_id: selectedCustomerId || null,
        order_id: selectedOrderId || null,
        return_type: returnType,
        material_type: materialType,
        quantity,
        reason,
        return_date: new Date().toISOString(),
        adjustment_amount: adjustmentAmount || undefined,
      };

      await simplifiedApi.returns.create(returnData);

      setSuccess(`Return created successfully! ${quantity} ${materialType} marked as ${returnType.replace('_', ' ')}.`);

      // Reset form
      setSelectedCustomerId('');
      setSelectedOrderId('');
      setMaterialType('');
      setQuantity(0);
      setReason('');
      setAdjustmentAmount(0);

      // Reload returns
      const returnsData = await simplifiedApi.returns.getAll();
      setReturns(returnsData);
    } catch (err: any) {
      setError('Failed to create return: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getCustomerName = (customerId: string | null) => {
    if (!customerId) return 'Internal';
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || 'Unknown Customer';
  };

  const filteredOrders = orders.filter(o => o.customer_id === selectedCustomerId);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Returns & Adjustments
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
                <Typography variant="h6">Create Return</Typography>
              </Box>

              <form onSubmit={handleSubmit}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <FormControl fullWidth required>
                    <InputLabel>Return Type</InputLabel>
                    <Select
                      value={returnType}
                      onChange={(e) => setReturnType(e.target.value as 'customer_return' | 'damaged_return')}
                      label="Return Type"
                    >
                      <MenuItem value="customer_return">Customer Return (Misprint)</MenuItem>
                      <MenuItem value="damaged_return">Damaged Return</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>Customer (Optional)</InputLabel>
                    <Select
                      value={selectedCustomerId}
                      onChange={(e) => {
                        setSelectedCustomerId(e.target.value);
                        setSelectedOrderId('');
                      }}
                      label="Customer (Optional)"
                    >
                      <MenuItem value="">None</MenuItem>
                      {customers.map(customer => (
                        <MenuItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {selectedCustomerId && (
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
                            {order.order_number}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}

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

                  <TextField
                    label="Quantity"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    inputProps={{ min: 1 }}
                    fullWidth
                    required
                  />

                  <TextField
                    label="Reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    multiline
                    rows={2}
                    fullWidth
                  />

                  {returnType === 'customer_return' && (
                    <TextField
                      label="Adjustment Amount (Optional)"
                      type="number"
                      value={adjustmentAmount}
                      onChange={(e) => setAdjustmentAmount(Number(e.target.value))}
                      inputProps={{ min: 0, step: 0.01 }}
                      fullWidth
                      helperText="Credit amount for customer"
                    />
                  )}

                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : <Add />}
                    sx={{ mt: 2 }}
                  >
                    {loading ? 'Creating...' : 'Create Return'}
                  </Button>
                </Box>
              </form>

              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  <strong>Note:</strong> Customer returns (misprints) will be automatically added to misprint stock for future sale.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <AssignmentReturn color="primary" />
                <Typography variant="h6">Recent Returns</Typography>
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : returns.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <AssignmentReturn sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No returns yet
                  </Typography>
                </Box>
              ) : (
                <TableContainer sx={{ maxHeight: '60vh' }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Customer</TableCell>
                        <TableCell>Material</TableCell>
                        <TableCell>Quantity</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Reason</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {returns.map((returnItem) => (
                        <TableRow key={returnItem.id} hover>
                          <TableCell>
                            {new Date(returnItem.return_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{getCustomerName(returnItem.customer_id)}</TableCell>
                          <TableCell>{returnItem.material_type.toUpperCase()}</TableCell>
                          <TableCell>
                            <Chip label={returnItem.quantity} color="error" size="small" />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={returnItem.return_type.replace('_', ' ').toUpperCase()}
                              color={returnItem.return_type === 'customer_return' ? 'warning' : 'error'}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                              {returnItem.reason || '-'}
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
  );
};

export default ReturnsSimplified;
