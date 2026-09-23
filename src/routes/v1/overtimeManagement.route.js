const express = require('express');
const validate = require('../../middlewares/validate');
const overtimeController = require('../../controllers/overtimeManagement.controller');
const { overtimeManagementValidation } = require('../../validations');
const auth = require('../../middlewares/auth');

const router = express.Router();

router
  .route('/')
  .post(auth(), validate(overtimeManagementValidation.createOvertime), overtimeController.createOvertime)
  .get(auth(), validate(overtimeManagementValidation.getOvertime), overtimeController.getOvertime);

router
  .route('/employee/:employeeId')
  .get(auth(), validate(overtimeManagementValidation.getOvertimeByEmployee), overtimeController.getOvertimeByEmployee);

router
  .route('/:overtimeId')
  .get(auth(), validate(overtimeManagementValidation.getOvertimeById), overtimeController.getOvertimeById)
  .patch(auth(), validate(overtimeManagementValidation.updateOvertime), overtimeController.updateOvertime)
  .delete(auth(), validate(overtimeManagementValidation.deleteOvertime), overtimeController.deleteOvertime);

router
  .route('/:overtimeId/status')
  .patch(auth(), validate(overtimeManagementValidation.updateOvertimeStatus), overtimeController.updateOvertimeStatus);

module.exports = router;
