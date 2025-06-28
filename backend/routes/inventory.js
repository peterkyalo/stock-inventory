import express from 'express';
import { body, query } from 'express-validator';
import { protect, authorize } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import {
  getStockMovements,
  createStockMovement,
  getStockMovementById,
  getStockMovementSummary,
  getLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
  updateLocationStatus,
  getInventoryStats,
  getProductStockByLocation,
  getLocationStock,
  transferStock,
  exportStockMovements,
  exportLocations
} from '../controllers/inventory.js';

const router = express.Router();

// Stock Movement Validation
const stockMovementValidation = [
  body('productId')
    .notEmpty()
    .withMessage('Product is required')
    .isMongoId()
    .withMessage('Invalid product ID'),
  
  body('type')
    .notEmpty()
    .withMessage('Movement type is required')
    .isIn(['in', 'out', 'transfer', 'adjustment'])
    .withMessage('Invalid movement type'),
  
  body('reason')
    .notEmpty()
    .withMessage('Reason is required')
    .isIn([
      'purchase', 'sale', 'return', 'damage', 'loss', 'theft', 
      'transfer', 'adjustment', 'opening_stock', 'manufacturing'
    ])
    .withMessage('Invalid reason'),
  
  body('quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  
  body('locationFrom')
    .optional()
    .isMongoId()
    .withMessage('Invalid from location ID'),
  
  body('locationTo')
    .optional()
    .isMongoId()
    .withMessage('Invalid to location ID'),
  
  body('notes')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Notes cannot exceed 200 characters')
];

// Location Validation
const locationValidation = [
  body('name')
    .notEmpty()
    .withMessage('Location name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Location name must be between 2 and 50 characters'),
  
  body('code')
    .notEmpty()
    .withMessage('Location code is required')
    .isLength({ min: 2, max: 10 })
    .withMessage('Location code must be between 2 and 10 characters')
    .matches(/^[A-Z0-9-]+$/)
    .withMessage('Location code can only contain uppercase letters, numbers, and hyphens'),
  
  body('type')
    .notEmpty()
    .withMessage('Location type is required')
    .isIn(['warehouse', 'store', 'outlet', 'factory', 'office'])
    .withMessage('Invalid location type'),
  
  body('capacity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Capacity must be a non-negative integer'),
  
  body('currentUtilization')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Current utilization must be a non-negative integer'),
  
  body('address')
    .optional()
    .isObject()
    .withMessage('Address must be an object'),
  
  body('contactPerson')
    .optional()
    .isObject()
    .withMessage('Contact person must be an object'),
  
  body('notes')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Notes cannot exceed 200 characters')
];

// Stock Transfer Validation
const stockTransferValidation = [
  body('productId')
    .notEmpty()
    .withMessage('Product is required')
    .isMongoId()
    .withMessage('Invalid product ID'),
  
  body('fromLocationId')
    .notEmpty()
    .withMessage('From location is required')
    .isMongoId()
    .withMessage('Invalid from location ID'),
  
  body('toLocationId')
    .notEmpty()
    .withMessage('To location is required')
    .isMongoId()
    .withMessage('Invalid to location ID'),
  
  body('quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  
  body('notes')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Notes cannot exceed 200 characters')
];

// Status Update Validation
const statusValidation = [
  body('isActive')
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

// Stock Movement Routes
router.get('/movements', protect, authorize('inventory.read'), getStockMovements);
router.post('/movements', protect, authorize('inventory.write'), stockMovementValidation, validateRequest, createStockMovement);
router.get('/movements/export', protect, authorize('inventory.read'), exportStockMovements);
router.get('/movements/:id', protect, authorize('inventory.read'), getStockMovementById);
router.get('/movements/summary', protect, authorize('inventory.read'), getStockMovementSummary);

// Location Routes
router.get('/locations', protect, authorize('inventory.read'), getLocations);
router.post('/locations', protect, authorize('inventory.write'), locationValidation, validateRequest, createLocation);
router.get('/locations/export', protect, authorize('inventory.read'), exportLocations);
router.get('/locations/:id', protect, authorize('inventory.read'), getLocationById);
router.put('/locations/:id', protect, authorize('inventory.write'), locationValidation, validateRequest, updateLocation);
router.put('/locations/:id/status', protect, authorize('inventory.write'), statusValidation, validateRequest, updateLocationStatus);
router.delete('/locations/:id', protect, authorize('inventory.delete'), deleteLocation);

// Stock Transfer Route
router.post('/transfer', protect, authorize('inventory.write'), stockTransferValidation, validateRequest, transferStock);

// Product Stock by Location Route
router.get('/products/:productId/locations', protect, authorize('inventory.read'), getProductStockByLocation);

// Location Stock Route
router.get('/locations/:locationId/stock', protect, authorize('inventory.read'), getLocationStock);

// Inventory Dashboard Stats
router.get('/stats', protect, authorize('inventory.read'), getInventoryStats);

export default router;