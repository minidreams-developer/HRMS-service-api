const express = require('express');
const leaveRequestsController = require('../../controllers/leaveRequests.controller');
const validate = require('../../middlewares/validate');
const leaveRequestsValidation = require('../../validations/leaveRequests.validation');
const auth = require('../../middlewares/auth');

const router = express.Router();

router
  .route('/quick-stats')
  .get(auth(), validate({ query: require('../../validations/leaveRequests.validation').getQuickStats }), leaveRequestsController.getQuickStats);

router
  .route('/')
  .post(auth({ group: 'timeHub', module: 'leaveAttendance' }), validate(leaveRequestsValidation.createLeaveRequest), leaveRequestsController.createLeaveRequests)
  .get(auth({ group: 'timeHub', module: 'leaveAttendance' }), validate(leaveRequestsValidation.getLeaveRequests), leaveRequestsController.getLeaveRequests);

router
  .route('/employee/:employeeId')
  .get(auth(), validate(leaveRequestsValidation.getLeaveRequestsByEmployee), leaveRequestsController.getLeaveRequestsByEmployee);

router
  .route('/:leaveRequestId')
  .get(auth(), validate(leaveRequestsValidation.getLeaveRequestById), leaveRequestsController.getLeaveRequestsById)
  .patch(auth(), validate(leaveRequestsValidation.updateLeaveRequest), leaveRequestsController.updateLeaveRequests)
  .delete(auth(), validate(leaveRequestsValidation.deleteLeaveRequest), leaveRequestsController.deleteLeaveRequests);

router
  .route('/:leaveRequestId/status')
  .patch(auth(), validate(leaveRequestsValidation.updateLeaveStatus), leaveRequestsController.updateLeaveStatus);

module.exports = router;
