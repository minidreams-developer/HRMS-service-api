const express = require('express');
const departmentController = require('../../controllers/department.controller');
const validate = require('../../middlewares/validate');
const auth = require('../../middlewares/auth');
const { departmentValidation } = require('../../validations');

const router = express.Router();

router
  .route('/')
  .post(auth('manageAttendance'), validate(departmentValidation.createDepartment), departmentController.createDepartment)
  .get(auth('manageAttendance'), validate(departmentValidation.getDepartments), departmentController.getDepartments);

router.route('/generate-id').get(auth('manageAttendance'), departmentController.generateDepartmentId);

router
  .route('/:departmentId')
  .get(auth('manageAttendance'), validate(departmentValidation.getDepartment), departmentController.getDepartment)
  .patch(auth('manageAttendance'), validate(departmentValidation.updateDepartment), departmentController.updateDepartment)
  .delete(auth('manageAttendance'), validate(departmentValidation.deleteDepartment), departmentController.deleteDepartment);

router
  .route('/:departmentId/members')
  .post(auth('manageAttendance'), validate(departmentValidation.addMember), departmentController.addMember);

router
  .route('/:departmentId/teams')
  .post(auth('manageAttendance'), validate(departmentValidation.addTeam), departmentController.addTeam);

module.exports = router;
