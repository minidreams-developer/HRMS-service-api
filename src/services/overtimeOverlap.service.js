const overlap = (a, b) => a.startTime && a.endTime && b.startTime && b.endTime
  && new Date(a.startTime) < new Date(b.endTime)
  && new Date(a.endTime) > new Date(b.startTime);
const dateKey = (value) => value ? new Date(value).toISOString().slice(0, 10) : null;

const detectOverlappingOvertime = (records) => {
  const groups = [];
  const visited = new Set();
  for (let i = 0; i < records.length; i += 1) {
    if (visited.has(i)) continue;
    const indexes = new Set([i]);
    let changed = true;
    while (changed) {
      changed = false;
      for (let j = 0; j < records.length; j += 1) {
        if ([...indexes].some((index) => overlap(records[index], records[j])) && !indexes.has(j)) {
          indexes.add(j); changed = true;
        }
      }
    }
    if (indexes.size > 1) {
      indexes.forEach((index) => visited.add(index));
      const members = [...indexes].map((index) => records[index]);
      groups.push({
        date: dateKey(members.map((record) => record.OvertimeDate).filter(Boolean).sort()[0]),
        overtimeIds: members.map((record) => String(record._id || record.id)),
        ranges: members.map((record) => ({ startTime: record.startTime, endTime: record.endTime, totalDuration: record.totalDuration || 0 })),
        overlapDetected: true,
      });
    }
  }
  const overlappingIds = new Set(groups.flatMap((group) => group.overtimeIds));
  return { groups, overlappingIds, overlappingDates: [...new Set(groups.flatMap((group) => group.ranges.map((range) => dateKey(range.startTime))))] };
};

module.exports = { detectOverlappingOvertime };
