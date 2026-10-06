// Explicit bridge between legacy static rights and grouped Role permissions.
module.exports = {
  getUsers: { group: 'peopleHub', module: 'employees', action: 'view' },
  manageUsers: { group: 'peopleHub', module: 'employees', actions: ['add', 'edit', 'delete'] },
  manageAttendance: { group: 'timeHub', module: 'attendance', actions: ['add', 'edit', 'delete'] },
  manageAnnouncements: { group: 'standalone', module: 'announcement', actions: ['add', 'edit', 'delete'] },
  manageDayOffHolidays: { group: 'timeHub', module: 'dayOffHolidays', actions: ['add', 'edit', 'delete'] },
};
