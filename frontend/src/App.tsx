import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { AuthProvider } from './context/AuthContext';
import theme from './theme';
import Layout from './components/common/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
// import AdvancedDashboard from './pages/AdvancedDashboard';
// import BusinessIntelligence from './pages/BusinessIntelligence';
// import WorkflowManagement from './pages/WorkflowManagement';
import Customers from './pages/Customers';
import Orders from './pages/Orders';
import Production from './pages/Production';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import EnhancedReports from './pages/EnhancedReports';
import Materials from './pages/Materials';
import DeliveryChallans from './pages/DeliveryChallans';
import GSTInvoices from './pages/GSTInvoices';
import CustomerStock from './pages/CustomerStock';
import CustomerStockDemo from './components/CustomerStockDemo';
import TextileStockTracker from './components/TextileStockTracker';
import BusinessFlowTester from './components/BusinessFlowTester';
import DebugPanel from './components/debug/DebugPanel';
import DesignerDashboard from './pages/DesignerDashboard';
import DesignerWorkload from './pages/DesignerWorkload';
import DesignLibrary from './pages/DesignLibrary';
import MyAssignments from './pages/MyAssignments';
import APITester from './pages/APITester';
import Employees from './pages/Employees';
import Payroll from './pages/Payroll';
import Expenses from './pages/Expenses';
import Purchases from './pages/Purchases';
import Payments from './pages/Payments';
import StockReconciliation from './pages/StockReconciliation';
// import SchemaAnalysis from './pages/SchemaAnalysis'; // Commented out - not required for business operations
import './utils/debugDatabase'; // Import debug database helpers
import './utils/loginDebugHelper'; // Import login debug helpers

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            {/* <Route
              path="/dashboard/advanced"
              element={
                <ProtectedRoute>
                  <Layout>
                    <AdvancedDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            /> */}
            {/* <Route
              path="/business-intelligence"
              element={
                <ProtectedRoute>
                  <Layout>
                    <BusinessIntelligence />
                  </Layout>
                </ProtectedRoute>
              }
            /> */}
            {/* <Route
              path="/workflow"
              element={
                <ProtectedRoute>
                  <Layout>
                    <WorkflowManagement />
                  </Layout>
                </ProtectedRoute>
              }
            /> */}
            <Route
              path="/customers"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Customers />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Orders />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/production"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Production />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Designer Management Routes */}
            <Route
              path="/designer-dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DesignerDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/designer-workload"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DesignerWorkload />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/design-library"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DesignLibrary />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-assignments"
              element={
                <ProtectedRoute>
                  <Layout>
                    <MyAssignments />
                  </Layout>
                </ProtectedRoute>
              }
            />
            {/* Schema Analysis - Commented out as not required for business operations
            <Route
              path="/schema-analysis"
              element={
                <ProtectedRoute>
                  <Layout>
                    <SchemaAnalysis />
                  </Layout>
                </ProtectedRoute>
              }
            />
            */}

            {/* Functional routes */}
            <Route
              path="/inventory"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Inventory />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <Layout>
                    <EnhancedReports />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/basic"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Reports />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/materials"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Materials />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer-stock"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CustomerStock />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer-stock/demo"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CustomerStockDemo />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/textile-stock-tracker"
              element={
                <ProtectedRoute>
                  <Layout>
                    <TextileStockTracker />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/business-flow-tester"
              element={
                <ProtectedRoute>
                  <Layout>
                    <BusinessFlowTester />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Placeholder routes for remaining pages */}
            <Route
              path="/challans"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DeliveryChallans />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoices"
              element={
                <ProtectedRoute>
                  <Layout>
                    <GSTInvoices />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* API Testing Route */}
            <Route
              path="/api-tester"
              element={
                <ProtectedRoute>
                  <Layout>
                    <APITester />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* New Module Routes - Full UI Implementation */}
            <Route
              path="/employees"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Employees />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Payroll />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/expenses"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Expenses />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/purchases"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Purchases />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/payments"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Payments />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/stock-reconciliation"
              element={
                <ProtectedRoute>
                  <Layout>
                    <StockReconciliation />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
        
        {/* Debug Panel - Only show in development */}
        {process.env.NODE_ENV === 'development' && <DebugPanel />}
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
