import JobService from '../services/job.service';
import OfferAdminService from '../services/offerAdmin.service';
import { logger } from '../utils/logger.utils';

export async function processOneJob() {
  const job = await JobService.fetchAndClaimPending();
  if (!job) return null;

  logger.info(`Processing job ${job.id} of type ${job.type}`);

  try {
    if (job.type === 'offer_redemption') {
      const { offerId, targets, price, discount } = job.payload as any;
      // Use OfferAdminService bulkRedeem to process targets
      const results = await OfferAdminService.bulkRedeem(
        offerId,
        targets,
        price,
        discount
      );
      await JobService.markCompleted(job.id, {
        summary: {
          success: results.filter(r => r.success).length,
          total: results.length,
        },
        results: results.slice(0, 50),
      });
      return job.id;
    }

    // Unknown job types are marked failed
    await JobService.markFailed(job.id, { error: 'unknown job type' });
    return job.id;
  } catch (err: any) {
    logger.error('Job processing failed', err);
    await JobService.markFailed(job.id, { error: err.message || String(err) });
    return job.id;
  }
}
