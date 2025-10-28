import { AdminController } from '../../../../src/controllers/admin.controller';
import { JobService } from '../../../../src/services/job.service';
import { sendSuccess } from '../../../../src/utils/response.utils';

jest.mock('../../../../src/services/job.service');
jest.mock('../../../../src/utils/response.utils');

describe('AdminController', () => {
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    mockRequest = {
      query: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllJobs', () => {
    it('should get all jobs with pagination', async () => {
      mockRequest.query.page = '1';
      mockRequest.query.limit = '10';

      const jobs = [{ id: '1', type: 'test' }];
      const total = 1;

      (JobService.getAllJobs as jest.Mock).mockResolvedValue({ jobs, total });

      await AdminController.getAllJobs(mockRequest, mockResponse);

      expect(JobService.getAllJobs).toHaveBeenCalledWith(1, 10);
      expect(sendSuccess).toHaveBeenCalledWith(
        mockResponse,
        'Jobs retrieved successfully',
        {
          jobs,
          pagination: {
            page: 1,
            limit: 10,
            total,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        }
      );
    });
  });
});
