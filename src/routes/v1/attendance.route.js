const express = require('express');
const validate = require('../../middlewares/validate');
const attendanceValidation = require('../../validations/attendance.validation');
const { attendanceController } = require('../../controllers');
const auth = require('../../middlewares/auth');

const router = express.Router();

router
  .route('/')
  .post(validate(attendanceValidation.createAttendance), attendanceController.createAttendance)
    .get(validate(attendanceValidation.getAttendances), attendanceController.getAttendances);

router.route('/present-today').get(auth(), (req, res, next) => {
  if (req.query.role && !['employee', 'staff'].includes(req.query.role)) return res.status(400).send({ code: 400, message: 'role must be employee or staff' });
  return attendanceController.getPresentEmployeesToday(req, res, next);
});

router
  .route('/employee/:employeeId/summary')
  .get(auth(), validate(attendanceValidation.getEmployeeAttendanceSummary), attendanceController.getEmployeeAttendanceSummary);

router
  .route('/employee/:employeeId/calendar')
  .get(auth(), validate(attendanceValidation.getEmployeeAttendanceCalendar), attendanceController.getEmployeeCalendar);

router
  .route('/employee/:employeeId')
  .get(auth(), validate(attendanceValidation.getEmployeeAttendance), attendanceController.getEmployeeAttendance);

router
  .route('/:attendanceId')
  .get(validate(attendanceValidation.getAttendance), attendanceController.getAttendance)
  .patch(auth('getUsers'), validate(attendanceValidation.updateAttendance), attendanceController.updateAttendance)
  .delete(validate(attendanceValidation.deleteAttendance), attendanceController.deleteAttendance);

module.exports = router;
