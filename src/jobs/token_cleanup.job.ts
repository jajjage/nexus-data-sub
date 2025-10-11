import { CronJob } from 'cron';
import { UserModel } from '../models/User';
import { logger } from '../utils/logger.utils';

// Runs every hour
export const tokenCleanupJob = new CronJob('0 * * * *', async () => {
  try {
    logger.info('Running expired token cleanup job...');
    await UserModel.cleanupExpiredTokens();
    logger.info('Expired token cleanup job finished.');
  } catch (error) {
    logger.error('Error running expired token cleanup job:', error);
  }
});
