import dotenv from 'dotenv';

dotenv.config();

// Validate required secrets at startup
const jwtSecret = process.env.JWT_SECRET;
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

if (
  !jwtSecret ||
  jwtSecret === 'your-super-secret-jwt-key-change-in-production'
) {
  throw new Error(
    'JWT_SECRET environment variable must be set to a secure value'
  );
}
if (
  !jwtRefreshSecret ||
  jwtRefreshSecret === 'your-super-secret-refresh-key-change-in-production'
) {
  throw new Error(
    'JWT_REFRESH_SECRET environment variable must be set to a secure value'
  );
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/election_auth',
    max: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10),
    connectionTimeoutMillis: parseInt(
      process.env.DB_CONNECTION_TIMEOUT_MS || '2000',
      10
    ),
  },
  // JWT secrets are validated at startup in jwt.service.ts
  // to ensure the app doesn't run with default secrets
  jwt: {
    secret:
      process.env.JWT_SECRET ||
      'your-super-secret-jwt-key-change-in-production',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ||
      'your-super-secret-refresh-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  email: {
    host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
  },
  app: {
    baseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
  },
  webhooks: {
    basePath: process.env.WEBHOOK_BASE_PATH || '/webhooks',
    palmpay: {
      signatureHeader:
        process.env.PALMPAY_SIGNATURE_HEADER || 'x-palmpay-signature',
      secret: process.env.PALMPAY_WEBHOOK_SECRET || '',
    },
  },
  palmpay: {
    baseUrl: process.env.PALMPAY_API_BASE || 'https://api.palmpay.com',
    apiKey: process.env.PALMPAY_API_KEY || '',
    timeout: parseInt(process.env.PALMPAY_API_TIMEOUT || '10000', 10),
  },
  notifications: {
    // Comma-separated list of global topics to auto-subscribe tokens to (e.g. "all,news")
    autoSubscribeTopics: (
      process.env.NOTIFICATIONS_AUTO_SUBSCRIBE_TOPICS || 'all'
    )
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),
    // Whether to auto-subscribe tokens to a role-specific topic (role_<role>)
    subscribeRoleTopic:
      process.env.NOTIFICATIONS_SUBSCRIBE_ROLE_TOPIC !== 'false',
  },
};
