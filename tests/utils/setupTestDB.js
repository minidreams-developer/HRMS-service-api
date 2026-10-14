const mongoose = require('mongoose');
const config = require('../../src/config/config');
const SeriesConfiguration = require('../../src/models/seriesConfiguration.model');

const setupTestDB = () => {
  beforeAll(async () => {
    await mongoose.connect(config.mongoose.url, {
      ...config.mongoose.options,
      // Fail quickly with a useful test-environment error if MongoDB is unavailable.
      serverSelectionTimeoutMS: 5000,
    });
  });

  beforeEach(async () => {
    await Promise.all(Object.values(mongoose.connection.collections).map(async (collection) => collection.deleteMany()));
    await SeriesConfiguration.create({ seriesName: 'Role Series', voucherType: 'role', prefix: 'ROLE', suffix: '', startingNo: 1, lengthOfZero: 4, currentNumber: 0, hasBeenUsed: false });
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });
};

module.exports = setupTestDB;
