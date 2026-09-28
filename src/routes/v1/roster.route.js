const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const validation = require('../../validations/roster.validation');
const controller = require('../../controllers/roster.controller');
const router = express.Router();

router.get('/', auth('manageAttendance'), validate(validation.list), controller.list);
router.post('/', auth('manageAttendance'), validate(validation.create), controller.create);
router.post('/bulk', auth('manageAttendance'), validate(validation.bulk), controller.bulk);
router.get('/day/:date', auth('manageAttendance'), validate(validation.day), controller.day);
router.get('/employee/:employeeId', auth('manageAttendance'), validate(validation.employee), controller.employee);
router.route('/:rosterId')
  .patch(auth('manageAttendance'), validate(validation.update), controller.update)
  .delete(auth('manageAttendance'), validate(validation.id), controller.remove);
module.exports = router;
