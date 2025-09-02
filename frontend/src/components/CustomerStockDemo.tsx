// Customer Stock Demo - Shows stock logic and current levels
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  Grid,
} from '@mui/material';
import {
  Inventory,
  Add,
  Remove,
  Refresh,
  Info,
} from '@mui/icons-material';
import { materialStockApi } from '../services/supabaseApi';

const CustomerStockDemo: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stockData, setStockData] = useState<any[]>([]);

  const loadStockData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get all customer stock
      const data = await materialStockApi.getCustomerStock();
      setStockData(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load stock data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStockData();
  }, []);

  const getStockStatusColor = (stock: number) => {
    if (stock < 0) return 'error';
    if (stock < 10) return 'warning';
    if (stock < 50) return 'info';
    return 'success';
  };

  const getStockStatusLabel = (stock: number) => {
    if (stock < 0) return 'Overdelivered';
    if (stock < 10) return 'Low Stock';
    if (stock < 50) return 'Medium Stock';
    return 'Good Stock';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Inventory color="primary" />
          Customer Stock Management Demo
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadStockData}
          disabled={loading}
        >
          Refresh Stock
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stock Logic Explanation */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Info color="info" />
            How Customer Stock Logic Works
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box>
                <Typography variant="subtitle1" color="success.main" fontWeight="bold">
                  📦 Material Received
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  When materials are received from customers, they are added to <code>material_in</code> table.
                  The <code>total_received</code> increases.
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box>
                <Typography variant="subtitle1" color="primary.main" fontWeight="bold">
                  🚚 Material Delivered
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  When delivery challans are created, materials are deducted from stock.
                  The <code>total_delivered</code> increases.
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box>
                <Typography variant="subtitle1" color="info.main" fontWeight="bold">
                  📊 Current Stock
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  <code>current_stock = total_received - total_delivered</code><br />
                  Negative values indicate over-delivery.
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" gutterBottom>
            📋 Delivery Challan Stock Deduction Process:
          </Typography>
          <Typography variant="body2" component="ol" sx={{ pl: 2 }}>
            <li>When a delivery challan is created, the system looks at each delivery item</li>
            <li>It gets the material_type from the order_items table using order_item_id</li>
            <li>It groups all delivered quantities by material_type for the customer</li>
            <li>For each material type, it updates the material_stock table:</li>
            <ul>
              <li><code>total_delivered += quantity_delivered</code></li>
              <li><code>current_stock = total_received - total_delivered</code></li>
            </ul>
            <li>If no stock record exists, it creates one with negative stock (over-delivery)</li>
          </Typography>
        </CardContent>
      </Card>

      {/* Current Stock Levels */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Current Customer Stock Levels ({stockData.length} records)
          </Typography>
          
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : stockData.length === 0 ? (
            <Alert severity="info">
              No stock records found. Materials will be tracked when received or delivered.
            </Alert>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Customer</TableCell>
                    <TableCell>Material Type</TableCell>
                    <TableCell align="right">Total Received</TableCell>
                    <TableCell align="right">Total Delivered</TableCell>
                    <TableCell align="right">Current Stock</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Last Updated</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stockData.map((stock, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {stock.customer?.name || 'Unknown Customer'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={stock.material_type} 
                          color="primary" 
                          variant="outlined" 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="success.main">
                          <Add fontSize="small" sx={{ verticalAlign: 'middle' }} />
                          {stock.total_received || 0}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="error.main">
                          <Remove fontSize="small" sx={{ verticalAlign: 'middle' }} />
                          {stock.total_delivered || 0}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography 
                          variant="h6" 
                          fontWeight="bold"
                          color={stock.current_stock < 0 ? 'error.main' : 'text.primary'}
                        >
                          {stock.current_stock || 0}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStockStatusLabel(stock.current_stock || 0)}
                          color={getStockStatusColor(stock.current_stock || 0)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="textSecondary">
                          {new Date(stock.last_updated).toLocaleDateString()}
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
    </Box>
  );
};

export default CustomerStockDemo;