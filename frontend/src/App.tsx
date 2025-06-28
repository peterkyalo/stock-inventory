import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { ProductList } from './pages/Products/ProductList';
import { ProductForm } from './pages/Products/ProductForm';
import { ProductDetail } from './pages/Products/ProductDetail';
import { ProductAlerts } from './pages/Products/ProductAlerts';
import { CategoryList } from './pages/Categories/CategoryList';
import { CategoryForm } from './pages/Categories/CategoryForm';
import { CategoryDetail } from './pages/Categories/CategoryDetail';
import { SupplierList } from './pages/Suppliers/SupplierList';
import { SupplierForm } from './pages/Suppliers/SupplierForm';
import { SupplierDetail } from './pages/Suppliers/SupplierDetail';
import { CustomerList } from './pages/Customers/CustomerList';
import { CustomerForm } from './pages/Customers/CustomerForm';
import { CustomerDetail } from './pages/Customers/CustomerDetail';
import { InventoryDashboard } from './pages/Inventory/InventoryDashboard';
import { InventoryMovements } from './pages/Inventory/InventoryMovements';
import { LocationList } from './pages/Inventory/LocationList';
import { LocationDetail } from './pages/Inventory/LocationDetail';
import { StockTransfer } from './pages/Inventory/StockTransfer';
import { SalesList } from './pages/Sales/SalesList';
import { SaleForm } from './pages/Sales/SaleForm';
import { SaleDetail } from './pages/Sales/SaleDetail';
import { SalesDashboard } from './pages/Sales/SalesDashboard';
import { PurchaseList } from './pages/Purchases/PurchaseList';
import { PurchaseForm } from './pages/Purchases/PurchaseForm';
import { PurchaseDetail } from './pages/Purchases/PurchaseDetail';
import { PurchaseDashboard } from './pages/Purchases/PurchaseDashboard';
import { ReportsDashboard } from './pages/Reports/ReportsDashboard';
import { InventoryReport } from './pages/Reports/InventoryReport';
import { SalesReport } from './pages/Reports/SalesReport';
import { PurchaseReport } from './pages/Reports/PurchaseReport';
import { FinancialReport } from './pages/Reports/FinancialReport';
import { StockMovementReport } from './pages/Reports/StockMovementReport';
import { ProductPerformanceReport } from './pages/Reports/ProductPerformanceReport';
import { CustomerAnalysisReport } from './pages/Reports/CustomerAnalysisReport';
import { SupplierAnalysisReport } from './pages/Reports/SupplierAnalysisReport';
import { ActivityLogReport } from './pages/Reports/ActivityLogReport';
import { ActivityLogList } from './pages/ActivityLogs/ActivityLogList';
import { ActivityLogDetail } from './pages/ActivityLogs/ActivityLogDetail';
import { ActivityLogDashboard } from './pages/ActivityLogs/ActivityLogDashboard';
import { UserList } from './pages/Users/UserList';
import { UserForm } from './pages/Users/UserForm';
import { UserDetail } from './pages/Users/UserDetail';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        
        {/* Products Routes */}
        <Route path="products" element={<ProductList />} />
        <Route path="products/new" element={<ProductForm />} />
        <Route path="products/alerts" element={<ProductAlerts />} />
        <Route path="products/alerts/low-stock" element={<ProductAlerts />} />
        <Route path="products/alerts/out-of-stock" element={<ProductAlerts />} />
        <Route path="products/alerts/expiry" element={<ProductAlerts />} />
        <Route path="products/:id" element={<ProductDetail />} />
        <Route path="products/:id/edit" element={<ProductForm />} />
        
        {/* Categories Routes */}
        <Route path="categories" element={<CategoryList />} />
        <Route path="categories/new" element={<CategoryForm />} />
        <Route path="categories/:id" element={<CategoryDetail />} />
        <Route path="categories/:id/edit" element={<CategoryForm />} />
        
        {/* Suppliers Routes */}
        <Route path="suppliers" element={<SupplierList />} />
        <Route path="suppliers/new" element={<SupplierForm />} />
        <Route path="suppliers/:id" element={<SupplierDetail />} />
        <Route path="suppliers/:id/edit" element={<SupplierForm />} />
        
        {/* Customers Routes */}
        <Route path="customers" element={<CustomerList />} />
        <Route path="customers/new" element={<CustomerForm />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="customers/:id/edit" element={<CustomerForm />} />
        
        {/* Inventory Routes */}
        <Route path="inventory" element={<InventoryDashboard />} />
        <Route path="inventory/movements" element={<InventoryMovements />} />
        <Route path="inventory/movements/new" element={<InventoryMovements />} />
        <Route path="inventory/locations" element={<LocationList />} />
        <Route path="inventory/locations/:id" element={<LocationDetail />} />
        <Route path="inventory/transfer" element={<StockTransfer />} />
        
        {/* Sales Routes */}
        <Route path="sales" element={<SalesList />} />
        <Route path="sales/dashboard" element={<SalesDashboard />} />
        <Route path="sales/new" element={<SaleForm />} />
        <Route path="sales/:id" element={<SaleDetail />} />
        <Route path="sales/:id/edit" element={<SaleForm />} />
        
        {/* Purchases Routes */}
        <Route path="purchases" element={<PurchaseList />} />
        <Route path="purchases/dashboard" element={<PurchaseDashboard />} />
        <Route path="purchases/new" element={<PurchaseForm />} />
        <Route path="purchases/:id" element={<PurchaseDetail />} />
        <Route path="purchases/:id/edit" element={<PurchaseForm />} />
        
        {/* Reports Routes */}
        <Route path="reports" element={<ReportsDashboard />} />
        <Route path="reports/inventory" element={<InventoryReport />} />
        <Route path="reports/sales" element={<SalesReport />} />
        <Route path="reports/purchases" element={<PurchaseReport />} />
        <Route path="reports/financial" element={<FinancialReport />} />
        <Route path="reports/stock-movements" element={<StockMovementReport />} />
        <Route path="reports/product-performance" element={<ProductPerformanceReport />} />
        <Route path="reports/customer-analysis" element={<CustomerAnalysisReport />} />
        <Route path="reports/supplier-analysis" element={<SupplierAnalysisReport />} />
        <Route path="reports/activity-logs" element={<ActivityLogReport />} />
        
        {/* Activity Logs Routes */}
        <Route path="activity" element={<ActivityLogList />} />
        <Route path="activity/dashboard" element={<ActivityLogDashboard />} />
        <Route path="activity/:id" element={<ActivityLogDetail />} />
        
        {/* Users Routes */}
        <Route path="users" element={<UserList />} />
        <Route path="users/new" element={<UserForm />} />
        <Route path="users/:id" element={<UserDetail />} />
        <Route path="users/:id/edit" element={<UserForm />} />
        
        {/* Settings Route */}
        <Route path="settings" element={<div>Settings Page</div>} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10B981',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;