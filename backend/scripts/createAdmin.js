import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@stockflow.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      
      // Update the existing admin user to ensure correct password
      existingAdmin.password = 'admin123';
      existingAdmin.role = 'admin';
      existingAdmin.isActive = true;
      await existingAdmin.save();
      console.log('Admin user updated successfully');
    } else {
      // Create new admin user
      const adminUser = await User.create({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@stockflow.com',
        password: 'admin123',
        role: 'admin',
        phone: '+1234567890',
        isActive: true
      });
      console.log('Admin user created successfully:', adminUser.email);
    }

    // Check if manager user exists
    const existingManager = await User.findOne({ email: 'manager@stockflow.com' });
    
    if (!existingManager) {
      // Create manager user
      const managerUser = await User.create({
        firstName: 'Manager',
        lastName: 'User',
        email: 'manager@stockflow.com',
        password: 'manager123',
        role: 'manager',
        phone: '+1234567891',
        isActive: true
      });
      console.log('Manager user created successfully:', managerUser.email);
    } else {
      // Update existing manager user
      existingManager.password = 'manager123';
      existingManager.role = 'manager';
      existingManager.isActive = true;
      await existingManager.save();
      console.log('Manager user updated successfully');
    }

    console.log('\nDemo users ready:');
    console.log('Admin: admin@stockflow.com / admin123');
    console.log('Manager: manager@stockflow.com / manager123');

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

createAdminUser();