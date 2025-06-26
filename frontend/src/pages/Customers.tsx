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
    LocationOn,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Customer, CustomerCreate } from '../types';
import { customerApi } from '../services/api';

const customerSchema: yup.ObjectSchema<CustomerCreate> = yup.object({
    name: yup.string().required('Customer name is required'),
    phone: yup.string().matches(/^[0-9]*$/, 'Phone number must contain only digits').optional(),
    email: yup.string().email('Invalid email format').optional(),
    address: yup.string().optional(),
    gst_number: yup.string().optional(),
});

const Customers: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<CustomerCreate>({
        resolver: yupResolver(customerSchema),
        defaultValues: {
            name: '',
            phone: '',
            email: '',
            address: '',
            gst_number: '',
        },
    });

    // Load customers
    const loadCustomers = useCallback(async () => {
        try {
            setLoading(true);
            const data = await customerApi.getCustomers({ search: searchTerm });
            setCustomers(data);
        } catch (error: any) {
            setError('Failed to load customers');
        } finally {
            setLoading(false);
        }
    }, [searchTerm]);

    useEffect(() => {
        loadCustomers();
    }, [loadCustomers]);

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

    const handleCreateCustomer = () => {
        setEditingCustomer(null);
        reset({
            name: '',
            phone: '',
            email: '',
            address: '',
            gst_number: '',
        });
        setDialogOpen(true);
    };

    const handleEditCustomer = (customer: Customer) => {
        setEditingCustomer(customer);
        reset({
            name: customer.name,
            phone: customer.phone || '',
            email: customer.email || '',
            address: customer.address || '',
            gst_number: customer.gst_number || '',
        });
        setDialogOpen(true);
    };

    const handleDeleteCustomer = async (customer: Customer) => {
        if (window.confirm(`Are you sure you want to delete ${customer.name}?`)) {
            try {
                await customerApi.deleteCustomer(customer.id);
                setSuccess('Customer deleted successfully');
                loadCustomers();
            } catch (error: any) {
                setError('Failed to delete customer');
            }
        }
    };

    const onSubmit = async (data: CustomerCreate) => {
        try {
            if (editingCustomer) {
                await customerApi.updateCustomer(editingCustomer.id, data);
                setSuccess('Customer updated successfully');
            } else {
                await customerApi.createCustomer(data);
                setSuccess('Customer created successfully');
            }
            setDialogOpen(false);
            loadCustomers();
        } catch (error: any) {
            setError(
                error.response?.data?.detail || 'Failed to save customer'
            );
        }
    };

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, customer: Customer) => {
        setAnchorEl(event.currentTarget);
        setSelectedCustomer(customer);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedCustomer(null);
    };

    const filteredCustomers = customers.filter(
        (customer) =>
            customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (customer.phone && customer.phone.includes(searchTerm))
    );

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" fontWeight="bold">
                    Customer Management
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={handleCreateCustomer}
                    sx={{ px: 3 }}
                >
                    Add Customer
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

            {/* Search */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <TextField
                        fullWidth
                        placeholder="Search customers by name or phone..."
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
                </CardContent>
            </Card>

            {/* Customers Table */}
            <Card>
                <CardContent>
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
                                            <Typography fontWeight="600">Customer</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography fontWeight="600">Contact</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography fontWeight="600">Address</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography fontWeight="600">GST Number</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography fontWeight="600">Created</Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography fontWeight="600">Actions</Typography>
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredCustomers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                                <Typography color="text.secondary">
                                                    {searchTerm ? 'No customers found matching your search' : 'No customers found'}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredCustomers.map((customer) => (
                                            <TableRow key={customer.id} hover>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <Person sx={{ mr: 1, color: 'primary.main' }} />
                                                        <Typography fontWeight="500">{customer.name}</Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Box>
                                                        {customer.phone && (
                                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                                                <Phone sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                                                                <Typography variant="body2">{customer.phone}</Typography>
                                                            </Box>
                                                        )}
                                                        {customer.email && (
                                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                                <Email sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                                                                <Typography variant="body2">{customer.email}</Typography>
                                                            </Box>
                                                        )}
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    {customer.address ? (
                                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                            <LocationOn sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                                                            <Typography variant="body2">{customer.address}</Typography>
                                                        </Box>
                                                    ) : (
                                                        <Typography variant="body2" color="text.secondary">
                                                            -
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {customer.gst_number ? (
                                                        <Chip
                                                            label={customer.gst_number}
                                                            variant="outlined"
                                                            size="small"
                                                            icon={<Business />}
                                                        />
                                                    ) : (
                                                        <Typography variant="body2" color="text.secondary">
                                                            -
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {new Date(customer.created_at).toLocaleDateString()}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <IconButton
                                                        onClick={(e) => handleMenuOpen(e, customer)}
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
            </Card>

            {/* Actions Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
            >
                <MenuItem
                    onClick={() => {
                        if (selectedCustomer) {
                            handleEditCustomer(selectedCustomer);
                        }
                        handleMenuClose();
                    }}
                >
                    <Edit sx={{ mr: 1 }} />
                    Edit
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        if (selectedCustomer) {
                            handleDeleteCustomer(selectedCustomer);
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
                    {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                </DialogTitle>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <DialogContent>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="name"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Customer Name *"
                                            error={!!errors.name}
                                            helperText={errors.name?.message}
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
                                            label="Phone Number"
                                            error={!!errors.phone}
                                            helperText={errors.phone?.message}
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
                                            label="Email Address"
                                            type="email"
                                            error={!!errors.email}
                                            helperText={errors.email?.message}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="gst_number"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="GST Number"
                                            error={!!errors.gst_number}
                                            helperText={errors.gst_number?.message}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={12}>
                                <Controller
                                    name="address"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Address"
                                            multiline
                                            rows={3}
                                            error={!!errors.address}
                                            helperText={errors.address?.message}
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
                            {editingCustomer ? 'Update' : 'Create'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Box>
    );
};

export default Customers; 