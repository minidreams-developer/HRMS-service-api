const cron = require('node-cron');
const logger = require('../config/logger');
const { announcementService, payrollService } = require('../services');

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

  cron.schedule('*/15 * * * *', async () => {
    try {
      const result = await payrollService.resumeDuePayrolls(new Date());
      if (result.resumed > 0) {
        logger.info(`[PayrollScheduler] Automatically resumed ${result.resumed} payroll(s)`);
      }
    } catch (err) {
      logger.error(`[PayrollScheduler] Error resuming payrolls: ${err.message}`);
    }
  });

  logger.info('[AnnouncementScheduler] Started — checking every minute for due announcements');
  logger.info('[PayrollScheduler] Started — checking every 15 minutes for due payroll resumes');
};

module.exports = { startAnnouncementScheduler };
