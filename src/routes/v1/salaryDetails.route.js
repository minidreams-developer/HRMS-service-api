const express = require('express');
const auth = require('../../middlewares/auth');
const salaryDetailsController = require('../../controllers/salaryDetails.controller');

const router = express.Router();

router
  .route('/')
  .post(auth('manageAttendance'), salaryDetailsController.createSalaryDetails)
  .get(auth('manageAttendance'), salaryDetailsController.getSalaryDetails);

router
  .route('/:salaryId')
  .get(auth('manageAttendance'), salaryDetailsController.getSalaryDetail)
  .patch(auth('manageAttendance'), salaryDetailsController.updateSalaryDetails)
  .delete(auth('manageAttendance'), salaryDetailsController.deleteSalaryDetails);

module.exports = router;
