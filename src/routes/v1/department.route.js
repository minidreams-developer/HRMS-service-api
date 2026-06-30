const express = require('express');
const departmentController = require('../../controllers/department.controller');
const validate = require('../../middlewares/validate');
const { departmentValidation } = require('../../validations');

const router = express.Router();

router
  .route('/')
  .post(validate(departmentValidation.createDepartment), departmentController.createDepartment)
  .get(validate(departmentValidation.getDepartments), departmentController.getDepartments);

router.route('/generate-id').get(departmentController.generateDepartmentId);

router
  .route('/:departmentId')
  .get(validate(departmentValidation.getDepartment), departmentController.getDepartment)
  .patch(validate(departmentValidation.updateDepartment), departmentController.updateDepartment)
  .delete(validate(departmentValidation.deleteDepartment), departmentController.deleteDepartment);

router
  .route('/:departmentId/members')
  .post(validate(departmentValidation.addMember), departmentController.addMember);

router
  .route('/:departmentId/teams')
  .post(validate(departmentValidation.addTeam), departmentController.addTeam);

module.exports = router;
