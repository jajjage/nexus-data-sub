import { HealthController } from '../../../../src/controllers/health.controller';
import db from '../../../../src/database/connection';
import { redisClientInstance } from '../../../../src/database/redis';

jest.mock('../../../../src/database/connection', () => ({
  __esModule: true,
  default: {
    raw: jest.fn(),
  },
}));

describe('HealthController', () => {
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Mock process methods
    jest.spyOn(process, 'uptime').mockReturnValue(100);
    jest.spyOn(process, 'memoryUsage').mockReturnValue({
      heapUsed: 50 * 1024 * 1024,
      heapTotal: 100 * 1024 * 1024,
      rss: 0,
      external: 0,
      arrayBuffers: 0,
    });
    jest
      .spyOn(process, 'cpuUsage')
      .mockReturnValue({ user: 1000000, system: 500000 });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getHealth', () => {
    it('should return healthy status when all services are up', async () => {
      // Mock successful db.raw call
      (db.raw as jest.Mock).mockResolvedValue({ rowCount: 1 });

      await HealthController.getHealth(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ok',
          services: {
            database: 'healthy',
            redis: 'healthy',
            application: 'healthy',
          },
        })
      );
    });

    it('should return unhealthy status when database is down', async () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      (db.raw as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await HealthController.getHealth(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
        })
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getReadiness', () => {
    it('should return ready status when all services are ready', async () => {
      (db.raw as jest.Mock).mockResolvedValue({ rowCount: 1 });

      await HealthController.getReadiness(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ready',
          services: {
            database: 'ready',
            redis: 'ready',
          },
        })
      );
    });

    it('should return not ready status when redis is not ready', async () => {
      (db.raw as jest.Mock).mockResolvedValue({ rowCount: 1 });
      const mockRedis = { ping: jest.fn().mockResolvedValue('ERROR') };
      jest
        .spyOn(redisClientInstance, 'getClient')
        .mockReturnValueOnce(mockRedis as any);

      await HealthController.getReadiness(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'not ready',
          services: {
            database: 'ready',
            redis: 'not ready',
          },
        })
      );
    });
  });

  describe('getLiveness', () => {
    it('should always return alive status', async () => {
      await HealthController.getLiveness(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'alive',
          pid: process.pid,
        })
      );
    });
  });
});
