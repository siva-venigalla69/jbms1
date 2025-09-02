// Workflow Management - End-to-End Business Process Management
// Provides unified interface for managing complete business workflows

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  AccountTree,
  PlayArrow,
  CheckCircle,
  Schedule,
  LocalShipping,
  Receipt,
  Payment,
  Visibility,
  Edit,
  Warning,
  Info,
} from '@mui/icons-material';
import { workflowApi } from '../services/workflowApi';
import { componentLogger } from '../utils/debug';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface WorkflowStep {
  label: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  optional?: boolean;
}

const WorkflowManagement: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [deliveryDialog, setDeliveryDialog] = useState(false);
  const [invoiceDialog, setInvoiceDialog] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState(false);
  
  // Workflow data
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [readyForDelivery, setReadyForDelivery] = useState<any[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<any[]>([]);
  const [completedWorkflows, setCompletedWorkflows] = useState<any[]>([]);
  
  // Selected items for workflow actions
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedChallan, setSelectedChallan] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const loadWorkflowData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [
        ordersData,
        deliveryData,
        invoicesData
      ] = await Promise.allSettled([
        workflowApi.orders.getOrdersRequiringAttention(),
        workflowApi.delivery.getItemsReadyForDelivery(),
        workflowApi.invoicing.getOutstandingInvoices()
      ]);

      if (ordersData.status === 'fulfilled') {
        setPendingOrders(ordersData.value || []);
      }

      if (deliveryData.status === 'fulfilled') {
        setReadyForDelivery(deliveryData.value || []);
      }

      if (invoicesData.status === 'fulfilled') {
        setPendingInvoices(invoicesData.value || []);
      }

      componentLogger.info('Workflow data loaded', {
        orders: ordersData.status === 'fulfilled',
        delivery: deliveryData.status === 'fulfilled',
        invoices: invoicesData.status === 'fulfilled'
      });

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load workflow data';
      setError(errorMessage);
      componentLogger.error('Workflow loading error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkflowData();
  }, [loadWorkflowData]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getOrderWorkflowSteps = (order: any): WorkflowStep[] => {
    return [
      {
        label: 'Order Created',
        description: 'Order received from customer',
        status: 'completed'
      },
      {
        label: 'Design Approval',
        description: 'Customer design approval pending',
        status: order.design_status === 'design_ready' ? 'completed' : 'pending'
      },
      {
        label: 'Production',
        description: 'Manufacturing process',
        status: order.production_status === 'post_process' ? 'completed' : 
                order.production_status === 'printing' ? 'in_progress' : 'pending'
      },
      {
        label: 'Quality Check',
        description: 'Quality assurance',
        status: order.production_status === 'post_process' ? 'completed' : 'pending'
      },
      {
        label: 'Delivery',
        description: 'Deliver to customer',
        status: 'pending'
      },
      {
        label: 'Invoice',
        description: 'Generate and send invoice',
        status: 'pending'
      },
      {
        label: 'Payment',
        description: 'Receive payment from customer',
        status: 'pending'
      }
    ];
  };

  const renderWorkflowStepper = (steps: WorkflowStep[]) => {
    const activeStep = steps.findIndex(step => step.status === 'in_progress' || step.status === 'pending');
    
    return (
      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((step, index) => (
          <Step key={step.label}>
            <StepLabel
              optional={step.optional && <Typography variant="caption">Optional</Typography>}
              error={step.status === 'error'}
            >
              <Box display="flex" alignItems="center" gap={1}>
                {step.status === 'completed' && <CheckCircle color="success" fontSize="small" />}
                {step.status === 'in_progress' && <Schedule color="primary" fontSize="small" />}
                {step.status === 'error' && <Warning color="error" fontSize="small" />}
                {step.label}
              </Box>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="textSecondary">
                {step.description}
              </Typography>
            </StepContent>
          </Step>
        ))}
      </Stepper>
    );
  };

  const handleOrderToDelivery = async (orderId: string) => {
    try {
      setLoading(true);
      const result = await workflowApi.endToEnd.processOrderToDelivery(orderId);
      setSelectedOrder(result);
      setDeliveryDialog(true);
    } catch (err: any) {
      setError(err.message || 'Failed to process order to delivery');
    } finally {
      setLoading(false);
    }
  };

  const handleDeliveryToInvoice = async (challanId: string) => {
    try {
      setLoading(true);
      const result = await workflowApi.endToEnd.processDeliveryToInvoice(challanId);
      setSelectedChallan(result);
      setInvoiceDialog(true);
    } catch (err: any) {
      setError(err.message || 'Failed to process delivery to invoice');
    } finally {
      setLoading(false);
    }
  };

  const renderOrderWorkflows = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Orders Requiring Attention ({pendingOrders.length})
      </Typography>
      
      <Grid container spacing={2}>
        {pendingOrders.map((order, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Card elevation={2}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {order.order_number}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {order.customer?.name}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<PlayArrow />}
                    onClick={() => handleOrderToDelivery(order.id)}
                    disabled={loading}
                  >
                    Process
                  </Button>
                </Box>
                
                {renderWorkflowStepper(getOrderWorkflowSteps(order))}
                
                <Box mt={2}>
                  <Chip
                    label={`${order.items_count || 0} items`}
                    color="primary"
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  <Chip
                    label={`₹${order.total_amount?.toLocaleString() || '0'}`}
                    color="success"
                    size="small"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {pendingOrders.length === 0 && !loading && (
        <Alert severity="info" sx={{ mt: 2 }}>
          No orders requiring immediate attention
        </Alert>
      )}
    </Box>
  );

  const renderDeliveryWorkflows = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Items Ready for Delivery ({readyForDelivery.length})
      </Typography>
      
      <List>
        {readyForDelivery.map((item, index) => (
          <ListItem
            key={index}
            secondaryAction={
              <Button
                variant="contained"
                size="small"
                startIcon={<LocalShipping />}
                onClick={() => handleOrderToDelivery(item.order_id)}
                disabled={loading}
              >
                Create Delivery
              </Button>
            }
          >
            <ListItemIcon>
              <CheckCircle color="success" />
            </ListItemIcon>
            <ListItemText
              primary={`${item.material_type} (Qty: ${item.quantity})`}
              secondary={`${item.customer_name} - Order: ${item.order_number}`}
            />
          </ListItem>
        ))}
      </List>

      {readyForDelivery.length === 0 && !loading && (
        <Alert severity="info" sx={{ mt: 2 }}>
          No items ready for delivery
        </Alert>
      )}
    </Box>
  );

  const renderInvoiceWorkflows = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Outstanding Invoices ({pendingInvoices.length})
      </Typography>
      
      <List>
        {pendingInvoices.map((invoice, index) => (
          <ListItem
            key={index}
            secondaryAction={
              <Button
                variant="outlined"
                size="small"
                startIcon={<Payment />}
                onClick={() => {
                  setSelectedCustomer(invoice);
                  setPaymentDialog(true);
                }}
              >
                Record Payment
              </Button>
            }
          >
            <ListItemIcon>
              <Receipt color="warning" />
            </ListItemIcon>
            <ListItemText
              primary={`Invoice: ${invoice.invoice_number}`}
              secondary={`${invoice.customer?.name} - ₹${invoice.outstanding_amount?.toLocaleString()} outstanding`}
            />
            <Chip
              label={invoice.status}
              color={invoice.status === 'overdue' ? 'error' : 'warning'}
              size="small"
              sx={{ mr: 2 }}
            />
          </ListItem>
        ))}
      </List>

      {pendingInvoices.length === 0 && !loading && (
        <Alert severity="success" sx={{ mt: 2 }}>
          All invoices are paid!
        </Alert>
      )}
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccountTree color="primary" />
          Workflow Management
        </Typography>
        <Button
          variant="outlined"
          startIcon={loading ? <CircularProgress size={16} /> : <PlayArrow />}
          onClick={loadWorkflowData}
          disabled={loading}
        >
          Refresh Workflows
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab 
              label={`Orders (${pendingOrders.length})`}
              icon={<Schedule />} 
              iconPosition="start"
            />
            <Tab 
              label={`Delivery (${readyForDelivery.length})`}
              icon={<LocalShipping />} 
              iconPosition="start"
            />
            <Tab 
              label={`Invoices (${pendingInvoices.length})`}
              icon={<Receipt />} 
              iconPosition="start"
            />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {renderOrderWorkflows()}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {renderDeliveryWorkflows()}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {renderInvoiceWorkflows()}
        </TabPanel>
      </Card>

      {/* Delivery Creation Dialog */}
      <Dialog open={deliveryDialog} onClose={() => setDeliveryDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Delivery Challan</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Order: {selectedOrder.order?.order_number}
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Customer: {selectedOrder.order?.customer?.name}
              </Typography>
              
              <Typography variant="subtitle2" gutterBottom>
                Items Ready for Delivery:
              </Typography>
              <List dense>
                {selectedOrder.readyItems?.map((item: any, index: number) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={`${item.material_type} - Qty: ${item.quantity}`}
                      secondary={`Ready for ${item.days_ready} days`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeliveryDialog(false)}>Cancel</Button>
          <Button variant="contained" startIcon={<LocalShipping />}>
            Create Delivery Challan
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invoice Generation Dialog */}
      <Dialog open={invoiceDialog} onClose={() => setInvoiceDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Generate Invoice</DialogTitle>
        <DialogContent>
          {selectedChallan && (
            <Box>
              <Typography variant="body1" paragraph>
                Invoice generated successfully from delivery challan.
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Challan: {selectedChallan.challan?.challan_number}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Invoice: {selectedChallan.invoice?.invoice_number}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInvoiceDialog(false)}>Close</Button>
          <Button variant="contained" startIcon={<Visibility />}>
            View Invoice
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Recording Dialog */}
      <Dialog open={paymentDialog} onClose={() => setPaymentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Payment Amount"
              type="number"
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Payment Method</InputLabel>
              <Select label="Payment Method">
                <MenuItem value="CASH">Cash</MenuItem>
                <MenuItem value="CHEQUE">Cheque</MenuItem>
                <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
                <MenuItem value="UPI">UPI</MenuItem>
                <MenuItem value="CARD">Card</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Reference Number"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Notes"
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialog(false)}>Cancel</Button>
          <Button variant="contained" startIcon={<Payment />}>
            Record Payment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkflowManagement;