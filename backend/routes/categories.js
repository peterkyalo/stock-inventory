import express from 'express';
import { body } from 'express-validator';
import { protect, authorize } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { logActivity } from '../middleware/logger.js';
import { categoryImageUpload, handleUploadError } from '../middleware/upload.js';
import Category from '../models/Category.js';

const router = express.Router();

// Enhanced validation rules
const categoryValidation = [
  body('name')
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Category name must be between 2 and 50 characters')
    .custom(async (value, { req }) => {
      const existingCategory = await Category.findOne({ 
        name: value, 
        _id: { $ne: req.params?.id } 
      });
      if (existingCategory) {
        throw new Error('Category name already exists');
      }
      return true;
    }),
  
  body('description')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  
  body('parentCategory')
    .optional()
    .isMongoId()
    .withMessage('Invalid parent category ID')
    .custom(async (value, { req }) => {
      if (value) {
        const parentCategory = await Category.findById(value);
        if (!parentCategory) {
          throw new Error('Parent category not found');
        }
        // Prevent circular reference
        if (req.params?.id && value === req.params.id) {
          throw new Error('Category cannot be its own parent');
        }
      }
      return true;
    }),
  
  body('sortOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a non-negative integer')
];

// Get all categories with hierarchy
router.get('/', protect, authorize('products.read'), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const active = req.query.active;
    const parentOnly = req.query.parentOnly === 'true';
    const withHierarchy = req.query.withHierarchy === 'true';

    // Build query
    const query = {};
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    if (active !== undefined) {
      query.isActive = active === 'true';
    }
    
    if (parentOnly) {
      query.parentCategory = null;
    }

    let categories;
    
    if (withHierarchy) {
      // Get categories with full hierarchy
      categories = await Category.aggregate([
        { $match: query },
        {
          $lookup: {
            from: 'categories',
            localField: '_id',
            foreignField: 'parentCategory',
            as: 'subcategories'
          }
        },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: 'category',
            as: 'products'
          }
        },
        {
          $addFields: {
            productCount: { $size: '$products' },
            subcategoryCount: { $size: '$subcategories' }
          }
        },
        {
          $project: {
            products: 0 // Remove products array to reduce response size
          }
        },
        { $sort: { sortOrder: 1, name: 1 } },
        { $skip: skip },
        { $limit: limit }
      ]);
    } else {
      categories = await Category.find(query)
        .populate('parentCategory', 'name')
        .populate({
          path: 'subcategories',
          select: 'name isActive',
          match: { isActive: true }
        })
        .sort({ sortOrder: 1, name: 1 })
        .skip(skip)
        .limit(limit);

      // Add product count for each category
      for (let category of categories) {
        const productCount = await category.model('Product').countDocuments({ 
          category: category._id,
          isActive: true 
        });
        category.productCount = productCount;
      }
    }

    const total = await Category.countDocuments(query);

    res.status(200).json({
      success: true,
      data: categories,
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
});

// Get category tree (hierarchical structure)
router.get('/tree', protect, authorize('products.read'), async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true })
      .populate('subcategories')
      .sort({ sortOrder: 1, name: 1 });

    // Build tree structure
    const categoryMap = new Map();
    const rootCategories = [];

    // First pass: create map of all categories
    categories.forEach(category => {
      categoryMap.set(category._id.toString(), {
        ...category.toObject(),
        children: []
      });
    });

    // Second pass: build tree structure
    categories.forEach(category => {
      const categoryObj = categoryMap.get(category._id.toString());
      
      if (category.parentCategory) {
        const parent = categoryMap.get(category.parentCategory.toString());
        if (parent) {
          parent.children.push(categoryObj);
        }
      } else {
        rootCategories.push(categoryObj);
      }
    });

    res.status(200).json({
      success: true,
      data: rootCategories
    });
  } catch (error) {
    next(error);
  }
});

// Get category by ID with full details
router.get('/:id', protect, authorize('products.read'), async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id)
      .populate('parentCategory', 'name')
      .populate('subcategories')
      .populate('createdBy', 'firstName lastName');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Get product count
    const productCount = await category.model('Product').countDocuments({ 
      category: category._id,
      isActive: true 
    });

    const categoryWithStats = {
      ...category.toObject(),
      productCount
    };

    res.status(200).json({
      success: true,
      data: categoryWithStats
    });
  } catch (error) {
    next(error);
  }
});

// Create category with image upload
router.post('/', protect, authorize('products.write'), 
  categoryImageUpload.single('image'), 
  handleUploadError,
  categoryValidation, 
  validateRequest, 
  async (req, res, next) => {
    try {
      const categoryData = {
        ...req.body,
        createdBy: req.user._id
      };

      // Add image URL if uploaded
      if (req.file) {
        categoryData.image = `/uploads/categories/${req.file.filename}`;
      }

      const category = await Category.create(categoryData);

      // Log activity
      await logActivity(req.user._id, 'create', 'category', category._id, `Created category: ${category.name}`);

      const populatedCategory = await Category.findById(category._id)
        .populate('parentCategory', 'name');

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: populatedCategory
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update category
router.put('/:id', protect, authorize('products.write'), 
  categoryImageUpload.single('image'),
  handleUploadError,
  categoryValidation, 
  validateRequest, 
  async (req, res, next) => {
    try {
      const category = await Category.findById(req.params.id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      const updateData = { ...req.body };

      // Add new image URL if uploaded
      if (req.file) {
        updateData.image = `/uploads/categories/${req.file.filename}`;
      }

      const updatedCategory = await Category.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      ).populate('parentCategory', 'name');

      // Log activity
      await logActivity(req.user._id, 'update', 'category', category._id, `Updated category: ${category.name}`);

      res.status(200).json({
        success: true,
        message: 'Category updated successfully',
        data: updatedCategory
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete category
router.delete('/:id', protect, authorize('products.delete'), async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category has products
    const Product = (await import('../models/Product.js')).default;
    const productCount = await Product.countDocuments({ category: req.params.id });
    
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category with ${productCount} existing products. Please move or delete the products first.`
      });
    }

    // Check if category has subcategories
    const subcategoryCount = await Category.countDocuments({ parentCategory: req.params.id });
    
    if (subcategoryCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category with ${subcategoryCount} subcategories. Please move or delete the subcategories first.`
      });
    }

    await Category.findByIdAndDelete(req.params.id);

    // Log activity
    await logActivity(req.user._id, 'delete', 'category', category._id, `Deleted category: ${category.name}`);

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Bulk operations
router.post('/bulk/reorder', protect, authorize('products.write'), [
  body('categories').isArray({ min: 1 }).withMessage('Categories array is required'),
  body('categories.*.id').isMongoId().withMessage('Invalid category ID'),
  body('categories.*.sortOrder').isInt({ min: 0 }).withMessage('Sort order must be non-negative')
], validateRequest, async (req, res, next) => {
  try {
    const { categories } = req.body;
    
    const bulkOps = categories.map(cat => ({
      updateOne: {
        filter: { _id: cat.id },
        update: { sortOrder: cat.sortOrder }
      }
    }));

    await Category.bulkWrite(bulkOps);

    await logActivity(req.user._id, 'update', 'category', null, 
      `Reordered ${categories.length} categories`);

    res.status(200).json({
      success: true,
      message: 'Categories reordered successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get category statistics
router.get('/:id/stats', protect, authorize('products.read'), async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const Product = (await import('../models/Product.js')).default;
    
    const stats = await Product.aggregate([
      { $match: { category: category._id, isActive: true } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalStock: { $sum: '$currentStock' },
          totalValue: { $sum: { $multiply: ['$currentStock', '$costPrice'] } },
          averagePrice: { $avg: '$sellingPrice' },
          lowStockCount: {
            $sum: {
              $cond: [{ $lte: ['$currentStock', '$minimumStock'] }, 1, 0]
            }
          },
          outOfStockCount: {
            $sum: {
              $cond: [{ $eq: ['$currentStock', 0] }, 1, 0]
            }
          }
        }
      }
    ]);

    const categoryStats = stats[0] || {
      totalProducts: 0,
      totalStock: 0,
      totalValue: 0,
      averagePrice: 0,
      lowStockCount: 0,
      outOfStockCount: 0
    };

    res.status(200).json({
      success: true,
      data: categoryStats
    });
  } catch (error) {
    next(error);
  }
});

export default router;