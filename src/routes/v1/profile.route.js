const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const userValidation = require('../../validations/user.validation');
const userController = require('../../controllers/user.controller');

const router = express.Router();

router.get('/', auth(), userController.getProfile);
router.patch('/', auth(), validate(userValidation.updateProfile), userController.updateProfile);
router.patch('/password', auth(), validate(userValidation.changePassword), userController.changePassword);

module.exports = router;
