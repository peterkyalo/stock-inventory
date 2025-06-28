import StockMovement from '../models/StockMovement.js';
import Location from '../models/Location.js';
import Product from '../models/Product.js';
import { logActivity } from '../middleware/logger.js';

// Get stock movements with advanced filtering
export const getStockMovements = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const type = req.query.type || '';
    const reason = req.query.reason || '';
    const product = req.query.product || '';
    const location = req.query.location || '';
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const search = req.query.search || '';
    const sortBy = req.query.sortBy || 'movementDate';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Build query
    const query = {};
    
    if (type) {
      query.type = type;
    }
    
    if (reason) {
      query.reason = reason;
    }
    
    if (product) {
      query.product = product;
    }

    if (location) {
      query.$or = [
        { 'location.from': location },
        { 'location.to': location }
      ];
    }

    if (startDate && endDate) {
      query.movementDate = {
        $gte: startDate,
        $lte: endDate
      };
    } else if (startDate) {
      query.movementDate = { $gte: startDate };
    } else if (endDate) {
      query.movementDate = { $lte: endDate };
    }

    if (search) {
      const productIds = await Product.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { sku: { $regex: search, $options: 'i' } }
        ]
      }).distinct('_id');

      query.$or = [
        { product: { $in: productIds } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder;

    const movements = await StockMovement.find(query)
      .populate('product', 'name sku brand unit images')
      .populate('location.from', 'name code type')
      .populate('location.to', 'name code type')
      .populate('performedBy', 'firstName lastName')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await StockMovement.countDocuments(query);

    // Calculate summary statistics
    const summary = {
      totalMovements: total,
      inMovements: await StockMovement.countDocuments({ ...query, type: 'in' }),
      outMovements: await StockMovement.countDocuments({ ...query, type: 'out' }),
      transferMovements: await StockMovement.countDocuments({ ...query, type: 'transfer' }),
      adjustmentMovements: await StockMovement.countDocuments({ ...query, type: 'adjustment' }),
      totalQuantityIn: (await StockMovement.aggregate([
        { $match: { ...query, type: 'in' } },
        { $group: { _id: null, total: { $sum: '$quantity' } } }
      ]))[0]?.total || 0,
      totalQuantityOut: (await StockMovement.aggregate([
        { $match: { ...query, type: 'out' } },
        { $group: { _id: null, total: { $sum: '$quantity' } } }
      ]))[0]?.total || 0,
      totalValue: (await StockMovement.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: { $multiply: ['$quantity', '$unitCost'] } } } }
      ]))[0]?.total || 0
    };

    res.status(200).json({
      success: true,
      data: movements,
      summary,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      filters: {
        type,
        reason,
        product,
        location,
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null,
        search,
        sortBy,
        sortOrder: req.query.sortOrder || 'desc'
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create stock movement
export const createStockMovement = async (req, res, next) => {
  try {
    const { 
      productId, 
      type, 
      reason, 
      quantity, 
      notes, 
      locationFrom, 
      locationTo,
      reference
    } = req.body;

    // Validate required fields
    if (!productId || !type || !reason || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Product, type, reason, and quantity are required'
      });
    }

    // Validate quantity
    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be greater than zero'
      });
    }

    // Validate type
    const validTypes = ['in', 'out', 'transfer', 'adjustment'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid movement type'
      });
    }

    // Validate reason
    const validReasons = [
      'purchase', 'sale', 'return', 'damage', 'loss', 'theft', 
      'transfer', 'adjustment', 'opening_stock', 'manufacturing'
    ];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid movement reason'
      });
    }

    // Validate locations for transfer
    if (type === 'transfer') {
      if (!locationFrom || !locationTo) {
        return res.status(400).json({
          success: false,
          message: 'Both from and to locations are required for transfers'
        });
      }

      if (locationFrom === locationTo) {
        return res.status(400).json({
          success: false,
          message: 'From and to locations cannot be the same'
        });
      }

      // Verify locations exist
      const fromLocation = await Location.findById(locationFrom);
      const toLocation = await Location.findById(locationTo);

      if (!fromLocation || !toLocation) {
        return res.status(400).json({
          success: false,
          message: 'One or both locations not found'
        });
      }
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const previousStock = product.currentStock;
    let newStock;

    // Calculate new stock based on movement type
    if (type === 'in') {
      newStock = previousStock + parseInt(quantity);
    } else if (type === 'out') {
      if (previousStock < quantity) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient stock for this movement'
        });
      }
      newStock = previousStock - parseInt(quantity);
    } else if (type === 'adjustment') {
      newStock = parseInt(quantity); // Direct adjustment to specific quantity
    } else if (type === 'transfer') {
      // For transfers, total stock doesn't change, just the location
      newStock = previousStock;
      
      // Update stock locations (this would be more complex in a real system)
      // This is a simplified implementation
      const fromLocationIndex = product.stockLocations.findIndex(
        loc => loc.location.toString() === locationFrom
      );
      
      const toLocationIndex = product.stockLocations.findIndex(
        loc => loc.location.toString() === locationTo
      );
      
      if (fromLocationIndex === -1) {
        return res.status(400).json({
          success: false,
          message: 'Product not found in source location'
        });
      }
      
      if (product.stockLocations[fromLocationIndex].quantity < quantity) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient stock in source location'
        });
      }
      
      // Update source location
      product.stockLocations[fromLocationIndex].quantity -= parseInt(quantity);
      
      // Update or add destination location
      if (toLocationIndex === -1) {
        product.stockLocations.push({
          location: locationTo,
          quantity: parseInt(quantity)
        });
      } else {
        product.stockLocations[toLocationIndex].quantity += parseInt(quantity);
      }
      
      // Clean up empty locations
      product.stockLocations = product.stockLocations.filter(loc => loc.quantity > 0);
    }

    // Update product stock
    if (type !== 'transfer') {
      product.currentStock = newStock;
    }
    
    product.lastStockUpdate = new Date();
    await product.save();

    // Create stock movement record
    const movement = await StockMovement.create({
      product: productId,
      type,
      reason,
      quantity: parseInt(quantity),
      previousStock,
      newStock,
      unitCost: product.costPrice,
      totalCost: product.costPrice * parseInt(quantity),
      location: {
        from: locationFrom || null,
        to: locationTo || null
      },
      reference,
      notes,
      performedBy: req.user._id
    });

    // Log activity
    await logActivity(req.user._id, 'create', 'stock_movement', movement._id, 
      `Created ${type} movement for ${product.name}: ${quantity} units`);

    const populatedMovement = await StockMovement.findById(movement._id)
      .populate('product', 'name sku brand unit images')
      .populate('location.from', 'name code')
      .populate('location.to', 'name code')
      .populate('performedBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Stock movement created successfully',
      data: populatedMovement
    });
  } catch (error) {
    next(error);
  }
};

// Get stock movement by ID
export const getStockMovementById = async (req, res, next) => {
  try {
    const movement = await StockMovement.findById(req.params.id)
      .populate('product', 'name sku brand unit images')
      .populate('location.from', 'name code type')
      .populate('location.to', 'name code type')
      .populate('performedBy', 'firstName lastName');

    if (!movement) {
      return res.status(404).json({
        success: false,
        message: 'Stock movement not found'
      });
    }

    res.status(200).json({
      success: true,
      data: movement
    });
  } catch (error) {
    next(error);
  }
};

// Get stock movement summary
export const getStockMovementSummary = async (req, res, next) => {
  try {
    const { startDate, endDate, product, type } = req.query;
    
    // Build match stage
    const match = {};
    
    if (startDate && endDate) {
      match.movementDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (startDate) {
      match.movementDate = { $gte: new Date(startDate) };
    } else if (endDate) {
      match.movementDate = { $lte: new Date(endDate) };
    }
    
    if (product) {
      match.product = product;
    }
    
    if (type) {
      match.type = type;
    }

    // Get summary by type
    const typesSummary = await StockMovement.aggregate([
      { $match: match },
      { 
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: '$totalCost' }
        }
      }
    ]);

    // Get summary by reason
    const reasonsSummary = await StockMovement.aggregate([
      { $match: match },
      { 
        $group: {
          _id: '$reason',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: '$totalCost' }
        }
      }
    ]);

    // Get summary by product (top 10)
    const topMovedProducts = await StockMovement.aggregate([
      { $match: match },
      { 
        $group: {
          _id: '$product',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: '$totalCost' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      {
        $addFields: {
          productName: { $arrayElemAt: ['$productDetails.name', 0] },
          productSku: { $arrayElemAt: ['$productDetails.sku', 0] }
        }
      },
      {
        $project: {
          productDetails: 0
        }
      }
    ]);

    // Get summary by location (top 10)
    const topMovedLocations = await StockMovement.aggregate([
      { 
        $match: { 
          ...match,
          $or: [
            { 'location.from': { $ne: null } },
            { 'location.to': { $ne: null } }
          ]
        }
      },
      {
        $project: {
          location: {
            $cond: [
              { $ne: ['$location.from', null] },
              '$location.from',
              '$location.to'
            ]
          },
          quantity: 1,
          totalCost: 1
        }
      },
      { 
        $group: {
          _id: '$location',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: '$totalCost' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'locations',
          localField: '_id',
          foreignField: '_id',
          as: 'locationDetails'
        }
      },
      {
        $addFields: {
          locationName: { $arrayElemAt: ['$locationDetails.name', 0] },
          locationType: { $arrayElemAt: ['$locationDetails.type', 0] }
        }
      },
      {
        $project: {
          locationDetails: 0
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        typesSummary,
        reasonsSummary,
        topMovedProducts,
        topMovedLocations
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get all locations
export const getLocations = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const type = req.query.type || '';
    const active = req.query.active;
    const sortBy = req.query.sortBy || 'name';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (type) {
      query.type = type;
    }
    
    if (active !== undefined) {
      query.isActive = active === 'true';
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder;

    const locations = await Location.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Location.countDocuments(query);

    // Calculate additional metrics for each location
    const enrichedLocations = await Promise.all(locations.map(async (location) => {
      // Count products in this location
      const productCount = await Product.countDocuments({
        'stockLocations.location': location._id,
        'stockLocations.quantity': { $gt: 0 }
      });

      // Calculate total stock value in this location
      const stockValue = await Product.aggregate([
        {
          $match: {
            'stockLocations.location': location._id,
            'stockLocations.quantity': { $gt: 0 }
          }
        },
        {
          $unwind: '$stockLocations'
        },
        {
          $match: {
            'stockLocations.location': location._id
          }
        },
        {
          $group: {
            _id: null,
            totalValue: {
              $sum: { $multiply: ['$stockLocations.quantity', '$costPrice'] }
            }
          }
        }
      ]);

      // Count recent movements for this location
      const recentMovements = await StockMovement.countDocuments({
        $or: [
          { 'location.from': location._id },
          { 'location.to': location._id }
        ],
        movementDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      });

      return {
        ...location.toObject(),
        productCount,
        stockValue: stockValue[0]?.totalValue || 0,
        recentMovements,
        utilizationPercentage: location.capacity 
          ? Math.round((location.currentUtilization / location.capacity) * 100) 
          : null
      };
    }));

    res.status(200).json({
      success: true,
      data: enrichedLocations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      filters: {
        search,
        type,
        active,
        sortBy,
        sortOrder: req.query.sortOrder || 'asc'
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get location by ID
export const getLocationById = async (req, res, next) => {
  try {
    const location = await Location.findById(req.params.id)
      .populate('createdBy', 'firstName lastName');

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    // Get products in this location
    const products = await Product.find({
      'stockLocations.location': location._id,
      'stockLocations.quantity': { $gt: 0 }
    })
    .select('name sku brand unit images currentStock stockLocations costPrice sellingPrice')
    .sort({ name: 1 });

    // Calculate total stock value
    const stockValue = products.reduce((total, product) => {
      const locationStock = product.stockLocations.find(
        sl => sl.location.toString() === location._id.toString()
      );
      return total + (locationStock?.quantity || 0) * product.costPrice;
    }, 0);

    // Get recent movements for this location
    const recentMovements = await StockMovement.find({
      $or: [
        { 'location.from': location._id },
        { 'location.to': location._id }
      ]
    })
    .populate('product', 'name sku')
    .populate('performedBy', 'firstName lastName')
    .sort({ movementDate: -1 })
    .limit(10);

    // Calculate utilization
    const utilizationPercentage = location.capacity 
      ? Math.round((location.currentUtilization / location.capacity) * 100) 
      : null;

    const locationData = {
      ...location.toObject(),
      products: products.map(product => {
        const locationStock = product.stockLocations.find(
          sl => sl.location.toString() === location._id.toString()
        );
        return {
          ...product.toObject(),
          locationQuantity: locationStock?.quantity || 0,
          locationValue: (locationStock?.quantity || 0) * product.costPrice,
          percentage: product.currentStock > 0 ? 
            Math.round((locationStock?.quantity || 0) / product.currentStock * 100) : 0
        };
      }),
      stockValue,
      recentMovements,
      utilizationPercentage,
      productCount: products.length
    };

    res.status(200).json({
      success: true,
      data: locationData
    });
  } catch (error) {
    next(error);
  }
};

// Create location
export const createLocation = async (req, res, next) => {
  try {
    // Check if location with same name or code exists
    const existingLocation = await Location.findOne({
      $or: [
        { name: req.body.name },
        { code: req.body.code }
      ]
    });

    if (existingLocation) {
      return res.status(400).json({
        success: false,
        message: existingLocation.name === req.body.name 
          ? 'Location with this name already exists' 
          : 'Location with this code already exists'
      });
    }

    const locationData = {
      ...req.body,
      createdBy: req.user._id
    };

    const location = await Location.create(locationData);

    // Log activity
    await logActivity(req.user._id, 'create', 'location', location._id, `Created location: ${location.name}`);

    res.status(201).json({
      success: true,
      message: 'Location created successfully',
      data: location
    });
  } catch (error) {
    next(error);
  }
};

// Update location
export const updateLocation = async (req, res, next) => {
  try {
    const location = await Location.findById(req.params.id);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    // Check if name or code is being changed and if it conflicts with another location
    if (req.body.name && req.body.name !== location.name) {
      const existingName = await Location.findOne({ 
        name: req.body.name,
        _id: { $ne: req.params.id }
      });
      if (existingName) {
        return res.status(400).json({
          success: false,
          message: 'Another location with this name already exists'
        });
      }
    }

    if (req.body.code && req.body.code !== location.code) {
      const existingCode = await Location.findOne({ 
        code: req.body.code,
        _id: { $ne: req.params.id }
      });
      if (existingCode) {
        return res.status(400).json({
          success: false,
          message: 'Another location with this code already exists'
        });
      }
    }

    const updatedLocation = await Location.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    // Log activity
    await logActivity(req.user._id, 'update', 'location', location._id, `Updated location: ${location.name}`);

    res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      data: updatedLocation
    });
  } catch (error) {
    next(error);
  }
};

// Delete location
export const deleteLocation = async (req, res, next) => {
  try {
    const location = await Location.findById(req.params.id);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    // Check if location has products
    const productsInLocation = await Product.countDocuments({
      'stockLocations.location': location._id,
      'stockLocations.quantity': { $gt: 0 }
    });
    
    if (productsInLocation > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete location with ${productsInLocation} products. Please move all products first.`
      });
    }

    // Check if location has movements
    const movementsWithLocation = await StockMovement.countDocuments({
      $or: [
        { 'location.from': location._id },
        { 'location.to': location._id }
      ]
    });
    
    if (movementsWithLocation > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete location with ${movementsWithLocation} stock movements. Please deactivate instead.`
      });
    }

    await Location.findByIdAndDelete(req.params.id);

    // Log activity
    await logActivity(req.user._id, 'delete', 'location', location._id, `Deleted location: ${location.name}`);

    res.status(200).json({
      success: true,
      message: 'Location deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Update location status
export const updateLocationStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    
    const location = await Location.findById(req.params.id);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    location.isActive = isActive;
    await location.save();

    // Log activity
    await logActivity(req.user._id, 'update', 'location', location._id, 
      `${isActive ? 'Activated' : 'Deactivated'} location: ${location.name}`);

    res.status(200).json({
      success: true,
      message: `Location ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        id: location._id,
        isActive: location.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get inventory dashboard stats
export const getInventoryStats = async (req, res, next) => {
  try {
    // Get total products
    const totalProducts = await Product.countDocuments({ isActive: true });
    
    // Get low stock products
    const lowStockProducts = await Product.countDocuments({
      $expr: { $lte: ['$currentStock', '$minimumStock'] },
      currentStock: { $gt: 0 },
      isActive: true
    });
    
    // Get out of stock products
    const outOfStockProducts = await Product.countDocuments({
      currentStock: 0,
      isActive: true
    });
    
    // Get total locations
    const totalLocations = await Location.countDocuments({ isActive: true });
    
    // Get total stock value
    const stockValue = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: { $multiply: ['$currentStock', '$costPrice'] } } } }
    ]);
    
    // Get total stock movements in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentMovements = await StockMovement.countDocuments({
      movementDate: { $gte: thirtyDaysAgo }
    });
    
    // Get movement trends by type for last 30 days
    const movementTrends = await StockMovement.aggregate([
      { $match: { movementDate: { $gte: thirtyDaysAgo } } },
      { 
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' }
        }
      }
    ]);
    
    // Get top 5 products with most movements
    const topMovedProducts = await StockMovement.aggregate([
      { $match: { movementDate: { $gte: thirtyDaysAgo } } },
      { 
        $group: {
          _id: '$product',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      {
        $addFields: {
          productName: { $arrayElemAt: ['$productDetails.name', 0] },
          productSku: { $arrayElemAt: ['$productDetails.sku', 0] }
        }
      },
      {
        $project: {
          productDetails: 0
        }
      }
    ]);
    
    // Get top 5 locations with most movements
    const topMovedLocations = await StockMovement.aggregate([
      { 
        $match: { 
          movementDate: { $gte: thirtyDaysAgo },
          $or: [
            { 'location.from': { $ne: null } },
            { 'location.to': { $ne: null } }
          ]
        }
      },
      {
        $project: {
          location: {
            $cond: [
              { $ne: ['$location.from', null] },
              '$location.from',
              '$location.to'
            ]
          },
          quantity: 1,
          totalCost: 1
        }
      },
      { 
        $group: {
          _id: '$location',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'locations',
          localField: '_id',
          foreignField: '_id',
          as: 'locationDetails'
        }
      },
      {
        $addFields: {
          locationName: { $arrayElemAt: ['$locationDetails.name', 0] },
          locationType: { $arrayElemAt: ['$locationDetails.type', 0] }
        }
      },
      {
        $project: {
          locationDetails: 0
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalProducts,
        lowStockProducts,
        outOfStockProducts,
        totalLocations,
        stockValue: stockValue[0]?.total || 0,
        recentMovements,
        movementTrends,
        topMovedProducts,
        topMovedLocations
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get product stock by location
export const getProductStockByLocation = async (req, res, next) => {
  try {
    const { productId } = req.params;
    
    const product = await Product.findById(productId)
      .populate('stockLocations.location', 'name code type isActive');
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Get recent movements for this product
    const recentMovements = await StockMovement.find({ product: productId })
      .populate('location.from', 'name code')
      .populate('location.to', 'name code')
      .populate('performedBy', 'firstName lastName')
      .sort({ movementDate: -1 })
      .limit(10);
    
    // Calculate stock distribution percentage
    const totalStock = product.currentStock;
    const stockDistribution = product.stockLocations.map(location => ({
      ...location.toObject(),
      percentage: totalStock > 0 ? Math.round((location.quantity / totalStock) * 100) : 0,
      value: location.quantity * product.costPrice
    }));
    
    res.status(200).json({
      success: true,
      data: {
        product: {
          id: product._id,
          name: product.name,
          sku: product.sku,
          currentStock: product.currentStock,
          costPrice: product.costPrice
        },
        stockLocations: stockDistribution,
        recentMovements
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get location stock
export const getLocationStock = async (req, res, next) => {
  try {
    const { locationId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const sortBy = req.query.sortBy || 'name';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    
    const location = await Location.findById(locationId);
    
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }
    
    // Build query
    const query = {
      'stockLocations.location': locationId,
      'stockLocations.quantity': { $gt: 0 }
    };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder;
    
    const products = await Product.find(query)
      .select('name sku brand unit images currentStock stockLocations costPrice sellingPrice')
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    const total = await Product.countDocuments(query);
    
    // Calculate total stock value in this location
    const stockValue = products.reduce((total, product) => {
      const locationStock = product.stockLocations.find(
        sl => sl.location.toString() === locationId
      );
      return total + (locationStock?.quantity || 0) * product.costPrice;
    }, 0);
    
    // Get recent movements for this location
    const recentMovements = await StockMovement.find({
      $or: [
        { 'location.from': locationId },
        { 'location.to': locationId }
      ]
    })
    .populate('product', 'name sku')
    .populate('performedBy', 'firstName lastName')
    .sort({ movementDate: -1 })
    .limit(10);
    
    // Enrich product data with location-specific information
    const enrichedProducts = products.map(product => {
      const locationStock = product.stockLocations.find(
        sl => sl.location.toString() === locationId
      );
      return {
        ...product.toObject(),
        locationQuantity: locationStock?.quantity || 0,
        locationValue: (locationStock?.quantity || 0) * product.costPrice,
        percentage: product.currentStock > 0 
          ? Math.round(((locationStock?.quantity || 0) / product.currentStock) * 100) 
          : 0
      };
    });
    
    res.status(200).json({
      success: true,
      data: {
        location: {
          id: location._id,
          name: location.name,
          code: location.code,
          type: location.type,
          capacity: location.capacity,
          currentUtilization: location.currentUtilization,
          utilizationPercentage: location.capacity 
            ? Math.round((location.currentUtilization / location.capacity) * 100) 
            : null
        },
        products: enrichedProducts,
        stockValue,
        recentMovements,
        productCount: total
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

// Transfer stock between locations
export const transferStock = async (req, res, next) => {
  try {
    const { 
      productId, 
      fromLocationId, 
      toLocationId, 
      quantity, 
      notes 
    } = req.body;
    
    // Validate required fields
    if (!productId || !fromLocationId || !toLocationId || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Product, from location, to location, and quantity are required'
      });
    }
    
    // Validate quantity
    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be greater than zero'
      });
    }
    
    // Validate locations are different
    if (fromLocationId === toLocationId) {
      return res.status(400).json({
        success: false,
        message: 'From and to locations cannot be the same'
      });
    }
    
    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Verify locations exist
    const fromLocation = await Location.findById(fromLocationId);
    const toLocation = await Location.findById(toLocationId);
    
    if (!fromLocation || !toLocation) {
      return res.status(404).json({
        success: false,
        message: 'One or both locations not found'
      });
    }
    
    // Check if product exists in source location with sufficient quantity
    const fromLocationIndex = product.stockLocations.findIndex(
      loc => loc.location.toString() === fromLocationId
    );
    
    if (fromLocationIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'Product not found in source location'
      });
    }
    
    if (product.stockLocations[fromLocationIndex].quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock in source location. Available: ${product.stockLocations[fromLocationIndex].quantity}`
      });
    }
    
    // Update source location
    product.stockLocations[fromLocationIndex].quantity -= parseInt(quantity);
    
    // Update or add destination location
    const toLocationIndex = product.stockLocations.findIndex(
      loc => loc.location.toString() === toLocationId
    );
    
    if (toLocationIndex === -1) {
      product.stockLocations.push({
        location: toLocationId,
        quantity: parseInt(quantity)
      });
    } else {
      product.stockLocations[toLocationIndex].quantity += parseInt(quantity);
    }
    
    // Clean up empty locations
    product.stockLocations = product.stockLocations.filter(loc => loc.quantity > 0);
    
    // Update product
    product.lastStockUpdate = new Date();
    await product.save();
    
    // Create stock movement record
    const movement = await StockMovement.create({
      product: productId,
      type: 'transfer',
      reason: 'transfer',
      quantity: parseInt(quantity),
      previousStock: product.currentStock,
      newStock: product.currentStock, // Total stock doesn't change in transfers
      unitCost: product.costPrice,
      totalCost: product.costPrice * parseInt(quantity),
      location: {
        from: fromLocationId,
        to: toLocationId
      },
      notes,
      performedBy: req.user._id
    });
    
    // Log activity
    await logActivity(req.user._id, 'create', 'stock_movement', movement._id, 
      `Transferred ${quantity} units of ${product.name} from ${fromLocation.name} to ${toLocation.name}`);
    
    const populatedMovement = await StockMovement.findById(movement._id)
      .populate('product', 'name sku')
      .populate('location.from', 'name code')
      .populate('location.to', 'name code')
      .populate('performedBy', 'firstName lastName');
    
    res.status(201).json({
      success: true,
      message: 'Stock transferred successfully',
      data: populatedMovement
    });
  } catch (error) {
    next(error);
  }
};

// Export stock movements
export const exportStockMovements = async (req, res, next) => {
  try {
    const { format = 'csv', filters = {} } = req.query;
    
    // Build query based on filters
    const query = {};
    
    if (filters.type) query.type = filters.type;
    if (filters.reason) query.reason = filters.reason;
    if (filters.product) query.product = filters.product;
    
    if (filters.startDate && filters.endDate) {
      query.movementDate = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate)
      };
    } else if (filters.startDate) {
      query.movementDate = { $gte: new Date(filters.startDate) };
    } else if (filters.endDate) {
      query.movementDate = { $lte: new Date(filters.endDate) };
    }
    
    const movements = await StockMovement.find(query)
      .populate('product', 'name sku')
      .populate('location.from', 'name code')
      .populate('location.to', 'name code')
      .populate('performedBy', 'firstName lastName')
      .sort({ movementDate: -1 });
    
    // Format data for export
    const exportData = movements.map(movement => ({
      date: movement.movementDate.toISOString().split('T')[0],
      time: movement.movementDate.toISOString().split('T')[1].substring(0, 8),
      type: movement.type.toUpperCase(),
      reason: movement.reason.replace('_', ' '),
      product: typeof movement.product === 'object' ? movement.product.name : 'Unknown Product',
      sku: typeof movement.product === 'object' ? movement.product.sku : '',
      quantity: movement.quantity,
      previousStock: movement.previousStock,
      newStock: movement.newStock,
      fromLocation: movement.location.from ? typeof movement.location.from === 'object' ? movement.location.from.name : 'Unknown' : '',
      toLocation: movement.location.to ? typeof movement.location.to === 'object' ? movement.location.to.name : 'Unknown' : '',
      performedBy: movement.performedBy 
        ? `${movement.performedBy.firstName} ${movement.performedBy.lastName}`
        : '',
      notes: movement.notes || ''
    }));
    
    // Log activity
    await logActivity(req.user._id, 'export', 'stock_movement', null, 
      `Exported ${exportData.length} stock movements in ${format.toUpperCase()} format`);
    
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

// Export locations
export const exportLocations = async (req, res, next) => {
  try {
    const { format = 'csv', filters = {} } = req.query;
    
    // Build query based on filters
    const query = {};
    
    if (filters.type) query.type = filters.type;
    if (filters.active !== undefined) query.isActive = filters.active === 'true';
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { code: { $regex: filters.search, $options: 'i' } }
      ];
    }
    
    const locations = await Location.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ name: 1 });
    
    // Format data for export
    const exportData = locations.map(location => ({
      name: location.name,
      code: location.code,
      type: location.type,
      address: location.address 
        ? `${location.address.street}, ${location.address.city}, ${location.address.state} ${location.address.zipCode}, ${location.address.country}`
        : '',
      contactPerson: location.contactPerson?.name || '',
      contactPhone: location.contactPerson?.phone || '',
      contactEmail: location.contactPerson?.email || '',
      capacity: location.capacity || '',
      currentUtilization: location.currentUtilization || 0,
      utilizationPercentage: location.capacity 
        ? Math.round((location.currentUtilization / location.capacity) * 100) 
        : '',
      isActive: location.isActive ? 'Active' : 'Inactive',
      notes: location.notes || '',
      createdAt: location.createdAt.toISOString().split('T')[0],
      createdBy: location.createdBy 
        ? `${location.createdBy.firstName} ${location.createdBy.lastName}`
        : ''
    }));
    
    // Log activity
    await logActivity(req.user._id, 'export', 'location', null, 
      `Exported ${exportData.length} locations in ${format.toUpperCase()} format`);
    
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