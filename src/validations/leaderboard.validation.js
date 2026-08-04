const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createLeaderboard = {
  body: Joi.object().keys({
    user:        Joi.string().custom(objectId).required(),
    totalPoints: Joi.number().min(0).optional(),
    weekPoints:  Joi.number().min(0).optional(),
    todayPoints: Joi.number().min(0).optional(),
    badges:      Joi.array().items(Joi.string()).optional(),
    streakDays:  Joi.number().min(0).optional(),
  }),
};

const getLeaderboards = {
  query: Joi.object().keys({
    // search across linked user's name, email, employeeId
    search:  Joi.string().optional(),
    // direct user filter
    user:    Joi.string().custom(objectId).optional(),
    // pagination & sorting
    sortBy:  Joi.string().optional(),
    limit:   Joi.number().integer().min(1).optional(),
    page:    Joi.number().integer().min(1).optional(),
  }),
};

const getLeaderboard = {
  params: Joi.object().keys({
    leaderboardId: Joi.string().custom(objectId).required(),
  }),
};

const getLeaderboardByUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId).required(),
  }),
};

const updateLeaderboard = {
  params: Joi.object().keys({
    leaderboardId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      totalPoints: Joi.number().min(0),
      weekPoints:  Joi.number().min(0),
      todayPoints: Joi.number().min(0),
      badges:      Joi.array().items(Joi.string()),
      streakDays:  Joi.number().min(0),
    })
    .min(1),
};

const deleteLeaderboard = {
  params: Joi.object().keys({
    leaderboardId: Joi.string().custom(objectId).required(),
  }),
};

module.exports = {
  createLeaderboard,
  getLeaderboards,
  getLeaderboard,
  getLeaderboardByUser,
  updateLeaderboard,
  deleteLeaderboard,
};
