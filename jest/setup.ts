import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import db from '../src/database/connection';
import { redisClientInstance } from '../src/database/redis';
import { tokenCleanupJob } from '../src/jobs/token_cleanup.job';

import { Knex } from 'knex';

declare global {
  var db: Knex;
}

// Set default test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-purposes-only';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  'test-jwt-refresh-secret-key-for-testing-purposes-only';

// Set a longer timeout for tests that might involve database operations
jest.setTimeout(30000);

// Configure test transactions for database operations
beforeAll(async () => {
  // Start a transaction
  await db.raw('BEGIN');
});

afterAll(async () => {
  // Rollback the transaction
  await db.raw('ROLLBACK');
});

// Global setup hook
import knex from '../src/database/connection';
// Mock config for tests
jest.mock('../src/config/env', () => ({
  config: {
    database: {
      url:
        process.env.DATABASE_URL ||
        'postgresql://postgres:postgres@b:5432/election_auth_test',
    },
    webhooks: {
      palmpay: {
        signatureHeader: 'x-palmpay-signature',
        secret: 'test_webhook_secret',
      },
    },
    palmpay: {
      apiKey: 'test-api-key',
      baseUrl: 'https://api.palmpay.com',
    },
    app: {
      baseUrl: 'http://localhost:3000',
    },
    notifications: {
      autoSubscribeTopics: ['all'],
      subscribeRoleTopic: true,
    },
  },
}));

jest.mock('../src/services/email.service', () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    sendWelcomeEmail: jest.fn().mockResolvedValue(void 0),
  })),
}));

beforeAll(async () => {
  try {
    // Ensure the database connection is alive
    await db.raw('SELECT 1');
    console.log('✅ Connected to Test Database');

    // Drop all tables to ensure a clean slate
    await db.raw('DROP SCHEMA public CASCADE');
    await db.raw('CREATE SCHEMA public');
    console.log('✅ Dropped and recreated public schema');

    // Run all migrations
    await knex.migrate.latest({ directory: './migrations' });
    console.log('✅ Database migrations completed');

    // Run all seeds
    await knex.seed.run({ directory: './seeds' });

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
  // Truncate only transaction and request tables, preserving product data between tests
  await db.raw(
    'TRUNCATE TABLE transactions, topup_requests, topup_responses, epins_inventory, commissions RESTART IDENTITY CASCADE'
  );
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
  }

  // Close database connection last
  await db.destroy();
});
