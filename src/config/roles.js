const allRoles = {
  employee: [],
  hr_manager: [],
  team_lead: [],
  agent: [],
  admin: ['getUsers', 'manageUsers'],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
};
