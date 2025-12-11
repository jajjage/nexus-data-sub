import { CronJob } from 'cron';
import { config } from '../config/env';
import { AdminModel } from '../models/Admin';
import { FirebaseService } from '../services/firebase.service';
import { logger } from '../utils/logger.utils';

// Runs every hour
export const tokenCleanupJob = new CronJob('0 * * * *', async () => {
  try {
    logger.info('Running expired token cleanup job...');
    await AdminModel.cleanupExpiredTokens();
    logger.info('Expired token cleanup job finished.');
  } catch (error) {
    logger.error('Error running expired token cleanup job:', error);
  }
});

// Runs every 2 hours to clean up inactive tokens from Firebase
// This ensures inactive/unregistered tokens don't receive notifications
export const firebaseTokenCleanupJob = new CronJob('0 */2 * * *', async () => {
  try {
    logger.info('Running Firebase inactive token cleanup job...');

    // Get topics from config
    const topics = Array.isArray(config.notifications.autoSubscribeTopics)
      ? config.notifications.autoSubscribeTopics
      : ['all'];

    await FirebaseService.cleanupInactiveTokens(topics);
    logger.info('Firebase token cleanup job finished.');
  } catch (error) {
    logger.error('Error running Firebase token cleanup job:', error);
  }
});
