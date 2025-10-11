import request from 'supertest';
import app from '../../../src/app';
import { UserModel, CreateUserInput } from '../../../src/models/User';
import db from '../../../src/database/connection';
import speakeasy from 'speakeasy';

describe('2FA Integration', () => {
  let authToken: string;
  let userId: string;
  let refreshToken: string;

  beforeEach(async () => {
    // Create a user with a role that requires 2FA
    const userData: CreateUserInput = {
      email: 'admin2fa@example.com',
      password: 'Password123!',
      role: 'admin',
    };

    const user = await UserModel.create(userData);
    await db('users').where({ id: user.userId }).update({ is_verified: true });
    userId = user.userId;

    // Login to get an auth token
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send(userData);

    const setCookieHeader = response.header['set-cookie'];
    if (setCookieHeader) {
      const cookiesArray = Array.isArray(setCookieHeader)
        ? setCookieHeader
        : [setCookieHeader];
      const accessTokenCookie = cookiesArray.find((cookie: string) =>
        cookie.startsWith('accessToken=')
      );
      const refreshTokenCookie = cookiesArray.find((cookie: string) =>
        cookie.startsWith('refreshToken=')
      );
      if (accessTokenCookie)
        authToken = accessTokenCookie.split(';')[0].split('=')[1];
      if (refreshTokenCookie)
        refreshToken = refreshTokenCookie.split(';')[0].split('=')[1];
    }
  });

  it('should correctly follow the 2FA setup and login flow', async () => {
    // 1. Setup 2FA
    const setupResponse = await request(app)
      .post('/api/v1/2fa/setup')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(setupResponse.body.success).toBe(true);
    expect(setupResponse.body.data.qrCode).toBeDefined();

    // 2. Enable 2FA
    // Fetch the secret from the database
    const user = await db('users')
      .where({ id: userId })
      .select('two_factor_secret')
      .first();
    const secret = user.two_factor_secret;

    // Generate a TOTP code
    const totpCode = speakeasy.totp({
      secret: secret,
      encoding: 'base32',
    });

    // Enable 2FA
    const enableResponse = await request(app)
      .post('/api/v1/2fa/enable')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ totpCode: totpCode })
      .expect(200);

    expect(enableResponse.body.success).toBe(true);
    expect(enableResponse.body.data.backupCodes).toBeInstanceOf(Array);

    // 3. Logout
    await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', `refreshToken=${refreshToken}`)
      .expect(200);

    // 4. Login with 2FA
    const newTotpCode = speakeasy.totp({
      secret: secret,
      encoding: 'base32',
    });

    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin2fa@example.com',
        password: 'Password123!',
        totpCode: newTotpCode,
      })
      .expect(200);

    expect(loginResponse.body.success).toBe(true);
    expect(loginResponse.header['set-cookie']).toBeDefined();
  });
});
