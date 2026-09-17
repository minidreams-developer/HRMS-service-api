const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { User, Team } = require('../../src/models');
const hierarchyService = require('../../src/services/hierarchy.service');
const teamService = require('../../src/services/team.service');
const { userOne, userTwo, admin, insertUsers } = require('../fixtures/user.fixture');
const { userOneAccessToken, adminAccessToken } = require('../fixtures/token.fixture');

setupTestDB();

describe('EMP-CHANGE-02 soft-delete gaps', () => {
  test('authorized manageUsers user soft deletes and records deletedBy', async () => {
    await insertUsers([userOne, admin]);

    await request(app)
      .delete(`/v1/users/${userOne._id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(httpStatus.OK);

    const deleted = await User.findById(userOne._id);
    expect(deleted.isDeleted).toBe(true);
    expect(deleted.deletedAt).toEqual(expect.any(Date));
    expect(String(deleted.deletedBy)).toBe(String(admin._id));
  });

  test('rejects DELETE without authentication', async () => {
    await insertUsers([userOne]);
    await request(app).delete(`/v1/users/${userOne._id}`).expect(httpStatus.UNAUTHORIZED);
  });

  test('rejects DELETE for a user without manageUsers', async () => {
    await insertUsers([userOne, userTwo]);
    await request(app)
      .delete(`/v1/users/${userTwo._id}`)
      .set('Authorization', `Bearer ${userOneAccessToken}`)
      .expect(httpStatus.FORBIDDEN);
  });

  test('current hierarchy contains active users and excludes deleted users', async () => {
    await insertUsers([userOne, userTwo, admin]);
    await User.updateOne({ _id: userTwo._id }, { isDeleted: true, deletedAt: new Date() });

    const result = await hierarchyService.getHierarchyByRole();
    const ids = result.levels.flatMap((level) => level.users.map((user) => user.id));
    expect(ids).toContain(userOne._id.toHexString());
    expect(ids).not.toContain(userTwo._id.toHexString());
  });

  test('historical reporting relationship still resolves', async () => {
    await insertUsers([userOne, userTwo]);
    await User.updateOne(
      { _id: userOne._id },
      { 'workInformation.reportingPerson': userTwo._id, isDeleted: true, deletedAt: new Date() },
    );

    const result = await hierarchyService.getReportingChain(userOne._id);
    expect(result.chain.map((user) => user.id)).toContain(userOne._id.toHexString());
    expect(result.chain.map((user) => user.id)).toContain(userTwo._id.toHexString());
  });

  test('allows a normal employee to be added to a team', async () => {
    await insertUsers([userOne]);
    const team = await Team.create({ teamName: 'Engineering', teamCode: 'ENG-1' });
    await expect(teamService.addMemberToTeam(team._id, userOne._id)).resolves.toBeDefined();
  });

  test('rejects a soft-deleted employee from new team assignment', async () => {
    await insertUsers([userOne]);
    await User.updateOne({ _id: userOne._id }, { isDeleted: true, deletedAt: new Date() });
    const team = await Team.create({ teamName: 'Engineering', teamCode: 'ENG-1' });

    await expect(teamService.addMemberToTeam(team._id, userOne._id))
      .rejects.toMatchObject({ statusCode: httpStatus.BAD_REQUEST });
  });

  test('does not remove an existing historical team reference', async () => {
    await insertUsers([userOne]);
    const team = await Team.create({
      teamName: 'Engineering',
      teamCode: 'ENG-1',
      teamEmployees: [userOne._id],
    });
    await User.updateOne({ _id: userOne._id }, { isDeleted: true, deletedAt: new Date() });

    const stored = await Team.findById(team._id);
    expect(stored.teamEmployees.map(String)).toContain(userOne._id.toHexString());
  });
});
