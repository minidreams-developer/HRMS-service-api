const express = require('express');
const validate = require('../../middlewares/validate');
const { leaderboardValidation } = require('../../validations');
const leaderboardController = require('../../controllers/leaderboard.controller');

const router = express.Router();

router
  .route('/')
  .post(validate(leaderboardValidation.createLeaderboard), leaderboardController.createLeaderboard)
  .get(validate(leaderboardValidation.getLeaderboards),    leaderboardController.getLeaderboards);

router
  .route('/user/:userId')
  .get(validate(leaderboardValidation.getLeaderboardByUser), leaderboardController.getLeaderboardByUser);

router
  .route('/:leaderboardId')
  .get(validate(leaderboardValidation.getLeaderboard),       leaderboardController.getLeaderboard)
  .patch(validate(leaderboardValidation.updateLeaderboard),  leaderboardController.updateLeaderboard)
  .delete(validate(leaderboardValidation.deleteLeaderboard), leaderboardController.deleteLeaderboard);

module.exports = router;
