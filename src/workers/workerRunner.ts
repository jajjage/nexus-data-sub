import { logger } from '../utils/logger.utils';
import { processOneJob } from './offerRedemption.worker';

const DEFAULT_POLL_MS = 3000;

async function run() {
  logger.info('Starting worker runner (serial loop)...');

  let running = true;

  // Graceful shutdown handler
  process.on('SIGINT', () => {
    logger.info('Stopping worker runner...');
    running = false;
    // give some time for current job to finish
    setTimeout(() => process.exit(0), 2000);
  });

  while (running) {
    try {
      await processOneJob();
    } catch (err) {
      logger.error('Worker loop error', err);
    }

    // wait before next iteration to avoid tight loop
    await new Promise(resolve => setTimeout(resolve, DEFAULT_POLL_MS));
  }
}

if (require.main === module) {
  run().catch(err => {
    console.error('Worker runner failed', err);
    process.exit(1);
  });
}
