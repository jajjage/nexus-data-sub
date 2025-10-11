import { Request, Response } from 'express';
import db from '../database/connection';
import { redisClientInstance } from '../database/redis';

export class HealthController {
  static async getHealth(req: Request, res: Response) {
    try {
      // Check database connection
      const dbCheck = await db.raw('SELECT 1');
      const databaseStatus = dbCheck.rowCount === 1 ? 'healthy' : 'unhealthy';

      // Check Redis connection
      const redis = redisClientInstance.getClient();
      const redisPing = await redis.ping();
      const redisStatus = redisPing === 'PONG' ? 'healthy' : 'unhealthy';

      // Application version and uptime
      const version = process.env.npm_package_version || '1.0.0';
      const uptime = process.uptime();

      const healthStatus = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(uptime),
        version,
        services: {
          database: databaseStatus,
          redis: redisStatus,
          application: 'healthy',
        },
        system: {
          memory: {
            used:
              Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) /
              100,
            total:
              Math.round(
                (process.memoryUsage().heapTotal / 1024 / 1024) * 100
              ) / 100,
            unit: 'MB',
          },
          cpu: {
            load: Math.round(process.cpuUsage().user / 1000000),
          },
        },
      };

      const isHealthy = Object.values(healthStatus.services).every(
        status => status === 'healthy'
      );

      return res.status(isHealthy ? 200 : 503).json(healthStatus);
    } catch (error) {
      console.error('Health check error:', error);
      return res.status(503).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async getReadiness(req: Request, res: Response) {
    try {
      // Check if all required services are ready
      const dbCheck = await db.raw('SELECT 1');
      const databaseReady = dbCheck.rowCount === 1;

      const redis = redisClientInstance.getClient();
      const redisPing = await redis.ping();
      const redisReady = redisPing === 'PONG';

      const isReady = databaseReady && redisReady;

      if (isReady) {
        return res.status(200).json({
          status: 'ready',
          timestamp: new Date().toISOString(),
          services: {
            database: 'ready',
            redis: 'ready',
          },
        });
      } else {
        return res.status(503).json({
          status: 'not ready',
          timestamp: new Date().toISOString(),
          services: {
            database: databaseReady ? 'ready' : 'not ready',
            redis: redisReady ? 'ready' : 'not ready',
          },
        });
      }
    } catch (error) {
      console.error('Readiness check error:', error);
      return res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        error: 'Readiness check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async getLiveness(req: Request, res: Response) {
    // Simple liveness check - if the application is running, it's alive
    return res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      pid: process.pid,
    });
  }
}
