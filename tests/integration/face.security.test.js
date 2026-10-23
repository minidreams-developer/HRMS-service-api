const mongoose = require('mongoose');
const request = require('supertest');
const moment = require('moment');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { User } = require('../../src/models');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');

setupTestDB();

const auth = (user) => ({
  Authorization: `Bearer ${tokenService.generateToken(user._id, moment().add(30, 'minutes'), tokenTypes.ACCESS)}`,
});

describe('FACE-ATTENDANCE security boundary', () => {
  test('does not expose raw embedding matching publicly or present it as attendance proof', async () => {
    await request(app).post('/v1/face/embedding').send({ embedding: [0.1, 0.2] }).expect(401);

    const employee = await User.create({
      _id: new mongoose.Types.ObjectId(),
      name: 'Face Employee',
      email: `face-${Date.now()}@example.com`,
      role: 'employee',
    });

    await request(app)
      .post('/v1/face/embedding')
      .set(auth(employee))
      .send({ embedding: [0.1, 0.2] })
      .expect(501);
  });
});
