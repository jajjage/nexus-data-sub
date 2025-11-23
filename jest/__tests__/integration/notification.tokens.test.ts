import request from 'supertest';
import app from '../../../src/app';
import db from '../../../src/database/connection';
import { CreateUserInput, UserModel } from '../../../src/models/User';
import { generateUUID } from '../../../src/utils/crypto';

describe('Notification Token Endpoints', () => {
  let userId: string;
  let authToken: string;
  let testToken: string;
  const userPassword = 'Password123!';
  const userEmail = `notification.test.${generateUUID()}@example.com`;

  beforeEach(async () => {
    // 1. Create a test user
    const userData: CreateUserInput = {
      email: userEmail,
      password: userPassword,
      fullName: 'Notify Test User',
      phoneNumber: '1234567890',
      role: 'user',
    };
    const user = await UserModel.create(userData);
    userId = user.userId;
    await db('users').where({ id: userId }).update({ is_verified: true });

    // 2. Log in the user to get a valid token
    const loginRes = await request(app)
      .post('/api/v1/mobile/auth/login')
      .send({ email: userEmail, password: userPassword });

    authToken = loginRes.body.data.accessToken;
    testToken = 'test-fcm-token-' + generateUUID();
  });

  afterEach(async () => {
    await db('push_tokens').where({ user_id: userId }).del();
    await db('users').where({ id: userId }).del();
  });

  it('should register a push token', async () => {
    const res = await request(app)
      .post('/api/v1/notifications/tokens')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ token: testToken, platform: 'web' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.platform).toBe('web');
    expect(res.body.data.status).toBe('active');
  });

  it('should unlink a push token', async () => {
    // First, register the token via the endpoint
    await request(app)
      .post('/api/v1/notifications/tokens')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ token: testToken, platform: 'web' });

    // Now, unlink it
    const res = await request(app)
      .post('/api/v1/notifications/tokens/unlink')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ token: testToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBe(testToken);

    // Check DB status
    const dbToken = await db('push_tokens').where({ token: testToken }).first();
    expect(dbToken.status).toBe('unregistered');
  });
});
