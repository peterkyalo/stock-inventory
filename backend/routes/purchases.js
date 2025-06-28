import express from 'express';
import { body, query } from 'express-validator';
import { protect, authorize } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import {
  getPurchases,
  getPurchaseById,
  createPurchase,
  updatePurchase,
  updatePurchaseStatus,
  updatePaymentStatus,
  receivePurchaseItems,
  deletePurchase,
  getPurchaseDashboard,
  getSupplierPurchaseHistory,
  exportPurchases
} from '../controllers/purchases.js';

const router = express.Router();

// Enhanced validation rules
const purchaseValidation = [
  body('supplier')
    .notEmpty()
    .withMessage('Supplier is required')
    .isMongoId()
    .withMessage('Invalid supplier ID'),
  
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
    .isIn(['draft', 'pending', 'approved', 'ordered', 'partially_received', 'received', 'cancelled'])
    .withMessage('Invalid status'),
  
  body('paymentStatus')
    .optional()
    .isIn(['unpaid', 'partially_paid', 'paid'])
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
    .isIn(['draft', 'pending', 'approved', 'ordered', 'partially_received', 'received', 'cancelled'])
    .withMessage('Invalid status')
];

const paymentStatusUpdateValidation = [
  body('paymentStatus')
    .notEmpty()
    .withMessage('Payment status is required')
    .isIn(['unpaid', 'partially_paid', 'paid'])
    .withMessage('Invalid payment status'),
  
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'check', 'bank_transfer', 'credit_card', 'other'])
    .withMessage('Invalid payment method')
];

const receiveItemsValidation = [
  body('receivedItems')
    .isArray({ min: 1 })
    .withMessage('Received items are required'),
  
  body('receivedItems.*.itemId')
    .notEmpty()
    .withMessage('Item ID is required'),
  
  body('receivedItems.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1')
];

// Query validation for filtering
const filterValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sortBy').optional().isIn(['orderDate', 'purchaseOrderNumber', 'grandTotal', 'status', 'paymentStatus', 'createdAt']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
  query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date format'),
  query('minAmount').optional().isFloat({ min: 0 }).withMessage('Minimum amount must be non-negative'),
  query('maxAmount').optional().isFloat({ min: 0 }).withMessage('Maximum amount must be non-negative')
];

// Routes
router.get('/', protect, authorize('purchases.read'), filterValidation, validateRequest, getPurchases);
router.get('/dashboard', protect, authorize('purchases.read'), getPurchaseDashboard);
router.get('/export', protect, authorize('purchases.read'), exportPurchases);
router.get('/supplier/:supplierId', protect, authorize('purchases.read'), getSupplierPurchaseHistory);
router.get('/:id', protect, authorize('purchases.read'), getPurchaseById);

router.post('/', protect, authorize('purchases.write'), purchaseValidation, validateRequest, createPurchase);

router.put('/:id', protect, authorize('purchases.write'), purchaseValidation, validateRequest, updatePurchase);
router.patch('/:id/status', protect, authorize('purchases.write'), statusUpdateValidation, validateRequest, updatePurchaseStatus);
router.patch('/:id/payment', protect, authorize('purchases.write'), paymentStatusUpdateValidation, validateRequest, updatePaymentStatus);
router.patch('/:id/receive', protect, authorize('purchases.write'), receiveItemsValidation, validateRequest, receivePurchaseItems);

router.delete('/:id', protect, authorize('purchases.delete'), deletePurchase);

export default router;