import request from 'supertest';
import app from '../../../src/app';
import db from '../../../src/database/connection';
import { CreateUserInput, UserModel } from '../../../src/models/User';

describe('Rewards API', () => {
  beforeEach(async () => {
    await db('user_badges').del();
    await db('badges').del();
    await db('rewards').del();
    await db('referrals').del();
    await db('referral_links').del();
    await db('users').del();
  });

  afterEach(async () => {
    await db('user_badges').del();
    await db('badges').del();
    await db('rewards').del();
    await db('referrals').del();
    await db('referral_links').del();
    await db('users').del();
  });

  describe('GET /api/v1/dashboard/rewards', () => {
    it('should get rewards summary for authenticated user', async () => {
      const userData: CreateUserInput = {
        email: 'rewards.user@example.com',
        fullName: 'Rewards Test User',
        phoneNumber: '1234567820',
        password: 'Password123!',
        role: 'user',
      };
      const user = await UserModel.create(userData);
      await db('users')
        .where({ id: user.userId })
        .update({ is_verified: true });

      // Create some rewards for user
      await db('rewards').insert({
        user_id: user.userId,
        points: 50,
        reason: 'referral_signup',
        status: 'credited',
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

      // Login user
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: userData.password })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];

      // Get rewards summary
      const response = await request(app)
        .get('/api/v1/dashboard/rewards')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalPoints).toBeDefined();
      expect(response.body.data.pendingPoints).toBeDefined();
      expect(response.body.data.creditedPoints).toBeDefined();
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard/rewards')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/dashboard/rewards/badges', () => {
    it('should get user badges', async () => {
      const userData: CreateUserInput = {
        email: 'badges.user@example.com',
        fullName: 'Badges Test User',
        phoneNumber: '1234567821',
        password: 'Password123!',
        role: 'user',
      };
      const user = await UserModel.create(userData);
      await db('users')
        .where({ id: user.userId })
        .update({ is_verified: true });

      // Create a badge
      const [badge] = await db('badges')
        .insert({
          name: 'First Referral',
          description: 'Earned first referral',
          required_action: 'first_referral',
          required_value: 1,
          category: 'achievement',
          is_active: true,
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        })
        .returning('*');

      // Assign badge to user
      await db('user_badges').insert({
        user_id: user.userId,
        badge_id: badge.id,
        earned_at: db.fn.now(),
        created_at: db.fn.now(),
      });

      // Login user
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: userData.password })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];

      // Get user badges
      const response = await request(app)
        .get('/api/v1/dashboard/rewards/badges')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data.badges)).toBe(true);
      expect(response.body.data.badges.length).toBe(1);
      expect(response.body.data.badges[0].name).toBe('First Referral');
    });

    it('should return empty array if user has no badges', async () => {
      const userData: CreateUserInput = {
        email: 'no.badges.user@example.com',
        fullName: 'No Badges User',
        phoneNumber: '1234567822',
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

      // Get user badges
      const response = await request(app)
        .get('/api/v1/dashboard/rewards/badges')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data.badges)).toBe(true);
      expect(response.body.data.badges.length).toBe(0);
    });
  });

  describe('GET /api/v1/dashboard/rewards/leaderboard', () => {
    it('should get points leaderboard', async () => {
      // Create multiple users with different points
      for (let i = 0; i < 3; i++) {
        const userData: CreateUserInput = {
          email: `leaderboard.user${i}@example.com`,
          fullName: `Leaderboard User ${i}`,
          phoneNumber: `123456823${i}`,
          password: 'Password123!',
          role: 'user',
        };
        const user = await UserModel.create(userData);

        // Create rewards with different points and update user's total_points
        const points = (i + 1) * 100;
        await db('rewards').insert({
          user_id: user.userId,
          points,
          reason: 'referral_signup',
          status: 'credited',
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        });
        await db('users')
          .where({ id: user.userId })
          .update({ total_points: points });
      }

      const response = await request(app)
        .get('/api/v1/dashboard/rewards/leaderboard?limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data.leaderboard)).toBe(true);
      expect(response.body.data.leaderboard.length).toBeGreaterThan(0);
      // Verify sorted by points (descending)
      if (response.body.data.leaderboard.length > 1) {
        const lb = response.body.data.leaderboard;
        expect(lb[0].totalPoints).toBeGreaterThanOrEqual(lb[1].totalPoints);
      }
    });

    it('should respect limit parameter', async () => {
      // Create 5 users
      for (let i = 0; i < 5; i++) {
        const userData: CreateUserInput = {
          email: `limit.user${i}@example.com`,
          fullName: `Limit User ${i}`,
          phoneNumber: `123456824${i}`,
          password: 'Password123!',
          role: 'user',
        };
        const user = await UserModel.create(userData);

        const points = 100;
        await db('rewards').insert({
          user_id: user.userId,
          points,
          reason: 'referral_signup',
          status: 'credited',
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        });
        await db('users')
          .where({ id: user.userId })
          .update({ total_points: points });
      }

      const response = await request(app)
        .get('/api/v1/dashboard/rewards/leaderboard?limit=3')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.leaderboard.length).toBeLessThanOrEqual(3);
    });
  });
});
