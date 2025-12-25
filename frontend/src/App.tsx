import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { AuthProvider } from './context/AuthContext';
import theme from './theme';
import Layout from './components/common/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';
import Login from './pages/Login';

// Simplified 13-table schema pages ONLY
import SimplifiedDashboard from './pages/SimplifiedDashboard';
import Customers from './pages/Customers';
import OrdersSimplified from './pages/OrdersSimplified';
import ProductionStock from './pages/ProductionStock';
import MaterialReceiptSimplified from './pages/MaterialReceiptSimplified';
import ReturnsSimplified from './pages/ReturnsSimplified';
import MisprintSalesSimplified from './pages/MisprintSalesSimplified';
import DeliveriesSimplified from './pages/DeliveriesSimplified';
import InvoicesSimplified from './pages/InvoicesSimplified';
import PaymentsSimplified from './pages/PaymentsSimplified';
import ReportsSimplified from './pages/ReportsSimplified';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />

            {/* Simplified Schema Routes (13-table system) */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <SimplifiedDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
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
                    <OrdersSimplified />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/production-stock"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ProductionStock />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/material-receipt"
              element={
                <ProtectedRoute>
                  <Layout>
                    <MaterialReceiptSimplified />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/returns"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ReturnsSimplified />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/misprint-sales"
              element={
                <ProtectedRoute>
                  <Layout>
                    <MisprintSalesSimplified />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/deliveries"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DeliveriesSimplified />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoices"
              element={
                <ProtectedRoute>
                  <Layout>
                    <InvoicesSimplified />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/payments"
              element={
                <ProtectedRoute>
                  <Layout>
                    <PaymentsSimplified />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ReportsSimplified />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Default redirect to simplified dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
