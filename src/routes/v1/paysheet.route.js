const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const paysheetValidation = require('../../validations/paysheet.validation');
const { paysheetController } = require('../../controllers');

const router = express.Router();

/**
 * Paysheet Routes
 *
 * ── Dashboard (Screen 1) ──────────────────────────────────────────────────
 * GET  /v1/paysheets/dashboard          - Full dashboard (quick stats + charts)
 * GET  /v1/paysheets/quick-stats        - Quick stats cards only
 * GET  /v1/paysheets/payroll-overview   - Yearly chart data (This Year)
 * GET  /v1/paysheets/payroll-breakdown  - Category breakdown (This Month)
 * POST /v1/paysheets/generate           - Generate / cache paysheet for a month
 * POST /v1/paysheets/refresh            - Force recompute cached paysheet
 *
 * ── Payroll List Table (Screen 2) ────────────────────────────────────────
 * GET  /v1/paysheets/list               - Paginated payroll rows with filters
 * GET  /v1/paysheets/:payrollId/detail  - Single row full detail
 * PATCH /v1/paysheets/:payrollId/status - Update payroll status (paid/pending/cancelled)
 */

// Dashboard routes
router
  .route('/dashboard')
  .get(auth({ group: 'payHub', module: 'paysheet' }), validate(paysheetValidation.getDashboard), paysheetController.getDashboard);

router
  .route('/quick-stats')
  .get(auth({ group: 'payHub', module: 'paysheet' }), validate(paysheetValidation.getQuickStats), paysheetController.getQuickStats);

router
  .route('/payroll-overview')
  .get(auth({ group: 'payHub', module: 'paysheet' }), validate(paysheetValidation.getPayrollOverview), paysheetController.getPayrollOverview);

router
  .route('/payroll-breakdown')
  .get(auth({ group: 'payHub', module: 'paysheet' }), validate(paysheetValidation.getPayrollBreakdown), paysheetController.getPayrollBreakdown);

router
  .route('/attendance-overview')
  .get(auth({ group: 'payHub', module: 'paysheet' }), validate(paysheetValidation.getAttendanceOverview), paysheetController.getAttendanceOverview);

router
  .route('/generate')
  .post(auth({ group: 'payHub', module: 'paysheet' }), validate(paysheetValidation.generatePaysheet), paysheetController.generatePaysheet);

router
  .route('/refresh')
  .post(auth({ group: 'payHub', module: 'paysheet' }), validate(paysheetValidation.refreshPaysheet), paysheetController.refreshPaysheet);

// Payroll list table routes
router
  .route('/list')
  .get(auth({ group: 'payHub', module: 'paysheet' }), validate(paysheetValidation.getPayrollList), paysheetController.getPayrollList);

router
  .route('/:payrollId/detail')
  .get(auth({ group: 'payHub', module: 'paysheet' }), validate(paysheetValidation.getPayrollDetail), paysheetController.getPayrollDetail);

router
  .route('/:payrollId/status')
  .patch(auth({ group: 'payHub', module: 'paysheet' }), validate(paysheetValidation.updatePayrollStatus), paysheetController.updatePayrollStatus);

module.exports = router;
