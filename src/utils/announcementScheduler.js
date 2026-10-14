const cron = require('node-cron');
const logger = require('../config/logger');
const { announcementService, payrollService, adjustmentService } = require('../services');

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

  cron.schedule('5 0 * * *', async () => {
    try {
      const now = new Date();
      const result = await adjustmentService.processDueEmiInstallments({ month: now.getMonth() + 1, year: now.getFullYear() });
      if (result.applied > 0) logger.info(`[PayrollScheduler] Applied ${result.applied} EMI installment(s)`);
    } catch (err) {
      logger.error(`[PayrollScheduler] Error processing EMI installments: ${err.message}`);
    }
  });

  logger.info('[AnnouncementScheduler] Started — checking every minute for due announcements');
  logger.info('[PayrollScheduler] Started — checking every 15 minutes for due payroll resumes');
  logger.info('[PayrollScheduler] Started — processing EMI installments daily');
};

module.exports = { startAnnouncementScheduler };
