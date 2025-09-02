// Business Intelligence Dashboard - Advanced Analytics UI
// Integrates with business intelligence APIs for comprehensive insights

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Analytics,
  TrendingUp,
  Warning,
  AccountBalance,
  Assessment,
  Inventory,
  Schedule,
  Refresh,
  Download,
  FilterList,
} from '@mui/icons-material';
import { businessIntelligenceApi } from '../services/businessReportsApi';
import { componentLogger } from '../utils/debug';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const BusinessIntelligence: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states for different analysis types
  const [customerProfitability, setCustomerProfitability] = useState<any[]>([]);
  const [productionBottlenecks, setProductionBottlenecks] = useState<any[]>([]);
  const [materialWaste, setMaterialWaste] = useState<any[]>([]);
  const [seasonalDemand, setSeasonalDemand] = useState<any[]>([]);

  const loadCustomerProfitabilityAnalysis = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await businessIntelligenceApi.getCustomerProfitabilityAnalysis();
      setCustomerProfitability(data || []);
      componentLogger.info('Customer profitability analysis loaded', { count: data?.length });
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load customer profitability analysis';
      setError(errorMessage);
      componentLogger.error('Customer profitability analysis error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProductionBottleneckAnalysis = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await businessIntelligenceApi.getProductionBottleneckAnalysis();
      setProductionBottlenecks(data || []);
      componentLogger.info('Production bottleneck analysis loaded', { count: data?.length });
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load production bottleneck analysis';
      setError(errorMessage);
      componentLogger.error('Production bottleneck analysis error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMaterialWasteAnalysis = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await businessIntelligenceApi.getMaterialWasteAnalysis();
      setMaterialWaste(data || []);
      componentLogger.info('Material waste analysis loaded', { count: data?.length });
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load material waste analysis';
      setError(errorMessage);
      componentLogger.error('Material waste analysis error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSeasonalDemandAnalysis = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await businessIntelligenceApi.getSeasonalDemandAnalysis();
      setSeasonalDemand(data || []);
      componentLogger.info('Seasonal demand analysis loaded', { count: data?.length });
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load seasonal demand analysis';
      setError(errorMessage);
      componentLogger.error('Seasonal demand analysis error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    
    // Load data based on tab
    switch (newValue) {
      case 0:
        if (customerProfitability.length === 0) loadCustomerProfitabilityAnalysis();
        break;
      case 1:
        if (productionBottlenecks.length === 0) loadProductionBottleneckAnalysis();
        break;
      case 2:
        if (materialWaste.length === 0) loadMaterialWasteAnalysis();
        break;
      case 3:
        if (seasonalDemand.length === 0) loadSeasonalDemandAnalysis();
        break;
    }
  };

  const refreshCurrentTab = () => {
    switch (tabValue) {
      case 0: loadCustomerProfitabilityAnalysis(); break;
      case 1: loadProductionBottleneckAnalysis(); break;
      case 2: loadMaterialWasteAnalysis(); break;
      case 3: loadSeasonalDemandAnalysis(); break;
    }
  };

  // Load initial data
  useEffect(() => {
    loadCustomerProfitabilityAnalysis();
  }, [loadCustomerProfitabilityAnalysis]);

  const renderCustomerTierChip = (tier: string) => {
    const colors = {
      PREMIUM: 'success',
      GOLD: 'warning',
      SILVER: 'info',
      BRONZE: 'default'
    } as const;
    
    return (
      <Chip 
        label={tier} 
        color={colors[tier as keyof typeof colors] || 'default'} 
        size="small" 
      />
    );
  };

  const renderBottleneckSeverity = (severity: string) => {
    const colors = {
      CRITICAL: 'error',
      HIGH: 'warning',
      MEDIUM: 'info',
      LOW: 'success'
    } as const;
    
    return (
      <Chip 
        label={severity} 
        color={colors[severity as keyof typeof colors] || 'default'} 
        size="small" 
      />
    );
  };

  const renderWasteRisk = (risk: string) => {
    const colors = {
      HIGH_WASTE_RISK: 'error',
      OVER_STOCKED: 'warning',
      MEDIUM_WASTE_RISK: 'info',
      STAGNANT_STOCK: 'warning',
      HEALTHY: 'success'
    } as const;
    
    return (
      <Chip 
        label={risk.replace(/_/g, ' ')} 
        color={colors[risk as keyof typeof colors] || 'default'} 
        size="small" 
      />
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Analytics color="primary" />
          Business Intelligence
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={refreshCurrentTab}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab 
              label="Customer Profitability" 
              icon={<AccountBalance />} 
              iconPosition="start"
            />
            <Tab 
              label="Production Bottlenecks" 
              icon={<Warning />} 
              iconPosition="start"
            />
            <Tab 
              label="Material Waste" 
              icon={<Inventory />} 
              iconPosition="start"
            />
            <Tab 
              label="Seasonal Demand" 
              icon={<TrendingUp />} 
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* Customer Profitability Analysis */}
        <TabPanel value={tabValue} index={0}>
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Customer</TableCell>
                    <TableCell align="right">Orders</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                    <TableCell align="right">Payments</TableCell>
                    <TableCell align="right">Outstanding</TableCell>
                    <TableCell align="right">Avg Payment Days</TableCell>
                    <TableCell align="right">Payment Reliability</TableCell>
                    <TableCell>Tier</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {customerProfitability.map((customer, index) => (
                    <TableRow key={index}>
                      <TableCell>{customer.customer_name}</TableCell>
                      <TableCell align="right">{customer.total_orders}</TableCell>
                      <TableCell align="right">₹{customer.total_revenue?.toLocaleString()}</TableCell>
                      <TableCell align="right">₹{customer.total_payments?.toLocaleString()}</TableCell>
                      <TableCell align="right">₹{customer.outstanding_amount?.toLocaleString()}</TableCell>
                      <TableCell align="right">{customer.avg_payment_days} days</TableCell>
                      <TableCell align="right">{customer.payment_reliability_percentage}%</TableCell>
                      <TableCell>{renderCustomerTierChip(customer.customer_tier)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* Production Bottlenecks Analysis */}
        <TabPanel value={tabValue} index={1}>
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Customer</TableCell>
                    <TableCell>Material</TableCell>
                    <TableCell>Workflow Stage</TableCell>
                    <TableCell align="right">Days Stuck</TableCell>
                    <TableCell align="right">Value</TableCell>
                    <TableCell>Severity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {productionBottlenecks.map((bottleneck, index) => (
                    <TableRow key={index}>
                      <TableCell>{bottleneck.customer_name}</TableCell>
                      <TableCell>{bottleneck.material_type}</TableCell>
                      <TableCell>{bottleneck.workflow_stage}</TableCell>
                      <TableCell align="right">{bottleneck.days_in_status}</TableCell>
                      <TableCell align="right">₹{bottleneck.value?.toLocaleString()}</TableCell>
                      <TableCell>{renderBottleneckSeverity(bottleneck.bottleneck_severity)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* Material Waste Analysis */}
        <TabPanel value={tabValue} index={2}>
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Customer</TableCell>
                    <TableCell>Material</TableCell>
                    <TableCell align="right">Utilization %</TableCell>
                    <TableCell align="right">Current Stock</TableCell>
                    <TableCell align="right">Days Since Movement</TableCell>
                    <TableCell align="right">Estimated Waste Value</TableCell>
                    <TableCell>Risk Category</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {materialWaste.map((waste, index) => (
                    <TableRow key={index}>
                      <TableCell>{waste.customer_name}</TableCell>
                      <TableCell>{waste.material_type}</TableCell>
                      <TableCell align="right">{waste.utilization_percentage}%</TableCell>
                      <TableCell align="right">{waste.current_stock}</TableCell>
                      <TableCell align="right">{waste.days_since_last_movement}</TableCell>
                      <TableCell align="right">₹{waste.estimated_waste_value?.toLocaleString()}</TableCell>
                      <TableCell>{renderWasteRisk(waste.waste_risk_category)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* Seasonal Demand Analysis */}
        <TabPanel value={tabValue} index={3}>
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Season</TableCell>
                    <TableCell>Material Type</TableCell>
                    <TableCell align="right">Orders</TableCell>
                    <TableCell align="right">Total Quantity</TableCell>
                    <TableCell align="right">Average Unit Price</TableCell>
                    <TableCell align="right">Total Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {seasonalDemand.map((demand, index) => (
                    <TableRow key={index}>
                      <TableCell>{demand.season}</TableCell>
                      <TableCell>{demand.material_type}</TableCell>
                      <TableCell align="right">{demand.order_count}</TableCell>
                      <TableCell align="right">{demand.total_quantity}</TableCell>
                      <TableCell align="right">₹{demand.avg_unit_price?.toFixed(2)}</TableCell>
                      <TableCell align="right">₹{demand.total_value?.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>
      </Card>
    </Box>
  );
};

export default BusinessIntelligence;