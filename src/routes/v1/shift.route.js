const express = require('express');
const validate = require('../../middlewares/validate');
const shiftValidation = require('../../validations/shift.validation');
const { shiftController } = require('../../controllers');

const router = express.Router();

router
  .route('/')
  .post(validate(shiftValidation.createShift), shiftController.createShift)
  .get(validate(shiftValidation.getShifts), shiftController.getShifts);

router.route('/generate-id').get(shiftController.generateShiftId);

router
  .route('/:shiftId')
  .get(validate(shiftValidation.getShift), shiftController.getShift)
  .patch(validate(shiftValidation.updateShift), shiftController.updateShift)
  .delete(validate(shiftValidation.deleteShift), shiftController.deleteShift);

module.exports = router;
