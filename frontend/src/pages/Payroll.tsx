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
    MonetizationOn,
    Person,
    CalendarToday,
    AccountBalance,
    TrendingUp,
    PendingActions,
    CheckCircle,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { 
    SalaryPaymentWithEmployee, 
    CreateSalaryPaymentRequest, 
    PayrollDashboard,
    payrollApi 
} from '../services/payrollApi';
import { employeeApi } from '../services/employeeApi';

interface Employee {
    id: string;
    first_name: string;
    last_name: string;
    employee_code: string;
    department?: string;
    designation: string;
    base_salary: number;
    salary_type: string;
    employee_status: string;
}

const salaryPaymentSchema: yup.ObjectSchema<CreateSalaryPaymentRequest> = yup.object({
    employee_id: yup.string().required('Employee is required'),
    payment_period_start: yup.string().required('Period start date is required'),
    payment_period_end: yup.string().required('Period end date is required'),
    payment_date: yup.string().optional(),
    base_amount: yup.number().min(0, 'Base amount must be positive').required('Base amount is required'),
    overtime_hours: yup.number().min(0, 'Overtime hours must be positive').optional(),
    overtime_rate: yup.number().min(0, 'Overtime rate must be positive').optional(),
    overtime_amount: yup.number().min(0, 'Overtime amount must be positive').optional(),
    bonus_amount: yup.number().min(0, 'Bonus amount must be positive').optional(),
    allowances: yup.number().min(0, 'Allowances must be positive').optional(),
    incentives: yup.number().min(0, 'Incentives must be positive').optional(),
    tax_deduction: yup.number().min(0, 'Tax deduction must be positive').optional(),
    pf_deduction: yup.number().min(0, 'PF deduction must be positive').optional(),
    esi_deduction: yup.number().min(0, 'ESI deduction must be positive').optional(),
    loan_deduction: yup.number().min(0, 'Loan deduction must be positive').optional(),
    other_deductions: yup.number().min(0, 'Other deductions must be positive').optional(),
    payment_method: yup.string().oneOf(['BANK_TRANSFER', 'CASH', 'CHEQUE']).optional(),
    payment_reference: yup.string().optional(),
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

const Payroll: React.FC = () => {
    const [salaryPayments, setSalaryPayments] = useState<SalaryPaymentWithEmployee[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [dashboard, setDashboard] = useState<PayrollDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [tabValue, setTabValue] = useState(0);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [bulkGenerateOpen, setBulkGenerateOpen] = useState(false);
    const [editingPayment, setEditingPayment] = useState<SalaryPaymentWithEmployee | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedPayment, setSelectedPayment] = useState<SalaryPaymentWithEmployee | null>(null);
    const [bulkPeriodStart, setBulkPeriodStart] = useState('');
    const [bulkPeriodEnd, setBulkPeriodEnd] = useState('');

    const {
        control,
        handleSubmit,
        reset,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<CreateSalaryPaymentRequest>({
        resolver: yupResolver(salaryPaymentSchema),
        defaultValues: {
            employee_id: '',
            payment_period_start: '',
            payment_period_end: '',
            payment_date: new Date().toISOString().split('T')[0],
            base_amount: 0,
            overtime_hours: 0,
            overtime_rate: 0,
            bonus_amount: 0,
            allowances: 0,
            incentives: 0,
            tax_deduction: 0,
            pf_deduction: 0,
            esi_deduction: 0,
            loan_deduction: 0,
            other_deductions: 0,
            payment_method: 'BANK_TRANSFER',
            payment_reference: '',
            notes: '',
        },
    });

    const watchedValues = watch();

    // Calculate derived values
    const overtimeAmount = (watchedValues.overtime_hours || 0) * (watchedValues.overtime_rate || 0);
    const grossSalary = (watchedValues.base_amount || 0) + overtimeAmount + (watchedValues.bonus_amount || 0) + 
                      (watchedValues.allowances || 0) + (watchedValues.incentives || 0);
    const totalDeductions = (watchedValues.tax_deduction || 0) + (watchedValues.pf_deduction || 0) + 
                           (watchedValues.esi_deduction || 0) + (watchedValues.loan_deduction || 0) + 
                           (watchedValues.other_deductions || 0);
    const netSalary = grossSalary - totalDeductions;

    // Load data
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [paymentsData, employeesData, dashboardData] = await Promise.all([
                payrollApi.getSalaryPayments(),
                employeeApi.getEmployees(),
                payrollApi.getPayrollDashboard()
            ]);
            setSalaryPayments(paymentsData);
            setEmployees(employeesData.filter(emp => emp.employee_status === 'ACTIVE'));
            setDashboard(dashboardData);
        } catch (error: any) {
            setError('Failed to load payroll data');
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

    const handleCreatePayment = () => {
        setEditingPayment(null);
        reset({
            employee_id: '',
            payment_period_start: '',
            payment_period_end: '',
            payment_date: new Date().toISOString().split('T')[0],
            base_amount: 0,
            overtime_hours: 0,
            overtime_rate: 0,
            bonus_amount: 0,
            allowances: 0,
            incentives: 0,
            tax_deduction: 0,
            pf_deduction: 0,
            esi_deduction: 0,
            loan_deduction: 0,
            other_deductions: 0,
            payment_method: 'BANK_TRANSFER',
            payment_reference: '',
            notes: '',
        });
        setDialogOpen(true);
    };

    const handleEditPayment = (payment: SalaryPaymentWithEmployee) => {
        setEditingPayment(payment);
        reset({
            employee_id: payment.employee_id,
            payment_period_start: payment.payment_period_start,
            payment_period_end: payment.payment_period_end,
            payment_date: payment.payment_date,
            base_amount: payment.base_amount,
            overtime_hours: payment.overtime_hours,
            overtime_rate: payment.overtime_rate,
            bonus_amount: payment.bonus_amount,
            allowances: payment.allowances,
            incentives: payment.incentives,
            tax_deduction: payment.tax_deduction,
            pf_deduction: payment.pf_deduction,
            esi_deduction: payment.esi_deduction,
            loan_deduction: payment.loan_deduction,
            other_deductions: payment.other_deductions,
            payment_method: payment.payment_method,
            payment_reference: payment.payment_reference,
            notes: payment.notes,
        });
        setDialogOpen(true);
    };

    const handleDeletePayment = async (payment: SalaryPaymentWithEmployee) => {
        if (window.confirm(`Are you sure you want to delete salary payment for ${payment.employee_name}?`)) {
            try {
                await payrollApi.deleteSalaryPayment(payment.id);
                setSuccess('Salary payment deleted successfully');
                loadData();
            } catch (error: any) {
                setError('Failed to delete salary payment');
            }
        }
    };

    const onSubmit = async (data: CreateSalaryPaymentRequest) => {
        try {
            if (editingPayment) {
                await payrollApi.updateSalaryPayment(editingPayment.id, data);
                setSuccess('Salary payment updated successfully');
            } else {
                await payrollApi.createSalaryPayment(data);
                setSuccess('Salary payment created successfully');
            }
            setDialogOpen(false);
            loadData();
        } catch (error: any) {
            setError(error.response?.data?.detail || 'Failed to save salary payment');
        }
    };

    const handleBulkGenerate = async () => {
        if (!bulkPeriodStart || !bulkPeriodEnd) {
            setError('Please select both start and end dates for bulk generation');
            return;
        }
        
        try {
            await payrollApi.bulkGenerateSalaryPayments(bulkPeriodStart, bulkPeriodEnd);
            setSuccess('Bulk salary payments generated successfully');
            setBulkGenerateOpen(false);
            loadData();
        } catch (error: any) {
            setError('Failed to generate bulk salary payments');
        }
    };

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, payment: SalaryPaymentWithEmployee) => {
        setAnchorEl(event.currentTarget);
        setSelectedPayment(payment);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedPayment(null);
    };

    const filteredPayments = salaryPayments.filter(
        (payment) =>
            payment.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            payment.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            payment.payment_period_start.includes(searchTerm)
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PAID':
                return 'success';
            case 'PENDING':
                return 'warning';
            case 'CANCELLED':
                return 'error';
            default:
                return 'default';
        }
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" fontWeight="bold">
                    Payroll Management
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        variant="outlined"
                        startIcon={<TrendingUp />}
                        onClick={() => setBulkGenerateOpen(true)}
                    >
                        Bulk Generate
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={handleCreatePayment}
                        sx={{ px: 3 }}
                    >
                        Add Salary Payment
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

            {/* Tabs */}
            <Card sx={{ mb: 3 }}>
                <Tabs
                    value={tabValue}
                    onChange={(_, newValue) => setTabValue(newValue)}
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label="Dashboard" icon={<TrendingUp />} />
                    <Tab label="Salary Payments" icon={<MonetizationOn />} />
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
                                                <MonetizationOn sx={{ mr: 1, color: 'primary.main' }} />
                                                <Typography variant="subtitle2" color="text.secondary">
                                                    This Month Total
                                                </Typography>
                                            </Box>
                                            <Typography variant="h4" fontWeight="bold">
                                                ₹{dashboard.current_month_total.toLocaleString()}
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
                                                    Pending Payments
                                                </Typography>
                                            </Box>
                                            <Typography variant="h4" fontWeight="bold">
                                                {dashboard.pending_payments_count}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                ₹{dashboard.pending_payments_amount.toLocaleString()}
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
                                                    Paid This Month
                                                </Typography>
                                            </Box>
                                            <Typography variant="h4" fontWeight="bold">
                                                {dashboard.this_month_paid_count}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                ₹{dashboard.this_month_paid_amount.toLocaleString()}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid size={{ xs: 12, md: 3 }}>
                                    <Card variant="outlined">
                                        <CardContent>
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                <AccountBalance sx={{ mr: 1, color: 'info.main' }} />
                                                <Typography variant="subtitle2" color="text.secondary">
                                                    Average Salary
                                                </Typography>
                                            </Box>
                                            <Typography variant="h4" fontWeight="bold">
                                                ₹{Math.round(dashboard.average_salary).toLocaleString()}
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
                        {/* Search */}
                        <Box sx={{ mb: 3 }}>
                            <TextField
                                fullWidth
                                placeholder="Search by employee name, code, or payment period..."
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

                        {/* Payments Table */}
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
                                                <Typography fontWeight="600">Employee</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography fontWeight="600">Period</Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography fontWeight="600">Gross Salary</Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography fontWeight="600">Deductions</Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography fontWeight="600">Net Salary</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography fontWeight="600">Status</Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography fontWeight="600">Actions</Typography>
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredPayments.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                                    <Typography color="text.secondary">
                                                        {searchTerm ? 'No salary payments found matching your search' : 'No salary payments found'}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredPayments.map((payment) => (
                                                <TableRow key={payment.id} hover>
                                                    <TableCell>
                                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                            <Person sx={{ mr: 1, color: 'primary.main' }} />
                                                            <Box>
                                                                <Typography fontWeight="500">{payment.employee_name}</Typography>
                                                                <Typography variant="body2" color="text.secondary">
                                                                    {payment.employee_code} • {payment.designation}
                                                                </Typography>
                                                            </Box>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                            <CalendarToday sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                                                            <Box>
                                                                <Typography variant="body2">
                                                                    {new Date(payment.payment_period_start).toLocaleDateString()} - 
                                                                    {new Date(payment.payment_period_end).toLocaleDateString()}
                                                                </Typography>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    Payment: {new Date(payment.payment_date).toLocaleDateString()}
                                                                </Typography>
                                                            </Box>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Typography fontWeight="500">
                                                            ₹{payment.gross_salary.toLocaleString()}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Typography>
                                                            ₹{payment.total_deductions.toLocaleString()}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Typography fontWeight="600" color="primary.main">
                                                            ₹{payment.net_salary.toLocaleString()}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={payment.payment_status}
                                                            color={getStatusColor(payment.payment_status) as any}
                                                            size="small"
                                                            variant="outlined"
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <IconButton
                                                            onClick={(e) => handleMenuOpen(e, payment)}
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
                        if (selectedPayment) {
                            handleEditPayment(selectedPayment);
                        }
                        handleMenuClose();
                    }}
                >
                    <Edit sx={{ mr: 1 }} />
                    Edit
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        if (selectedPayment) {
                            handleDeletePayment(selectedPayment);
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
                    {editingPayment ? 'Edit Salary Payment' : 'Add New Salary Payment'}
                </DialogTitle>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <DialogContent>
                        <Grid container spacing={3} sx={{ mt: 1 }}>
                            {/* Employee Selection */}
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="employee_id"
                                    control={control}
                                    render={({ field }) => (
                                        <FormControl fullWidth error={!!errors.employee_id}>
                                            <InputLabel>Employee *</InputLabel>
                                            <Select {...field} label="Employee *">
                                                {employees.map((employee) => (
                                                    <MenuItem key={employee.id} value={employee.id}>
                                                        {employee.first_name} {employee.last_name} ({employee.employee_code})
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                            {errors.employee_id && (
                                                <Typography variant="caption" color="error">
                                                    {errors.employee_id.message}
                                                </Typography>
                                            )}
                                        </FormControl>
                                    )}
                                />
                            </Grid>

                            {/* Payment Method */}
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="payment_method"
                                    control={control}
                                    render={({ field }) => (
                                        <FormControl fullWidth>
                                            <InputLabel>Payment Method</InputLabel>
                                            <Select {...field} label="Payment Method">
                                                <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
                                                <MenuItem value="CASH">Cash</MenuItem>
                                                <MenuItem value="CHEQUE">Cheque</MenuItem>
                                            </Select>
                                        </FormControl>
                                    )}
                                />
                            </Grid>

                            {/* Period Dates */}
                            <Grid size={{ xs: 12, md: 4 }}>
                                <Controller
                                    name="payment_period_start"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Period Start Date *"
                                            type="date"
                                            InputLabelProps={{ shrink: true }}
                                            error={!!errors.payment_period_start}
                                            helperText={errors.payment_period_start?.message}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <Controller
                                    name="payment_period_end"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Period End Date *"
                                            type="date"
                                            InputLabelProps={{ shrink: true }}
                                            error={!!errors.payment_period_end}
                                            helperText={errors.payment_period_end?.message}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <Controller
                                    name="payment_date"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Payment Date"
                                            type="date"
                                            InputLabelProps={{ shrink: true }}
                                        />
                                    )}
                                />
                            </Grid>

                            {/* Salary Components */}
                            <Grid size={12}>
                                <Typography variant="h6" sx={{ mb: 2 }}>
                                    Salary Components
                                </Typography>
                            </Grid>
                            
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="base_amount"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Base Salary *"
                                            type="number"
                                            error={!!errors.base_amount}
                                            helperText={errors.base_amount?.message}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 3 }}>
                                <Controller
                                    name="overtime_hours"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Overtime Hours"
                                            type="number"
                                            inputProps={{ step: "0.5" }}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 3 }}>
                                <Controller
                                    name="overtime_rate"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Overtime Rate"
                                            type="number"
                                        />
                                    )}
                                />
                            </Grid>

                            <Grid size={{ xs: 12, md: 4 }}>
                                <Controller
                                    name="bonus_amount"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Bonus Amount"
                                            type="number"
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <Controller
                                    name="allowances"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Allowances"
                                            type="number"
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <Controller
                                    name="incentives"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Incentives"
                                            type="number"
                                        />
                                    )}
                                />
                            </Grid>

                            {/* Deductions */}
                            <Grid size={12}>
                                <Divider sx={{ my: 2 }}>
                                    <Typography variant="h6">Deductions</Typography>
                                </Divider>
                            </Grid>

                            <Grid size={{ xs: 12, md: 3 }}>
                                <Controller
                                    name="tax_deduction"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Tax Deduction"
                                            type="number"
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 3 }}>
                                <Controller
                                    name="pf_deduction"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="PF Deduction"
                                            type="number"
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 3 }}>
                                <Controller
                                    name="esi_deduction"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="ESI Deduction"
                                            type="number"
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 3 }}>
                                <Controller
                                    name="loan_deduction"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Loan Deduction"
                                            type="number"
                                        />
                                    )}
                                />
                            </Grid>

                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="other_deductions"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Other Deductions"
                                            type="number"
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="payment_reference"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Payment Reference"
                                        />
                                    )}
                                />
                            </Grid>

                            {/* Calculations Display */}
                            <Grid size={12}>
                                <Card variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                                    <Typography variant="h6" sx={{ mb: 1 }}>Salary Calculations</Typography>
                                    <Grid container spacing={2}>
                                        <Grid size={{ xs: 6, md: 3 }}>
                                            <Typography variant="body2" color="text.secondary">Overtime Amount</Typography>
                                            <Typography variant="h6">₹{overtimeAmount.toLocaleString()}</Typography>
                                        </Grid>
                                        <Grid size={{ xs: 6, md: 3 }}>
                                            <Typography variant="body2" color="text.secondary">Gross Salary</Typography>
                                            <Typography variant="h6">₹{grossSalary.toLocaleString()}</Typography>
                                        </Grid>
                                        <Grid size={{ xs: 6, md: 3 }}>
                                            <Typography variant="body2" color="text.secondary">Total Deductions</Typography>
                                            <Typography variant="h6">₹{totalDeductions.toLocaleString()}</Typography>
                                        </Grid>
                                        <Grid size={{ xs: 6, md: 3 }}>
                                            <Typography variant="body2" color="text.secondary">Net Salary</Typography>
                                            <Typography variant="h6" color="primary.main">₹{netSalary.toLocaleString()}</Typography>
                                        </Grid>
                                    </Grid>
                                </Card>
                            </Grid>

                            <Grid size={12}>
                                <Controller
                                    name="notes"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Notes"
                                            multiline
                                            rows={3}
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
                            {editingPayment ? 'Update' : 'Create'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Bulk Generate Dialog */}
            <Dialog
                open={bulkGenerateOpen}
                onClose={() => setBulkGenerateOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Bulk Generate Salary Payments</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Generate salary payments for all active employees for the selected period.
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid size={6}>
                            <TextField
                                fullWidth
                                label="Period Start Date"
                                type="date"
                                value={bulkPeriodStart}
                                onChange={(e) => setBulkPeriodStart(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid size={6}>
                            <TextField
                                fullWidth
                                label="Period End Date"
                                type="date"
                                value={bulkPeriodEnd}
                                onChange={(e) => setBulkPeriodEnd(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setBulkGenerateOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleBulkGenerate}
                        variant="contained"
                        disabled={!bulkPeriodStart || !bulkPeriodEnd}
                    >
                        Generate Payments
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Payroll;