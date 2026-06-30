// Script to drop unique indexes from MongoDB
// Run this with: node drop-indexes.js

const mongoose = require('mongoose');
require('dotenv').config();

const config = require('./src/config/config');

async function dropIndexes() {
  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Get all indexes
    const indexes = await usersCollection.indexes();
    console.log('Current indexes:', indexes);

    // Drop the problematic unique indexes
    try {
      await usersCollection.dropIndex('employeeLogin.email_1');
      console.log('Dropped index: employeeLogin.email_1');
    } catch (err) {
      console.log('Index employeeLogin.email_1 does not exist or already dropped');
    }

    try {
      await usersCollection.dropIndex('email_1');
      console.log('Dropped index: email_1');
    } catch (err) {
      console.log('Index email_1 does not exist or already dropped');
    }

    try {
      await usersCollection.dropIndex('employee.employeeId_1');
      console.log('Dropped index: employee.employeeId_1');
    } catch (err) {
      console.log('Index employee.employeeId_1 does not exist or already dropped');
    }

    // Show remaining indexes
    const remainingIndexes = await usersCollection.indexes();
    console.log('Remaining indexes:', remainingIndexes);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

dropIndexes();
