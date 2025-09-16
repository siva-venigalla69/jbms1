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
} from '@mui/material';
import {
    Add,
    Search,
    Edit,
    Delete,
    MoreVert,
    Receipt,
    Person,
    CalendarToday,
    AttachMoney,
    TrendingUp,
    PendingActions,
    CheckCircle,
    Cancel,
    Warning,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { 
    Expense, 
    CreateExpenseRequest, 
    ExpenseDashboard,
    expensesApi 
} from '../services/expensesApi';
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

const expenseSchema: yup.ObjectSchema<CreateExpenseRequest> = yup.object({
    employee_id: yup.string().optional(),
    expense_date: yup.string().optional(),
    expense_type: yup.string().required('Expense type is required'),
    category: yup.string().required('Category is required'),
    subcategory: yup.string().optional(),
    description: yup.string().required('Description is required'),
    amount: yup.number().min(0.01, 'Amount must be greater than 0').required('Amount is required'),
    tax_amount: yup.number().optional(),
    vendor_name: yup.string().optional(),
    vendor_contact: yup.string().optional(),
    vendor_gst: yup.string().optional(),
    invoice_number: yup.string().optional(),
    invoice_date: yup.string().optional(),
    policy_limit: yup.number().optional(),
    business_purpose: yup.string().optional(),
    receipt_url: yup.string().url('Invalid URL format').optional(),
    additional_documents: yup.array().of(yup.string().required()).optional(),
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

const expenseTypes = [
    'TRAVEL',
    'FOOD_BEVERAGE',
    'OFFICE_SUPPLIES',
    'TRAINING',
    'MARKETING',
    'UTILITIES',
    'EQUIPMENT',
    'SOFTWARE',
    'OTHER'
];

const expenseCategories = [
    'Transportation',
    'Accommodation',
    'Meals',
    'Office Supplies',
    'Software & Tools',
    'Training & Development',
    'Marketing & Advertising',
    'Utilities',
    'Equipment',
    'Other'
];

const Expenses: React.FC = () => {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [dashboard, setDashboard] = useState<ExpenseDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [tabValue, setTabValue] = useState(0);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<CreateExpenseRequest>({
        resolver: yupResolver(expenseSchema),
        defaultValues: {
            employee_id: '',
            expense_date: new Date().toISOString().split('T')[0],
            expense_type: '',
            category: '',
            description: '',
            amount: 0,
            business_purpose: '',
            receipt_url: '',
            notes: '',
        },
    });

    // Load data
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [expensesData, employeesData, dashboardData] = await Promise.all([
                expensesApi.getExpenses(),
                employeeApi.getEmployees(),
                expensesApi.getExpenseDashboard()
            ]);
            setExpenses(expensesData);
            setEmployees(employeesData.filter(emp => emp.employee_status === 'ACTIVE'));
            setDashboard(dashboardData);
        } catch (error: any) {
            setError('Failed to load expenses data');
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

    const handleCreateExpense = () => {
        setEditingExpense(null);
        reset({
            employee_id: '',
            expense_date: new Date().toISOString().split('T')[0],
            expense_type: '',
            category: '',
            description: '',
            amount: 0,
            business_purpose: '',
            receipt_url: '',
            notes: '',
        });
        setDialogOpen(true);
    };

    const handleEditExpense = (expense: Expense) => {
        setEditingExpense(expense);
        reset({
            employee_id: expense.employee_id || '',
            expense_date: expense.expense_date,
            expense_type: expense.expense_type,
            category: expense.category,
            description: expense.description,
            amount: expense.amount,
            business_purpose: expense.business_purpose || '',
            receipt_url: expense.receipt_url || '',
            notes: expense.notes || '',
        });
        setDialogOpen(true);
    };

    const handleDeleteExpense = async (expense: Expense) => {
        if (window.confirm(`Are you sure you want to delete expense "${expense.description}"?`)) {
            try {
                await expensesApi.deleteExpense(expense.id);
                setSuccess('Expense deleted successfully');
                loadData();
            } catch (error: any) {
                setError('Failed to delete expense');
            }
        }
    };

    const handleApproveExpense = async (expense: Expense) => {
        try {
            await expensesApi.approveExpense(expense.id, 'current-user');
            setSuccess('Expense approved successfully');
            loadData();
        } catch (error: any) {
            setError('Failed to approve expense');
        }
    };

    const handleRejectExpense = async (expense: Expense) => {
        const reason = prompt('Please enter rejection reason:');
        if (reason) {
            try {
                await expensesApi.rejectExpense(expense.id, 'current-user', reason);
                setSuccess('Expense rejected successfully');
                loadData();
            } catch (error: any) {
                setError('Failed to reject expense');
            }
        }
    };

    const onSubmit = async (data: CreateExpenseRequest) => {
        try {
            // Clean data - convert empty strings to undefined for UUID fields
            const cleanedData = {
                ...data,
                employee_id: data.employee_id || undefined,
            };

            if (editingExpense) {
                await expensesApi.updateExpense(editingExpense.id, cleanedData);
                setSuccess('Expense updated successfully');
            } else {
                await expensesApi.createExpense(cleanedData);
                setSuccess('Expense created successfully');
            }
            setDialogOpen(false);
            loadData();
        } catch (error: any) {
            setError(error.response?.data?.detail || 'Failed to save expense');
        }
    };

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, expense: Expense) => {
        setAnchorEl(event.currentTarget);
        setSelectedExpense(expense);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedExpense(null);
    };

    const filteredExpenses = expenses.filter((expense) => {
        const matchesSearch = 
            expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            expense.expense_number.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = !statusFilter || expense.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return 'success';
            case 'SUBMITTED':
            case 'PENDING':
                return 'warning';
            case 'REJECTED':
            case 'CANCELLED':
                return 'error';
            case 'PAID':
            case 'REIMBURSED':
                return 'info';
            case 'DRAFT':
            default:
                return 'default';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return <CheckCircle />;
            case 'SUBMITTED':
            case 'PENDING':
                return <PendingActions />;
            case 'REJECTED':
            case 'CANCELLED':
                return <Cancel />;
            case 'PAID':
            case 'REIMBURSED':
                return <AttachMoney />;
            case 'DRAFT':
            default:
                return <Receipt />;
        }
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" fontWeight="bold">
                    Expense Management
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={handleCreateExpense}
                    sx={{ px: 3 }}
                >
                    Add Expense
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
                    <Tab label="Expenses" icon={<Receipt />} />
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
                                                <Receipt sx={{ mr: 1, color: 'primary.main' }} />
                                                <Typography variant="subtitle2" color="text.secondary">
                                                    Total This Month
                                                </Typography>
                                            </Box>
                                            <Typography variant="h4" fontWeight="bold">
                                                ₹{dashboard.total_expenses_this_month.toLocaleString()}
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
                                                <CheckCircle sx={{ mr: 1, color: 'success.main' }} />
                                                <Typography variant="subtitle2" color="text.secondary">
                                                    Approved This Month
                                                </Typography>
                                            </Box>
                                            <Typography variant="h4" fontWeight="bold">
                                                {dashboard.approved_pending_payment_count}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                ₹{dashboard.approved_pending_payment_amount.toLocaleString()}
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
                                                    Policy Violations
                                                </Typography>
                                            </Box>
                                            <Typography variant="h4" fontWeight="bold">
                                                {dashboard.policy_violations_count}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {dashboard.policy_violations_count} violations
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
                                    placeholder="Search by description, category, or expense number..."
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
                                        <MenuItem value="SUBMITTED">Submitted</MenuItem>
                                        <MenuItem value="APPROVED">Approved</MenuItem>
                                        <MenuItem value="REJECTED">Rejected</MenuItem>
                                        <MenuItem value="PAID">Paid</MenuItem>
                                        <MenuItem value="REIMBURSED">Reimbursed</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>

                        {/* Expenses Table */}
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
                                                <Typography fontWeight="600">Expense</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography fontWeight="600">Employee</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography fontWeight="600">Date</Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography fontWeight="600">Amount</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography fontWeight="600">Status</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography fontWeight="600">Policy</Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography fontWeight="600">Actions</Typography>
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredExpenses.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                                    <Typography color="text.secondary">
                                                        {searchTerm || statusFilter ? 'No expenses found matching your filters' : 'No expenses found'}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredExpenses.map((expense) => (
                                                <TableRow key={expense.id} hover>
                                                    <TableCell>
                                                        <Box>
                                                            <Typography fontWeight="500">{expense.description}</Typography>
                                                            <Typography variant="body2" color="text.secondary">
                                                                {expense.expense_number} • {expense.category}
                                                            </Typography>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                        {expense.employee_id ? (
                                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                                <Person sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                                                                <Typography variant="body2">Employee ID: {expense.employee_id}</Typography>
                                                            </Box>
                                                        ) : (
                                                            <Typography variant="body2" color="text.secondary">
                                                                Company Expense
                                                            </Typography>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                            <CalendarToday sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                                                            <Typography variant="body2">
                                                                {new Date(expense.expense_date).toLocaleDateString()}
                                                            </Typography>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Typography fontWeight="500">
                                                            ₹{expense.total_amount.toLocaleString()}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            icon={getStatusIcon(expense.status)}
                                                            label={expense.status}
                                                            color={getStatusColor(expense.status) as any}
                                                            size="small"
                                                            variant="outlined"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        {expense.exceeds_policy ? (
                                                            <Chip
                                                                label="Policy Violation"
                                                                color="error"
                                                                size="small"
                                                                variant="outlined"
                                                                icon={<Warning />}
                                                            />
                                                        ) : (
                                                            <Chip
                                                                label="Compliant"
                                                                color="success"
                                                                size="small"
                                                                variant="outlined"
                                                                icon={<CheckCircle />}
                                                            />
                                                        )}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <IconButton
                                                            onClick={(e) => handleMenuOpen(e, expense)}
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
                        if (selectedExpense) {
                            handleEditExpense(selectedExpense);
                        }
                        handleMenuClose();
                    }}
                >
                    <Edit sx={{ mr: 1 }} />
                    Edit
                </MenuItem>
                {selectedExpense?.status === 'SUBMITTED' && (
                    <MenuItem
                        onClick={() => {
                            if (selectedExpense) {
                                handleApproveExpense(selectedExpense);
                            }
                            handleMenuClose();
                        }}
                        sx={{ color: 'success.main' }}
                    >
                        <CheckCircle sx={{ mr: 1 }} />
                        Approve
                    </MenuItem>
                )}
                {selectedExpense?.status === 'SUBMITTED' && (
                    <MenuItem
                        onClick={() => {
                            if (selectedExpense) {
                                handleRejectExpense(selectedExpense);
                            }
                            handleMenuClose();
                        }}
                        sx={{ color: 'warning.main' }}
                    >
                        <Cancel sx={{ mr: 1 }} />
                        Reject
                    </MenuItem>
                )}
                <MenuItem
                    onClick={() => {
                        if (selectedExpense) {
                            handleDeleteExpense(selectedExpense);
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
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    {editingExpense ? 'Edit Expense' : 'Add New Expense'}
                </DialogTitle>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <DialogContent>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="employee_id"
                                    control={control}
                                    render={({ field }) => (
                                        <FormControl fullWidth>
                                            <InputLabel>Employee (Optional)</InputLabel>
                                            <Select {...field} label="Employee (Optional)">
                                                <MenuItem value="">Company Expense</MenuItem>
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
                                    name="expense_date"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Expense Date *"
                                            type="date"
                                            InputLabelProps={{ shrink: true }}
                                            error={!!errors.expense_date}
                                            helperText={errors.expense_date?.message}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="expense_type"
                                    control={control}
                                    render={({ field }) => (
                                        <FormControl fullWidth error={!!errors.expense_type}>
                                            <InputLabel>Expense Type *</InputLabel>
                                            <Select {...field} label="Expense Type *">
                                                {expenseTypes.map((type) => (
                                                    <MenuItem key={type} value={type}>
                                                        {type.replace('_', ' ')}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                            {errors.expense_type && (
                                                <Typography variant="caption" color="error">
                                                    {errors.expense_type.message}
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
                                                {expenseCategories.map((category) => (
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
                                            rows={2}
                                            error={!!errors.description}
                                            helperText={errors.description?.message}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="amount"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Amount *"
                                            type="number"
                                            inputProps={{ step: "0.01" }}
                                            error={!!errors.amount}
                                            helperText={errors.amount?.message}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="receipt_url"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Receipt URL"
                                            error={!!errors.receipt_url}
                                            helperText={errors.receipt_url?.message}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={12}>
                                <Controller
                                    name="business_purpose"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Business Purpose"
                                            multiline
                                            rows={2}
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
                                            rows={2}
                                        />
                                    )}
                                />
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
                            {editingExpense ? 'Update' : 'Create'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Box>
    );
};

export default Expenses;