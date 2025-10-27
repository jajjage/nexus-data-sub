import JobModel, { JobRecord } from '../models/Job';

export class JobService {
  static async createJob(type: string, payload: any) {
    const job = await JobModel.create(type, payload);
    return job as JobRecord;
  }

  static async fetchAndClaimPending() {
    const pending = await JobModel.fetchPending(1);
    if (!pending || pending.length === 0) return null;
    const jobRow = pending[0];
    const claimed = await JobModel.claimJob(jobRow.id);
    return claimed as JobRecord | null;
  }

  static async markCompleted(id: string, result?: any) {
    await JobModel.updateStatus(id, 'completed', result);
  }

  static async markFailed(id: string, result?: any) {
    await JobModel.updateStatus(id, 'failed', result);
  }
}

export default JobService;
