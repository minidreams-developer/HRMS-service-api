const express = require('express');
const seriesConfiguration = require('../../controllers/seriesConfiguration.controller');
const auth = require('../../middlewares/auth');
const settingsAdmin = require('../../middlewares/settingsAdmin');
const validate = require('../../middlewares/validate');
const validation = require('../../validations/seriesConfiguration.validation');

const router = express.Router();

router
  .route('/')
  .post(auth(), settingsAdmin, validate(validation.create), seriesConfiguration.createSeriesConfiguration)
  .get(auth(), settingsAdmin, validate(validation.list), seriesConfiguration.getAllSeriesConfiguration);

router
  .route('/:seriesId')
  .get(auth(), settingsAdmin, validate(validation.get), seriesConfiguration.getSeriesConfigurationById)
  .patch(auth(), settingsAdmin, validate(validation.update), seriesConfiguration.updateSeriesConfiguration)
  .delete(auth(), settingsAdmin, validate(validation.remove), seriesConfiguration.deleteSeriesConfiguration);

module.exports = router;
