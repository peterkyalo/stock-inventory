import express from 'express';
import { body } from 'express-validator';
import { protect, authorize, authorizeRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { logActivity } from '../middleware/logger.js';
import {
  getSettings,
  updateSettings,
  getEmailSettings,
  updateEmailSettings,
  getTaxSettings,
  updateTaxSettings,
  getInventorySettings,
  updateInventorySettings,
  getBackupSettings,
  updateBackupSettings,
  triggerBackup,
  getSystemInfo
} from '../controllers/settings.js';

const router = express.Router();

// Validation rules
const settingsValidation = [
  body('company.name').notEmpty().withMessage('Company name is required'),
  body('company.email').isEmail().withMessage('Please provide a valid company email'),
  body('currency.code').optional().isLength({ min: 3, max: 3 }).withMessage('Currency code must be 3 characters'),
  body('tax.defaultRate').optional().isNumeric().withMessage('Tax rate must be a number')
];

const emailSettingsValidation = [
  body('email.enabled').isBoolean().withMessage('Enabled must be a boolean'),
  body('email.lowStock').isBoolean().withMessage('Low stock must be a boolean'),
  body('email.newOrder').isBoolean().withMessage('New order must be a boolean'),
  body('email.paymentReminder').isBoolean().withMessage('Payment reminder must be a boolean')
];

const taxSettingsValidation = [
  body('defaultRate').isNumeric().withMessage('Default rate must be a number'),
  body('inclusive').isBoolean().withMessage('Inclusive must be a boolean')
];

const inventorySettingsValidation = [
  body('costingMethod').isIn(['fifo', 'lifo', 'weighted_average']).withMessage('Invalid costing method'),
  body('lowStockAlert').isBoolean().withMessage('Low stock alert must be a boolean'),
  body('negativeStock').isBoolean().withMessage('Negative stock must be a boolean'),
  body('autoGenerateSKU').isBoolean().withMessage('Auto generate SKU must be a boolean')
];

const backupSettingsValidation = [
  body('autoBackup').isBoolean().withMessage('Auto backup must be a boolean'),
  body('frequency').isIn(['daily', 'weekly', 'monthly']).withMessage('Invalid frequency'),
  body('retentionDays').isInt({ min: 1 }).withMessage('Retention days must be a positive integer')
];

// Routes
router.get('/', protect, authorize('settings.read'), getSettings);
router.put('/', protect, authorize('settings.write'), settingsValidation, validateRequest, updateSettings);

// Email settings
router.get('/email', protect, authorize('settings.read'), getEmailSettings);
router.put('/email', protect, authorize('settings.write'), emailSettingsValidation, validateRequest, updateEmailSettings);

// Tax settings
router.get('/tax', protect, authorize('settings.read'), getTaxSettings);
router.put('/tax', protect, authorize('settings.write'), taxSettingsValidation, validateRequest, updateTaxSettings);

// Inventory settings
router.get('/inventory', protect, authorize('settings.read'), getInventorySettings);
router.put('/inventory', protect, authorize('settings.write'), inventorySettingsValidation, validateRequest, updateInventorySettings);

// Backup settings
router.get('/backup', protect, authorize('settings.read'), getBackupSettings);
router.put('/backup', protect, authorize('settings.write'), backupSettingsValidation, validateRequest, updateBackupSettings);
router.post('/backup/trigger', protect, authorize('settings.write'), triggerBackup);

// System info
router.get('/system-info', protect, authorizeRole('admin'), getSystemInfo);

export default router;