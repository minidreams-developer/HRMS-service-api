const express = require('express');
const validate = require('../../middlewares/validate');
const offBoardValidation = require('../../validations/offBoard.validation');
const { offBoardController } = require('../../controllers');

const router = express.Router();

router
  .route('/')
  .post(validate(offBoardValidation.createOffBoard), offBoardController.createOffBoard)
  .get(validate(offBoardValidation.getOffBoards), offBoardController.getOffBoards);

router
  .route('/user/:userId')
  .get(validate(offBoardValidation.getOffBoardByUser), offBoardController.getOffBoardByUser);

router
  .route('/:offBoardId')
  .get(validate(offBoardValidation.getOffBoard), offBoardController.getOffBoard)
  .patch(validate(offBoardValidation.updateOffBoard), offBoardController.updateOffBoard)
  .delete(validate(offBoardValidation.deleteOffBoard), offBoardController.deleteOffBoard);

router
  .route('/:offBoardId/send-otp')
  .post(validate(offBoardValidation.sendOtp), offBoardController.sendOtp);

router
  .route('/:offBoardId/verify-otp')
  .post(validate(offBoardValidation.verifyOtp), offBoardController.verifyOtp);

module.exports = router;
