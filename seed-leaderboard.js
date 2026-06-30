// Seed 10 leaderboard entries linked to existing users
// Run: node seed-leaderboard.js

require('dotenv').config();
const mongoose = require('mongoose');
const config = require('./src/config/config');
const { User, Leaderboard } = require('./src/models');

const BADGES_POOL = [
  ['champion', 'consistent', 'early-bird', 'weekend-warrior'],
  ['consistent', 'early-bird', 'team-player'],
  ['early-bird', 'team-player', 'helpful'],
  ['consistent', 'helpful'],
  ['early-bird', 'weekend-warrior'],
  ['team-player'],
  ['consistent'],
  ['early-bird'],
  ['helpful'],
  [],
];

const LEADERBOARD_STATS = [
  { totalPoints: 980, weekPoints: 210, todayPoints: 45, streakDays: 30 },
  { totalPoints: 870, weekPoints: 185, todayPoints: 40, streakDays: 25 },
  { totalPoints: 760, weekPoints: 160, todayPoints: 35, streakDays: 21 },
  { totalPoints: 650, weekPoints: 140, todayPoints: 30, streakDays: 18 },
  { totalPoints: 540, weekPoints: 120, todayPoints: 25, streakDays: 15 },
  { totalPoints: 430, weekPoints: 100, todayPoints: 20, streakDays: 12 },
  { totalPoints: 350, weekPoints: 85,  todayPoints: 15, streakDays: 9  },
  { totalPoints: 270, weekPoints: 65,  todayPoints: 12, streakDays: 6  },
  { totalPoints: 180, weekPoints: 45,  todayPoints: 8,  streakDays: 3  },
  { totalPoints: 90,  weekPoints: 20,  todayPoints: 5,  streakDays: 1  },
];

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(config.mongoose.url, config.mongoose.options);
  console.log('Connected\n');

  // Fetch up to 10 existing users — only need _id and name
  const users = await User.find({}).limit(10).select('_id name email employeeId').lean();

  if (users.length === 0) {
    console.error('No users found. Run seed-employees.js first.');
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`Found ${users.length} existing user(s). Creating leaderboard entries...\n`);

  // Remove existing leaderboard entries for these users to avoid duplicates
  const userIds = users.map((u) => u._id);
  const deleted = await Leaderboard.deleteMany({ user: { $in: userIds } });
  if (deleted.deletedCount > 0) {
    console.log(`Removed ${deleted.deletedCount} existing leaderboard entry(ies)\n`);
  }

  const entries = users.map((user, i) => ({
    user: user._id,           // ObjectId ref to User
    ...LEADERBOARD_STATS[i],
    badges: BADGES_POOL[i],
  }));

  const created = await Leaderboard.insertMany(entries);

  console.log('=== LEADERBOARD SEEDED ===');
  created.forEach((entry, i) => {
    const user = users[i];
    const label = user.name || user.email || user._id.toString();
    console.log(
      `  ${i + 1}. ${label} — ${entry.totalPoints} pts | week: ${entry.weekPoints} | today: ${entry.todayPoints} | streak: ${entry.streakDays}d | badges: [${entry.badges.join(', ') || 'none'}]`
    );
  });

  console.log(`\n✅ ${created.length} leaderboard entries created.`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
