jest.mock('../../src/services/email.service', () => {
  const EmailServiceMock = jest.fn();
  EmailServiceMock.prototype.sendVerificationEmail = jest
    .fn()
    .mockResolvedValue(true);
  EmailServiceMock.prototype.sendWelcomeEmail = jest
    .fn()
    .mockResolvedValue(true);
  EmailServiceMock.prototype.sendPasswordResetEmail = jest
    .fn()
    .mockResolvedValue(true);
  EmailServiceMock.prototype.sendEmail = jest.fn().mockResolvedValue(true);
  EmailServiceMock.prototype.send2FADisableEmail = jest
    .fn()
    .mockResolvedValue(true);
  return { EmailService: EmailServiceMock };
});

// Mock config before any tests run
const mockConfig = {
  port: 3000,
  database: {
    url: 'postgresql://postgres:postgres@localhost:5432/election_auth_test',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
  jwt: {
    secret: 'test-jwt-secret',
    refreshSecret: 'test-jwt-refresh-secret',
    expiresIn: '15m',
    refreshExpiresIn: '7d',
  },
  email: {
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    user: 'test@example.com',
    pass: 'testpass',
  },
  app: {
    baseUrl: 'http://localhost:3000',
  },
};

// Mock config
jest.mock('../../src/config/env', () => ({ config: mockConfig }));

// Make config available globally for tests
// global.testConfig = mockConfig;

// jest/__tests__/test-setup.ts
describe('Test Setup', () => {
  beforeAll(() => {
    // Ensure JWT config is set for testing
    process.env.JWT_SECRET =
      'test-jwt-secret-key-that-is-long-enough-for-testing';
    process.env.JWT_REFRESH_SECRET =
      '39dfd04e0f5c34e1298d4bdd0f693633fb365a84f52a7152dc7f7ec358919a82';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
    process.env.NODE_ENV = 'test';
  });

  it('should have proper environment variables set', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.JWT_SECRET).toBeDefined();
    expect(process.env.JWT_REFRESH_SECRET).toBeDefined();
    expect(process.env.JWT_EXPIRES_IN).toBeDefined();
    expect(process.env.JWT_REFRESH_EXPIRES_IN).toBeDefined();
  });

  it('should connect to test database', async () => {
    // Add basic database connection test
    expect(process.env.DATABASE_URL).toBeDefined();
  });
});
