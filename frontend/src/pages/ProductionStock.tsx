import React, { useState, useEffect } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tabs,
  Tab,
  Grid,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  Search,
  MoveDown,
  CheckCircle,
  Factory,
  Refresh,
  Info,
  Clear,
  Image as ImageIcon,
  Warning,
  Person,
} from '@mui/icons-material';
import { simplifiedApi, MaterialStock, Customer, SIMPLE_ENUMS } from '../services/simplifiedApi';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const ProductionStock: React.FC = () => {
  const [stockData, setStockData] = useState<MaterialStock[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTab, setCurrentTab] = useState(0);
  const [materialTypeFilter, setMaterialTypeFilter] = useState<string>('all');

  // Dialog states
  const [moveStockDialogOpen, setMoveStockDialogOpen] = useState(false);
  const [designDialogOpen, setDesignDialogOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<MaterialStock | null>(null);

  // Move stock form
  const [moveToStage, setMoveToStage] = useState<string>('');
  const [moveQuantity, setMoveQuantity] = useState<number>(0);

  // Design form - UPDATED for new tracking
  const [designsGiven, setDesignsGiven] = useState<number>(0);
  const [designNotes, setDesignNotes] = useState('');

  // Material types
  const [materialTypes, setMaterialTypes] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [stock, customerData, types] = await Promise.all([
        simplifiedApi.stock.getAll(),
        simplifiedApi.customers.getAll(),
        simplifiedApi.materialTypes.getAll(),
      ]);
      setStockData(stock);
      setCustomers(customerData);
      setMaterialTypes(types.map(t => t.type_code));
      setError(null);
    } catch (err: any) {
      setError('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getCustomerName = (customerId: string | null): string => {
    if (!customerId) return 'Own Stock';
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || 'Unknown Customer';
  };

  const handleMoveStock = async () => {
    if (!selectedStock || !moveToStage || moveQuantity <= 0) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      await simplifiedApi.stock.moveToStage({
        customer_id: selectedStock.customer_id,
        order_id: selectedStock.order_id,
        material_type: selectedStock.material_type,
        from_stage: selectedStock.stage,
        to_stage: moveToStage,
        quantity: moveQuantity,
        ownership: selectedStock.ownership
      });

      setSuccess(`Moved ${moveQuantity} ${selectedStock.material_type} from ${selectedStock.stage} to ${moveToStage}`);
      setMoveStockDialogOpen(false);
      setSelectedStock(null);
      setMoveToStage('');
      setMoveQuantity(0);
      loadData();
    } catch (err: any) {
      setError('Failed to move stock: ' + err.message);
    }
  };

  const handleUpdateDesign = async () => {
    if (!selectedStock) return;

    try {
      // Call backend function to update design count
      // For now using the old API, would need new endpoint
      await simplifiedApi.stock.updateDesignStatus({
        customer_id: selectedStock.customer_id,
        order_id: selectedStock.order_id,
        material_type: selectedStock.material_type,
        stage: selectedStock.stage,
        designs_available: designsGiven > 0,
        design_notes: `${designsGiven} designs given. ${designNotes}`
      });

      setSuccess(`Updated design status for ${selectedStock.material_type}`);
      setDesignDialogOpen(false);
      setSelectedStock(null);
      loadData();
    } catch (err: any) {
      setError('Failed to update design status: ' + err.message);
    }
  };

  const openMoveDialog = (stock: MaterialStock) => {
    setSelectedStock(stock);
    setMoveQuantity(stock.quantity);
    setMoveToStage(getNextStage(stock.stage));
    setMoveStockDialogOpen(true);
  };

  const openDesignDialog = (stock: MaterialStock) => {
    setSelectedStock(stock);
    // TODO: designs_given is in material_design_tracking, not material_stock
    // Need to fetch from design tracking table
    setDesignsGiven(0);
    setDesignNotes('');
    setDesignDialogOpen(true);
  };

  const getNextStage = (currentStage: string): string => {
    const stages = [
      SIMPLE_ENUMS.STAGE.RECEIVED,
      SIMPLE_ENUMS.STAGE.PREPROCESSING,
      SIMPLE_ENUMS.STAGE.PRINTING,
      SIMPLE_ENUMS.STAGE.POSTPROCESSING,
      SIMPLE_ENUMS.STAGE.COMPLETED
    ];
    const currentIndex = stages.indexOf(currentStage as any);
    return currentIndex >= 0 && currentIndex < stages.length - 1 ? stages[currentIndex + 1] : currentStage;
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case SIMPLE_ENUMS.STAGE.RECEIVED:
        return 'default';
      case SIMPLE_ENUMS.STAGE.PREPROCESSING:
        return 'info';
      case SIMPLE_ENUMS.STAGE.PRINTING:
        return 'primary';
      case SIMPLE_ENUMS.STAGE.POSTPROCESSING:
        return 'secondary';
      case SIMPLE_ENUMS.STAGE.COMPLETED:
        return 'success';
      case SIMPLE_ENUMS.STAGE.MISPRINT:
        return 'error';
      case SIMPLE_ENUMS.STAGE.DAMAGED:
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStockByTab = (tabIndex: number): MaterialStock[] => {
    let stageFilter: string | null = null;

    switch (tabIndex) {
      case 0: stageFilter = null; break;
      case 1: stageFilter = SIMPLE_ENUMS.STAGE.RECEIVED; break;
      case 2: stageFilter = SIMPLE_ENUMS.STAGE.PREPROCESSING; break;
      case 3: stageFilter = SIMPLE_ENUMS.STAGE.PRINTING; break;
      case 4: stageFilter = SIMPLE_ENUMS.STAGE.POSTPROCESSING; break;
      case 5: stageFilter = SIMPLE_ENUMS.STAGE.COMPLETED; break;
      case 6: stageFilter = SIMPLE_ENUMS.STAGE.MISPRINT; break;
    }

    return stockData.filter(stock => {
      const matchesStage = !stageFilter || stock.stage === stageFilter;
      const matchesMaterial = materialTypeFilter === 'all' || stock.material_type === materialTypeFilter;
      const customerName = getCustomerName(stock.customer_id);
      const matchesSearch = !searchTerm ||
        stock.material_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customerName.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesStage && matchesMaterial && matchesSearch;
    });
  };

  const getSummaryStats = () => {
    const stats = {
      received: 0,
      preprocessing: 0,
      printing: 0,
      postprocessing: 0,
      completed: 0,
      misprint: 0,
      total: 0,
      designsPending: 0,
    };

    stockData.forEach(stock => {
      stats.total += stock.quantity;
      // TODO: designs_pending is in material_design_tracking, not material_stock
      // stats.designsPending += stock.designs_pending || 0;

      switch (stock.stage) {
        case SIMPLE_ENUMS.STAGE.RECEIVED:
          stats.received += stock.quantity;
          break;
        case SIMPLE_ENUMS.STAGE.PREPROCESSING:
          stats.preprocessing += stock.quantity;
          break;
        case SIMPLE_ENUMS.STAGE.PRINTING:
          stats.printing += stock.quantity;
          break;
        case SIMPLE_ENUMS.STAGE.POSTPROCESSING:
          stats.postprocessing += stock.quantity;
          break;
        case SIMPLE_ENUMS.STAGE.COMPLETED:
          stats.completed += stock.quantity;
          break;
        case SIMPLE_ENUMS.STAGE.MISPRINT:
          stats.misprint += stock.quantity;
          break;
      }
    });

    return stats;
  };

  const stats = getSummaryStats();
  const filteredStock = getStockByTab(currentTab);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Production Stock Management
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadData}
          disabled={loading}
        >
          Refresh
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

      {/* Designs Pending Alert */}
      {stats.designsPending > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }} icon={<Warning />}>
          <Typography variant="body2">
            <strong>{stats.designsPending} items</strong> are pending designs from customers. Follow up needed!
          </Typography>
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Total Stock
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {stats.total}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'warning.50' }}>
            <CardContent>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Designs Pending
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="warning.dark">
                {stats.designsPending}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Need customer follow-up
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'info.50' }}>
            <CardContent>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                In Production
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="info.dark">
                {stats.preprocessing + stats.printing + stats.postprocessing}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'success.50' }}>
            <CardContent>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Completed
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="success.dark">
                {stats.completed}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ready for delivery
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
            <TextField
              fullWidth
              placeholder="Search by customer, material type, or notes..."
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
                    <IconButton size="small" onClick={() => setSearchTerm('')}>
                      <Clear />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ flex: 2 }}
            />

            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Material Type</InputLabel>
              <Select
                value={materialTypeFilter}
                onChange={(e) => setMaterialTypeFilter(e.target.value)}
                label="Material Type"
              >
                <MenuItem value="all">All Materials</MenuItem>
                {materialTypes.map(type => (
                  <MenuItem key={type} value={type}>{type.toUpperCase()}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {/* Stage Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={currentTab}
            onChange={(e, newValue) => setCurrentTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label={`All (${stats.total})`} />
            <Tab label={`Received (${stats.received})`} />
            <Tab label={`Preprocessing (${stats.preprocessing})`} />
            <Tab label={`Printing (${stats.printing})`} />
            <Tab label={`Postprocessing (${stats.postprocessing})`} />
            <Tab label={`Completed (${stats.completed})`} />
            <Tab label={`Misprint (${stats.misprint})`} />
          </Tabs>
        </Box>

        {/* Stock Table */}
        <TabPanel value={currentTab} index={currentTab}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredStock.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Factory sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No stock found
              </Typography>
            </Box>
          ) : (
            <TableContainer sx={{ maxHeight: '60vh' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Customer</TableCell>
                    <TableCell>Material</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Stage</TableCell>
                    <TableCell>Ownership</TableCell>
                    <TableCell>Designs Given</TableCell>
                    <TableCell>Designs Pending</TableCell>
                    <TableCell>Notes</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredStock.map((stock) => {
                    // TODO: designs_given should come from material_design_tracking, not material_stock
                    const designsGivenCount = 0;
                    const designCompletion = stock.quantity > 0
                      ? (designsGivenCount / stock.quantity) * 100
                      : 0;

                    return (
                      <TableRow key={stock.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Person fontSize="small" color="action" />
                            <Typography variant="body2" fontWeight="medium">
                              {getCustomerName(stock.customer_id)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {stock.material_type.toUpperCase()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={stock.quantity}
                            color="primary"
                            variant="outlined"
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={stock.stage.replace('_', ' ').toUpperCase()}
                            color={getStageColor(stock.stage) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={stock.ownership.toUpperCase()}
                            variant="outlined"
                            size="small"
                            color={stock.ownership === 'customer' ? 'info' : 'secondary'}
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Design tracking unavailable in this view">
                            <Box>
                              <Typography variant="body2" fontWeight="medium" color="text.disabled">
                                N/A
                              </Typography>
                              <LinearProgress
                                variant="determinate"
                                value={0}
                                sx={{ height: 4, borderRadius: 2, mt: 0.5 }}
                                color="inherit"
                              />
                            </Box>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.disabled">
                            N/A
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.disabled" noWrap sx={{ maxWidth: 150 }}>
                            N/A
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                            <IconButton
                              size="small"
                              onClick={() => openDesignDialog(stock)}
                              title="Update Designs"
                              color="secondary"
                            >
                              <ImageIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => openMoveDialog(stock)}
                              title="Move Stock"
                              color="primary"
                            >
                              <MoveDown fontSize="small" />
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
        </TabPanel>
      </Card>

      {/* Move Stock Dialog */}
      <Dialog open={moveStockDialogOpen} onClose={() => setMoveStockDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Move Stock to Next Stage</DialogTitle>
        <DialogContent>
          {selectedStock && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
              <Alert severity="info">
                Moving <strong>{selectedStock.material_type.toUpperCase()}</strong> from <strong>{selectedStock.stage}</strong>
              </Alert>

              <TextField
                label="Quantity to Move"
                type="number"
                value={moveQuantity}
                onChange={(e) => setMoveQuantity(Number(e.target.value))}
                inputProps={{ min: 1, max: selectedStock.quantity }}
                fullWidth
                helperText={`Available: ${selectedStock.quantity}`}
              />

              <FormControl fullWidth>
                <InputLabel>Move to Stage</InputLabel>
                <Select
                  value={moveToStage}
                  onChange={(e) => setMoveToStage(e.target.value)}
                  label="Move to Stage"
                >
                  <MenuItem value={SIMPLE_ENUMS.STAGE.PREPROCESSING}>Preprocessing</MenuItem>
                  <MenuItem value={SIMPLE_ENUMS.STAGE.PRINTING}>Printing</MenuItem>
                  <MenuItem value={SIMPLE_ENUMS.STAGE.POSTPROCESSING}>Postprocessing</MenuItem>
                  <MenuItem value={SIMPLE_ENUMS.STAGE.COMPLETED}>Completed (Quality Passed)</MenuItem>
                  <MenuItem value={SIMPLE_ENUMS.STAGE.MISPRINT}>Misprint (Quality Failed)</MenuItem>
                  <MenuItem value={SIMPLE_ENUMS.STAGE.DAMAGED}>Damaged</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMoveStockDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleMoveStock} variant="contained">
            Move Stock
          </Button>
        </DialogActions>
      </Dialog>

      {/* Design Update Dialog */}
      <Dialog open={designDialogOpen} onClose={() => setDesignDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Design Count</DialogTitle>
        <DialogContent>
          {selectedStock && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
              <Alert severity="info">
                Customer: <strong>{getCustomerName(selectedStock.customer_id)}</strong><br />
                Material: <strong>{selectedStock.material_type.toUpperCase()}</strong><br />
                Total Quantity: <strong>{selectedStock.quantity}</strong>
              </Alert>

              <TextField
                label="Number of Designs Given by Customer"
                type="number"
                value={designsGiven}
                onChange={(e) => setDesignsGiven(Number(e.target.value))}
                inputProps={{ min: 0, max: selectedStock.quantity }}
                fullWidth
                helperText={`Pending: ${selectedStock.quantity - designsGiven} designs`}
              />

              <TextField
                label="Design Notes"
                value={designNotes}
                onChange={(e) => setDesignNotes(e.target.value)}
                multiline
                rows={3}
                fullWidth
                placeholder="E.g., Customer gave 30 unique designs, we prepared 40 total (10 repeated)"
              />

              {(selectedStock.quantity - designsGiven) > 0 && (
                <Alert severity="warning">
                  <Typography variant="body2">
                    <strong>{selectedStock.quantity - designsGiven} designs still pending</strong> from customer.
                    Remember to follow up!
                  </Typography>
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDesignDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateDesign} variant="contained">
            Update Designs
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductionStock;
