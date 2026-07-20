const express = require('express');
const adjustmentController = require('../../controllers/adjustment.controller');

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
  .get(adjustmentController.getQuickStats);

router
  .route('/pending')
  .get(adjustmentController.getPendingAdjustments);

router
  .route('/')
  .post(adjustmentController.createAdjustment)
  .get(adjustmentController.getAdjustments);

router
  .route('/:adjustmentId/status')
  .patch(adjustmentController.updateAdjustmentStatus);

router
  .route('/:adjustmentId')
  .get(adjustmentController.getAdjustment)
  .patch(adjustmentController.updateAdjustment)
  .delete(adjustmentController.deleteAdjustment);

module.exports = router;
