const express = require('express');
const validate = require('../../middlewares/validate');
const shiftValidation = require('../../validations/shift.validation');
const { shiftController } = require('../../controllers');
const auth = require('../../middlewares/auth');

const router = express.Router();

router
  .route('/')
  .post(auth({ group: 'timeHub', module: 'shiftManagement' }), validate(shiftValidation.createShift), shiftController.createShift)
  .get(auth({ group: 'timeHub', module: 'shiftManagement' }), validate(shiftValidation.getShifts), shiftController.getShifts);

router.route('/generate-id').get(auth({ group: 'timeHub', module: 'shiftManagement' }), shiftController.generateShiftId);

router
  .route('/:shiftId')
  .get(auth({ group: 'timeHub', module: 'shiftManagement' }), validate(shiftValidation.getShift), shiftController.getShift)
  .patch(auth({ group: 'timeHub', module: 'shiftManagement' }), validate(shiftValidation.updateShift), shiftController.updateShift)
  .delete(auth({ group: 'timeHub', module: 'shiftManagement' }), validate(shiftValidation.deleteShift), shiftController.deleteShift);

module.exports = router;
