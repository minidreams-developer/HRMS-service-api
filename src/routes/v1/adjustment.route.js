const express = require('express');
const adjustmentController = require('../../controllers/adjustment.controller');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const validation = require('../../validations/adjustment.validation');

const router = express.Router();

/**
 * GET    /v1/adjustments/quick-stats        — quick stats (totals, pending count)
 * POST   /v1/adjustments                    — create adjustment (person or team)
 * GET    /v1/adjustments                    — list all (filterable, paginated)
 * GET    /v1/adjustments/pending            — list only pending (Pending tab)
 * GET    /v1/adjustments/:id                — get one (Adjustment Details panel)
 * PATCH  /v1/adjustments/:id               — edit adjustment fields
 * PATCH  /v1/adjustments/:id/status        — approve / reject / cancel / apply
 * DELETE /v1/adjustments/:id               — delete adjustment
 *
 * NOTE: /quick-stats and /pending must be BEFORE /:adjustmentId
 */

router
  .route('/quick-stats')
  .get(auth({ group: 'payHub', module: 'additionDeductions' }), validate(validation.quickStats), adjustmentController.getQuickStats);

router
  .route('/pending')
  .get(auth({ group: 'payHub', module: 'additionDeductions' }), validate(validation.list), adjustmentController.getPendingAdjustments);

router
  .route('/')
  .post(auth({ group: 'payHub', module: 'additionDeductions' }), validate(validation.create), adjustmentController.createAdjustment)
  .get(auth({ group: 'payHub', module: 'additionDeductions' }), validate(validation.list), adjustmentController.getAdjustments);

router
  .route('/:adjustmentId/status')
  .patch(auth({ group: 'payHub', module: 'additionDeductions' }), validate(validation.status), adjustmentController.updateAdjustmentStatus);

router
  .route('/:adjustmentId/emi-schedule')
  .get(auth({ group: 'payHub', module: 'additionDeductions' }), validate(validation.id), adjustmentController.getEmiSchedule);

router
  .route('/:adjustmentId')
  .get(auth({ group: 'payHub', module: 'additionDeductions' }), validate(validation.id), adjustmentController.getAdjustment)
  .patch(auth({ group: 'payHub', module: 'additionDeductions' }), validate(validation.update), adjustmentController.updateAdjustment)
  .delete(auth({ group: 'payHub', module: 'additionDeductions' }), validate(validation.id), adjustmentController.deleteAdjustment);

module.exports = router;
