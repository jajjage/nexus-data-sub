import { redisClientInstance } from '../database/redis';

class TwoFADisableTracker {
  private redis = redisClientInstance.getClient();
  private readonly MAX_ATTEMPTS = 3;
  private readonly WINDOW_SECONDS = 24 * 60 * 60; // 24 hours in seconds

  private getKey(userId: string, ip: string): string {
    const today = new Date().toDateString();
    return `2fa_disable:${userId}:${ip}:${today}`;
  }

  async canDisable2FA(userId: string, ip: string): Promise<boolean> {
    try {
      const key = this.getKey(userId, ip);
      const attempts = await this.redis.get(key);
      return !attempts || parseInt(attempts) < this.MAX_ATTEMPTS;
    } catch (error) {
      console.error('Redis error in canDisable2FA:', error);
      // Fail open - allow the operation if Redis is down
      return true;
    }
  }

  async recordAttempt(userId: string, ip: string): Promise<void> {
    try {
      const key = this.getKey(userId, ip);

      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, this.WINDOW_SECONDS);

      await pipeline.exec();
    } catch (error) {
      console.error('Redis error in recordAttempt:', error);
      // Don't throw - logging is sufficient for this non-critical operation
    }
  }

  async getRemainingAttempts(userId: string, ip: string): Promise<number> {
    try {
      const key = this.getKey(userId, ip);
      const attempts = await this.redis.get(key);
      const currentAttempts = attempts ? parseInt(attempts) : 0;
      return Math.max(0, this.MAX_ATTEMPTS - currentAttempts);
    } catch (error) {
      console.error('Redis error in getRemainingAttempts:', error);
      // Return max attempts if Redis is unavailable
      return this.MAX_ATTEMPTS;
    }
  }

  // Optional: Method to reset attempts for a user (admin use)
  async resetAttempts(userId: string, ip: string): Promise<void> {
    try {
      const key = this.getKey(userId, ip);
      await this.redis.del(key);
    } catch (error) {
      console.error('Redis error in resetAttempts:', error);
    }
  }

  // Optional: Get current attempt count
  async getCurrentAttempts(userId: string, ip: string): Promise<number> {
    try {
      const key = this.getKey(userId, ip);
      const attempts = await this.redis.get(key);
      return attempts ? parseInt(attempts) : 0;
    } catch (error) {
      console.error('Redis error in getCurrentAttempts:', error);
      return 0;
    }
  }
}

export const twoFADisableTracker = new TwoFADisableTracker();
