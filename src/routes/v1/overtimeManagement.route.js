const express = require('express');
const validate = require('../../middlewares/validate');
const overtimeController = require('../../controllers/overtimeManagement.controller');
const { overtimeManagementValidation } = require('../../validations');

const router = express.Router();

router
  .route('/')
  .post(validate(overtimeManagementValidation.createOvertime), overtimeController.createOvertime)
  .get(validate(overtimeManagementValidation.getOvertime), overtimeController.getOvertime);

router
  .route('/employee/:employeeId')
  .get(validate(overtimeManagementValidation.getOvertimeByEmployee), overtimeController.getOvertimeByEmployee);

router
  .route('/:overtimeId')
  .get(validate(overtimeManagementValidation.getOvertimeById), overtimeController.getOvertimeById)
  .patch(validate(overtimeManagementValidation.updateOvertime), overtimeController.updateOvertime)
  .delete(validate(overtimeManagementValidation.deleteOvertime), overtimeController.deleteOvertime);

router
  .route('/:overtimeId/status')
  .patch(validate(overtimeManagementValidation.updateOvertimeStatus), overtimeController.updateOvertimeStatus);

module.exports = router;
