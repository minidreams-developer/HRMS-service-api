const express = require('express');
const branchController = require('../../controllers/branch.controller');
const validate = require('../../middlewares/validate');
const { branchValidation } = require('../../validations');

const router = express.Router();

router
  .route('/')
  .post(validate(branchValidation.createBranch), branchController.createBranch)
  .get(validate(branchValidation.getBranches), branchController.getBranches);

router.route('/generate-id').get(branchController.generateBranchId);

router
  .route('/:branchId')
  .get(validate(branchValidation.getBranch), branchController.getBranch)
  .patch(validate(branchValidation.updateBranch), branchController.updateBranch)
  .delete(validate(branchValidation.deleteBranch), branchController.deleteBranch);

module.exports = router;
