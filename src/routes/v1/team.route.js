const express = require('express');
const teamController = require('../../controllers/team.controller');
const validate = require('../../middlewares/validate');
const { teamValidation } = require('../../validations');

const router = express.Router();

router
  .route('/')
  .post(validate(teamValidation.createTeam), teamController.createTeam)
  .get(validate(teamValidation.getTeams), teamController.getTeams);

router.route('/generate-id').get(teamController.generateTeamId);

router
  .route('/:teamId')
  .get(validate(teamValidation.getTeam), teamController.getTeam)
  .patch(validate(teamValidation.updateTeam), teamController.updateTeam)
  .delete(validate(teamValidation.deleteTeam), teamController.deleteTeam);

router
  .route('/:teamId/members')
  .post(validate(teamValidation.addMember), teamController.addMember);

module.exports = router;
