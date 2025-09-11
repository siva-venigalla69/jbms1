import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  LinearProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Badge,
} from '@mui/material';
import {
  Dashboard,
  Assignment,
  Person,
  Warning,
  CheckCircle,
  Schedule,
  TrendingUp,
  Visibility,
  Edit,
  PlayArrow,
  Pause,
  Stop,
  Refresh,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { designerApi } from '../services/supabaseApi';
import { componentLogger } from '../utils/debug';

// Types
interface TodaysPriority {
  assignment_id: string;
  order_item_id: string;
  priority_level: 'urgent' | 'high' | 'normal' | 'low';
  expected_delivery_date: string;
  status: string;
  estimated_hours: number;
  material_type: string;
  quantity: number;
  customization_details?: string;
  order_number: string;
  customer_name: string;
  designer_name: string;
  design_name?: string;
  design_code?: string;
  urgency_status: 'overdue' | 'due_today' | 'due_tomorrow' | 'upcoming';
  days_until_due: number;
}

interface DesignerWorkload {
  designer_id: string;
  designer_email: string;
  designer_name: string;
  total_assignments: number;
  pending_assignments: number;
  active_assignments: number;
  overdue_assignments: number;
  pending_hours: number;
  urgent_tasks: number;
  high_priority_tasks: number;
  avg_completion_hours: number;
  on_time_deliveries: number;
  total_completed: number;
}

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

// Form validation schema
const statusUpdateSchema = yup.object({
  status: yup.string().required('Status is required'),
  reason: yup.string(),
});

const DesignerDashboard: React.FC = () => {
  // State
  const [todaysPriorities, setTodaysPriorities] = useState<TodaysPriority[]>([]);
  const [designerWorkloads, setDesignerWorkloads] = useState<DesignerWorkload[]>([]);
  const [overdueAssignments, setOverdueAssignments] = useState<OverdueAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusUpdateDialogOpen, setStatusUpdateDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<TodaysPriority | null>(null);

  // Form for status updates
  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(statusUpdateSchema),
    defaultValues: {
      status: '',
      reason: '',
    },
  });

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    componentLogger.info('Loading designer dashboard data...');
    try {
      setLoading(true);
      
      const [priorities, workloads, overdue] = await Promise.all([
        designerApi.getTodaysPriorities(),
        designerApi.getDesignerWorkloads(),
        designerApi.getOverdueAssignments(),
      ]);

      setTodaysPriorities(priorities);
      setDesignerWorkloads(workloads);
      setOverdueAssignments(overdue);
      
      componentLogger.info('Dashboard data loaded successfully', { 
        priorities: priorities.length,
        workloads: workloads.length,
        overdue: overdue.length
      });
    } catch (error: any) {
      componentLogger.error('Failed to load dashboard data', error);
      setError('Failed to load dashboard data: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Clear alerts after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Handle status update
  const handleStatusUpdate = (assignment: TodaysPriority) => {
    setSelectedAssignment(assignment);
    reset({
      status: assignment.status,
      reason: '',
    });
    setStatusUpdateDialogOpen(true);
  };

  const onStatusSubmit = async (data: any) => {
    if (!selectedAssignment) return;

    try {
      await designerApi.updateAssignmentStatus(
        selectedAssignment.assignment_id,
        data.status,
        data.reason
      );
      
      setSuccess(`Assignment status updated successfully`);
      setStatusUpdateDialogOpen(false);
      setSelectedAssignment(null);
      loadDashboardData();
    } catch (error: any) {
      setError('Failed to update assignment status: ' + error.message);
    }
  };

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

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'overdue': return 'error';
      case 'due_today': return 'warning';
      case 'due_tomorrow': return 'info';
      default: return 'success';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'default';
      case 'in_progress': return 'primary';
      case 'completed': return 'success';
      case 'on_hold': return 'warning';
      default: return 'default';
    }
  };

  // Calculate summary stats
  const summaryStats = {
    totalPriorities: todaysPriorities.length,
    urgentTasks: todaysPriorities.filter(t => t.priority_level === 'urgent').length,
    overdueTasks: todaysPriorities.filter(t => t.urgency_status === 'overdue').length,
    dueTodayTasks: todaysPriorities.filter(t => t.urgency_status === 'due_today').length,
    totalOverdue: overdueAssignments.length,
    totalDesigners: designerWorkloads.length,
    busyDesigners: designerWorkloads.filter(d => d.pending_hours > 30).length,
    availableDesigners: designerWorkloads.filter(d => d.pending_hours < 20).length,
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Dashboard />
          Designer Dashboard
        </Typography>
        <Button 
          variant="outlined" 
          onClick={loadDashboardData}
          disabled={loading}
          startIcon={<Refresh />}
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

      {/* Summary Cards */}
      <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
          <Card sx={{ bgcolor: 'error.50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="error.main">
                    {summaryStats.overdueTasks}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Overdue Tasks
                  </Typography>
                </Box>
                <Warning sx={{ fontSize: 48, color: 'error.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Box>
        
        <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
          <Card sx={{ bgcolor: 'warning.50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="warning.main">
                    {summaryStats.dueTodayTasks}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Due Today
                  </Typography>
                </Box>
                <Schedule sx={{ fontSize: 48, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Box>
        
        <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
          <Card sx={{ bgcolor: 'info.50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="info.main">
                    {summaryStats.urgentTasks}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Urgent Tasks
                  </Typography>
                </Box>
                <Assignment sx={{ fontSize: 48, color: 'info.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Box>
        
        <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
          <Card sx={{ bgcolor: 'success.50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    {summaryStats.availableDesigners}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Available Designers
                  </Typography>
                </Box>
                <Person sx={{ fontSize: 48, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* Today's Priorities */}
        <Box sx={{ flex: '2 1 600px' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Assignment />
                Today's Priorities
                <Badge badgeContent={summaryStats.totalPriorities} color="primary" />
              </Typography>
              
              {todaysPriorities.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                  <Typography variant="h6" color="success.main">
                    All caught up!
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    No urgent tasks for today
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Order</TableCell>
                        <TableCell>Customer</TableCell>
                        <TableCell>Item</TableCell>
                        <TableCell>Priority</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Due Date</TableCell>
                        <TableCell>Designer</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {todaysPriorities.map((priority) => (
                        <TableRow 
                          key={priority.assignment_id}
                          sx={{
                            bgcolor: priority.urgency_status === 'overdue' ? 'error.50' : 
                                   priority.urgency_status === 'due_today' ? 'warning.50' : 'inherit'
                          }}
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {priority.order_number}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {priority.customer_name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {priority.material_type}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Qty: {priority.quantity}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={priority.priority_level.toUpperCase()}
                              color={getPriorityColor(priority.priority_level) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={priority.status.replace('_', ' ').toUpperCase()}
                              color={getStatusColor(priority.status) as any}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2">
                                {new Date(priority.expected_delivery_date).toLocaleDateString()}
                              </Typography>
                              <Chip
                                label={
                                  priority.urgency_status === 'overdue' ? `${Math.abs(priority.days_until_due)} days overdue` :
                                  priority.urgency_status === 'due_today' ? 'Due Today' :
                                  priority.urgency_status === 'due_tomorrow' ? 'Due Tomorrow' :
                                  `${priority.days_until_due} days left`
                                }
                                color={getUrgencyColor(priority.urgency_status) as any}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {priority.designer_name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => handleStatusUpdate(priority)}
                              title="Update Status"
                              color="primary"
                            >
                              <Edit />
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
        </Box>

        {/* Designer Workload */}
        <Box sx={{ flex: '1 1 400px' }}>
          <Card sx={{ height: 'fit-content' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUp />
                Designer Workload
              </Typography>
              
              {designerWorkloads.map((designer) => (
                <Box key={designer.designer_id} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" fontWeight="medium">
                      {designer.designer_name || designer.designer_email}
                    </Typography>
                    <Chip
                      label={`${designer.pending_hours}h`}
                      color={designer.pending_hours > 30 ? 'error' : designer.pending_hours > 20 ? 'warning' : 'success'}
                      size="small"
                    />
                  </Box>
                  
                  <LinearProgress
                    variant="determinate"
                    value={Math.min((designer.pending_hours / 40) * 100, 100)}
                    color={designer.pending_hours > 30 ? 'error' : designer.pending_hours > 20 ? 'warning' : 'success'}
                    sx={{ mb: 1, height: 6, borderRadius: 3 }}
                  />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Typography variant="caption">
                        Active: {designer.active_assignments}
                      </Typography>
                      <Typography variant="caption">
                        Pending: {designer.pending_assignments}
                      </Typography>
                      {designer.overdue_assignments > 0 && (
                        <Typography variant="caption" color="error">
                          Overdue: {designer.overdue_assignments}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Box>

        {/* Overdue Items - Full Width */}
        {overdueAssignments.length > 0 && (
          <Box sx={{ width: '100%' }}>
            <Card sx={{ bgcolor: 'error.50' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
                  <Warning />
                  Overdue Items ({overdueAssignments.length})
                </Typography>
                
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Order</TableCell>
                        <TableCell>Customer</TableCell>
                        <TableCell>Designer</TableCell>
                        <TableCell>Item</TableCell>
                        <TableCell>Priority</TableCell>
                        <TableCell>Days Overdue</TableCell>
                        <TableCell>Est. Hours</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {overdueAssignments.map((item) => (
                        <TableRow key={item.assignment_id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {item.order_number}
                            </Typography>
                          </TableCell>
                          <TableCell>{item.customer_name}</TableCell>
                          <TableCell>{item.designer_name}</TableCell>
                          <TableCell>{item.material_type}</TableCell>
                          <TableCell>
                            <Chip
                              label={item.priority_level.toUpperCase()}
                              color={getPriorityColor(item.priority_level) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="error" fontWeight="bold">
                              {item.days_overdue} days
                            </Typography>
                          </TableCell>
                          <TableCell>{item.estimated_hours}h</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>

      {/* Status Update Dialog */}
      <Dialog open={statusUpdateDialogOpen} onClose={() => setStatusUpdateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Edit />
            <Typography variant="h6">Update Assignment Status</Typography>
          </Box>
        </DialogTitle>
        <form onSubmit={handleSubmit(onStatusSubmit)}>
          <DialogContent>
            {selectedAssignment && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Alert severity="info">
                  Updating status for: {selectedAssignment.order_number} - {selectedAssignment.material_type}
                </Alert>

                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.status}>
                      <InputLabel>Status</InputLabel>
                      <Select {...field} label="Status">
                        <MenuItem value="assigned">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Assignment />
                            Assigned
                          </Box>
                        </MenuItem>
                        <MenuItem value="in_progress">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PlayArrow />
                            In Progress
                          </Box>
                        </MenuItem>
                        <MenuItem value="on_hold">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Pause />
                            On Hold
                          </Box>
                        </MenuItem>
                        <MenuItem value="completed">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CheckCircle />
                            Completed
                          </Box>
                        </MenuItem>
                      </Select>
                      {errors.status && (
                        <Typography variant="caption" color="error">
                          {errors.status.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />

                <Controller
                  name="reason"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Reason for Change (Optional)"
                      multiline
                      rows={3}
                      placeholder="Add notes about the status change..."
                    />
                  )}
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setStatusUpdateDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default DesignerDashboard;