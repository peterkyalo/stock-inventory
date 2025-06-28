import express from 'express';
import { body } from 'express-validator';
import { protect, authorize } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  updateSupplierStatus,
  updateSupplierRating,
  getSupplierStats,
  bulkUpdateSuppliers,
  exportSuppliers
} from '../controllers/suppliers.js';

const router = express.Router();

// Enhanced validation rules
const supplierValidation = [
  body('name')
    .notEmpty()
    .withMessage('Supplier name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Supplier name must be between 2 and 100 characters'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),
  
  body('contactPerson.name')
    .notEmpty()
    .withMessage('Contact person name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Contact person name must be between 2 and 100 characters'),
  
  body('contactPerson.phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid contact phone number'),
  
  body('contactPerson.email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid contact email')
    .normalizeEmail(),
  
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
  
  body('paymentTerms')
    .optional()
    .isIn(['cash', 'net_15', 'net_30', 'net_45', 'net_60'])
    .withMessage('Invalid payment terms'),
  
  body('creditLimit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Credit limit must be a non-negative number'),
  
  body('rating')
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  
  body('taxNumber')
    .optional()
    .isLength({ min: 5, max: 20 })
    .withMessage('Tax number must be between 5 and 20 characters'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

const updateSupplierValidation = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Supplier name must be between 2 and 100 characters'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),
  
  body('contactPerson.name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Contact person name must be between 2 and 100 characters'),
  
  body('paymentTerms')
    .optional()
    .isIn(['cash', 'net_15', 'net_30', 'net_45', 'net_60'])
    .withMessage('Invalid payment terms'),
  
  body('creditLimit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Credit limit must be a non-negative number'),
  
  body('rating')
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5')
];

const statusValidation = [
  body('isActive')
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

const ratingValidation = [
  body('rating')
    .isFloat({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5')
];

const bulkUpdateValidation = [
  body('supplierIds')
    .isArray({ min: 1 })
    .withMessage('Supplier IDs array is required'),
  
  body('supplierIds.*')
    .isMongoId()
    .withMessage('Invalid supplier ID'),
  
  body('updates')
    .isObject()
    .withMessage('Updates object is required')
];

// Routes
router.get('/', protect, authorize('purchases.read'), getSuppliers);
router.get('/export', protect, authorize('purchases.read'), exportSuppliers);
router.get('/:id', protect, authorize('purchases.read'), getSupplierById);
router.get('/:id/stats', protect, authorize('purchases.read'), getSupplierStats);

router.post('/', protect, authorize('purchases.write'), supplierValidation, validateRequest, createSupplier);
router.post('/bulk/update', protect, authorize('purchases.write'), bulkUpdateValidation, validateRequest, bulkUpdateSuppliers);

router.put('/:id', protect, authorize('purchases.write'), updateSupplierValidation, validateRequest, updateSupplier);
router.put('/:id/status', protect, authorize('purchases.write'), statusValidation, validateRequest, updateSupplierStatus);
router.put('/:id/rating', protect, authorize('purchases.write'), ratingValidation, validateRequest, updateSupplierRating);

router.delete('/:id', protect, authorize('purchases.delete'), deleteSupplier);

export default router;