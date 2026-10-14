const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const validation = require('../../validations/timesheet.validation');
const { timesheetController } = require('../../controllers');

const router = express.Router();
router.get('/quick-stats', auth({ group: 'timeHub', module: 'attendance' }), validate(validation.quickStats), timesheetController.getQuickStats);
router.get('/stats', auth({ group: 'timeHub', module: 'attendance' }), validate(validation.stats), timesheetController.getStats);
router.get('/day', auth({ group: 'timeHub', module: 'attendance' }), validate(validation.day), timesheetController.getDay);
router.get('/week', auth({ group: 'timeHub', module: 'attendance' }), validate(validation.week), timesheetController.getWeek);
router.get('/employee/:employeeId/date/:date', auth('manageAttendance'), validate(validation.dateDetail), timesheetController.getDateDetail);
module.exports = router;
