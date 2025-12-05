import request from 'supertest';
import app from '../../../src/app';
import db from '../../../src/database/connection';
import { CreateUserInput, UserModel } from '../../../src/models/User';

describe('Referrals API', () => {
  beforeEach(async () => {
    // Clean the tables before each test
    await db('referrals').del();
    await db('referral_links').del();
    await db('users').del();
  });

  afterEach(async () => {
    // Clean the tables after each test
    await db('referrals').del();
    await db('referral_links').del();
    await db('users').del();
  });

  describe('POST /api/v1/dashboard/referrals/_admin/create (Admin Only)', () => {
    it('should reject non-authenticated requests', async () => {
      const referrerData: CreateUserInput = {
        email: 'referrer.noauth@example.com',
        fullName: 'Referrer User',
        phoneNumber: '1234567901',
        password: 'Password123!',
        role: 'user',
      };
      const referrer = await UserModel.create(referrerData);

      const referredData: CreateUserInput = {
        email: 'referred.noauth@example.com',
        fullName: 'Referred User',
        phoneNumber: '1234567902',
        password: 'Password123!',
        role: 'user',
      };
      const referred = await UserModel.create(referredData);

      // Try to create referral without authentication
      const response = await request(app)
        .post('/api/v1/dashboard/referrals/_admin/create')
        .send({
          referrerUserId: referrer.userId,
          referredUserId: referred.userId,
          rewardAmount: 50.0,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/dashboard/referrals (User)', () => {
    it('should get user referrals stats', async () => {
      // Create users
      const referrerData: CreateUserInput = {
        email: 'referrer.list@example.com',
        fullName: 'Referrer User',
        phoneNumber: '1234567909',
        password: 'Password123!',
        role: 'user',
      };
      const referrer = await UserModel.create(referrerData);
      await db('users')
        .where({ id: referrer.userId })
        .update({ is_verified: true });

      const referredData: CreateUserInput = {
        email: 'referred.list@example.com',
        fullName: 'Referred User',
        phoneNumber: '1234567910',
        password: 'Password123!',
        role: 'user',
      };
      const referred = await UserModel.create(referredData);

      // Create referral link and referral
      await db('referral_links').insert({
        user_id: referrer.userId,
        referral_code: `${referrer.userId.substring(0, 4).toUpperCase()}-LIST1`,
        short_code: 'LIST1',
        is_active: true,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

      await db('referrals').insert({
        referrer_user_id: referrer.userId,
        referred_user_id: referred.userId,
        reward_amount: 25.0,
        status: 'pending',
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

      // Login as referrer to get auth cookies
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: referrer.email, password: referrerData.password })
        .expect(200);

      // Get cookies from login
      const cookies = loginResponse.headers['set-cookie'];

      // Get referral stats
      const response = await request(app)
        .get('/api/v1/dashboard/referrals')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalReferrals).toBeDefined();
      expect(response.body.data.activeReferrals).toBeDefined();
      expect(response.body.data.completedReferrals).toBeDefined();
      expect(response.body.data.totalReferrals).toBe(1);
    });
  });

  describe('GET /api/v1/dashboard/referrals/top (Public)', () => {
    it('should get top referrers leaderboard', async () => {
      // Create multiple referrers with different completion levels
      const referrers = [];
      for (let i = 0; i < 3; i++) {
        const userData: CreateUserInput = {
          email: `top.referrer${i}@example.com`,
          fullName: `Top Referrer ${i}`,
          phoneNumber: `123456791${i}`,
          password: 'Password123!',
          role: 'user',
        };
        const user = await UserModel.create(userData);
        referrers.push(user);

        // Create referral link
        await db('referral_links').insert({
          user_id: user.userId,
          referral_code: `${user.userId.substring(0, 4).toUpperCase()}-TOP${i}`,
          short_code: `TOP${i}`,
          is_active: true,
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        });
      }

      // Create referred users for first referrer (2 completed)
      for (let i = 0; i < 2; i++) {
        const userData: CreateUserInput = {
          email: `referred.top${i}@example.com`,
          fullName: `Referred Top ${i}`,
          phoneNumber: `123456800${i}`,
          password: 'Password123!',
          role: 'user',
        };
        const referred = await UserModel.create(userData);

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [referral] = await db('referrals')
          .insert({
            referrer_user_id: referrers[0].userId,
            referred_user_id: referred.userId,
            reward_amount: 50.0,
            status: 'completed',
            created_at: db.fn.now(),
            updated_at: db.fn.now(),
          })
          .returning('*');

        // Update user referral count
        await db('users')
          .where({ id: referrers[0].userId })
          .increment('referral_count', 1);
      }

      // Create referred users for second referrer (1 completed)
      for (let i = 0; i < 1; i++) {
        const userData: CreateUserInput = {
          email: `referred.topalt${i}@example.com`,
          fullName: `Referred TopAlt ${i}`,
          phoneNumber: `123456801${i}`,
          password: 'Password123!',
          role: 'user',
        };
        const referred = await UserModel.create(userData);

        await db('referrals').insert({
          referrer_user_id: referrers[1].userId,
          referred_user_id: referred.userId,
          reward_amount: 50.0,
          status: 'completed',
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        });

        // Update user referral count
        await db('users')
          .where({ id: referrers[1].userId })
          .increment('referral_count', 1);
      }

      // Get top referrers (requires authentication)
      // Create a test user and login first
      const testUserData: CreateUserInput = {
        email: 'test.leaderboard@example.com',
        fullName: 'Test User',
        phoneNumber: '1234567850',
        password: 'Password123!',
        role: 'user',
      };
      await UserModel.create(testUserData);
      await db('users')
        .where({ email: testUserData.email })
        .update({ is_verified: true });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUserData.email, password: testUserData.password })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];

      const response = await request(app)
        .get('/api/v1/dashboard/referrals/leaderboard?limit=10')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.leaderboard).toBeDefined();
      expect(Array.isArray(response.body.data.leaderboard)).toBe(true);
      expect(response.body.data.leaderboard[0].referralCount).toBe(2);
      expect(response.body.data.leaderboard[0].referralCount).toEqual(
        expect.any(Number)
      );
    });
  });
});
