import { Redis } from 'ioredis';
import { logger } from '../utils/logger.utils';

export class RedisClient {
  private client: Redis;
  private isConnected: boolean = false; // Track connection status

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'redis',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      showFriendlyErrorStack: true,
    });

    this.client.on('error', (err: Error) => {
      console.error('Redis connection error:', err);
      this.isConnected = false; // Update status on error
    });

    this.client.on('connect', () => {
      logger.info('✅ Connected to Redis');
      this.isConnected = true; // Update status on connect
    });

    // Handle disconnection events if needed
    this.client.on('close', () => {
      console.warn('Redis connection closed');
      this.isConnected = false;
    });
    this.client.on('reconnecting', (delay: number) => {
      logger.info(`Redis reconnecting in ${delay}ms`);
    });
  }

  // Method to await connection readiness
  public async ensureConnected(): Promise<void> {
    if (this.isConnected) {
      return; // Already connected
    }
    return new Promise((resolve, reject) => {
      this.client.on('connect', () => {
        resolve();
      });
      this.client.on('error', err => {
        reject(err);
      });
      // Optionally, set a timeout to prevent indefinite waiting
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis connection closed successfully.');
    }
  }

  public setupShutdownHandlers() {
    const shutdown = async () => {
      await this.disconnect();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }
}

export const redisClientInstance = new RedisClient();
redisClientInstance.setupShutdownHandlers();
