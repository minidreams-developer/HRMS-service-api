const express = require('express');
const validate = require('../../middlewares/validate');
const attendanceValidation = require('../../validations/attendance.validation');
const { attendanceController } = require('../../controllers');

const router = express.Router();

router
  .route('/')
  .post(validate(attendanceValidation.createAttendance), attendanceController.createAttendance)
  .get(validate(attendanceValidation.getAttendances), attendanceController.getAttendances);

router
  .route('/:attendanceId')
  .get(validate(attendanceValidation.getAttendance), attendanceController.getAttendance)
  .patch(validate(attendanceValidation.updateAttendance), attendanceController.updateAttendance)
  .delete(validate(attendanceValidation.deleteAttendance), attendanceController.deleteAttendance);

module.exports = router;
