const express = require('express');
const teamController = require('../../controllers/team.controller');
const validate = require('../../middlewares/validate');
const auth = require('../../middlewares/auth');
const { teamValidation } = require('../../validations');

const router = express.Router();

router
  .route('/')
  .post(auth('manageAttendance'), validate(teamValidation.createTeam), teamController.createTeam)
  .get(auth('manageAttendance'), validate(teamValidation.getTeams), teamController.getTeams);

router.route('/generate-id').get(auth('manageAttendance'), teamController.generateTeamId);

router
  .route('/:teamId')
  .get(auth('manageAttendance'), validate(teamValidation.getTeam), teamController.getTeam)
  .patch(auth('manageAttendance'), validate(teamValidation.updateTeam), teamController.updateTeam)
  .delete(auth('manageAttendance'), validate(teamValidation.deleteTeam), teamController.deleteTeam);

router
  .route('/:teamId/members')
  .post(auth('manageAttendance'), validate(teamValidation.addMember), teamController.addMember);

module.exports = router;
