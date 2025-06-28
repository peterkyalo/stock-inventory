import express from 'express';
import { body, query } from 'express-validator';
import { protect, authorize } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import {
  getSales,
  getSaleById,
  createSale,
  updateSale,
  updateSaleStatus,
  updatePaymentStatus,
  deleteSale,
  getSalesDashboard,
  getCustomerSalesHistory,
  generateInvoice,
  exportSales,
  checkOverdueInvoices
} from '../controllers/sales.js';

const router = express.Router();

// Enhanced validation rules
const saleValidation = [
  body('customer')
    .notEmpty()
    .withMessage('Customer is required')
    .isMongoId()
    .withMessage('Invalid customer ID'),
  
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  
  body('items.*.product')
    .notEmpty()
    .withMessage('Product is required for each item')
    .isMongoId()
    .withMessage('Invalid product ID'),
  
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  
  body('items.*.unitPrice')
    .isFloat({ min: 0 })
    .withMessage('Unit price must be a positive number'),
  
  body('status')
    .optional()
    .isIn(['draft', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'])
    .withMessage('Invalid status'),
  
  body('paymentStatus')
    .optional()
    .isIn(['unpaid', 'partially_paid', 'paid', 'overdue'])
    .withMessage('Invalid payment status'),
  
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'check', 'bank_transfer', 'credit_card', 'other'])
    .withMessage('Invalid payment method'),
  
  body('shippingCost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Shipping cost must be a positive number'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

const statusUpdateValidation = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['draft', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'])
    .withMessage('Invalid status')
];

const paymentStatusUpdateValidation = [
  body('paymentStatus')
    .notEmpty()
    .withMessage('Payment status is required')
    .isIn(['unpaid', 'partially_paid', 'paid', 'overdue'])
    .withMessage('Invalid payment status'),
  
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'check', 'bank_transfer', 'credit_card', 'other'])
    .withMessage('Invalid payment method')
];

// Query validation for filtering
const filterValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sortBy').optional().isIn(['saleDate', 'invoiceNumber', 'grandTotal', 'status', 'paymentStatus', 'createdAt']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
  query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date format'),
  query('minAmount').optional().isFloat({ min: 0 }).withMessage('Minimum amount must be non-negative'),
  query('maxAmount').optional().isFloat({ min: 0 }).withMessage('Maximum amount must be non-negative')
];

// Routes
router.get('/', protect, authorize('sales.read'), filterValidation, validateRequest, getSales);
router.get('/dashboard', protect, authorize('sales.read'), getSalesDashboard);
router.get('/export', protect, authorize('sales.read'), exportSales);
router.get('/customer/:customerId', protect, authorize('sales.read'), getCustomerSalesHistory);
router.get('/check-overdue', protect, authorize('sales.write'), checkOverdueInvoices);
router.get('/:id', protect, authorize('sales.read'), getSaleById);
router.get('/:id/invoice', protect, authorize('sales.read'), generateInvoice);

router.post('/', protect, authorize('sales.write'), saleValidation, validateRequest, createSale);

router.put('/:id', protect, authorize('sales.write'), saleValidation, validateRequest, updateSale);
router.patch('/:id/status', protect, authorize('sales.write'), statusUpdateValidation, validateRequest, updateSaleStatus);
router.patch('/:id/payment', protect, authorize('sales.write'), paymentStatusUpdateValidation, validateRequest, updatePaymentStatus);

router.delete('/:id', protect, authorize('sales.delete'), deleteSale);

export default router;