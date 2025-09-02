// Textile Stock Tracker - Real-world textile business stock management
// Handles multiple material types with complex receipt/delivery patterns

import React, { useState, useEffect } from 'react';
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
  Paper,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  Grid,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Inventory,
  Add,
  Remove,
  Refresh,
  Info,
  Timeline as TimelineIcon,
  LocalShipping,
  Receipt as ReceiptIcon,
  TrendingUp,
  TrendingDown,
} from '@mui/icons-material';
import { materialStockApi, materialInApi, deliveryChallanApi } from '../services/supabaseApi';

interface MaterialMovement {
  date: string;
  type: 'received' | 'delivered';
  material_type: string;
  quantity: number;
  reference: string;
  running_stock: number;
}

interface CustomerStockSnapshot {
  customer_id: string;
  customer_name: string;
  stock_summary: {
    [material_type: string]: {
      total_received: number;
      total_delivered: number;
      current_stock: number;
      movements: MaterialMovement[];
    };
  };
}

const TextileStockTracker: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [stockSnapshots, setStockSnapshots] = useState<CustomerStockSnapshot[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerStockSnapshot | null>(null);
  const [demoMode, setDemoMode] = useState(true);

  // Demo data based on your example
  const getDemoData = (): CustomerStockSnapshot => ({
    customer_id: 'demo-customer-1',
    customer_name: 'ABC Textiles Pvt Ltd',
    stock_summary: {
      'Sarees': {
        total_received: 10 + 45 + 20, // May 1st + May 3rd + May 7th
        total_delivered: 35 + 40, // May 5th + May 9th
        current_stock: 75 - 75, // 0 remaining
        movements: [
          { date: '2025-05-01', type: 'received', material_type: 'Sarees', quantity: 10, reference: 'Material Receipt #001', running_stock: 10 },
          { date: '2025-05-03', type: 'received', material_type: 'Sarees', quantity: 45, reference: 'Material Receipt #002', running_stock: 55 },
          { date: '2025-05-05', type: 'delivered', material_type: 'Sarees', quantity: 35, reference: 'Delivery Challan DC-001', running_stock: 20 },
          { date: '2025-05-07', type: 'received', material_type: 'Sarees', quantity: 20, reference: 'Material Receipt #003', running_stock: 40 },
          { date: '2025-05-09', type: 'delivered', material_type: 'Sarees', quantity: 40, reference: 'Delivery Challan DC-002', running_stock: 0 },
        ]
      },
      'Duppatas': {
        total_received: 30 + 50, // May 1st + May 3rd
        total_delivered: 0, // No deliveries yet
        current_stock: 80,
        movements: [
          { date: '2025-05-01', type: 'received', material_type: 'Duppatas', quantity: 30, reference: 'Material Receipt #001', running_stock: 30 },
          { date: '2025-05-03', type: 'received', material_type: 'Duppatas', quantity: 50, reference: 'Material Receipt #002', running_stock: 80 },
        ]
      },
      'Blouses': {
        total_received: 40 + 100, // May 1st + May 7th
        total_delivered: 20, // May 9th
        current_stock: 120,
        movements: [
          { date: '2025-05-01', type: 'received', material_type: 'Blouses', quantity: 40, reference: 'Material Receipt #001', running_stock: 40 },
          { date: '2025-05-07', type: 'received', material_type: 'Blouses', quantity: 100, reference: 'Material Receipt #003', running_stock: 140 },
          { date: '2025-05-09', type: 'delivered', material_type: 'Blouses', quantity: 20, reference: 'Delivery Challan DC-002', running_stock: 120 },
        ]
      }
    }
  });

  const loadStockData = async () => {
    if (demoMode) {
      setStockSnapshots([getDemoData()]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // In real implementation, this would call your API
      const data = await materialStockApi.getCustomerStock();
      
      // Process data into snapshots format
      const snapshots = processStockData(data);
      setStockSnapshots(snapshots);
      
    } catch (err: any) {
      setError(err.message || 'Failed to load stock data');
    } finally {
      setLoading(false);
    }
  };

  const processStockData = (rawData: any[]): CustomerStockSnapshot[] => {
    // Group by customer and process into snapshot format
    const customerGroups = rawData.reduce((acc, item) => {
      const customerId = item.customer_id;
      if (!acc[customerId]) {
        acc[customerId] = {
          customer_id: customerId,
          customer_name: item.customer?.name || 'Unknown Customer',
          stock_summary: {}
        };
      }
      
      acc[customerId].stock_summary[item.material_type] = {
        total_received: item.total_received || 0,
        total_delivered: item.total_delivered || 0,
        current_stock: item.current_stock || 0,
        movements: [] // Would need to fetch movement history separately
      };
      
      return acc;
    }, {});
    
    return Object.values(customerGroups);
  };

  useEffect(() => {
    loadStockData();
  }, [demoMode]);

  const getStockStatusColor = (stock: number) => {
    if (stock < 0) return 'error';
    if (stock === 0) return 'warning';
    if (stock < 50) return 'info';
    return 'success';
  };

  const getStockStatusLabel = (stock: number) => {
    if (stock < 0) return 'Over-delivered';
    if (stock === 0) return 'Empty';
    if (stock < 50) return 'Low Stock';
    return 'Good Stock';
  };

  const renderMovementTimeline = (movements: MaterialMovement[]) => (
    <Timeline position="left">
      {movements.map((movement, index) => (
        <TimelineItem key={index}>
          <TimelineSeparator>
            <TimelineDot color={movement.type === 'received' ? 'success' : 'primary'}>
              {movement.type === 'received' ? <Add /> : <Remove />}
            </TimelineDot>
            {index < movements.length - 1 && <TimelineConnector />}
          </TimelineSeparator>
          <TimelineContent>
            <Box>
              <Typography variant="body2" fontWeight="bold">
                {new Date(movement.date).toLocaleDateString('en-IN')}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {movement.type === 'received' ? 'Received' : 'Delivered'} {movement.quantity} {movement.material_type}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {movement.reference}
              </Typography>
              <Typography variant="caption" color="primary" display="block">
                Running Stock: {movement.running_stock}
              </Typography>
            </Box>
          </TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  );

  const renderStockSnapshot = (snapshot: CustomerStockSnapshot) => (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Inventory color="primary" />
        {snapshot.customer_name} - Current Stock Snapshot
      </Typography>
      
      <Grid container spacing={3}>
        {Object.entries(snapshot.stock_summary).map(([materialType, data]) => (
          <Grid item xs={12} md={4} key={materialType}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {materialType}
                </Typography>
                
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h4" fontWeight="bold" color="primary">
                    {data.current_stock}
                  </Typography>
                  <Chip
                    label={getStockStatusLabel(data.current_stock)}
                    color={getStockStatusColor(data.current_stock)}
                    size="small"
                  />
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="success.main">
                    <TrendingUp fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                    Received: {data.total_received}
                  </Typography>
                </Box>
                
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="error.main">
                    <TrendingDown fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                    Delivered: {data.total_delivered}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const renderMovementHistory = (snapshot: CustomerStockSnapshot) => (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TimelineIcon color="primary" />
        Complete Movement History
      </Typography>
      
      {Object.entries(snapshot.stock_summary).map(([materialType, data]) => (
        <Card key={materialType} sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {materialType} Movement History
            </Typography>
            {renderMovementTimeline(data.movements)}
          </CardContent>
        </Card>
      ))}
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Inventory color="primary" />
          Textile Stock Tracker
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant={demoMode ? 'contained' : 'outlined'}
            onClick={() => setDemoMode(true)}
          >
            Demo Mode
          </Button>
          <Button
            variant={!demoMode ? 'contained' : 'outlined'}
            onClick={() => setDemoMode(false)}
          >
            Live Data
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadStockData}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Your Business Example */}
      {demoMode && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2" fontWeight="bold">
            📋 Your Business Example (Demo Mode):
          </Typography>
          <Typography variant="body2">
            • May 1st: Customer gave 10 sarees, 30 duppatas, 40 blouses<br/>
            • May 3rd: Customer gave 45 sarees, 50 duppatas<br/>
            • May 5th: Delivered 35 sarees<br/>
            • May 7th: Customer gave 100 blouses, 20 sarees<br/>
            • May 9th: Delivered 40 sarees, 20 blouses
          </Typography>
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        stockSnapshots.map((snapshot, index) => (
          <Card key={index} sx={{ mb: 3 }}>
            <CardContent>
              <Tabs value={selectedTab} onChange={(e, v) => setSelectedTab(v)} sx={{ mb: 3 }}>
                <Tab label="Current Stock Snapshot" />
                <Tab label="Movement History" />
                <Tab label="Stock Analysis" />
              </Tabs>

              {selectedTab === 0 && renderStockSnapshot(snapshot)}
              
              {selectedTab === 1 && renderMovementHistory(snapshot)}
              
              {selectedTab === 2 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Stock Analysis & Insights
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1" gutterBottom>
                            📊 Material Type Distribution
                          </Typography>
                          {Object.entries(snapshot.stock_summary).map(([type, data]) => (
                            <Box key={type} display="flex" justifyContent="space-between" mb={1}>
                              <Typography variant="body2">{type}:</Typography>
                              <Typography variant="body2" fontWeight="bold">
                                {((data.current_stock / Object.values(snapshot.stock_summary)
                                  .reduce((sum, d) => sum + d.current_stock, 0)) * 100).toFixed(1)}%
                              </Typography>
                            </Box>
                          ))}
                        </CardContent>
                      </Card>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1" gutterBottom>
                            ⚡ Quick Stats
                          </Typography>
                          <Typography variant="body2">
                            Total Materials: {Object.keys(snapshot.stock_summary).length} types
                          </Typography>
                          <Typography variant="body2">
                            Total Stock: {Object.values(snapshot.stock_summary)
                              .reduce((sum, d) => sum + d.current_stock, 0)} pieces
                          </Typography>
                          <Typography variant="body2">
                            Total Received: {Object.values(snapshot.stock_summary)
                              .reduce((sum, d) => sum + d.total_received, 0)} pieces
                          </Typography>
                          <Typography variant="body2">
                            Total Delivered: {Object.values(snapshot.stock_summary)
                              .reduce((sum, d) => sum + d.total_delivered, 0)} pieces
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </Box>
  );
};

export default TextileStockTracker;