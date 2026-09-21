const { Attendance } = require('../models');

const utcAttendanceDay = (value) => {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const dayKey = (value) => utcAttendanceDay(value).toISOString().slice(0, 10);

const auditAttendanceDays = async () => {
  const groups = new Map();
  let totalRecords = 0;
  let recordsWithAttendanceDay = 0;
  let legacyRecords = 0;

  const cursor = Attendance.find({}).select('_id employeeId date attendanceDay attendanceCategory loginTime logoutTime totalWorkedHours createdAt updatedAt').lean().cursor();
  for await (const record of cursor) {
    totalRecords += 1;
    if (record.attendanceDay) recordsWithAttendanceDay += 1;
    else legacyRecords += 1;
    if (!record.employeeId || !record.date) continue;
    const normalizedDay = utcAttendanceDay(record.date);
    const key = `${String(record.employeeId)}:${dayKey(normalizedDay)}`;
    if (!groups.has(key)) groups.set(key, { employeeId: record.employeeId, attendanceDay: normalizedDay, records: [] });
    groups.get(key).records.push(record);
  }

  const duplicateGroups = [...groups.values()]
    .filter((group) => group.records.length > 1)
    .map((group) => ({
      employeeId: String(group.employeeId),
      attendanceDay: dayKey(group.attendanceDay),
      records: group.records.map((record) => ({
        id: String(record._id),
        attendanceCategory: record.attendanceCategory,
        loginTime: record.loginTime,
        logoutTime: record.logoutTime,
        totalWorkedHours: record.totalWorkedHours,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      })),
    }));
  const duplicateRecordIds = new Set(duplicateGroups.flatMap((group) => group.records.map((record) => record.id)));
  const safeLegacyRecords = [...groups.values()]
    .filter((group) => group.records.length === 1 && !group.records[0].attendanceDay)
    .map((group) => ({ id: group.records[0]._id, attendanceDay: group.attendanceDay }));

  return {
    totalRecords,
    recordsWithAttendanceDay,
    legacyRecords,
    duplicateGroups,
    duplicateRecords: duplicateRecordIds.size,
    safeLegacyRecords,
    safeLegacyCount: safeLegacyRecords.length,
  };
};

const applySafeBackfill = async (audit) => {
  let backfilledCount = 0;
  let failedUpdateCount = 0;
  for (const record of audit.safeLegacyRecords) {
    try {
      const result = await Attendance.updateOne(
        { _id: record.id, attendanceDay: { $exists: false } },
        { $set: { attendanceDay: record.attendanceDay } },
      );
      if (result.modifiedCount || result.nModified) backfilledCount += 1;
    } catch (error) {
      failedUpdateCount += 1;
    }
  }
  return { backfilledCount, failedUpdateCount };
};

module.exports = { utcAttendanceDay, auditAttendanceDays, applySafeBackfill };
