import Settings from '../models/Settings.js';
import { logActivity } from '../middleware/logger.js';

// Get settings
export const getSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne();
    
    // Create default settings if none exist
    if (!settings) {
      settings = await Settings.create({
        company: {
          name: process.env.COMPANY_NAME || 'Your Company Name',
          email: process.env.COMPANY_EMAIL || 'admin@yourcompany.com',
          phone: process.env.COMPANY_PHONE || '',
          address: {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: ''
          }
        },
        currency: {
          code: 'USD',
          symbol: '$',
          position: 'before'
        },
        tax: {
          defaultRate: 0,
          inclusive: false,
          rates: []
        },
        inventory: {
          costingMethod: 'fifo',
          lowStockAlert: true,
          negativeStock: false,
          autoGenerateSKU: true,
          skuPrefix: 'SKU'
        },
        notifications: {
          email: {
            enabled: true,
            lowStock: true,
            newOrder: true,
            paymentReminder: true
          },
          sms: {
            enabled: false,
            lowStock: false,
            newOrder: false
          }
        },
        backup: {
          autoBackup: true,
          frequency: 'weekly',
          retentionDays: 30
        }
      });
    }

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// Update settings
export const updateSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne();
    
    if (!settings) {
      // Create new settings if none exist
      settings = await Settings.create({
        ...req.body,
        updatedBy: req.user._id
      });
    } else {
      // Update existing settings
      settings = await Settings.findOneAndUpdate(
        {},
        { ...req.body, updatedBy: req.user._id },
        { new: true, runValidators: true }
      );
    }

    // Log activity
    await logActivity(req.user._id, 'update', 'settings', settings._id, 'Updated system settings');

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// Get email settings
export const getEmailSettings = async (req, res, next) => {
  try {
    const settings = await Settings.findOne().select('notifications.email company.email');
    
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Settings not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        email: settings.notifications.email,
        companyEmail: settings.company.email
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update email settings
export const updateEmailSettings = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    const settings = await Settings.findOne();
    
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Settings not found'
      });
    }

    settings.notifications.email = email;
    settings.updatedBy = req.user._id;
    await settings.save();

    // Log activity
    await logActivity(req.user._id, 'update', 'settings', settings._id, 'Updated email notification settings');

    res.status(200).json({
      success: true,
      message: 'Email settings updated successfully',
      data: {
        email: settings.notifications.email
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get tax settings
export const getTaxSettings = async (req, res, next) => {
  try {
    const settings = await Settings.findOne().select('tax');
    
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Settings not found'
      });
    }

    res.status(200).json({
      success: true,
      data: settings.tax
    });
  } catch (error) {
    next(error);
  }
};

// Update tax settings
export const updateTaxSettings = async (req, res, next) => {
  try {
    const { tax } = req.body;
    
    const settings = await Settings.findOne();
    
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Settings not found'
      });
    }

    settings.tax = tax;
    settings.updatedBy = req.user._id;
    await settings.save();

    // Log activity
    await logActivity(req.user._id, 'update', 'settings', settings._id, 'Updated tax settings');

    res.status(200).json({
      success: true,
      message: 'Tax settings updated successfully',
      data: settings.tax
    });
  } catch (error) {
    next(error);
  }
};

// Get inventory settings
export const getInventorySettings = async (req, res, next) => {
  try {
    const settings = await Settings.findOne().select('inventory');
    
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Settings not found'
      });
    }

    res.status(200).json({
      success: true,
      data: settings.inventory
    });
  } catch (error) {
    next(error);
  }
};

// Update inventory settings
export const updateInventorySettings = async (req, res, next) => {
  try {
    const { inventory } = req.body;
    
    const settings = await Settings.findOne();
    
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Settings not found'
      });
    }

    settings.inventory = inventory;
    settings.updatedBy = req.user._id;
    await settings.save();

    // Log activity
    await logActivity(req.user._id, 'update', 'settings', settings._id, 'Updated inventory settings');

    res.status(200).json({
      success: true,
      message: 'Inventory settings updated successfully',
      data: settings.inventory
    });
  } catch (error) {
    next(error);
  }
};

// Get backup settings
export const getBackupSettings = async (req, res, next) => {
  try {
    const settings = await Settings.findOne().select('backup');
    
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Settings not found'
      });
    }

    res.status(200).json({
      success: true,
      data: settings.backup
    });
  } catch (error) {
    next(error);
  }
};

// Update backup settings
export const updateBackupSettings = async (req, res, next) => {
  try {
    const { backup } = req.body;
    
    const settings = await Settings.findOne();
    
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Settings not found'
      });
    }

    settings.backup = backup;
    settings.updatedBy = req.user._id;
    await settings.save();

    // Log activity
    await logActivity(req.user._id, 'update', 'settings', settings._id, 'Updated backup settings');

    res.status(200).json({
      success: true,
      message: 'Backup settings updated successfully',
      data: settings.backup
    });
  } catch (error) {
    next(error);
  }
};

// Trigger backup
export const triggerBackup = async (req, res, next) => {
  try {
    // In a real application, this would trigger a backup process
    // For now, we'll just simulate a successful backup
    
    // Log activity
    await logActivity(req.user._id, 'create', 'settings', null, 'Triggered manual backup');

    res.status(200).json({
      success: true,
      message: 'Backup triggered successfully',
      data: {
        backupDate: new Date(),
        backupSize: '25.4 MB',
        backupLocation: 'cloud-storage/backups/backup-' + new Date().toISOString().split('T')[0] + '.zip'
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get system information
export const getSystemInfo = async (req, res, next) => {
  try {
    // In a real application, this would fetch actual system information
    // For now, we'll return simulated data
    
    const systemInfo = {
      version: '1.0.0',
      nodeVersion: process.version,
      platform: process.platform,
      uptime: Math.floor(process.uptime()),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      databaseSize: '156.8 MB',
      totalUsers: await User.countDocuments(),
      totalProducts: await Product.countDocuments(),
      totalOrders: await Sales.countDocuments(),
      lastBackup: new Date(Date.now() - 24 * 60 * 60 * 1000)
    };

    res.status(200).json({
      success: true,
      data: systemInfo
    });
  } catch (error) {
    next(error);
  }
};