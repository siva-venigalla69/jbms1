// Business Flow API Tester - Tests all business workflow APIs
// Use this component to verify that APIs work correctly after database migration

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  ExpandMore,
  PlayArrow,
  CheckCircle,
  Error,
  Info,
} from '@mui/icons-material';
import businessFlowApi from '../services/businessFlowApi';

interface TestResult {
  name: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  data?: any;
  error?: string;
  duration?: number;
}

const BusinessFlowTester: React.FC = () => {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Material Receipts', status: 'pending' },
    { name: 'Design Received Orders', status: 'pending' },
    { name: 'Design Ready Items', status: 'pending' },
    { name: 'Completed Printing', status: 'pending' },
    { name: 'Items Ready for Delivery', status: 'pending' },
    { name: 'Delivery Challans', status: 'pending' },
    { name: 'Current Stock Snapshot', status: 'pending' },
    { name: 'Top Customers by Volume', status: 'pending' },
    { name: 'Stock Discrepancies', status: 'pending' },
  ]);

  const [overallStatus, setOverallStatus] = useState<'idle' | 'testing' | 'completed'>('idle');

  const updateTestResult = (index: number, result: Partial<TestResult>) => {
    setTests(prev => prev.map((test, i) => 
      i === index ? { ...test, ...result } : test
    ));
  };

  const runSingleTest = async (index: number, testFn: () => Promise<any>, testName: string) => {
    const startTime = Date.now();
    updateTestResult(index, { status: 'loading' });
    
    try {
      const data = await testFn();
      const duration = Date.now() - startTime;
      updateTestResult(index, { 
        status: 'success', 
        data, 
        duration,
        error: undefined 
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      updateTestResult(index, { 
        status: 'error', 
        error: error.message || 'Unknown error',
        duration,
        data: undefined 
      });
    }
  };

  const runAllTests = async () => {
    setOverallStatus('testing');
    
    // Test 1: Material Receipts
    await runSingleTest(0, () => 
      businessFlowApi.getMaterialReceipts('2024-01-01', '2025-12-31'), 
      'Material Receipts'
    );

    // Test 2: Design Received Orders
    await runSingleTest(1, () => 
      businessFlowApi.getOrdersWithDesignReceived(), 
      'Design Received Orders'
    );

    // Test 3: Design Ready Items
    await runSingleTest(2, () => 
      businessFlowApi.getOrdersWithDesignReady(), 
      'Design Ready Items'
    );

    // Test 4: Completed Printing
    await runSingleTest(3, () => 
      businessFlowApi.getCompletedPrintingJobs(), 
      'Completed Printing'
    );

    // Test 5: Items Ready for Delivery
    await runSingleTest(4, () => 
      businessFlowApi.getItemsReadyForDelivery(), 
      'Items Ready for Delivery'
    );

    // Test 6: Delivery Challans
    await runSingleTest(5, () => 
      businessFlowApi.getDeliveryChallansWithItems(), 
      'Delivery Challans'
    );

    // Test 7: Current Stock Snapshot
    await runSingleTest(6, () => 
      businessFlowApi.getCurrentStockSnapshot(), 
      'Current Stock Snapshot'
    );

    // Test 8: Top Customers
    await runSingleTest(7, () => 
      businessFlowApi.getTopCustomersByVolume(), 
      'Top Customers by Volume'
    );

    // Test 9: Stock Discrepancies
    await runSingleTest(8, () => 
      businessFlowApi.detectStockDiscrepancies(), 
      'Stock Discrepancies'
    );

    setOverallStatus('completed');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'loading': return <CircularProgress size={20} />;
      case 'success': return <CheckCircle color="success" />;
      case 'error': return <Error color="error" />;
      default: return <Info color="disabled" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'loading': return 'info';
      case 'success': return 'success';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const successCount = tests.filter(t => t.status === 'success').length;
  const errorCount = tests.filter(t => t.status === 'error').length;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Business Flow API Tester
      </Typography>
      
      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        This tool tests all business workflow APIs to ensure they work correctly after database migration.
      </Typography>

      {/* Overall Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Test Status</Typography>
            <Button
              variant="contained"
              startIcon={<PlayArrow />}
              onClick={runAllTests}
              disabled={overallStatus === 'testing'}
            >
              {overallStatus === 'testing' ? 'Running Tests...' : 'Run All Tests'}
            </Button>
          </Box>
          
          {overallStatus !== 'idle' && (
            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
              <Chip 
                label={`${successCount} Passed`} 
                color="success" 
                variant={successCount > 0 ? "filled" : "outlined"}
              />
              <Chip 
                label={`${errorCount} Failed`} 
                color="error" 
                variant={errorCount > 0 ? "filled" : "outlined"}
              />
              <Chip 
                label={`${tests.length - successCount - errorCount} Pending`}
                color="default"
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Test Results */}
      {tests.map((test, index) => (
        <Accordion key={index} sx={{ mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box display="flex" alignItems="center" gap={2} width="100%">
              {getStatusIcon(test.status)}
              <Typography variant="h6" sx={{ flex: 1 }}>
                {test.name}
              </Typography>
              <Chip
                label={test.status.toUpperCase()}
                color={getStatusColor(test.status) as any}
                size="small"
              />
              {test.duration && (
                <Typography variant="caption" color="textSecondary">
                  {test.duration}ms
                </Typography>
              )}
            </Box>
          </AccordionSummary>
          
          <AccordionDetails>
            {test.status === 'error' && test.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Error:</strong> {test.error}
                </Typography>
              </Alert>
            )}
            
            {test.status === 'success' && test.data && (
              <Box>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  <strong>Results:</strong> {Array.isArray(test.data) ? test.data.length : 1} records returned
                </Typography>
                
                {Array.isArray(test.data) && test.data.length > 0 && (
                  <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {Object.keys(test.data[0]).slice(0, 5).map(key => (
                            <TableCell key={key}>
                              <Typography variant="caption" fontWeight="bold">
                                {key.replace(/_/g, ' ').toUpperCase()}
                              </Typography>
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {test.data.slice(0, 5).map((row: any, rowIndex: number) => (
                          <TableRow key={rowIndex}>
                            {Object.keys(row).slice(0, 5).map(key => (
                              <TableCell key={key}>
                                <Typography variant="body2">
                                  {String(row[key]).substring(0, 50)}
                                  {String(row[key]).length > 50 ? '...' : ''}
                                </Typography>
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
                
                {test.data.length > 5 && (
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                    Showing first 5 of {test.data.length} records
                  </Typography>
                )}
              </Box>
            )}
            
            {test.status === 'pending' && (
              <Typography variant="body2" color="textSecondary">
                Test not yet run
              </Typography>
            )}
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Instructions */}
      <Card sx={{ mt: 3, bgcolor: 'info.light', color: 'info.contrastText' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            💡 Instructions
          </Typography>
          <Typography variant="body2">
            1. <strong>First</strong>: Apply the database migration (CLEAN_2_COLUMN_SIMPLE_FIX.sql)
            <br />
            2. <strong>Then</strong>: Click "Run All Tests" to verify APIs work correctly
            <br />
            3. <strong>Green tests</strong>: API working correctly with your database
            <br />
            4. <strong>Red tests</strong>: Check error messages for troubleshooting
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default BusinessFlowTester;