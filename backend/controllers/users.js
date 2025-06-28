import User from '../models/User.js';
import { logActivity } from '../middleware/logger.js';
import bcrypt from 'bcryptjs';

// Get all users with advanced filtering
export const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const role = req.query.role || '';
    const status = req.query.status || '';
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) {
      query.role = role;
    }
    
    if (status) {
      query.isActive = status === 'active';
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder;

    const users = await User.find(query)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    // Get user statistics
    const stats = {
      totalUsers: await User.countDocuments({}),
      activeUsers: await User.countDocuments({ isActive: true }),
      adminUsers: await User.countDocuments({ role: 'admin' }),
      managerUsers: await User.countDocuments({ role: 'manager' }),
      staffUsers: await User.countDocuments({ role: 'staff' }),
      recentlyActive: await User.countDocuments({ 
        lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      })
    };

    res.status(200).json({
      success: true,
      data: users,
      stats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      filters: {
        search,
        role,
        status,
        sortBy,
        sortOrder: req.query.sortOrder || 'desc'
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get user by ID
export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user activity stats
    const ActivityLog = (await import('../models/ActivityLog.js')).default;
    
    const activityStats = {
      totalActivities: await ActivityLog.countDocuments({ user: user._id }),
      recentActivities: await ActivityLog.countDocuments({ 
        user: user._id,
        timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }),
      lastActivity: await ActivityLog.findOne({ user: user._id }).sort({ timestamp: -1 })
    };

    // Get top actions
    const topActions = await ActivityLog.aggregate([
      { $match: { user: user._id } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // Get top resources
    const topResources = await ActivityLog.aggregate([
      { $match: { user: user._id } },
      { $group: { _id: '$resource', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        user,
        activityStats: {
          ...activityStats,
          topActions,
          topResources
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create user
export const createUser = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, role, phone, address, permissions } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role: role || 'staff',
      phone,
      address,
      permissions,
      createdBy: req.user._id
    });

    // Log activity
    await logActivity(req.user._id, 'create', 'user', user._id, `Created user: ${user.firstName} ${user.lastName}`);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        isActive: user.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update user
export const updateUser = async (req, res, next) => {
  try {
    const { firstName, lastName, email, role, phone, address, permissions } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if email is being changed and if it conflicts with another user
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use by another user'
        });
      }
    }

    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    if (role) user.role = role;
    if (phone) user.phone = phone;
    if (address) user.address = address;
    if (permissions) user.permissions = permissions;

    await user.save();

    // Log activity
    await logActivity(req.user._id, 'update', 'user', user._id, `Updated user: ${user.firstName} ${user.lastName}`);

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        isActive: user.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update user status
export const updateUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deactivating yourself
    if (user._id.toString() === req.user._id.toString() && !isActive) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }

    user.isActive = isActive;
    await user.save();

    // Log activity
    await logActivity(req.user._id, 'update', 'user', user._id, 
      `${isActive ? 'Activated' : 'Deactivated'} user: ${user.firstName} ${user.lastName}`);

    res.status(200).json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        id: user._id,
        isActive: user.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update user password
export const updateUserPassword = async (req, res, next) => {
  try {
    const { password } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update password
    user.password = password;
    await user.save();

    // Log activity
    await logActivity(req.user._id, 'update', 'user', user._id, 
      `Updated password for user: ${user.firstName} ${user.lastName}`);

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Delete user
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting yourself
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    // Check if user is the only admin
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the only admin user'
        });
      }
    }

    await User.findByIdAndDelete(req.params.id);

    // Log activity
    await logActivity(req.user._id, 'delete', 'user', user._id, `Deleted user: ${user.firstName} ${user.lastName}`);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get user activity
export const getUserActivity = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const ActivityLog = (await import('../models/ActivityLog.js')).default;
    
    const logs = await ActivityLog.find({ user: user._id })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ActivityLog.countDocuments({ user: user._id });

    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Bulk update users
export const bulkUpdateUsers = async (req, res, next) => {
  try {
    const { userIds, updates } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User IDs array is required'
      });
    }

    // Prevent updating yourself
    if (userIds.includes(req.user._id.toString())) {
      return res.status(400).json({
        success: false,
        message: 'You cannot bulk update your own account'
      });
    }

    const result = await User.updateMany(
      { _id: { $in: userIds } },
      updates,
      { runValidators: true }
    );

    // Log activity
    await logActivity(req.user._id, 'update', 'user', null, 
      `Bulk updated ${result.modifiedCount} users`);

    res.status(200).json({
      success: true,
      message: `Successfully updated ${result.modifiedCount} users`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// Export users
export const exportUsers = async (req, res, next) => {
  try {
    const { format = 'csv', filters = {} } = req.query;
    
    // Build query based on filters
    const query = {};
    if (filters.role) query.role = filters.role;
    if (filters.status !== undefined) {
      query.isActive = filters.status === 'active';
    }
    if (filters.search) {
      query.$or = [
        { firstName: { $regex: filters.search, $options: 'i' } },
        { lastName: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ firstName: 1, lastName: 1 });

    // Format data for export
    const exportData = users.map(user => ({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      phone: user.phone || '',
      isActive: user.isActive ? 'Active' : 'Inactive',
      lastLogin: user.lastLogin ? new Date(user.lastLogin).toISOString().split('T')[0] : '',
      createdAt: user.createdAt.toISOString().split('T')[0]
    }));

    // Log activity
    await logActivity(req.user._id, 'export', 'user', null, 
      `Exported ${exportData.length} users in ${format.toUpperCase()} format`);

    res.status(200).json({
      success: true,
      data: exportData,
      count: exportData.length,
      format
    });
  } catch (error) {
    next(error);
  }
};

// Get user permissions
export const getUserPermissions = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Define all available permissions
    const allPermissions = [
      { group: 'Products', permissions: ['products.read', 'products.write', 'products.delete'] },
      { group: 'Inventory', permissions: ['inventory.read', 'inventory.write', 'inventory.delete'] },
      { group: 'Purchases', permissions: ['purchases.read', 'purchases.write', 'purchases.delete'] },
      { group: 'Sales', permissions: ['sales.read', 'sales.write', 'sales.delete'] },
      { group: 'Users', permissions: ['users.read', 'users.write', 'users.delete'] },
      { group: 'Reports', permissions: ['reports.read'] },
      { group: 'Settings', permissions: ['settings.read', 'settings.write'] }
    ];

    // Map user permissions
    const userPermissions = allPermissions.map(group => ({
      group: group.group,
      permissions: group.permissions.map(permission => ({
        name: permission,
        granted: user.permissions.includes(permission) || user.role === 'admin'
      }))
    }));

    res.status(200).json({
      success: true,
      data: {
        userPermissions,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update user permissions
export const updateUserPermissions = async (req, res, next) => {
  try {
    const { permissions } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent updating your own permissions
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot update your own permissions'
      });
    }

    // Validate permissions
    const validPermissions = [
      'products.read', 'products.write', 'products.delete',
      'inventory.read', 'inventory.write', 'inventory.delete',
      'purchases.read', 'purchases.write', 'purchases.delete',
      'sales.read', 'sales.write', 'sales.delete',
      'users.read', 'users.write', 'users.delete',
      'reports.read', 'settings.read', 'settings.write'
    ];

    const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));
    if (invalidPermissions.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid permissions: ${invalidPermissions.join(', ')}`
      });
    }

    user.permissions = permissions;
    await user.save();

    // Log activity
    await logActivity(req.user._id, 'update', 'user', user._id, 
      `Updated permissions for user: ${user.firstName} ${user.lastName}`);

    res.status(200).json({
      success: true,
      message: 'User permissions updated successfully',
      data: {
        id: user._id,
        permissions: user.permissions
      }
    });
  } catch (error) {
    next(error);
  }
};