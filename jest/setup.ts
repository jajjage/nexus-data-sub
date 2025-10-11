import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import db from '../src/database/connection';
import { redisClientInstance } from '../src/database/redis';
import { tokenCleanupJob } from '../src/jobs/token_cleanup.job';

// Set default test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-purposes-only';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  'test-jwt-refresh-secret-key-for-testing-purposes-only';

// Set a longer timeout for tests that might involve database operations
jest.setTimeout(30000);

// Global setup hook
beforeAll(async () => {
  try {
    // Ensure the database connection is alive
    await db.raw('SELECT 1');
    console.log('✅ Connected to Test Database');

    // Drop all tables to ensure a clean slate
    await db.raw('DROP TABLE IF EXISTS user_polling_units CASCADE');
    await db.raw('DROP TABLE IF EXISTS polling_units CASCADE');
    await db.raw('DROP TABLE IF EXISTS wards CASCADE');
    await db.raw('DROP TABLE IF EXISTS lgas CASCADE');
    await db.raw('DROP TABLE IF EXISTS states CASCADE');
    await db.raw('DROP TABLE IF EXISTS countries CASCADE');
    await db.raw('DROP TABLE IF EXISTS role_permissions CASCADE');
    await db.raw('DROP TABLE IF EXISTS permissions CASCADE');
    await db.raw('DROP TABLE IF EXISTS backup_code CASCADE');
    await db.raw('DROP TABLE IF EXISTS users CASCADE');
    await db.raw('DROP TABLE IF EXISTS roles CASCADE');

    // Run seeds to create schema and populate data
    await db.seed.run();
    console.log('✅ Database seeding completed');

    // Ping Redis to ensure connection
    await redisClientInstance.getClient().ping();
    console.log('✅ Connected to Redis');
  } catch (error) {
    console.error('❌ Test setup failed:', error);
    process.exit(1);
  }
});

// Hook to clean the database before each test
beforeEach(async () => {
  // The database is reset once before all tests.
  // Individual tests should clean up their own specific modifications if necessary.
});

// Global teardown hook
afterAll(async () => {
  // Stop any running jobs
  tokenCleanupJob.stop();

  // Clean up Redis keys
  const redis = redisClientInstance.getClient();
  if (redis.status === 'ready') {
    const keys = await redis.keys('session:*');
    if (keys.length > 0) await redis.del(keys);

    const userKeys = await redis.keys('user_sessions:*');
    if (userKeys.length > 0) await redis.del(userKeys);

    const refreshKeys = await redis.keys('refresh_token:*');
    if (refreshKeys.length > 0) await redis.del(refreshKeys);

    await redisClientInstance.disconnect();
    console.log('Redis connection closed successfully.');
  }

  // Close the database connection
  await db.destroy();
  console.log('Database pool closed successfully.');
});
