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
    FormControl,
    InputLabel,
    Select,
    Grid
} from '@mui/material';
import {
    Add,
    Search,
    Edit,
    Delete,
    MoreVert,
    Person,
    Phone,
    Email,
    Business,
    Badge,
    Work,
    AccountBalance
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Employee, CreateEmployeeRequest } from '../services/employeeApi';
import { employeeApi } from '../services/employeeApi';

const employeeSchema: yup.ObjectSchema<CreateEmployeeRequest> = yup.object({
    first_name: yup.string().required('First name is required'),
    last_name: yup.string().required('Last name is required'),
    email: yup.string().email('Invalid email format').optional(),
    phone: yup.string().matches(/^[0-9+\-\s]*$/, 'Invalid phone number format').optional(),
    address: yup.string().optional(),
    date_of_birth: yup.string().optional(),
    hire_date: yup.string().optional(),
    department: yup.string().optional(),
    designation: yup.string().required('Designation is required'),
    employment_type: yup.string().oneOf(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']).optional(),
    reporting_manager_id: yup.string().optional(),
    base_salary: yup.number().min(0, 'Salary must be positive').required('Base salary is required'),
    salary_type: yup.string().oneOf(['MONTHLY', 'DAILY', 'HOURLY']).optional(),
    bank_account_number: yup.string().optional(),
    bank_name: yup.string().optional(),
    bank_ifsc: yup.string().optional(),
    pan_number: yup.string().matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format').optional(),
    aadhar_number: yup.string().matches(/^[0-9]{12}$/, 'Aadhaar must be 12 digits').optional()
});

const Employees: React.FC = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterDepartment, setFilterDepartment] = useState<string>('all');
    
    // Dialog states
    const [openDialog, setOpenDialog] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

    // Form setup
    const { control, handleSubmit, reset, formState: { errors } } = useForm<CreateEmployeeRequest>({
        resolver: yupResolver(employeeSchema),
        defaultValues: {
            first_name: '',
            last_name: '',
            email: '',
            phone: '',
            address: '',
            date_of_birth: '',
            hire_date: new Date().toISOString().split('T')[0],
            department: '',
            designation: '',
            employment_type: 'FULL_TIME',
            reporting_manager_id: '',
            base_salary: 0,
            salary_type: 'MONTHLY',
            bank_account_number: '',
            bank_name: '',
            bank_ifsc: '',
            pan_number: '',
            aadhar_number: ''
        }
    });

    // Load employees
    const loadEmployees = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await employeeApi.getEmployees();
            setEmployees(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load employees');
            console.error('Error loading employees:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadEmployees();
    }, [loadEmployees]);

    // Handle form submission
    const onSubmit = async (data: CreateEmployeeRequest) => {
        try {
            setLoading(true);
            if (editingEmployee) {
                await employeeApi.updateEmployee(editingEmployee.id, data);
            } else {
                await employeeApi.createEmployee(data);
            }
            await loadEmployees();
            handleCloseDialog();
        } catch (err: any) {
            setError(err.message || 'Failed to save employee');
        } finally {
            setLoading(false);
        }
    };

    // Dialog handlers
    const handleOpenDialog = (employee?: Employee) => {
        if (employee) {
            setEditingEmployee(employee);
            reset({
                first_name: employee.first_name,
                last_name: employee.last_name,
                email: employee.email || '',
                phone: employee.phone || '',
                address: employee.address || '',
                date_of_birth: employee.date_of_birth || '',
                hire_date: employee.hire_date || new Date().toISOString().split('T')[0],
                department: employee.department || '',
                designation: employee.designation,
                employment_type: employee.employment_type,
                reporting_manager_id: employee.reporting_manager_id || '',
                base_salary: employee.base_salary,
                salary_type: employee.salary_type,
                bank_account_number: employee.bank_account_number || '',
                bank_name: employee.bank_name || '',
                bank_ifsc: employee.bank_ifsc || '',
                pan_number: employee.pan_number || '',
                aadhar_number: employee.aadhar_number || ''
            });
        } else {
            setEditingEmployee(null);
            reset({
                first_name: '',
                last_name: '',
                email: '',
                phone: '',
                address: '',
                date_of_birth: '',
                hire_date: new Date().toISOString().split('T')[0],
                department: '',
                designation: '',
                employment_type: 'FULL_TIME',
                reporting_manager_id: '',
                base_salary: 0,
                salary_type: 'MONTHLY',
                bank_account_number: '',
                bank_name: '',
                bank_ifsc: '',
                pan_number: '',
                aadhar_number: ''
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingEmployee(null);
        reset();
    };

    // Delete employee
    const handleDeleteEmployee = async (employee: Employee) => {
        if (window.confirm(`Are you sure you want to delete employee ${employee.first_name} ${employee.last_name}?`)) {
            try {
                setLoading(true);
                await employeeApi.deleteEmployee(employee.id);
                await loadEmployees();
            } catch (err: any) {
                setError(err.message || 'Failed to delete employee');
            } finally {
                setLoading(false);
            }
        }
    };

    // Menu handlers
    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, employee: Employee) => {
        setAnchorEl(event.currentTarget);
        setSelectedEmployee(employee);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedEmployee(null);
    };

    // Filter employees
    const filteredEmployees = employees.filter(employee => {
        const matchesSearch = searchTerm === '' || 
            employee.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            employee.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            employee.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            employee.department?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = filterStatus === 'all' || employee.employee_status === filterStatus;
        const matchesDepartment = filterDepartment === 'all' || employee.department === filterDepartment;
        
        return matchesSearch && matchesStatus && matchesDepartment;
    });

    // Get unique departments for filter
    const departments = Array.from(new Set(employees.map(e => e.department).filter(Boolean)));

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'success';
            case 'INACTIVE': return 'warning';
            case 'TERMINATED': return 'error';
            default: return 'default';
        }
    };

    const getEmploymentTypeColor = (type: string) => {
        switch (type) {
            case 'FULL_TIME': return 'primary';
            case 'PART_TIME': return 'secondary';
            case 'CONTRACT': return 'info';
            case 'INTERN': return 'warning';
            default: return 'default';
        }
    };

    return (
        <Box p={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" component="h1">
                    Employee Management
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Add />}
                    onClick={() => handleOpenDialog()}
                    disabled={loading}
                >
                    Add Employee
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                fullWidth
                                label="Search employees..."
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
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    label="Status"
                                >
                                    <MenuItem value="all">All Statuses</MenuItem>
                                    <MenuItem value="ACTIVE">Active</MenuItem>
                                    <MenuItem value="INACTIVE">Inactive</MenuItem>
                                    <MenuItem value="TERMINATED">Terminated</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <FormControl fullWidth>
                                <InputLabel>Department</InputLabel>
                                <Select
                                    value={filterDepartment}
                                    onChange={(e) => setFilterDepartment(e.target.value)}
                                    label="Department"
                                >
                                    <MenuItem value="all">All Departments</MenuItem>
                                    {departments.map(dept => (
                                        <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            <Card>
                <CardContent>
                    {loading ? (
                        <Box display="flex" justifyContent="center" p={3}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Employee Code</TableCell>
                                        <TableCell>Name</TableCell>
                                        <TableCell>Department</TableCell>
                                        <TableCell>Designation</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Salary</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredEmployees.map((employee) => (
                                        <TableRow key={employee.id} hover>
                                            <TableCell>
                                                <Box display="flex" alignItems="center">
                                                    <Badge sx={{ mr: 1 }} />
                                                    {employee.employee_code}
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Box>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {employee.first_name} {employee.last_name}
                                                    </Typography>
                                                    {employee.email && (
                                                        <Typography variant="caption" color="text.secondary" display="flex" alignItems="center">
                                                            <Email sx={{ fontSize: 12, mr: 0.5 }} />
                                                            {employee.email}
                                                        </Typography>
                                                    )}
                                                    {employee.phone && (
                                                        <Typography variant="caption" color="text.secondary" display="flex" alignItems="center">
                                                            <Phone sx={{ fontSize: 12, mr: 0.5 }} />
                                                            {employee.phone}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Box display="flex" alignItems="center">
                                                    <Business sx={{ mr: 1, fontSize: 16 }} />
                                                    {employee.department || 'N/A'}
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Box display="flex" alignItems="center">
                                                    <Work sx={{ mr: 1, fontSize: 16 }} />
                                                    {employee.designation}
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={employee.employment_type}
                                                    color={getEmploymentTypeColor(employee.employment_type) as any}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={employee.employee_status}
                                                    color={getStatusColor(employee.employee_status) as any}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Box display="flex" alignItems="center">
                                                    <AccountBalance sx={{ mr: 1, fontSize: 16 }} />
                                                    ₹{employee.base_salary.toLocaleString()} / {employee.salary_type}
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <IconButton
                                                    onClick={(e) => handleMenuOpen(e, employee)}
                                                    size="small"
                                                >
                                                    <MoreVert />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredEmployees.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={8} align="center">
                                                <Typography variant="body2" color="text.secondary" py={3}>
                                                    No employees found
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </CardContent>
            </Card>

            {/* Actions Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
            >
                <MenuItem onClick={() => {
                    if (selectedEmployee) handleOpenDialog(selectedEmployee);
                    handleMenuClose();
                }}>
                    <Edit sx={{ mr: 1 }} /> Edit
                </MenuItem>
                <MenuItem onClick={() => {
                    if (selectedEmployee) handleDeleteEmployee(selectedEmployee);
                    handleMenuClose();
                }}>
                    <Delete sx={{ mr: 1 }} /> Delete
                </MenuItem>
            </Menu>

            {/* Add/Edit Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>
                    {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
                </DialogTitle>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <DialogContent>
                        <Grid container spacing={2} sx={{ pt: 1 }}>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="hire_date"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Hire Date"
                                            type="date"
                                            InputLabelProps={{ shrink: true }}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="first_name"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="First Name"
                                            error={!!errors.first_name}
                                            helperText={errors.first_name?.message}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="last_name"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Last Name"
                                            error={!!errors.last_name}
                                            helperText={errors.last_name?.message}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="email"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Email"
                                            type="email"
                                            error={!!errors.email}
                                            helperText={errors.email?.message}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="phone"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Phone"
                                            error={!!errors.phone}
                                            helperText={errors.phone?.message}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <Controller
                                    name="address"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Address"
                                            multiline
                                            rows={2}
                                            error={!!errors.address}
                                            helperText={errors.address?.message}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="date_of_birth"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Date of Birth"
                                            type="date"
                                            InputLabelProps={{ shrink: true }}
                                            error={!!errors.date_of_birth}
                                            helperText={errors.date_of_birth?.message}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="department"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Department"
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="designation"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Designation"
                                            error={!!errors.designation}
                                            helperText={errors.designation?.message}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="employment_type"
                                    control={control}
                                    render={({ field }) => (
                                        <FormControl fullWidth>
                                            <InputLabel>Employment Type</InputLabel>
                                            <Select {...field} label="Employment Type">
                                                <MenuItem value="FULL_TIME">Full Time</MenuItem>
                                                <MenuItem value="PART_TIME">Part Time</MenuItem>
                                                <MenuItem value="CONTRACT">Contract</MenuItem>
                                                <MenuItem value="INTERN">Intern</MenuItem>
                                            </Select>
                                        </FormControl>
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="reporting_manager_id"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Reporting Manager ID"
                                            error={!!errors.reporting_manager_id}
                                            helperText={errors.reporting_manager_id?.message}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="base_salary"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Base Salary"
                                            type="number"
                                            error={!!errors.base_salary}
                                            helperText={errors.base_salary?.message}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="salary_type"
                                    control={control}
                                    render={({ field }) => (
                                        <FormControl fullWidth>
                                            <InputLabel>Salary Type</InputLabel>
                                            <Select {...field} label="Salary Type">
                                                <MenuItem value="MONTHLY">Monthly</MenuItem>
                                                <MenuItem value="DAILY">Daily</MenuItem>
                                                <MenuItem value="HOURLY">Hourly</MenuItem>
                                            </Select>
                                        </FormControl>
                                    )}
                                />
                            </Grid>
                            
                            <Grid size={{ xs: 12 }}>
                                <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                                    Banking & Tax Details
                                </Typography>
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="bank_account_number"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Bank Account Number"
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="bank_name"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Bank Name"
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="bank_ifsc"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="IFSC Code"
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="pan_number"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="PAN Number"
                                            error={!!errors.pan_number}
                                            helperText={errors.pan_number?.message || 'Format: ABCDE1234F'}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="aadhar_number"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Aadhaar Number"
                                            error={!!errors.aadhar_number}
                                            helperText={errors.aadhar_number?.message || '12-digit number'}
                                        />
                                    )}
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog}>Cancel</Button>
                        <Button type="submit" variant="contained" disabled={loading}>
                            {loading ? <CircularProgress size={20} /> : (editingEmployee ? 'Update' : 'Create')}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Box>
    );
};

export default Employees;