import Supplier from '../models/Supplier.js';
import { logActivity } from '../middleware/logger.js';

// Get all suppliers with advanced filtering
export const getSuppliers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const active = req.query.active;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const rating = req.query.rating;
    const paymentTerms = req.query.paymentTerms;

    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'contactPerson.name': { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (active !== undefined) {
      query.isActive = active === 'true';
    }

    if (rating) {
      query.rating = { $gte: parseInt(rating) };
    }

    if (paymentTerms) {
      query.paymentTerms = paymentTerms;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder;

    const suppliers = await Supplier.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'firstName lastName');

    const total = await Supplier.countDocuments(query);

    // Calculate additional stats for each supplier
    const enrichedSuppliers = suppliers.map(supplier => ({
      ...supplier.toObject(),
      fullAddress: supplier.fullAddress,
      daysSinceLastOrder: supplier.lastOrderDate 
        ? Math.floor((new Date() - new Date(supplier.lastOrderDate)) / (1000 * 60 * 60 * 24))
        : null,
      averageOrderValue: supplier.totalOrders > 0 
        ? (supplier.totalPurchaseAmount / supplier.totalOrders).toFixed(2)
        : 0
    }));

    res.status(200).json({
      success: true,
      data: enrichedSuppliers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      filters: {
        search,
        active,
        rating,
        paymentTerms,
        sortBy,
        sortOrder: req.query.sortOrder || 'desc'
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get supplier by ID with detailed information
export const getSupplierById = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id)
      .populate('createdBy', 'firstName lastName');

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    // Get recent purchase orders (you would implement this based on your Purchase model)
    // const recentOrders = await Purchase.find({ supplier: supplier._id })
    //   .sort({ createdAt: -1 })
    //   .limit(5)
    //   .populate('createdBy', 'firstName lastName');

    const supplierData = {
      ...supplier.toObject(),
      fullAddress: supplier.fullAddress,
      daysSinceLastOrder: supplier.lastOrderDate 
        ? Math.floor((new Date() - new Date(supplier.lastOrderDate)) / (1000 * 60 * 60 * 24))
        : null,
      averageOrderValue: supplier.totalOrders > 0 
        ? (supplier.totalPurchaseAmount / supplier.totalOrders).toFixed(2)
        : 0,
      // recentOrders: recentOrders || []
    };

    res.status(200).json({
      success: true,
      data: supplierData
    });
  } catch (error) {
    next(error);
  }
};

// Create new supplier
export const createSupplier = async (req, res, next) => {
  try {
    const supplierData = {
      ...req.body,
      createdBy: req.user._id
    };

    // Validate required fields
    const requiredFields = ['name', 'email', 'phone', 'contactPerson.name', 'address.street', 'address.city', 'address.state', 'address.zipCode', 'address.country'];
    for (const field of requiredFields) {
      const fieldValue = field.includes('.') 
        ? field.split('.').reduce((obj, key) => obj?.[key], supplierData)
        : supplierData[field];
      
      if (!fieldValue) {
        return res.status(400).json({
          success: false,
          message: `${field.replace('.', ' ')} is required`
        });
      }
    }

    // Check if supplier with email already exists
    const existingSupplier = await Supplier.findOne({ email: supplierData.email });
    if (existingSupplier) {
      return res.status(400).json({
        success: false,
        message: 'Supplier with this email already exists'
      });
    }

    const supplier = await Supplier.create(supplierData);

    // Log activity
    await logActivity(req.user._id, 'create', 'supplier', supplier._id, `Created supplier: ${supplier.name}`);

    const populatedSupplier = await Supplier.findById(supplier._id)
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      data: populatedSupplier
    });
  } catch (error) {
    next(error);
  }
};

// Update supplier
export const updateSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    // Check if email is being changed and if it conflicts with another supplier
    if (req.body.email && req.body.email !== supplier.email) {
      const existingSupplier = await Supplier.findOne({ 
        email: req.body.email,
        _id: { $ne: req.params.id }
      });
      if (existingSupplier) {
        return res.status(400).json({
          success: false,
          message: 'Another supplier with this email already exists'
        });
      }
    }

    const updatedSupplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName');

    // Log activity
    await logActivity(req.user._id, 'update', 'supplier', supplier._id, `Updated supplier: ${supplier.name}`);

    res.status(200).json({
      success: true,
      message: 'Supplier updated successfully',
      data: updatedSupplier
    });
  } catch (error) {
    next(error);
  }
};

// Delete supplier
export const deleteSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    // Check if supplier has any purchase orders
    // const purchaseCount = await Purchase.countDocuments({ supplier: req.params.id });
    // if (purchaseCount > 0) {
    //   return res.status(400).json({
    //     success: false,
    //     message: `Cannot delete supplier with ${purchaseCount} existing purchase orders. Please deactivate instead.`
    //   });
    // }

    await Supplier.findByIdAndDelete(req.params.id);

    // Log activity
    await logActivity(req.user._id, 'delete', 'supplier', supplier._id, `Deleted supplier: ${supplier.name}`);

    res.status(200).json({
      success: true,
      message: 'Supplier deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Update supplier status (activate/deactivate)
export const updateSupplierStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    supplier.isActive = isActive;
    await supplier.save();

    // Log activity
    await logActivity(req.user._id, 'update', 'supplier', supplier._id, 
      `${isActive ? 'Activated' : 'Deactivated'} supplier: ${supplier.name}`);

    res.status(200).json({
      success: true,
      message: `Supplier ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        id: supplier._id,
        isActive: supplier.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update supplier rating
export const updateSupplierRating = async (req, res, next) => {
  try {
    const { rating } = req.body;
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    supplier.rating = rating;
    await supplier.save();

    // Log activity
    await logActivity(req.user._id, 'update', 'supplier', supplier._id, 
      `Updated rating for supplier: ${supplier.name} to ${rating} stars`);

    res.status(200).json({
      success: true,
      message: 'Supplier rating updated successfully',
      data: {
        id: supplier._id,
        rating: supplier.rating
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get supplier statistics
export const getSupplierStats = async (req, res, next) => {
  try {
    const supplierId = req.params.id;
    
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    // You would implement these based on your Purchase and Product models
    const stats = {
      totalOrders: supplier.totalOrders,
      totalPurchaseAmount: supplier.totalPurchaseAmount,
      averageOrderValue: supplier.totalOrders > 0 
        ? (supplier.totalPurchaseAmount / supplier.totalOrders).toFixed(2)
        : 0,
      daysSinceLastOrder: supplier.lastOrderDate 
        ? Math.floor((new Date() - new Date(supplier.lastOrderDate)) / (1000 * 60 * 60 * 24))
        : null,
      currentBalance: supplier.currentBalance,
      creditLimit: supplier.creditLimit,
      creditUtilization: supplier.creditLimit > 0 
        ? ((supplier.currentBalance / supplier.creditLimit) * 100).toFixed(2)
        : 0,
      rating: supplier.rating || 0,
      // These would come from actual purchase data
      pendingOrders: 0,
      completedOrders: supplier.totalOrders,
      cancelledOrders: 0,
      // monthlyPurchases: [], // Last 12 months data
      // topProducts: [] // Most purchased products
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

// Bulk operations
export const bulkUpdateSuppliers = async (req, res, next) => {
  try {
    const { supplierIds, updates } = req.body;
    
    if (!supplierIds || !Array.isArray(supplierIds) || supplierIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Supplier IDs array is required'
      });
    }

    const result = await Supplier.updateMany(
      { _id: { $in: supplierIds } },
      updates,
      { runValidators: true }
    );

    // Log activity
    await logActivity(req.user._id, 'update', 'supplier', null, 
      `Bulk updated ${result.modifiedCount} suppliers`);

    res.status(200).json({
      success: true,
      message: `Successfully updated ${result.modifiedCount} suppliers`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// Export suppliers data
export const exportSuppliers = async (req, res, next) => {
  try {
    const { format = 'csv', filters = {} } = req.query;
    
    // Build query based on filters
    const query = {};
    if (filters.active !== undefined) {
      query.isActive = filters.active === 'true';
    }
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const suppliers = await Supplier.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ name: 1 });

    // Format data for export
    const exportData = suppliers.map(supplier => ({
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      contactPerson: supplier.contactPerson.name,
      contactPhone: supplier.contactPerson.phone || '',
      contactEmail: supplier.contactPerson.email || '',
      address: supplier.fullAddress,
      paymentTerms: supplier.paymentTerms,
      creditLimit: supplier.creditLimit,
      currentBalance: supplier.currentBalance,
      rating: supplier.rating || '',
      totalOrders: supplier.totalOrders,
      totalPurchaseAmount: supplier.totalPurchaseAmount,
      isActive: supplier.isActive ? 'Active' : 'Inactive',
      createdAt: supplier.createdAt.toISOString().split('T')[0]
    }));

    // Log activity
    await logActivity(req.user._id, 'export', 'supplier', null, 
      `Exported ${exportData.length} suppliers in ${format.toUpperCase()} format`);

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