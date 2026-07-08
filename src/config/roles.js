const allRoles = {
  employee: [],
  hr_manager: [],
  team_lead: [],
  agent: [],
  staff:    [],
  manager:  ['getUsers'],
  subAdmin: ['getUsers', 'manageUsers'],
  admin:    ['getUsers', 'manageUsers'],
  admin: ['getUsers', 'manageUsers'],
  contractor:[],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
};
