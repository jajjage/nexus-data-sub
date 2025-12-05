import request from 'supertest';
import app from '../../../src/app';
import db from '../../../src/database/connection';
import { CreateUserInput, UserModel } from '../../../src/models/User';

describe('Referral Links API', () => {
  beforeEach(async () => {
    await db('referral_links').del();
    await db('users').del();
  });

  afterEach(async () => {
    await db('referral_links').del();
    await db('users').del();
  });

  describe('GET /api/v1/dashboard/referrals/link', () => {
    it('should get or create referral link for user', async () => {
      const userData: CreateUserInput = {
        email: 'reflink.user@example.com',
        fullName: 'Referral Link User',
        phoneNumber: '1234567830',
        password: 'Password123!',
        role: 'user',
      };
      const user = await UserModel.create(userData);
      await db('users')
        .where({ id: user.userId })
        .update({ is_verified: true });

      // Login user
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: userData.password })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];

      // Get or create referral link
      const response = await request(app)
        .get('/api/v1/dashboard/referrals/link')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.referralCode).toBeDefined();
      expect(response.body.data.shortCode).toBeDefined();
      expect(response.body.data.referralLink).toBeDefined();

      // Verify it was created in database and is active
      const link = await db('referral_links')
        .where({ user_id: user.userId })
        .first();
      expect(link).toBeDefined();
      expect(link.is_active).toBe(true);
    });

    it('should return existing link if already created', async () => {
      const userData: CreateUserInput = {
        email: 'existing.link@example.com',
        fullName: 'Existing Link User',
        phoneNumber: '1234567831',
        password: 'Password123!',
        role: 'user',
      };
      const user = await UserModel.create(userData);
      await db('users')
        .where({ id: user.userId })
        .update({ is_verified: true });

      // Pre-create a referral link
      const [existingLink] = await db('referral_links')
        .insert({
          user_id: user.userId,
          referral_code: `${user.userId.substring(0, 4).toUpperCase()}-EXISTING`,
          short_code: 'EXISTING',
          is_active: true,
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        })
        .returning('*');

      // Login user
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: userData.password })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];

      // Get referral link
      const response = await request(app)
        .get('/api/v1/dashboard/referrals/link')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.referralCode).toBe(existingLink.referral_code);
      expect(response.body.data.shortCode).toBe(existingLink.short_code);
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard/referrals/link')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/dashboard/referrals/link/regenerate', () => {
    it('should regenerate referral code', async () => {
      const userData: CreateUserInput = {
        email: 'regen.user@example.com',
        fullName: 'Regenerate User',
        phoneNumber: '1234567832',
        password: 'Password123!',
        role: 'user',
      };
      const user = await UserModel.create(userData);
      await db('users')
        .where({ id: user.userId })
        .update({ is_verified: true });

      // Create initial referral link
      const [initialLink] = await db('referral_links')
        .insert({
          user_id: user.userId,
          referral_code: `${user.userId.substring(0, 4).toUpperCase()}-INITIAL`,
          short_code: 'INITIAL',
          is_active: true,
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        })
        .returning('*');

      const initialCode = initialLink.referral_code;

      // Login user
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: userData.password })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];

      // Regenerate code
      const response = await request(app)
        .post('/api/v1/dashboard/referrals/link/regenerate')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.newReferralCode).toBeDefined();
      // New code should be different from old code
      expect(response.body.data.newReferralCode).not.toBe(initialCode);

      // Verify the old referral code no longer exists (service updates the same record)
      const oldLink = await db('referral_links')
        .where({ referral_code: initialCode })
        .first();
      expect(oldLink).toBeUndefined();

      // Verify the user's current link is active and different from initial code
      const currentLink = await db('referral_links')
        .where({ user_id: user.userId })
        .first();
      expect(currentLink).toBeDefined();
      expect(currentLink.referral_code).not.toBe(initialCode);
      expect(currentLink.is_active).toBe(true);
    });
  });

  describe('POST /api/v1/dashboard/referrals/link/deactivate', () => {
    it('should deactivate referral link', async () => {
      const userData: CreateUserInput = {
        email: 'deactivate.user@example.com',
        fullName: 'Deactivate User',
        phoneNumber: '1234567833',
        password: 'Password123!',
        role: 'user',
      };
      const user = await UserModel.create(userData);
      await db('users')
        .where({ id: user.userId })
        .update({ is_verified: true });

      // Create referral link
      await db('referral_links').insert({
        user_id: user.userId,
        referral_code: `${user.userId.substring(0, 4).toUpperCase()}-DEACT`,
        short_code: 'DEACT',
        is_active: true,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

      // Login user
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: userData.password })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];

      // Deactivate link
      const response = await request(app)
        .post('/api/v1/dashboard/referrals/link/deactivate')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify link is deactivated
      const link = await db('referral_links')
        .where({ user_id: user.userId })
        .first();
      expect(link.is_active).toBe(false);
    });
  });
});
