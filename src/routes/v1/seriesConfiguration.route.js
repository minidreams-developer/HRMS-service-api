const express = require('express');
const seriesConfiguration = require('../../controllers/seriesConfiguration.controller');

const router = express.Router();

router
    .route('/')
    .post(seriesConfiguration.createSeriesConfiguration)
    .get(seriesConfiguration.getAllSeriesConfiguration)

module.exports = router;