import express from 'express';
import { body } from 'express-validator';
import { protect, authorize } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  updateCustomerStatus,
  updateCustomerGroup,
  getCustomerStats,
  bulkUpdateCustomers,
  exportCustomers
} from '../controllers/customers.js';

const router = express.Router();

// Enhanced validation rules
const customerValidation = [
  body('name')
    .notEmpty()
    .withMessage('Customer name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Customer name must be between 2 and 100 characters'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),
  
  body('type')
    .optional()
    .isIn(['individual', 'business'])
    .withMessage('Type must be either individual or business'),
  
  body('businessName')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Business name must be between 2 and 100 characters'),
  
  body('address.street')
    .notEmpty()
    .withMessage('Street address is required'),
  
  body('address.city')
    .notEmpty()
    .withMessage('City is required'),
  
  body('address.state')
    .notEmpty()
    .withMessage('State is required'),
  
  body('address.zipCode')
    .notEmpty()
    .withMessage('Zip code is required'),
  
  body('address.country')
    .notEmpty()
    .withMessage('Country is required'),
  
  body('customerGroup')
    .optional()
    .isIn(['regular', 'vip', 'wholesale', 'retail'])
    .withMessage('Invalid customer group'),
  
  body('discountPercentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Discount percentage must be between 0 and 100'),
  
  body('creditLimit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Credit limit must be a non-negative number'),
  
  body('paymentTerms')
    .optional()
    .isIn(['cash', 'net_15', 'net_30', 'net_45', 'net_60'])
    .withMessage('Invalid payment terms'),
  
  body('taxNumber')
    .optional()
    .isLength({ min: 5, max: 20 })
    .withMessage('Tax number must be between 5 and 20 characters'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

const updateCustomerValidation = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Customer name must be between 2 and 100 characters'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),
  
  body('type')
    .optional()
    .isIn(['individual', 'business'])
    .withMessage('Type must be either individual or business'),
  
  body('customerGroup')
    .optional()
    .isIn(['regular', 'vip', 'wholesale', 'retail'])
    .withMessage('Invalid customer group'),
  
  body('discountPercentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Discount percentage must be between 0 and 100'),
  
  body('creditLimit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Credit limit must be a non-negative number'),
  
  body('paymentTerms')
    .optional()
    .isIn(['cash', 'net_15', 'net_30', 'net_45', 'net_60'])
    .withMessage('Invalid payment terms')
];

const statusValidation = [
  body('isActive')
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

const groupValidation = [
  body('customerGroup')
    .isIn(['regular', 'vip', 'wholesale', 'retail'])
    .withMessage('Invalid customer group')
];

const bulkUpdateValidation = [
  body('customerIds')
    .isArray({ min: 1 })
    .withMessage('Customer IDs array is required'),
  
  body('customerIds.*')
    .isMongoId()
    .withMessage('Invalid customer ID'),
  
  body('updates')
    .isObject()
    .withMessage('Updates object is required')
];

// Routes
router.get('/', protect, authorize('sales.read'), getCustomers);
router.get('/export', protect, authorize('sales.read'), exportCustomers);
router.get('/:id', protect, authorize('sales.read'), getCustomerById);
router.get('/:id/stats', protect, authorize('sales.read'), getCustomerStats);

router.post('/', protect, authorize('sales.write'), customerValidation, validateRequest, createCustomer);
router.post('/bulk/update', protect, authorize('sales.write'), bulkUpdateValidation, validateRequest, bulkUpdateCustomers);

router.put('/:id', protect, authorize('sales.write'), updateCustomerValidation, validateRequest, updateCustomer);
router.put('/:id/status', protect, authorize('sales.write'), statusValidation, validateRequest, updateCustomerStatus);
router.put('/:id/group', protect, authorize('sales.write'), groupValidation, validateRequest, updateCustomerGroup);

router.delete('/:id', protect, authorize('sales.delete'), deleteCustomer);

export default router;