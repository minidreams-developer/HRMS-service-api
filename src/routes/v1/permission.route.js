const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const controller = require('../../controllers/permission.controller');
const validation = require('../../validations/permission.validation');
const router = express.Router();
router.route('/').post(auth(), validate(validation.createPermission), controller.createPermission).get(auth(), validate(validation.getPermissions), controller.getPermissions);
router.route('/:permissionId').get(auth(), validate(validation.getPermission), controller.getPermission).patch(auth(), validate(validation.updatePermission), controller.updatePermission).delete(auth(), validate(validation.deletePermission), controller.deletePermission);
module.exports = router;
