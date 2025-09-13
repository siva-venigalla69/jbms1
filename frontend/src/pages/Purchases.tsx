import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    InputAdornment,
    Alert,
    CircularProgress,
    Menu,
    MenuItem,
    Grid,
    FormControl,
    InputLabel,
    Select,
    Tabs,
    Tab,
    Divider,
} from '@mui/material';
import {
    Add,
    Search,
    Edit,
    Delete,
    MoreVert,
    ShoppingCart,
    Business,
    CalendarToday,
    AttachMoney,
    TrendingUp,
    PendingActions,
    CheckCircle,
    Cancel,
    LocalShipping,
    Warning,
    Receipt,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { 
    Purchase, 
    PurchaseWithVendor,
    CreatePurchaseRequest, 
    PurchaseDashboard,
    purchasesApi 
} from '../services/purchasesApi';
import { employeeApi } from '../services/employeeApi';

interface Employee {
    id: string;
    first_name: string;
    last_name: string;
    employee_code: string;
    department?: string;
    designation: string;
    employee_status: string;
}

const purchaseSchema: yup.ObjectSchema<CreatePurchaseRequest> = yup.object({
    vendor_id: yup.string().optional(),
    vendor_name: yup.string().optional(),
    vendor_contact: yup.string().optional(),
    vendor_gst: yup.string().optional(),
    vendor_address: yup.string().optional(),
    order_date: yup.string().optional(),
    expected_delivery_date: yup.string().optional(),
    purchase_type: yup.string().required('Purchase type is required'),
    category: yup.string().required('Category is required'),
    subcategory: yup.string().optional(),
    description: yup.string().required('Description is required'),
    quantity: yup.number().min(1, 'Quantity must be at least 1').required('Quantity is required'),
    unit_price: yup.number().min(0.01, 'Unit price must be greater than 0').required('Unit price is required'),
    tax_rate: yup.number().min(0, 'Tax rate must be positive').optional(),
    delivery_address: yup.string().optional(),
    requested_by: yup.string().optional(),
    payment_terms: yup.string().optional(),
    warranty_period: yup.number().min(0, 'Warranty period must be positive').optional(),
    notes: yup.string().optional(),
});

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
    return (
        <div role="tabpanel" hidden={value !== index}>
            {value === index && <Box>{children}</Box>}
        </div>
    );
}

const purchaseTypes = [
    'EQUIPMENT',
    'OFFICE_SUPPLIES',
    'SOFTWARE',
    'SERVICES',
    'MATERIALS',
    'INFRASTRUCTURE',
    'MAINTENANCE',
    'OTHER'
];

const categories = [
    'IT Equipment',
    'Office Furniture',
    'Stationery',
    'Software Licenses',
    'Professional Services',
    'Raw Materials',
    'Maintenance Services',
    'Utilities',
    'Marketing',
    'Other'
];

const Purchases: React.FC = () => {
    const [purchases, setPurchases] = useState<PurchaseWithVendor[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [dashboard, setDashboard] = useState<PurchaseDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [tabValue, setTabValue] = useState(0);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingPurchase, setEditingPurchase] = useState<PurchaseWithVendor | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedPurchase, setSelectedPurchase] = useState<PurchaseWithVendor | null>(null);

    const {
        control,
        handleSubmit,
        reset,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<CreatePurchaseRequest>({
        resolver: yupResolver(purchaseSchema),
        defaultValues: {
            vendor_id: '',
            vendor_name: '',
            vendor_contact: '',
            vendor_gst: '',
            vendor_address: '',
            order_date: new Date().toISOString().split('T')[0],
            expected_delivery_date: '',
            purchase_type: '',
            category: '',
            subcategory: '',
            description: '',
            quantity: 1,
            unit_price: 0,
            tax_rate: 18,
            delivery_address: '',
            requested_by: '',
            payment_terms: '',
            warranty_period: 0,
            notes: '',
        },
    });

    const watchedValues = watch();

    // Calculate derived values
    const subtotal = (watchedValues.quantity || 0) * (watchedValues.unit_price || 0);
    const taxAmount = subtotal * ((watchedValues.tax_rate || 0) / 100);
    const totalAmount = subtotal + taxAmount;

    // Load data
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [purchasesData, employeesData, dashboardData] = await Promise.all([
                purchasesApi.getPurchases(),
                employeeApi.getEmployees(),
                purchasesApi.getPurchaseDashboard()
            ]);
            setPurchases(purchasesData);
            setEmployees(employeesData.filter(emp => emp.employee_status === 'ACTIVE'));
            setDashboard(dashboardData);
        } catch (error: any) {
            setError('Failed to load purchases data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Clear messages after 5 seconds
    useEffect(() => {
        if (error || success) {
            const timer = setTimeout(() => {
                setError(null);
                setSuccess(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [error, success]);

    const handleCreatePurchase = () => {
        setEditingPurchase(null);
        reset({
            vendor_id: '',
            vendor_name: '',
            vendor_contact: '',
            vendor_gst: '',
            vendor_address: '',
            order_date: new Date().toISOString().split('T')[0],
            expected_delivery_date: '',
            purchase_type: '',
            category: '',
            subcategory: '',
            description: '',
            quantity: 1,
            unit_price: 0,
            tax_rate: 18,
            delivery_address: '',
            requested_by: '',
            payment_terms: '',
            warranty_period: 0,
            notes: '',
        });
        setDialogOpen(true);
    };

    const handleEditPurchase = (purchase: PurchaseWithVendor) => {
        setEditingPurchase(purchase);
        reset({
            vendor_id: purchase.vendor_id || '',
            vendor_name: purchase.vendor_name || '',
            vendor_contact: purchase.vendor_contact || '',
            vendor_gst: purchase.vendor_gst || '',
            vendor_address: purchase.vendor_address || '',
            order_date: purchase.order_date,
            expected_delivery_date: purchase.expected_delivery_date || '',
            purchase_type: purchase.purchase_type,
            category: purchase.category,
            subcategory: purchase.subcategory || '',
            description: purchase.description,
            quantity: purchase.quantity,
            unit_price: purchase.unit_price,
            tax_rate: purchase.tax_rate,
            delivery_address: purchase.delivery_address || '',
            requested_by: purchase.requested_by || '',
            payment_terms: purchase.payment_terms || '',
            warranty_period: purchase.warranty_period || 0,
            notes: purchase.notes || '',
        });
        setDialogOpen(true);
    };

    const handleDeletePurchase = async (purchase: PurchaseWithVendor) => {
        if (window.confirm(`Are you sure you want to delete purchase "${purchase.description}"?`)) {
            try {
                await purchasesApi.deletePurchase(purchase.id);
                setSuccess('Purchase deleted successfully');
                loadData();
            } catch (error: any) {
                setError('Failed to delete purchase');
            }
        }
    };

    const handleApprovePurchase = async (purchase: PurchaseWithVendor) => {
        const approver = prompt('Enter approver employee ID:');
        if (approver) {
            try {
                await purchasesApi.approvePurchase(purchase.id, approver);
                setSuccess('Purchase approved successfully');
                loadData();
            } catch (error: any) {
                setError('Failed to approve purchase');
            }
        }
    };

    const handleRejectPurchase = async (purchase: PurchaseWithVendor) => {
        const approver = prompt('Enter approver employee ID:');
        const reason = prompt('Please enter rejection reason:');
        if (approver && reason) {
            try {
                await purchasesApi.rejectPurchase(purchase.id, approver, reason);
                setSuccess('Purchase rejected successfully');
                loadData();
            } catch (error: any) {
                setError('Failed to reject purchase');
            }
        }
    };

    const handleMarkReceived = async (purchase: PurchaseWithVendor) => {
        const receiver = prompt('Enter receiver employee ID:');
        if (receiver) {
            try {
                await purchasesApi.markAsReceived(purchase.id, receiver);
                setSuccess('Purchase marked as received successfully');
                loadData();
            } catch (error: any) {
                setError('Failed to mark purchase as received');
            }
        }
    };

    const onSubmit = async (data: CreatePurchaseRequest) => {
        try {
            if (editingPurchase) {
                await purchasesApi.updatePurchase(editingPurchase.id, data);
                setSuccess('Purchase updated successfully');
            } else {
                await purchasesApi.createPurchase(data);
                setSuccess('Purchase created successfully');
            }
            setDialogOpen(false);
            loadData();
        } catch (error: any) {
            setError(error.response?.data?.detail || 'Failed to save purchase');
        }
    };

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, purchase: PurchaseWithVendor) => {
        setAnchorEl(event.currentTarget);
        setSelectedPurchase(purchase);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedPurchase(null);
    };

    const filteredPurchases = purchases.filter((purchase) => {
        const matchesSearch = 
            purchase.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            purchase.purchase_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            purchase.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            purchase.category.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = !statusFilter || purchase.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return 'success';
            case 'PENDING_APPROVAL':
                return 'warning';
            case 'CANCELLED':
                return 'error';
            case 'RECEIVED':
                return 'info';
            case 'ORDERED':
                return 'primary';
            case 'PARTIALLY_RECEIVED':
                return 'secondary';
            case 'DRAFT':
            default:
                return 'default';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return <CheckCircle />;
            case 'PENDING_APPROVAL':
                return <PendingActions />;
            case 'CANCELLED':
                return <Cancel />;
            case 'RECEIVED':
                return <LocalShipping />;
            case 'ORDERED':
                return <ShoppingCart />;
            case 'PARTIALLY_RECEIVED':
                return <LocalShipping />;
            case 'DRAFT':
            default:
                return <Receipt />;
        }
    };

    const getPaymentStatusColor = (status: string) => {
        switch (status) {
            case 'PAID':
                return 'success';
            case 'PARTIAL':
                return 'warning';
            case 'PENDING':
            default:
                return 'error';
        }
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" fontWeight="bold">
                    Purchase Management
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={handleCreatePurchase}
                    sx={{ px: 3 }}
                >
                    Add Purchase Order
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

            {/* Tabs */}
            <Card sx={{ mb: 3 }}>
                <Tabs
                    value={tabValue}
                    onChange={(_, newValue) => setTabValue(newValue)}
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label="Dashboard" icon={<TrendingUp />} />
                    <Tab label="Purchase Orders" icon={<ShoppingCart />} />
                </Tabs>

                <TabPanel value={tabValue} index={0}>
                    {/* Dashboard */}
                    <CardContent>
                        {dashboard && (
                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12, md: 3 }}>
                                    <Card variant="outlined">
                                        <CardContent>
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                <ShoppingCart sx={{ mr: 1, color: 'primary.main' }} />
                                                <Typography variant="subtitle2" color="text.secondary">
                                                    Total This Month
                                                </Typography>
                                            </Box>
                                            <Typography variant="h4" fontWeight="bold">
                                                ₹{dashboard.total_orders_this_month.toLocaleString()}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid size={{ xs: 12, md: 3 }}>
                                    <Card variant="outlined">
                                        <CardContent>
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                <PendingActions sx={{ mr: 1, color: 'warning.main' }} />
                                                <Typography variant="subtitle2" color="text.secondary">
                                                    Pending Approval
                                                </Typography>
                                            </Box>
                                            <Typography variant="h4" fontWeight="bold">
                                                {dashboard.pending_approval_count}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                ₹{dashboard.pending_approval_amount.toLocaleString()}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid size={{ xs: 12, md: 3 }}>
                                    <Card variant="outlined">
                                        <CardContent>
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                <LocalShipping sx={{ mr: 1, color: 'info.main' }} />
                                                <Typography variant="subtitle2" color="text.secondary">
                                                    Pending Delivery
                                                </Typography>
                                            </Box>
                                            <Typography variant="h4" fontWeight="bold">
                                                {dashboard.pending_delivery_count}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                ₹{dashboard.pending_delivery_amount.toLocaleString()}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid size={{ xs: 12, md: 3 }}>
                                    <Card variant="outlined">
                                        <CardContent>
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                <Warning sx={{ mr: 1, color: 'error.main' }} />
                                                <Typography variant="subtitle2" color="text.secondary">
                                                    Overdue Deliveries
                                                </Typography>
                                            </Box>
                                            <Typography variant="h4" fontWeight="bold">
                                                {dashboard.overdue_deliveries_count}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Avg: ₹{Math.round(dashboard.average_order_value).toLocaleString()}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>
                        )}
                    </CardContent>
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                    <CardContent>
                        {/* Filters */}
                        <Grid container spacing={2} sx={{ mb: 3 }}>
                            <Grid size={{ xs: 12, md: 8 }}>
                                <TextField
                                    fullWidth
                                    placeholder="Search by description, purchase number, vendor, or category..."
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
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Status Filter</InputLabel>
                                    <Select
                                        value={statusFilter}
                                        label="Status Filter"
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                    >
                                        <MenuItem value="">All Statuses</MenuItem>
                                        <MenuItem value="DRAFT">Draft</MenuItem>
                                        <MenuItem value="PENDING_APPROVAL">Pending Approval</MenuItem>
                                        <MenuItem value="APPROVED">Approved</MenuItem>
                                        <MenuItem value="ORDERED">Ordered</MenuItem>
                                        <MenuItem value="PARTIALLY_RECEIVED">Partially Received</MenuItem>
                                        <MenuItem value="RECEIVED">Received</MenuItem>
                                        <MenuItem value="CANCELLED">Cancelled</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>

                        {/* Purchases Table */}
                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <TableContainer component={Paper} elevation={0}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>
                                                <Typography fontWeight="600">Purchase Order</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography fontWeight="600">Vendor</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography fontWeight="600">Dates</Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography fontWeight="600">Amount</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography fontWeight="600">Status</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography fontWeight="600">Payment</Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography fontWeight="600">Actions</Typography>
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredPurchases.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                                    <Typography color="text.secondary">
                                                        {searchTerm || statusFilter ? 'No purchases found matching your filters' : 'No purchases found'}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredPurchases.map((purchase) => (
                                                <TableRow key={purchase.id} hover>
                                                    <TableCell>
                                                        <Box>
                                                            <Typography fontWeight="500">{purchase.description}</Typography>
                                                            <Typography variant="body2" color="text.secondary">
                                                                {purchase.purchase_number} • {purchase.category}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                Qty: {purchase.quantity} @ ₹{purchase.unit_price.toLocaleString()}
                                                            </Typography>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                            <Business sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                                                            <Box>
                                                                <Typography variant="body2" fontWeight="500">
                                                                    {purchase.vendor_name || purchase.vendor_company_name || 'Unknown Vendor'}
                                                                </Typography>
                                                                {purchase.vendor_gst && (
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        GST: {purchase.vendor_gst}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                            <CalendarToday sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                                                            <Box>
                                                                <Typography variant="body2">
                                                                    Order: {new Date(purchase.order_date).toLocaleDateString()}
                                                                </Typography>
                                                                {purchase.expected_delivery_date && (
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        Expected: {new Date(purchase.expected_delivery_date).toLocaleDateString()}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Typography fontWeight="500">
                                                            ₹{purchase.total_amount.toLocaleString()}
                                                        </Typography>
                                                        {purchase.tax_amount > 0 && (
                                                            <Typography variant="caption" color="text.secondary">
                                                                Tax: ₹{purchase.tax_amount.toLocaleString()}
                                                            </Typography>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            icon={getStatusIcon(purchase.status)}
                                                            label={purchase.status.replace('_', ' ')}
                                                            color={getStatusColor(purchase.status) as any}
                                                            size="small"
                                                            variant="outlined"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={purchase.payment_status}
                                                            color={getPaymentStatusColor(purchase.payment_status) as any}
                                                            size="small"
                                                            variant="outlined"
                                                        />
                                                        {purchase.payment_amount && (
                                                            <Typography variant="caption" color="text.secondary" display="block">
                                                                ₹{purchase.payment_amount.toLocaleString()}
                                                            </Typography>
                                                        )}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <IconButton
                                                            onClick={(e) => handleMenuOpen(e, purchase)}
                                                            size="small"
                                                        >
                                                            <MoreVert />
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </CardContent>
                </TabPanel>
            </Card>

            {/* Actions Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
            >
                <MenuItem
                    onClick={() => {
                        if (selectedPurchase) {
                            handleEditPurchase(selectedPurchase);
                        }
                        handleMenuClose();
                    }}
                >
                    <Edit sx={{ mr: 1 }} />
                    Edit
                </MenuItem>
                {selectedPurchase?.status === 'PENDING_APPROVAL' && (
                    <MenuItem
                        onClick={() => {
                            if (selectedPurchase) {
                                handleApprovePurchase(selectedPurchase);
                            }
                            handleMenuClose();
                        }}
                        sx={{ color: 'success.main' }}
                    >
                        <CheckCircle sx={{ mr: 1 }} />
                        Approve
                    </MenuItem>
                )}
                {selectedPurchase?.status === 'PENDING_APPROVAL' && (
                    <MenuItem
                        onClick={() => {
                            if (selectedPurchase) {
                                handleRejectPurchase(selectedPurchase);
                            }
                            handleMenuClose();
                        }}
                        sx={{ color: 'warning.main' }}
                    >
                        <Cancel sx={{ mr: 1 }} />
                        Reject
                    </MenuItem>
                )}
                {(selectedPurchase?.status === 'ORDERED' || selectedPurchase?.status === 'PARTIALLY_RECEIVED') && (
                    <MenuItem
                        onClick={() => {
                            if (selectedPurchase) {
                                handleMarkReceived(selectedPurchase);
                            }
                            handleMenuClose();
                        }}
                        sx={{ color: 'info.main' }}
                    >
                        <LocalShipping sx={{ mr: 1 }} />
                        Mark Received
                    </MenuItem>
                )}
                <MenuItem
                    onClick={() => {
                        if (selectedPurchase) {
                            handleDeletePurchase(selectedPurchase);
                        }
                        handleMenuClose();
                    }}
                    sx={{ color: 'error.main' }}
                >
                    <Delete sx={{ mr: 1 }} />
                    Delete
                </MenuItem>
            </Menu>

            {/* Create/Edit Dialog */}
            <Dialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle>
                    {editingPurchase ? 'Edit Purchase Order' : 'Create New Purchase Order'}
                </DialogTitle>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <DialogContent>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            {/* Vendor Information */}
                            <Grid size={12}>
                                <Typography variant="h6" sx={{ mb: 2 }}>
                                    Vendor Information
                                </Typography>
                            </Grid>
                            
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="vendor_name"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Vendor Name"
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="vendor_contact"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Vendor Contact"
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="vendor_gst"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Vendor GST Number"
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="vendor_address"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Vendor Address"
                                        />
                                    )}
                                />
                            </Grid>

                            {/* Order Details */}
                            <Grid size={12}>
                                <Divider sx={{ my: 2 }}>
                                    <Typography variant="h6">Order Details</Typography>
                                </Divider>
                            </Grid>

                            <Grid size={{ xs: 12, md: 4 }}>
                                <Controller
                                    name="order_date"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Order Date"
                                            type="date"
                                            InputLabelProps={{ shrink: true }}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <Controller
                                    name="expected_delivery_date"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Expected Delivery Date"
                                            type="date"
                                            InputLabelProps={{ shrink: true }}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <Controller
                                    name="requested_by"
                                    control={control}
                                    render={({ field }) => (
                                        <FormControl fullWidth>
                                            <InputLabel>Requested By</InputLabel>
                                            <Select {...field} label="Requested By">
                                                {employees.map((employee) => (
                                                    <MenuItem key={employee.id} value={employee.id}>
                                                        {employee.first_name} {employee.last_name} ({employee.employee_code})
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    )}
                                />
                            </Grid>

                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="purchase_type"
                                    control={control}
                                    render={({ field }) => (
                                        <FormControl fullWidth error={!!errors.purchase_type}>
                                            <InputLabel>Purchase Type *</InputLabel>
                                            <Select {...field} label="Purchase Type *">
                                                {purchaseTypes.map((type) => (
                                                    <MenuItem key={type} value={type}>
                                                        {type.replace('_', ' ')}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                            {errors.purchase_type && (
                                                <Typography variant="caption" color="error">
                                                    {errors.purchase_type.message}
                                                </Typography>
                                            )}
                                        </FormControl>
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="category"
                                    control={control}
                                    render={({ field }) => (
                                        <FormControl fullWidth error={!!errors.category}>
                                            <InputLabel>Category *</InputLabel>
                                            <Select {...field} label="Category *">
                                                {categories.map((category) => (
                                                    <MenuItem key={category} value={category}>
                                                        {category}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                            {errors.category && (
                                                <Typography variant="caption" color="error">
                                                    {errors.category.message}
                                                </Typography>
                                            )}
                                        </FormControl>
                                    )}
                                />
                            </Grid>

                            <Grid size={12}>
                                <Controller
                                    name="description"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Description *"
                                            multiline
                                            rows={3}
                                            error={!!errors.description}
                                            helperText={errors.description?.message}
                                        />
                                    )}
                                />
                            </Grid>

                            {/* Pricing */}
                            <Grid size={12}>
                                <Divider sx={{ my: 2 }}>
                                    <Typography variant="h6">Pricing Details</Typography>
                                </Divider>
                            </Grid>

                            <Grid size={{ xs: 12, md: 3 }}>
                                <Controller
                                    name="quantity"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Quantity *"
                                            type="number"
                                            error={!!errors.quantity}
                                            helperText={errors.quantity?.message}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 3 }}>
                                <Controller
                                    name="unit_price"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Unit Price *"
                                            type="number"
                                            inputProps={{ step: "0.01" }}
                                            error={!!errors.unit_price}
                                            helperText={errors.unit_price?.message}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 3 }}>
                                <Controller
                                    name="tax_rate"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Tax Rate (%)"
                                            type="number"
                                            inputProps={{ step: "0.01" }}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 3 }}>
                                <TextField
                                    fullWidth
                                    label="Total Amount"
                                    value={`₹${totalAmount.toLocaleString()}`}
                                    InputProps={{ readOnly: true }}
                                    variant="outlined"
                                />
                            </Grid>

                            {/* Additional Details */}
                            <Grid size={12}>
                                <Divider sx={{ my: 2 }}>
                                    <Typography variant="h6">Additional Details</Typography>
                                </Divider>
                            </Grid>

                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="delivery_address"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Delivery Address"
                                            multiline
                                            rows={2}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="payment_terms"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Payment Terms"
                                        />
                                    )}
                                />
                            </Grid>
                            
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="warranty_period"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Warranty Period (Months)"
                                            type="number"
                                        />
                                    )}
                                />
                            </Grid>

                            <Grid size={12}>
                                <Controller
                                    name="notes"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Additional Notes"
                                            multiline
                                            rows={3}
                                        />
                                    )}
                                />
                            </Grid>

                            {/* Calculations Display */}
                            <Grid size={12}>
                                <Card variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                                    <Typography variant="h6" sx={{ mb: 1 }}>Order Summary</Typography>
                                    <Grid container spacing={2}>
                                        <Grid size={{ xs: 6, md: 3 }}>
                                            <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                                            <Typography variant="h6">₹{subtotal.toLocaleString()}</Typography>
                                        </Grid>
                                        <Grid size={{ xs: 6, md: 3 }}>
                                            <Typography variant="body2" color="text.secondary">Tax Amount</Typography>
                                            <Typography variant="h6">₹{taxAmount.toLocaleString()}</Typography>
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <Typography variant="body2" color="text.secondary">Total Amount</Typography>
                                            <Typography variant="h5" color="primary.main">₹{totalAmount.toLocaleString()}</Typography>
                                        </Grid>
                                    </Grid>
                                </Card>
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{ p: 3 }}>
                        <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={isSubmitting}
                            startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
                        >
                            {editingPurchase ? 'Update' : 'Create'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Box>
    );
};

export default Purchases;