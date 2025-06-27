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
} from '@mui/material';
import {
    Add,
    Search,
    Inventory as InventoryIcon,
    Warning,
    TrendingDown,
    Category,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';

// API service for inventory
const inventoryApi = {
    getInventory: async () => {
        const token = localStorage.getItem('access_token');
        const response = await fetch('https://jbms1.onrender.com/api/inventory/', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) throw new Error('Failed to fetch inventory');
        return response.json();
    },

    getLowStock: async () => {
        const token = localStorage.getItem('access_token');
        const response = await fetch('https://jbms1.onrender.com/api/inventory/low-stock', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) throw new Error('Failed to fetch low stock items');
        return response.json();
    },

    createItem: async (itemData: any) => {
        const token = localStorage.getItem('access_token');
        const response = await fetch('https://jbms1.onrender.com/api/inventory/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(itemData),
        });
        if (!response.ok) throw new Error('Failed to create inventory item');
        return response.json();
    },
};

const Inventory: React.FC = () => {
    const [items, setItems] = useState<any[]>([]);
    const [lowStockItems, setLowStockItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

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
        try {
            setLoading(true);
            const [inventoryData, lowStockData] = await Promise.all([
                inventoryApi.getInventory(),
                inventoryApi.getLowStock().catch(() => []),
            ]);
            setItems(inventoryData);
            setLowStockItems(lowStockData);
        } catch (error: any) {
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
            await inventoryApi.createItem(data);
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
                                            {category.charAt(0).toUpperCase() + category.slice(1)}
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
        </Box>
    );
};

export default Inventory; 