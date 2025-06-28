import mongoose from 'mongoose';

const purchaseItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative']
  },
  totalPrice: {
    type: Number,
    required: [true, 'Total price is required'],
    min: [0, 'Total price cannot be negative']
  },
  receivedQuantity: {
    type: Number,
    default: 0,
    min: [0, 'Received quantity cannot be negative']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  },
  tax: {
    type: Number,
    default: 0,
    min: [0, 'Tax cannot be negative']
  }
});

const purchaseSchema = new mongoose.Schema({
  purchaseOrderNumber: {
    type: String,
    required: true
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: [true, 'Supplier is required']
  },
  items: [purchaseItemSchema],
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'ordered', 'partially_received', 'received', 'cancelled'],
    default: 'draft'
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
  expectedDeliveryDate: {
    type: Date
  },
  actualDeliveryDate: {
    type: Date
  },
  subtotal: {
    type: Number,
    required: [true, 'Subtotal is required'],
    min: [0, 'Subtotal cannot be negative']
  },
  totalDiscount: {
    type: Number,
    default: 0,
    min: [0, 'Total discount cannot be negative']
  },
  totalTax: {
    type: Number,
    default: 0,
    min: [0, 'Total tax cannot be negative']
  },
  shippingCost: {
    type: Number,
    default: 0,
    min: [0, 'Shipping cost cannot be negative']
  },
  grandTotal: {
    type: Number,
    required: [true, 'Grand total is required'],
    min: [0, 'Grand total cannot be negative']
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partially_paid', 'paid'],
    default: 'unpaid'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'check', 'bank_transfer', 'credit_card', 'other']
  },
  paymentTerms: {
    type: String,
    enum: ['cash', 'net_15', 'net_30', 'net_45', 'net_60'],
    default: 'net_30'
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  attachments: [{
    filename: String,
    url: String,
    type: String
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Create indexes
purchaseSchema.index({ purchaseOrderNumber: 1 }, { unique: true });
purchaseSchema.index({ supplier: 1, status: 1 });
purchaseSchema.index({ orderDate: -1 });
purchaseSchema.index({ status: 1, paymentStatus: 1 });

// Auto-increment purchase order number
purchaseSchema.pre('save', async function(next) {
  if (this.isNew) {
    const lastPurchase = await this.constructor.findOne({}, {}, { sort: { 'createdAt': -1 } });
    const lastNumber = lastPurchase ? parseInt(lastPurchase.purchaseOrderNumber.split('-')[1]) : 0;
    this.purchaseOrderNumber = `PO-${(lastNumber + 1).toString().padStart(6, '0')}`;
  }
  next();
});

export default mongoose.model('Purchase', purchaseSchema);