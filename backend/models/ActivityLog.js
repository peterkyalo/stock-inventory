import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    enum: [
      'create', 'read', 'update', 'delete',
      'login', 'logout', 'export', 'import',
      'approve', 'reject', 'cancel'
    ]
  },
  resource: {
    type: String,
    required: [true, 'Resource is required'],
    enum: [
      'user', 'product', 'category', 'supplier', 'customer',
      'purchase', 'sale', 'inventory', 'stock_movement',
      'location', 'settings'
    ]
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
activityLogSchema.index({ user: 1, timestamp: -1 });
activityLogSchema.index({ resource: 1, action: 1 });
activityLogSchema.index({ timestamp: -1 });

export default mongoose.model('ActivityLog', activityLogSchema);