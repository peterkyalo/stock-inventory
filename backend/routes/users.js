import express from 'express';
import { body } from 'express-validator';
import { protect, authorize, authorizeRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { logActivity } from '../middleware/logger.js';
import { profileImageUpload, handleUploadError } from '../middleware/upload.js';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserStatus,
  updateUserPassword,
  deleteUser,
  getUserActivity,
  bulkUpdateUsers,
  exportUsers,
  getUserPermissions,
  updateUserPermissions
} from '../controllers/users.js';

const router = express.Router();

// Validation rules
const createUserValidation = [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['admin', 'manager', 'staff']).withMessage('Invalid role')
];

const updateUserValidation = [
  body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
  body('role').optional().isIn(['admin', 'manager', 'staff']).withMessage('Invalid role'),
  body('phone').optional().matches(/^[\+]?[0-9\s\-\(\)]+$/).withMessage('Please provide a valid phone number')
];

const passwordValidation = [
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const statusValidation = [
  body('isActive').isBoolean().withMessage('isActive must be a boolean value')
];

const bulkUpdateValidation = [
  body('userIds').isArray({ min: 1 }).withMessage('User IDs array is required'),
  body('userIds.*').isMongoId().withMessage('Invalid user ID'),
  body('updates').isObject().withMessage('Updates object is required')
];

const permissionsValidation = [
  body('permissions').isArray().withMessage('Permissions must be an array')
];

// Routes
router.get('/', protect, authorize('users.read'), getUsers);
router.get('/export', protect, authorize('users.read'), exportUsers);
router.get('/:id', protect, authorize('users.read'), getUserById);
router.get('/:id/activity', protect, authorize('users.read'), getUserActivity);
router.get('/:id/permissions', protect, authorize('users.read'), getUserPermissions);

router.post('/', protect, authorize('users.write'), createUserValidation, validateRequest, createUser);
router.post('/bulk/update', protect, authorize('users.write'), bulkUpdateValidation, validateRequest, bulkUpdateUsers);

router.put('/:id', protect, authorize('users.write'), updateUserValidation, validateRequest, updateUser);
router.put('/:id/status', protect, authorize('users.write'), statusValidation, validateRequest, updateUserStatus);
router.put('/:id/password', protect, authorize('users.write'), passwordValidation, validateRequest, updateUserPassword);
router.put('/:id/permissions', protect, authorize('users.write'), permissionsValidation, validateRequest, updateUserPermissions);

router.delete('/:id', protect, authorize('users.delete'), deleteUser);

// Upload profile image
router.post('/:id/profile-image', 
  protect, 
  authorize('users.write'), 
  profileImageUpload.single('image'),
  handleUploadError,
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Please upload an image'
        });
      }

      const user = await User.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update profile image
      user.profileImage = `/uploads/profiles/${req.file.filename}`;
      await user.save();

      // Log activity
      await logActivity(req.user._id, 'update', 'user', user._id, 
        `Updated profile image for user: ${user.firstName} ${user.lastName}`);

      res.status(200).json({
        success: true,
        message: 'Profile image uploaded successfully',
        data: {
          id: user._id,
          profileImage: user.profileImage
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;