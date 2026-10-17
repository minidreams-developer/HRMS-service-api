const express = require('express');
const teamController = require('../../controllers/team.controller');
const validate = require('../../middlewares/validate');
const auth = require('../../middlewares/auth');
const { teamValidation } = require('../../validations');

const router = express.Router();

router
  .route('/')
  .post(auth('manageAttendance', { group: 'peopleHub', module: 'teams', action: 'add' }), validate(teamValidation.createTeam), teamController.createTeam)
  .get(auth('manageAttendance', { group: 'peopleHub', module: 'teams', action: 'view' }), validate(teamValidation.getTeams), teamController.getTeams);

router.route('/generate-id').get(auth('manageAttendance', { group: 'peopleHub', module: 'teams', action: 'view' }), teamController.generateTeamId);

router
  .route('/:teamId')
  .get(auth('manageAttendance', { group: 'peopleHub', module: 'teams', action: 'view' }), validate(teamValidation.getTeam), teamController.getTeam)
  .patch(auth('manageAttendance', { group: 'peopleHub', module: 'teams', action: 'edit' }), validate(teamValidation.updateTeam), teamController.updateTeam)
  .delete(auth('manageAttendance', { group: 'peopleHub', module: 'teams', action: 'delete' }), validate(teamValidation.deleteTeam), teamController.deleteTeam);

router
  .route('/:teamId/members')
  .post(auth('manageAttendance'), validate(teamValidation.addMember), teamController.addMember);

router
  .route('/:teamId/members/:userId')
  .delete(auth('manageAttendance'), validate(teamValidation.removeMember), teamController.removeMember);

module.exports = router;
