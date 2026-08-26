const express = require('express');
const assetController = require('../../controllers/asset.controller');

const router = express.Router();

router
  .route('/')
  .post(assetController.createAsset)
  .get(assetController.getAssets);

// Assign an asset to a specific employee
// PATCH /v1/assets/:assetId/assign/:employeeId
router
  .route('/:assetId/assign/:employeeId')
  .patch(assetController.assignAssetToEmployee);

// Get all assets for a specific employee
// GET /v1/assets/employee/:employeeId
router
  .route('/employee/:employeeId')
  .get(assetController.getAssetsByEmployee);

router
  .route('/:assetId')
  .get(assetController.getAsset)
  .patch(assetController.updateAsset)
  .delete(assetController.deleteAsset);

module.exports = router;

