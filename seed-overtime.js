// Seed 10 overtime management entries linked to existing users
// Run: node seed-overtime.js

require('dotenv').config();
const mongoose = require('mongoose');
const config = require('./src/config/config');
const { User } = require('./src/models');
const Overtime = require('./src/models/overtimeManagement.model');

// Helper: build a Date for a given days-ago offset at a specific HH:MM
function buildDate(daysAgo, hours, minutes = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

// 10 overtime records — varied dates, durations, and statuses
const buildEntries = (users) => [
  {
    employeeId:    users[0]._id,
    requestedDate: buildDate(10, 9),
    OvertimeDate:  buildDate(9,  18),
    startTime:     buildDate(9,  18),
    endTime:       buildDate(9,  21),
    totalDuration: 3,
    status: 'approved',
  },
  {
    employeeId:    users[1 % users.length]._id,
    requestedDate: buildDate(8, 10),
    OvertimeDate:  buildDate(7, 19),
    startTime:     buildDate(7, 19),
    endTime:       buildDate(7, 21, 30),
    totalDuration: 2.5,
    status: 'approved',
  },
  {
    employeeId:    users[2 % users.length]._id,
    requestedDate: buildDate(7, 11),
    OvertimeDate:  buildDate(6, 18, 30),
    startTime:     buildDate(6, 18, 30),
    endTime:       buildDate(6, 22),
    totalDuration: 3.5,
    status: 'pending',
  },
  {
    employeeId:    users[3 % users.length]._id,
    requestedDate: buildDate(6, 9),
    OvertimeDate:  buildDate(5, 19),
    startTime:     buildDate(5, 19),
    endTime:       buildDate(5, 21),
    totalDuration: 2,
    status: 'approved',
  },
  {
    employeeId:    users[4 % users.length]._id,
    requestedDate: buildDate(5, 10),
    OvertimeDate:  buildDate(4, 18),
    startTime:     buildDate(4, 18),
    endTime:       buildDate(4, 20, 30),
    totalDuration: 2.5,
    status: 'pending',
  },
  {
    employeeId:    users[5 % users.length]._id,
    requestedDate: buildDate(4, 8),
    OvertimeDate:  buildDate(3, 19),
    startTime:     buildDate(3, 19),
    endTime:       buildDate(3, 23),
    totalDuration: 4,
    status: 'approved',
  },
  {
    employeeId:    users[6 % users.length]._id,
    requestedDate: buildDate(3, 9),
    OvertimeDate:  buildDate(2, 18),
    startTime:     buildDate(2, 18),
    endTime:       buildDate(2, 20),
    totalDuration: 2,
    status: 'pending',
  },
  {
    employeeId:    users[7 % users.length]._id,
    requestedDate: buildDate(3, 11),
    OvertimeDate:  buildDate(2, 19),
    startTime:     buildDate(2, 19),
    endTime:       buildDate(2, 22),
    totalDuration: 3,
    status: 'approved',
  },
  {
    employeeId:    users[8 % users.length]._id,
    requestedDate: buildDate(2, 10),
    OvertimeDate:  buildDate(1, 18, 30),
    startTime:     buildDate(1, 18, 30),
    endTime:       buildDate(1, 21, 30),
    totalDuration: 3,
    status: 'pending',
  },
  {
    employeeId:    users[9 % users.length]._id,
    requestedDate: buildDate(1, 9),
    OvertimeDate:  buildDate(0, 18),
    startTime:     buildDate(0, 18),
    endTime:       buildDate(0, 19, 30),
    totalDuration: 1.5,
    status: 'pending',
  },
];

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(config.mongoose.url, config.mongoose.options);
  console.log('Connected\n');

  const users = await User.find({}).limit(10).select('_id name email employeeId').lean();

  if (users.length === 0) {
    console.error('No users found. Run seed-employees.js first.');
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`Found ${users.length} user(s). Creating overtime entries...\n`);

  const entries = buildEntries(users);

  // Remove existing overtime entries for these users to avoid duplicates
  const userIds = users.map((u) => u._id);
  const deleted = await Overtime.deleteMany({ employeeId: { $in: userIds } });
  if (deleted.deletedCount > 0) {
    console.log(`Removed ${deleted.deletedCount} existing overtime entry(ies)\n`);
  }

  const created = await Overtime.insertMany(entries);

  console.log('=== OVERTIME ENTRIES SEEDED ===');
  created.forEach((entry, i) => {
    const user = users[i % users.length];
    const label = user.name || user.email || user._id.toString();
    console.log(
      `  ${i + 1}. ${label} — ${entry.OvertimeDate.toDateString()} | ${entry.totalDuration}h | status: ${entry.status}`
    );
  });

  console.log(`\n✅ ${created.length} overtime entries created.`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
