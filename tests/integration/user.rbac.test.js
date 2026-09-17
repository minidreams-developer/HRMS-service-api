const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { User } = require('../../src/models');
const { userOne, userTwo, admin, insertUsers } = require('../fixtures/user.fixture');
const { userOneAccessToken, adminAccessToken } = require('../fixtures/token.fixture');

setupTestDB();

const newUser = () => ({
  name: 'RBAC Test User',
  email: `rbac-${Date.now()}@example.com`,
  password: 'password1',
  role: 'employee',
});

describe('USER-RBAC-01', () => {
  describe('POST /v1/users', () => {
    test('no token returns 401', async () => {
      await request(app).post('/v1/users').send(newUser()).expect(httpStatus.UNAUTHORIZED);
    });

    test('employee without manageUsers returns 403', async () => {
      await insertUsers([userOne]);
      await request(app)
        .post('/v1/users')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send(newUser())
        .expect(httpStatus.FORBIDDEN);
    });

    test('admin with manageUsers succeeds', async () => {
      await insertUsers([admin]);
      await request(app)
        .post('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(newUser())
        .expect(httpStatus.CREATED);
    });
  });

  describe('GET /v1/users', () => {
    test('no token returns 401', async () => {
      await request(app).get('/v1/users').expect(httpStatus.UNAUTHORIZED);
    });

    test('employee without getUsers returns 403', async () => {
      await insertUsers([userOne]);
      await request(app)
        .get('/v1/users')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .expect(httpStatus.FORBIDDEN);
    });

    test('admin with getUsers succeeds', async () => {
      await insertUsers([admin]);
      await request(app)
        .get('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.OK);
    });
  });

  describe('GET /v1/users/:userId', () => {
    test('no token returns 401', async () => {
      await insertUsers([userOne]);
      await request(app).get(`/v1/users/${userOne._id}`).expect(httpStatus.UNAUTHORIZED);
    });

    test('employee can read own record but not another employee', async () => {
      await insertUsers([userOne, userTwo]);
      await request(app)
        .get(`/v1/users/${userOne._id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .expect(httpStatus.OK);
      await request(app)
        .get(`/v1/users/${userTwo._id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .expect(httpStatus.FORBIDDEN);
    });

    test('admin can read another employee', async () => {
      await insertUsers([userOne, admin]);
      await request(app)
        .get(`/v1/users/${userOne._id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.OK);
    });
  });

  describe('PATCH /v1/users/:userId', () => {
    test('no token returns 401', async () => {
      await insertUsers([userOne]);
      await request(app)
        .patch(`/v1/users/${userOne._id}`)
        .send({ name: 'Unauthenticated' })
        .expect(httpStatus.UNAUTHORIZED);
    });

    test('employee can update own record but not another employee', async () => {
      await insertUsers([userOne, userTwo]);
      await request(app)
        .patch(`/v1/users/${userOne._id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send({ name: 'Self Update' })
        .expect(httpStatus.OK);
      await request(app)
        .patch(`/v1/users/${userTwo._id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send({ name: 'Cross User Update' })
        .expect(httpStatus.FORBIDDEN);
    });

    test('admin can update another employee', async () => {
      await insertUsers([userOne, admin]);
      await request(app)
        .patch(`/v1/users/${userOne._id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ name: 'Admin Update' })
        .expect(httpStatus.OK);
    });
  });
});
