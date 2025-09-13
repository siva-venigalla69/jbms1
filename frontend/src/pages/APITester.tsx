import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
  Chip,
  LinearProgress,
  Grid,
  Paper
} from '@mui/material';
import { PlayArrow, CheckCircle, Error, Warning } from '@mui/icons-material';
import { runAPITests, testFunctions } from '../utils/testApiServices';
import { deploySchema } from '../utils/deploySchema';
import { checkDatabaseStructure, testBasicConnection } from '../utils/checkDatabase';
import { quickSchemaTest, testEmployeeCRUD, createSampleData } from '../utils/quickApiTest';
import { runE2ETests } from '../utils/e2eTestSuite';

interface TestResult {
  tested: boolean;
  success: boolean;
  error: string | null;
}

interface TestResults {
  employee: TestResult;
  payroll: TestResult;
  expenses: TestResult;
  purchases: TestResult;
  payments: TestResult;
}

const APITester: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResults | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setResults(null);
    setLogs([]);
    
    addLog('Starting API tests...');
    
    try {
      const testResults = await runAPITests();
      setResults(testResults);
      addLog('API tests completed');
    } catch (error) {
      addLog(`Error running tests: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const runIndividualTest = async (testName: string, testFunction: () => Promise<any>) => {
    addLog(`Running ${testName} test...`);
    try {
      const result = await testFunction();
      addLog(`${testName} test: ${result.success ? 'PASSED' : 'FAILED'}`);
      if (!result.success && result.error) {
        addLog(`Error: ${result.error}`);
      }
    } catch (error) {
      addLog(`${testName} test failed: ${error}`);
    }
  };

  const runSchemaDeployment = async () => {
    addLog('Preparing schema deployment...');
    try {
      const result = await deploySchema();
      addLog(result.message || 'Schema deployment completed');
    } catch (error) {
      addLog(`Schema deployment error: ${error}`);
    }
  };

  const runComprehensiveE2ETesting = async () => {
    addLog('🚀 Starting Comprehensive End-to-End Testing with Real Database...');
    setIsRunning(true);
    try {
      const report = await runE2ETests();
      
      addLog(`✅ E2E Testing Complete!`);
      addLog(`📊 Total Tests: ${report.totalTests}`);
      addLog(`✅ Successful: ${report.successCount}`);
      addLog(`❌ Failed: ${report.failureCount}`);
      addLog(`📈 Success Rate: ${((report.successCount / report.totalTests) * 100).toFixed(1)}%`);
      addLog(`⏱️ Total Duration: ${report.totalDuration}ms`);
      
      // Log module summaries
      Object.entries(report.summary).forEach(([module, stats]) => {
        const rate = stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : '0.0';
        addLog(`📋 ${module}: ${stats.success}/${stats.total} (${rate}%)`);
      });
      
      // Log any failures
      const failures = report.results.filter(r => !r.success);
      if (failures.length > 0) {
        addLog('❌ Failed Tests:');
        failures.forEach(f => {
          addLog(`  • ${f.module}.${f.operation}: ${f.error}`);
        });
      }
      
    } catch (error: any) {
      addLog(`❌ E2E Testing failed: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (result: TestResult) => {
    if (!result.tested) return <Warning color="warning" />;
    if (result.success) return <CheckCircle color="success" />;
    return <Error color="error" />;
  };

  const getStatusColor = (result: TestResult): "default" | "success" | "error" | "warning" => {
    if (!result.tested) return "warning";
    if (result.success) return "success";
    return "error";
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        API Services Tester
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Test your new API services for Employee Management, Payroll, Expenses, Purchases, and Payments.
      </Typography>

      <Grid container spacing={3}>
        {/* Control Panel */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Test Controls
              </Typography>
              
              <Box mb={2}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<PlayArrow />}
                  onClick={runAllTests}
                  disabled={isRunning}
                  fullWidth
                  sx={{ mb: 1 }}
                >
                  {isRunning ? 'Running Tests...' : 'Run All API Tests'}
                </Button>
                
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<PlayArrow />}
                  onClick={runComprehensiveE2ETesting}
                  disabled={isRunning}
                  fullWidth
                  sx={{ mb: 1 }}
                >
                  {isRunning ? 'Running E2E Tests...' : '🧪 Run Comprehensive E2E Tests'}
                </Button>
                
                {isRunning && <LinearProgress sx={{ mt: 1 }} />}
              </Box>

              <Typography variant="subtitle2" gutterBottom>
                Individual Tests:
              </Typography>
              
              <Box display="flex" flexDirection="column" gap={1}>
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  onClick={() => runIndividualTest('Quick Schema Test', quickSchemaTest)}
                  disabled={isRunning}
                >
                  🚀 Quick Schema Test
                </Button>
                <Button
                  size="small"
                  onClick={() => runIndividualTest('Employee CRUD', testEmployeeCRUD)}
                  disabled={isRunning}
                >
                  Test Employee CRUD
                </Button>
                <Button
                  size="small"
                  onClick={() => runIndividualTest('Create Sample Data', createSampleData)}
                  disabled={isRunning}
                >
                  Create Sample Data
                </Button>
                
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, mb: 1 }}>
                  Individual API Tests:
                </Typography>
                
                <Button
                  size="small"
                  onClick={() => runIndividualTest('Employee API', testFunctions.testEmployeeAPI)}
                  disabled={isRunning}
                >
                  Test Employee API
                </Button>
                <Button
                  size="small"
                  onClick={() => runIndividualTest('Payroll API', testFunctions.testPayrollAPI)}
                  disabled={isRunning}
                >
                  Test Payroll API
                </Button>
                <Button
                  size="small"
                  onClick={() => runIndividualTest('Expenses API', testFunctions.testExpensesAPI)}
                  disabled={isRunning}
                >
                  Test Expenses API
                </Button>
                <Button
                  size="small"
                  onClick={() => runIndividualTest('Purchases API', testFunctions.testPurchasesAPI)}
                  disabled={isRunning}
                >
                  Test Purchases API
                </Button>
                <Button
                  size="small"
                  onClick={() => runIndividualTest('Payments API', testFunctions.testPaymentsAPI)}
                  disabled={isRunning}
                >
                  Test Payments API
                </Button>
              </Box>

              <Box mt={2}>
                <Button
                  variant="outlined"
                  color="info"
                  onClick={runSchemaDeployment}
                  fullWidth
                  sx={{ mb: 1 }}
                >
                  Prepare Schema Deployment
                </Button>
                
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => runIndividualTest('Database Structure Check', checkDatabaseStructure)}
                  fullWidth
                  sx={{ mb: 1 }}
                >
                  Check Database Structure
                </Button>
                
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => runIndividualTest('Connection Test', testBasicConnection)}
                  fullWidth
                >
                  Test Database Connection
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Results Panel */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Test Results
              </Typography>
              
              {results ? (
                <Box>
                  {Object.entries(results).map(([apiName, result]) => (
                    <Box key={apiName} display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getStatusIcon(result)}
                        <Typography variant="body2">
                          {apiName.toUpperCase()} API
                        </Typography>
                      </Box>
                      <Chip
                        label={result.success ? 'PASS' : (result.tested ? 'FAIL' : 'PENDING')}
                        color={getStatusColor(result)}
                        size="small"
                      />
                    </Box>
                  ))}
                  
                  <Box mt={2}>
                    {Object.values(results).every(r => r.success) ? (
                      <Alert severity="success">
                        All API services are working correctly!
                      </Alert>
                    ) : (
                      <Alert severity="warning">
                        Some APIs failed. This is expected if database tables haven't been created yet.
                        Please deploy the SQL schema first.
                      </Alert>
                    )}
                  </Box>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Run tests to see results here...
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Logs Panel */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Test Logs
              </Typography>
              
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  maxHeight: 300,
                  overflow: 'auto',
                  backgroundColor: '#f5f5f5',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem'
                }}
              >
                {logs.length > 0 ? (
                  logs.map((log, index) => (
                    <Typography key={index} variant="body2" component="div">
                      {log}
                    </Typography>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No logs yet. Run tests to see output here...
                  </Typography>
                )}
              </Paper>
            </CardContent>
          </Card>
        </Grid>

        {/* Instructions */}
        <Grid size={{ xs: 12 }}>
          <Alert severity="info">
            <Typography variant="subtitle2" gutterBottom>
              Schema Deployment Instructions:
            </Typography>
            <Typography variant="body2">
              1. First, deploy the database schema using the SQL file: ENHANCED_EMPLOYEE_PAYMENTS_SYSTEM.sql<br/>
              2. Copy the SQL content to your Supabase SQL Editor and execute it<br/>
              3. Then run the API tests to verify everything works correctly<br/>
              4. Once tests pass, you can start building the frontend UI components
            </Typography>
          </Alert>
        </Grid>
      </Grid>
    </Box>
  );
};

export default APITester;