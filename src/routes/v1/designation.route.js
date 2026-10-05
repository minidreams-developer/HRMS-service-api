const express = require('express'); const auth = require('../../middlewares/auth'); const validate = require('../../middlewares/validate'); const validation = require('../../validations/designation.validation'); const controller = require('../../controllers/designation.controller');
const router = express.Router();
router.route('/').post(auth('manageAttendance'), validate(validation.createDesignation), controller.createDesignation).get(auth('manageAttendance'), validate(validation.getDesignations), controller.getDesignations);
router.route('/generate-id').get(auth('manageAttendance'), controller.generateDesignationCode);
router.route('/dropdown').get(auth('manageAttendance'), controller.getDesignationDropdown);
router.route('/:designationId').get(auth('manageAttendance'), validate(validation.getDesignation), controller.getDesignation).patch(auth('manageAttendance'), validate(validation.updateDesignation), controller.updateDesignation).delete(auth('manageAttendance'), validate(validation.deleteDesignation), controller.deleteDesignation);
module.exports = router;
