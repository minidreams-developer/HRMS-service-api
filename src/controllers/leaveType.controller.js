const leaveTypes = [
  { id: 'casual-leave', name: 'Casual Leave' },
  { id: 'sick-leave', name: 'Sick Leave' },
  { id: 'earned-leave', name: 'Earned Leave' },
  { id: 'unpaid-leave', name: 'Unpaid Leave' },
  { id: 'maternity-leave', name: 'Maternity Leave' },
  { id: 'paternity-leave', name: 'Paternity Leave' },
  { id: 'comp-off', name: 'Comp-Off' },
  { id: 'permission', name: 'Permission' },
];

const getLeaveTypes = (req, res) => res.status(200).send(leaveTypes);

module.exports = { getLeaveTypes };
