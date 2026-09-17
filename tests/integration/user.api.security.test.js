const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { User } = require('../../src/models');
const { userOne, admin, insertUsers } = require('../fixtures/user.fixture');
const { userOneAccessToken, adminAccessToken } = require('../fixtures/token.fixture');

setupTestDB();

const expectNoSensitiveUserFields = (body) => {
  expect(body).not.toHaveProperty('password');
  expect(body).not.toHaveProperty('firebaseToken');
};

describe('USER-API-SEC-01', () => {
  test('POST /v1/users does not expose firebaseToken', async () => {
    await insertUsers([admin]);
    const res = await request(app)
      .post('/v1/users')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'Security Test User',
        email: 'user-api-sec-post@example.com',
        password: 'password1',
        role: 'employee',
      })
      .expect(httpStatus.CREATED);

    expectNoSensitiveUserFields(res.body);
  });

  test('GET /v1/users does not expose firebaseToken', async () => {
    await User.create({ ...admin, firebaseToken: 'firebase-secret-list' });
    const res = await request(app)
      .get('/v1/users')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(httpStatus.OK);

    expectNoSensitiveUserFields(res.body.results[0]);
  });

  test('GET /v1/users/:userId does not expose firebaseToken', async () => {
    await User.create({ ...userOne, firebaseToken: 'firebase-secret-get' });
    const res = await request(app)
      .get(`/v1/users/${userOne._id}`)
      .set('Authorization', `Bearer ${userOneAccessToken}`)
      .expect(httpStatus.OK);

    expectNoSensitiveUserFields(res.body);
  });

  test('PATCH /v1/users/:userId does not expose firebaseToken', async () => {
    await User.create({ ...userOne, firebaseToken: 'firebase-secret-patch' });
    const res = await request(app)
      .patch(`/v1/users/${userOne._id}`)
      .set('Authorization', `Bearer ${userOneAccessToken}`)
      .send({ name: 'Updated Security User' })
      .expect(httpStatus.OK);

    expectNoSensitiveUserFields(res.body);
  });

  test('firebaseToken remains stored and updateable internally', async () => {
    await User.create({ ...userOne, firebaseToken: 'firebase-secret-original' });
    await User.updateOne({ _id: userOne._id }, { firebaseToken: 'firebase-secret-updated' });

    const stored = await User.findById(userOne._id).select('+firebaseToken').lean();
    expect(stored.firebaseToken).toBe('firebase-secret-updated');
  });
});
