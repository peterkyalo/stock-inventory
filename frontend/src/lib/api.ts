import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    // Don't show toast for login errors - let the component handle it
    if (!error.config?.url?.includes('/auth/login')) {
      const message = error.response?.data?.message || 'An error occurred';
      toast.error(message);
    }
    
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authAPI = {
  login: (credentials: { email: string; password: string }) =>
    api.post('/auth/login', credentials),
  
  register: (userData: any) =>
    api.post('/auth/register', userData),
  
  logout: () =>
    api.post('/auth/logout'),
  
  getProfile: () =>
    api.get('/auth/me'),
  
  updateProfile: (data: any) =>
    api.put('/auth/profile', data),
  
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/auth/change-password', data),
};

// Enhanced Products API
export const productsAPI = {
  getAll: (params?: any) =>
    api.get('/products', { params }),
  
  getById: (id: string) =>
    api.get(`/products/${id}`),
  
  create: (data: FormData | any) => {
    const config = data instanceof FormData ? {
      headers: { 'Content-Type': 'multipart/form-data' }
    } : {};
    return api.post('/products', data, config);
  },
  
  update: (id: string, data: FormData | any) => {
    const config = data instanceof FormData ? {
      headers: { 'Content-Type': 'multipart/form-data' }
    } : {};
    return api.put(`/products/${id}`, data, config);
  },
  
  delete: (id: string) =>
    api.delete(`/products/${id}`),
  
  // Enhanced endpoints
  getByCategory: (categoryId: string) =>
    api.get(`/products/category/${categoryId}`),
  
  getByBrand: (brand: string) =>
    api.get(`/products/brand/${brand}`),
  
  getLowStock: () =>
    api.get('/products/alerts/low-stock'),
  
  getOutOfStock: () =>
    api.get('/products/alerts/out-of-stock'),
  
  getExpiryAlerts: (days?: number) =>
    api.get('/products/alerts/expiry', { params: { days } }),
  
  search: (query: string) =>
    api.get('/products/search', { params: { q: query } }),
  
  // Stock management
  updateStock: (productId: string, data: { quantity: number; operation?: 'set' | 'add' | 'subtract'; reason?: string; notes?: string }) =>
    api.patch(`/products/${productId}/stock`, data),
  
  // Bulk operations
  bulkUpdate: (data: { productIds: string[]; updates: any }) =>
    api.post('/products/bulk/update', data),
  
  bulkUpdatePrices: (data: { productIds: string[]; priceAdjustment: { type: 'percentage' | 'fixed'; value: number } }) =>
    api.post('/products/bulk/update-prices', data),
  
  // Analytics
  getAnalytics: (productId: string) =>
    api.get(`/products/${productId}/analytics`),
  
  // Export
  export: (params?: any) =>
    api.get('/products/export', { params }),
  
  // Duplicate
  duplicate: (productId: string) =>
    api.post(`/products/${productId}/duplicate`),
};

// Enhanced Categories API
export const categoriesAPI = {
  getAll: (params?: any) =>
    api.get('/categories', { params }),
  
  getById: (id: string) =>
    api.get(`/categories/${id}`),
  
  create: (data: FormData | any) => {
    const config = data instanceof FormData ? {
      headers: { 'Content-Type': 'multipart/form-data' }
    } : {};
    return api.post('/categories', data, config);
  },
  
  update: (id: string, data: FormData | any) => {
    const config = data instanceof FormData ? {
      headers: { 'Content-Type': 'multipart/form-data' }
    } : {};
    return api.put(`/categories/${id}`, data, config);
  },
  
  delete: (id: string) =>
    api.delete(`/categories/${id}`),
  
  // Enhanced endpoints
  getTree: () =>
    api.get('/categories/tree'),
  
  getStats: (id: string) =>
    api.get(`/categories/${id}/stats`),
  
  bulkReorder: (categories: { id: string; sortOrder: number }[]) =>
    api.post('/categories/bulk/reorder', { categories }),
};

// Enhanced Suppliers API
export const suppliersAPI = {
  getAll: (params?: any) =>
    api.get('/suppliers', { params }),
  
  getById: (id: string) =>
    api.get(`/suppliers/${id}`),
  
  create: (data: any) =>
    api.post('/suppliers', data),
  
  update: (id: string, data: any) =>
    api.put(`/suppliers/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/suppliers/${id}`),
  
  // Enhanced endpoints
  updateStatus: (id: string, isActive: boolean) =>
    api.put(`/suppliers/${id}/status`, { isActive }),
  
  updateRating: (id: string, rating: number) =>
    api.put(`/suppliers/${id}/rating`, { rating }),
  
  getStats: (id: string) =>
    api.get(`/suppliers/${id}/stats`),
  
  bulkUpdate: (data: { supplierIds: string[]; updates: any }) =>
    api.post('/suppliers/bulk/update', data),
  
  export: (params?: any) =>
    api.get('/suppliers/export', { params }),
};

// Enhanced Customers API
export const customersAPI = {
  getAll: (params?: any) =>
    api.get('/customers', { params }),
  
  getById: (id: string) =>
    api.get(`/customers/${id}`),
  
  create: (data: any) =>
    api.post('/customers', data),
  
  update: (id: string, data: any) =>
    api.put(`/customers/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/customers/${id}`),
  
  // Enhanced endpoints
  updateStatus: (id: string, isActive: boolean) =>
    api.put(`/customers/${id}/status`, { isActive }),
  
  updateGroup: (id: string, customerGroup: string) =>
    api.put(`/customers/${id}/group`, { customerGroup }),
  
  getStats: (id: string) =>
    api.get(`/customers/${id}/stats`),
  
  bulkUpdate: (data: { customerIds: string[]; updates: any }) =>
    api.post('/customers/bulk/update', data),
  
  export: (params?: any) =>
    api.get('/customers/export', { params }),
};

// Enhanced Inventory API
export const inventoryAPI = {
  // Stock Movements
  getMovements: (params?: any) =>
    api.get('/inventory/movements', { params }),
  
  getMovementById: (id: string) =>
    api.get(`/inventory/movements/${id}`),
  
  createMovement: (data: any) =>
    api.post('/inventory/movements', data),
  
  getMovementSummary: (params?: any) =>
    api.get('/inventory/movements/summary', { params }),
  
  exportMovements: (params?: any) =>
    api.get('/inventory/movements/export', { params }),
  
  // Locations
  getLocations: (params?: any) =>
    api.get('/inventory/locations', { params }),
  
  getLocationById: (id: string) =>
    api.get(`/inventory/locations/${id}`),
  
  createLocation: (data: any) =>
    api.post('/inventory/locations', data),
  
  updateLocation: (id: string, data: any) =>
    api.put(`/inventory/locations/${id}`, data),
  
  deleteLocation: (id: string) =>
    api.delete(`/inventory/locations/${id}`),
  
  updateLocationStatus: (id: string, isActive: boolean) =>
    api.put(`/inventory/locations/${id}/status`, { isActive }),
  
  exportLocations: (params?: any) =>
    api.get('/inventory/locations/export', { params }),
  
  // Stock Transfer
  transferStock: (data: { 
    productId: string; 
    fromLocationId: string; 
    toLocationId: string; 
    quantity: number; 
    notes?: string 
  }) =>
    api.post('/inventory/transfer', data),
  
  // Product Stock by Location
  getProductStockByLocation: (productId: string) =>
    api.get(`/inventory/products/${productId}/locations`),
  
  // Location Stock
  getLocationStock: (locationId: string, params?: any) =>
    api.get(`/inventory/locations/${locationId}/stock`, { params }),
  
  // Dashboard Stats
  getStats: () =>
    api.get('/inventory/stats'),
};

// Enhanced Purchases API
export const purchasesAPI = {
  getAll: (params?: any) =>
    api.get('/purchases', { params }),
  
  getById: (id: string) =>
    api.get(`/purchases/${id}`),
  
  create: (data: any) =>
    api.post('/purchases', data),
  
  update: (id: string, data: any) =>
    api.put(`/purchases/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/purchases/${id}`),
  
  // Enhanced endpoints
  getDashboard: () =>
    api.get('/purchases/dashboard'),
  
  getSupplierPurchases: (supplierId: string, params?: any) =>
    api.get(`/purchases/supplier/${supplierId}`, { params }),
  
  updateStatus: (id: string, status: string) =>
    api.patch(`/purchases/${id}/status`, { status }),
  
  updatePayment: (id: string, data: { paymentStatus: string; paymentMethod?: string }) =>
    api.patch(`/purchases/${id}/payment`, data),
  
  receiveItems: (id: string, data: { receivedItems: { itemId: string; quantity: number }[] }) =>
    api.patch(`/purchases/${id}/receive`, data),
  
  export: (params?: any) =>
    api.get('/purchases/export', { params }),
  
  generatePurchaseOrder: (id: string) =>
    api.get(`/purchases/${id}/order`),
};

// Enhanced Sales API
export const salesAPI = {
  getAll: (params?: any) =>
    api.get('/sales', { params }),
  
  getById: (id: string) =>
    api.get(`/sales/${id}`),
  
  create: (data: any) =>
    api.post('/sales', data),
  
  update: (id: string, data: any) =>
    api.put(`/sales/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/sales/${id}`),
  
  // Enhanced endpoints
  getDashboard: () =>
    api.get('/sales/dashboard'),
  
  getCustomerSales: (customerId: string, params?: any) =>
    api.get(`/sales/customer/${customerId}`, { params }),
  
  updateStatus: (id: string, status: string) =>
    api.patch(`/sales/${id}/status`, { status }),
  
  updatePayment: (id: string, data: { paymentStatus: string; paymentMethod?: string }) =>
    api.patch(`/sales/${id}/payment`, data),
  
  generateInvoice: (id: string) =>
    api.get(`/sales/${id}/invoice`),
  
  export: (params?: any) =>
    api.get('/sales/export', { params }),
  
  checkOverdueInvoices: () =>
    api.get('/sales/check-overdue')
};

// Reports API
export const reportsAPI = {
  getDashboardStats: () =>
    api.get('/reports/dashboard'),
  
  getInventoryReport: (params?: any) =>
    api.get('/reports/inventory', { params }),
  
  getSalesReport: (params?: any) =>
    api.get('/reports/sales', { params }),
  
  getPurchaseReport: (params?: any) =>
    api.get('/reports/purchases', { params }),
  
  getStockMovementReport: (params?: any) =>
    api.get('/reports/stock-movements', { params }),
  
  getFinancialReport: (params?: any) =>
    api.get('/reports/financial', { params }),
  
  getActivityLogReport: (params?: any) =>
    api.get('/reports/activity-logs', { params }),
  
  getProductPerformanceReport: (params?: any) =>
    api.get('/reports/product-performance', { params }),
  
  getCustomerAnalysisReport: (params?: any) =>
    api.get('/reports/customer-analysis', { params }),
  
  getSupplierAnalysisReport: (params?: any) =>
    api.get('/reports/supplier-analysis', { params }),
  
  exportReportData: (params?: any) =>
    api.get('/reports/export', { params }),
};

// Users API
export const usersAPI = {
  getAll: (params?: any) =>
    api.get('/users', { params }),
  
  getById: (id: string) =>
    api.get(`/users/${id}`),
  
  create: (data: any) =>
    api.post('/users', data),
  
  update: (id: string, data: any) =>
    api.put(`/users/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/users/${id}`),
  
  updateStatus: (id: string, isActive: boolean) =>
    api.put(`/users/${id}/status`, { isActive }),
  
  updatePassword: (id: string, data: { password: string }) =>
    api.put(`/users/${id}/password`, data),
  
  getUserActivity: (id: string, params?: any) =>
    api.get(`/users/${id}/activity`, { params }),
  
  getUserPermissions: (id: string) =>
    api.get(`/users/${id}/permissions`),
  
  updatePermissions: (id: string, data: { permissions: string[] }) =>
    api.put(`/users/${id}/permissions`, data),
  
  bulkUpdate: (data: { userIds: string[]; updates: any }) =>
    api.post('/users/bulk/update', data),
  
  export: (params?: any) =>
    api.get('/users/export', { params }),
  
  uploadProfileImage: (id: string, data: FormData) => {
    return api.post(`/users/${id}/profile-image`, data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

// Settings API
export const settingsAPI = {
  get: () =>
    api.get('/settings'),
  
  update: (data: any) =>
    api.put('/settings', data),
    
  // Email settings
  getEmailSettings: () =>
    api.get('/settings/email'),
    
  updateEmailSettings: (data: any) =>
    api.put('/settings/email', data),
    
  // Tax settings
  getTaxSettings: () =>
    api.get('/settings/tax'),
    
  updateTaxSettings: (data: any) =>
    api.put('/settings/tax', data),
    
  // Inventory settings
  getInventorySettings: () =>
    api.get('/settings/inventory'),
    
  updateInventorySettings: (data: any) =>
    api.put('/settings/inventory', data),
    
  // Backup settings
  getBackupSettings: () =>
    api.get('/settings/backup'),
    
  updateBackupSettings: (data: any) =>
    api.put('/settings/backup', data),
    
  triggerBackup: () =>
    api.post('/settings/backup/trigger'),
    
  // System info
  getSystemInfo: () =>
    api.get('/settings/system-info')
};

// Activity Logs API
export const activityLogsAPI = {
  getAll: (params?: any) =>
    api.get('/activity-logs', { params }),
  
  getById: (id: string) =>
    api.get(`/activity-logs/${id}`),
  
  getUserActivity: (userId: string, params?: any) =>
    api.get(`/activity-logs/user/${userId}`, { params }),
  
  getSummary: (params?: any) =>
    api.get('/activity-logs/summary', { params }),
  
  export: (params?: any) =>
    api.get('/activity-logs/export', { params }),
  
  clearOldLogs: (data: { olderThan: '30days' | '90days' | '6months' | '1year' }) =>
    api.post('/activity-logs/clear', data),
};