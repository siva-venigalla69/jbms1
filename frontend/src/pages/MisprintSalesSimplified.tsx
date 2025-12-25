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
  MonetizationOn,
} from '@mui/icons-material';
import { simplifiedApi, MisprintSale, MaterialStock } from '../services/simplifiedApi';

const MisprintSalesSimplified: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [misprintStock, setMisprintStock] = useState<MaterialStock[]>([]);
  const [sales, setSales] = useState<MisprintSale[]>([]);
  const [materialTypes, setMaterialTypes] = useState<string[]>([]);

  const [materialType, setMaterialType] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(0);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [stockData, salesData, materialTypesData] = await Promise.all([
        simplifiedApi.stock.getMisprintStock(),
        simplifiedApi.misprintSales.getAll(),
        simplifiedApi.materialTypes.getAll(),
      ]);

      setMisprintStock(stockData);
      setSales(salesData);
      setMaterialTypes(materialTypesData.map(t => t.type_code));
    } catch (err: any) {
      setError('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!materialType || quantity <= 0 || unitPrice <= 0) {
      setError('Please fill in all required fields');
      return;
    }

    const totalAmount = quantity * unitPrice;

    try {
      setLoading(true);

      const saleData = {
        sale_number: '', // Auto-generated
        sale_date: new Date().toISOString(),
        material_type: materialType,
        quantity,
        unit_price: unitPrice,
        total_amount: totalAmount,
        customer_name: customerName || undefined,
        notes,
      };

      await simplifiedApi.misprintSales.create(saleData);

      setSuccess(`Misprint sale created successfully! ₹${totalAmount.toFixed(2)} for ${quantity} ${materialType}.`);

      // Reset form
      setMaterialType('');
      setQuantity(0);
      setUnitPrice(0);
      setCustomerName('');
      setNotes('');

      // Reload data
      const [stockData, salesData] = await Promise.all([
        simplifiedApi.stock.getMisprintStock(),
        simplifiedApi.misprintSales.getAll(),
      ]);
      setMisprintStock(stockData);
      setSales(salesData);
    } catch (err: any) {
      setError('Failed to create sale: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getAvailableStock = (type: string) => {
    const stock = misprintStock.find(s => s.material_type === type);
    return stock?.quantity || 0;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Misprint Sales
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
                <Typography variant="h6">Create Misprint Sale</Typography>
              </Box>

              <form onSubmit={handleSubmit}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <FormControl fullWidth required>
                    <InputLabel>Material Type</InputLabel>
                    <Select
                      value={materialType}
                      onChange={(e) => setMaterialType(e.target.value)}
                      label="Material Type"
                    >
                      {materialTypes.map(type => (
                        <MenuItem key={type} value={type}>
                          {type?.toUpperCase() || type} (Available: {getAvailableStock(type)})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {materialType && (
                    <Alert severity="info">
                      Available misprint stock: <strong>{getAvailableStock(materialType)}</strong>
                    </Alert>
                  )}

                  <TextField
                    label="Quantity"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    inputProps={{ min: 1, max: getAvailableStock(materialType) }}
                    fullWidth
                    required
                  />

                  <TextField
                    label="Unit Price (₹)"
                    type="number"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(Number(e.target.value))}
                    inputProps={{ min: 0, step: 0.01 }}
                    fullWidth
                    required
                  />

                  {quantity > 0 && unitPrice > 0 && (
                    <Alert severity="success">
                      Total Amount: <strong>₹{(quantity * unitPrice).toFixed(2)}</strong>
                    </Alert>
                  )}

                  <TextField
                    label="Customer Name (Optional)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    fullWidth
                  />

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
                    disabled={loading || !materialType || quantity > getAvailableStock(materialType)}
                    startIcon={loading ? <CircularProgress size={20} /> : <Add />}
                    sx={{ mt: 2 }}
                  >
                    {loading ? 'Creating...' : 'Create Sale'}
                  </Button>
                </Box>
              </form>
            </CardContent>
          </Card>

          {/* Misprint Stock Summary */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Misprint Stock Summary
              </Typography>
              {misprintStock.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No misprint stock available
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {misprintStock.map(stock => (
                    <Box
                      key={stock.id}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        p: 1,
                        bgcolor: 'grey.50',
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="body2">{stock.material_type?.toUpperCase() || stock.material_type}</Typography>
                      <Chip label={stock.quantity} color="error" size="small" />
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <MonetizationOn color="primary" />
                <Typography variant="h6">Recent Misprint Sales</Typography>
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : sales.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <MonetizationOn sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No sales yet
                  </Typography>
                </Box>
              ) : (
                <TableContainer sx={{ maxHeight: '60vh' }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Sale Number</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Material</TableCell>
                        <TableCell>Qty</TableCell>
                        <TableCell>Unit Price</TableCell>
                        <TableCell>Total</TableCell>
                        <TableCell>Customer</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sales.map((sale) => (
                        <TableRow key={sale.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {sale.sale_number}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {new Date(sale.sale_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{sale.material_type?.toUpperCase() || sale.material_type}</TableCell>
                          <TableCell>
                            <Chip label={sale.quantity} size="small" />
                          </TableCell>
                          <TableCell>₹{sale.unit_price.toFixed(2)}</TableCell>
                          <TableCell>
                            <Chip label={`₹${sale.total_amount.toFixed(2)}`} color="success" size="small" />
                          </TableCell>
                          <TableCell>{sale.customer_name || '-'}</TableCell>
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

export default MisprintSalesSimplified;
