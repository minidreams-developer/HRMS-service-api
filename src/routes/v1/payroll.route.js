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
  .get(auth('manageAttendance'), validate(payrollValidation.getPayrollList), payrollController.getPayrollList)
  .post(auth('manageAttendance'), validate(payrollValidation.createPayroll), payrollController.createPayroll);

router
  .route('/stopped')
  .get(auth('manageAttendance'), validate(payrollValidation.getStoppedPayrolls), payrollController.getStoppedPayrolls);

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
  .route('/:employeeId/preview')
  .get(auth('manageAttendance'), validate(payrollValidation.getEmployeePayroll), payrollController.getEmployeePayroll);

router
  .route('/:employeeId/process')
  .post(auth('manageAttendance'), validate(payrollValidation.processPayroll), payrollController.processPayroll);

router
  .route('/:employeeId/stop')
  .post(auth('manageAttendance'), validate(payrollValidation.stopPayroll), payrollController.stopPayroll);

router
  .route('/:employeeId/resume')
  .post(auth('manageAttendance'), validate(payrollValidation.resumePayroll), payrollController.resumePayroll);

router
  .route('/:employeeId')
  .put(auth('manageAttendance'), validate(payrollValidation.upsertPayroll), payrollController.upsertPayroll);

router
  .route('/:payrollId')
  .delete(auth('manageAttendance'), validate(payrollValidation.deletePayroll), payrollController.deletePayroll);

module.exports = router;
