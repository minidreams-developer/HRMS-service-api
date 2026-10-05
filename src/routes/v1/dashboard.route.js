const express = require('express');
const validate = require('../../middlewares/validate');
const dashboardValidation = require('../../validations/dashboard.validation');
const { dashboardController } = require('../../controllers');
const auth = require('../../middlewares/auth');

const router = express.Router();

/**
 * Dashboard routes
 *
 * GET /v1/dashboard                       - Full dashboard (all sections in one call)
 * GET /v1/dashboard/quick-stats           - Quick stat cards only
 * GET /v1/dashboard/attendance-overview   - 7-day attendance bar chart
 * GET /v1/dashboard/payroll-breakdown     - Monthly payroll category breakdown
 */

router
  .route('/')
  .get(auth('manageAttendance'), validate(dashboardValidation.getDashboard), dashboardController.getDashboard);

router
  .route('/quick-stats')
  .get(auth('manageAttendance'), validate(dashboardValidation.getQuickStats), dashboardController.getQuickStats);

router
  .route('/attendance-overview')
  .get(auth('manageAttendance'), validate(dashboardValidation.getAttendanceOverview), dashboardController.getAttendanceOverview);

router
  .route('/payroll-breakdown')
  .get(auth('manageAttendance'), validate(dashboardValidation.getPayrollBreakdown), dashboardController.getPayrollBreakdown);

module.exports = router;
