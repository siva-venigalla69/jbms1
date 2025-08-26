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
import Customers from './pages/Customers';
import Orders from './pages/Orders';
import Production from './pages/Production';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import Materials from './pages/Materials';
import DeliveryChallans from './pages/DeliveryChallans';
import GSTInvoices from './pages/GSTInvoices';
import CustomerStock from './pages/CustomerStock';
import DebugPanel from './components/debug/DebugPanel';
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
