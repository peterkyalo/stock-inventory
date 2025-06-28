import mongoose from 'mongoose';

const productVariantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Variant name is required'],
    trim: true
  },
  value: {
    type: String,
    required: [true, 'Variant value is required'],
    trim: true
  },
  additionalPrice: {
    type: Number,
    default: 0,
    min: [0, 'Additional price cannot be negative']
  }
});

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    trim: true,
    uppercase: true,
    unique: true,
    index: true
  },
  barcode: {
    type: String,
    trim: true,
    unique: true,
    sparse: true, // Allows null values but ensures uniqueness when present
    index: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required'],
    index: true
  },
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true,
    maxlength: [50, 'Brand name cannot exceed 50 characters'],
    index: true
  },
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    enum: {
      values: ['pcs', 'kg', 'gm', 'ltr', 'ml', 'mtr', 'cm', 'box', 'pack', 'dozen', 'pair', 'set'],
      message: 'Invalid unit type'
    }
  },
  costPrice: {
    type: Number,
    required: [true, 'Cost price is required'],
    min: [0, 'Cost price cannot be negative']
  },
  sellingPrice: {
    type: Number,
    required: [true, 'Selling price is required'],
    min: [0, 'Selling price cannot be negative']
  },
  minimumStock: {
    type: Number,
    default: 10,
    min: [0, 'Minimum stock cannot be negative']
  },
  currentStock: {
    type: Number,
    default: 0,
    min: [0, 'Current stock cannot be negative']
  },
  stockLocations: [{
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: true
    },
    quantity: {
      type: Number,
      default: 0,
      min: [0, 'Quantity cannot be negative']
    }
  }],
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: String,
    isPrimary: {
      type: Boolean,
      default: false
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  variants: [productVariantSchema],
  specifications: {
    weight: {
      value: Number,
      unit: {
        type: String,
        enum: ['kg', 'gm', 'lbs', 'oz']
      }
    },
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: {
        type: String,
        enum: ['cm', 'mm', 'inch', 'ft'],
        default: 'cm'
      }
    },
    color: String,
    material: String,
    size: String,
    model: String,
    warranty: {
      period: Number,
      unit: {
        type: String,
        enum: ['days', 'months', 'years'],
        default: 'months'
      }
    }
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  tax: {
    type: Number,
    default: 0,
    min: [0, 'Tax cannot be negative'],
    max: [100, 'Tax cannot exceed 100%']
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isPerishable: {
    type: Boolean,
    default: false
  },
  expiryDate: {
    type: Date,
    validate: {
      validator: function(value) {
        return !this.isPerishable || value != null;
      },
      message: 'Expiry date is required for perishable products'
    }
  },
  manufacturingDate: {
    type: Date
  },
  batchNumber: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  notes: {
    type: String,
    maxlength: [200, 'Notes cannot exceed 200 characters']
  },
  lastStockUpdate: {
    type: Date,
    default: Date.now
  },
  totalSold: {
    type: Number,
    default: 0,
    min: [0, 'Total sold cannot be negative']
  },
  totalPurchased: {
    type: Number,
    default: 0,
    min: [0, 'Total purchased cannot be negative']
  },
  averageRating: {
    type: Number,
    min: [0, 'Rating cannot be negative'],
    max: [5, 'Rating cannot exceed 5']
  },
  reviewCount: {
    type: Number,
    default: 0,
    min: [0, 'Review count cannot be negative']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for better query performance
productSchema.index({ category: 1, brand: 1 });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ brand: 1, isActive: 1 });
productSchema.index({ name: 'text', description: 'text', brand: 'text' });
productSchema.index({ currentStock: 1, minimumStock: 1 });
productSchema.index({ tags: 1 });
productSchema.index({ createdAt: -1 });

// Virtual for profit margin
productSchema.virtual('profitMargin').get(function() {
  if (this.costPrice === 0) return 0;
  return ((this.sellingPrice - this.costPrice) / this.costPrice * 100).toFixed(2);
});

// Virtual for profit amount
productSchema.virtual('profitAmount').get(function() {
  return this.sellingPrice - this.costPrice;
});

// Virtual for stock status
productSchema.virtual('stockStatus').get(function() {
  if (this.currentStock === 0) return 'out_of_stock';
  if (this.currentStock <= this.minimumStock) return 'low_stock';
  return 'in_stock';
});

// Virtual for stock value
productSchema.virtual('stockValue').get(function() {
  return this.currentStock * this.costPrice;
});

// Virtual for primary image
productSchema.virtual('primaryImage').get(function() {
  const primary = this.images.find(img => img.isPrimary);
  return primary || this.images[0] || null;
});

// Virtual for variant count
productSchema.virtual('variantCount').get(function() {
  return this.variants.length;
});

// Pre-save middleware to update lastStockUpdate
productSchema.pre('save', function(next) {
  if (this.isModified('currentStock') || this.isModified('stockLocations')) {
    this.lastStockUpdate = new Date();
  }
  
  // Ensure only one primary image
  if (this.isModified('images')) {
    const primaryImages = this.images.filter(img => img.isPrimary);
    if (primaryImages.length > 1) {
      this.images.forEach((img, index) => {
        img.isPrimary = index === 0;
      });
    } else if (primaryImages.length === 0 && this.images.length > 0) {
      this.images[0].isPrimary = true;
    }
  }
  
  // Validate selling price is greater than cost price
  if (this.sellingPrice < this.costPrice) {
    return next(new Error('Selling price cannot be less than cost price'));
  }
  
  next();
});

// Pre-save middleware for SKU and barcode uniqueness validation
productSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('sku')) {
    const existingSKU = await this.constructor.findOne({ 
      sku: this.sku, 
      _id: { $ne: this._id } 
    });
    if (existingSKU) {
      return next(new Error('SKU already exists'));
    }
  }
  
  if (this.barcode && (this.isNew || this.isModified('barcode'))) {
    const existingBarcode = await this.constructor.findOne({ 
      barcode: this.barcode, 
      _id: { $ne: this._id } 
    });
    if (existingBarcode) {
      return next(new Error('Barcode already exists'));
    }
  }
  
  next();
});

// Static method to find products with low stock
productSchema.statics.findLowStock = function() {
  return this.find({
    $expr: { $lte: ['$currentStock', '$minimumStock'] },
    isActive: true
  }).populate('category', 'name').populate('supplier', 'name');
};

// Static method to find out of stock products
productSchema.statics.findOutOfStock = function() {
  return this.find({
    currentStock: 0,
    isActive: true
  }).populate('category', 'name').populate('supplier', 'name');
};

// Static method to find products by category
productSchema.statics.findByCategory = function(categoryId) {
  return this.find({
    category: categoryId,
    isActive: true
  }).populate('category', 'name').populate('supplier', 'name');
};

// Static method to find products by brand
productSchema.statics.findByBrand = function(brand) {
  return this.find({
    brand: new RegExp(brand, 'i'),
    isActive: true
  }).populate('category', 'name').populate('supplier', 'name');
};

// Static method to search products
productSchema.statics.searchProducts = function(searchTerm) {
  return this.find({
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { brand: { $regex: searchTerm, $options: 'i' } },
      { sku: { $regex: searchTerm, $options: 'i' } },
      { barcode: { $regex: searchTerm, $options: 'i' } },
      { tags: { $in: [new RegExp(searchTerm, 'i')] } }
    ],
    isActive: true
  }).populate('category', 'name').populate('supplier', 'name');
};

// Static method to get products with expiry alerts
productSchema.statics.getExpiryAlerts = function(days = 30) {
  const alertDate = new Date();
  alertDate.setDate(alertDate.getDate() + days);
  
  return this.find({
    isPerishable: true,
    expiryDate: { $lte: alertDate },
    currentStock: { $gt: 0 },
    isActive: true
  }).populate('category', 'name');
};

// Instance method to add variant
productSchema.methods.addVariant = function(variantData) {
  this.variants.push(variantData);
  return this.save();
};

// Instance method to remove variant
productSchema.methods.removeVariant = function(variantId) {
  this.variants.id(variantId).remove();
  return this.save();
};

// Instance method to update stock
productSchema.methods.updateStock = function(quantity, operation = 'set') {
  switch (operation) {
    case 'add':
      this.currentStock += quantity;
      break;
    case 'subtract':
      this.currentStock = Math.max(0, this.currentStock - quantity);
      break;
    case 'set':
    default:
      this.currentStock = quantity;
      break;
  }
  this.lastStockUpdate = new Date();
  return this.save();
};

// Instance method to calculate total value
productSchema.methods.getTotalValue = function() {
  return {
    costValue: this.currentStock * this.costPrice,
    sellingValue: this.currentStock * this.sellingPrice,
    profitValue: this.currentStock * (this.sellingPrice - this.costPrice)
  };
};

export default mongoose.model('Product', productSchema);