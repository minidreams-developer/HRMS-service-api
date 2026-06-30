const express = require('express');
const holidayController = require('../../controllers/holiday.controller');

const router = express.Router();

router
  .route('/')
  .post(holidayController.createHoliday)
  .get(holidayController.getHolidays);

router
  .route('/:holidayId')
  .get(holidayController.getHoliday)
  .patch(holidayController.updateHoliday)
  .delete(holidayController.deleteHoliday);

router
  .route('/:holidayId/people')
  .post(holidayController.addPerson)
  .delete(holidayController.removePerson);

module.exports = router;
