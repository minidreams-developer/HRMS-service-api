const express = require('express');
const daySettingController = require('../../controllers/daySetting.controller');
const auth = require('../../middlewares/auth');
const settingsAdmin = require('../../middlewares/settingsAdmin');

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
  .post(auth(), settingsAdmin, daySettingController.createDefaultDaySetting)
  .get(auth(), settingsAdmin, daySettingController.getDaySettings);

router
  .route('/single')
  .post(auth(), settingsAdmin, daySettingController.createSingleDaySetting);

router
  .route('/default')
  .get(auth(), settingsAdmin, daySettingController.getDefaultDaySetting);

router
  .route('/:daySettingId')
  .get(auth(), settingsAdmin, daySettingController.getDaySetting)
  .patch(auth(), settingsAdmin, daySettingController.updateDaySetting)
  .delete(auth(), settingsAdmin, daySettingController.deleteDaySetting);

module.exports = router;
