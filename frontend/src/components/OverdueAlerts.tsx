import React, { useState, useEffect } from 'react';
import {
  Alert,
  Badge,
  Box,
  Chip,
  Collapse,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Typography,
  Tooltip,
} from '@mui/material';
import {
  Warning,
  ExpandMore,
  ExpandLess,
  Schedule,
  Person,
  Assignment,
} from '@mui/icons-material';
import { designerApi } from '../services/designerApi';
import { componentLogger } from '../utils/debug';

interface OverdueAssignment {
  assignment_id: string;
  order_number: string;
  customer_name: string;
  designer_name: string;
  material_type: string;
  priority_level: string;
  days_overdue: number;
  estimated_hours: number;
}

interface OverdueAlertsProps {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  showInHeader?: boolean;
}

const OverdueAlerts: React.FC<OverdueAlertsProps> = ({ 
  autoRefresh = true, 
  refreshInterval = 300000, // 5 minutes
  showInHeader = false 
}) => {
  const [overdueItems, setOverdueItems] = useState<OverdueAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Load overdue items
  const loadOverdueItems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const items = await designerApi.getOverdueAssignments();
      setOverdueItems(items);
      
      componentLogger.info('Overdue items loaded', { count: items.length });
    } catch (error: any) {
      componentLogger.error('Failed to load overdue items', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial load and auto-refresh setup
  useEffect(() => {
    loadOverdueItems();

    if (autoRefresh) {
      const interval = setInterval(loadOverdueItems, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Helper functions
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'normal': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getSeverityLevel = (daysOverdue: number) => {
    if (daysOverdue >= 7) return 'error'; // Critical - 1 week overdue
    if (daysOverdue >= 3) return 'warning'; // High - 3+ days overdue
    return 'info'; // Medium - 1-2 days overdue
  };

  const getCriticalItems = () => overdueItems.filter(item => item.days_overdue >= 7);
  const getHighItems = () => overdueItems.filter(item => item.days_overdue >= 3 && item.days_overdue < 7);
  const getMediumItems = () => overdueItems.filter(item => item.days_overdue < 3);

  // If showing in header, return compact version
  if (showInHeader) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title="Overdue Assignments">
          <IconButton
            color={overdueItems.length > 0 ? 'error' : 'inherit'}
            onClick={() => setExpanded(!expanded)}
            size="small"
          >
            <Badge badgeContent={overdueItems.length} color="error">
              <Warning />
            </Badge>
          </IconButton>
        </Tooltip>
        
        {expanded && overdueItems.length > 0 && (
          <Box sx={{ position: 'absolute', top: 60, right: 20, zIndex: 1300 }}>
            <Alert 
              severity="error"
              action={
                <IconButton
                  color="inherit"
                  size="small"
                  onClick={() => setExpanded(false)}
                >
                  <ExpandLess />
                </IconButton>
              }
              sx={{ minWidth: 300, maxWidth: 400 }}
            >
              <Typography variant="subtitle2" gutterBottom>
                {overdueItems.length} Overdue Assignment{overdueItems.length !== 1 ? 's' : ''}
              </Typography>
              <List dense>
                {overdueItems.slice(0, 3).map((item) => (
                  <ListItem key={item.assignment_id} sx={{ py: 0.5 }}>
                    <ListItemText
                      primary={`${item.order_number} - ${item.material_type}`}
                      secondary={`${item.customer_name} | ${item.days_overdue} days overdue`}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
                {overdueItems.length > 3 && (
                  <ListItem>
                    <ListItemText
                      primary={`+${overdueItems.length - 3} more items`}
                      primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                    />
                  </ListItem>
                )}
              </List>
            </Alert>
          </Box>
        )}
      </Box>
    );
  }

  // Full component version
  if (loading && overdueItems.length === 0) {
    return (
      <Alert severity="info" icon={<Schedule />}>
        Loading overdue assignments...
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load overdue assignments: {error}
      </Alert>
    );
  }

  if (overdueItems.length === 0) {
    return (
      <Alert severity="success" icon={<Schedule />}>
        <Typography variant="h6">All Up to Date!</Typography>
        <Typography variant="body2">
          No overdue assignments found. Great work keeping on schedule!
        </Typography>
      </Alert>
    );
  }

  return (
    <Box>
      {/* Summary Alert */}
      <Alert 
        severity={getSeverityLevel(Math.max(...overdueItems.map(i => i.days_overdue)))}
        action={
          <IconButton
            color="inherit"
            size="small"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        }
        sx={{ mb: expanded ? 2 : 0 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="h6">
              {overdueItems.length} Overdue Assignment{overdueItems.length !== 1 ? 's' : ''}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
              {getCriticalItems().length > 0 && (
                <Chip
                  label={`${getCriticalItems().length} Critical (7+ days)`}
                  color="error"
                  size="small"
                  icon={<Warning />}
                />
              )}
              {getHighItems().length > 0 && (
                <Chip
                  label={`${getHighItems().length} High (3-6 days)`}
                  color="warning"
                  size="small"
                  icon={<Schedule />}
                />
              )}
              {getMediumItems().length > 0 && (
                <Chip
                  label={`${getMediumItems().length} Medium (1-2 days)`}
                  color="info"
                  size="small"
                  icon={<Schedule />}
                />
              )}
            </Box>
          </Box>
        </Box>
      </Alert>

      {/* Detailed List */}
      <Collapse in={expanded}>
        <Box sx={{ mt: 2 }}>
          {/* Critical Items */}
          {getCriticalItems().length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" color="error.main" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Warning />
                Critical - 7+ Days Overdue
              </Typography>
              <List>
                {getCriticalItems().map((item) => (
                  <ListItem key={item.assignment_id} sx={{ bgcolor: 'error.50', mb: 1, borderRadius: 1 }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {item.order_number} - {item.material_type}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Chip
                              label={`${item.days_overdue} days overdue`}
                              color="error"
                              size="small"
                            />
                            <Chip
                              label={item.priority_level.toUpperCase()}
                              color={getPriorityColor(item.priority_level) as any}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2">{item.customer_name}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Assignment sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2">{item.designer_name}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Schedule sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2">{item.estimated_hours}h estimated</Typography>
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* High Priority Items */}
          {getHighItems().length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" color="warning.main" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Schedule />
                High Priority - 3-6 Days Overdue
              </Typography>
              <List>
                {getHighItems().map((item) => (
                  <ListItem key={item.assignment_id} sx={{ bgcolor: 'warning.50', mb: 1, borderRadius: 1 }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {item.order_number} - {item.material_type}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Chip
                              label={`${item.days_overdue} days overdue`}
                              color="warning"
                              size="small"
                            />
                            <Chip
                              label={item.priority_level.toUpperCase()}
                              color={getPriorityColor(item.priority_level) as any}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
                          <Typography variant="body2">{item.customer_name}</Typography>
                          <Typography variant="body2">Designer: {item.designer_name}</Typography>
                          <Typography variant="body2">{item.estimated_hours}h</Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Medium Priority Items */}
          {getMediumItems().length > 0 && (
            <Box>
              <Typography variant="h6" color="info.main" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Schedule />
                Medium Priority - 1-2 Days Overdue
              </Typography>
              <List>
                {getMediumItems().map((item) => (
                  <ListItem key={item.assignment_id} sx={{ bgcolor: 'info.50', mb: 1, borderRadius: 1 }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="subtitle1">
                            {item.order_number} - {item.material_type}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Chip
                              label={`${item.days_overdue} day${item.days_overdue !== 1 ? 's' : ''} overdue`}
                              color="info"
                              size="small"
                            />
                            <Chip
                              label={item.priority_level.toUpperCase()}
                              color={getPriorityColor(item.priority_level) as any}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
                          <Typography variant="body2">{item.customer_name}</Typography>
                          <Typography variant="body2">Designer: {item.designer_name}</Typography>
                          <Typography variant="body2">{item.estimated_hours}h</Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

export default OverdueAlerts;