import Product from '../models/Product.js';
import Category from '../models/Category.js';
import StockMovement from '../models/StockMovement.js';
import { logActivity } from '../middleware/logger.js';

// Enhanced get all products with advanced filtering
export const getProducts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const category = req.query.category || '';
    const brand = req.query.brand || '';
    const status = req.query.status || '';
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;
    const tags = req.query.tags ? req.query.tags.split(',') : [];
    const supplier = req.query.supplier || '';
    const lowStock = req.query.lowStock === 'true';
    const outOfStock = req.query.outOfStock === 'true';

    // Build query
    const query = { isActive: true };
    
    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    // Category filter
    if (category) {
      query.category = category;
    }
    
    // Brand filter
    if (brand) {
      query.brand = new RegExp(brand, 'i');
    }

    // Supplier filter
    if (supplier) {
      query.supplier = supplier;
    }
    
    // Stock status filter
    if (status === 'low_stock' || lowStock) {
      query.$expr = { $lte: ['$currentStock', '$minimumStock'] };
    } else if (status === 'out_of_stock' || outOfStock) {
      query.currentStock = 0;
    } else if (status === 'in_stock') {
      query.$expr = { $gt: ['$currentStock', '$minimumStock'] };
    }
    
    // Price range filter
    if (minPrice !== null || maxPrice !== null) {
      query.sellingPrice = {};
      if (minPrice !== null) query.sellingPrice.$gte = minPrice;
      if (maxPrice !== null) query.sellingPrice.$lte = maxPrice;
    }
    
    // Tags filter
    if (tags.length > 0) {
      query.tags = { $in: tags };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder;

    const products = await Product.find(query)
      .populate('category', 'name description')
      .populate('supplier', 'name email phone')
      .populate('stockLocations.location', 'name code')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Product.countDocuments(query);

    // Add computed fields
    const enrichedProducts = products.map(product => ({
      ...product,
      profitMargin: product.costPrice > 0 ? ((product.sellingPrice - product.costPrice) / product.costPrice * 100).toFixed(2) : 0,
      profitAmount: product.sellingPrice - product.costPrice,
      stockStatus: product.currentStock === 0 ? 'out_of_stock' : 
                   product.currentStock <= product.minimumStock ? 'low_stock' : 'in_stock',
      stockValue: product.currentStock * product.costPrice,
      primaryImage: product.images?.find(img => img.isPrimary) || product.images?.[0] || null,
      variantCount: product.variants?.length || 0,
      daysSinceCreated: Math.floor((new Date() - new Date(product.createdAt)) / (1000 * 60 * 60 * 24)),
      lastStockUpdateDays: product.lastStockUpdate 
        ? Math.floor((new Date() - new Date(product.lastStockUpdate)) / (1000 * 60 * 60 * 24))
        : null
    }));

    res.status(200).json({
      success: true,
      data: enrichedProducts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      filters: {
        search,
        category,
        brand,
        supplier,
        status,
        minPrice,
        maxPrice,
        tags
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get product by ID with detailed information
export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category')
      .populate('supplier')
      .populate('stockLocations.location')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get recent stock movements
    const recentMovements = await StockMovement.find({ product: product._id })
      .populate('performedBy', 'firstName lastName')
      .sort({ movementDate: -1 })
      .limit(10);

    // Calculate additional metrics
    const productData = {
      ...product.toObject(),
      profitMargin: product.costPrice > 0 ? ((product.sellingPrice - product.costPrice) / product.costPrice * 100).toFixed(2) : 0,
      profitAmount: product.sellingPrice - product.costPrice,
      stockStatus: product.currentStock === 0 ? 'out_of_stock' : 
                   product.currentStock <= product.minimumStock ? 'low_stock' : 'in_stock',
      stockValue: product.currentStock * product.costPrice,
      totalValue: {
        costValue: product.currentStock * product.costPrice,
        sellingValue: product.currentStock * product.sellingPrice,
        profitValue: product.currentStock * (product.sellingPrice - product.costPrice)
      },
      recentMovements,
      daysSinceCreated: Math.floor((new Date() - new Date(product.createdAt)) / (1000 * 60 * 60 * 24)),
      lastStockUpdateDays: product.lastStockUpdate 
        ? Math.floor((new Date() - new Date(product.lastStockUpdate)) / (1000 * 60 * 60 * 24))
        : null
    };

    res.status(200).json({
      success: true,
      data: productData
    });
  } catch (error) {
    next(error);
  }
};

// Create new product
export const createProduct = async (req, res, next) => {
  try {
    // Verify category exists
    const category = await Category.findById(req.body.category);
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if SKU already exists
    const existingSKU = await Product.findOne({ sku: req.body.sku });
    if (existingSKU) {
      return res.status(400).json({
        success: false,
        message: 'SKU already exists'
      });
    }

    // Check if barcode already exists (if provided)
    if (req.body.barcode) {
      const existingBarcode = await Product.findOne({ barcode: req.body.barcode });
      if (existingBarcode) {
        return res.status(400).json({
          success: false,
          message: 'Barcode already exists'
        });
      }
    }

    // Process uploaded images
    const images = req.files ? req.files.map((file, index) => ({
      url: `/uploads/products/${file.filename}`,
      alt: req.body.name,
      isPrimary: index === 0,
      uploadedAt: new Date()
    })) : [];

    // Process tags
    const tags = req.body.tags ? req.body.tags.split(',').map(tag => tag.trim().toLowerCase()) : [];

    // Process variants
    const variants = req.body.variants ? JSON.parse(req.body.variants) : [];

    // Process specifications
    const specifications = req.body.specifications ? JSON.parse(req.body.specifications) : {};

    const productData = {
      ...req.body,
      images,
      tags,
      variants,
      specifications,
      costPrice: parseFloat(req.body.costPrice),
      sellingPrice: parseFloat(req.body.sellingPrice),
      minimumStock: parseInt(req.body.minimumStock) || 10,
      currentStock: parseInt(req.body.currentStock) || 0,
      tax: parseFloat(req.body.tax) || 0,
      isPerishable: req.body.isPerishable === 'true',
      createdBy: req.user._id
    };

    const product = await Product.create(productData);

    // Create initial stock movement if currentStock > 0
    if (product.currentStock > 0) {
      await StockMovement.create({
        product: product._id,
        type: 'in',
        reason: 'opening_stock',
        quantity: product.currentStock,
        previousStock: 0,
        newStock: product.currentStock,
        unitCost: product.costPrice,
        totalCost: product.costPrice * product.currentStock,
        performedBy: req.user._id,
        notes: 'Initial stock entry'
      });
    }

    // Log activity
    await logActivity(req.user._id, 'create', 'product', product._id, `Created product: ${product.name}`);

    const populatedProduct = await Product.findById(product._id)
      .populate('category', 'name')
      .populate('supplier', 'name');

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: populatedProduct
    });
  } catch (error) {
    next(error);
  }
};

// Update product
export const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Verify category exists if being updated
    if (req.body.category && req.body.category !== product.category.toString()) {
      const category = await Category.findById(req.body.category);
      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Category not found'
        });
      }
    }

    // Check SKU uniqueness if being updated
    if (req.body.sku && req.body.sku !== product.sku) {
      const existingSKU = await Product.findOne({ 
        sku: req.body.sku, 
        _id: { $ne: req.params.id } 
      });
      if (existingSKU) {
        return res.status(400).json({
          success: false,
          message: 'SKU already exists'
        });
      }
    }

    // Check barcode uniqueness if being updated
    if (req.body.barcode && req.body.barcode !== product.barcode) {
      const existingBarcode = await Product.findOne({ 
        barcode: req.body.barcode, 
        _id: { $ne: req.params.id } 
      });
      if (existingBarcode) {
        return res.status(400).json({
          success: false,
          message: 'Barcode already exists'
        });
      }
    }

    const oldStock = product.currentStock;
    
    // Process new uploaded images
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file, index) => ({
        url: `/uploads/products/${file.filename}`,
        alt: req.body.name || product.name,
        isPrimary: product.images.length === 0 && index === 0,
        uploadedAt: new Date()
      }));
      req.body.images = [...(product.images || []), ...newImages];
    }

    // Process tags
    if (req.body.tags) {
      req.body.tags = req.body.tags.split(',').map(tag => tag.trim().toLowerCase());
    }

    // Process variants
    if (req.body.variants) {
      req.body.variants = JSON.parse(req.body.variants);
    }

    // Process specifications
    if (req.body.specifications) {
      req.body.specifications = JSON.parse(req.body.specifications);
    }

    // Convert numeric fields
    if (req.body.costPrice) req.body.costPrice = parseFloat(req.body.costPrice);
    if (req.body.sellingPrice) req.body.sellingPrice = parseFloat(req.body.sellingPrice);
    if (req.body.minimumStock) req.body.minimumStock = parseInt(req.body.minimumStock);
    if (req.body.currentStock) req.body.currentStock = parseInt(req.body.currentStock);
    if (req.body.tax) req.body.tax = parseFloat(req.body.tax);
    if (req.body.isPerishable) req.body.isPerishable = req.body.isPerishable === 'true';

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user._id },
      { new: true, runValidators: true }
    ).populate('category', 'name').populate('supplier', 'name');

    // Create stock movement if stock changed
    if (oldStock !== updatedProduct.currentStock) {
      const stockDiff = updatedProduct.currentStock - oldStock;
      await StockMovement.create({
        product: updatedProduct._id,
        type: stockDiff > 0 ? 'in' : 'out',
        reason: 'adjustment',
        quantity: Math.abs(stockDiff),
        previousStock: oldStock,
        newStock: updatedProduct.currentStock,
        unitCost: updatedProduct.costPrice,
        totalCost: Math.abs(stockDiff) * updatedProduct.costPrice,
        performedBy: req.user._id,
        notes: 'Stock adjustment via product update'
      });
    }

    // Log activity
    await logActivity(req.user._id, 'update', 'product', product._id, `Updated product: ${product.name}`);

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct
    });
  } catch (error) {
    next(error);
  }
};

// Delete product
export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if product has been sold or purchased
    const hasTransactions = product.totalSold > 0 || product.totalPurchased > 0;
    
    if (hasTransactions) {
      // Soft delete - just mark as inactive
      product.isActive = false;
      await product.save();
      
      await logActivity(req.user._id, 'update', 'product', product._id, 
        `Deactivated product: ${product.name} (had transactions)`);
      
      res.status(200).json({
        success: true,
        message: 'Product deactivated successfully (had transaction history)'
      });
    } else {
      // Hard delete if no transactions
      await Product.findByIdAndDelete(req.params.id);
      
      await logActivity(req.user._id, 'delete', 'product', product._id, 
        `Deleted product: ${product.name}`);
      
      res.status(200).json({
        success: true,
        message: 'Product deleted successfully'
      });
    }
  } catch (error) {
    next(error);
  }
};

// Update product stock
export const updateProductStock = async (req, res, next) => {
  try {
    const { quantity, operation = 'set', reason = 'adjustment', notes } = req.body;
    
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const oldStock = product.currentStock;
    let newStock;
    
    switch (operation) {
      case 'add':
        newStock = oldStock + quantity;
        break;
      case 'subtract':
        newStock = Math.max(0, oldStock - quantity);
        break;
      case 'set':
      default:
        newStock = quantity;
        break;
    }

    product.currentStock = newStock;
    product.lastStockUpdate = new Date();
    await product.save();
    
    // Create stock movement
    const stockDiff = newStock - oldStock;
    if (stockDiff !== 0) {
      await StockMovement.create({
        product: product._id,
        type: stockDiff > 0 ? 'in' : 'out',
        reason,
        quantity: Math.abs(stockDiff),
        previousStock: oldStock,
        newStock,
        unitCost: product.costPrice,
        totalCost: Math.abs(stockDiff) * product.costPrice,
        performedBy: req.user._id,
        notes: notes || `Manual stock ${operation}: ${quantity}`
      });
    }
    
    await logActivity(req.user._id, 'update', 'product', product._id, 
      `Updated stock for product: ${product.name} from ${oldStock} to ${newStock}`);

    res.status(200).json({
      success: true,
      message: 'Stock updated successfully',
      data: {
        previousStock: oldStock,
        currentStock: newStock,
        difference: stockDiff
      }
    });
  } catch (error) {
    next(error);
  }
};

// Bulk operations
export const bulkUpdateProducts = async (req, res, next) => {
  try {
    const { productIds, updates } = req.body;
    
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Product IDs array is required'
      });
    }

    const result = await Product.updateMany(
      { _id: { $in: productIds } },
      { ...updates, updatedBy: req.user._id },
      { runValidators: true }
    );

    // Log activity
    await logActivity(req.user._id, 'update', 'product', null, 
      `Bulk updated ${result.modifiedCount} products`);

    res.status(200).json({
      success: true,
      message: `Successfully updated ${result.modifiedCount} products`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// Bulk price update
export const bulkUpdatePrices = async (req, res, next) => {
  try {
    const { productIds, priceAdjustment } = req.body;
    const { type, value } = priceAdjustment;
    
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Product IDs array is required'
      });
    }

    const products = await Product.find({ _id: { $in: productIds } });
    
    for (const product of products) {
      const oldPrice = product.sellingPrice;
      
      if (type === 'percentage') {
        product.sellingPrice = product.sellingPrice * (1 + value / 100);
      } else {
        product.sellingPrice = product.sellingPrice + value;
      }
      
      // Ensure selling price doesn't go below cost price
      product.sellingPrice = Math.max(product.sellingPrice, product.costPrice);
      product.updatedBy = req.user._id;
      
      await product.save();
      
      await logActivity(req.user._id, 'update', 'product', product._id, 
        `Bulk price update: ${product.name} from ${oldPrice.toFixed(2)} to ${product.sellingPrice.toFixed(2)}`);
    }
    
    res.status(200).json({
      success: true,
      message: `Successfully updated prices for ${products.length} products`,
      data: { updatedCount: products.length }
    });
  } catch (error) {
    next(error);
  }
};

// Get product analytics
export const getProductAnalytics = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get stock movements for analytics
    const movements = await StockMovement.find({ product: product._id })
      .sort({ movementDate: -1 })
      .limit(50);

    const analytics = {
      totalValue: {
        costValue: product.currentStock * product.costPrice,
        sellingValue: product.currentStock * product.sellingPrice,
        profitValue: product.currentStock * (product.sellingPrice - product.costPrice)
      },
      profitMargin: product.costPrice > 0 ? ((product.sellingPrice - product.costPrice) / product.costPrice * 100).toFixed(2) : 0,
      stockStatus: product.currentStock === 0 ? 'out_of_stock' : 
                   product.currentStock <= product.minimumStock ? 'low_stock' : 'in_stock',
      totalSold: product.totalSold,
      totalPurchased: product.totalPurchased,
      averageRating: product.averageRating,
      reviewCount: product.reviewCount,
      variantCount: product.variants?.length || 0,
      imageCount: product.images?.length || 0,
      lastStockUpdate: product.lastStockUpdate,
      stockMovements: {
        total: movements.length,
        lastWeek: movements.filter(m => new Date(m.movementDate) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length,
        lastMonth: movements.filter(m => new Date(m.movementDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length
      },
      performance: {
        daysSinceCreated: Math.floor((new Date() - new Date(product.createdAt)) / (1000 * 60 * 60 * 24)),
        daysSinceLastUpdate: Math.floor((new Date() - new Date(product.updatedAt)) / (1000 * 60 * 60 * 24)),
        daysSinceLastStockUpdate: product.lastStockUpdate 
          ? Math.floor((new Date() - new Date(product.lastStockUpdate)) / (1000 * 60 * 60 * 1000))
          : null
      }
    };

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    next(error);
  }
};

// Get low stock products
export const getLowStockProducts = async (req, res, next) => {
  try {
    const products = await Product.find({
      $expr: { $lte: ['$currentStock', '$minimumStock'] },
      isActive: true
    })
    .populate('category', 'name')
    .populate('supplier', 'name')
    .sort({ currentStock: 1 });

    res.status(200).json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    next(error);
  }
};

// Get out of stock products
export const getOutOfStockProducts = async (req, res, next) => {
  try {
    const products = await Product.find({
      currentStock: 0,
      isActive: true
    })
    .populate('category', 'name')
    .populate('supplier', 'name')
    .sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    next(error);
  }
};

// Get expiry alerts
export const getExpiryAlerts = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const alertDate = new Date();
    alertDate.setDate(alertDate.getDate() + days);
    
    const products = await Product.find({
      isPerishable: true,
      expiryDate: { $lte: alertDate },
      currentStock: { $gt: 0 },
      isActive: true
    })
    .populate('category', 'name')
    .sort({ expiryDate: 1 });

    res.status(200).json({
      success: true,
      data: products,
      count: products.length,
      alertDays: days
    });
  } catch (error) {
    next(error);
  }
};

// Search products
export const searchProducts = async (req, res, next) => {
  try {
    const { q, limit = 20 } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    
    const products = await Product.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { sku: { $regex: q, $options: 'i' } },
        { brand: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { barcode: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } }
      ],
      isActive: true
    })
    .populate('category', 'name')
    .populate('supplier', 'name')
    .limit(parseInt(limit))
    .sort({ name: 1 });
    
    res.status(200).json({
      success: true,
      data: products,
      count: products.length,
      query: q
    });
  } catch (error) {
    next(error);
  }
};

// Export products
export const exportProducts = async (req, res, next) => {
  try {
    const { format = 'csv', filters = {} } = req.query;
    
    // Build query based on filters
    const query = { isActive: true };
    
    if (filters.category) query.category = filters.category;
    if (filters.brand) query.brand = new RegExp(filters.brand, 'i');
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { sku: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const products = await Product.find(query)
      .populate('category', 'name')
      .populate('supplier', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort({ name: 1 });

    // Format data for export
    const exportData = products.map(product => ({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || '',
      brand: product.brand,
      category: product.category?.name || '',
      supplier: product.supplier?.name || '',
      unit: product.unit,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      currentStock: product.currentStock,
      minimumStock: product.minimumStock,
      stockStatus: product.currentStock === 0 ? 'Out of Stock' : 
                   product.currentStock <= product.minimumStock ? 'Low Stock' : 'In Stock',
      stockValue: product.currentStock * product.costPrice,
      profitMargin: product.costPrice > 0 ? ((product.sellingPrice - product.costPrice) / product.costPrice * 100).toFixed(2) + '%' : '0%',
      tags: product.tags?.join(', ') || '',
      isPerishable: product.isPerishable ? 'Yes' : 'No',
      expiryDate: product.expiryDate ? new Date(product.expiryDate).toISOString().split('T')[0] : '',
      createdAt: product.createdAt.toISOString().split('T')[0],
      createdBy: product.createdBy ? `${product.createdBy.firstName} ${product.createdBy.lastName}` : ''
    }));

    // Log activity
    await logActivity(req.user._id, 'export', 'product', null, 
      `Exported ${exportData.length} products in ${format.toUpperCase()} format`);

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

// Duplicate product
export const duplicateProduct = async (req, res, next) => {
  try {
    const originalProduct = await Product.findById(req.params.id);
    
    if (!originalProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Create new product data
    const productData = {
      ...originalProduct.toObject(),
      _id: undefined,
      name: `${originalProduct.name} (Copy)`,
      sku: `${originalProduct.sku}-COPY-${Date.now()}`,
      barcode: undefined, // Remove barcode to avoid conflicts
      currentStock: 0, // Start with zero stock
      totalSold: 0,
      totalPurchased: 0,
      createdBy: req.user._id,
      updatedBy: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      lastStockUpdate: new Date()
    };

    const duplicatedProduct = await Product.create(productData);

    // Log activity
    await logActivity(req.user._id, 'create', 'product', duplicatedProduct._id, 
      `Duplicated product: ${originalProduct.name} -> ${duplicatedProduct.name}`);

    const populatedProduct = await Product.findById(duplicatedProduct._id)
      .populate('category', 'name')
      .populate('supplier', 'name');

    res.status(201).json({
      success: true,
      message: 'Product duplicated successfully',
      data: populatedProduct
    });
  } catch (error) {
    next(error);
  }
};