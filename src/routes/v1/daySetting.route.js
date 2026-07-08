const express = require('express');
const daySettingController = require('../../controllers/daySetting.controller');

const router = express.Router();

/**
 * POST   /v1/day-settings           — save global default timing (Save button)
 * POST   /v1/day-settings/single    — save one-off date override (For one day)
 * GET    /v1/day-settings           — list all settings (?type=default|single)
 * GET    /v1/day-settings/default   — get current global default
 * GET    /v1/day-settings/:id       — get one by _id
 * PATCH  /v1/day-settings/:id       — update
 * DELETE /v1/day-settings/:id       — delete
 *
 * NOTE: /single and /default must be declared BEFORE /:daySettingId
 */

router
  .route('/')
  .post(daySettingController.createDefaultDaySetting)
  .get(daySettingController.getDaySettings);

router
  .route('/single')
  .post(daySettingController.createSingleDaySetting);

router
  .route('/default')
  .get(daySettingController.getDefaultDaySetting);

router
  .route('/:daySettingId')
  .get(daySettingController.getDaySetting)
  .patch(daySettingController.updateDaySetting)
  .delete(daySettingController.deleteDaySetting);

module.exports = router;
