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
  InputAdornment,
  Paper,
} from '@mui/material';
import {
  Assignment,
  CheckCircle,
  PlayArrow,
  Pause,
  Edit,
  Refresh,
  Search,
  Timer,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { designerApi } from '../services/supabaseApi';
import { componentLogger } from '../utils/debug';
import { useAuth } from '../context/AuthContext';

// Types
interface MyAssignment {
  assignment_id: string;
  order_item_id: string;
  order_number: string;
  customer_name: string;
  material_type: string;
  quantity: number;
  priority_level: string;
  status: string;
  expected_delivery_date: string;
  estimated_hours: number;
  designer_name: string;
  design_name?: string;
  urgency_status: string;
  days_until_due: number;
  assignment_notes?: string;
  actual_hours_logged?: number;
  time_tracking_status?: 'not_started' | 'in_progress' | 'paused' | 'completed';
}

// Form validation schema
const statusUpdateSchema = yup.object({
  status: yup.string().required('Status is required'),
  reason: yup.string(),
});

const timeTrackingSchema = yup.object({
  hours: yup.number().min(0.1, 'Must log at least 0.1 hours').required('Hours is required'),
  notes: yup.string(),
});

const MyAssignments: React.FC = () => {
  const { state } = useAuth();
  const user = state.user;
  const [assignments, setAssignments] = useState<MyAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusUpdateDialogOpen, setStatusUpdateDialogOpen] = useState(false);
  const [timeTrackingDialogOpen, setTimeTrackingDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<MyAssignment | null>(null);

  // Status update form
  const { control: statusControl, handleSubmit: handleStatusSubmit, reset: statusReset, formState: { errors: statusErrors, isSubmitting: isStatusSubmitting } } = useForm({
    resolver: yupResolver(statusUpdateSchema),
    defaultValues: {
      status: '',
      reason: '',
    },
  });

  // Time tracking form
  const { control: timeControl, handleSubmit: handleTimeSubmit, reset: timeReset, formState: { errors: timeErrors, isSubmitting: isTimeSubmitting } } = useForm({
    resolver: yupResolver(timeTrackingSchema),
    defaultValues: {
      hours: 0,
      notes: '',
    },
  });

  // Load user's assignments
  const loadMyAssignments = useCallback(async () => {
    if (!user) return;
    
    componentLogger.info('Loading user assignments...');
    try {
      setLoading(true);
      
      // Get all assignments and filter for current user
      const allAssignments = await designerApi.getAllAssignments();
      const userEmail = user?.email;
      const myAssignments = allAssignments.filter(assignment => 
        assignment.designer_name === userEmail
      );
      
      setAssignments(myAssignments);
      
      componentLogger.info('User assignments loaded successfully', { 
        count: myAssignments.length,
        userEmail
      });
    } catch (error: any) {
      componentLogger.error('Failed to load user assignments', error);
      setError('Failed to load assignments: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadMyAssignments();
  }, [loadMyAssignments]);

  // Clear alerts
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
  const handleStatusUpdate = (assignment: MyAssignment) => {
    setSelectedAssignment(assignment);
    statusReset({
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
      loadMyAssignments();
    } catch (error: any) {
      setError('Failed to update assignment status: ' + error.message);
    }
  };

  // Handle time tracking
  const handleTimeTracking = (assignment: MyAssignment) => {
    setSelectedAssignment(assignment);
    timeReset({
      hours: 0,
      notes: '',
    });
    setTimeTrackingDialogOpen(true);
  };

  const onTimeSubmit = async (data: any) => {
    if (!selectedAssignment) return;

    try {
      await designerApi.logTime(selectedAssignment.assignment_id, data.hours, data.notes);
      
      setSuccess(`Time logged successfully: ${data.hours} hours`);
      setTimeTrackingDialogOpen(false);
      setSelectedAssignment(null);
      loadMyAssignments();
    } catch (error: any) {
      setError('Failed to log time: ' + error.message);
    }
  };

  // Filter assignments
  const filteredAssignments = assignments.filter((assignment) => {
    const matchesSearch = 
      assignment.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.material_type?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || assignment.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || assignment.priority_level === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'default';
      case 'in_progress': return 'primary';
      case 'completed': return 'success';
      case 'on_hold': return 'warning';
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

  // Calculate summary stats
  const summaryStats = {
    totalAssignments: assignments.length,
    inProgress: assignments.filter(a => a.status === 'in_progress').length,
    completed: assignments.filter(a => a.status === 'completed').length,
    overdue: assignments.filter(a => a.urgency_status === 'overdue').length,
    dueToday: assignments.filter(a => a.urgency_status === 'due_today').length,
    totalHours: assignments.reduce((sum, a) => sum + (a.estimated_hours || 0), 0),
    completedHours: assignments.filter(a => a.status === 'completed').reduce((sum, a) => sum + (a.estimated_hours || 0), 0),
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
          <Assignment />
          My Design Assignments
        </Typography>
        <Button 
          variant="outlined" 
          onClick={loadMyAssignments}
          disabled={loading}
          startIcon={<Refresh />}
        >
          Refresh
        </Button>
      </Box>

      {/* Welcome Message */}
      <Alert severity="info" sx={{ mb: 3 }}>
        Welcome back, <strong>{user?.email}</strong>! 
        You have {summaryStats.totalAssignments} assignments. 
        {summaryStats.overdue > 0 && ` ${summaryStats.overdue} are overdue.`}
        {summaryStats.dueToday > 0 && ` ${summaryStats.dueToday} are due today.`}
      </Alert>

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
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
        <Box sx={{ flex: '1 1 160px', minWidth: 160 }}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.50' }}>
            <Typography variant="h4" fontWeight="bold" color="primary.main">
              {summaryStats.totalAssignments}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Assignments
            </Typography>
          </Paper>
        </Box>
        <Box sx={{ flex: '1 1 160px', minWidth: 160 }}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.50' }}>
            <Typography variant="h4" fontWeight="bold" color="info.main">
              {summaryStats.inProgress}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              In Progress
            </Typography>
          </Paper>
        </Box>
        <Box sx={{ flex: '1 1 160px', minWidth: 160 }}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.50' }}>
            <Typography variant="h4" fontWeight="bold" color="success.main">
              {summaryStats.completed}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Completed
            </Typography>
          </Paper>
        </Box>
        <Box sx={{ flex: '1 1 160px', minWidth: 160 }}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.50' }}>
            <Typography variant="h4" fontWeight="bold" color="error.main">
              {summaryStats.overdue}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Overdue
            </Typography>
          </Paper>
        </Box>
        <Box sx={{ flex: '1 1 160px', minWidth: 160 }}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.50' }}>
            <Typography variant="h4" fontWeight="bold" color="warning.main">
              {summaryStats.dueToday}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Due Today
            </Typography>
          </Paper>
        </Box>
        <Box sx={{ flex: '1 1 160px', minWidth: 160 }}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.100' }}>
            <Typography variant="h4" fontWeight="bold">
              {summaryStats.totalHours}h
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Hours
            </Typography>
          </Paper>
        </Box>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '2 1 250px', minWidth: 250 }}>
              <TextField
                fullWidth
                placeholder="Search by order, customer, or material..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            <Box sx={{ flex: '1 1 150px', minWidth: 150 }}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="all">All Statuses</MenuItem>
                  <MenuItem value="assigned">Assigned</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="on_hold">On Hold</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: '1 1 150px', minWidth: 150 }}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  label="Priority"
                >
                  <MenuItem value="all">All Priorities</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: '1 1 120px', minWidth: 120 }}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setPriorityFilter('all');
                }}
                sx={{ height: '56px' }}
              >
                Clear Filters
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Assignments Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assignment />
            My Assignments ({filteredAssignments.length})
          </Typography>
          
          {filteredAssignments.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Assignment sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                {assignments.length === 0 ? 'No assignments yet' : 'No assignments match your filters'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {assignments.length === 0 ? 'New assignments will appear here when they are created' : 'Try adjusting your search or filters'}
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Order</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Item</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell>Hours</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAssignments.map((assignment) => (
                    <TableRow 
                      key={assignment.assignment_id}
                      sx={{
                        bgcolor: assignment.urgency_status === 'overdue' ? 'error.50' : 
                               assignment.urgency_status === 'due_today' ? 'warning.50' : 'inherit'
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {assignment.order_number}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {assignment.customer_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {assignment.material_type}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Qty: {assignment.quantity}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={assignment.priority_level.toUpperCase()}
                          color={getPriorityColor(assignment.priority_level) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={assignment.status.replace('_', ' ').toUpperCase()}
                          color={getStatusColor(assignment.status) as any}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(assignment.expected_delivery_date).toLocaleDateString()}
                        </Typography>
                        <Chip
                          label={
                            assignment.urgency_status === 'overdue' ? `${Math.abs(assignment.days_until_due)} days overdue` :
                            assignment.urgency_status === 'due_today' ? 'Due Today' :
                            assignment.urgency_status === 'due_tomorrow' ? 'Due Tomorrow' :
                            `${assignment.days_until_due} days left`
                          }
                          color={getUrgencyColor(assignment.urgency_status) as any}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {assignment.estimated_hours}h est.
                        </Typography>
                        {assignment.actual_hours_logged && (
                          <Typography variant="caption" color="text.secondary">
                            {assignment.actual_hours_logged}h logged
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleStatusUpdate(assignment)}
                            title="Update Status"
                            color="primary"
                          >
                            <Edit />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleTimeTracking(assignment)}
                            title="Log Time"
                            color="secondary"
                          >
                            <Timer />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Status Update Dialog */}
      <Dialog open={statusUpdateDialogOpen} onClose={() => setStatusUpdateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Edit />
            <Typography variant="h6">Update Assignment Status</Typography>
          </Box>
        </DialogTitle>
        <form onSubmit={handleStatusSubmit(onStatusSubmit)}>
          <DialogContent>
            {selectedAssignment && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Alert severity="info">
                  Updating status for: {selectedAssignment.order_number} - {selectedAssignment.material_type}
                </Alert>

                <Controller
                  name="status"
                  control={statusControl}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!statusErrors.status}>
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
                      {statusErrors.status && (
                        <Typography variant="caption" color="error">
                          {statusErrors.status.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />

                <Controller
                  name="reason"
                  control={statusControl}
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
            <Button type="submit" variant="contained" disabled={isStatusSubmitting}>
              {isStatusSubmitting ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Time Tracking Dialog */}
      <Dialog open={timeTrackingDialogOpen} onClose={() => setTimeTrackingDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Timer />
            <Typography variant="h6">Log Time</Typography>
          </Box>
        </DialogTitle>
        <form onSubmit={handleTimeSubmit(onTimeSubmit)}>
          <DialogContent>
            {selectedAssignment && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Alert severity="info">
                  Logging time for: {selectedAssignment.order_number} - {selectedAssignment.material_type}
                  <br />
                  Estimated: {selectedAssignment.estimated_hours}h
                </Alert>

                <Controller
                  name="hours"
                  control={timeControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="number"
                      label="Hours Worked"
                      inputProps={{ min: 0.1, step: 0.1 }}
                      error={!!timeErrors.hours}
                      helperText={timeErrors.hours?.message || "Enter the hours you worked on this assignment"}
                    />
                  )}
                />

                <Controller
                  name="notes"
                  control={timeControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Work Notes (Optional)"
                      multiline
                      rows={3}
                      placeholder="Describe what you worked on..."
                    />
                  )}
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTimeTrackingDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isTimeSubmitting}>
              {isTimeSubmitting ? 'Logging Time...' : 'Log Time'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default MyAssignments;