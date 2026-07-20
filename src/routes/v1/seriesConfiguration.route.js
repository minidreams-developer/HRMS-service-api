const express = require('express');
const seriesConfiguration = require('../../controllers/seriesConfiguration.controller');

const router = express.Router();

router
  .route('/')
  .post(seriesConfiguration.createSeriesConfiguration)
  .get(seriesConfiguration.getAllSeriesConfiguration);

router
  .route('/:seriesId')
  .get(seriesConfiguration.getSeriesConfigurationById)
  .patch(seriesConfiguration.updateSeriesConfiguration)
  .delete(seriesConfiguration.deleteSeriesConfiguration);

module.exports = router;