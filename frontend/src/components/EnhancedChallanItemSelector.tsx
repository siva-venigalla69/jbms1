import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  IconButton,
  Chip,
  LinearProgress,
  Alert,
  Button,
  Card,
  CardContent,
  Grid,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Palette as DesignIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { deliveryChallanApi } from '../services/supabaseApi';
import { componentLogger } from '../utils/debug';

interface AvailableDeliveryItem {
  order_item_id: string;
  order_id: string;
  order_number: string;
  material_type_name: string;
  ordered_quantity: number;
  delivered_quantity: number;
  available_quantity: number;
  unit_price: number;
  design_url: string;
  design_notes: string;
  design_ready: boolean;
  production_stage: string;
  last_delivery_date: string;
}

interface ChallanItemSelection {
  order_item_id: string;
  quantity_to_deliver: number;
  notes?: string;
}

interface Props {
  customerId: string;
  selectedItems: ChallanItemSelection[];
  onChange: (items: ChallanItemSelection[]) => void;
  disabled?: boolean;
}

const EnhancedChallanItemSelector: React.FC<Props> = ({
  customerId,
  selectedItems,
  onChange,
  disabled = false
}) => {
  const [availableItems, setAvailableItems] = useState<AvailableDeliveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (customerId) {
      loadAvailableItems();
    }
  }, [customerId]);

  const loadAvailableItems = async () => {
    try {
      setLoading(true);
      setError(null);
      componentLogger.info('Loading available delivery items', { customerId });

      const items = await deliveryChallanApi.getAvailableDeliveryItems(customerId);
      setAvailableItems(items);
      componentLogger.info('Available delivery items loaded', { count: items.length });
    } catch (err: any) {
      componentLogger.error('Failed to load available delivery items', err);
      setError('Failed to load available items: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (orderItemId: string, quantity: number) => {
    const item = availableItems.find(item => item.order_item_id === orderItemId);
    if (!item) return;

    // Validate quantity
    if (quantity < 0) quantity = 0;
    if (quantity > item.available_quantity) quantity = item.available_quantity;

    const updatedItems = selectedItems.filter(item => item.order_item_id !== orderItemId);
    if (quantity > 0) {
      updatedItems.push({
        order_item_id: orderItemId,
        quantity_to_deliver: quantity
      });
    }

    onChange(updatedItems);
  };

  const getSelectedQuantity = (orderItemId: string): number => {
    const selectedItem = selectedItems.find(item => item.order_item_id === orderItemId);
    return selectedItem ? selectedItem.quantity_to_deliver : 0;
  };

  const getTotalSelectedValue = (): number => {
    return selectedItems.reduce((total, selectedItem) => {
      const item = availableItems.find(item => item.order_item_id === selectedItem.order_item_id);
      return total + (item ? selectedItem.quantity_to_deliver * item.unit_price : 0);
    }, 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const getDeliveryProgressColor = (delivered: number, ordered: number) => {
    const percentage = (delivered / ordered) * 100;
    if (percentage === 0) return 'error';
    if (percentage < 100) return 'warning';
    return 'success';
  };

  const groupedItems = availableItems.reduce((groups, item) => {
    const key = item.order_number;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<string, AvailableDeliveryItem[]>);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <Box textAlign="center">
          <LinearProgress sx={{ mb: 2, width: 200 }} />
          <Typography color="textSecondary">Loading available items...</Typography>
        </Box>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (availableItems.length === 0) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        No items available for delivery for this customer. All ordered items may have been fully delivered.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Summary */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="h6" color="primary">
                {availableItems.length} Items Available
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Across {Object.keys(groupedItems).length} orders
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="h6" color="secondary">
                {selectedItems.length} Selected
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total: {selectedItems.reduce((sum, item) => sum + item.quantity_to_deliver, 0)} items
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="h6" color="success.main">
                {formatCurrency(getTotalSelectedValue())}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Selected value
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Button
                variant="outlined"
                startIcon={<InfoIcon />}
                onClick={loadAvailableItems}
                disabled={loading}
              >
                Refresh
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Items by Order */}
      {Object.entries(groupedItems).map(([orderNumber, orderItems]) => (
        <Accordion key={orderNumber} defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
              <Typography variant="h6">Order: {orderNumber}</Typography>
              <Chip 
                label={`${orderItems.length} items`}
                size="small"
                color="primary"
              />
              <Chip 
                label={`${orderItems.reduce((sum, item) => sum + item.available_quantity, 0)} units pending`}
                size="small"
                color="warning"
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Material Type</TableCell>
                    <TableCell>Delivery Progress</TableCell>
                    <TableCell>Available</TableCell>
                    <TableCell>Unit Price</TableCell>
                    <TableCell>Design Status</TableCell>
                    <TableCell>Production</TableCell>
                    <TableCell>Quantity to Deliver</TableCell>
                    <TableCell>Line Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orderItems.map((item) => {
                    const selectedQuantity = getSelectedQuantity(item.order_item_id);
                    const progressPercentage = (item.delivered_quantity / item.ordered_quantity) * 100;
                    
                    return (
                      <TableRow key={item.order_item_id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {item.material_type_name}
                          </Typography>
                          {item.design_notes && (
                            <Typography variant="caption" color="textSecondary" display="block">
                              {item.design_notes}
                            </Typography>
                          )}
                        </TableCell>
                        
                        <TableCell>
                          <Box sx={{ width: '100%' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="caption">
                                {item.delivered_quantity} / {item.ordered_quantity}
                              </Typography>
                              <Typography variant="caption">
                                {progressPercentage.toFixed(0)}%
                              </Typography>
                            </Box>
                            <LinearProgress 
                              variant="determinate" 
                              value={progressPercentage}
                              color={getDeliveryProgressColor(item.delivered_quantity, item.ordered_quantity)}
                              sx={{ height: 6, borderRadius: 3 }}
                            />
                          </Box>
                          {item.last_delivery_date && (
                            <Typography variant="caption" color="textSecondary" display="block">
                              Last delivered: {formatDate(item.last_delivery_date)}
                            </Typography>
                          )}
                        </TableCell>
                        
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold" color="primary">
                            {item.available_quantity}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            units
                          </Typography>
                        </TableCell>
                        
                        <TableCell>
                          <Typography variant="body2">
                            {formatCurrency(item.unit_price)}
                          </Typography>
                        </TableCell>
                        
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Chip 
                              label={item.design_ready ? 'Ready' : 'Pending'}
                              color={item.design_ready ? 'success' : 'warning'}
                              size="small"
                              icon={item.design_ready ? <CheckCircleIcon /> : <WarningIcon />}
                            />
                            {item.design_url && (
                              <Tooltip title="Design file available">
                                <DesignIcon color="primary" fontSize="small" />
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                        
                        <TableCell>
                          <Typography variant="body2">
                            {item.production_stage || 'N/A'}
                          </Typography>
                        </TableCell>
                        
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <IconButton
                              size="small"
                              onClick={() => handleQuantityChange(item.order_item_id, selectedQuantity - 1)}
                              disabled={disabled || selectedQuantity <= 0}
                            >
                              <RemoveIcon />
                            </IconButton>
                            
                            <TextField
                              size="small"
                              type="number"
                              value={selectedQuantity}
                              onChange={(e) => handleQuantityChange(item.order_item_id, parseInt(e.target.value) || 0)}
                              disabled={disabled}
                              inputProps={{ 
                                min: 0, 
                                max: item.available_quantity,
                                style: { textAlign: 'center', width: '60px' }
                              }}
                            />
                            
                            <IconButton
                              size="small"
                              onClick={() => handleQuantityChange(item.order_item_id, selectedQuantity + 1)}
                              disabled={disabled || selectedQuantity >= item.available_quantity}
                            >
                              <AddIcon />
                            </IconButton>
                          </Box>
                          
                          {selectedQuantity > 0 && (
                            <Typography variant="caption" color="success.main" display="block" textAlign="center">
                              Selected
                            </Typography>
                          )}
                        </TableCell>
                        
                        <TableCell>
                          <Typography variant="body2" fontWeight={selectedQuantity > 0 ? 'bold' : 'normal'}>
                            {formatCurrency(selectedQuantity * item.unit_price)}
                          </Typography>
                          {selectedQuantity > 0 && (
                            <Typography variant="caption" color="textSecondary" display="block">
                              {selectedQuantity} × {formatCurrency(item.unit_price)}
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Selection Summary */}
      {selectedItems.length > 0 && (
        <Card sx={{ mt: 2, backgroundColor: 'success.50' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="success.main">
              Delivery Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="body2">
                  <strong>Total Items:</strong> {selectedItems.length}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="body2">
                  <strong>Total Quantity:</strong> {selectedItems.reduce((sum, item) => sum + item.quantity_to_deliver, 0)}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="body2">
                  <strong>Total Value:</strong> {formatCurrency(getTotalSelectedValue())}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default EnhancedChallanItemSelector;