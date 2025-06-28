import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    maxlength: [100, 'Customer name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['individual', 'business'],
    default: 'individual'
  },
  businessName: {
    type: String,
    trim: true
  },
  address: {
    street: {
      type: String,
      required: [true, 'Street address is required']
    },
    city: {
      type: String,
      required: [true, 'City is required']
    },
    state: {
      type: String,
      required: [true, 'State is required']
    },
    zipCode: {
      type: String,
      required: [true, 'Zip code is required']
    },
    country: {
      type: String,
      required: [true, 'Country is required']
    }
  },
  billingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    sameAsAddress: {
      type: Boolean,
      default: true
    }
  },
  taxNumber: {
    type: String,
    trim: true
  },
  customerGroup: {
    type: String,
    enum: ['regular', 'vip', 'wholesale', 'retail'],
    default: 'regular'
  },
  discountPercentage: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%']
  },
  creditLimit: {
    type: Number,
    default: 0,
    min: [0, 'Credit limit cannot be negative']
  },
  currentBalance: {
    type: Number,
    default: 0
  },
  paymentTerms: {
    type: String,
    enum: ['cash', 'net_15', 'net_30', 'net_45', 'net_60'],
    default: 'cash'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastOrderDate: {
    type: Date
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  totalSalesAmount: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Create indexes
customerSchema.index({ email: 1 }, { unique: true });
customerSchema.index({ name: 'text' });
customerSchema.index({ isActive: 1, customerGroup: 1 });

// Virtual for full address
customerSchema.virtual('fullAddress').get(function() {
  const addr = this.address;
  return `${addr.street}, ${addr.city}, ${addr.state} ${addr.zipCode}, ${addr.country}`;
});

export default mongoose.model('Customer', customerSchema);