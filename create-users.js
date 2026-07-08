const mongoose = require('mongoose');
const config = require('./src/config/config');
const User = require('./src/models/user.model');

const users = [
  {
    name: 'Staff User',
    email: 'staff@example.com',
    password: 'Staff@123',
    role: 'staff',
    isEmailVerified: true,
    isActive: true,
  },
  {
    name: 'Manager User',
    email: 'manager@example.com',
    password: 'Manager@123',
    role: 'manager',
    isEmailVerified: true,
    isActive: true,
  },
  {
    name: 'Sub Admin User',
    email: 'subadmin@example.com',
    password: 'SubAdmin@123',
    role: 'subAdmin',
    isEmailVerified: true,
    isActive: true,
  },
];

const createUsers = async () => {
  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('Connected to MongoDB\n');

    for (const userData of users) {
      const existing = await User.findOne({ email: userData.email });
      if (existing) {
        console.log(`[SKIP]  ${userData.role} already exists  →  ${userData.email}`);
        continue;
      }
      const user = await User.create(userData);
      console.log(`[OK]    ${user.role} created`);
      console.log(`        Name     : ${user.name}`);
      console.log(`        Email    : ${user.email}`);
      console.log(`        Password : ${userData.password}`);
      console.log(`        ID       : ${user._id}\n`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

createUsers();
