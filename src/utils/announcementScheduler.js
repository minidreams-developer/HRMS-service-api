const cron = require('node-cron');
const logger = require('../config/logger');
const { announcementService } = require('../services');

/**
 * Runs every minute and publishes any scheduled announcements
 * whose scheduleDateAndTime has been reached.
 *
 * Cron expression: '* * * * *'
 *   ┌── minute (0-59)
 *   │ ┌── hour (0-23)
 *   │ │ ┌── day of month (1-31)
 *   │ │ │ ┌── month (1-12)
 *   │ │ │ │ ┌── day of week (0-7)
 *   * * * * *
 */
const startAnnouncementScheduler = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const count = await announcementService.publishDueAnnouncements();
      if (count > 0) {
        logger.info(`[AnnouncementScheduler] Published ${count} scheduled announcement(s)`);
      }
    } catch (err) {
      logger.error(`[AnnouncementScheduler] Error publishing announcements: ${err.message}`);
    }
  });

  logger.info('[AnnouncementScheduler] Started — checking every minute for due announcements');
};

module.exports = { startAnnouncementScheduler };
