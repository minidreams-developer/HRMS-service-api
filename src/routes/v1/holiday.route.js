const express = require('express');
const validate = require('../../middlewares/validate');
const { holidayValidation } = require('../../validations');
const holidayController = require('../../controllers/holiday.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

router
  .route('/')
  .post(auth('manageDayOffHolidays'), validate(holidayValidation.createHoliday), holidayController.createHoliday)
  .get(auth('manageDayOffHolidays'), validate(holidayValidation.getHolidays), holidayController.getHolidays);

router.get('/me', auth(), validate(holidayValidation.getMyHolidays), holidayController.getMyHolidays);

router
  .route('/:holidayId')
  .get(auth('manageDayOffHolidays'), validate(holidayValidation.getHoliday), holidayController.getHoliday)
  .patch(auth('manageDayOffHolidays'), validate(holidayValidation.updateHoliday), holidayController.updateHoliday)
  .delete(auth('manageDayOffHolidays'), validate(holidayValidation.deleteHoliday), holidayController.deleteHoliday);

router
  .route('/:holidayId/people')
  .post(auth('manageDayOffHolidays'), validate(holidayValidation.addPerson), holidayController.addPerson)
  .delete(auth('manageDayOffHolidays'), validate(holidayValidation.removePerson), holidayController.removePerson);

module.exports = router;
