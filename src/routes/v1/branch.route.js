const express = require('express');
const branchController = require('../../controllers/branch.controller');
const validate = require('../../middlewares/validate');
const auth = require('../../middlewares/auth');
const { branchValidation } = require('../../validations');

const router = express.Router();

router
  .route('/')
  .post(auth('manageAttendance', { group: 'peopleHub', module: 'branch', action: 'add' }), validate(branchValidation.createBranch), branchController.createBranch)
  .get(auth('manageAttendance', { group: 'peopleHub', module: 'branch', action: 'view' }), validate(branchValidation.getBranches), branchController.getBranches);

router.route('/generate-id').get(auth('manageAttendance', { group: 'peopleHub', module: 'branch', action: 'view' }), branchController.generateBranchId);

router.route('/dropdown').get(auth('manageAttendance', { group: 'peopleHub', module: 'branch', action: 'view' }), branchController.getBranchDropdown);

router
  .route('/:branchId')
  .get(auth('manageAttendance', { group: 'peopleHub', module: 'branch', action: 'view' }), validate(branchValidation.getBranch), branchController.getBranch)
  .patch(auth('manageAttendance', { group: 'peopleHub', module: 'branch', action: 'edit' }), validate(branchValidation.updateBranch), branchController.updateBranch)
  .delete(auth('manageAttendance', { group: 'peopleHub', module: 'branch', action: 'delete' }), validate(branchValidation.deleteBranch), branchController.deleteBranch);

module.exports = router;
