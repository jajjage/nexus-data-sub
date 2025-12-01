// jobs/cleanupTokens.ts
import db from '../database/connection';
import { logger } from '../utils/logger.utils';

export const pruneStaleTokens = async () => {
  try {
    const SIX_MONTHS_AGO = new Date();
    SIX_MONTHS_AGO.setMonth(SIX_MONTHS_AGO.getMonth() - 6);

    // Delete tokens that haven't been updated/used in 6 months
    const deletedCount = await db('push_tokens')
      .where('updated_at', '<', SIX_MONTHS_AGO)
      .del();

    if (deletedCount > 0) {
      logger.info(`Pruned ${deletedCount} stale push tokens.`);
    }
  } catch (error) {
    logger.error('Error pruning tokens:', error);
  }
};
