const express = require('express');
const leaderboardController = require('../../controllers/leaderboard.controller');

const router = express.Router();

router
  .route('/')
  .post(leaderboardController.createLeaderboard)
  .get(leaderboardController.getLeaderboards);

router
  .route('/user/:userId')
  .get(leaderboardController.getLeaderboardByUser);

router
  .route('/:leaderboardId')
  .get(leaderboardController.getLeaderboard)
  .patch(leaderboardController.updateLeaderboard)
  .delete(leaderboardController.deleteLeaderboard);

module.exports = router;
