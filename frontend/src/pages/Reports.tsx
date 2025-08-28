import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    CircularProgress,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Stack,
} from '@mui/material';
import {
    Assessment,
    TrendingUp,
    Inventory,
    ShoppingCart,
    AttachMoney,
} from '@mui/icons-material';
import { reportsApi, customerApi, inventoryApi, materialStockApi } from '../services/supabaseApi';
import { componentLogger } from '../utils/debug';

const Reports: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reportType, setReportType] = useState('overview');
    // const [dateRange, setDateRange] = useState('month');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    // Report data
    const [pendingOrders, setPendingOrders] = useState<any[]>([]);
    const [pendingReceivables, setPendingReceivables] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [inventory, setInventory] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [materialStock, setMaterialStock] = useState<any[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

    const loadReportData = useCallback(async () => {
        componentLogger.info('Loading report data...');
        try {
            setLoading(true);
            
            // Set default date range if not set
            const endDateValue = endDate || new Date().toISOString().split('T')[0];
            const startDateValue = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            
            const [
                pendingOrdersData,
                pendingReceivablesData,
                customersData,
                inventoryData,
                paymentsData,
                expensesData,
                materialStockData
            ] = await Promise.all([
                reportsApi.getPendingOrders().catch(() => []),
                reportsApi.getPendingReceivables().catch(() => []),
                customerApi.getCustomers().catch(() => []),
                inventoryApi.getInventory().catch(() => []),
                reportsApi.getPaymentsInDateRange(startDateValue, endDateValue).catch(() => []),
                reportsApi.getExpensesInDateRange(startDateValue, endDateValue).catch(() => []),
                materialStockApi.getCustomerStock(selectedCustomerId || undefined).catch(() => [])
            ]);
            
            setPendingOrders(pendingOrdersData);
            setPendingReceivables(pendingReceivablesData);
            setCustomers(customersData);
            setInventory(inventoryData);
            setPayments(paymentsData);
            setExpenses(expensesData);
            setMaterialStock(materialStockData);
            
            componentLogger.info('Report data loaded successfully');
        } catch (error: any) {
            componentLogger.error('Failed to load report data', error);
            setError('Failed to load report data: ' + error.message);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, selectedCustomerId]);

    useEffect(() => {
        loadReportData();
    }, [loadReportData]);

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    // Calculate summary metrics
    const totalRevenue = payments.reduce((sum, payment) => sum + (payment.payment_amount || 0), 0);
    // const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const totalOutstanding = pendingReceivables.reduce((sum, invoice) => sum + (invoice.outstanding_amount || 0), 0);
    const lowStockItems = inventory.filter(item => item.quantity < (item.reorder_level || 10));

    const renderOverviewReport = () => (
        <Box>
            {/* Summary Cards */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 3, mb: 4 }}>
                <Card>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <ShoppingCart sx={{ mr: 1, color: 'primary.main' }} />
                            <Typography variant="h6" color="text.secondary">
                                Pending Orders
                            </Typography>
                        </Box>
                        <Typography variant="h4" fontWeight="bold">
                            {pendingOrders.length}
                        </Typography>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <AttachMoney sx={{ mr: 1, color: 'success.main' }} />
                            <Typography variant="h6" color="text.secondary">
                                Revenue (Period)
                            </Typography>
                        </Box>
                        <Typography variant="h4" fontWeight="bold">
                            ₹{totalRevenue.toFixed(2)}
                        </Typography>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <TrendingUp sx={{ mr: 1, color: 'warning.main' }} />
                            <Typography variant="h6" color="text.secondary">
                                Outstanding
                            </Typography>
                        </Box>
                        <Typography variant="h4" fontWeight="bold">
                            ₹{totalOutstanding.toFixed(2)}
                        </Typography>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Inventory sx={{ mr: 1, color: 'error.main' }} />
                            <Typography variant="h6" color="text.secondary">
                                Low Stock Items
                            </Typography>
                        </Box>
                        <Typography variant="h4" fontWeight="bold">
                            {lowStockItems.length}
                        </Typography>
                    </CardContent>
                </Card>
            </Box>

            {/* Recent Activity */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Pending Orders
                        </Typography>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Order Number</TableCell>
                                        <TableCell>Customer</TableCell>
                                        <TableCell>Amount</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {pendingOrders.slice(0, 5).map((order) => (
                                        <TableRow key={order.id}>
                                            <TableCell>{order.order_number}</TableCell>
                                            <TableCell>{order.customer?.name || 'Unknown'}</TableCell>
                                            <TableCell>₹{order.total_amount?.toFixed(2) || '0.00'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Outstanding Invoices
                        </Typography>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Invoice Number</TableCell>
                                        <TableCell>Customer</TableCell>
                                        <TableCell>Outstanding</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {pendingReceivables.slice(0, 5).map((invoice) => (
                                        <TableRow key={invoice.id}>
                                            <TableCell>{invoice.invoice_number}</TableCell>
                                            <TableCell>{invoice.customer?.name || 'Unknown'}</TableCell>
                                            <TableCell>₹{invoice.outstanding_amount?.toFixed(2) || '0.00'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );

    const renderCustomerReport = () => (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Customer Summary
                </Typography>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Customer Name</TableCell>
                                <TableCell>Phone</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Created Date</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {customers.map((customer) => (
                                <TableRow key={customer.id}>
                                    <TableCell>{customer.name}</TableCell>
                                    <TableCell>{customer.phone || '-'}</TableCell>
                                    <TableCell>{customer.email || '-'}</TableCell>
                                    <TableCell>{new Date(customer.created_at).toLocaleDateString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>
    );

    const renderInventoryReport = () => (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Inventory Status
                </Typography>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Item Name</TableCell>
                                <TableCell>Quantity</TableCell>
                                <TableCell>Unit Price</TableCell>
                                <TableCell>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {inventory.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.item_name}</TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell>₹{item.unit_price?.toFixed(2) || '0.00'}</TableCell>
                                    <TableCell>
                                        <Typography 
                                            color={item.quantity < (item.reorder_level || 10) ? 'error' : 'success'}
                                            variant="body2"
                                        >
                                            {item.quantity < (item.reorder_level || 10) ? 'Low Stock' : 'In Stock'}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>
    );

    const renderFinancialReport = () => (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Recent Payments
                    </Typography>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Amount</TableCell>
                                    <TableCell>Method</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {payments.map((payment) => (
                                    <TableRow key={payment.id}>
                                        <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                                        <TableCell>₹{payment.payment_amount?.toFixed(2) || '0.00'}</TableCell>
                                        <TableCell>{payment.payment_method}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Recent Expenses
                    </Typography>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Amount</TableCell>
                                    <TableCell>Type</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {expenses.map((expense) => (
                                    <TableRow key={expense.id}>
                                        <TableCell>{new Date(expense.expense_date).toLocaleDateString()}</TableCell>
                                        <TableCell>₹{expense.amount?.toFixed(2) || '0.00'}</TableCell>
                                        <TableCell>{expense.expense_type}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>
        </Box>
    );

    const renderMaterialStockReport = () => {
        // Group material stock by different dimensions
        const stockByCustomer = materialStock.reduce((acc, stock) => {
            const customerName = stock.customer?.name || 'Unknown';
            if (!acc[customerName]) {
                acc[customerName] = {
                    customer: stock.customer,
                    totalReceived: 0,
                    totalDelivered: 0,
                    currentStock: 0,
                    materials: []
                };
            }
            acc[customerName].totalReceived += stock.total_received;
            acc[customerName].totalDelivered += stock.total_delivered;
            acc[customerName].currentStock += stock.current_stock;
            acc[customerName].materials.push(stock);
            return acc;
        }, {} as any);

        const stockByMaterial = materialStock.reduce((acc, stock) => {
            const materialType = stock.material_type;
            if (!acc[materialType]) {
                acc[materialType] = {
                    material_type: materialType,
                    totalReceived: 0,
                    totalDelivered: 0,
                    currentStock: 0,
                    customers: []
                };
            }
            acc[materialType].totalReceived += stock.total_received;
            acc[materialType].totalDelivered += stock.total_delivered;
            acc[materialType].currentStock += stock.current_stock;
            acc[materialType].customers.push(stock);
            return acc;
        }, {} as any);

        const lowStockCustomers = materialStock.filter(stock => stock.current_stock < 0);
        const totalMaterialValue = materialStock.reduce((sum, stock) => sum + (stock.current_stock * 50), 0); // Assuming avg unit cost

        return (
            <Box>
                {/* Material Stock Summary Cards */}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 3, mb: 4 }}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Inventory sx={{ mr: 1, color: 'primary.main' }} />
                                <Typography variant="h6" color="text.secondary">
                                    Total Customers
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight="bold">
                                {Object.keys(stockByCustomer).length}
                            </Typography>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <ShoppingCart sx={{ mr: 1, color: 'success.main' }} />
                                <Typography variant="h6" color="text.secondary">
                                    Material Types
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight="bold">
                                {Object.keys(stockByMaterial).length}
                            </Typography>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <TrendingUp sx={{ mr: 1, color: 'warning.main' }} />
                                <Typography variant="h6" color="text.secondary">
                                    Over-Delivered
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight="bold" color="error.main">
                                {lowStockCustomers.length}
                            </Typography>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <AttachMoney sx={{ mr: 1, color: 'info.main' }} />
                                <Typography variant="h6" color="text.secondary">
                                    Est. Value (₹)
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight="bold">
                                ₹{Math.abs(totalMaterialValue).toFixed(0)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Box>

                {/* Material Stock Tables */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3, mb: 3 }}>
                    {/* Stock by Customer */}
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Stock by Customer
                            </Typography>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Customer</TableCell>
                                            <TableCell>Received</TableCell>
                                            <TableCell>Delivered</TableCell>
                                            <TableCell>Balance</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {Object.values(stockByCustomer).map((customerStock: any) => (
                                            <TableRow key={customerStock.customer?.id || 'unknown'}>
                                                <TableCell>{customerStock.customer?.name || 'Unknown'}</TableCell>
                                                <TableCell>{customerStock.totalReceived}</TableCell>
                                                <TableCell>{customerStock.totalDelivered}</TableCell>
                                                <TableCell>
                                                    <Typography 
                                                        color={customerStock.currentStock < 0 ? 'error' : 'success'}
                                                        variant="body2"
                                                        fontWeight="bold"
                                                    >
                                                        {customerStock.currentStock}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>

                    {/* Stock by Material Type */}
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Stock by Material Type
                            </Typography>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Material Type</TableCell>
                                            <TableCell>Received</TableCell>
                                            <TableCell>Delivered</TableCell>
                                            <TableCell>Balance</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {Object.values(stockByMaterial).map((materialStock: any) => (
                                            <TableRow key={materialStock.material_type}>
                                                <TableCell>{materialStock.material_type}</TableCell>
                                                <TableCell>{materialStock.totalReceived}</TableCell>
                                                <TableCell>{materialStock.totalDelivered}</TableCell>
                                                <TableCell>
                                                    <Typography 
                                                        color={materialStock.currentStock < 0 ? 'error' : 'success'}
                                                        variant="body2"
                                                        fontWeight="bold"
                                                    >
                                                        {materialStock.currentStock}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Box>

                {/* Detailed Material Stock */}
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Detailed Material Stock Analysis
                        </Typography>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Customer</TableCell>
                                        <TableCell>Material Type</TableCell>
                                        <TableCell>Total Received</TableCell>
                                        <TableCell>Total Delivered</TableCell>
                                        <TableCell>Current Stock</TableCell>
                                        <TableCell>Last Updated</TableCell>
                                        <TableCell>Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {materialStock.map((stock) => (
                                        <TableRow key={stock.id}>
                                            <TableCell>{stock.customer?.name || 'Unknown'}</TableCell>
                                            <TableCell>{stock.material_type}</TableCell>
                                            <TableCell>{stock.total_received}</TableCell>
                                            <TableCell>{stock.total_delivered}</TableCell>
                                            <TableCell>
                                                <Typography 
                                                    color={stock.current_stock < 0 ? 'error' : stock.current_stock === 0 ? 'warning' : 'success'}
                                                    variant="body2"
                                                    fontWeight="bold"
                                                >
                                                    {stock.current_stock}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{new Date(stock.last_updated).toLocaleDateString()}</TableCell>
                                            <TableCell>
                                                <Typography 
                                                    color={stock.current_stock < 0 ? 'error' : stock.current_stock === 0 ? 'warning' : 'success'}
                                                    variant="body2"
                                                >
                                                    {stock.current_stock < 0 ? 'Over-delivered' : 
                                                     stock.current_stock === 0 ? 'Balanced' : 'In-hand'}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            </Box>
        );
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" fontWeight="bold">
                    Reports & Analytics
                </Typography>
            </Box>

            {/* Alerts */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Filters */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
                        <Box sx={{ minWidth: 200 }}>
                            <FormControl fullWidth>
                                <InputLabel>Report Type</InputLabel>
                                <Select
                                    value={reportType}
                                    label="Report Type"
                                    onChange={(e) => setReportType(e.target.value)}
                                >
                                    <MenuItem value="overview">Overview</MenuItem>
                                    <MenuItem value="customers">Customers</MenuItem>
                                    <MenuItem value="inventory">Inventory</MenuItem>
                                    <MenuItem value="financial">Financial</MenuItem>
                                    <MenuItem value="material_stock">Material Stock</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                        <TextField
                            type="date"
                            label="Start Date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ minWidth: 150 }}
                        />
                        <TextField
                            type="date"
                            label="End Date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ minWidth: 150 }}
                        />
                        {reportType === 'material_stock' && (
                            <Box sx={{ minWidth: 200 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Customer Filter</InputLabel>
                                    <Select
                                        value={selectedCustomerId}
                                        label="Customer Filter"
                                        onChange={(e) => setSelectedCustomerId(e.target.value)}
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
                        )}
                        <Button
                            variant="contained"
                            onClick={loadReportData}
                            startIcon={<Assessment />}
                            sx={{ minWidth: 120 }}
                        >
                            Refresh
                        </Button>
                    </Stack>
                </CardContent>
            </Card>

            {/* Report Content */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Box>
                    {reportType === 'overview' && renderOverviewReport()}
                    {reportType === 'customers' && renderCustomerReport()}
                    {reportType === 'inventory' && renderInventoryReport()}
                    {reportType === 'financial' && renderFinancialReport()}
                    {reportType === 'material_stock' && renderMaterialStockReport()}
                </Box>
            )}
        </Box>
    );
};

export default Reports;