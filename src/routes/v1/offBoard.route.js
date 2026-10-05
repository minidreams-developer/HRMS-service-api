const express = require('express');
const validate = require('../../middlewares/validate');
const offBoardValidation = require('../../validations/offBoard.validation');
const { offBoardController } = require('../../controllers');
const auth = require('../../middlewares/auth');

const router = express.Router();

router
  .route('/')
  .post(auth('manageAttendance'), validate(offBoardValidation.createOffBoard), offBoardController.createOffBoard)
  .get(auth('manageAttendance'), validate(offBoardValidation.getOffBoards), offBoardController.getOffBoards);

router
  .route('/summary')
  .get(auth('manageAttendance'), validate(offBoardValidation.getOffBoardSummary), offBoardController.getOffBoardSummary);

router
  .route('/user/:userId')
  .get(auth('manageAttendance'), validate(offBoardValidation.getOffBoardByUser), offBoardController.getOffBoardByUser);

router
  .route('/:offBoardId')
  .get(auth('manageAttendance'), validate(offBoardValidation.getOffBoard), offBoardController.getOffBoard)
  .patch(auth('manageAttendance'), validate(offBoardValidation.updateOffBoard), offBoardController.updateOffBoard)
  .delete(auth('manageAttendance'), validate(offBoardValidation.deleteOffBoard), offBoardController.deleteOffBoard);

router.route('/:offBoardId/status').patch(auth('manageAttendance'), validate(offBoardValidation.updateStatus), offBoardController.updateStatus);
router.route('/:offBoardId/finalize').post(auth('manageAttendance'), validate(offBoardValidation.finalize), offBoardController.finalizeOffBoard);

router
  .route('/:offBoardId/send-otp')
  .post(auth('manageAttendance'), validate(offBoardValidation.sendOtp), offBoardController.sendOtp);

router
  .route('/:offBoardId/verify-otp')
  .post(auth('manageAttendance'), validate(offBoardValidation.verifyOtp), offBoardController.verifyOtp);

module.exports = router;
