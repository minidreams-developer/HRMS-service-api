const express = require('express');
const leaveRequestsController = require('../../controllers/leaveRequests.controller');
const validate = require('../../middlewares/validate');
const leaveRequestsValidation = require('../../validations/leaveRequests.validation');

const router = express.Router();

router
  .route('/')
  .post(validate(leaveRequestsValidation.createLeaveRequest), leaveRequestsController.createLeaveRequests)
  .get(validate(leaveRequestsValidation.getLeaveRequests), leaveRequestsController.getLeaveRequests);

router
  .route('/employee/:employeeId')
  .get(validate(leaveRequestsValidation.getLeaveRequestsByEmployee), leaveRequestsController.getLeaveRequestsByEmployee);

router
  .route('/:leaveRequestId')
  .get(validate(leaveRequestsValidation.getLeaveRequestById), leaveRequestsController.getLeaveRequestsById)
  .patch(validate(leaveRequestsValidation.updateLeaveRequest), leaveRequestsController.updateLeaveRequests)
  .delete(validate(leaveRequestsValidation.deleteLeaveRequest), leaveRequestsController.deleteLeaveRequests);

router
  .route('/:leaveRequestId/status')
  .patch(validate(leaveRequestsValidation.updateLeaveStatus), leaveRequestsController.updateLeaveStatus);

module.exports = router;
