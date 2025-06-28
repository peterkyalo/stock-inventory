import ActivityLog from '../models/ActivityLog.js';
import User from '../models/User.js';

// Get all activity logs with advanced filtering
export const getActivityLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const user = req.query.user || '';
    const action = req.query.action || '';
    const resource = req.query.resource || '';
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const sortBy = req.query.sortBy || 'timestamp';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Build query
    const query = {};
    
    if (search) {
      query.description = { $regex: search, $options: 'i' };
    }
    
    if (user) {
      query.user = user;
    }
    
    if (action) {
      query.action = action;
    }
    
    if (resource) {
      query.resource = resource;
    }
    
    if (startDate && endDate) {
      query.timestamp = {
        $gte: startDate,
        $lte: endDate
      };
    } else if (startDate) {
      query.timestamp = { $gte: startDate };
    } else if (endDate) {
      query.timestamp = { $lte: endDate };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder;

    const logs = await ActivityLog.find(query)
      .populate('user', 'firstName lastName email')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await ActivityLog.countDocuments(query);

    // Calculate summary statistics
    const actionCounts = await ActivityLog.aggregate([
      { $match: query },
      { $group: { _id: '$action', count: { $sum: 1 } } }
    ]);

    const resourceCounts = await ActivityLog.aggregate([
      { $match: query },
      { $group: { _id: '$resource', count: { $sum: 1 } } }
    ]);

    const userCounts = await ActivityLog.aggregate([
      { $match: query },
      { $group: { _id: '$user', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      {
        $project: {
          count: 1,
          name: {
            $concat: [
              { $arrayElemAt: ['$userDetails.firstName', 0] },
              ' ',
              { $arrayElemAt: ['$userDetails.lastName', 0] }
            ]
          }
        }
      }
    ]);

    // Format action counts
    const formattedActionCounts = {
      create: 0,
      read: 0,
      update: 0,
      delete: 0,
      login: 0,
      logout: 0,
      export: 0,
      import: 0,
      approve: 0,
      reject: 0,
      cancel: 0
    };

    actionCounts.forEach(item => {
      formattedActionCounts[item._id] = item.count;
    });

    // Format resource counts
    const formattedResourceCounts = {
      user: 0,
      product: 0,
      category: 0,
      supplier: 0,
      customer: 0,
      purchase: 0,
      sale: 0,
      inventory: 0,
      stock_movement: 0,
      location: 0,
      settings: 0
    };

    resourceCounts.forEach(item => {
      formattedResourceCounts[item._id] = item.count;
    });

    // Format user counts
    const formattedUserCounts = {};
    userCounts.forEach(item => {
      formattedUserCounts[item._id] = {
        name: item.name,
        count: item.count
      };
    });

    // Prepare summary
    const summary = {
      totalLogs: total,
      actionCounts: formattedActionCounts,
      resourceCounts: formattedResourceCounts,
      userCounts: formattedUserCounts,
      dateRange: {
        start: startDate ? startDate.toISOString() : null,
        end: endDate ? endDate.toISOString() : null
      }
    };

    res.status(200).json({
      success: true,
      data: {
        logs,
        summary
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      filters: {
        search,
        user,
        action,
        resource,
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null,
        sortBy,
        sortOrder: req.query.sortOrder || 'desc'
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get activity log by ID
export const getActivityLogById = async (req, res, next) => {
  try {
    const log = await ActivityLog.findById(req.params.id)
      .populate('user', 'firstName lastName email');

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Activity log not found'
      });
    }

    res.status(200).json({
      success: true,
      data: log
    });
  } catch (error) {
    next(error);
  }
};

// Get user activity
export const getUserActivity = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    
    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const logs = await ActivityLog.find({ user: userId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await ActivityLog.countDocuments({ user: userId });
    
    // Get action summary
    const actionSummary = await ActivityLog.aggregate([
      { $match: { user: mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Get resource summary
    const resourceSummary = await ActivityLog.aggregate([
      { $match: { user: mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$resource', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Get recent activity by date
    const recentActivity = await ActivityLog.aggregate([
      { $match: { user: mongoose.Types.ObjectId(userId) } },
      { 
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 30 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        logs,
        summary: {
          totalLogs: total,
          actionSummary,
          resourceSummary,
          recentActivity
        }
      },
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

// Get activity summary
export const getActivitySummary = async (req, res, next) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    
    // Ensure end date includes the entire day
    endDate.setHours(23, 59, 59, 999);
    
    // Get total logs
    const totalLogs = await ActivityLog.countDocuments({
      timestamp: { $gte: startDate, $lte: endDate }
    });
    
    // Get action counts
    const actionCounts = await ActivityLog.aggregate([
      { 
        $match: { 
          timestamp: { $gte: startDate, $lte: endDate } 
        } 
      },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Get resource counts
    const resourceCounts = await ActivityLog.aggregate([
      { 
        $match: { 
          timestamp: { $gte: startDate, $lte: endDate } 
        } 
      },
      { $group: { _id: '$resource', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Get top users
    const topUsers = await ActivityLog.aggregate([
      { 
        $match: { 
          timestamp: { $gte: startDate, $lte: endDate } 
        } 
      },
      { $group: { _id: '$user', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      {
        $project: {
          count: 1,
          name: {
            $concat: [
              { $arrayElemAt: ['$userDetails.firstName', 0] },
              ' ',
              { $arrayElemAt: ['$userDetails.lastName', 0] }
            ]
          },
          email: { $arrayElemAt: ['$userDetails.email', 0] }
        }
      }
    ]);
    
    // Get activity by date
    const activityByDate = await ActivityLog.aggregate([
      { 
        $match: { 
          timestamp: { $gte: startDate, $lte: endDate } 
        } 
      },
      { 
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          count: { $sum: 1 },
          createCount: { 
            $sum: { $cond: [{ $eq: ['$action', 'create'] }, 1, 0] } 
          },
          updateCount: { 
            $sum: { $cond: [{ $eq: ['$action', 'update'] }, 1, 0] } 
          },
          deleteCount: { 
            $sum: { $cond: [{ $eq: ['$action', 'delete'] }, 1, 0] } 
          },
          readCount: { 
            $sum: { $cond: [{ $eq: ['$action', 'read'] }, 1, 0] } 
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalLogs,
        actionCounts,
        resourceCounts,
        topUsers,
        activityByDate,
        dateRange: {
          start: startDate,
          end: endDate
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Export activity logs
export const exportActivityLogs = async (req, res, next) => {
  try {
    const { format = 'csv', filters = {} } = req.query;
    
    // Build query based on filters
    const query = {};
    
    if (filters.user) query.user = filters.user;
    if (filters.action) query.action = filters.action;
    if (filters.resource) query.resource = filters.resource;
    
    if (filters.startDate && filters.endDate) {
      query.timestamp = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate)
      };
    } else if (filters.startDate) {
      query.timestamp = { $gte: new Date(filters.startDate) };
    } else if (filters.endDate) {
      query.timestamp = { $lte: new Date(filters.endDate) };
    }

    const logs = await ActivityLog.find(query)
      .populate('user', 'firstName lastName email')
      .sort({ timestamp: -1 });

    // Format data for export
    const exportData = logs.map(log => ({
      timestamp: new Date(log.timestamp).toISOString(),
      user: log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Unknown',
      email: log.user ? log.user.email : '',
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId || '',
      description: log.description,
      ipAddress: log.ipAddress || '',
      userAgent: log.userAgent || ''
    }));

    // Log activity
    await logActivity(req.user._id, 'export', 'activity_log', null, 
      `Exported ${exportData.length} activity logs in ${format.toUpperCase()} format`);

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

// Clear old activity logs
export const clearOldActivityLogs = async (req, res, next) => {
  try {
    const { olderThan } = req.body;
    
    if (!olderThan || !['30days', '90days', '6months', '1year'].includes(olderThan)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time period specified'
      });
    }
    
    let cutoffDate = new Date();
    
    switch (olderThan) {
      case '30days':
        cutoffDate.setDate(cutoffDate.getDate() - 30);
        break;
      case '90days':
        cutoffDate.setDate(cutoffDate.getDate() - 90);
        break;
      case '6months':
        cutoffDate.setMonth(cutoffDate.getMonth() - 6);
        break;
      case '1year':
        cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
        break;
    }
    
    const result = await ActivityLog.deleteMany({
      timestamp: { $lt: cutoffDate }
    });
    
    // Log this activity
    await logActivity(req.user._id, 'delete', 'activity_log', null, 
      `Cleared ${result.deletedCount} activity logs older than ${olderThan}`);

    res.status(200).json({
      success: true,
      message: `Successfully cleared ${result.deletedCount} activity logs older than ${olderThan}`,
      data: {
        deletedCount: result.deletedCount,
        cutoffDate
      }
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to log activity
const logActivity = async (userId, action, resource, resourceId, description, changes = null) => {
  try {
    await ActivityLog.create({
      user: userId,
      action,
      resource,
      resourceId,
      description,
      changes
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};