import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  CircularProgress,
  Stack
} from '@mui/material';
import { orderItemApi } from '../services/supabaseApi';
import { getStageDisplayName } from '../utils/productionUtils';
import type { OrderItem, ProductionStage, MaterialType, StageStockFilter, StageStockSummary } from '../types';

interface ProductionStockFilterProps {
  customerId?: string;
}

export const ProductionStockFilter: React.FC<ProductionStockFilterProps> = ({ customerId }) => {
  const [loading, setLoading] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [stageCombinations, setStageCombinations] = useState<StageStockSummary[]>([]);
  
  const [filters, setFilters] = useState<StageStockFilter>({
    designStatus: 'all',
    productionStatus: 'all',
    customerId,
    materialType: 'all'
  });

  const loadData = async () => {
    setLoading(true);
    try {
      // Load filtered stock data
      const stockData = await orderItemApi.getProductionStockByStage(filters);
      setOrderItems(stockData);

      // Load stage combinations
      const combinations = await orderItemApi.getStageReadinessCombinations();
      setStageCombinations(combinations);
    } catch (error) {
      console.error('Failed to load production stock data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  const handleFilterChange = (field: keyof StageStockFilter, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value === '' ? undefined : value
    }));
  };

  const getDesignStatusChip = (item: OrderItem) => {
    const designReceived = item.customization_details?.includes('Design Status: Received') || false;
    const designReady = item.customization_details?.includes('Ready: Yes') || false;
    
    if (designReceived && designReady) {
      return <Chip label="Design Ready" color="success" size="small" />;
    } else if (designReceived && !designReady) {
      return <Chip label="Design Received" color="warning" size="small" />;
    } else {
      return <Chip label="Design Pending" color="error" size="small" />;
    }
  };

  const getStageChip = (stage: ProductionStage) => {
    const colorMap: Record<ProductionStage, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
      'design_pending': 'error',
      'design_ready': 'warning',
      'pre_treatment': 'info',
      'printing': 'primary',
      'post_process': 'success'
    };
    
    return (
      <Chip 
        label={getStageDisplayName(stage)} 
        color={colorMap[stage] || 'default'} 
        size="small" 
      />
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Production Stock by Stage & Design Status
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Filters
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ gap: 2 }}>
          <Box sx={{ minWidth: 200 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Production Stage</InputLabel>
              <Select
                value={filters.productionStatus || 'all'}
                label="Production Stage"
                onChange={(e) => handleFilterChange('productionStatus', e.target.value)}
              >
                <MenuItem value="all">All Stages</MenuItem>
                <MenuItem value="design_pending">Design Pending</MenuItem>
                <MenuItem value="design_ready">Design Ready</MenuItem>
                <MenuItem value="pre_treatment">Pre-treatment</MenuItem>
                <MenuItem value="printing">Printing</MenuItem>
                <MenuItem value="post_process">Post Process</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ minWidth: 200 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Material Type</InputLabel>
              <Select
                value={filters.materialType || 'all'}
                label="Material Type"
                onChange={(e) => handleFilterChange('materialType', e.target.value)}
              >
                <MenuItem value="all">All Materials</MenuItem>
                <MenuItem value="saree">Saree</MenuItem>
                <MenuItem value="dupatta">Dupatta</MenuItem>
                <MenuItem value="voni">Voni</MenuItem>
                <MenuItem value="running_material">Running Material</MenuItem>
                <MenuItem value="blouse_material">Blouse Material</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <FormControlLabel
            control={
              <Checkbox
                checked={filters.designStatus === 'design_received_from_customer'}
                onChange={(e) => 
                  handleFilterChange(
                    'designStatus', 
                    e.target.checked ? 'design_received_from_customer' : 'all'
                  )
                }
              />
            }
            label="Design Received"
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={filters.designStatus === 'design_ready'}
                onChange={(e) => 
                  handleFilterChange(
                    'designStatus', 
                    e.target.checked ? 'design_ready' : 'all'
                  )
                }
              />
            }
            label="Design Ready"
          />
        </Stack>

        <Box sx={{ mt: 2 }}>
          <Button variant="outlined" onClick={loadData} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Refresh'}
          </Button>
        </Box>
      </Paper>

      {/* Stage Combinations Summary */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Stage & Design Status Combinations
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {stageCombinations.map((combo, index) => (
            <Box 
              key={index} 
              sx={{ 
                p: 2, 
                border: '1px solid #ddd', 
                borderRadius: 1, 
                minWidth: 200,
                flex: '1 1 200px'
              }}
            >
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                {getStageDisplayName(combo.productionStatus as ProductionStage)}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                {combo.designStatus}
              </Typography>
              <Typography variant="h6" color="primary">
                {combo.count} items
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Filtered Items Table */}
      <Paper>
        <Typography variant="h6" sx={{ p: 2 }}>
          Filtered Items ({orderItems.length} items)
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Order #</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Material</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Stage</TableCell>
                <TableCell>Design Status</TableCell>
                <TableCell>Order Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orderItems.map((item) => {
                const order = (item as any).order;
                return (
                  <TableRow key={item.id}>
                    <TableCell>{order?.order_number || 'N/A'}</TableCell>
                    <TableCell>{order?.customer?.name || 'N/A'}</TableCell>
                    <TableCell>{item.material_type}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>
                      {getStageChip(item.current_stage || 'design_pending')}
                    </TableCell>
                    <TableCell>
                      {getDesignStatusChip(item)}
                    </TableCell>
                    <TableCell>
                      {order?.order_date ? new Date(order.order_date).toLocaleDateString() : 'N/A'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default ProductionStockFilter;