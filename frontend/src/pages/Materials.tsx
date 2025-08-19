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
    CircularProgress,
    Alert,
    TextField,
    InputAdornment,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Autocomplete,
    IconButton,
} from '@mui/material';
import {
    Add,
    Search,
    Inventory2,
    CalendarToday,
    Person,
    Category,
    Visibility,
    Edit,
    Delete,
    AddCircle,
    RemoveCircle,
} from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { MaterialIn, Customer } from '../types';
import { materialInApi, customerApi } from '../services/supabaseApi';
import { componentLogger } from '../utils/debug';

// Form validation schemas
const materialItemSchema = yup.object({
    material_type: yup.string().required('Material type is required'),
    quantity: yup.number().positive('Quantity must be positive').required('Quantity is required'),
    notes: yup.string(),
});

const materialTransactionSchema = yup.object({
    customer_id: yup.string().required('Customer is required'),
    received_date: yup.string().required('Received date is required'),
    items: yup.array().of(materialItemSchema).min(1, 'At least one material item is required'),
    transaction_notes: yup.string(),
});

const materialEditSchema = yup.object({
    material_type: yup.string().required('Material type is required'),
    quantity: yup.number().positive('Quantity must be positive').required('Quantity is required'),
    notes: yup.string(),
});

const materialTypes = [
    { value: 'saree', label: 'Saree' },
    { value: 'dupatta', label: 'Dupatta' },
    { value: 'voni', label: 'Voni' },
    { value: 'running_material', label: 'Running Material' },
    { value: 'blouse_material', label: 'Blouse Material' },
    { value: 'other', label: 'Other' },
];

const Materials: React.FC = () => {
    const [materials, setMaterials] = useState<MaterialIn[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState<MaterialIn | null>(null);

    // Create transaction form (multiple items)
    const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
        resolver: yupResolver(materialTransactionSchema),
        defaultValues: {
            customer_id: '',
            received_date: new Date().toISOString().split('T')[0],
            items: [{ material_type: 'saree', quantity: 1, notes: '' }],
            transaction_notes: '',
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items"
    });

    // Edit material form
    const { 
        control: editControl, 
        handleSubmit: handleEditSubmit, 
        reset: editReset, 
        formState: { errors: editErrors, isSubmitting: isEditSubmitting } 
    } = useForm({
        resolver: yupResolver(materialEditSchema),
        defaultValues: {
            material_type: 'saree',
            quantity: 1,
            notes: '',
        },
    });

    const loadMaterials = useCallback(async () => {
        componentLogger.info('Loading materials...');
        try {
            setLoading(true);
            const materialsData = await materialInApi.getMaterialIn();
            componentLogger.info('Materials loaded successfully', { count: materialsData.length });
            setMaterials(materialsData);
        } catch (error: any) {
            componentLogger.error('Failed to load materials', error);
            setError('Failed to load materials: ' + error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadCustomers = useCallback(async () => {
        componentLogger.info('Loading customers for materials...');
        try {
            const customersData = await customerApi.getCustomers();
            componentLogger.info('Customers loaded successfully for materials', { count: customersData.length });
            setCustomers(customersData);
        } catch (error: any) {
            componentLogger.error('Failed to load customers for materials', error);
            setError('Failed to load customers: ' + error.message);
        }
    }, []);

    useEffect(() => {
        loadMaterials();
        loadCustomers();
    }, [loadMaterials, loadCustomers]);

    useEffect(() => {
        if (error || success) {
            const timer = setTimeout(() => {
                setError(null);
                setSuccess(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [error, success]);

    const handleCreateMaterial = () => {
        componentLogger.info('Opening create material transaction dialog');
        reset({
            customer_id: '',
            received_date: new Date().toISOString().split('T')[0],
            items: [{ material_type: 'saree', quantity: 1, notes: '' }],
            transaction_notes: '',
        });
        setDialogOpen(true);
    };

    const handleEditMaterial = (material: MaterialIn) => {
        componentLogger.info('Opening edit material dialog', { materialId: material.id });
        setSelectedMaterial(material);
        editReset({
            material_type: material.material_type,
            quantity: material.quantity,
            notes: material.notes || '',
        });
        setEditDialogOpen(true);
    };

    const addMaterialItem = () => {
        append({ material_type: 'saree', quantity: 1, notes: '' });
    };

    const removeMaterialItem = (index: number) => {
        if (fields.length > 1) {
            remove(index);
        }
    };

    const onSubmit = async (data: any) => {
        componentLogger.info('Submitting material transaction', data);
        try {
            // Create multiple material entries for each item
            const promises = data.items.map((item: any) => {
                const materialData = {
                    customer_id: data.customer_id,
                    material_type: item.material_type,
                    quantity: Number(item.quantity),
                    received_date: data.received_date,
                    notes: item.notes || data.transaction_notes || '',
                };
                return materialInApi.createMaterialIn(materialData);
            });

            await Promise.all(promises);
            componentLogger.info('Material transaction created successfully');
            setSuccess(`Material transaction recorded successfully with ${data.items.length} items`);
            setDialogOpen(false);
            loadMaterials();
        } catch (error: any) {
            componentLogger.error('Failed to create material transaction', error);
            setError('Failed to record material transaction: ' + error.message);
        }
    };

    const onEditSubmit = async (data: any) => {
        if (!selectedMaterial) return;
        
        componentLogger.info('Submitting material edit', { materialId: selectedMaterial.id, data });
        try {
            await materialInApi.updateMaterialIn(selectedMaterial.id, {
                material_type: data.material_type,
                quantity: Number(data.quantity),
                notes: data.notes,
            });
            componentLogger.info('Material updated successfully');
            setSuccess('Material updated successfully');
            setEditDialogOpen(false);
            setSelectedMaterial(null);
            loadMaterials();
        } catch (error: any) {
            componentLogger.error('Failed to update material', error);
            setError('Failed to update material: ' + error.message);
        }
    };

    const handleDeleteMaterial = async (materialId: string) => {
        if (!window.confirm('Are you sure you want to delete this material record?')) {
            return;
        }
        
        componentLogger.info('Deleting material', { materialId });
        try {
            await materialInApi.deleteMaterialIn(materialId);
            componentLogger.info('Material deleted successfully');
            setSuccess('Material record deleted successfully');
            loadMaterials();
        } catch (error: any) {
            componentLogger.error('Failed to delete material', error);
            setError('Failed to delete material: ' + error.message);
        }
    };

    const filteredMaterials = materials.filter((material) =>
        material.material_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleViewMaterial = (material: MaterialIn) => {
        componentLogger.info('Viewing material details', { materialId: material.id });
        setSelectedMaterial(material);
        setViewDialogOpen(true);
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" fontWeight="bold">
                    Material Management
                </Typography>
                <Button variant="contained" startIcon={<Add />} onClick={handleCreateMaterial} sx={{ px: 3 }}>
                    Record Material In
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
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 3, mb: 3 }}>
                <Card>
                    <CardContent>
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            TOTAL MATERIALS
                        </Typography>
                        <Typography variant="h4" fontWeight="bold">
                            {materials.length}
                        </Typography>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            TOTAL QUANTITY
                        </Typography>
                        <Typography variant="h4" fontWeight="bold">
                            {materials.reduce((total, material) => total + (material.quantity || 0), 0)}
                        </Typography>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            UNIQUE CUSTOMERS
                        </Typography>
                        <Typography variant="h4" fontWeight="bold">
                            {new Set(materials.map(m => m.customer_id)).size}
                        </Typography>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            MATERIAL TYPES
                        </Typography>
                        <Typography variant="h4" fontWeight="bold">
                            {new Set(materials.map(m => m.material_type)).size}
                        </Typography>
                    </CardContent>
                </Card>
            </Box>

            {/* Search */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <TextField
                        fullWidth
                        placeholder="Search materials by type, customer, or notes..."
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

            {/* Materials Table */}
            <Card>
                <CardContent>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : filteredMaterials.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 8 }}>
                            <Inventory2 sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                            <Typography variant="h6" color="text.secondary">
                                {searchTerm ? 'No materials found matching your search' : 'No materials recorded yet'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                {searchTerm ? 'Try adjusting your search terms' : 'Record your first material intake to get started'}
                            </Typography>
                            {!searchTerm && (
                                <Button variant="contained" startIcon={<Add />} onClick={handleCreateMaterial}>
                                    Record First Material
                                </Button>
                            )}
                        </Box>
                    ) : (
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Customer</TableCell>
                                        <TableCell>Material Type</TableCell>
                                        <TableCell>Quantity</TableCell>
                                        <TableCell>Received Date</TableCell>
                                        <TableCell>Notes</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredMaterials.map((material) => (
                                        <TableRow key={material.id} hover>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <Person sx={{ mr: 1, color: 'text.secondary' }} />
                                                    {material.customer?.name || 'Unknown Customer'}
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <Category sx={{ mr: 1, color: 'text.secondary' }} />
                                                    {material.material_type}
                                                </Box>
                                            </TableCell>
                                            <TableCell>{material.quantity}</TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <CalendarToday sx={{ mr: 1, color: 'text.secondary', fontSize: 16 }} />
                                                    {new Date(material.received_date).toLocaleDateString()}
                                                </Box>
                                            </TableCell>
                                            <TableCell>{material.notes || '-'}</TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', gap: 1 }}>
                                                    <IconButton 
                                                        size="small" 
                                                        onClick={() => handleViewMaterial(material)}
                                                        title="View Material Details"
                                                    >
                                                        <Visibility />
                                                    </IconButton>
                                                    <IconButton 
                                                        size="small" 
                                                        onClick={() => handleEditMaterial(material)}
                                                        title="Edit Material"
                                                    >
                                                        <Edit />
                                                    </IconButton>
                                                    <IconButton 
                                                        size="small" 
                                                        onClick={() => handleDeleteMaterial(material.id)}
                                                        title="Delete Material"
                                                        color="error"
                                                    >
                                                        <Delete />
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

            {/* Create Material Transaction Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Record Material Transaction</DialogTitle>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <DialogContent>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {/* Customer and Date Selection */}
                            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                                <Controller
                                    name="customer_id"
                                    control={control}
                                    render={({ field: { onChange, value } }) => (
                                        <Autocomplete
                                            options={customers}
                                            getOptionLabel={(customer) => `${customer.name} (${customer.phone || customer.email})`}
                                            value={customers.find(c => c.id === value) || null}
                                            onChange={(_, customer) => onChange(customer?.id || '')}
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    label="Customer"
                                                    error={!!errors.customer_id}
                                                    helperText={errors.customer_id?.message}
                                                />
                                            )}
                                            loading={customers.length === 0}
                                            loadingText="Loading customers..."
                                            noOptionsText="No customers found"
                                            sx={{ flex: 1 }}
                                        />
                                    )}
                                />
                                
                                <Controller
                                    name="received_date"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            type="date"
                                            label="Received Date"
                                            InputLabelProps={{ shrink: true }}
                                            error={!!errors.received_date}
                                            helperText={errors.received_date?.message}
                                            sx={{ flex: 1 }}
                                        />
                                    )}
                                />
                            </Box>

                            {/* Material Items */}
                            <Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="h6">Material Items</Typography>
                                    <Button
                                        startIcon={<AddCircle />}
                                        onClick={addMaterialItem}
                                        variant="outlined"
                                        size="small"
                                    >
                                        Add Item
                                    </Button>
                                </Box>
                                
                                {fields.map((field, index) => (
                                    <Card key={field.id} variant="outlined" sx={{ mb: 2 }}>
                                        <CardContent>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                                <Typography variant="subtitle1">Item {index + 1}</Typography>
                                                {fields.length > 1 && (
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => removeMaterialItem(index)}
                                                        color="error"
                                                    >
                                                        <RemoveCircle />
                                                    </IconButton>
                                                )}
                                            </Box>
                                            
                                            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                                                <Controller
                                                    name={`items.${index}.material_type`}
                                                    control={control}
                                                    render={({ field }) => (
                                                        <FormControl fullWidth>
                                                            <InputLabel>Material Type</InputLabel>
                                                            <Select {...field} label="Material Type">
                                                                {materialTypes.map((type) => (
                                                                    <MenuItem key={type.value} value={type.value}>
                                                                        {type.label}
                                                                    </MenuItem>
                                                                ))}
                                                            </Select>
                                                        </FormControl>
                                                    )}
                                                />
                                                
                                                <Controller
                                                    name={`items.${index}.quantity`}
                                                    control={control}
                                                    render={({ field }) => (
                                                        <TextField
                                                            {...field}
                                                            type="number"
                                                            label="Quantity"
                                                            inputProps={{ min: 1 }}
                                                            sx={{ minWidth: 120 }}
                                                        />
                                                    )}
                                                />
                                            </Box>
                                            
                                            <Controller
                                                name={`items.${index}.notes`}
                                                control={control}
                                                render={({ field }) => (
                                                    <TextField
                                                        {...field}
                                                        fullWidth
                                                        label="Item Notes"
                                                        multiline
                                                        rows={2}
                                                        placeholder="Notes specific to this item..."
                                                        sx={{ mt: 2 }}
                                                    />
                                                )}
                                            />
                                        </CardContent>
                                    </Card>
                                ))}
                            </Box>

                            {/* Transaction Notes */}
                            <Controller
                                name="transaction_notes"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        fullWidth
                                        label="Transaction Notes"
                                        multiline
                                        rows={3}
                                        placeholder="General notes about this transaction..."
                                    />
                                )}
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="contained" disabled={isSubmitting}>
                            {isSubmitting ? 'Recording...' : 'Record Transaction'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* View Material Dialog */}
            <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Material Details</DialogTitle>
                <DialogContent>
                    {selectedMaterial && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {/* Material Information */}
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>Material Information</Typography>
                                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Material Type</Typography>
                                            <Typography variant="body1">
                                                {materialTypes.find(t => t.value === selectedMaterial.material_type)?.label || selectedMaterial.material_type}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Quantity</Typography>
                                            <Typography variant="body1">{selectedMaterial.quantity}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Received Date</Typography>
                                            <Typography variant="body1">{new Date(selectedMaterial.received_date).toLocaleDateString()}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Status</Typography>
                                            <Typography variant="body1">Received</Typography>
                                        </Box>
                                    </Box>
                                    {selectedMaterial.notes && (
                                        <Box sx={{ mt: 2 }}>
                                            <Typography variant="caption" color="text.secondary">Notes</Typography>
                                            <Typography variant="body1">{selectedMaterial.notes}</Typography>
                                        </Box>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Customer Information */}
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>Customer Information</Typography>
                                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Name</Typography>
                                            <Typography variant="body1">{selectedMaterial.customer?.name || 'N/A'}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Phone</Typography>
                                            <Typography variant="body1">{selectedMaterial.customer?.phone || 'N/A'}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Email</Typography>
                                            <Typography variant="body1">{selectedMaterial.customer?.email || 'N/A'}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Address</Typography>
                                            <Typography variant="body1">{selectedMaterial.customer?.address || 'N/A'}</Typography>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Edit Material Dialog */}
            <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Material</DialogTitle>
                <form onSubmit={handleEditSubmit(onEditSubmit)}>
                    <DialogContent>
                        {selectedMaterial && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <Alert severity="info">
                                    Editing material record for: {selectedMaterial.customer?.name}
                                </Alert>

                                {/* Material Type */}
                                <Controller
                                    name="material_type"
                                    control={editControl}
                                    render={({ field }) => (
                                        <FormControl fullWidth error={!!editErrors.material_type}>
                                            <InputLabel>Material Type</InputLabel>
                                            <Select {...field} label="Material Type">
                                                {materialTypes.map((type) => (
                                                    <MenuItem key={type.value} value={type.value}>
                                                        {type.label}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                            {editErrors.material_type && (
                                                <Typography variant="caption" color="error">
                                                    {editErrors.material_type.message}
                                                </Typography>
                                            )}
                                        </FormControl>
                                    )}
                                />

                                {/* Quantity */}
                                <Controller
                                    name="quantity"
                                    control={editControl}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            type="number"
                                            label="Quantity"
                                            fullWidth
                                            inputProps={{ min: 1 }}
                                            error={!!editErrors.quantity}
                                            helperText={editErrors.quantity?.message}
                                        />
                                    )}
                                />

                                {/* Notes */}
                                <Controller
                                    name="notes"
                                    control={editControl}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Notes"
                                            multiline
                                            rows={3}
                                            placeholder="Any additional notes about this material..."
                                        />
                                    )}
                                />
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="contained" disabled={isEditSubmitting}>
                            {isEditSubmitting ? 'Updating...' : 'Update Material'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Box>
    );
};

export default Materials;