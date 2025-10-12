'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const crypto_1 = __importDefault(require('crypto'));
const redis_1 = require('../src/database/redis');
const connection_1 = __importDefault(require('../src/database/connection'));
let dbClosed = false;
const dotenv_1 = __importDefault(require('dotenv'));
dotenv_1.default.config({ path: '.env.test' });
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-purposes-only';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  'test-jwt-refresh-secret-key-for-testing-purposes-only';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '5432';
process.env.DB_NAME = process.env.DB_NAME || 'test_db';
process.env.DB_USER = process.env.DB_USER || 'test_user';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test_password';
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
process.env.EMAIL_SERVICE = 'test';
process.env.SMTP_HOST = 'smtp.test.com';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test@test.com';
process.env.SMTP_PASSWORD = 'test-password';
jest.setTimeout(30000);
global.beforeAll(async () => {
  try {
    const connection = await connection_1.default.connect();
    await connection.query('SELECT 1');
    connection.release();
    console.log('✅ Connected to Test Database');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
  const redis = redis_1.redisClientInstance.getClient();
  await redis.ping();
  await connection_1.default.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
  await connection_1.default.query(`
    CREATE TABLE IF NOT EXISTS permissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await connection_1.default.query(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
      permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (role_id, permission_id)
    )
  `);
  await connection_1.default.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(255),
      role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
      is_verified BOOLEAN DEFAULT FALSE,
      verification_token VARCHAR(255) UNIQUE,
      two_factor_secret VARCHAR(255) DEFAULT NULL,
      two_factor_enabled BOOLEAN DEFAULT FALSE,
      password_reset_token VARCHAR(255),
      password_reset_expires TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await connection_1.default.query(`
    CREATE TABLE IF NOT EXISTS backup_code (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      two_factor_backup_codes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await connection_1.default.query(`
    INSERT INTO roles (id, name, description) VALUES
    ('c69c77a0-b191-4ba5-a491-e0343322efdd', 'admin', 'System administrator with full access'),
    ('49a27a7e-299b-47e8-b5a3-dc46f6506440', 'staff', 'Election data staff'),
    ('07bcd0bc-75b2-479c-8636-f7a9846ae480', 'user', 'Normal application user')
    ON CONFLICT (name) DO NOTHING;
  `);
  await connection_1.default.query(`
    INSERT INTO permissions (name, description) VALUES
    ('reports.create', 'Create new election reports'),
    ('reports.read.own', 'View own election reports'),
    ('reports.read.all', 'View all election reports'),
    ('reports.read.public', 'View public election reports'),
    ('reports.update.own', 'Update own election reports'),
    ('reports.update.all', 'Update all election reports'),
    ('reports.delete.own', 'Delete own election reports'),
    ('reports.delete.all', 'Delete all election reports'),
    ('reports.verify', 'Verify election reports'),
    ('incidents.create', 'Create new incidents'),
    ('incidents.read', 'View incidents'),
    ('incidents.read.all', 'View all incidents'),
    ('incidents.read.public', 'View public incidents'),
    ('incidents.update.own', 'Update own incidents'),
    ('incidents.update.all', 'Update all incidents'),
    ('incidents.delete.all', 'Delete all incidents'),
    ('users.create', 'Create new users'),
    ('users.read.all', 'View all users'),
    ('users.update.all', 'Update all users'),
    ('users.delete.all', 'Delete all users'),
    ('roles.assign', 'Assign roles to users'),
    ('profile.read', 'View own profile'),
    ('profile.update', 'Update own profile'),
    ('system.settings', 'Manage system settings')
    ON CONFLICT (name) DO NOTHING;
  `);
  await connection_1.default.query(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r, permissions p
    WHERE r.name = 'user' AND p.name IN (
      'reports.create',
      'reports.read.own',
      'reports.update.own',
      'reports.delete.own',
      'incidents.read',
      'profile.read',
      'profile.update'
    )
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  `);
  await connection_1.default.query(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r, permissions p
    WHERE r.name = 'staff' AND p.name IN (
      'reports.read.all',
      'reports.verify',
      'incidents.create',
      'incidents.read.all',
      'incidents.update.own',
      'profile.read',
      'profile.update'
    )
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  `);
  await connection_1.default.query(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r, permissions p
    -- No separate observer role; public read permissions can be assigned to 'user' as needed
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  `);
  await connection_1.default.query(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r, permissions p
    WHERE r.name = 'admin' AND p.name IN (
      'reports.create',
      'reports.read.all',
      'reports.update.all',
      'reports.delete.all',
      'reports.verify',
      'incidents.create',
      'incidents.read.all',
      'incidents.update.all',
      'incidents.delete.all',
      'users.create',
      'users.read.all',
      'users.update.all',
      'users.delete.all',
      'roles.assign',
      'profile.read',
      'profile.update',
      'system.settings'
    )
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  `);
});
global.beforeEach(async () => {
  await connection_1.default.query('DELETE FROM backup_code');
  await connection_1.default.query('DELETE FROM users');
});
global.afterAll(async () => {
  if (!dbClosed) {
    try {
      await connection_1.default.query('DROP TABLE IF EXISTS role_permissions');
      await connection_1.default.query('DROP TABLE IF EXISTS permissions');
      await connection_1.default.query('DROP TABLE IF EXISTS backup_code');
      await connection_1.default.query('DROP TABLE IF EXISTS users');
      await connection_1.default.query('DROP TABLE IF EXISTS roles');
      await connection_1.default.end();
      dbClosed = true;
      console.log('Database pool closed successfully.');
    } catch (error) {
      console.error('Error closing database pool:', error);
    }
  }
  const redis = redis_1.redisClientInstance.getClient();
  const keys = await redis.keys('session:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  const userKeys = await redis.keys('user_sessions:*');
  if (userKeys.length > 0) {
    await redis.del(...userKeys);
  }
  const refreshKeys = await redis.keys('refresh_token:*');
  if (refreshKeys.length > 0) {
    await redis.del(...refreshKeys);
  }
  if (redis_1.redisClientInstance.getClient().status === 'ready') {
    await redis_1.redisClientInstance.disconnect();
    console.log('Redis connection closed successfully.');
  }
});
Object.defineProperty(global, 'crypto', {
  value: {
    ...crypto_1.default,
    subtle: crypto_1.default.webcrypto.subtle,
    getRandomValues: arr => crypto_1.default.randomBytes(arr.length),
    createHash: () => crypto_1.default.createHash('sha256'),
  },
});
//# sourceMappingURL=setup.js.map
