import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Alert,
  Paper
} from '@mui/material';
import {
  Add,
  FilterList,
  Refresh
} from '@mui/icons-material';
import { ProductionBatch, ProductionBatchFilter } from '../types';
import { productionBatchApi } from '../services/supabaseApi';
import ProductionBatchCard from './ProductionBatchCard';
import { componentLogger } from '../utils/debug';

interface ProductionBatchListProps {
  orderId?: string;
  onCreateBatch?: () => void;
  onEditBatch?: (batch: ProductionBatch) => void;
  showCreateButton?: boolean;
  title?: string;
}

const ProductionBatchList: React.FC<ProductionBatchListProps> = ({
  orderId,
  onCreateBatch,
  onEditBatch,
  showCreateButton = true,
  title = "Production Batches"
}) => {
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProductionBatchFilter>({
    order_id: orderId,
    design_status: 'all',
    production_status: 'all',
    batch_status: 'all',
    priority: 'all'
  });

  const loadBatches = async () => {
    componentLogger.info('Loading production batches', filters);
    setLoading(true);
    setError(null);

    try {
      const data = await productionBatchApi.getProductionBatches(filters);
      setBatches(data);
      componentLogger.info(`Loaded ${data.length} production batches`);
    } catch (err: any) {
      const errorMsg = 'Failed to load production batches: ' + err.message;
      setError(errorMsg);
      componentLogger.error('Failed to load production batches', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, [filters]);

  const handleUpdateStatus = async (batchId: string, newStatus: any) => {
    try {
      componentLogger.info('Updating production status', { batchId, newStatus });
      await productionBatchApi.updateProductionStatus(batchId, newStatus);
      loadBatches(); // Reload to get updated data
    } catch (err: any) {
      setError('Failed to update status: ' + err.message);
      componentLogger.error('Failed to update production status', err);
    }
  };

  const handleMarkDelivered = async (batch: ProductionBatch) => {
    // TODO: Implement delivery challan creation
    alert(`Mark ${batch.production_batch_number} as delivered - TODO: Implement delivery challan integration`);
  };

  const handleFilterChange = (field: keyof ProductionBatchFilter, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value === 'all' ? undefined : value
    }));
  };

  // Group batches by status for better organization
  const groupedBatches = batches.reduce((acc, batch) => {
    const key = batch.batch_status;
    if (!acc[key]) acc[key] = [];
    acc[key].push(batch);
    return acc;
  }, {} as Record<string, ProductionBatch[]>);

  const getStatusOrder = () => ['planned', 'in_progress', 'completed', 'delivered', 'cancelled'];

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planned': return 'Planned';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const getStatusCount = (status: string) => groupedBatches[status]?.length || 0;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          {title}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadBatches}
            disabled={loading}
          >
            Refresh
          </Button>
          {showCreateButton && onCreateBatch && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={onCreateBatch}
            >
              Create Batch
            </Button>
          )}
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <FilterList />
          <Typography variant="h6">Filters</Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Design Status</InputLabel>
              <Select
                value={filters.design_status || 'all'}
                label="Design Status"
                onChange={(e) => handleFilterChange('design_status', e.target.value)}
              >
                <MenuItem value="all">All Design Status</MenuItem>
                <MenuItem value="pending_from_customer">Pending from Customer</MenuItem>
                <MenuItem value="design_received_from_customer">Design Received</MenuItem>
                <MenuItem value="design_ready">Design Ready</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Production Status</InputLabel>
              <Select
                value={filters.production_status || 'all'}
                label="Production Status"
                onChange={(e) => handleFilterChange('production_status', e.target.value)}
              >
                <MenuItem value="all">All Production Status</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="pre_treatment">Pre-treatment</MenuItem>
                <MenuItem value="printing">Printing</MenuItem>
                <MenuItem value="post_process">Post Process</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Priority</InputLabel>
              <Select
                value={filters.priority || 'all'}
                label="Priority"
                onChange={(e) => handleFilterChange('priority', e.target.value)}
              >
                <MenuItem value="all">All Priorities</MenuItem>
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              fullWidth
              size="small"
              label="Batch Number"
              placeholder="Search by batch number..."
              onChange={(e) => {
                // TODO: Implement batch number search
              }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Status Summary */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
            {getStatusOrder().map(status => (
              <Chip
                key={status}
                label={`${getStatusLabel(status)}: ${getStatusCount(status)}`}
                variant={getStatusCount(status) > 0 ? 'filled' : 'outlined'}
                color={status === 'delivered' ? 'success' : status === 'in_progress' ? 'info' : 'default'}
              />
            ))}
          </Box>

          {/* Batches by Status */}
          {batches.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No production batches found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {orderId ? 'This order has no production batches yet.' : 'No batches match the current filters.'}
              </Typography>
              {showCreateButton && onCreateBatch && (
                <Button variant="contained" startIcon={<Add />} onClick={onCreateBatch}>
                  Create First Batch
                </Button>
              )}
            </Box>
          ) : (
            getStatusOrder().map(status => {
              const statusBatches = groupedBatches[status] || [];
              if (statusBatches.length === 0) return null;

              return (
                <Box key={status} sx={{ mb: 4 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getStatusLabel(status)}
                    <Chip label={statusBatches.length} size="small" />
                  </Typography>
                  <Grid container spacing={2}>
                    {statusBatches.map(batch => (
                      <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={batch.id}>
                        <ProductionBatchCard
                          batch={batch}
                          onUpdateStatus={handleUpdateStatus}
                          onEdit={onEditBatch}
                          onMarkDelivered={handleMarkDelivered}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              );
            })
          )}
        </>
      )}
    </Box>
  );
};

export default ProductionBatchList;