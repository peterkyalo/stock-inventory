import mongoose from 'mongoose';

const salesItemSchema = new mongoose.Schema({
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

const salesSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer is required']
  },
  items: [salesItemSchema],
  status: {
    type: String,
    enum: ['draft', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'],
    default: 'draft'
  },
  saleDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
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
    enum: ['unpaid', 'partially_paid', 'paid', 'overdue'],
    default: 'unpaid'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'check', 'bank_transfer', 'credit_card', 'other']
  },
  salesPerson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
  }
}, {
  timestamps: true
});

// Create indexes
salesSchema.index({ invoiceNumber: 1 }, { unique: true });
salesSchema.index({ customer: 1, status: 1 });
salesSchema.index({ saleDate: -1 });
salesSchema.index({ status: 1, paymentStatus: 1 });

// Auto-increment invoice number
salesSchema.pre('save', async function(next) {
  if (this.isNew) {
    const lastSale = await this.constructor.findOne({}, {}, { sort: { 'createdAt': -1 } });
    const lastNumber = lastSale ? parseInt(lastSale.invoiceNumber.split('-')[1]) : 0;
    this.invoiceNumber = `INV-${(lastNumber + 1).toString().padStart(6, '0')}`;
  }
  next();
});

export default mongoose.model('Sales', salesSchema);