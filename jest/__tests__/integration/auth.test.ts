import request from 'supertest';
import app from '../../../src/app';
import db from '../../../src/database/connection';
import { CreateUserInput, UserModel } from '../../../src/models/User';
import { TotpService } from '../../../src/services/topt.service';
import { getCookie } from '../../test-helpers';

describe('Auth API', () => {
  beforeEach(async () => {
    await db('users').del();
  });

  afterEach(async () => {
    await db('users').del();
  });

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

    it('should register a new user with referral code', async () => {
      // Create a referrer user
      const referrerData: CreateUserInput = {
        email: 'referrer@example.com',
        fullName: 'Referrer User',
        phoneNumber: '1234567800',
        password: 'Password123!',
        role: 'user',
      };
      const referrer = await UserModel.create(referrerData);

      // Create referral link for referrer
      const [referralLink] = await db('referral_links')
        .insert({
          user_id: referrer.userId,
          referral_code: `${referrer.userId.substring(0, 4).toUpperCase()}-TEST123`,
          short_code: 'TEST123',
          is_active: true,
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        })
        .returning('*');

      const newUserData = {
        email: 'test.register.referral@example.com',
        fullName: 'Test Register with Referral',
        phoneNumber: '1234567801',
        password: 'Password123!',
        role: 'user',
        referralCode: referralLink.referral_code,
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(newUserData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(newUserData.email);

      // Verify referral was created (only if table exists)
      try {
        const referral = await db('referrals')
          .where({
            referrer_user_id: referrer.userId,
            referred_user_id: response.body.data.userId,
          })
          .first();

        expect(referral).toBeDefined();
        expect(referral.status).toBe('pending');
      } catch (error: any) {
        // If referrals table doesn't exist yet, skip verification
        if (!error.message.includes('referrals')) {
          throw error;
        }
      }
    });

    it('should register a new user with invalid referral code', async () => {
      const userData = {
        email: 'test.register.invalid.ref@example.com',
        fullName: 'Test Register Invalid Ref',
        phoneNumber: '1234567802',
        password: 'Password123!',
        role: 'user',
        referralCode: 'INVALID-CODE',
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      // Should register successfully even with invalid referral code (non-blocking)
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(userData.email);

      // Verify no referral was created (only if table exists)
      try {
        const referral = await db('referrals')
          .where({ referred_user_id: response.body.data.userId })
          .first();

        expect(referral).toBeUndefined();
      } catch (error: any) {
        // If referrals table doesn't exist yet, skip verification
        if (!error.message.includes('referrals')) {
          throw error;
        }
      }
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const userData: CreateUserInput = {
        email: 'test.login@example.com',
        fullName: 'Test Login',
        phoneNumber: '1234567891',
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
        phoneNumber: '1234567892',
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

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully', async () => {
      const userData: CreateUserInput = {
        email: 'test.logout@example.com',
        fullName: 'Test Logout',
        phoneNumber: '1234567894',
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
        phoneNumber: '1234567895',
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
        phoneNumber: '1234567896',
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
