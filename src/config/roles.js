const allRoles = {
  employee: [],
  hr_manager: ['manageDayOffHolidays', 'manageAttendance', 'manageAnnouncements'],
  team_lead: [],
  agent: [],
  staff:    [],
  manager:  ['getUsers', 'manageDayOffHolidays', 'manageAttendance', 'manageAnnouncements'],
  subAdmin: ['getUsers', 'manageUsers', 'manageDayOffHolidays', 'manageAttendance', 'manageAnnouncements'],
  admin:    ['getUsers', 'manageUsers', 'manageDayOffHolidays', 'manageAttendance', 'manageAnnouncements'],
  contractor:[],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
};
