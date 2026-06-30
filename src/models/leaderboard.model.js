const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const leaderboardSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref:"User"
  },
  totalPoints: {
    type: Number,
    default: 0,
  },
  weekPoints: {
    type: Number,
    default: 0,
  },
  todayPoints: {
    type: Number,
    default: 0,
  },
  badges:{
    type: [String],
    default: [],
  },
  streakDays: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

leaderboardSchema.plugin(toJSON);
leaderboardSchema.plugin(paginate);

const Leaderboard = mongoose.model('Leaderboard', leaderboardSchema);

module.exports = Leaderboard;
