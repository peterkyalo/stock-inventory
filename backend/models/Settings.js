import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  company: {
    name: {
      type: String,
      required: [true, 'Company name is required']
    },
    email: {
      type: String,
      required: [true, 'Company email is required']
    },
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    logo: String,
    website: String,
    taxNumber: String
  },
  currency: {
    code: {
      type: String,
      default: 'USD'
    },
    symbol: {
      type: String,
      default: '$'
    },
    position: {
      type: String,
      enum: ['before', 'after'],
      default: 'before'
    }
  },
  tax: {
    defaultRate: {
      type: Number,
      default: 0,
      min: [0, 'Tax rate cannot be negative'],
      max: [100, 'Tax rate cannot exceed 100%']
    },
    inclusive: {
      type: Boolean,
      default: false
    },
    rates: [{
      name: String,
      rate: Number,
      isDefault: {
        type: Boolean,
        default: false
      }
    }]
  },
  inventory: {
    costingMethod: {
      type: String,
      enum: ['fifo', 'lifo', 'weighted_average'],
      default: 'fifo'
    },
    lowStockAlert: {
      type: Boolean,
      default: true
    },
    negativeStock: {
      type: Boolean,
      default: false
    },
    autoGenerateSKU: {
      type: Boolean,
      default: true
    },
    skuPrefix: {
      type: String,
      default: 'SKU'
    }
  },
  notifications: {
    email: {
      enabled: {
        type: Boolean,
        default: true
      },
      lowStock: {
        type: Boolean,
        default: true
      },
      newOrder: {
        type: Boolean,
        default: true
      },
      paymentReminder: {
        type: Boolean,
        default: true
      }
    },
    sms: {
      enabled: {
        type: Boolean,
        default: false
      },
      lowStock: {
        type: Boolean,
        default: false
      },
      newOrder: {
        type: Boolean,
        default: false
      }
    }
  },
  backup: {
    autoBackup: {
      type: Boolean,
      default: true
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly'
    },
    retentionDays: {
      type: Number,
      default: 30
    }
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

export default mongoose.model('Settings', settingsSchema);