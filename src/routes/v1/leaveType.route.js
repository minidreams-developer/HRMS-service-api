const express = require('express');
const auth = require('../../middlewares/auth');
const controller = require('../../controllers/leaveType.controller');

const router = express.Router();

router.get('/', auth(), controller.getLeaveTypes);

module.exports = router;
