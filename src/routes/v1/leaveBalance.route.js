const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const validation = require('../../validations/leaveBalance.validation');
const controller = require('../../controllers/leaveBalance.controller');

const router = express.Router();

router.route('/')
  .post(auth(), validate(validation.createBalance), controller.createBalance);
router.route('/employee/:employeeId')
  .get(auth(), validate(validation.employeeBalances), controller.getBalancesByEmployee);
router.route('/:balanceId')
  .get(auth(), validate(validation.balance), controller.getBalanceById)
  .patch(auth(), validate(validation.updateBalance), controller.updateBalance);

module.exports = router;
