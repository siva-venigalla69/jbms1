import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
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
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Paper,
} from '@mui/material';
import {
    Search,
    Inventory2,
    Person,
    TrendingUp,
    TrendingDown,
    Warning,
    ExpandMore,
    Category,
} from '@mui/icons-material';
import { materialStockApi, customerApi } from '../services/supabaseApi';
import { componentLogger } from '../utils/debug';
import { Customer } from '../types';

interface MaterialStockRecord {
    id: string;
    customer_id: string;
    material_type: string;
    total_received: number;
    total_delivered: number;
    current_stock: number;
    last_updated: string;
    customer?: Customer;
}

const CustomerStock: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [stockRecords, setStockRecords] = useState<MaterialStockRecord[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<string>('');
    const [materialTypeFilter, setMaterialTypeFilter] = useState<string>('');

    const loadStockData = useCallback(async () => {
        componentLogger.info('Loading customer stock data...');
        try {
            setLoading(true);
            const [stockData, customersData] = await Promise.all([
                materialStockApi.getCustomerStock(),
                customerApi.getCustomers()
            ]);
            
            componentLogger.info('Stock data loaded', { stockCount: stockData.length });
            setStockRecords(stockData);
            setCustomers(customersData);
        } catch (error: any) {
            componentLogger.error('Failed to load stock data', error);
            setError('Failed to load stock data: ' + error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadStockData();
    }, [loadStockData]);

    // Filter stock records
    const filteredStockRecords = stockRecords.filter((record) => {
        const matchesSearch = 
            record.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.material_type.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCustomer = !selectedCustomer || record.customer_id === selectedCustomer;
        const matchesMaterial = !materialTypeFilter || record.material_type === materialTypeFilter;
        return matchesSearch && matchesCustomer && matchesMaterial;
    });

    // Group by customer for easier viewing
    const stockByCustomer = filteredStockRecords.reduce((acc, record) => {
        const customerId = record.customer_id;
        
        if (!acc[customerId]) {
            acc[customerId] = {
                customer: record.customer,
                records: [],
                totalReceived: 0,
                totalDelivered: 0,
                currentStock: 0
            };
        }
        
        acc[customerId].records.push(record);
        acc[customerId].totalReceived += record.total_received;
        acc[customerId].totalDelivered += record.total_delivered;
        acc[customerId].currentStock += record.current_stock;
        
        return acc;
    }, {} as any);

    // Calculate summary stats
    const totalMaterialsHeld = stockRecords.reduce((sum, record) => sum + record.current_stock, 0);
    const customersWithNegativeStock = Object.values(stockByCustomer).filter((customer: any) => customer.currentStock < 0);
    const customersWithStock = Object.values(stockByCustomer).filter((customer: any) => customer.currentStock > 0);
    const materialTypes = Array.from(new Set(stockRecords.map(record => record.material_type)));

    const getStockStatusColor = (stock: number) => {
        if (stock < 0) return 'error';
        if (stock === 0) return 'warning';
        return 'success';
    };

    const getStockStatusIcon = (stock: number) => {
        if (stock < 0) return <TrendingDown />;
        if (stock === 0) return <Warning />;
        return <TrendingUp />;
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Loading customer stock data...</Typography>
            </Box>
        );
    }

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" fontWeight="bold">
                    Customer Material Stock
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                    Track materials held for each customer
                </Typography>
            </Box>

            {/* Error Alert */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Summary Cards */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 3, mb: 3 }}>
                <Card>
                    <CardContent>
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            <Inventory2 sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Total Materials Held
                        </Typography>
                        <Typography variant="h4" fontWeight="bold" color="primary">
                            {totalMaterialsHeld}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Pieces across all customers
                        </Typography>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            <Person sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Customers with Stock
                        </Typography>
                        <Typography variant="h4" fontWeight="bold" color="success.main">
                            {customersWithStock.length}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Have materials with us
                        </Typography>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            <Warning sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Over-delivered
                        </Typography>
                        <Typography variant="h4" fontWeight="bold" color="error.main">
                            {customersWithNegativeStock.length}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Delivered more than received
                        </Typography>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            <Category sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Material Types
                        </Typography>
                        <Typography variant="h4" fontWeight="bold">
                            {materialTypes.length}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Different materials tracked
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
                                placeholder="Search by customer name or material type..."
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
                                <InputLabel>Customer</InputLabel>
                                <Select
                                    value={selectedCustomer}
                                    onChange={(e) => setSelectedCustomer(e.target.value)}
                                    label="Customer"
                                >
                                    <MenuItem value="">All Customers</MenuItem>
                                    {customers.map((customer) => (
                                        <MenuItem key={customer.id} value={customer.id}>
                                            {customer.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <FormControl fullWidth>
                                <InputLabel>Material Type</InputLabel>
                                <Select
                                    value={materialTypeFilter}
                                    onChange={(e) => setMaterialTypeFilter(e.target.value)}
                                    label="Material Type"
                                >
                                    <MenuItem value="">All Materials</MenuItem>
                                    {materialTypes.map((type) => (
                                        <MenuItem key={type} value={type}>
                                            {type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Unknown'}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {/* Customer Stock Accordion */}
            <Card>
                <CardContent>
                    {Object.keys(stockByCustomer).length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 8 }}>
                            <Inventory2 sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                            <Typography variant="h6" color="text.secondary">
                                No stock records found
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Stock records will appear here when materials are received and delivered
                            </Typography>
                        </Box>
                    ) : (
                        <Box>
                            <Typography variant="h6" gutterBottom>
                                Stock by Customer ({Object.keys(stockByCustomer).length} customers)
                            </Typography>
                            
                            {Object.entries(stockByCustomer).map(([customerId, customerData]: [string, any]) => (
                                <Accordion key={customerId} sx={{ mb: 1 }}>
                                    <AccordionSummary expandIcon={<ExpandMore />}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="h6">
                                                    {customerData.customer?.name || 'Unknown Customer'}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {customerData.customer?.phone && `Phone: ${customerData.customer.phone}`}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mr: 2 }}>
                                                <Chip
                                                    label={`Current: ${customerData.currentStock}`}
                                                    color={getStockStatusColor(customerData.currentStock)}
                                                    size="small"
                                                    icon={getStockStatusIcon(customerData.currentStock)}
                                                />
                                                <Typography variant="caption" color="text.secondary">
                                                    Received: {customerData.totalReceived} | Delivered: {customerData.totalDelivered}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <TableContainer component={Paper} variant="outlined">
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell>Material Type</TableCell>
                                                        <TableCell align="center">Received</TableCell>
                                                        <TableCell align="center">Delivered</TableCell>
                                                        <TableCell align="center">Current Stock</TableCell>
                                                        <TableCell>Last Updated</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {customerData.records.map((record: MaterialStockRecord) => (
                                                        <TableRow key={record.id}>
                                                            <TableCell>
                                                                <Typography variant="body2" fontWeight="medium">
                                                                    {record.material_type ? record.material_type.charAt(0).toUpperCase() + record.material_type.slice(1) : 'Unknown'}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <Typography variant="body2" color="primary">
                                                                    {record.total_received}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <Typography variant="body2" color="text.secondary">
                                                                    {record.total_delivered}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <Chip
                                                                    label={record.current_stock}
                                                                    color={getStockStatusColor(record.current_stock)}
                                                                    size="small"
                                                                    variant="outlined"
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {new Date(record.last_updated).toLocaleDateString()}
                                                                </Typography>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </AccordionDetails>
                                </Accordion>
                            ))}
                        </Box>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
};

export default CustomerStock;