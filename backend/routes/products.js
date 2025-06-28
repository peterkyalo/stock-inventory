import express from 'express';
import { body, query } from 'express-validator';
import { protect, authorize } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { productImageUpload, handleUploadError } from '../middleware/upload.js';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStock,
  bulkUpdateProducts,
  bulkUpdatePrices,
  getProductAnalytics,
  getLowStockProducts,
  getOutOfStockProducts,
  getExpiryAlerts,
  searchProducts,
  exportProducts,
  duplicateProduct
} from '../controllers/products.js';

const router = express.Router();

// Enhanced validation rules
const productValidation = [
  body('name')
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Product name must be between 2 and 100 characters'),
  
  body('sku')
    .notEmpty()
    .withMessage('SKU is required')
    .isLength({ min: 3, max: 20 })
    .withMessage('SKU must be between 3 and 20 characters')
    .matches(/^[A-Z0-9\-_]+$/)
    .withMessage('SKU can only contain uppercase letters, numbers, hyphens, and underscores'),
  
  body('barcode')
    .optional()
    .isLength({ min: 8, max: 20 })
    .withMessage('Barcode must be between 8 and 20 characters'),
  
  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isMongoId()
    .withMessage('Invalid category ID'),
  
  body('brand')
    .notEmpty()
    .withMessage('Brand is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Brand must be between 2 and 50 characters'),
  
  body('unit')
    .notEmpty()
    .withMessage('Unit is required')
    .isIn(['pcs', 'kg', 'gm', 'ltr', 'ml', 'mtr', 'cm', 'box', 'pack', 'dozen', 'pair', 'set'])
    .withMessage('Invalid unit type'),
  
  body('costPrice')
    .isFloat({ min: 0 })
    .withMessage('Cost price must be a positive number'),
  
  body('sellingPrice')
    .isFloat({ min: 0 })
    .withMessage('Selling price must be a positive number')
    .custom((value, { req }) => {
      if (parseFloat(value) < parseFloat(req.body.costPrice)) {
        throw new Error('Selling price cannot be less than cost price');
      }
      return true;
    }),
  
  body('minimumStock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Minimum stock must be a non-negative integer'),
  
  body('currentStock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Current stock must be a non-negative integer'),
  
  body('tax')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Tax must be between 0 and 100'),
  
  body('supplier')
    .optional()
    .isMongoId()
    .withMessage('Invalid supplier ID'),
  
  body('isPerishable')
    .optional()
    .isBoolean()
    .withMessage('isPerishable must be a boolean'),
  
  body('expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid expiry date format'),
  
  body('manufacturingDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid manufacturing date format'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  body('notes')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Notes cannot exceed 200 characters')
];

const stockUpdateValidation = [
  body('quantity')
    .isInt({ min: 0 })
    .withMessage('Quantity must be a non-negative integer'),
  
  body('operation')
    .optional()
    .isIn(['set', 'add', 'subtract'])
    .withMessage('Invalid operation'),
  
  body('reason')
    .optional()
    .isIn(['purchase', 'sale', 'return', 'damage', 'loss', 'theft', 'transfer', 'adjustment', 'opening_stock'])
    .withMessage('Invalid reason'),
  
  body('notes')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Notes cannot exceed 200 characters')
];

const bulkUpdateValidation = [
  body('productIds')
    .isArray({ min: 1 })
    .withMessage('Product IDs array is required'),
  
  body('productIds.*')
    .isMongoId()
    .withMessage('Invalid product ID'),
  
  body('updates')
    .isObject()
    .withMessage('Updates object is required')
];

const bulkPriceUpdateValidation = [
  body('productIds')
    .isArray({ min: 1 })
    .withMessage('Product IDs array is required'),
  
  body('productIds.*')
    .isMongoId()
    .withMessage('Invalid product ID'),
  
  body('priceAdjustment')
    .isObject()
    .withMessage('Price adjustment object is required'),
  
  body('priceAdjustment.type')
    .isIn(['percentage', 'fixed'])
    .withMessage('Invalid adjustment type'),
  
  body('priceAdjustment.value')
    .isFloat()
    .withMessage('Adjustment value must be a number')
];

// Query validation for filtering
const filterValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sortBy').optional().isIn(['name', 'sku', 'brand', 'costPrice', 'sellingPrice', 'currentStock', 'createdAt']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('Minimum price must be non-negative'),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Maximum price must be non-negative'),
  query('category').optional().isMongoId().withMessage('Invalid category ID'),
  query('supplier').optional().isMongoId().withMessage('Invalid supplier ID')
];

// Routes
router.get('/', protect, authorize('products.read'), filterValidation, validateRequest, getProducts);
router.get('/export', protect, authorize('products.read'), exportProducts);
router.get('/search', protect, authorize('products.read'), searchProducts);
router.get('/alerts/low-stock', protect, authorize('products.read'), getLowStockProducts);
router.get('/alerts/out-of-stock', protect, authorize('products.read'), getOutOfStockProducts);
router.get('/alerts/expiry', protect, authorize('products.read'), getExpiryAlerts);

router.get('/:id', protect, authorize('products.read'), getProductById);
router.get('/:id/analytics', protect, authorize('products.read'), getProductAnalytics);

router.post('/', protect, authorize('products.write'), 
  productImageUpload.array('images', 5), 
  handleUploadError,
  productValidation, 
  validateRequest, 
  createProduct
);

router.post('/bulk/update', protect, authorize('products.write'), 
  bulkUpdateValidation, 
  validateRequest, 
  bulkUpdateProducts
);

router.post('/bulk/update-prices', protect, authorize('products.write'), 
  bulkPriceUpdateValidation, 
  validateRequest, 
  bulkUpdatePrices
);

router.post('/:id/duplicate', protect, authorize('products.write'), duplicateProduct);

router.put('/:id', protect, authorize('products.write'), 
  productImageUpload.array('images', 5),
  handleUploadError,
  productValidation, 
  validateRequest, 
  updateProduct
);

router.patch('/:id/stock', protect, authorize('products.write'), 
  stockUpdateValidation, 
  validateRequest, 
  updateProductStock
);

router.delete('/:id', protect, authorize('products.delete'), deleteProduct);

export default router;