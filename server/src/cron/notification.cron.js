import cron from 'node-cron';
import { Notification } from '../models/Notification.js';
import { logger } from '../utils/logger.js';

export const initNotificationCron = () => {
  // Run every day at midnight to remove notifications older than 1 day
  cron.schedule('0 0 * * *', async () => {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const result = await Notification.deleteMany({
        createdAt: { $lt: oneDayAgo },
      });
      if (result.deletedCount > 0) {
        logger.info(`Cron: Deleted ${result.deletedCount} notifications older than 1 day.`);
      }
    } catch (error) {
      logger.error('Cron: Error deleting old notifications - ' + error.message);
    }
  });
};
