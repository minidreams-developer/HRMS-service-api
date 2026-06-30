const express = require('express');
const salaryDetailsController = require('../../controllers/salaryDetails.controller');

const router = express.Router();

router
  .route('/')
  .post(salaryDetailsController.createSalaryDetails)
  .get(salaryDetailsController.getSalaryDetails);

router
  .route('/:salaryId')
  .get(salaryDetailsController.getSalaryDetail)
  .patch(salaryDetailsController.updateSalaryDetails)
  .delete(salaryDetailsController.deleteSalaryDetails);

module.exports = router;
