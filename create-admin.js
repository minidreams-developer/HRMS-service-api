const mongoose = require('mongoose');
const config = require('./src/config/config');
const User = require('./src/models/user.model');

const adminData = {
  name: 'Hrms Admin',
  email: 'admin@example.com',
  password: 'admin1234',
  phone: '8500000085',
  gender: 'male',
  role: 'admin',
  isEmailVerified: true,
};

const createAdmin = async () => {
  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminData.email });
    if (existingAdmin) {
      console.log('Admin user already exists with email:', adminData.email);
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create(adminData);
    console.log('Admin user created successfully!');
    console.log('Email:', admin.email);
    console.log('Role:', admin.role);
    console.log('ID:', admin._id);

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
};

createAdmin();
