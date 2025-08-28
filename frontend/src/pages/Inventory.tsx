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
    TextField,
    InputAdornment,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    IconButton,
} from '@mui/material';
import {
    Add,
    Search,
    Inventory as InventoryIcon,
    Warning,
    Category,
    Visibility,
    Edit,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { inventoryApi } from '../services/supabaseApi';
import { componentLogger } from '../utils/debug';

const Inventory: React.FC = () => {
    const [items, setItems] = useState<any[]>([]);
    const [lowStockItems, setLowStockItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);

    const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
        defaultValues: {
            item_name: '',
            category: '',
            current_stock: 0,
            unit: 'kg',
            reorder_level: 0,
            cost_per_unit: 0,
            supplier_name: '',
            supplier_contact: '',
        },
    });

    const loadInventory = useCallback(async () => {
        componentLogger.info('Loading inventory...');
        try {
            setLoading(true);
            const inventoryData = await inventoryApi.getInventory();
            componentLogger.info('Inventory loaded successfully', { count: inventoryData.length });
            setItems(inventoryData);
            
            // Calculate low stock items (items where quantity < reorder_level)
            const lowStock = inventoryData.filter((item: any) => 
                item.quantity < (item.reorder_level || 10)
            );
            setLowStockItems(lowStock);
        } catch (error: any) {
            componentLogger.error('Failed to load inventory', error);
            setError('Failed to load inventory: ' + error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadInventory();
    }, [loadInventory]);

    useEffect(() => {
        if (error || success) {
            const timer = setTimeout(() => {
                setError(null);
                setSuccess(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [error, success]);

    const handleCreateItem = () => {
        reset();
        setDialogOpen(true);
    };

    const onSubmit = async (data: any) => {
        try {
            await inventoryApi.createInventoryItem(data);
            setSuccess('Inventory item created successfully');
            setDialogOpen(false);
            loadInventory();
        } catch (error: any) {
            setError('Failed to create inventory item: ' + error.message);
        }
    };

    const getStockStatus = (item: any) => {
        const stockLevel = parseFloat(item.current_stock);
        const reorderLevel = parseFloat(item.reorder_level);

        if (stockLevel <= reorderLevel) {
            return { label: 'Low Stock', color: 'error' as const };
        } else if (stockLevel <= reorderLevel * 1.5) {
            return { label: 'Low', color: 'warning' as const };
        } else {
            return { label: 'Good', color: 'success' as const };
        }
    };

    const categories = Array.from(new Set(items.map(item => item.category))).filter(Boolean);

    const filteredItems = items.filter((item) => {
        const matchesSearch = item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.category?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = !categoryFilter || item.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const totalValue = items.reduce((sum, item) => sum + (parseFloat(item.current_stock) * parseFloat(item.cost_per_unit)), 0);

    const handleViewItem = (item: any) => {
        componentLogger.info('Viewing inventory item details', { itemId: item.id });
        setSelectedItem(item);
        setViewDialogOpen(true);
    };

    const handleEditItem = (item: any) => {
        componentLogger.info('Editing inventory item', { itemId: item.id });
        setSelectedItem(item);
        reset({
            item_name: item.item_name || '',
            category: item.category || '',
            current_stock: item.current_stock || 0,
            unit: item.unit || 'kg',
            reorder_level: item.reorder_level || 0,
            cost_per_unit: item.cost_per_unit || 0,
            supplier_name: item.supplier_name || '',
            supplier_contact: item.supplier_contact || '',
        });
        setEditDialogOpen(true);
    };

    const handleUpdateItem = async (data: any) => {
        if (!selectedItem) return;
        
        try {
            await inventoryApi.updateInventoryItem(selectedItem.id, data);
            setSuccess('Inventory item updated successfully');
            setEditDialogOpen(false);
            setSelectedItem(null);
            loadInventory();
        } catch (error: any) {
            setError('Failed to update inventory item: ' + error.message);
        }
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" fontWeight="bold">
                    Inventory Management
                </Typography>
                <Button variant="contained" startIcon={<Add />} onClick={handleCreateItem} sx={{ px: 3 }}>
                    Add Item
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
                            Total Items
                        </Typography>
                        <Typography variant="h4" fontWeight="bold">
                            {items.length}
                        </Typography>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            Low Stock Items
                        </Typography>
                        <Typography variant="h4" fontWeight="bold" color="error.main">
                            {lowStockItems.length}
                        </Typography>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            Categories
                        </Typography>
                        <Typography variant="h4" fontWeight="bold">
                            {categories.length}
                        </Typography>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            Total Value
                        </Typography>
                        <Typography variant="h4" fontWeight="bold">
                            ₹{totalValue.toFixed(2)}
                        </Typography>
                    </CardContent>
                </Card>
            </Box>

            {/* Low Stock Alert */}
            {lowStockItems.length > 0 && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                        ⚠️ {lowStockItems.length} items are running low on stock!
                    </Typography>
                    <Typography variant="body2">
                        Items: {lowStockItems.map(item => item.item_name).join(', ')}
                    </Typography>
                </Alert>
            )}

            {/* Search and Filters */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                        <Box sx={{ flex: 2 }}>
                            <TextField
                                fullWidth
                                placeholder="Search items by name or category..."
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
                        <Box sx={{ flex: 1 }}>
                            <FormControl fullWidth>
                                <InputLabel>Category</InputLabel>
                                <Select
                                    value={categoryFilter}
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                    label="Category"
                                >
                                    <MenuItem value="">All Categories</MenuItem>
                                    {categories.map((category) => (
                                        <MenuItem key={category} value={category}>
                                            {category ? category.charAt(0).toUpperCase() + category.slice(1) : 'Unknown'}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {/* Inventory Table */}
            <Card>
                <CardContent>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : filteredItems.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 8 }}>
                            <InventoryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                            <Typography variant="h6" color="text.secondary">
                                {searchTerm || categoryFilter ? 'No items found matching your criteria' : 'No inventory items yet'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                {searchTerm || categoryFilter ? 'Try adjusting your search or filters' : 'Add your first inventory item to get started'}
                            </Typography>
                            {!searchTerm && !categoryFilter && (
                                <Button variant="contained" startIcon={<Add />} onClick={handleCreateItem}>
                                    Add First Item
                                </Button>
                            )}
                        </Box>
                    ) : (
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Item Name</TableCell>
                                        <TableCell>Category</TableCell>
                                        <TableCell>Current Stock</TableCell>
                                        <TableCell>Unit</TableCell>
                                        <TableCell>Reorder Level</TableCell>
                                        <TableCell>Cost per Unit</TableCell>
                                        <TableCell>Total Value</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredItems.map((item) => {
                                        const status = getStockStatus(item);
                                        const currentStock = parseFloat(item.current_stock);
                                        const costPerUnit = parseFloat(item.cost_per_unit);
                                        const totalValue = currentStock * costPerUnit;

                                        return (
                                            <TableRow key={item.id} hover>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <InventoryIcon sx={{ mr: 1, color: 'text.secondary' }} />
                                                        {item.item_name}
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={item.category}
                                                        variant="outlined"
                                                        size="small"
                                                        icon={<Category />}
                                                    />
                                                </TableCell>
                                                <TableCell>{currentStock}</TableCell>
                                                <TableCell>{item.unit}</TableCell>
                                                <TableCell>{parseFloat(item.reorder_level)}</TableCell>
                                                <TableCell>₹{costPerUnit.toFixed(2)}</TableCell>
                                                <TableCell>₹{totalValue.toFixed(2)}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={status.label}
                                                        color={status.color}
                                                        variant="outlined"
                                                        size="small"
                                                        icon={status.color === 'error' ? <Warning /> : undefined}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                                        <IconButton 
                                                            size="small" 
                                                            onClick={() => handleViewItem(item)}
                                                            title="View Item Details"
                                                        >
                                                            <Visibility />
                                                        </IconButton>
                                                        <IconButton 
                                                            size="small" 
                                                            onClick={() => handleEditItem(item)}
                                                            title="Edit Item"
                                                        >
                                                            <Edit />
                                                        </IconButton>
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </CardContent>
            </Card>

            {/* Create Item Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Add New Inventory Item</DialogTitle>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <DialogContent>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                                <Controller
                                    name="item_name"
                                    control={control}
                                    rules={{ required: 'Item name is required' }}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Item Name"
                                            error={!!errors.item_name}
                                            helperText={errors.item_name?.message}
                                        />
                                    )}
                                />
                                <Controller
                                    name="category"
                                    control={control}
                                    rules={{ required: 'Category is required' }}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Category"
                                            error={!!errors.category}
                                            helperText={errors.category?.message}
                                        />
                                    )}
                                />
                            </Box>
                            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                                <Controller
                                    name="current_stock"
                                    control={control}
                                    rules={{ required: 'Current stock is required' }}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Current Stock"
                                            type="number"
                                            error={!!errors.current_stock}
                                            helperText={errors.current_stock?.message}
                                        />
                                    )}
                                />
                                <Controller
                                    name="unit"
                                    control={control}
                                    render={({ field }) => (
                                        <FormControl fullWidth>
                                            <InputLabel>Unit</InputLabel>
                                            <Select {...field} label="Unit">
                                                <MenuItem value="kg">Kilograms (kg)</MenuItem>
                                                <MenuItem value="liters">Liters</MenuItem>
                                                <MenuItem value="pieces">Pieces</MenuItem>
                                                <MenuItem value="meters">Meters</MenuItem>
                                                <MenuItem value="grams">Grams</MenuItem>
                                            </Select>
                                        </FormControl>
                                    )}
                                />
                            </Box>
                            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                                <Controller
                                    name="reorder_level"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Reorder Level"
                                            type="number"
                                        />
                                    )}
                                />
                                <Controller
                                    name="cost_per_unit"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Cost per Unit (₹)"
                                            type="number"
                                        />
                                    )}
                                />
                            </Box>
                            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                                <Controller
                                    name="supplier_name"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Supplier Name"
                                        />
                                    )}
                                />
                                <Controller
                                    name="supplier_contact"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Supplier Contact"
                                        />
                                    )}
                                />
                            </Box>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="contained" disabled={isSubmitting}>
                            {isSubmitting ? 'Creating...' : 'Create Item'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* View Item Dialog */}
            <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <InventoryIcon />
                        <Typography variant="h6">Inventory Item Details</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {selectedItem && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <Card variant="outlined">
                                        <CardContent>
                                            <Typography variant="h6" gutterBottom color="primary">
                                                Basic Information
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">Item Name</Typography>
                                            <Typography variant="body1" sx={{ mb: 2 }}>{selectedItem.item_name}</Typography>
                                            
                                            <Typography variant="body2" color="text.secondary">Category</Typography>
                                            <Typography variant="body1" sx={{ mb: 2 }}>
                                                <Chip label={selectedItem.category} variant="outlined" size="small" icon={<Category />} />
                                            </Typography>
                                            
                                            <Typography variant="body2" color="text.secondary">Unit</Typography>
                                            <Typography variant="body1">{selectedItem.unit}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>

                                <Grid size={{ xs: 12, md: 6 }}>
                                    <Card variant="outlined">
                                        <CardContent>
                                            <Typography variant="h6" gutterBottom color="primary">
                                                Stock Information
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">Current Stock</Typography>
                                            <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
                                                {selectedItem.current_stock} {selectedItem.unit}
                                            </Typography>
                                            
                                            <Typography variant="body2" color="text.secondary">Reorder Level</Typography>
                                            <Typography variant="body1" sx={{ mb: 2 }}>{selectedItem.reorder_level}</Typography>
                                            
                                            <Typography variant="body2" color="text.secondary">Stock Status</Typography>
                                            <Box sx={{ mb: 2 }}>
                                                {(() => {
                                                    const status = getStockStatus(selectedItem);
                                                    return (
                                                        <Chip
                                                            label={status.label}
                                                            color={status.color}
                                                            variant="outlined"
                                                            icon={status.color === 'error' ? <Warning /> : undefined}
                                                        />
                                                    );
                                                })()}
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>

                                <Grid size={{ xs: 12, md: 6 }}>
                                    <Card variant="outlined">
                                        <CardContent>
                                            <Typography variant="h6" gutterBottom color="primary">
                                                Financial Information
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">Cost per Unit</Typography>
                                            <Typography variant="body1" sx={{ mb: 2 }}>₹{parseFloat(selectedItem.cost_per_unit).toFixed(2)}</Typography>
                                            
                                            <Typography variant="body2" color="text.secondary">Total Value</Typography>
                                            <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                                                ₹{(parseFloat(selectedItem.current_stock) * parseFloat(selectedItem.cost_per_unit)).toFixed(2)}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>

                                <Grid size={{ xs: 12, md: 6 }}>
                                    <Card variant="outlined">
                                        <CardContent>
                                            <Typography variant="h6" gutterBottom color="primary">
                                                Supplier Information
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">Supplier Name</Typography>
                                            <Typography variant="body1" sx={{ mb: 2 }}>
                                                {selectedItem.supplier_name || 'Not specified'}
                                            </Typography>
                                            
                                            <Typography variant="body2" color="text.secondary">Supplier Contact</Typography>
                                            <Typography variant="body1">
                                                {selectedItem.supplier_contact || 'Not specified'}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
                    <Button 
                        variant="contained" 
                        startIcon={<Edit />} 
                        onClick={() => {
                            setViewDialogOpen(false);
                            handleEditItem(selectedItem);
                        }}
                    >
                        Edit Item
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Item Dialog */}
            <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Edit Inventory Item</DialogTitle>
                <form onSubmit={handleSubmit(handleUpdateItem)}>
                    <DialogContent>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                                <Controller
                                    name="item_name"
                                    control={control}
                                    rules={{ required: 'Item name is required' }}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Item Name"
                                            error={!!errors.item_name}
                                            helperText={errors.item_name?.message}
                                        />
                                    )}
                                />
                                <Controller
                                    name="category"
                                    control={control}
                                    rules={{ required: 'Category is required' }}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Category"
                                            error={!!errors.category}
                                            helperText={errors.category?.message}
                                        />
                                    )}
                                />
                            </Box>
                            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                                <Controller
                                    name="current_stock"
                                    control={control}
                                    rules={{ required: 'Current stock is required' }}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Current Stock"
                                            type="number"
                                            error={!!errors.current_stock}
                                            helperText={errors.current_stock?.message}
                                        />
                                    )}
                                />
                                <Controller
                                    name="unit"
                                    control={control}
                                    render={({ field }) => (
                                        <FormControl fullWidth>
                                            <InputLabel>Unit</InputLabel>
                                            <Select {...field} label="Unit">
                                                <MenuItem value="kg">Kilograms (kg)</MenuItem>
                                                <MenuItem value="liters">Liters</MenuItem>
                                                <MenuItem value="pieces">Pieces</MenuItem>
                                                <MenuItem value="meters">Meters</MenuItem>
                                                <MenuItem value="grams">Grams</MenuItem>
                                            </Select>
                                        </FormControl>
                                    )}
                                />
                            </Box>
                            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                                <Controller
                                    name="reorder_level"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Reorder Level"
                                            type="number"
                                        />
                                    )}
                                />
                                <Controller
                                    name="cost_per_unit"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Cost per Unit (₹)"
                                            type="number"
                                        />
                                    )}
                                />
                            </Box>
                            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                                <Controller
                                    name="supplier_name"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Supplier Name"
                                        />
                                    )}
                                />
                                <Controller
                                    name="supplier_contact"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Supplier Contact"
                                        />
                                    )}
                                />
                            </Box>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="contained" disabled={isSubmitting}>
                            {isSubmitting ? 'Updating...' : 'Update Item'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Box>
    );
};

export default Inventory; 