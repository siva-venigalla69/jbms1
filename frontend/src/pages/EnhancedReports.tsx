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
    Paper,
    Stack,
    Grid,
    Chip,
    Divider,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import {
    Assessment,
    Print,
    PictureAsPdf,
    FilterList,
    Refresh,
    Visibility,
    TrendingUp,
    AttachMoney,
    ShoppingCart,
    Inventory,
    People,
    Assignment,
    AccountBalance,
    Receipt,
    LocalShipping,
    DesignServices,
    Analytics,
} from '@mui/icons-material';

// Import jsPDF and autotable
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Import services
import { 
    reportsApi, 
    customerApi, 
    materialStockApi, 
    orderApi,
    deliveryChallanApi,
    gstInvoiceApi,
    paymentApi
} from '../services/supabaseApi';
import { componentLogger } from '../utils/debug';

// Report Types
interface ReportConfig {
    id: string;
    title: string;
    description: string;
    icon: React.ReactElement;
    category: string;
    requiresCustomer?: boolean;
    requiresOrder?: boolean;
    requiresDateRange?: boolean;
}

const REPORT_CONFIGS: ReportConfig[] = [
    {
        id: 'customer_orders',
        title: 'Customer Orders Report',
        description: 'Detailed orders by customer within date range',
        icon: <People />,
        category: 'Customer Reports',
        requiresCustomer: true,
        requiresDateRange: true,
    },
    {
        id: 'orders_summary',
        title: 'Orders Summary Report',
        description: 'Complete orders analysis with totals and trends',
        icon: <ShoppingCart />,
        category: 'Order Reports',
        requiresDateRange: true,
    },
    {
        id: 'delivery_report',
        title: 'Delivery Report',
        description: 'Deliveries and challan details by date range',
        icon: <LocalShipping />,
        category: 'Delivery Reports',
        requiresDateRange: true,
    },
    {
        id: 'design_status',
        title: 'Design Status Report',
        description: 'Current design status across all orders',
        icon: <DesignServices />,
        category: 'Production Reports',
    },
    {
        id: 'payments_report',
        title: 'Payments Report',
        description: 'Payment transactions and outstanding amounts',
        icon: <AttachMoney />,
        category: 'Financial Reports',
        requiresDateRange: true,
    },
    {
        id: 'invoices_report',
        title: 'Invoices Report',
        description: 'GST invoices with payment status',
        icon: <Receipt />,
        category: 'Financial Reports',
        requiresDateRange: true,
    },
    {
        id: 'production_status',
        title: 'Production Status Report',
        description: 'Current production stage of all items',
        icon: <Assignment />,
        category: 'Production Reports',
    },
    {
        id: 'material_stock',
        title: 'Material Stock Report',
        description: 'Stock levels and material tracking',
        icon: <Inventory />,
        category: 'Inventory Reports',
        requiresCustomer: true,
    },
    {
        id: 'outstanding_receivables',
        title: 'Outstanding Receivables',
        description: 'Pending payments from customers',
        icon: <AccountBalance />,
        category: 'Financial Reports',
    },
    {
        id: 'customer_performance',
        title: 'Customer Performance Analysis',
        description: 'Customer order history and payment behavior',
        icon: <Analytics />,
        category: 'Customer Reports',
        requiresCustomer: true,
        requiresDateRange: true,
    },
    {
        id: 'profitability_analysis',
        title: 'Profitability Analysis',
        description: 'Revenue vs expenses profitability report',
        icon: <TrendingUp />,
        category: 'Financial Reports',
        requiresDateRange: true,
    },
];

const EnhancedReports: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    
    // Filter states
    const [selectedReport, setSelectedReport] = useState<string>('customer_orders');
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setMonth(date.getMonth() - 1);
        return date.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [selectedOrderId, setSelectedOrderId] = useState<string>('');
    
    // Data states
    const [reportData, setReportData] = useState<any>(null);
    const [customers, setCustomers] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    
    // Preview dialog
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewContent, setPreviewContent] = useState<any>(null);

    // Load supporting data
    const loadSupportingData = useCallback(async () => {
        try {
            const [customersData, ordersData] = await Promise.all([
                customerApi.getCustomers(),
                orderApi.getOrders()
            ]);
            setCustomers(customersData);
            setOrders(ordersData);
        } catch (error: any) {
            componentLogger.error('Failed to load supporting data', error);
        }
    }, []);

    useEffect(() => {
        loadSupportingData();
    }, [loadSupportingData]);

    // Generate report data based on selected report type
    const generateReportData = useCallback(async () => {
        if (!selectedReport) return;

        setLoading(true);
        setError(null);
        
        try {
            componentLogger.info('Generating report', { 
                report: selectedReport, 
                customer: selectedCustomerId, 
                dateRange: { startDate, endDate } 
            });

            let data: any = {};

            switch (selectedReport) {
                case 'customer_orders':
                    if (selectedCustomerId) {
                        const customerOrders = await orderApi.getCustomerOrders(selectedCustomerId, startDate, endDate);
                        const customer = customers.find(c => c.id === selectedCustomerId);
                        data = {
                            customer,
                            orders: customerOrders,
                            totalOrders: customerOrders.length,
                            totalAmount: customerOrders.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0),
                            dateRange: { startDate, endDate }
                        };
                    } else {
                        const allOrders = await orderApi.getOrdersInDateRange(startDate, endDate);
                        data = {
                            orders: allOrders,
                            totalOrders: allOrders.length,
                            totalAmount: allOrders.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0),
                            dateRange: { startDate, endDate }
                        };
                    }
                    break;

                case 'orders_summary':
                    const ordersInRange = await orderApi.getOrdersInDateRange(startDate, endDate);
                    const ordersByStatus = ordersInRange.reduce((acc: any, order: any) => {
                        acc[order.status] = (acc[order.status] || 0) + 1;
                        return acc;
                    }, {});
                    data = {
                        orders: ordersInRange,
                        summary: {
                            totalOrders: ordersInRange.length,
                            totalAmount: ordersInRange.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0),
                            ordersByStatus,
                            averageOrderValue: ordersInRange.length > 0 ? 
                                ordersInRange.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0) / ordersInRange.length : 0
                        },
                        dateRange: { startDate, endDate }
                    };
                    break;

                case 'delivery_report':
                    const deliveries = await deliveryChallanApi.getDeliveriesInDateRange(startDate, endDate);
                    data = {
                        deliveries,
                        summary: {
                            totalDeliveries: deliveries.length,
                            totalDeliveredValue: deliveries.reduce((sum: number, delivery: any) => 
                                sum + (delivery.total_amount || 0), 0),
                            deliveriesByStatus: deliveries.reduce((acc: any, delivery: any) => {
                                acc[delivery.status] = (acc[delivery.status] || 0) + 1;
                                return acc;
                            }, {})
                        },
                        dateRange: { startDate, endDate }
                    };
                    break;

                case 'design_status':
                    const designStatus = await orderApi.getDesignStatusReport();
                    data = {
                        designItems: designStatus,
                        summary: {
                            totalItems: designStatus.length,
                            designReady: designStatus.filter((item: any) => item.design_ready).length,
                            designPending: designStatus.filter((item: any) => !item.design_ready).length,
                            withFiles: designStatus.filter((item: any) => item.design_url).length
                        }
                    };
                    break;

                case 'payments_report':
                    const payments = await reportsApi.getPaymentsInDateRange(startDate, endDate);
                    data = {
                        payments,
                        summary: {
                            totalPayments: payments.length,
                            totalAmount: payments.reduce((sum: number, payment: any) => sum + (payment.payment_amount || 0), 0),
                            paymentsByMethod: payments.reduce((acc: any, payment: any) => {
                                acc[payment.payment_method] = (acc[payment.payment_method] || 0) + (payment.payment_amount || 0);
                                return acc;
                            }, {})
                        },
                        dateRange: { startDate, endDate }
                    };
                    break;

                case 'invoices_report':
                    const invoices = await gstInvoiceApi.getInvoicesInDateRange(startDate, endDate);
                    data = {
                        invoices,
                        summary: {
                            totalInvoices: invoices.length,
                            totalAmount: invoices.reduce((sum: number, invoice: any) => sum + (invoice.total_amount || 0), 0),
                            paidInvoices: invoices.filter((invoice: any) => invoice.payment_status === 'paid').length,
                            pendingInvoices: invoices.filter((invoice: any) => invoice.payment_status === 'pending').length,
                            totalOutstanding: invoices.reduce((sum: number, invoice: any) => 
                                sum + (invoice.outstanding_amount || 0), 0)
                        },
                        dateRange: { startDate, endDate }
                    };
                    break;

                case 'production_status':
                    const productionItems = await orderApi.getProductionStatusReport();
                    data = {
                        productionItems,
                        summary: {
                            totalItems: productionItems.length,
                            byStage: productionItems.reduce((acc: any, item: any) => {
                                const stage = item.current_stage || 'design_pending';
                                acc[stage] = (acc[stage] || 0) + 1;
                                return acc;
                            }, {}),
                            completedItems: productionItems.filter((item: any) => 
                                item.current_stage === 'post_process').length
                        }
                    };
                    break;

                case 'material_stock':
                    const stockData = selectedCustomerId ? 
                        await materialStockApi.getCustomerStock(selectedCustomerId) :
                        await materialStockApi.getAllStock();
                    data = {
                        stockItems: stockData,
                        summary: {
                            totalItems: stockData.length,
                            totalReceived: stockData.reduce((sum: number, stock: any) => sum + stock.total_received, 0),
                            totalDelivered: stockData.reduce((sum: number, stock: any) => sum + stock.total_delivered, 0),
                            currentStock: stockData.reduce((sum: number, stock: any) => sum + stock.current_stock, 0),
                            negativeStock: stockData.filter((stock: any) => stock.current_stock < 0).length
                        },
                        customer: selectedCustomerId ? customers.find(c => c.id === selectedCustomerId) : null
                    };
                    break;

                case 'outstanding_receivables':
                    const receivables = await reportsApi.getPendingReceivables();
                    data = {
                        receivables,
                        summary: {
                            totalOutstanding: receivables.reduce((sum: number, item: any) => 
                                sum + (item.outstanding_amount || 0), 0),
                            totalInvoices: receivables.length,
                            overdueInvoices: receivables.filter((item: any) => 
                                new Date(item.due_date) < new Date()).length
                        }
                    };
                    break;

                case 'customer_performance':
                    if (selectedCustomerId) {
                        const customer = customers.find(c => c.id === selectedCustomerId);
                        const customerOrders = await orderApi.getCustomerOrders(selectedCustomerId, startDate, endDate);
                        const customerPayments = await paymentApi.getCustomerPayments(selectedCustomerId, startDate, endDate);
                        data = {
                            customer,
                            orders: customerOrders,
                            payments: customerPayments,
                            summary: {
                                totalOrders: customerOrders.length,
                                totalOrderValue: customerOrders.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0),
                                totalPayments: customerPayments.reduce((sum: number, payment: any) => sum + (payment.payment_amount || 0), 0),
                                averageOrderValue: customerOrders.length > 0 ? 
                                    customerOrders.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0) / customerOrders.length : 0
                            },
                            dateRange: { startDate, endDate }
                        };
                    }
                    break;

                case 'profitability_analysis':
                    const ordersForProfit = await orderApi.getOrdersInDateRange(startDate, endDate);
                    const expensesForProfit = await reportsApi.getExpensesInDateRange(startDate, endDate);
                    const totalRevenue = ordersForProfit.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0);
                    const totalExpenses = expensesForProfit.reduce((sum: number, expense: any) => sum + (expense.amount || 0), 0);
                    data = {
                        orders: ordersForProfit,
                        expenses: expensesForProfit,
                        summary: {
                            totalRevenue,
                            totalExpenses,
                            grossProfit: totalRevenue - totalExpenses,
                            profitMargin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue * 100) : 0
                        },
                        dateRange: { startDate, endDate }
                    };
                    break;

                default:
                    throw new Error('Unknown report type');
            }

            setReportData(data);
            componentLogger.info('Report generated successfully', { report: selectedReport });

        } catch (error: any) {
            componentLogger.error('Failed to generate report', error);
            setError('Failed to generate report: ' + error.message);
        } finally {
            setLoading(false);
        }
    }, [selectedReport, startDate, endDate, selectedCustomerId, customers]);

    // Generate PDF
    const generatePDF = useCallback(() => {
        if (!reportData) return;

        const reportConfig = REPORT_CONFIGS.find(config => config.id === selectedReport);
        if (!reportConfig) return;

        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;
            
            // Company header
            doc.setFontSize(20);
            doc.setTextColor(40, 40, 40);
            doc.text('TEXTILE PRINTING MANAGEMENT', pageWidth / 2, 20, { align: 'center' });
            
            doc.setFontSize(16);
            doc.text(reportConfig.title, pageWidth / 2, 35, { align: 'center' });
            
            // Report metadata
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            let yPos = 50;
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, yPos);
            
            if (reportConfig.requiresDateRange && startDate && endDate) {
                yPos += 5;
                doc.text(`Period: ${startDate} to ${endDate}`, 20, yPos);
            }
            
            if (reportData.customer) {
                yPos += 5;
                doc.text(`Customer: ${reportData.customer.name}`, 20, yPos);
            }
            
            yPos += 15;
            
            // Generate content based on report type
            switch (selectedReport) {
                case 'customer_orders':
                case 'orders_summary':
                    if (reportData.orders && reportData.orders.length > 0) {
                        autoTable(doc, {
                            startY: yPos,
                            head: [['Order Number', 'Customer', 'Date', 'Status', 'Amount (₹)']],
                            body: reportData.orders.map((order: any) => [
                                order.order_number,
                                order.customer?.name || 'Unknown',
                                new Date(order.order_date).toLocaleDateString(),
                                order.status,
                                (order.total_amount || 0).toFixed(2)
                            ]),
                            foot: [['', '', '', 'Total:', reportData.totalAmount?.toFixed(2) || '0.00']]
                        });
                    }
                    break;
                    
                case 'delivery_report':
                    if (reportData.deliveries && reportData.deliveries.length > 0) {
                        autoTable(doc, {
                            startY: yPos,
                            head: [['Challan Number', 'Customer', 'Date', 'Items', 'Amount (₹)']],
                            body: reportData.deliveries.map((delivery: any) => [
                                delivery.challan_number,
                                delivery.customer?.name || 'Unknown',
                                new Date(delivery.challan_date).toLocaleDateString(),
                                delivery.items?.length || 0,
                                (delivery.total_amount || 0).toFixed(2)
                            ])
                        });
                    }
                    break;
                    
                case 'payments_report':
                    if (reportData.payments && reportData.payments.length > 0) {
                        autoTable(doc, {
                            startY: yPos,
                            head: [['Date', 'Customer', 'Amount (₹)', 'Method', 'Reference']],
                            body: reportData.payments.map((payment: any) => [
                                new Date(payment.payment_date).toLocaleDateString(),
                                payment.customer?.name || 'Unknown',
                                (payment.payment_amount || 0).toFixed(2),
                                payment.payment_method,
                                payment.payment_reference || '-'
                            ]),
                            foot: [['', '', reportData.summary?.totalAmount?.toFixed(2) || '0.00', '', '']]
                        });
                    }
                    break;
                    
                case 'material_stock':
                    if (reportData.stockItems && reportData.stockItems.length > 0) {
                        autoTable(doc, {
                            startY: yPos,
                            head: [['Customer', 'Material', 'Received', 'Delivered', 'Balance']],
                            body: reportData.stockItems.map((stock: any) => [
                                stock.customer?.name || 'Unknown',
                                stock.material_type,
                                stock.total_received,
                                stock.total_delivered,
                                stock.current_stock
                            ])
                        });
                    }
                    break;
                    
                // Add more cases for other report types as needed
            }
            
            // Save the PDF
            const fileName = `${reportConfig.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);
            
            setSuccess('PDF generated and downloaded successfully');
            
        } catch (error: any) {
            componentLogger.error('Failed to generate PDF', error);
            setError('Failed to generate PDF: ' + error.message);
        }
    }, [reportData, selectedReport, startDate, endDate]);

    // Print to printer
    const printReport = useCallback(() => {
        if (!reportData) return;

        const reportConfig = REPORT_CONFIGS.find(config => config.id === selectedReport);
        if (!reportConfig) return;

        // Create a new window with the report content
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        // Generate HTML content for printing
        let htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${reportConfig.title}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .company-name { font-size: 24px; font-weight: bold; color: #333; }
                    .report-title { font-size: 20px; margin-top: 10px; color: #666; }
                    .metadata { margin: 20px 0; color: #888; font-size: 12px; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; font-weight: bold; }
                    .total-row { font-weight: bold; background-color: #f9f9f9; }
                    .summary { background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px; }
                    @media print {
                        body { margin: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="company-name">TEXTILE PRINTING MANAGEMENT</div>
                    <div class="report-title">${reportConfig.title}</div>
                </div>
                
                <div class="metadata">
                    <div>Generated on: ${new Date().toLocaleString()}</div>
                    ${reportConfig.requiresDateRange && startDate && endDate ? 
                        `<div>Period: ${startDate} to ${endDate}</div>` : ''}
                    ${reportData.customer ? `<div>Customer: ${reportData.customer.name}</div>` : ''}
                </div>
        `;

        // Add content based on report type
        switch (selectedReport) {
            case 'customer_orders':
            case 'orders_summary':
                if (reportData.orders && reportData.orders.length > 0) {
                    htmlContent += `
                        <div class="summary">
                            <strong>Summary:</strong> ${reportData.orders.length} orders, Total: ₹${(reportData.totalAmount || 0).toFixed(2)}
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Order Number</th>
                                    <th>Customer</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th>Amount (₹)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${reportData.orders.map((order: any) => `
                                    <tr>
                                        <td>${order.order_number}</td>
                                        <td>${order.customer?.name || 'Unknown'}</td>
                                        <td>${new Date(order.order_date).toLocaleDateString()}</td>
                                        <td>${order.status}</td>
                                        <td>${(order.total_amount || 0).toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                                <tr class="total-row">
                                    <td colspan="4"><strong>Total</strong></td>
                                    <td><strong>₹${(reportData.totalAmount || 0).toFixed(2)}</strong></td>
                                </tr>
                            </tbody>
                        </table>
                    `;
                }
                break;
                
            // Add more cases for other report types
        }

        htmlContent += `
                <div class="no-print" style="margin-top: 30px; text-align: center;">
                    <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">Print Report</button>
                    <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">Close</button>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Auto-print after a short delay
        setTimeout(() => {
            printWindow.print();
        }, 500);
        
    }, [reportData, selectedReport, startDate, endDate]);

    const currentReportConfig = REPORT_CONFIGS.find(config => config.id === selectedReport);

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" fontWeight="bold">
                    Business Reports & Analytics
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={generateReportData}
                        disabled={loading}
                    >
                        Refresh Data
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

            <Grid container spacing={3}>
                {/* Report Configuration */}
                <Grid size={{ xs: 12, lg: 4 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                <FilterList sx={{ mr: 1 }} />
                                Report Configuration
                            </Typography>
                            
                            <Stack spacing={3}>
                                {/* Report Type Selection */}
                                <FormControl fullWidth>
                                    <InputLabel>Report Type</InputLabel>
                                    <Select
                                        value={selectedReport}
                                        label="Report Type"
                                        onChange={(e) => setSelectedReport(e.target.value)}
                                    >
                                        {Object.entries(
                                            REPORT_CONFIGS.reduce((acc, config) => {
                                                if (!acc[config.category]) acc[config.category] = [];
                                                acc[config.category].push(config);
                                                return acc;
                                            }, {} as Record<string, ReportConfig[]>)
                                        ).map(([category, configs]) => [
                                            <Typography
                                                key={category}
                                                sx={{ px: 2, py: 1, fontWeight: 'bold', color: 'primary.main' }}
                                            >
                                                {category}
                                            </Typography>,
                                            ...configs.map(config => (
                                                <MenuItem key={config.id} value={config.id}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <Box sx={{ mr: 1, fontSize: 20 }}>
                                                            {config.icon}
                                                        </Box>
                                                        <Box>
                                                            <Typography variant="body2">{config.title}</Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {config.description}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </MenuItem>
                                            ))
                                        ]).flat()}
                                    </Select>
                                </FormControl>

                                {/* Date Range Filters */}
                                {currentReportConfig?.requiresDateRange && (
                                    <>
                                        <TextField
                                            type="date"
                                            label="Start Date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            InputLabelProps={{ shrink: true }}
                                            fullWidth
                                        />
                                        <TextField
                                            type="date"
                                            label="End Date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            InputLabelProps={{ shrink: true }}
                                            fullWidth
                                        />
                                    </>
                                )}

                                {/* Customer Filter */}
                                {currentReportConfig?.requiresCustomer && (
                                    <FormControl fullWidth>
                                        <InputLabel>Customer (Optional)</InputLabel>
                                        <Select
                                            value={selectedCustomerId}
                                            label="Customer (Optional)"
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
                                )}

                                {/* Order Filter */}
                                {currentReportConfig?.requiresOrder && (
                                    <FormControl fullWidth>
                                        <InputLabel>Order (Optional)</InputLabel>
                                        <Select
                                            value={selectedOrderId}
                                            label="Order (Optional)"
                                            onChange={(e) => setSelectedOrderId(e.target.value)}
                                        >
                                            <MenuItem value="">All Orders</MenuItem>
                                            {orders.map((order) => (
                                                <MenuItem key={order.id} value={order.id}>
                                                    {order.order_number} - {order.customer?.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                )}

                                <Button
                                    variant="contained"
                                    fullWidth
                                    startIcon={<Assessment />}
                                    onClick={generateReportData}
                                    disabled={loading}
                                    size="large"
                                >
                                    Generate Report
                                </Button>

                                {reportData && (
                                    <Stack spacing={2}>
                                        <Divider />
                                        <Typography variant="subtitle1" fontWeight="bold">
                                            Export & Print Options
                                        </Typography>
                                        
                                        <Button
                                            variant="outlined"
                                            fullWidth
                                            startIcon={<PictureAsPdf />}
                                            onClick={generatePDF}
                                            color="error"
                                        >
                                            Download PDF
                                        </Button>
                                        
                                        <Button
                                            variant="outlined"
                                            fullWidth
                                            startIcon={<Print />}
                                            onClick={printReport}
                                            color="primary"
                                        >
                                            Print Report
                                        </Button>
                                        
                                        <Button
                                            variant="outlined"
                                            fullWidth
                                            startIcon={<Visibility />}
                                            onClick={() => {
                                                setPreviewContent(reportData);
                                                setPreviewOpen(true);
                                            }}
                                            color="info"
                                        >
                                            Preview Report
                                        </Button>
                                    </Stack>
                                )}
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Report Display Area */}
                <Grid size={{ xs: 12, lg: 8 }}>
                    {loading ? (
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
                                    <CircularProgress />
                                    <Typography sx={{ ml: 2 }}>Generating report...</Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    ) : reportData ? (
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                    <Typography variant="h5" fontWeight="bold">
                                        {currentReportConfig?.title}
                                    </Typography>
                                    <Chip 
                                        label={`Generated: ${new Date().toLocaleString()}`}
                                        variant="outlined"
                                        size="small"
                                    />
                                </Box>

                                {/* Report Summary Cards */}
                                {reportData.summary && (
                                    <Grid container spacing={2} sx={{ mb: 3 }}>
                                        {Object.entries(reportData.summary).map(([key, value]: [string, any]) => (
                                            <Grid key={key} size={{ xs: 12, sm: 6, md: 3 }}>
                                                <Card variant="outlined">
                                                    <CardContent sx={{ textAlign: 'center' }}>
                                                        <Typography variant="h6" color="primary">
                                                            {typeof value === 'number' && key.toLowerCase().includes('amount') ? 
                                                                `₹${value.toFixed(2)}` : value
                                                            }
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                                                        </Typography>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        ))}
                                    </Grid>
                                )}

                                {/* Report Table */}
                                {(reportData.orders || reportData.deliveries || reportData.payments || reportData.stockItems) && (
                                    <TableContainer component={Paper} variant="outlined">
                                        <Table>
                                            <TableHead>
                                                <TableRow>
                                                    {selectedReport === 'customer_orders' || selectedReport === 'orders_summary' ? (
                                                        <>
                                                            <TableCell>Order Number</TableCell>
                                                            <TableCell>Customer</TableCell>
                                                            <TableCell>Date</TableCell>
                                                            <TableCell>Status</TableCell>
                                                            <TableCell align="right">Amount</TableCell>
                                                        </>
                                                    ) : selectedReport === 'delivery_report' ? (
                                                        <>
                                                            <TableCell>Challan Number</TableCell>
                                                            <TableCell>Customer</TableCell>
                                                            <TableCell>Date</TableCell>
                                                            <TableCell>Items</TableCell>
                                                            <TableCell align="right">Amount</TableCell>
                                                        </>
                                                    ) : selectedReport === 'payments_report' ? (
                                                        <>
                                                            <TableCell>Date</TableCell>
                                                            <TableCell>Customer</TableCell>
                                                            <TableCell align="right">Amount</TableCell>
                                                            <TableCell>Method</TableCell>
                                                            <TableCell>Reference</TableCell>
                                                        </>
                                                    ) : selectedReport === 'material_stock' ? (
                                                        <>
                                                            <TableCell>Customer</TableCell>
                                                            <TableCell>Material Type</TableCell>
                                                            <TableCell align="right">Received</TableCell>
                                                            <TableCell align="right">Delivered</TableCell>
                                                            <TableCell align="right">Balance</TableCell>
                                                        </>
                                                    ) : null}
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {/* Render table rows based on report type */}
                                                {(reportData.orders || []).map((item: any) => (
                                                    <TableRow key={item.id}>
                                                        <TableCell>{item.order_number}</TableCell>
                                                        <TableCell>{item.customer?.name || 'Unknown'}</TableCell>
                                                        <TableCell>{new Date(item.order_date).toLocaleDateString()}</TableCell>
                                                        <TableCell>
                                                            <Chip 
                                                                label={item.status} 
                                                                color={item.status === 'completed' ? 'success' : item.status === 'pending' ? 'warning' : 'default'}
                                                                size="small"
                                                            />
                                                        </TableCell>
                                                        <TableCell align="right">₹{(item.total_amount || 0).toFixed(2)}</TableCell>
                                                    </TableRow>
                                                ))}
                                                
                                                {(reportData.deliveries || []).map((item: any) => (
                                                    <TableRow key={item.id}>
                                                        <TableCell>{item.challan_number}</TableCell>
                                                        <TableCell>{item.customer?.name || 'Unknown'}</TableCell>
                                                        <TableCell>{new Date(item.challan_date).toLocaleDateString()}</TableCell>
                                                        <TableCell>{item.items?.length || 0}</TableCell>
                                                        <TableCell align="right">₹{(item.total_amount || 0).toFixed(2)}</TableCell>
                                                    </TableRow>
                                                ))}
                                                
                                                {(reportData.payments || []).map((item: any) => (
                                                    <TableRow key={item.id}>
                                                        <TableCell>{new Date(item.payment_date).toLocaleDateString()}</TableCell>
                                                        <TableCell>{item.customer?.name || 'Unknown'}</TableCell>
                                                        <TableCell align="right">₹{(item.payment_amount || 0).toFixed(2)}</TableCell>
                                                        <TableCell>
                                                            <Chip label={item.payment_method} size="small" variant="outlined" />
                                                        </TableCell>
                                                        <TableCell>{item.payment_reference || '-'}</TableCell>
                                                    </TableRow>
                                                ))}
                                                
                                                {(reportData.stockItems || []).map((item: any) => (
                                                    <TableRow key={item.id}>
                                                        <TableCell>{item.customer?.name || 'Unknown'}</TableCell>
                                                        <TableCell>{item.material_type}</TableCell>
                                                        <TableCell align="right">{item.total_received}</TableCell>
                                                        <TableCell align="right">{item.total_delivered}</TableCell>
                                                        <TableCell align="right">
                                                            <Typography 
                                                                color={item.current_stock < 0 ? 'error' : item.current_stock === 0 ? 'warning' : 'success'}
                                                                fontWeight="bold"
                                                            >
                                                                {item.current_stock}
                                                            </Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
                                    <Assessment sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                                    <Typography variant="h6" color="text.secondary" gutterBottom>
                                        Select a report type and click "Generate Report"
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" textAlign="center">
                                        Choose from {REPORT_CONFIGS.length} different business reports to analyze your textile printing operations.
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    )}
                </Grid>
            </Grid>

            {/* Preview Dialog */}
            <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="lg" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        Report Preview
                        <Box>
                            <IconButton onClick={generatePDF} color="error" title="Download PDF">
                                <PictureAsPdf />
                            </IconButton>
                            <IconButton onClick={printReport} color="primary" title="Print Report">
                                <Print />
                            </IconButton>
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {previewContent && (
                        <Box>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                This is a preview of your report. Use the PDF or Print buttons to export.
                            </Typography>
                            {/* Add preview content here */}
                            <pre style={{ fontSize: '12px', background: '#f5f5f5', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
                                {JSON.stringify(previewContent, null, 2)}
                            </pre>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPreviewOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default EnhancedReports;