import express from 'express';
import { query } from 'express-validator';
import { protect, authorize } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import {
  getDashboardStats,
  getInventoryReport,
  getSalesReport,
  getPurchaseReport,
  getStockMovementReport,
  getFinancialReport,
  getActivityLogReport,
  getProductPerformanceReport,
  getCustomerAnalysisReport,
  getSupplierAnalysisReport,
  exportReportData
} from '../controllers/reports.js';

const router = express.Router();

// Validation rules
const dateRangeValidation = [
  query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date format')
];

const inventoryReportValidation = [
  ...dateRangeValidation,
  query('category').optional().isMongoId().withMessage('Invalid category ID'),
  query('location').optional().isMongoId().withMessage('Invalid location ID'),
  query('status').optional().isIn(['low_stock', 'out_of_stock', 'in_stock']).withMessage('Invalid status'),
  query('sortBy').optional().isIn(['name', 'sku', 'brand', 'currentStock', 'costPrice', 'sellingPrice', 'stockValue', 'lastStockUpdate']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
];

const salesReportValidation = [
  ...dateRangeValidation,
  query('customer').optional().isMongoId().withMessage('Invalid customer ID'),
  query('status').optional().isIn(['draft', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned']).withMessage('Invalid status'),
  query('paymentStatus').optional().isIn(['unpaid', 'partially_paid', 'paid', 'overdue']).withMessage('Invalid payment status'),
  query('salesPerson').optional().isMongoId().withMessage('Invalid sales person ID'),
  query('groupBy').optional().isIn(['day', 'week', 'month', 'customer', 'product']).withMessage('Invalid groupBy parameter')
];

const purchaseReportValidation = [
  ...dateRangeValidation,
  query('supplier').optional().isMongoId().withMessage('Invalid supplier ID'),
  query('status').optional().isIn(['draft', 'pending', 'approved', 'ordered', 'partially_received', 'received', 'cancelled']).withMessage('Invalid status'),
  query('paymentStatus').optional().isIn(['unpaid', 'partially_paid', 'paid']).withMessage('Invalid payment status'),
  query('groupBy').optional().isIn(['day', 'week', 'month', 'supplier', 'product']).withMessage('Invalid groupBy parameter')
];

const stockMovementReportValidation = [
  ...dateRangeValidation,
  query('product').optional().isMongoId().withMessage('Invalid product ID'),
  query('type').optional().isIn(['in', 'out', 'transfer', 'adjustment']).withMessage('Invalid movement type'),
  query('reason').optional().isIn(['purchase', 'sale', 'return', 'damage', 'loss', 'theft', 'transfer', 'adjustment', 'opening_stock', 'manufacturing']).withMessage('Invalid reason'),
  query('location').optional().isMongoId().withMessage('Invalid location ID'),
  query('groupBy').optional().isIn(['day', 'week', 'month', 'product', 'type', 'reason']).withMessage('Invalid groupBy parameter')
];

const financialReportValidation = [
  ...dateRangeValidation,
  query('period').optional().isIn(['day', 'week', 'month', 'quarter', 'year']).withMessage('Invalid period'),
  query('includeExpenses').optional().isIn(['true', 'false']).withMessage('includeExpenses must be true or false')
];

const activityLogReportValidation = [
  ...dateRangeValidation,
  query('user').optional().isMongoId().withMessage('Invalid user ID'),
  query('action').optional().isIn(['create', 'read', 'update', 'delete', 'login', 'logout', 'export', 'import', 'approve', 'reject', 'cancel']).withMessage('Invalid action'),
  query('resource').optional().isIn(['user', 'product', 'category', 'supplier', 'customer', 'purchase', 'sale', 'inventory', 'stock_movement', 'location', 'settings']).withMessage('Invalid resource'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000')
];

const productPerformanceReportValidation = [
  ...dateRangeValidation,
  query('category').optional().isMongoId().withMessage('Invalid category ID'),
  query('brand').optional().isString().withMessage('Invalid brand'),
  query('sortBy').optional().isIn(['sales', 'revenue', 'profit', 'margin', 'turnover']).withMessage('Invalid sort field'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

const customerAnalysisReportValidation = [
  ...dateRangeValidation,
  query('customerGroup').optional().isIn(['regular', 'vip', 'wholesale', 'retail']).withMessage('Invalid customer group'),
  query('sortBy').optional().isIn(['revenue', 'orders', 'profit', 'aov', 'clv', 'recency']).withMessage('Invalid sort field'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

const supplierAnalysisReportValidation = [
  ...dateRangeValidation,
  query('sortBy').optional().isIn(['amount', 'orders', 'aov', 'rating', 'ontime', 'recency']).withMessage('Invalid sort field'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

const exportReportValidation = [
  query('reportType').isIn(['inventory', 'sales', 'purchases', 'stock-movements', 'product-performance', 'customer-analysis', 'supplier-analysis']).withMessage('Invalid report type'),
  query('format').optional().isIn(['csv', 'excel', 'pdf']).withMessage('Invalid format')
];

// Routes
router.get('/dashboard', protect, getDashboardStats);

router.get('/inventory', protect, authorize('reports.read'), inventoryReportValidation, validateRequest, getInventoryReport);
router.get('/sales', protect, authorize('reports.read'), salesReportValidation, validateRequest, getSalesReport);
router.get('/purchases', protect, authorize('reports.read'), purchaseReportValidation, validateRequest, getPurchaseReport);
router.get('/stock-movements', protect, authorize('reports.read'), stockMovementReportValidation, validateRequest, getStockMovementReport);
router.get('/financial', protect, authorize('reports.read'), financialReportValidation, validateRequest, getFinancialReport);
router.get('/activity-logs', protect, authorize('reports.read'), activityLogReportValidation, validateRequest, getActivityLogReport);
router.get('/product-performance', protect, authorize('reports.read'), productPerformanceReportValidation, validateRequest, getProductPerformanceReport);
router.get('/customer-analysis', protect, authorize('reports.read'), customerAnalysisReportValidation, validateRequest, getCustomerAnalysisReport);
router.get('/supplier-analysis', protect, authorize('reports.read'), supplierAnalysisReportValidation, validateRequest, getSupplierAnalysisReport);

router.get('/export', protect, authorize('reports.read'), exportReportValidation, validateRequest, exportReportData);

export default router;