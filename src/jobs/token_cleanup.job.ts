import { AdminModel } from '@/models/Admin';
import { CronJob } from 'cron';
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
