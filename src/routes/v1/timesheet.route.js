const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const validation = require('../../validations/timesheet.validation');
const { timesheetController } = require('../../controllers');

const router = express.Router();
router.get('/stats', auth('manageAttendance'), validate(validation.stats), timesheetController.getStats);
router.get('/day', auth('manageAttendance'), validate(validation.day), timesheetController.getDay);
router.get('/week', auth('manageAttendance'), validate(validation.week), timesheetController.getWeek);
router.get('/employee/:employeeId/date/:date', auth('manageAttendance'), validate(validation.dateDetail), timesheetController.getDateDetail);
module.exports = router;
