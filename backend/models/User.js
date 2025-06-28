import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
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
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'staff'],
    default: 'staff'
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  profileImage: {
    type: String
  },
  permissions: [{
    type: String,
    enum: [
      'products.read', 'products.write', 'products.delete',
      'inventory.read', 'inventory.write', 'inventory.delete',
      'purchases.read', 'purchases.write', 'purchases.delete',
      'sales.read', 'sales.write', 'sales.delete',
      'users.read', 'users.write', 'users.delete',
      'reports.read', 'settings.read', 'settings.write'
    ]
  }],
  resetPasswordToken: String,
  resetPasswordExpire: Date
}, {
  timestamps: true
});

// Create unique index for email
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1, isActive: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Generate JWT token
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { 
      id: this._id, 
      role: this.role,
      permissions: this.permissions 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Match password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Get full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Set default permissions based on role
userSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('role')) {
    switch (this.role) {
      case 'admin':
        this.permissions = [
          'products.read', 'products.write', 'products.delete',
          'inventory.read', 'inventory.write', 'inventory.delete',
          'purchases.read', 'purchases.write', 'purchases.delete',
          'sales.read', 'sales.write', 'sales.delete',
          'users.read', 'users.write', 'users.delete',
          'reports.read', 'settings.read', 'settings.write'
        ];
        break;
      case 'manager':
        this.permissions = [
          'products.read', 'products.write',
          'inventory.read', 'inventory.write',
          'purchases.read', 'purchases.write',
          'sales.read', 'sales.write',
          'users.read', 'reports.read'
        ];
        break;
      case 'staff':
        this.permissions = [
          'products.read',
          'inventory.read',
          'sales.read', 'sales.write'
        ];
        break;
    }
  }
  next();
});

export default mongoose.model('User', userSchema);