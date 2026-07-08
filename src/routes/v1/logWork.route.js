const express = require('express');
const logWorkController = require('../../controllers/logWork.controller');
const validate = require('../../middlewares/validate');
const logWorkValidation = require('../../validations/logWork.validation');

const router = express.Router();

/**
 * POST   /v1/log-work                           — create a work log entry
 * GET    /v1/log-work                           — list all entries (paginated)
 * GET    /v1/log-work/contractor/:contractorId  — all entries for one contractor
 * GET    /v1/log-work/:logId                    — get single entry
 * PATCH  /v1/log-work/:logId                    — update entry
 * DELETE /v1/log-work/:logId                    — delete entry
 *
 * NOTE: /contractor/:contractorId must be declared BEFORE /:logId
 * so Express doesn't treat "contractor" as a logId param.
 */

router
  .route('/')
  .post(validate(logWorkValidation.createLogWork), logWorkController.createLogWork)
  .get(validate(logWorkValidation.getLogWorks), logWorkController.getLogWorks);

router
  .route('/contractor/:contractorId')
  .get(validate(logWorkValidation.getLogsByContractor), logWorkController.getLogsByContractor);

router
  .route('/:logId')
  .get(validate(logWorkValidation.getLogWork), logWorkController.getLogWork)
  .patch(validate(logWorkValidation.updateLogWork), logWorkController.updateLogWork)
  .delete(validate(logWorkValidation.deleteLogWork), logWorkController.deleteLogWork);

module.exports = router;
