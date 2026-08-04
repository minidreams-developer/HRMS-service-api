const express = require('express');
const validate = require('../../middlewares/validate');
const { holidayValidation } = require('../../validations');
const holidayController = require('../../controllers/holiday.controller');

const router = express.Router();

router
  .route('/')
  .post(validate(holidayValidation.createHoliday),   holidayController.createHoliday)
  .get(validate(holidayValidation.getHolidays),      holidayController.getHolidays);

router
  .route('/:holidayId')
  .get(validate(holidayValidation.getHoliday),       holidayController.getHoliday)
  .patch(validate(holidayValidation.updateHoliday),  holidayController.updateHoliday)
  .delete(validate(holidayValidation.deleteHoliday), holidayController.deleteHoliday);

router
  .route('/:holidayId/people')
  .post(validate(holidayValidation.addPerson),    holidayController.addPerson)
  .delete(validate(holidayValidation.removePerson), holidayController.removePerson);

module.exports = router;
