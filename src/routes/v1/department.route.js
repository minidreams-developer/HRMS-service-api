const express = require('express');
const departmentController = require('../../controllers/department.controller');
const validate = require('../../middlewares/validate');
const auth = require('../../middlewares/auth');
const { departmentValidation } = require('../../validations');

const router = express.Router();

router
  .route('/')
  .post(auth('manageAttendance', { group: 'settings', module: 'departments', action: 'add' }), validate(departmentValidation.createDepartment), departmentController.createDepartment)
  .get(auth('manageAttendance', { group: 'settings', module: 'departments', action: 'view' }), validate(departmentValidation.getDepartments), departmentController.getDepartments);

router.route('/generate-id').get(auth('manageAttendance', { group: 'settings', module: 'departments', action: 'view' }), departmentController.generateDepartmentId);

router
  .route('/:departmentId')
  .get(auth('manageAttendance', { group: 'settings', module: 'departments', action: 'view' }), validate(departmentValidation.getDepartment), departmentController.getDepartment)
  .patch(auth('manageAttendance', { group: 'settings', module: 'departments', action: 'edit' }), validate(departmentValidation.updateDepartment), departmentController.updateDepartment)
  .delete(auth('manageAttendance', { group: 'settings', module: 'departments', action: 'delete' }), validate(departmentValidation.deleteDepartment), departmentController.deleteDepartment);

router
  .route('/:departmentId/members')
  .post(auth('manageAttendance'), validate(departmentValidation.addMember), departmentController.addMember);

router
  .route('/:departmentId/teams')
  .post(auth('manageAttendance'), validate(departmentValidation.addTeam), departmentController.addTeam);

module.exports = router;
