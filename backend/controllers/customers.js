import Customer from '../models/Customer.js';
import { logActivity } from '../middleware/logger.js';

// Get all customers with advanced filtering
export const getCustomers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const type = req.query.type || '';
    const group = req.query.group || '';
    const active = req.query.active;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const paymentTerms = req.query.paymentTerms || '';
    const creditLimit = req.query.creditLimit;

    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (type) {
      query.type = type;
    }
    
    if (group) {
      query.customerGroup = group;
    }
    
    if (active !== undefined) {
      query.isActive = active === 'true';
    }

    if (paymentTerms) {
      query.paymentTerms = paymentTerms;
    }

    if (creditLimit) {
      query.creditLimit = { $gte: parseInt(creditLimit) };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder;

    const customers = await Customer.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'firstName lastName');

    const total = await Customer.countDocuments(query);

    // Calculate additional stats for each customer
    const enrichedCustomers = customers.map(customer => ({
      ...customer.toObject(),
      fullAddress: customer.fullAddress,
      daysSinceLastOrder: customer.lastOrderDate 
        ? Math.floor((new Date() - new Date(customer.lastOrderDate)) / (1000 * 60 * 60 * 24))
        : null,
      averageOrderValue: customer.totalOrders > 0 
        ? (customer.totalSalesAmount / customer.totalOrders).toFixed(2)
        : 0,
      creditUtilization: customer.creditLimit > 0 
        ? ((customer.currentBalance / customer.creditLimit) * 100).toFixed(2)
        : 0,
      availableCredit: customer.creditLimit - customer.currentBalance
    }));

    res.status(200).json({
      success: true,
      data: enrichedCustomers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      filters: {
        search,
        type,
        group,
        active,
        paymentTerms,
        creditLimit,
        sortBy,
        sortOrder: req.query.sortOrder || 'desc'
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get customer by ID with detailed information
export const getCustomerById = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate('createdBy', 'firstName lastName');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Get recent sales orders (you would implement this based on your Sales model)
    // const recentOrders = await Sales.find({ customer: customer._id })
    //   .sort({ createdAt: -1 })
    //   .limit(5)
    //   .populate('createdBy', 'firstName lastName');

    const customerData = {
      ...customer.toObject(),
      fullAddress: customer.fullAddress,
      daysSinceLastOrder: customer.lastOrderDate 
        ? Math.floor((new Date() - new Date(customer.lastOrderDate)) / (1000 * 60 * 60 * 24))
        : null,
      averageOrderValue: customer.totalOrders > 0 
        ? (customer.totalSalesAmount / customer.totalOrders).toFixed(2)
        : 0,
      creditUtilization: customer.creditLimit > 0 
        ? ((customer.currentBalance / customer.creditLimit) * 100).toFixed(2)
        : 0,
      availableCredit: customer.creditLimit - customer.currentBalance,
      // recentOrders: recentOrders || []
    };

    res.status(200).json({
      success: true,
      data: customerData
    });
  } catch (error) {
    next(error);
  }
};

// Create new customer
export const createCustomer = async (req, res, next) => {
  try {
    const customerData = {
      ...req.body,
      createdBy: req.user._id
    };

    // Validate required fields
    const requiredFields = ['name', 'email', 'phone', 'address.street', 'address.city', 'address.state', 'address.zipCode', 'address.country'];
    for (const field of requiredFields) {
      const fieldValue = field.includes('.') 
        ? field.split('.').reduce((obj, key) => obj?.[key], customerData)
        : customerData[field];
      
      if (!fieldValue) {
        return res.status(400).json({
          success: false,
          message: `${field.replace('.', ' ')} is required`
        });
      }
    }

    // Check if customer with email already exists
    const existingCustomer = await Customer.findOne({ email: customerData.email });
    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: 'Customer with this email already exists'
      });
    }

    const customer = await Customer.create(customerData);

    // Log activity
    await logActivity(req.user._id, 'create', 'customer', customer._id, `Created customer: ${customer.name}`);

    const populatedCustomer = await Customer.findById(customer._id)
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: populatedCustomer
    });
  } catch (error) {
    next(error);
  }
};

// Update customer
export const updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Check if email is being changed and if it conflicts with another customer
    if (req.body.email && req.body.email !== customer.email) {
      const existingCustomer = await Customer.findOne({ 
        email: req.body.email,
        _id: { $ne: req.params.id }
      });
      if (existingCustomer) {
        return res.status(400).json({
          success: false,
          message: 'Another customer with this email already exists'
        });
      }
    }

    const updatedCustomer = await Customer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName');

    // Log activity
    await logActivity(req.user._id, 'update', 'customer', customer._id, `Updated customer: ${customer.name}`);

    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: updatedCustomer
    });
  } catch (error) {
    next(error);
  }
};

// Delete customer
export const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Check if customer has any sales orders
    // const salesCount = await Sales.countDocuments({ customer: req.params.id });
    // if (salesCount > 0) {
    //   return res.status(400).json({
    //     success: false,
    //     message: `Cannot delete customer with ${salesCount} existing sales orders. Please deactivate instead.`
    //   });
    // }

    await Customer.findByIdAndDelete(req.params.id);

    // Log activity
    await logActivity(req.user._id, 'delete', 'customer', customer._id, `Deleted customer: ${customer.name}`);

    res.status(200).json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Update customer status (activate/deactivate)
export const updateCustomerStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    customer.isActive = isActive;
    await customer.save();

    // Log activity
    await logActivity(req.user._id, 'update', 'customer', customer._id, 
      `${isActive ? 'Activated' : 'Deactivated'} customer: ${customer.name}`);

    res.status(200).json({
      success: true,
      message: `Customer ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        id: customer._id,
        isActive: customer.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update customer group
export const updateCustomerGroup = async (req, res, next) => {
  try {
    const { customerGroup } = req.body;
    
    const validGroups = ['regular', 'vip', 'wholesale', 'retail'];
    if (!validGroups.includes(customerGroup)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer group'
      });
    }

    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    customer.customerGroup = customerGroup;
    await customer.save();

    // Log activity
    await logActivity(req.user._id, 'update', 'customer', customer._id, 
      `Updated customer group for ${customer.name} to ${customerGroup}`);

    res.status(200).json({
      success: true,
      message: 'Customer group updated successfully',
      data: {
        id: customer._id,
        customerGroup: customer.customerGroup
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get customer statistics
export const getCustomerStats = async (req, res, next) => {
  try {
    const customerId = req.params.id;
    
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // You would implement these based on your Sales model
    const stats = {
      totalOrders: customer.totalOrders,
      totalSalesAmount: customer.totalSalesAmount,
      averageOrderValue: customer.totalOrders > 0 
        ? (customer.totalSalesAmount / customer.totalOrders).toFixed(2)
        : 0,
      daysSinceLastOrder: customer.lastOrderDate 
        ? Math.floor((new Date() - new Date(customer.lastOrderDate)) / (1000 * 60 * 60 * 24))
        : null,
      currentBalance: customer.currentBalance,
      creditLimit: customer.creditLimit,
      creditUtilization: customer.creditLimit > 0 
        ? ((customer.currentBalance / customer.creditLimit) * 100).toFixed(2)
        : 0,
      availableCredit: customer.creditLimit - customer.currentBalance,
      discountPercentage: customer.discountPercentage,
      customerGroup: customer.customerGroup,
      // These would come from actual sales data
      pendingOrders: 0,
      completedOrders: customer.totalOrders,
      cancelledOrders: 0,
      // monthlySales: [], // Last 12 months data
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
export const bulkUpdateCustomers = async (req, res, next) => {
  try {
    const { customerIds, updates } = req.body;
    
    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Customer IDs array is required'
      });
    }

    const result = await Customer.updateMany(
      { _id: { $in: customerIds } },
      updates,
      { runValidators: true }
    );

    // Log activity
    await logActivity(req.user._id, 'update', 'customer', null, 
      `Bulk updated ${result.modifiedCount} customers`);

    res.status(200).json({
      success: true,
      message: `Successfully updated ${result.modifiedCount} customers`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// Export customers data
export const exportCustomers = async (req, res, next) => {
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

    const customers = await Customer.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ name: 1 });

    // Format data for export
    const exportData = customers.map(customer => ({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      type: customer.type,
      businessName: customer.businessName || '',
      address: customer.fullAddress,
      customerGroup: customer.customerGroup,
      discountPercentage: customer.discountPercentage,
      creditLimit: customer.creditLimit,
      currentBalance: customer.currentBalance,
      paymentTerms: customer.paymentTerms,
      totalOrders: customer.totalOrders,
      totalSalesAmount: customer.totalSalesAmount,
      isActive: customer.isActive ? 'Active' : 'Inactive',
      createdAt: customer.createdAt.toISOString().split('T')[0]
    }));

    // Log activity
    await logActivity(req.user._id, 'export', 'customer', null, 
      `Exported ${exportData.length} customers in ${format.toUpperCase()} format`);

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