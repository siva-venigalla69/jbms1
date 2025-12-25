import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  CardMedia,
  Tooltip,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Palette,
  Add,
  Search,
  Edit,
  Delete,
  Visibility,
  CloudUpload,
  Image,
  Code,
  Category,
  AccessTime,
  CheckCircle,
  Clear,
  Refresh,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { designerApi } from '../services/supabaseApi';
import { componentLogger } from '../utils/debug';

// Types
interface DesignLibraryItem {
  id: string;
  design_name: string;
  design_category: string;
  design_code: string;
  design_file_url?: string;
  design_thumbnail_url?: string;
  design_description?: string;
  material_compatibility: string[];
  complexity_level: 'simple' | 'medium' | 'complex';
  estimated_hours: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Form validation schema
const designSchema = yup.object({
  design_name: yup.string().required('Design name is required'),
  design_category: yup.string().required('Category is required'),
  design_code: yup.string().required('Design code is required'),
  design_file_url: yup.string().url('Must be a valid URL'),
  design_thumbnail_url: yup.string().url('Must be a valid URL'),
  design_description: yup.string(),
  material_compatibility: yup.array().min(1, 'Select at least one material type'),
  complexity_level: yup.string().required('Complexity level is required'),
  estimated_hours: yup.number().positive('Hours must be positive').required('Estimated hours required'),
  is_active: yup.boolean(),
});

const DesignLibrary: React.FC = () => {
  // State
  const [designs, setDesigns] = useState<DesignLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [complexityFilter, setComplexityFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDesign, setEditingDesign] = useState<DesignLibraryItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [designToDelete, setDesignToDelete] = useState<DesignLibraryItem | null>(null);

  // Material types available in the system
  const materialTypes = ['saree', 'dupatta', 'voni', 'blouse', 'lehenga', 'kurta', 'salwar'];
  const categories = ['traditional', 'modern', 'wedding', 'party', 'casual', 'bridal', 'festive'];
  const complexityLevels = [
    { value: 'simple', label: 'Simple (1-2 hours)', color: 'success' },
    { value: 'medium', label: 'Medium (2-4 hours)', color: 'warning' },
    { value: 'complex', label: 'Complex (4+ hours)', color: 'error' },
  ];

  // Form
  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(designSchema),
    defaultValues: {
      design_name: '',
      design_category: '',
      design_code: '',
      design_file_url: '',
      design_thumbnail_url: '',
      design_description: '',
      material_compatibility: [],
      complexity_level: 'medium',
      estimated_hours: 2.0,
      is_active: true,
    },
  });

  // Load designs
  const loadDesigns = useCallback(async () => {
    componentLogger.info('Loading design library...');
    try {
      setLoading(true);
      const designsData = await designerApi.getDesignLibrary();
      setDesigns(designsData);
      
      componentLogger.info('Design library loaded successfully', { 
        designs: designsData.length
      });
    } catch (error: any) {
      componentLogger.error('Failed to load design library', error);
      setError('Failed to load design library: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDesigns();
  }, [loadDesigns]);

  // Clear alerts
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Handle create/edit design
  const handleCreateDesign = () => {
    setEditingDesign(null);
    reset({
      design_name: '',
      design_category: '',
      design_code: '',
      design_file_url: '',
      design_thumbnail_url: '',
      design_description: '',
      material_compatibility: [],
      complexity_level: 'medium',
      estimated_hours: 2.0,
      is_active: true,
    });
    setDialogOpen(true);
  };

  const handleEditDesign = (design: DesignLibraryItem) => {
    setEditingDesign(design);
    reset({
      design_name: design.design_name,
      design_category: design.design_category,
      design_code: design.design_code,
      design_file_url: design.design_file_url || '',
      design_thumbnail_url: design.design_thumbnail_url || '',
      design_description: design.design_description || '',
      material_compatibility: design.material_compatibility,
      complexity_level: design.complexity_level,
      estimated_hours: design.estimated_hours,
      is_active: design.is_active,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: any) => {
    try {
      if (editingDesign) {
        await designerApi.updateDesign(editingDesign.id, data);
        setSuccess('Design updated successfully');
      } else {
        await designerApi.createDesign(data);
        setSuccess('Design created successfully');
      }
      
      setDialogOpen(false);
      setEditingDesign(null);
      loadDesigns();
    } catch (error: any) {
      setError(`Failed to ${editingDesign ? 'update' : 'create'} design: ` + error.message);
    }
  };

  // Handle delete
  const handleDeleteDesign = (design: DesignLibraryItem) => {
    setDesignToDelete(design);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!designToDelete) return;

    try {
      await designerApi.deleteDesign(designToDelete.id);
      setSuccess('Design deleted successfully');
      setDeleteDialogOpen(false);
      setDesignToDelete(null);
      loadDesigns();
    } catch (error: any) {
      setError('Failed to delete design: ' + error.message);
    }
  };

  // Filtering
  const filteredDesigns = designs.filter((design) => {
    const matchesSearch = searchTerm === '' || (
      design.design_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      design.design_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      design.design_category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      design.design_description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const matchesCategory = categoryFilter === 'all' || design.design_category === categoryFilter;
    const matchesComplexity = complexityFilter === 'all' || design.complexity_level === complexityFilter;
    
    return matchesSearch && matchesCategory && matchesComplexity;
  });

  // Helper functions
  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple': return 'success';
      case 'medium': return 'warning';
      case 'complex': return 'error';
      default: return 'default';
    }
  };

  const getComplexityIcon = (complexity: string) => {
    switch (complexity) {
      case 'simple': return <CheckCircle />;
      case 'medium': return <AccessTime />;
      case 'complex': return <Palette />;
      default: return <Code />;
    }
  };

  // Statistics
  const stats = {
    total: designs.length,
    active: designs.filter(d => d.is_active).length,
    byCategory: categories.reduce((acc, cat) => ({
      ...acc,
      [cat]: designs.filter(d => d.design_category === cat).length
    }), {} as Record<string, number>),
    byComplexity: complexityLevels.reduce((acc, level) => ({
      ...acc,
      [level.value]: designs.filter(d => d.complexity_level === level.value).length
    }), {} as Record<string, number>),
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Palette />
          Design Library
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            onClick={loadDesigns}
            disabled={loading}
            startIcon={<Refresh />}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateDesign}
            startIcon={<Add />}
          >
            Add Design
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

      {/* Statistics Cards */}
      <Box sx={{  display: "flex", gap: 3, flexWrap: "wrap" ,  mb: 3  }}>
        <Box sx={{ flex: "1 1 300px", minWidth: "250px" }}>
          <Card sx={{ bgcolor: 'primary.50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="primary.main">
                    {stats.total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Designs
                  </Typography>
                </Box>
                <Palette sx={{ fontSize: 48, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Box>
        
        <Box sx={{ flex: "1 1 300px", minWidth: "250px" }}>
          <Card sx={{ bgcolor: 'success.50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    {stats.active}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Designs
                  </Typography>
                </Box>
                <CheckCircle sx={{ fontSize: 48, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Box>
        
        <Box sx={{ flex: "1 1 300px", minWidth: "250px" }}>
          <Card sx={{ bgcolor: 'warning.50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="warning.main">
                    {stats.byComplexity.complex || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Complex Designs
                  </Typography>
                </Box>
                <Palette sx={{ fontSize: 48, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Box>
        
        <Box sx={{ flex: "1 1 300px", minWidth: "250px" }}>
          <Card sx={{ bgcolor: 'info.50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="info.main">
                    {categories.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Categories
                  </Typography>
                </Box>
                <Category sx={{ fontSize: 48, color: 'info.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Search & Filters</Typography>
          
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }} alignItems="center">
            <Box sx={{ flex: "1 1 300px" }}>
              <TextField
                fullWidth
                placeholder="Search designs, codes, categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton 
                        size="small" 
                        onClick={() => setSearchTerm('')}
                        title="Clear search"
                      >
                        <Clear />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            
            <Box sx={{ flex: "1 1 300px" }}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  label="Category"
                >
                  <MenuItem value="all">All Categories</MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)} ({stats.byCategory[category] || 0})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ flex: "1 1 300px" }}>
              <FormControl fullWidth>
                <InputLabel>Complexity</InputLabel>
                <Select
                  value={complexityFilter}
                  onChange={(e) => setComplexityFilter(e.target.value)}
                  label="Complexity"
                >
                  <MenuItem value="all">All Complexity Levels</MenuItem>
                  {complexityLevels.map((level) => (
                    <MenuItem key={level.value} value={level.value}>
                      {level.label} ({stats.byComplexity[level.value] || 0})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Designs Grid */}
      <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        {filteredDesigns.length === 0 ? (
          <Box sx={{ width: "100%" }}>
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Palette sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                {searchTerm || categoryFilter !== 'all' || complexityFilter !== 'all' 
                  ? 'No designs found matching your criteria' 
                  : 'No designs in library'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {searchTerm || categoryFilter !== 'all' || complexityFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Start building your design library by adding your first design'}
              </Typography>
              {(searchTerm || categoryFilter !== 'all' || complexityFilter !== 'all') ? (
                <Button 
                  variant="outlined" 
                  onClick={() => { 
                    setSearchTerm(''); 
                    setCategoryFilter('all'); 
                    setComplexityFilter('all');
                  }}
                >
                  Clear All Filters
                </Button>
              ) : (
                <Button 
                  variant="contained" 
                  onClick={handleCreateDesign}
                  startIcon={<Add />}
                >
                  Add Your First Design
                </Button>
              )}
            </Box>
          </Box>
        ) : (
          filteredDesigns.map((design) => (
            <Box key={design.id} sx={{ flex: "1 1 300px" }}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Thumbnail */}
                {design.design_thumbnail_url ? (
                  <CardMedia
                    component="img"
                    height="200"
                    image={design.design_thumbnail_url}
                    alt={design.design_name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <Box 
                    sx={{ 
                      height: 200, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      bgcolor: 'grey.100',
                      color: 'grey.500'
                    }}
                  >
                    <Image sx={{ fontSize: 48 }} />
                  </Box>
                )}
                
                <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {/* Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight="bold" noWrap>
                        {design.design_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {design.design_code}
                      </Typography>
                    </Box>
                    <Chip
                      label={design.is_active ? 'Active' : 'Inactive'}
                      color={design.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>

                  {/* Category and Complexity */}
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip
                      label={design.design_category}
                      color="primary"
                      size="small"
                      variant="outlined"
                      icon={<Category />}
                    />
                    <Chip
                      label={design.complexity_level}
                      color={getComplexityColor(design.complexity_level) as any}
                      size="small"
                      variant="outlined"
                      icon={getComplexityIcon(design.complexity_level)}
                    />
                  </Box>

                  {/* Description */}
                  {design.design_description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flex: 1 }}>
                      {design.design_description.length > 100 
                        ? design.design_description.substring(0, 100) + '...'
                        : design.design_description
                      }
                    </Typography>
                  )}

                  {/* Material Compatibility */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      Compatible Materials:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {design.material_compatibility.slice(0, 3).map((material) => (
                        <Chip
                          key={material}
                          label={material}
                          size="small"
                          variant="outlined"
                          color="secondary"
                        />
                      ))}
                      {design.material_compatibility.length > 3 && (
                        <Chip
                          label={`+${design.material_compatibility.length - 3}`}
                          size="small"
                          variant="outlined"
                          color="default"
                        />
                      )}
                    </Box>
                  </Box>

                  {/* Time Estimate */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {design.estimated_hours}h estimated
                    </Typography>
                  </Box>

                  {/* Actions */}
                  <Box sx={{ display: 'flex', gap: 1, mt: 'auto' }}>
                    {design.design_file_url && (
                      <Tooltip title="View Design File">
                        <IconButton
                          size="small"
                          onClick={() => window.open(design.design_file_url, '_blank')}
                          color="primary"
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Edit Design">
                      <IconButton
                        size="small"
                        onClick={() => handleEditDesign(design)}
                        color="primary"
                      >
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Design">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteDesign(design)}
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          ))
        )}
      </Box>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Palette />
            <Typography variant="h6">
              {editingDesign ? 'Edit Design' : 'Add New Design'}
            </Typography>
          </Box>
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
              <Box sx={{ flex: "1 1 400px" }}>
                <Controller
                  name="design_name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Design Name"
                      placeholder="Traditional Paisley Pattern"
                      error={!!errors.design_name}
                      helperText={errors.design_name?.message}
                      required
                    />
                  )}
                />
              </Box>
              
              <Box sx={{ flex: "1 1 400px" }}>
                <Controller
                  name="design_code"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Design Code"
                      placeholder="TRAD_PAIS_001"
                      error={!!errors.design_code}
                      helperText={errors.design_code?.message}
                      required
                    />
                  )}
                />
              </Box>
              
              <Box sx={{ flex: "1 1 400px" }}>
                <Controller
                  name="design_category"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.design_category} required>
                      <InputLabel>Category</InputLabel>
                      <Select {...field} label="Category">
                        {categories.map((category) => (
                          <MenuItem key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.design_category && (
                        <Typography variant="caption" color="error">
                          {errors.design_category.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />
              </Box>
              
              <Box sx={{ flex: "1 1 400px" }}>
                <Controller
                  name="complexity_level"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.complexity_level} required>
                      <InputLabel>Complexity Level</InputLabel>
                      <Select {...field} label="Complexity Level">
                        {complexityLevels.map((level) => (
                          <MenuItem key={level.value} value={level.value}>
                            {level.label}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.complexity_level && (
                        <Typography variant="caption" color="error">
                          {errors.complexity_level.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />
              </Box>
              
              <Box sx={{ flex: "1 1 400px" }}>
                <Controller
                  name="estimated_hours"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="number"
                      label="Estimated Hours"
                      inputProps={{ min: 0.5, step: 0.5 }}
                      error={!!errors.estimated_hours}
                      helperText={errors.estimated_hours?.message}
                      required
                    />
                  )}
                />
              </Box>
              
              <Box sx={{ flex: "1 1 400px" }}>
                <FormControl fullWidth error={!!errors.material_compatibility} required>
                  <InputLabel>Material Compatibility</InputLabel>
                  <Controller
                    name="material_compatibility"
                    control={control}
                    render={({ field }) => (
                      <Select
                        {...field}
                        multiple
                        label="Material Compatibility"
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((value: string) => (
                              <Chip key={value} label={value} size="small" />
                            ))}
                          </Box>
                        )}
                      >
                        {materialTypes.map((material) => (
                          <MenuItem key={material} value={material}>
                            {material.charAt(0).toUpperCase() + material.slice(1)}
                          </MenuItem>
                        ))}
                      </Select>
                    )}
                  />
                  {errors.material_compatibility && (
                    <Typography variant="caption" color="error">
                      {errors.material_compatibility.message}
                    </Typography>
                  )}
                </FormControl>
              </Box>
              
              <Box sx={{ flex: "1 1 400px" }}>
                <Controller
                  name="design_file_url"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Design File URL"
                      placeholder="https://example.com/design.pdf"
                      error={!!errors.design_file_url}
                      helperText={errors.design_file_url?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <CloudUpload />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Box>
              
              <Box sx={{ flex: "1 1 400px" }}>
                <Controller
                  name="design_thumbnail_url"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Thumbnail URL"
                      placeholder="https://example.com/thumbnail.jpg"
                      error={!!errors.design_thumbnail_url}
                      helperText={errors.design_thumbnail_url?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Image />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Box>
              
              <Box sx={{ width: "100%" }}>
                <Controller
                  name="design_description"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Description"
                      multiline
                      rows={3}
                      placeholder="Describe the design pattern, style, and any special features..."
                    />
                  )}
                />
              </Box>
              
              <Box sx={{ width: "100%" }}>
                <Controller
                  name="is_active"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label="Active Design (available for assignments)"
                    />
                  )}
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (editingDesign ? 'Update Design' : 'Create Design')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm">
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Delete color="error" />
            <Typography variant="h6">Delete Design</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {designToDelete && (
            <Alert severity="warning">
              Are you sure you want to delete "{designToDelete.design_name}" ({designToDelete.design_code})?
              <br /><br />
              This action cannot be undone. Any assignments using this design will lose the reference.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete Design
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DesignLibrary;