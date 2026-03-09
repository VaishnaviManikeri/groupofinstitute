const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('./models/Admin');
const connectDB = require('./config/db');

dotenv.config();

// Connect to database
connectDB();

const createAdmin = async () => {
  try {
    // Check if admin already exists
    const adminExists = await Admin.findOne({ email: 'admin@college.edu' });
    
    if (adminExists) {
      console.log('Admin already exists');
      process.exit();
    }

    // Create admin
    const admin = await Admin.create({
      username: 'admin',
      email: 'admin@college.edu',
      password: 'Admin@123' // Change this to a secure password
    });

    console.log('Admin created successfully:');
    console.log('Email: admin@college.edu');
    console.log('Password: Admin@123');
    console.log('\nPlease change the password after first login!');
    
    process.exit();
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin();