const request = require('supertest');
const httpStatus = require('http-status');
const moment = require('moment');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { User } = require('../../src/models');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');

setupTestDB();

const auth = (user) => ({
  Authorization: `Bearer ${tokenService.generateToken(user._id, moment().add(1, 'day'), tokenTypes.ACCESS)}`,
});

let phoneCounter = 9000000000;
const makeUser = async (role = 'employee') => User.create({
  name: 'Profile User',
  email: `profile-${role}-${Date.now()}@example.com`,
  password: 'password1',
  role,
  phone: ++phoneCounter,
  isEmailVerified: true,
});

describe('SETTINGS-02 profile and password security', () => {
  test('requires authentication and returns a safe own profile', async () => {
    await request(app).get('/v1/profile').expect(httpStatus.UNAUTHORIZED);
    const user = await makeUser('staff');
    const response = await request(app).get('/v1/profile').set(auth(user)).expect(httpStatus.OK);
    expect(response.body.user.id).toBe(String(user._id));
    expect(response.body.user.password).toBeUndefined();
    expect(response.body.user.firebaseToken).toBeUndefined();
  });

  test('updates safe fields only and never uses a supplied userId', async () => {
    const user = await makeUser();
    const other = await makeUser();
    await request(app).patch('/v1/profile').set(auth(user)).send({
      userId: other._id.toString(), name: 'Updated Profile', phone: 9000000002,
    }).expect(httpStatus.BAD_REQUEST);
    await request(app).patch('/v1/profile').set(auth(user)).send({ name: 'Updated Profile', phone: 9000000002 }).expect(httpStatus.OK);
    const stored = await User.findById(user._id);
    expect(stored.name).toBe('Updated Profile');
    expect(stored.phone).toBe(9000000002);
    expect((await User.findById(other._id)).name).toBe('Profile User');
  });

  test('rejects protected profile fields including nested work information', async () => {
    const user = await makeUser();
    await request(app).patch('/v1/profile').set(auth(user)).send({ role: 'admin' }).expect(httpStatus.BAD_REQUEST);
    await request(app).patch('/v1/profile').set(auth(user)).send({ workInformation: { branch: user._id.toString() } }).expect(httpStatus.BAD_REQUEST);
  });

  test('changes password only with correct current password and matching confirmation', async () => {
    const user = await makeUser();
    const passwordPath = '/v1/profile/password';
    await request(app).patch(passwordPath).set(auth(user)).send({ currentPassword: 'wrongpass1', newPassword: 'newpass1', confirmPassword: 'newpass1' }).expect(httpStatus.BAD_REQUEST);
    await request(app).patch(passwordPath).set(auth(user)).send({ currentPassword: 'password1', newPassword: 'newpass1', confirmPassword: 'different1' }).expect(httpStatus.BAD_REQUEST);
    await request(app).patch(passwordPath).set(auth(user)).send({ currentPassword: 'password1', newPassword: 'newpass1', confirmPassword: 'newpass1' }).expect(httpStatus.OK);
    const stored = await User.findById(user._id);
    expect(await stored.isPasswordMatch('password1')).toBe(false);
    expect(await stored.isPasswordMatch('newpass1')).toBe(true);
  });
});
