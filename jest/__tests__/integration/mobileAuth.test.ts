import request from 'supertest';
import app from '../../../src/app';
import db from '../../../src/database/connection';
import { CreateUserInput, UserModel } from '../../../src/models/User';
import { TotpService } from '../../../src/services/topt.service';

describe('Mobile Auth API', () => {
  describe('POST /api/v1/mobile/auth/login', () => {
    it('should login successfully and return tokens', async () => {
      const userData: CreateUserInput = {
        email: 'test.mobile.login@example.com',
        fullName: 'Test Mobile Login',
        phoneNumber: '1234567890',
        password: 'Password123!',
        role: 'user',
      };
      await UserModel.create(userData);
      await db('users')
        .where({ email: userData.email })
        .update({ is_verified: true });

      const response = await request(app)
        .post('/api/v1/mobile/auth/login')
        .send({ email: userData.email, password: userData.password })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should fail with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/mobile/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'wrongpassword' })
        .expect(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/mobile/auth/refresh', () => {
    it('should refresh the access token with a valid refresh token', async () => {
      const userData: CreateUserInput = {
        email: 'test.mobile.refresh@example.com',
        fullName: 'Test Mobile Refresh',
        phoneNumber: '1234567890',
        password: 'Password123!',
        role: 'user',
      };
      await UserModel.create(userData);
      await db('users')
        .where({ email: userData.email })
        .update({ is_verified: true });

      const loginResponse = await request(app)
        .post('/api/v1/mobile/auth/login')
        .send({ email: userData.email, password: userData.password });

      const refreshToken = loginResponse.body.data.refreshToken;

      const response = await request(app)
        .post('/api/v1/mobile/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
    });

    it('should fail with an invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/mobile/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('2FA Login', () => {
    it('should force 2FA re-configuration when logging in with a backup code', async () => {
      const userData: CreateUserInput = {
        email: 'test.2fa@example.com',
        fullName: 'Test 2FA',
        phoneNumber: '1234567890',
        password: 'Password123!',
        role: 'staff',
      };
      const user = await UserModel.create(userData);
      await db('users')
        .where({ id: user.userId })
        .update({ is_verified: true });

      const { plain: plainBackupCodes, hashed: hashedBackupCodes } =
        TotpService.generateBackupCodes();
      const dbBackupCodes = JSON.stringify(
        hashedBackupCodes.map(code => ({ code, used: false }))
      );
      await UserModel.enable2FA(user.userId, 'testsecret', dbBackupCodes);

      const response = await request(app)
        .post('/api/v1/mobile/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
          backupCode: plainBackupCodes[0],
          reset: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reconfigure2fa).toBe(true);
      expect(response.body.data.qrCode).toBeDefined();
      expect(response.body.data.backupCodes).toBeInstanceOf(Array);
    });
  });

  describe('Login With 2FA Disable', () => {
    it('should allow disabling 2fa while logging in with a backup code', async () => {
      const userData: CreateUserInput = {
        email: 'test.2fadisable@example.com',
        fullName: 'Test 2FADisable',
        phoneNumber: '1234567890',
        password: 'Password123!',
        role: 'staff',
      };
      const user = await UserModel.create(userData);
      await db('users')
        .where({ id: user.userId })
        .update({ is_verified: true });

      const { plain: plainBackupCodes, hashed: hashedBackupCodes } =
        TotpService.generateBackupCodes();
      const dbBackupCodes = JSON.stringify(
        hashedBackupCodes.map(code => ({ code, used: false }))
      );
      await UserModel.enable2FA(user.userId, 'testsecret', dbBackupCodes);

      const response = await request(app)
        .post('/api/v1/mobile/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
          backupCode: plainBackupCodes[0],
          reset: false,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });
  });
});
