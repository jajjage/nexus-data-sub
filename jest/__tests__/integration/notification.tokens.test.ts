import request from 'supertest';
import app from '../../../src/app';
import db from '../../../src/database/connection';
import { generateUUID } from '../../../src/utils/crypto';

describe('Notification Token Endpoints', () => {
  let userId: string;
  let authToken: string;
  let testToken: string;

  beforeAll(async () => {
    // Create a test user and get auth token (assume helper exists)
    userId = generateUUID();
    testToken = 'test-fcm-token-' + generateUUID();
    // Insert user directly
    await db('users').insert({
      id: userId,
      email: `notification.tokens.test+${userId}@test.com`,
      password: 'hashed-password',
      role: 'user',
      is_verified: true,
    });
    // Assume we have a helper to get a JWT for this user
    // If not, you may need to mock auth middleware or use a test token
    authToken = 'test-auth-token'; // Replace with real token if needed
  });

  afterAll(async () => {
    await db('users').where({ id: userId }).del();
    await db('push_tokens').where({ user_id: userId }).del();
  });

  it('should register a push token', async () => {
    const res = await request(app)
      .post('/notifications/tokens')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ token: testToken, platform: 'web' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.platform).toBe('web');
    expect(res.body.data.status).toBe('active');
  });

  it('should unlink a push token', async () => {
    // First, register the token
    await db('push_tokens').insert({
      id: generateUUID(),
      user_id: userId,
      token: testToken,
      platform: 'web',
      status: 'active',
      last_seen: new Date(),
    });
    const res = await request(app)
      .post('/notifications/tokens/unlink')
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
