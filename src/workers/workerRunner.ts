async function run() {
  logger.info('Starting worker runner (serial loop)...');

  let running = true;
  let currentJobPromise: Promise<any> | null = null;

  const DEFAULT_POLL_MS = 3000;

  // Graceful shutdown handler
  process.on('SIGINT', async () => {
    logger.info('Stopping worker runner... waiting for current job to finish.');
    running = false;
    // Wait for the in-flight job to complete before exiting
    if (currentJobPromise) {
      await currentJobPromise;
    }
    process.exit(0);
  });

  while (running) {
    try {
      currentJobPromise = processOneJob();
      await currentJobPromise;
    } catch (err) {
      logger.error('Worker loop error', err);
    } finally {
      currentJobPromise = null;
    }

    if (running) {
      // wait before next iteration to avoid tight loop
      await new Promise(resolve => setTimeout(resolve, DEFAULT_POLL_MS));
    }
  }
}

if (require.main === module) {
  run().catch(err => {
    console.error('Worker runner failed', err);
    process.exit(1);
  });
}
