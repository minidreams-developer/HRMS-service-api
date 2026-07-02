const express = require('express');
const contractorController = require('../../controllers/contractor.controller');
const validate = require('../../middlewares/validate');
const contractorValidation = require('../../validations/contractor.validation');

const router = express.Router();

/**
 * POST   /v1/contractors/register   — register a new contractor (full payload)
 * GET    /v1/contractors/generate-id — pre-generate a unique CTR-XXXXXX id
 * GET    /v1/contractors             — list all contractors (paginated)
 * GET    /v1/contractors/:id         — get a single contractor
 * PATCH  /v1/contractors/:id         — partial update
 * DELETE /v1/contractors/:id         — remove
 */

router
  .route('/register')
  .post(validate(contractorValidation.registerContractor), contractorController.registerContractor);

router
  .route('/generate-id')
  .get(contractorController.generateContractorId);

router
  .route('/')
  .get(validate(contractorValidation.getContractors), contractorController.getContractors);

router
  .route('/:contractorId')
  .get(validate(contractorValidation.getContractor), contractorController.getContractor)
  .patch(validate(contractorValidation.updateContractor), contractorController.updateContractor)
  .delete(validate(contractorValidation.deleteContractor), contractorController.deleteContractor);

module.exports = router;
