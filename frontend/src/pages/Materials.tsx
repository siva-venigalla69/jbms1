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
    Category,
    Palette,
    Science,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';

// API service for materials
const materialsApi = {
    getMaterials: async () => {
        const token = localStorage.getItem('access_token');
        const response = await fetch('https://jbms1.onrender.com/api/materials/', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) throw new Error('Failed to fetch materials');
        return response.json();
    },

    createMaterial: async (materialData: any) => {
        const token = localStorage.getItem('access_token');
        const response = await fetch('https://jbms1.onrender.com/api/materials/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(materialData),
        });
        if (!response.ok) throw new Error('Failed to create material');
        return response.json();
    },

    updateMaterial: async (id: string, materialData: any) => {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`https://jbms1.onrender.com/api/materials/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(materialData),
        });
        if (!response.ok) throw new Error('Failed to update material');
        return response.json();
    },

    deleteMaterial: async (id: string) => {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`https://jbms1.onrender.com/api/materials/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) throw new Error('Failed to delete material');
        return response.json();
    },
};

const Materials: React.FC = () => {
    const [materials, setMaterials] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<any>(null);

    const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
        defaultValues: {
            name: '',
            type: '',
            color: '',
            cost_per_unit: 0,
            supplier: '',
            description: '',
        },
    });

    const loadMaterials = useCallback(async () => {
        try {
            setLoading(true);
            const data = await materialsApi.getMaterials();
            setMaterials(data);
        } catch (error: any) {
            setError('Failed to load materials: ' + error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadMaterials();
    }, [loadMaterials]);

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
        setEditingMaterial(null);
        reset({
            name: '',
            type: '',
            color: '',
            cost_per_unit: 0,
            supplier: '',
            description: '',
        });
        setDialogOpen(true);
    };

    const handleEditMaterial = (material: any) => {
        setEditingMaterial(material);
        reset({
            name: material.name,
            type: material.type,
            color: material.color || '',
            cost_per_unit: material.cost_per_unit,
            supplier: material.supplier || '',
            description: material.description || '',
        });
        setDialogOpen(true);
    };

    const handleDeleteMaterial = async (material: any) => {
        if (window.confirm(`Are you sure you want to delete ${material.name}?`)) {
            try {
                await materialsApi.deleteMaterial(material.id);
                setSuccess('Material deleted successfully');
                loadMaterials();
            } catch (error: any) {
                setError('Failed to delete material: ' + error.message);
            }
        }
    };

    const onSubmit = async (data: any) => {
        try {
            if (editingMaterial) {
                await materialsApi.updateMaterial(editingMaterial.id, data);
                setSuccess('Material updated successfully');
            } else {
                await materialsApi.createMaterial(data);
                setSuccess('Material created successfully');
            }
            setDialogOpen(false);
            loadMaterials();
        } catch (error: any) {
            setError('Failed to save material: ' + error.message);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type.toLowerCase()) {
            case 'dye':
            case 'pigment':
                return <Palette />;
            case 'chemical':
                return <Science />;
            default:
                return <Category />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type.toLowerCase()) {
            case 'dye':
                return 'primary';
            case 'pigment':
                return 'secondary';
            case 'chemical':
                return 'warning';
            case 'auxiliary':
                return 'info';
            default:
                return 'default';
        }
    };

    const types = Array.from(new Set(materials.map(material => material.type))).filter(Boolean);

    const filteredMaterials = materials.filter((material) => {
        const matchesSearch = material.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            material.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            material.color?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = !typeFilter || material.type === typeFilter;
        return matchesSearch && matchesType;
    });

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" fontWeight="bold">
                    Materials & Chemicals
                </Typography>
                <Button variant="contained" startIcon={<Add />} onClick={handleCreateMaterial} sx={{ px: 3 }}>
                    Add Material
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
                            Total Materials
                        </Typography>
                        <Typography variant="h4" fontWeight="bold">
                            {materials.length}
                        </Typography>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            Material Types
                        </Typography>
                        <Typography variant="h4" fontWeight="bold">
                            {types.length}
                        </Typography>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            Dyes & Pigments
                        </Typography>
                        <Typography variant="h4" fontWeight="bold">
                            {materials.filter(m => ['dye', 'pigment'].includes(m.type?.toLowerCase())).length}
                        </Typography>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            Chemicals
                        </Typography>
                        <Typography variant="h4" fontWeight="bold">
                            {materials.filter(m => m.type?.toLowerCase() === 'chemical').length}
                        </Typography>
                    </CardContent>
                </Card>
            </Box>

            {/* Search and Filters */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                        <Box sx={{ flex: 2 }}>
                            <TextField
                                fullWidth
                                placeholder="Search materials by name, type, or color..."
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
                                <InputLabel>Material Type</InputLabel>
                                <Select
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    label="Material Type"
                                >
                                    <MenuItem value="">All Types</MenuItem>
                                    {types.map((type) => (
                                        <MenuItem key={type} value={type}>
                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                    </Box>
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
                            <Palette sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                            <Typography variant="h6" color="text.secondary">
                                {searchTerm || typeFilter ? 'No materials found matching your criteria' : 'No materials yet'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                {searchTerm || typeFilter ? 'Try adjusting your search or filters' : 'Add your first material to get started'}
                            </Typography>
                            {!searchTerm && !typeFilter && (
                                <Button variant="contained" startIcon={<Add />} onClick={handleCreateMaterial}>
                                    Add First Material
                                </Button>
                            )}
                        </Box>
                    ) : (
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Material Name</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Color</TableCell>
                                        <TableCell>Cost per Unit</TableCell>
                                        <TableCell>Supplier</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredMaterials.map((material) => (
                                        <TableRow key={material.id} hover>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    {getTypeIcon(material.type)}
                                                    <Typography sx={{ ml: 1 }}>{material.name}</Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={material.type}
                                                    color={getTypeColor(material.type) as any}
                                                    variant="outlined"
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    {material.color && (
                                                        <Box
                                                            sx={{
                                                                width: 20,
                                                                height: 20,
                                                                borderRadius: '50%',
                                                                backgroundColor: material.color.toLowerCase(),
                                                                border: '1px solid #ccc',
                                                                mr: 1,
                                                            }}
                                                        />
                                                    )}
                                                    {material.color || 'N/A'}
                                                </Box>
                                            </TableCell>
                                            <TableCell>₹{parseFloat(material.cost_per_unit).toFixed(2)}</TableCell>
                                            <TableCell>{material.supplier || 'N/A'}</TableCell>
                                            <TableCell>
                                                <Button size="small" onClick={() => handleEditMaterial(material)} sx={{ mr: 1 }}>
                                                    Edit
                                                </Button>
                                                <Button size="small" color="error" onClick={() => handleDeleteMaterial(material)}>
                                                    Delete
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </CardContent>
            </Card>

            {/* Create/Edit Material Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>{editingMaterial ? 'Edit Material' : 'Add New Material'}</DialogTitle>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <DialogContent>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                                <Controller
                                    name="name"
                                    control={control}
                                    rules={{ required: 'Material name is required' }}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Material Name"
                                            error={!!errors.name}
                                            helperText={errors.name?.message}
                                        />
                                    )}
                                />
                                <Controller
                                    name="type"
                                    control={control}
                                    rules={{ required: 'Material type is required' }}
                                    render={({ field }) => (
                                        <FormControl fullWidth error={!!errors.type}>
                                            <InputLabel>Material Type</InputLabel>
                                            <Select {...field} label="Material Type">
                                                <MenuItem value="dye">Dye</MenuItem>
                                                <MenuItem value="pigment">Pigment</MenuItem>
                                                <MenuItem value="chemical">Chemical</MenuItem>
                                                <MenuItem value="auxiliary">Auxiliary</MenuItem>
                                                <MenuItem value="other">Other</MenuItem>
                                            </Select>
                                            {errors.type && (
                                                <Typography variant="caption" color="error">
                                                    {errors.type.message}
                                                </Typography>
                                            )}
                                        </FormControl>
                                    )}
                                />
                            </Box>
                            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                                <Controller
                                    name="color"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Color"
                                            placeholder="e.g., Red, Blue, #FF0000"
                                        />
                                    )}
                                />
                                <Controller
                                    name="cost_per_unit"
                                    control={control}
                                    rules={{ required: 'Cost per unit is required' }}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Cost per Unit (₹)"
                                            type="number"
                                            error={!!errors.cost_per_unit}
                                            helperText={errors.cost_per_unit?.message}
                                        />
                                    )}
                                />
                            </Box>
                            <Controller
                                name="supplier"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        fullWidth
                                        label="Supplier"
                                        placeholder="Supplier name or company"
                                    />
                                )}
                            />
                            <Controller
                                name="description"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        fullWidth
                                        label="Description"
                                        multiline
                                        rows={3}
                                        placeholder="Material description, usage instructions, etc."
                                    />
                                )}
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="contained" disabled={isSubmitting}>
                            {isSubmitting ? (editingMaterial ? 'Updating...' : 'Creating...') : (editingMaterial ? 'Update' : 'Create')}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Box>
    );
};

export default Materials; 