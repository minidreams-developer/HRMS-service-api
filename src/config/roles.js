const allRoles = {
  employee: [],
  hr_manager: ['manageDayOffHolidays', 'manageAttendance'],
  team_lead: [],
  agent: [],
  staff:    [],
  manager:  ['getUsers', 'manageDayOffHolidays', 'manageAttendance'],
  subAdmin: ['getUsers', 'manageUsers', 'manageDayOffHolidays', 'manageAttendance'],
  admin:    ['getUsers', 'manageUsers', 'manageDayOffHolidays', 'manageAttendance'],
  contractor:[],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
};
