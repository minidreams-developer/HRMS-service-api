const express = require('express');
const contractorController = require('../../controllers/contractor.controller');
const validate = require('../../middlewares/validate');
const contractorValidation = require('../../validations/contractor.validation');
const auth = require('../../middlewares/auth');

const router = express.Router();

/**
 * POST   /v1/contractors/register   — register a new contractor (full payload)
 * GET    /v1/contractors/generate-id — pre-generate a unique CTR-XXXXXX id
 * GET    /v1/contractors             — list all contractors (paginated)
 * GET    /v1/contractors/:id         — get a single contractor
 * PATCH  /v1/contractors/:id         — partial update
 * DELETE /v1/contractors/:id         — remove
 */

// validate(contractorValidation.registerContractor),
// validate(contractorValidation.getContractors), 
// validate(contractorValidation.getContractor), 
// validate(contractorValidation.updateContractor),
// validate(contractorValidation.deleteContractor), 

router
  .route('/register')
  .post(auth(), contractorController.registerContractor);

router
  .route('/generate-id')
  .get(auth(), contractorController.generateContractorId);

router
  .route('/')
  .get(auth(), validate(contractorValidation.getContractors), contractorController.getContractors);

router.get('/:contractorId/workers', auth(), contractorController.getContractorWorkers);
router.get('/:contractorId/earnings', auth(), contractorController.getContractorEarnings);

router
  .route('/:contractorId')
  .get(auth(), contractorController.getContractor)
  .patch(auth(), contractorController.updateContractor)
  .delete(auth(), contractorController.deleteContractor);

module.exports = router;
