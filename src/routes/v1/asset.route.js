const express = require('express');
const assetController = require('../../controllers/asset.controller');

const router = express.Router();

router
  .route('/')
  .post(assetController.createAsset)
  .get(assetController.getAssets);

router
  .route('/:assetId')
  .get(assetController.getAsset)
  .patch(assetController.updateAsset)
  .delete(assetController.deleteAsset);

module.exports = router;

