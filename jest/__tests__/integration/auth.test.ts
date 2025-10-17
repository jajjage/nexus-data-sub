import request from 'supertest';
import app from '../../../src/app';
import db from '../../../src/database/connection';
import { CreateUserInput, UserModel } from '../../../src/models/User';
import { TotpService } from '../../../src/services/topt.service';
import { getCookie } from '../../test-helpers';

describe('Auth API', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test.register@example.com',
        fullName: 'Test Register',
        phoneNumber: '1234567890',
        password: 'Password123!',
        role: 'user',
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(userData.email);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const userData: CreateUserInput = {
        email: 'test.login@example.com',
        fullName: 'Test Login',
        phoneNumber: '1234567890',
        password: 'Password123!',
        role: 'user',
      };
      await UserModel.create(userData);
      await db('users')
        .where({ email: userData.email })
        .update({ is_verified: true });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: userData.email, password: userData.password })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.header['set-cookie']).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh access token with a valid refresh token', async () => {
      const userData: CreateUserInput = {
        email: 'test.refresh@example.com',
        fullName: 'Test Refresh',
        phoneNumber: '1234567890',
        password: 'Password123!',
        role: 'user',
      };
      await UserModel.create(userData);
      await db('users')
        .where({ email: userData.email })
        .update({ is_verified: true });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: userData.email, password: userData.password });

      const refreshToken = getCookie(loginResponse, 'refreshToken');

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', `refreshToken=${refreshToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.header['set-cookie']).toBeDefined();
    });
  });

  describe('GET /api/v1/auth/verify', () => {
    it('should verify an email with a valid token', async () => {
      // Email verification is disabled; calling verify should return 400
      const response = await request(app)
        .get(`/api/v1/auth/verify?token=some-token`)
        .expect(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/resend-verification', () => {
    it('should resend verification email for an unverified user', async () => {
      // Resend verification is disabled; expect failure
      const userData: CreateUserInput = {
        email: 'test.resend@example.com',
        fullName: 'Test Resend',
        phoneNumber: '1234567890',
        password: 'Password123!',
        role: 'user',
      };
      await UserModel.create(userData);

      const response = await request(app)
        .post('/api/v1/auth/resend-verification')
        .send({ email: userData.email })
        .expect(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully', async () => {
      const userData: CreateUserInput = {
        email: 'test.logout@example.com',
        fullName: 'Test Logout',
        phoneNumber: '1234567890',
        password: 'Password123!',
        role: 'user',
      };
      await UserModel.create(userData);
      await db('users')
        .where({ email: userData.email })
        .update({ is_verified: true });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: userData.email, password: userData.password });

      const refreshToken = getCookie(loginResponse, 'refreshToken');

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', `refreshToken=${refreshToken}`)
        .expect(200);
      expect(response.body.success).toBe(true);
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
        .post('/api/v1/auth/login')
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
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
          backupCode: plainBackupCodes[0],
          reset: false,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.header['set-cookie']).toBeDefined();
    });
  });
});
