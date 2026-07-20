const express = require('express');
const authRoute = require('./auth.route');
const announcementRoute = require('./announcement.route');
const userRoute = require('./user.route');
const assetRoute = require('./asset.route');
const salaryDetailsRoute = require('./salaryDetails.route');
const leaderboardRoute = require('./leaderboard.route');
const teamRoute = require('./team.route');
const branchRoute = require('./branch.route');
const departmentRoute = require('./department.route');
const offBoardRoute = require('./offBoard.route');
const attendanceRoute = require('./attendance.route');
const shiftRoute = require('./shift.route');
const leaveRequestsRoute = require('./leaveRequests.route');
const overtimeRoute = require('./overtimeManagement.route');
const holidayRoute = require('./holiday.route');
const contractorRoute = require('./contractor.route');
const roleAccessRoute = require('./roleAccess.route');
const organizationRoute = require('./organization.route');
const payrollRoute = require('./payroll.route');
const paysheetRoute = require('./paysheet.route');
const dashboardRoute = require('./dashboard.route');
const hierarchyRoute = require('./hierarchy.route');
const docsRoute = require('./docs.route');
const config = require('../../config/config');

const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/announcements',
    route: announcementRoute,
  },
  {
    path: '/users',
    route: userRoute,
  },
  {
    path: '/assets',
    route: assetRoute,
  },
  {
    path: '/salary-details',
    route: salaryDetailsRoute,
  },
  {
    path: '/leaderboard',
    route: leaderboardRoute,
  },
  {
    path: '/teams',
    route: teamRoute,
  },
  {
    path: '/branches',
    route: branchRoute,
  },
  {
    path: '/departments',
    route: departmentRoute,
  },
  {
    path: '/off-board',
    route: offBoardRoute,
  },
  {
    path: '/attendance',
    route: attendanceRoute,
  },
  {
    path: '/shifts',
    route: shiftRoute,
  },
  {
    path: '/leave-requests',
    route: leaveRequestsRoute,
  },
  {
    path: '/overtime',
    route: overtimeRoute,
  },
  {
    path: '/holidays',
    route: holidayRoute,
  },
  {
    path: '/contractors',
    route: contractorRoute,
  },
  {
    path: '/log-work',
    route: require('./logWork.route'),
  },
  {
    path: '/roles',
    route: roleAccessRoute,
  },
  {
    path: '/organizations',
    route: organizationRoute,
  },
  {
    path: '/payroll',
    route: payrollRoute,
  },
  {
    path: '/paysheets',
    route: paysheetRoute,
  },
  {
    path: '/dashboard',
    route: dashboardRoute,
  },
  {
    path: '/hierarchy',
    route: hierarchyRoute,
  },
];

const devRoutes = [
  // routes available only in development mode
  {
    path: '/docs',
    route: docsRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

/* istanbul ignore next */
if (config.env === 'development') {
  devRoutes.forEach((route) => {
    router.use(route.path, route.route);
  });
}

module.exports = router;
