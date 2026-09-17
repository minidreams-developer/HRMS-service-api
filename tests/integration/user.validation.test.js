const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { User } = require('../../src/models');
const { userOne, admin, insertUsers } = require('../fixtures/user.fixture');
const { userOneAccessToken, adminAccessToken } = require('../fixtures/token.fixture');

setupTestDB();

const createPayload = (password = 'password1') => ({
  name: 'Validation Test User',
  email: `validation-${Date.now()}-${Math.random()}@example.com`,
  password,
  role: 'employee',
});

describe('USER-VALIDATION-01', () => {
  describe('POST /v1/users', () => {
    test('accepts a password containing letters and numbers', async () => {
      await insertUsers([admin]);
      await request(app)
        .post('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(createPayload('password1'))
        .expect(httpStatus.CREATED);
    });

    test.each(['password', '11111111', 'passwo1'])('rejects invalid password %s', async (password) => {
      await insertUsers([admin]);
      await request(app)
        .post('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(createPayload(password))
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('PATCH /v1/users/:userId', () => {
    test('allows a non-password update without a password', async () => {
      await insertUsers([userOne]);
      await request(app)
        .patch(`/v1/users/${userOne._id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send({ name: 'Updated Name' })
        .expect(httpStatus.OK);
    });

    test('accepts a valid password update', async () => {
      await insertUsers([userOne]);
      await request(app)
        .patch(`/v1/users/${userOne._id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send({ password: 'newPassword1' })
        .expect(httpStatus.OK);
    });

    test.each(['password', '11111111', 'passwo1'])('rejects invalid password update %s', async (password) => {
      await insertUsers([userOne]);
      await request(app)
        .patch(`/v1/users/${userOne._id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send({ password })
        .expect(httpStatus.BAD_REQUEST);
    });
  });
});
