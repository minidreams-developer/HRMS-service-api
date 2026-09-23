const express = require('express');
const validate = require('../../middlewares/validate');
const shiftValidation = require('../../validations/shift.validation');
const { shiftController } = require('../../controllers');
const auth = require('../../middlewares/auth');

const router = express.Router();

router
  .route('/')
  .post(auth(), validate(shiftValidation.createShift), shiftController.createShift)
  .get(auth(), validate(shiftValidation.getShifts), shiftController.getShifts);

router.route('/generate-id').get(auth(), shiftController.generateShiftId);

router
  .route('/:shiftId')
  .get(auth(), validate(shiftValidation.getShift), shiftController.getShift)
  .patch(auth(), validate(shiftValidation.updateShift), shiftController.updateShift)
  .delete(auth(), validate(shiftValidation.deleteShift), shiftController.deleteShift);

module.exports = router;
