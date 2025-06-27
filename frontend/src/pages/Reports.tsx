import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
} from '@mui/material';
import {
    Download,
    Assessment,
    TrendingUp,
    Inventory,
    People,
    ShoppingCart,
    LocalAtm,
} from '@mui/icons-material';

// API service for reports
const reportsApi = {
    getSalesReport: async (params: any) => {
        const token = localStorage.getItem('access_token');
        const queryParams = new URLSearchParams(params).toString();
        const response = await fetch(`https://jbms1.onrender.com/api/reports/sales?${queryParams}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) throw new Error('Failed to fetch sales report');
        return response.json();
    },

    getInventoryReport: async () => {
        const token = localStorage.getItem('access_token');
        const response = await fetch('https://jbms1.onrender.com/api/reports/inventory', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) throw new Error('Failed to fetch inventory report');
        return response.json();
    },

    getCustomerReport: async () => {
        const token = localStorage.getItem('access_token');
        const response = await fetch('https://jbms1.onrender.com/api/reports/customers', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) throw new Error('Failed to fetch customer report');
        return response.json();
    },
};

// Simple inventory and customer data fetching as fallback
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
};

const customerApi = {
    getCustomers: async () => {
        const token = localStorage.getItem('access_token');
        const response = await fetch('https://jbms1.onrender.com/api/customers/', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) throw new Error('Failed to fetch customers');
        return response.json();
    },
};

const Reports: React.FC = () => {
    const [inventoryData, setInventoryData] = useState<any[]>([]);
    const [customerData, setCustomerData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedReport, setSelectedReport] = useState('inventory');

    const loadReports = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            if (selectedReport === 'inventory' || selectedReport === 'all') {
                try {
                    const data = await inventoryApi.getInventory();
                    setInventoryData(data);
                } catch (err) {
                    console.error('Failed to load inventory:', err);
                }
            }

            if (selectedReport === 'customers' || selectedReport === 'all') {
                try {
                    const data = await customerApi.getCustomers();
                    setCustomerData(data);
                } catch (err) {
                    console.error('Failed to load customers:', err);
                }
            }
        } catch (error: any) {
            setError('Failed to load reports: ' + error.message);
        } finally {
            setLoading(false);
        }
    }, [selectedReport]);

    useEffect(() => {
        loadReports();
    }, [loadReports]);

    const handleDownloadReport = () => {
        alert('Download functionality would be implemented here');
    };

    const reportCards = [
        {
            title: 'Inventory Report',
            icon: <Inventory />,
            onClick: () => setSelectedReport('inventory'),
            active: selectedReport === 'inventory',
        },
        {
            title: 'Customer Report',
            icon: <People />,
            onClick: () => setSelectedReport('customers'),
            active: selectedReport === 'customers',
        },
        {
            title: 'All Reports',
            icon: <Assessment />,
            onClick: () => setSelectedReport('all'),
            active: selectedReport === 'all',
        },
    ];

    const totalInventoryValue = inventoryData.reduce((sum, item) =>
        sum + (parseFloat(item.current_stock || 0) * parseFloat(item.cost_per_unit || 0)), 0);

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" fontWeight="bold">
                    Reports & Analytics
                </Typography>
                <Button variant="contained" startIcon={<Download />} onClick={handleDownloadReport} sx={{ px: 3 }}>
                    Download Report
                </Button>
            </Box>

            {/* Error Alert */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Report Type Selection */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2, mb: 3 }}>
                {reportCards.map((card, index) => (
                    <Card
                        key={index}
                        sx={{
                            cursor: 'pointer',
                            border: card.active ? 2 : 1,
                            borderColor: card.active ? 'primary.main' : 'divider',
                            '&:hover': { borderColor: 'primary.main' }
                        }}
                        onClick={card.onClick}
                    >
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Box sx={{ color: card.active ? 'primary.main' : 'text.secondary', mb: 1 }}>
                                {React.cloneElement(card.icon, { fontSize: 'large' })}
                            </Box>
                            <Typography variant="h6" fontWeight={card.active ? 'bold' : 'normal'}>
                                {card.title}
                            </Typography>
                        </CardContent>
                    </Card>
                ))}
            </Box>

            {/* Loading State */}
            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            )}

            {/* Summary Cards */}
            {!loading && (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 3, mb: 3 }}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Inventory sx={{ color: 'primary.main', mr: 1 }} />
                                <Typography variant="h6" color="text.secondary">
                                    Total Items
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight="bold">
                                {inventoryData.length}
                            </Typography>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <LocalAtm sx={{ color: 'success.main', mr: 1 }} />
                                <Typography variant="h6" color="text.secondary">
                                    Inventory Value
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight="bold">
                                ₹{totalInventoryValue.toFixed(2)}
                            </Typography>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <People sx={{ color: 'info.main', mr: 1 }} />
                                <Typography variant="h6" color="text.secondary">
                                    Total Customers
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight="bold">
                                {customerData.length}
                            </Typography>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <TrendingUp sx={{ color: 'warning.main', mr: 1 }} />
                                <Typography variant="h6" color="text.secondary">
                                    Categories
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight="bold">
                                {Array.from(new Set(inventoryData.map(item => item.category))).filter(Boolean).length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Box>
            )}

            {/* Inventory Report */}
            {!loading && (selectedReport === 'inventory' || selectedReport === 'all') && (
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Inventory Report
                        </Typography>
                        {inventoryData && inventoryData.length > 0 ? (
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Item</TableCell>
                                            <TableCell>Category</TableCell>
                                            <TableCell>Current Stock</TableCell>
                                            <TableCell>Unit</TableCell>
                                            <TableCell>Cost per Unit</TableCell>
                                            <TableCell>Total Value</TableCell>
                                            <TableCell>Status</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {inventoryData.map((item: any, index: number) => {
                                            const currentStock = parseFloat(item.current_stock || 0);
                                            const costPerUnit = parseFloat(item.cost_per_unit || 0);
                                            const reorderLevel = parseFloat(item.reorder_level || 0);
                                            const totalValue = currentStock * costPerUnit;

                                            return (
                                                <TableRow key={item.id || index}>
                                                    <TableCell>{item.item_name}</TableCell>
                                                    <TableCell>{item.category}</TableCell>
                                                    <TableCell>{currentStock}</TableCell>
                                                    <TableCell>{item.unit}</TableCell>
                                                    <TableCell>₹{costPerUnit.toFixed(2)}</TableCell>
                                                    <TableCell>₹{totalValue.toFixed(2)}</TableCell>
                                                    <TableCell>
                                                        {currentStock <= reorderLevel ? (
                                                            <Typography color="error.main" variant="body2">Low Stock</Typography>
                                                        ) : (
                                                            <Typography color="success.main" variant="body2">Good</Typography>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <Typography color="text.secondary">No inventory data available</Typography>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Customer Report */}
            {!loading && (selectedReport === 'customers' || selectedReport === 'all') && (
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Customer Report
                        </Typography>
                        {customerData && customerData.length > 0 ? (
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Customer Name</TableCell>
                                            <TableCell>Phone</TableCell>
                                            <TableCell>Email</TableCell>
                                            <TableCell>Address</TableCell>
                                            <TableCell>GST Number</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {customerData.map((customer: any, index: number) => (
                                            <TableRow key={customer.id || index}>
                                                <TableCell>{customer.name}</TableCell>
                                                <TableCell>{customer.phone || 'N/A'}</TableCell>
                                                <TableCell>{customer.email || 'N/A'}</TableCell>
                                                <TableCell>{customer.address || 'N/A'}</TableCell>
                                                <TableCell>{customer.gst_number || 'N/A'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <Typography color="text.secondary">No customer data available</Typography>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* No Data State */}
            {!loading && inventoryData.length === 0 && customerData.length === 0 && (
                <Card>
                    <CardContent sx={{ textAlign: 'center', py: 8 }}>
                        <Assessment sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">
                            No report data available
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Reports will appear here once you have inventory and customer data
                        </Typography>
                    </CardContent>
                </Card>
            )}
        </Box>
    );
};

export default Reports; 