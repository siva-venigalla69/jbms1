import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box,
  LinearProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Factory,
  Palette,
  CheckCircle,
  Schedule,
  LocalShipping,
  Star,
  Edit,
  PlayArrow,
  Stop
} from '@mui/icons-material';
import { ProductionBatch, ProductionStatus, DesignStatus } from '../types';

interface ProductionBatchCardProps {
  batch: ProductionBatch;
  onUpdateStatus?: (batchId: string, newStatus: ProductionStatus) => void;
  onEdit?: (batch: ProductionBatch) => void;
  onMarkDelivered?: (batch: ProductionBatch) => void;
}

const ProductionBatchCard: React.FC<ProductionBatchCardProps> = ({
  batch,
  onUpdateStatus,
  onEdit,
  onMarkDelivered
}) => {
  // Status color mapping
  const getStatusColor = (status: ProductionStatus) => {
    switch (status) {
      case 'pending': return 'default';
      case 'pre_treatment': return 'info';
      case 'printing': return 'warning';
      case 'post_process': return 'secondary';
      case 'completed': return 'success';
      default: return 'default';
    }
  };

  const getDesignStatusColor = (status: DesignStatus) => {
    switch (status) {
      case 'pending_from_customer': return 'error';
      case 'design_received_from_customer': return 'warning';
      case 'design_ready': return 'success';
      default: return 'default';
    }
  };

  const getBatchStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'default';
      case 'in_progress': return 'info';
      case 'completed': return 'success';
      case 'delivered': return 'primary';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  // Progress calculation
  const getProgressPercentage = () => {
    switch (batch.production_status) {
      case 'pending': return 0;
      case 'pre_treatment': return 25;
      case 'printing': return 50;
      case 'post_process': return 75;
      case 'completed': return 100;
      default: return 0;
    }
  };

  const canAdvanceStatus = () => {
    return batch.design_status === 'design_ready' &&
           batch.production_status !== 'completed' &&
           batch.batch_status !== 'delivered';
  };

  const getNextStatus = (): ProductionStatus | null => {
    switch (batch.production_status) {
      case 'pending': return 'pre_treatment';
      case 'pre_treatment': return 'printing';
      case 'printing': return 'post_process';
      case 'post_process': return 'completed';
      default: return null;
    }
  };

  const handleAdvanceStatus = () => {
    const nextStatus = getNextStatus();
    if (nextStatus && onUpdateStatus) {
      onUpdateStatus(batch.id, nextStatus);
    }
  };

  return (
    <Card
      sx={{
        height: '100%',
        border: batch.priority === 'urgent' ? '2px solid' : '1px solid',
        borderColor: batch.priority === 'urgent' ? 'error.main' : 'divider',
        transition: 'all 0.3s ease',
        '&:hover': {
          elevation: 4,
          transform: 'translateY(-2px)'
        }
      }}
    >
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight="bold" color="primary">
              {batch.production_batch_number}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {batch.material_type} • {batch.planned_quantity} units
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
            <Chip
              label={batch.priority}
              size="small"
              color={batch.priority === 'urgent' ? 'error' : batch.priority === 'high' ? 'warning' : 'default'}
            />
            {batch.quality_rating && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Star sx={{ fontSize: 16, color: 'gold' }} />
                <Typography variant="caption">{batch.quality_rating}/5</Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Status Chips */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          <Chip
            icon={<Palette />}
            label={batch.design_status.replace(/_/g, ' ')}
            size="small"
            color={getDesignStatusColor(batch.design_status)}
            variant="outlined"
          />
          <Chip
            icon={<Factory />}
            label={batch.production_status.replace(/_/g, ' ')}
            size="small"
            color={getStatusColor(batch.production_status)}
          />
          <Chip
            label={batch.batch_status}
            size="small"
            color={getBatchStatusColor(batch.batch_status)}
            variant="filled"
          />
        </Box>

        {/* Progress Bar */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Production Progress
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {getProgressPercentage()}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={getProgressPercentage()}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>

        {/* Quantities */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 2 }}>
          <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="h6" color="primary">{batch.planned_quantity}</Typography>
            <Typography variant="caption">Planned</Typography>
          </Box>
          <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="h6" color="info.main">{batch.actual_quantity || '-'}</Typography>
            <Typography variant="caption">Produced</Typography>
          </Box>
          <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="h6" color="success.main">{batch.delivered_quantity || '-'}</Typography>
            <Typography variant="caption">Delivered</Typography>
          </Box>
        </Box>

        {/* Dates */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            <Schedule sx={{ fontSize: 12, mr: 0.5 }} />
            Start: {new Date(batch.planned_start_date).toLocaleDateString()}
          </Typography>
          {batch.actual_completion_date && (
            <Typography variant="caption" color="success.main">
              <CheckCircle sx={{ fontSize: 12, mr: 0.5 }} />
              Completed: {new Date(batch.actual_completion_date).toLocaleDateString()}
            </Typography>
          )}
        </Box>

        {/* Delivery Info */}
        {batch.delivery_challan_id && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <LocalShipping sx={{ fontSize: 16, color: 'success.main' }} />
            <Typography variant="caption" color="success.main">
              Delivered via DC-{batch.delivery_challan_id.slice(-6)}
            </Typography>
          </Box>
        )}

        {/* Notes */}
        {batch.production_notes && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            📝 {batch.production_notes}
          </Typography>
        )}
      </CardContent>

      <CardActions>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {canAdvanceStatus() && (
              <Tooltip title={`Advance to ${getNextStatus()?.replace(/_/g, ' ')}`}>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<PlayArrow />}
                  onClick={handleAdvanceStatus}
                  color="primary"
                >
                  Next Stage
                </Button>
              </Tooltip>
            )}

            {batch.batch_status === 'completed' && !batch.delivery_challan_id && onMarkDelivered && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<LocalShipping />}
                onClick={() => onMarkDelivered(batch)}
                color="success"
              >
                Mark Delivered
              </Button>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            {onEdit && (
              <IconButton size="small" onClick={() => onEdit(batch)}>
                <Edit />
              </IconButton>
            )}

            {batch.batch_status === 'in_progress' && (
              <Tooltip title="Pause production">
                <IconButton size="small" color="warning">
                  <Stop />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      </CardActions>
    </Card>
  );
};

export default ProductionBatchCard;