import JobModel from '../../../../src/models/Job';
import { JobService } from '../../../../src/services/job.service';

jest.mock('../../../../src/models/Job');

describe('JobService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createJob', () => {
    it('should call JobModel.create with the correct parameters', async () => {
      const type = 'test_job';
      const payload = { data: 'test' };
      await JobService.createJob(type, payload);
      expect(JobModel.create).toHaveBeenCalledWith(type, payload);
    });
  });

  describe('fetchAndClaimPending', () => {
    it('should call JobModel.fetchPending and JobModel.claimJob', async () => {
      const job = { id: 'job1', type: 'test', payload: {} };
      (JobModel.fetchPending as jest.Mock).mockResolvedValue([job]);
      await JobService.fetchAndClaimPending();
      expect(JobModel.fetchPending).toHaveBeenCalledWith(1);
      expect(JobModel.claimJob).toHaveBeenCalledWith('job1');
    });

    it('should return null if no pending jobs', async () => {
      (JobModel.fetchPending as jest.Mock).mockResolvedValue([]);
      const result = await JobService.fetchAndClaimPending();
      expect(result).toBeNull();
      expect(JobModel.claimJob).not.toHaveBeenCalled();
    });
  });

  describe('markCompleted', () => {
    it('should call JobModel.updateStatus with "completed"', async () => {
      const jobId = 'job1';
      const result = { success: true };
      await JobService.markCompleted(jobId, result);
      expect(JobModel.updateStatus).toHaveBeenCalledWith(
        jobId,
        'completed',
        result
      );
    });
  });

  describe('markFailed', () => {
    it('should call JobModel.updateStatus with "failed"', async () => {
      const jobId = 'job1';
      const result = { error: 'test error' };
      await JobService.markFailed(jobId, result);
      expect(JobModel.updateStatus).toHaveBeenCalledWith(
        jobId,
        'failed',
        result
      );
    });
  });

  describe('getJobById', () => {
    it('should call JobModel.findById with the correct id', async () => {
      const jobId = 'job1';
      await JobService.getJobById(jobId);
      expect(JobModel.findById).toHaveBeenCalledWith(jobId);
    });
  });

  describe('getAllJobs', () => {
    it('should call JobModel.getAll with the correct parameters', async () => {
      const page = 1;
      const limit = 10;
      await JobService.getAllJobs(page, limit);
      expect(JobModel.getAll).toHaveBeenCalledWith(page, limit);
    });
  });
});
