#!/usr/bin/env node
const mongoose = require('mongoose');
const config = require('../src/config/config');
const { auditAttendanceDays, applySafeBackfill } = require('../src/services/attendanceDayMigration.service');

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const production = config.env === 'production';

const databaseInfo = () => {
  const parsed = new URL(config.mongoose.url);
  return `${parsed.hostname}:${parsed.port || '27017'}/${parsed.pathname.replace(/^\//, '')}`;
};

const printAudit = (audit) => {
  console.log(JSON.stringify({
    totalRecords: audit.totalRecords,
    recordsWithAttendanceDay: audit.recordsWithAttendanceDay,
    legacyRecords: audit.legacyRecords,
    duplicateGroups: audit.duplicateGroups.length,
    duplicateRecords: audit.duplicateRecords,
    safeLegacyRecords: audit.safeLegacyCount,
    duplicateDetails: audit.duplicateGroups,
  }, null, 2));
};

(async () => {
  console.log(`Attendance migration target: ${databaseInfo()}`);
  if (production && apply && !(args.has('--confirm-production') && process.env.ALLOW_ATTENDANCE_MIGRATION_PRODUCTION === 'true')) {
    throw new Error('Production apply requires --confirm-production and ALLOW_ATTENDANCE_MIGRATION_PRODUCTION=true');
  }
  await mongoose.connect(config.mongoose.url, { ...config.mongoose.options });
  const audit = await auditAttendanceDays();
  printAudit(audit);
  if (!apply) {
    console.log('Dry-run only: no records were modified. Use --apply to backfill safe unique records.');
  } else {
    const result = await applySafeBackfill(audit);
    console.log(JSON.stringify({ mode: 'apply', ...result }, null, 2));
    const verification = await auditAttendanceDays();
    console.log(JSON.stringify({ remainingMissingAttendanceDay: verification.legacyRecords, duplicateGroupsRemaining: verification.duplicateGroups.length, duplicateRecordsRemaining: verification.duplicateRecords }, null, 2));
  }
  await mongoose.disconnect();
})().catch(async (error) => {
  console.error(error.message);
  if (mongoose.connection.readyState) await mongoose.disconnect();
  process.exitCode = 1;
});
