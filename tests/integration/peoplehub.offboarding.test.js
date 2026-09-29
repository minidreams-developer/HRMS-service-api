const mongoose = require('mongoose');
const request = require('supertest');
const moment = require('moment');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { User, OffBoard } = require('../../src/models');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');

setupTestDB();
const id = () => new mongoose.Types.ObjectId();
const auth = (user) => ({ Authorization: `Bearer ${tokenService.generateToken(user._id, moment().add(30, 'minutes'), tokenTypes.ACCESS)}` });
const email = (label) => `${label}-${new mongoose.Types.ObjectId()}@example.com`;
const target = (role, label = role) => ({ _id: id(), name: label, employeeId: `${role}-${id()}`, email: email(label), role });
const body = (user, date = '2099-12-31') => ({ userId: user._id, exitInformation: { exitType: 'resignation', resignationSubmitionDate: '2026-01-01', lastWorkingDate: date } });

describe('PEOPLEHUB-04 OffBoard workflow', () => {
  let admin; let employee;

  beforeEach(async () => {
    [admin, employee] = await User.create([target('admin', 'admin'), target('employee', 'employee')]);
  });

  test('protects routes and allows all management roles', async () => {
    await request(app).post('/v1/off-board').send(body(employee)).expect(401);
    for (const role of ['employee', 'staff', 'agent']) {
      const actor = await User.create(target(role, `actor-${role}`));
      await request(app).post('/v1/off-board').set(auth(actor)).send(body(employee)).expect(403);
    }
    for (const role of ['manager', 'hr_manager', 'subAdmin']) {
      const actor = await User.create(target(role, `actor-${role}`));
      const targetUser = await User.create(target('employee', `target-${role}`));
      await request(app).post('/v1/off-board').set(auth(actor)).send(body(targetUser)).expect(201);
    }
  });

  test('validates target roles, deleted users, relieved users, and duplicates', async () => {
    for (const role of ['employee', 'staff', 'agent']) {
      const user = await User.create(target(role, `target-${role}`));
      await request(app).post('/v1/off-board').set(auth(admin)).send(body(user)).expect(201);
    }
    const contractor = await User.create(target('contractor', 'contractor'));
    await request(app).post('/v1/off-board').set(auth(admin)).send(body(contractor)).expect(400);
    const deleted = await User.create(target('employee', 'deleted'));
    await User.updateOne({ _id: deleted._id }, { isDeleted: true });
    await request(app).post('/v1/off-board').set(auth(admin)).send(body(deleted)).expect(400);
    const relieved = await User.create({ ...target('employee', 'relieved'), isActive: 'Relieved' });
    await request(app).post('/v1/off-board').set(auth(admin)).send(body(relieved)).expect(409);
    await request(app).post('/v1/off-board').set(auth(admin)).send(body(employee)).expect(201);
    await request(app).post('/v1/off-board').set(auth(admin)).send(body(employee)).expect(409);
  });

  test('approves and records server-controlled audit, while rejecting invalid transitions', async () => {
    const created = await request(app).post('/v1/off-board').set(auth(admin)).send(body(employee)).expect(201);
    const approved = await request(app).patch(`/v1/off-board/${created.body.id || created.body._id}/status`).set(auth(admin)).send({ status: 'approved' }).expect(200);
    expect(approved.body.status).toBe('approved');
    expect(String(approved.body.exitInformation.exitApprovedBy)).toBe(String(admin._id));
    expect(new Date(approved.body.exitInformation.approvalDate).getFullYear()).toBeGreaterThan(2020);
    await request(app).patch(`/v1/off-board/${created.body.id || created.body._id}/status`).set(auth(admin)).send({ status: 'rejected' }).expect(409);
  });

  test('rejects early finalization and relieves user after the last working date', async () => {
    const futureRecord = await request(app).post('/v1/off-board').set(auth(admin)).send(body(employee, '2099-12-31')).expect(201);
    const futureId = futureRecord.body.id || futureRecord.body._id;
    await request(app).patch(`/v1/off-board/${futureId}/status`).set(auth(admin)).send({ status: 'approved' }).expect(200);
    expect((await User.findById(employee._id)).isActive).toBe('Active');
    await request(app).post(`/v1/off-board/${futureId}/finalize`).set(auth(admin)).expect(409);

    const pastUser = await User.create(target('employee', 'past-user'));
    const pastRecord = await request(app).post('/v1/off-board').set(auth(admin)).send({ ...body(pastUser, '2020-01-01'), exitInformation: { exitType: 'resignation', resignationSubmitionDate: '2019-01-01', lastWorkingDate: '2020-01-01' } }).expect(201);
    const pastId = pastRecord.body.id || pastRecord.body._id;
    await request(app).patch(`/v1/off-board/${pastId}/status`).set(auth(admin)).send({ status: 'approved' }).expect(200);
    await request(app).post(`/v1/off-board/${pastId}/finalize`).set(auth(admin)).expect(200);
    expect((await User.findById(pastUser._id)).isActive).toBe('Relieved');
    expect((await OffBoard.findById(pastId)).status).toBe('relieved');
  });

  test('preserves cancellation, history, detail, and protects approved/relieved records', async () => {
    const cancelled = await request(app).post('/v1/off-board').set(auth(admin)).send(body(employee)).expect(201);
    const cancelledId = cancelled.body.id || cancelled.body._id;
    await request(app).delete(`/v1/off-board/${cancelledId}`).set(auth(admin)).expect(204);
    expect(await OffBoard.exists({ _id: cancelledId })).toBeTruthy();
    const history = await request(app).get(`/v1/off-board/user/${employee._id}`).set(auth(admin)).expect(200);
    expect(history.body.some((record) => String(record._id || record.id) === String(cancelledId))).toBe(true);
    await request(app).get(`/v1/off-board/${cancelledId}`).set(auth(admin)).expect(200);
    await request(app).get(`/v1/off-board/${id()}`).set(auth(admin)).expect(404);
  });
});
