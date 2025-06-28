import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Location name is required'],
    trim: true,
    maxlength: [50, 'Location name cannot exceed 50 characters']
  },
  code: {
    type: String,
    required: [true, 'Location code is required'],
    trim: true,
    uppercase: true,
    maxlength: [10, 'Location code cannot exceed 10 characters']
  },
  type: {
    type: String,
    enum: ['warehouse', 'store', 'outlet', 'factory', 'office'],
    required: [true, 'Location type is required']
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  contactPerson: {
    name: String,
    phone: String,
    email: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  capacity: {
    type: Number,
    min: [0, 'Capacity cannot be negative']
  },
  currentUtilization: {
    type: Number,
    default: 0,
    min: [0, 'Current utilization cannot be negative']
  },
  notes: {
    type: String,
    maxlength: [200, 'Notes cannot exceed 200 characters']
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
locationSchema.index({ name: 1 }, { unique: true });
locationSchema.index({ code: 1 }, { unique: true });
locationSchema.index({ type: 1, isActive: 1 });

export default mongoose.model('Location', locationSchema);