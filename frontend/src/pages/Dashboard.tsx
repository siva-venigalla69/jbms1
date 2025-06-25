import React, { useState, useEffect } from 'react';
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Button,
    IconButton,
    Avatar,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Divider,
    Chip,
    LinearProgress,
    Paper,
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    People,
    ShoppingCart,
    Assignment,
    TrendingUp,
    Factory,
    LocalShipping,
    Receipt,
    Add,
    ArrowForward,
    Warning,
    CheckCircle,
    AccessTime,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface DashboardStats {
    totalCustomers: number;
    pendingOrders: number;
    ordersInProduction: number;
    completedToday: number;
    pendingChallans: number;
    pendingInvoices: number;
}

interface RecentActivity {
    id: number;
    type: 'order' | 'customer' | 'production' | 'challan';
    description: string;
    time: string;
    status: 'success' | 'warning' | 'info';
}

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { state } = useAuth();
    const [stats, setStats] = useState<DashboardStats>({
        totalCustomers: 0,
        pendingOrders: 0,
        ordersInProduction: 0,
        completedToday: 0,
        pendingChallans: 0,
        pendingInvoices: 0,
    });

    const [recentActivity] = useState<RecentActivity[]>([
        {
            id: 1,
            type: 'order',
            description: 'New order created for Ramesh Textiles',
            time: '10 minutes ago',
            status: 'success',
        },
        {
            id: 2,
            type: 'production',
            description: 'Pre-treatment completed for ORD-2024-0001',
            time: '30 minutes ago',
            status: 'info',
        },
        {
            id: 3,
            type: 'challan',
            description: 'Delivery challan pending for customer approval',
            time: '1 hour ago',
            status: 'warning',
        },
        {
            id: 4,
            type: 'customer',
            description: 'New customer Priya Fabrics added',
            time: '2 hours ago',
            status: 'success',
        },
    ]);

    // Simulate loading stats (in real app, this would come from API)
    useEffect(() => {
        const fetchStats = async () => {
            // Simulate API call
            setTimeout(() => {
                setStats({
                    totalCustomers: 156,
                    pendingOrders: 23,
                    ordersInProduction: 15,
                    completedToday: 8,
                    pendingChallans: 12,
                    pendingInvoices: 7,
                });
            }, 1000);
        };

        fetchStats();
    }, []);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    const quickActions = [
        {
            title: 'New Customer',
            icon: <People />,
            color: 'primary',
            action: () => navigate('/customers?action=create'),
        },
        {
            title: 'New Order',
            icon: <ShoppingCart />,
            color: 'secondary',
            action: () => navigate('/orders?action=create'),
        },
        {
            title: 'Update Production',
            icon: <Factory />,
            color: 'success',
            action: () => navigate('/production'),
        },
        {
            title: 'Create Challan',
            icon: <LocalShipping />,
            color: 'warning',
            action: () => navigate('/challans?action=create'),
        },
    ];

    const statCards = [
        {
            title: 'Total Customers',
            value: stats.totalCustomers,
            icon: <People />,
            color: 'primary',
            progress: 75,
        },
        {
            title: 'Pending Orders',
            value: stats.pendingOrders,
            icon: <Assignment />,
            color: 'warning',
            progress: 60,
        },
        {
            title: 'In Production',
            value: stats.ordersInProduction,
            icon: <Factory />,
            color: 'info',
            progress: 80,
        },
        {
            title: 'Completed Today',
            value: stats.completedToday,
            icon: <CheckCircle />,
            color: 'success',
            progress: 90,
        },
    ];

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'order':
                return <ShoppingCart />;
            case 'customer':
                return <People />;
            case 'production':
                return <Factory />;
            case 'challan':
                return <LocalShipping />;
            default:
                return <Assignment />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success':
                return 'success';
            case 'warning':
                return 'warning';
            case 'info':
                return 'info';
            default:
                return 'default';
        }
    };

    return (
        <Box>
            {/* Welcome Section */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                    {getGreeting()}, {state.user?.full_name}!
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                    Here's what's happening with your textile printing operations today.
                </Typography>
            </Box>

            {/* Quick Actions */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {quickActions.map((action, index) => (
                    <Grid item xs={12} sm={6} md={3} key={index}>
                        <Card
                            sx={{
                                height: '100%',
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: 4,
                                },
                            }}
                            onClick={action.action}
                        >
                            <CardContent sx={{ textAlign: 'center', py: 3 }}>
                                <Avatar
                                    sx={{
                                        bgcolor: `${action.color}.main`,
                                        width: 56,
                                        height: 56,
                                        mx: 'auto',
                                        mb: 2,
                                    }}
                                >
                                    {action.icon}
                                </Avatar>
                                <Typography variant="h6" fontWeight="600">
                                    {action.title}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Statistics Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {statCards.map((stat, index) => (
                    <Grid item xs={12} sm={6} md={3} key={index}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <Avatar
                                        sx={{
                                            bgcolor: `${stat.color}.main`,
                                            width: 40,
                                            height: 40,
                                            mr: 2,
                                        }}
                                    >
                                        {stat.icon}
                                    </Avatar>
                                    <Box sx={{ flexGrow: 1 }}>
                                        <Typography variant="h4" fontWeight="bold">
                                            {stat.value}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {stat.title}
                                        </Typography>
                                    </Box>
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={stat.progress}
                                    sx={{
                                        height: 6,
                                        borderRadius: 3,
                                        backgroundColor: 'grey.200',
                                        '& .MuiLinearProgress-bar': {
                                            borderRadius: 3,
                                            bgcolor: `${stat.color}.main`,
                                        },
                                    }}
                                />
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Grid container spacing={3}>
                {/* Recent Activity */}
                <Grid item xs={12} md={8}>
                    <Card>
                        <CardContent>
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    mb: 2,
                                }}
                            >
                                <Typography variant="h6" fontWeight="600">
                                    Recent Activity
                                </Typography>
                                <Button
                                    endIcon={<ArrowForward />}
                                    onClick={() => navigate('/reports')}
                                >
                                    View All
                                </Button>
                            </Box>
                            <List>
                                {recentActivity.map((activity, index) => (
                                    <React.Fragment key={activity.id}>
                                        <ListItem>
                                            <ListItemAvatar>
                                                <Avatar
                                                    sx={{
                                                        bgcolor: `${getStatusColor(activity.status)}.main`,
                                                        width: 32,
                                                        height: 32,
                                                    }}
                                                >
                                                    {getActivityIcon(activity.type)}
                                                </Avatar>
                                            </ListItemAvatar>
                                            <ListItemText
                                                primary={activity.description}
                                                secondary={activity.time}
                                            />
                                            <Chip
                                                label={activity.status}
                                                color={getStatusColor(activity.status) as any}
                                                size="small"
                                            />
                                        </ListItem>
                                        {index < recentActivity.length - 1 && <Divider />}
                                    </React.Fragment>
                                ))}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Quick Stats */}
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" fontWeight="600" gutterBottom>
                                Today's Summary
                            </Typography>
                            <Box sx={{ mt: 2 }}>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        py: 1,
                                    }}
                                >
                                    <Typography variant="body2">Pending Challans</Typography>
                                    <Chip
                                        label={stats.pendingChallans}
                                        color="warning"
                                        size="small"
                                    />
                                </Box>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        py: 1,
                                    }}
                                >
                                    <Typography variant="body2">Pending Invoices</Typography>
                                    <Chip
                                        label={stats.pendingInvoices}
                                        color="error"
                                        size="small"
                                    />
                                </Box>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        py: 1,
                                    }}
                                >
                                    <Typography variant="body2">Orders in Production</Typography>
                                    <Chip
                                        label={stats.ordersInProduction}
                                        color="info"
                                        size="small"
                                    />
                                </Box>
                            </Box>
                            <Button
                                variant="outlined"
                                fullWidth
                                sx={{ mt: 2 }}
                                onClick={() => navigate('/reports')}
                            >
                                View Detailed Reports
                            </Button>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Dashboard; 