import { logger } from '../utils/logger.utils';
import { processOneJob } from './offerRedemption.worker';

async function run() {
  logger.info('Starting worker runner...');

  const handle = setInterval(async () => {
    try {
      await processOneJob();
    } catch (err) {
      logger.error('Worker loop error', err);
    }
  }, 3000);

  // expose a cleanup in case the process needs to shutdown gracefully
  process.on('SIGINT', () => {
    logger.info('Stopping worker runner...');
    clearInterval(handle);
    process.exit(0);
  });
}

if (require.main === module) {
  run().catch(err => {
    console.error('Worker runner failed', err);
    process.exit(1);
  });
}
