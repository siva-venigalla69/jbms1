import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,  Table,
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
  Avatar,
  Badge,
  Tooltip,
  Divider,
  InputAdornment,
} from '@mui/material';
import {
  Person,
  Assignment,
  TrendingUp,
  Warning,
  SwapHoriz,
  Refresh,
  Search,
  DateRange,
  Clear,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { designerApi } from '../services/supabaseApi';
import { componentLogger } from '../utils/debug';

// Types
interface DesignerWorkloadData {
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

interface AssignmentData {
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
}

// Form validation schemas
const reassignSchema = yup.object({
  new_designer_id: yup.string().required('Designer is required'),
  reason: yup.string().required('Reason is required'),
});

const bulkAssignSchema = yup.object({
  designer_id: yup.string().required('Designer is required'),
  assignment_ids: yup.array().min(1, 'Select at least one assignment'),
});

const DesignerWorkload: React.FC = () => {
  // State
  const [designerWorkloads, setDesignerWorkloads] = useState<DesignerWorkloadData[]>([]);
  const [assignments, setAssignments] = useState<AssignmentData[]>([]);
  const [selectedDesigner, setSelectedDesigner] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [bulkAssignDialogOpen, setBulkAssignDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentData | null>(null);
  const [selectedAssignments, setSelectedAssignments] = useState<string[]>([]);
  
  // Advanced filtering state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Forms
  const reassignForm = useForm({
    resolver: yupResolver(reassignSchema),
    defaultValues: {
      new_designer_id: '',
      reason: '',
    },
  });

  const bulkForm = useForm({
    resolver: yupResolver(bulkAssignSchema),
    defaultValues: {
      designer_id: '',
      assignment_ids: [],
    },
  });

  // Load data
  const loadWorkloadData = useCallback(async () => {
    componentLogger.info('Loading workload data...');
    try {
      setLoading(true);
      
      const [workloads, allAssignments] = await Promise.all([
        designerApi.getDesignerWorkloads(),
        designerApi.getAllAssignments(),
      ]);

      setDesignerWorkloads(workloads);
      setAssignments(allAssignments);
      
      componentLogger.info('Workload data loaded successfully', { 
        workloads: workloads.length,
        assignments: allAssignments.length
      });
    } catch (error: any) {
      componentLogger.error('Failed to load workload data', error);
      setError('Failed to load workload data: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkloadData();
  }, [loadWorkloadData]);

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

  // Handle reassignment
  const handleReassign = (assignment: AssignmentData) => {
    setSelectedAssignment(assignment);
    reassignForm.reset({
      new_designer_id: '',
      reason: '',
    });
    setReassignDialogOpen(true);
  };

  const onReassignSubmit = async (data: any) => {
    if (!selectedAssignment) return;

    try {
      await designerApi.reassignDesigner(
        selectedAssignment.assignment_id,
        data.new_designer_id,
        data.reason
      );
      
      setSuccess('Assignment reassigned successfully');
      setReassignDialogOpen(false);
      setSelectedAssignment(null);
      loadWorkloadData();
    } catch (error: any) {
      setError('Failed to reassign: ' + error.message);
    }
  };

  // Handle bulk assignment
  const handleBulkAssign = () => {
    if (selectedAssignments.length === 0) {
      setError('Please select assignments first');
      return;
    }
    bulkForm.reset({
      designer_id: '',
      assignment_ids: selectedAssignments,
    });
    setBulkAssignDialogOpen(true);
  };

  const onBulkAssignSubmit = async (data: any) => {
    try {
      await designerApi.bulkReassign(data.assignment_ids, data.designer_id);
      
      setSuccess(`${data.assignment_ids.length} assignments reassigned successfully`);
      setBulkAssignDialogOpen(false);
      setSelectedAssignments([]);
      loadWorkloadData();
    } catch (error: any) {
      setError('Failed to bulk reassign: ' + error.message);
    }
  };

  // Selection handlers
  const handleSelectAssignment = (assignmentId: string) => {
    setSelectedAssignments(prev => 
      prev.includes(assignmentId)
        ? prev.filter(id => id !== assignmentId)
        : [...prev, assignmentId]
    );
  };

  const handleSelectAllAssignments = () => {
    const filteredAssignments = getFilteredAssignments();
    const allIds = filteredAssignments.map(a => a.assignment_id);
    setSelectedAssignments(
      selectedAssignments.length === allIds.length ? [] : allIds
    );
  };

  // Helper functions
  const getFilteredAssignments = () => {
    let filtered = selectedDesigner 
      ? assignments.filter(a => 
          designerWorkloads.find(d => d.designer_id === selectedDesigner)?.designer_email === 
          designerWorkloads.find(d => d.designer_name === a.designer_name)?.designer_email
        )
      : assignments;

    // Apply advanced filters
    filtered = filtered.filter(assignment => {
      // Search filter
      const matchesSearch = !searchTerm || 
        assignment.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assignment.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assignment.material_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assignment.designer_name?.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === 'all' || assignment.status === statusFilter;

      // Priority filter
      const matchesPriority = priorityFilter === 'all' || assignment.priority_level === priorityFilter;

      // Urgency filter
      const matchesUrgency = urgencyFilter === 'all' || assignment.urgency_status === urgencyFilter;

      // Date range filter
      const assignmentDate = new Date(assignment.expected_delivery_date);
      const matchesFromDate = !fromDate || assignmentDate >= new Date(fromDate);
      const matchesToDate = !toDate || assignmentDate <= new Date(toDate + 'T23:59:59');

      return matchesSearch && matchesStatus && matchesPriority && matchesUrgency && matchesFromDate && matchesToDate;
    });

    return filtered;
  };

  const getWorkloadColor = (hours: number) => {
    if (hours > 35) return 'error';
    if (hours > 25) return 'warning';
    if (hours > 15) return 'info';
    return 'success';
  };

  const getWorkloadPercentage = (hours: number) => {
    return Math.min((hours / 40) * 100, 100);
  };

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

  const filteredAssignments = getFilteredAssignments();

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
          <TrendingUp />
          Designer Workload Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {selectedAssignments.length > 0 && (
            <Button
              variant="contained"
              color="secondary"
              onClick={handleBulkAssign}
              startIcon={<SwapHoriz />}
            >
              Bulk Reassign ({selectedAssignments.length})
            </Button>
          )}
          <Button 
            variant="outlined" 
            onClick={loadWorkloadData}
            disabled={loading}
            startIcon={<Refresh />}
          >
            Refresh
          </Button>
        </Box>
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

      <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        {/* Designer Workload Cards */}
        <Box sx={{ flex: "1 1 400px" }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Designer Workloads</Typography>
          
          {designerWorkloads.map((designer) => (
            <Card 
              key={designer.designer_id} 
              sx={{ 
                mb: 2, 
                cursor: 'pointer',
                border: selectedDesigner === designer.designer_id ? 2 : 0,
                borderColor: 'primary.main',
                '&:hover': { elevation: 4 }
              }}
              onClick={() => setSelectedDesigner(
                selectedDesigner === designer.designer_id ? '' : designer.designer_id
              )}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar sx={{ bgcolor: getWorkloadColor(designer.pending_hours) + '.main' }}>
                    <Person />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" noWrap>
                      {designer.designer_name || designer.designer_email}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {designer.pending_hours}h pending work
                    </Typography>
                  </Box>
                  <Badge
                    badgeContent={designer.overdue_assignments}
                    color="error"
                    invisible={designer.overdue_assignments === 0}
                  >
                    <Warning color={designer.overdue_assignments > 0 ? 'error' : 'disabled'} />
                  </Badge>
                </Box>

                {/* Workload Progress */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Capacity</Typography>
                    <Typography variant="body2">
                      {designer.pending_hours}/40h ({getWorkloadPercentage(designer.pending_hours).toFixed(0)}%)
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={getWorkloadPercentage(designer.pending_hours)}
                    color={getWorkloadColor(designer.pending_hours) as any}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>

                {/* Stats Grid */}
                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                  <Box sx={{ flex: "1 1 150px" }}>
                    <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'info.50', borderRadius: 1 }}>
                      <Typography variant="h6" color="info.main">
                        {designer.active_assignments}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Active
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ flex: "1 1 150px" }}>
                    <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'warning.50', borderRadius: 1 }}>
                      <Typography variant="h6" color="warning.main">
                        {designer.pending_assignments}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Pending
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ flex: "1 1 150px" }}>
                    <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'error.50', borderRadius: 1 }}>
                      <Typography variant="h6" color="error.main">
                        {designer.urgent_tasks}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Urgent
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ flex: "1 1 150px" }}>
                    <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'success.50', borderRadius: 1 }}>
                      <Typography variant="h6" color="success.main">
                        {designer.total_completed}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Completed
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Performance Metrics */}
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" fontWeight="bold">
                      {designer.avg_completion_hours?.toFixed(1) || 'N/A'}h
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Avg Time
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" fontWeight="bold">
                      {designer.total_completed > 0 
                        ? ((designer.on_time_deliveries / designer.total_completed) * 100).toFixed(0)
                        : 0}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      On Time
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* Assignments Table */}
        <Box sx={{ flex: "2 1 600px" }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Assignment />
                  {selectedDesigner ? 'Designer Assignments' : 'All Assignments'}
                  <Badge badgeContent={filteredAssignments.length} color="primary" />
                </Typography>
                
                {filteredAssignments.length > 0 && (
                  <Button
                    size="small"
                    onClick={handleSelectAllAssignments}
                    color="primary"
                  >
                    {selectedAssignments.length === filteredAssignments.length ? 'Deselect All' : 'Select All'}
                  </Button>
                )}
              </Box>

              {/* Advanced Filters */}
              <Card variant="outlined" sx={{ mb: 3, bgcolor: 'grey.50' }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Search />
                    Advanced Filters
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                    <Box sx={{ flex: '2 1 200px', minWidth: 200 }}>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Search assignments..."
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
                      <FormControl fullWidth size="small">
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
                      <FormControl fullWidth size="small">
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
                    
                    <Box sx={{ flex: '1 1 150px', minWidth: 150 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Urgency</InputLabel>
                        <Select
                          value={urgencyFilter}
                          onChange={(e) => setUrgencyFilter(e.target.value)}
                          label="Urgency"
                        >
                          <MenuItem value="all">All</MenuItem>
                          <MenuItem value="overdue">Overdue</MenuItem>
                          <MenuItem value="due_today">Due Today</MenuItem>
                          <MenuItem value="due_tomorrow">Due Tomorrow</MenuItem>
                          <MenuItem value="upcoming">Upcoming</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                    
                    <Box sx={{ flex: '1 1 140px', minWidth: 140 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="date"
                        label="From Date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <DateRange />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Box>
                    
                    <Box sx={{ flex: '1 1 140px', minWidth: 140 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="date"
                        label="To Date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <DateRange />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Box>
                  </Box>
                  
                  {(searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || urgencyFilter !== 'all' || fromDate || toDate) && (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'center', pt: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Clear />}
                        onClick={() => {
                          setSearchTerm('');
                          setStatusFilter('all');
                          setPriorityFilter('all');
                          setUrgencyFilter('all');
                          setFromDate('');
                          setToDate('');
                        }}
                      >
                        Clear All Filters
                      </Button>
                      <Typography variant="caption" color="text.secondary">
                        Showing {filteredAssignments.length} of {assignments.length} assignments
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>

              {filteredAssignments.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Assignment sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    {selectedDesigner ? 'No assignments for this designer' : 'No assignments found'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedDesigner ? 'This designer currently has no active assignments' : 'Create orders to see assignments here'}
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">Select</TableCell>
                        <TableCell>Order</TableCell>
                        <TableCell>Customer</TableCell>
                        <TableCell>Item</TableCell>
                        <TableCell>Priority</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Due Date</TableCell>
                        <TableCell>Designer</TableCell>
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
                          <TableCell padding="checkbox">
                            <input
                              type="checkbox"
                              checked={selectedAssignments.includes(assignment.assignment_id)}
                              onChange={() => handleSelectAssignment(assignment.assignment_id)}
                            />
                          </TableCell>
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
                            <Typography variant="caption" color={
                              assignment.urgency_status === 'overdue' ? 'error' :
                              assignment.urgency_status === 'due_today' ? 'warning' : 'text.secondary'
                            }>
                              {assignment.urgency_status === 'overdue' 
                                ? `${Math.abs(assignment.days_until_due)} days overdue`
                                : `${assignment.days_until_due} days left`
                              }
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {assignment.designer_name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {assignment.estimated_hours}h
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Tooltip title="Reassign Designer">
                              <IconButton
                                size="small"
                                onClick={() => handleReassign(assignment)}
                                color="primary"
                              >
                                <SwapHoriz />
                              </IconButton>
                            </Tooltip>
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
      </Box>

      {/* Reassign Dialog */}
      <Dialog open={reassignDialogOpen} onClose={() => setReassignDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <SwapHoriz />
            <Typography variant="h6">Reassign Designer</Typography>
          </Box>
        </DialogTitle>
        <form onSubmit={reassignForm.handleSubmit(onReassignSubmit)}>
          <DialogContent>
            {selectedAssignment && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Alert severity="info">
                  Reassigning: {selectedAssignment.order_number} - {selectedAssignment.material_type}
                  <br />
                  Current Designer: {selectedAssignment.designer_name}
                </Alert>

                <Controller
                  name="new_designer_id"
                  control={reassignForm.control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!reassignForm.formState.errors.new_designer_id}>
                      <InputLabel>New Designer</InputLabel>
                      <Select {...field} label="New Designer">
                        {designerWorkloads.map((designer) => (
                          <MenuItem key={designer.designer_id} value={designer.designer_id}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                              <Avatar sx={{ 
                                width: 32, 
                                height: 32, 
                                bgcolor: getWorkloadColor(designer.pending_hours) + '.main' 
                              }}>
                                <Person sx={{ fontSize: 18 }} />
                              </Avatar>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2">
                                  {designer.designer_name || designer.designer_email}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {designer.pending_hours}h workload • {designer.pending_assignments} pending
                                </Typography>
                              </Box>
                              <Chip
                                label={designer.pending_hours > 30 ? 'Busy' : 'Available'}
                                color={getWorkloadColor(designer.pending_hours) as any}
                                size="small"
                              />
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                      {reassignForm.formState.errors.new_designer_id && (
                        <Typography variant="caption" color="error">
                          {reassignForm.formState.errors.new_designer_id.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />

                <Controller
                  name="reason"
                  control={reassignForm.control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Reason for Reassignment"
                      multiline
                      rows={3}
                      placeholder="Explain why this assignment is being reassigned..."
                      error={!!reassignForm.formState.errors.reason}
                      helperText={reassignForm.formState.errors.reason?.message}
                      required
                    />
                  )}
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReassignDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={reassignForm.formState.isSubmitting}>
              {reassignForm.formState.isSubmitting ? 'Reassigning...' : 'Reassign'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Bulk Assign Dialog */}
      <Dialog open={bulkAssignDialogOpen} onClose={() => setBulkAssignDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <SwapHoriz />
            <Typography variant="h6">Bulk Reassign ({selectedAssignments.length} assignments)</Typography>
          </Box>
        </DialogTitle>
        <form onSubmit={bulkForm.handleSubmit(onBulkAssignSubmit)}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Alert severity="info">
                You are reassigning {selectedAssignments.length} assignments to a new designer.
              </Alert>

              <Controller
                name="designer_id"
                control={bulkForm.control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!bulkForm.formState.errors.designer_id}>
                    <InputLabel>Assign to Designer</InputLabel>
                    <Select {...field} label="Assign to Designer">
                      {designerWorkloads.map((designer) => (
                        <MenuItem key={designer.designer_id} value={designer.designer_id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                            <Avatar sx={{ 
                              width: 32, 
                              height: 32, 
                              bgcolor: getWorkloadColor(designer.pending_hours) + '.main' 
                            }}>
                              <Person sx={{ fontSize: 18 }} />
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2">
                                {designer.designer_name || designer.designer_email}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Current: {designer.pending_hours}h • After: {designer.pending_hours + (selectedAssignments.length * 2)}h
                              </Typography>
                            </Box>
                            <Chip
                              label={designer.pending_hours > 30 ? 'Busy' : 'Available'}
                              color={getWorkloadColor(designer.pending_hours) as any}
                              size="small"
                            />
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                    {bulkForm.formState.errors.designer_id && (
                      <Typography variant="caption" color="error">
                        {bulkForm.formState.errors.designer_id.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBulkAssignDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={bulkForm.formState.isSubmitting}>
              {bulkForm.formState.isSubmitting ? 'Reassigning...' : `Reassign ${selectedAssignments.length} Items`}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default DesignerWorkload;