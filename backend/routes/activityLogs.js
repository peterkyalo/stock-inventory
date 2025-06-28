import express from 'express';
import { query } from 'express-validator';
import { protect, authorize, authorizeRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import {
  getActivityLogs,
  getActivityLogById,
  getUserActivity,
  getActivitySummary,
  exportActivityLogs,
  clearOldActivityLogs
} from '../controllers/activityLogs.js';

const router = express.Router();

// Validation rules
const activityLogValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
  query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date format'),
  query('sortBy').optional().isIn(['timestamp', 'action', 'resource']).withMessage('Invalid sort field')
];

// Routes
router.get('/', protect, authorize('users.read'), activityLogValidation, validateRequest, getActivityLogs);
router.get('/export', protect, authorize('users.read'), exportActivityLogs);
router.get('/summary', protect, authorize('users.read'), getActivitySummary);
router.get('/user/:userId', protect, authorize('users.read'), getUserActivity);
router.get('/:id', protect, authorize('users.read'), getActivityLogById);
router.post('/clear', protect, authorizeRole('admin'), clearOldActivityLogs);

export default router;