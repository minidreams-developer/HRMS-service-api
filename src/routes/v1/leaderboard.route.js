const express = require('express');
const validate = require('../../middlewares/validate');
const { leaderboardValidation } = require('../../validations');
const leaderboardController = require('../../controllers/leaderboard.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

router
  .route('/')
  .post(auth('manageAttendance'), validate(leaderboardValidation.createLeaderboard), leaderboardController.createLeaderboard)
  .get(auth({ group: 'timeHub', module: 'leaderboard' }), leaderboardController.getLeaderboards);

router
  .route('/user/:userId')
  .get(auth({ group: 'timeHub', module: 'leaderboard' }), validate(leaderboardValidation.getLeaderboardByUser), leaderboardController.getLeaderboardByUser);

router
  .route('/:leaderboardId')
  .get(auth({ group: 'timeHub', module: 'leaderboard' }), validate(leaderboardValidation.getLeaderboard),       leaderboardController.getLeaderboard)
  .patch(auth('manageAttendance'), validate(leaderboardValidation.updateLeaderboard),  leaderboardController.updateLeaderboard)
  .delete(auth('manageAttendance'), validate(leaderboardValidation.deleteLeaderboard), leaderboardController.deleteLeaderboard);

module.exports = router;
