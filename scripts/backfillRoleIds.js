/* eslint-disable no-console */
const mongoose = require('mongoose');
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
const config = require('../src/config/config');
const Role = require('../src/models/roleAccess.model');
const SeriesConfiguration = require('../src/models/seriesConfiguration.model');
const { allocateNextNumber } = require('../src/services/seriesConfiguration.service');

const execute = process.argv.includes('--execute');

if (execute && process.env.NODE_ENV === 'production') {
  throw new Error('Refusing to execute Role ID backfill in production');
}

function formatId(configDoc, number) {
  return `${configDoc.prefix}${String(number).padStart(configDoc.lengthOfZero, '0')}${configDoc.suffix || ''}`;
}

function numericPart(configDoc, roleId) {
  const prefix = configDoc.prefix || '';
  const suffix = configDoc.suffix || '';
  if (!roleId.startsWith(prefix) || (suffix && !roleId.endsWith(suffix))) return null;
  const end = suffix ? roleId.length - suffix.length : roleId.length;
  const value = roleId.slice(prefix.length, end);
  return /^\d+$/.test(value) ? Number(value) : null;
}

async function run() {
  await mongoose.connect(config.mongoose.url, config.mongoose.options);

  const [allRoles, series] = await Promise.all([
    Role.find({}).sort({ createdAt: 1, _id: 1 }).lean(),
    SeriesConfiguration.findOne({ voucherType: 'role' }).lean(),
  ]);
  const validRoles = allRoles.filter((role) => typeof role.roleId === 'string' && role.roleId.trim() !== '');
  const missingRoles = allRoles.filter((role) => !(typeof role.roleId === 'string' && role.roleId.trim() !== ''));
  const roleIds = validRoles.map((role) => role.roleId);
  const duplicateRoleIds = [...new Set(roleIds.filter((id, index) => roleIds.indexOf(id) !== index))];
  const audit = {
    totalRoles: allRoles.length,
    validRoleIds: validRoles.length,
    missingRoleIds: missingRoles.length,
    nullRoleIds: allRoles.filter((r) => r.roleId === null).length,
    emptyStringRoleIds: allRoles.filter((r) => r.roleId === '').length,
    duplicateNonEmptyRoleIds: duplicateRoleIds,
    systemRolesMissingRoleId: missingRoles.filter((r) => r.isSystemRole === true).length,
    customRolesMissingRoleId: missingRoles.filter((r) => r.isSystemRole !== true).length,
  };
  if (!series) {
    console.log(JSON.stringify({ mode: execute ? 'execute' : 'dry-run', audit, series: null }, null, 2));
    throw new Error('Role Series Configuration is not configured; backfill stopped');
  }

  const matchingNumbers = roleIds.map((id) => numericPart(series, id)).filter((n) => n !== null);
  const safeCurrentNumber = Math.max(series.currentNumber == null ? series.startingNo - 1 : series.currentNumber, ...matchingNumbers);

  console.log(JSON.stringify({
    mode: execute ? 'execute' : 'dry-run',
    audit,
    series: {
      id: series._id,
      seriesName: series.seriesName,
      prefix: series.prefix,
      suffix: series.suffix || '',
      startingNo: series.startingNo,
      lengthOfZero: series.lengthOfZero,
      currentNumber: series.currentNumber,
      hasBeenUsed: series.hasBeenUsed,
      safeCurrentNumber,
    },
  }, null, 2));

  if (duplicateRoleIds.length) throw new Error(`Duplicate non-empty roleIds found: ${duplicateRoleIds.join(', ')}`);

  if (safeCurrentNumber !== series.currentNumber) {
    console.log(`Series counter is behind existing IDs; safe counter is ${safeCurrentNumber}`);
    if (execute) await SeriesConfiguration.updateOne({ _id: series._id }, { $set: { currentNumber: safeCurrentNumber } });
  }

  let next = safeCurrentNumber;
  const mappings = [];
  if (!execute) {
    for (const role of missingRoles) {
      next += 1;
      mappings.push({ _id: role._id, roleId: formatId(series, next) });
    }
  } else {
    for (const role of missingRoles) {
      const roleId = await allocateNextNumber('role');
      if (!roleId) throw new Error('Role Series Configuration disappeared during backfill');
      await Role.updateOne({ _id: role._id, $or: [{ roleId: { $exists: false } }, { roleId: null }, { roleId: '' }] }, { $set: { roleId } });
      mappings.push({ _id: role._id, roleId });
    }
  }
  const persistedSeries = await SeriesConfiguration.findById(series._id).lean();
  console.log(JSON.stringify({
    mappings,
    expectedFinalCurrentNumber: persistedSeries.currentNumber,
    persistedSeries: {
      currentNumber: persistedSeries.currentNumber,
      hasBeenUsed: persistedSeries.hasBeenUsed,
    },
  }, null, 2));
}

run().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  if (mongoose.connection.readyState) await mongoose.disconnect();
});
