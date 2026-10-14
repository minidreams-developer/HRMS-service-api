const express = require('express');
const validate = require('../../middlewares/validate');
const auth = require('../../middlewares/auth');
const payrollValidation = require('../../validations/payroll.validation');
const { payrollController } = require('../../controllers');

const router = express.Router();

/**
 * Payroll routes
 *
 * GET  /v1/payroll                        - paginated payroll list (month/year + filters)
 * POST /v1/payroll                        - create new payroll
 * GET  /v1/payroll/stopped                - get all stopped payrolls
 * GET  /v1/payroll/:employeeId/preview    - single-employee detailed breakdown
 * PUT  /v1/payroll/:employeeId            - upsert manual adjustments
 * POST /v1/payroll/:employeeId/process    - lock & snapshot payroll
 * POST /v1/payroll/:employeeId/stop       - stop payroll for employee
 * POST /v1/payroll/:employeeId/resume     - resume payroll for employee
 * DELETE /v1/payroll/:payrollId           - remove override record
 */

router
  .route('/')
  .get(auth({ group: 'payHub', module: 'payroll' }), validate(payrollValidation.getPayrollList), payrollController.getPayrollList)
  .post(auth({ group: 'payHub', module: 'payroll' }), validate(payrollValidation.createPayroll), payrollController.createPayroll);

router
  .route('/periods')
  .get(auth({ group: 'payHub', module: 'payroll' }), validate(payrollValidation.getPayrollPeriods), payrollController.getPayrollPeriods);

router
  .route('/abstract/summary')
  .get(auth({ group: 'payHub', module: 'payroll' }), validate(payrollValidation.getPayrollAbstractSummary), payrollController.getPayrollAbstractSummary);

router
  .route('/abstract/export')
  .get(auth({ group: 'payHub', module: 'payroll' }), validate(payrollValidation.getPayrollAbstractExport), payrollController.getPayrollAbstractExport);

router
  .route('/periods/:year/:month/finalize')
  .post(auth('manageAttendance'), validate(payrollValidation.finalizePayrollPeriod), payrollController.finalizePayrollPeriod);

router
  .route('/periods/finalized')
  .get(auth({ group: 'payHub', module: 'payroll' }), validate(payrollValidation.getFinalizedPayrollPeriods), payrollController.getFinalizedPayrollPeriods);

router
  .route('/periods/:year/:month/abstract')
  .get(auth({ group: 'payHub', module: 'payroll' }), validate(payrollValidation.getPayrollAbstract), payrollController.getPayrollAbstract);

router
  .route('/payslips/options')
  .get(auth('manageAttendance'), validate(payrollValidation.getPayslipOptions), payrollController.getPayslipOptions);

router
  .route('/stopped')
  .get(auth({ group: 'payHub', module: 'stopPayroll' }), validate(payrollValidation.getStoppedPayrolls), payrollController.getStoppedPayrolls);

router.route('/stop/quick-stats').get(auth({ group: 'payHub', module: 'stopPayroll' }), validate(payrollValidation.getStopPayrollDashboard), payrollController.getStopPayrollQuickStats);
router.route('/stop/list').get(auth({ group: 'payHub', module: 'stopPayroll' }), validate(payrollValidation.getStopPayrollDashboard), payrollController.getStopPayrollList);
router.route('/stop/dashboard').get(auth({ group: 'payHub', module: 'stopPayroll' }), validate(payrollValidation.getStopPayrollDashboard), payrollController.getStopPayrollDashboard);

router.route('/:employeeId/stop-detail').get(auth({ group: 'payHub', module: 'stopPayroll' }), validate(payrollValidation.getStopPayrollDetail), payrollController.getStopPayrollDetail);

router
  .route('/me')
  .get(auth(), validate(payrollValidation.getMyPayroll), payrollController.getMyPayroll);

router
  .route('/me/:payrollId')
  .get(auth(), validate(payrollValidation.getMyPayrollById), payrollController.getMyPayrollById);

router
  .route('/:payrollId/payslip')
  .get(auth(), validate(payrollValidation.getPayslip), payrollController.getPayslip);

router
  .route('/:payrollId/payslip/csv')
  .get(auth(), validate(payrollValidation.getPayslip), payrollController.getPayslipCsv);

router
  .route('/:payrollId/payslip/pdf')
  .get(auth(), validate(payrollValidation.getPayslip), payrollController.getPayslipPdf);

router
  .route('/:employeeId/preview')
  .get(auth('manageAttendance'), validate(payrollValidation.getEmployeePayroll), payrollController.getEmployeePayroll);

router
  .route('/:employeeId/process')
  .post(auth('manageAttendance'), validate(payrollValidation.processPayroll), payrollController.processPayroll);

router
  .route('/:employeeId/stop')
  .post(auth({ group: 'payHub', module: 'stopPayroll', action: 'edit' }), validate(payrollValidation.stopPayroll), payrollController.stopPayroll);

router
  .route('/:employeeId/resume')
  .post(auth({ group: 'payHub', module: 'stopPayroll', action: 'edit' }), validate(payrollValidation.resumePayroll), payrollController.resumePayroll);

router
  .route('/:employeeId')
  .put(auth('manageAttendance'), validate(payrollValidation.upsertPayroll), payrollController.upsertPayroll);

router
  .route('/:payrollId')
  .delete(auth('manageAttendance'), validate(payrollValidation.deletePayroll), payrollController.deletePayroll);

module.exports = router;
