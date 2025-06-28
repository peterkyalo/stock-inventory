import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required']
  },
  type: {
    type: String,
    enum: ['in', 'out', 'transfer', 'adjustment'],
    required: [true, 'Movement type is required']
  },
  reason: {
    type: String,
    enum: [
      'purchase', 'sale', 'return', 'damage', 'loss', 'theft', 
      'transfer', 'adjustment', 'opening_stock', 'manufacturing'
    ],
    required: [true, 'Movement reason is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  previousStock: {
    type: Number,
    required: [true, 'Previous stock is required'],
    min: [0, 'Previous stock cannot be negative']
  },
  newStock: {
    type: Number,
    required: [true, 'New stock is required'],
    min: [0, 'New stock cannot be negative']
  },
  unitCost: {
    type: Number,
    min: [0, 'Unit cost cannot be negative']
  },
  totalCost: {
    type: Number,
    min: [0, 'Total cost cannot be negative']
  },
  location: {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location'
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location'
    }
  },
  reference: {
    type: {
      type: String,
      enum: ['purchase', 'sale', 'transfer', 'adjustment']
    },
    id: {
      type: mongoose.Schema.Types.ObjectId
    },
    number: String
  },
  notes: {
    type: String,
    maxlength: [200, 'Notes cannot exceed 200 characters']
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  movementDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
stockMovementSchema.index({ product: 1, movementDate: -1 });
stockMovementSchema.index({ type: 1, reason: 1 });
stockMovementSchema.index({ 'reference.type': 1, 'reference.id': 1 });

export default mongoose.model('StockMovement', stockMovementSchema);