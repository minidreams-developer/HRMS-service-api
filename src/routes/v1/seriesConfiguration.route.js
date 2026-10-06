const express = require('express');
const seriesConfiguration = require('../../controllers/seriesConfiguration.controller');
const auth = require('../../middlewares/auth');
const settingsAdmin = require('../../middlewares/settingsAdmin');

const router = express.Router();

router
  .route('/')
  .post(auth(), settingsAdmin, seriesConfiguration.createSeriesConfiguration)
  .get(auth(), settingsAdmin, seriesConfiguration.getAllSeriesConfiguration);

router
  .route('/:seriesId')
  .get(auth(), settingsAdmin, seriesConfiguration.getSeriesConfigurationById)
  .patch(auth(), settingsAdmin, seriesConfiguration.updateSeriesConfiguration)
  .delete(auth(), settingsAdmin, seriesConfiguration.deleteSeriesConfiguration);

module.exports = router;
