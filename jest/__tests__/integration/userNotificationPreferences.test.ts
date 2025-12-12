import request from 'supertest';
import app from '../../../src/app';
import db from '../../../src/database/connection';
import { CreateUserInput, UserModel } from '../../../src/models/User';
import { getCookie } from '../../test-helpers';

describe('User Notification Preferences - Full Integration Tests', () => {
  let user1: any;
  let user1Token: string;
  let user2: any;
  let user2Token: string;

  beforeAll(async () => {
    // Create first test user
    const user1Data: CreateUserInput = {
      email: 'user1.preferences@test.com',
      fullName: 'User One Preferences',
      phoneNumber: '1111111111',
      password: 'UserPassword123!',
      role: 'user',
    };
    const createdUser1 = await UserModel.create(user1Data);
    user1 = await UserModel.findForAuth(createdUser1.email);

    // Login as user 1
    const user1Res = await request(app).post('/api/v1/auth/login').send({
      email: user1Data.email,
      password: user1Data.password,
    });
    user1Token = getCookie(user1Res, 'accessToken') as string;

    // Create second test user
    const user2Data: CreateUserInput = {
      email: 'user2.preferences@test.com',
      fullName: 'User Two Preferences',
      phoneNumber: '2222222222',
      password: 'UserPassword123!',
      role: 'user',
    };
    const createdUser2 = await UserModel.create(user2Data);
    user2 = await UserModel.findForAuth(createdUser2.email);

    // Login as user 2
    const user2Res = await request(app).post('/api/v1/auth/login').send({
      email: user2Data.email,
      password: user2Data.password,
    });
    user2Token = getCookie(user2Res, 'accessToken') as string;
  });

  afterAll(async () => {
    // Clean up test data
    await db('user_notification_preferences').del();
    if (user1?.userId) {
      await db('users').where({ id: user1.userId }).del();
    }
    if (user2?.userId) {
      await db('users').where({ id: user2.userId }).del();
    }
  });

  describe('GET /api/v1/notification-preferences - Get User Preferences', () => {
    it('should return empty array for new user with no preferences', async () => {
      const res = await request(app)
        .get('/api/v1/notification-preferences')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(0);
    });

    it('should return user preferences after creating some', async () => {
      // Create some preferences for user1
      await db('user_notification_preferences').insert([
        {
          user_id: user1.userId,
          category: 'promotions',
          subscribed: true,
        },
        {
          user_id: user1.userId,
          category: 'security',
          subscribed: false,
        },
      ]);

      const res = await request(app)
        .get('/api/v1/notification-preferences')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data).toContainEqual(
        expect.objectContaining({
          category: 'promotions',
          subscribed: true,
        })
      );
      expect(res.body.data).toContainEqual(
        expect.objectContaining({
          category: 'security',
          subscribed: false,
        })
      );
    });

    it("should return only that user's preferences", async () => {
      // Add preference for user2
      await db('user_notification_preferences').insert({
        user_id: user2.userId,
        category: 'updates',
        subscribed: true,
      });

      // User1 should only see their preferences
      const user1Res = await request(app)
        .get('/api/v1/notification-preferences')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(user1Res.body.data.length).toBe(2);

      // User2 should only see their own
      const user2Res = await request(app)
        .get('/api/v1/notification-preferences')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(user2Res.body.data.length).toBe(1);
      expect(user2Res.body.data[0].category).toBe('updates');
    });

    it('should return 401 if not authenticated', async () => {
      await request(app).get('/api/v1/notification-preferences').expect(401);
    });
  });

  describe('PUT /api/v1/notification-preferences - Upsert Preferences', () => {
    beforeEach(async () => {
      await db('user_notification_preferences')
        .where({ user_id: user1.userId })
        .del();
    });

    it('should create new preference if not exists', async () => {
      const res = await request(app)
        .put('/api/v1/notification-preferences')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          category: 'marketing',
          subscribed: true,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.category).toBe('marketing');
      expect(res.body.data.subscribed).toBe(true);

      // Verify in database
      const dbPref = await db('user_notification_preferences')
        .where({ user_id: user1.userId, category: 'marketing' })
        .first();
      expect(dbPref).toBeDefined();
      expect(dbPref.subscribed).toBe(true);
    });

    it('should update existing preference', async () => {
      // Create initial preference
      await db('user_notification_preferences').insert({
        user_id: user1.userId,
        category: 'alerts',
        subscribed: true,
      });

      // Update it
      const res = await request(app)
        .put('/api/v1/notification-preferences')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          category: 'alerts',
          subscribed: false,
        })
        .expect(200);

      expect(res.body.data.subscribed).toBe(false);

      // Verify in database
      const dbPref = await db('user_notification_preferences')
        .where({ user_id: user1.userId, category: 'alerts' })
        .first();
      expect(dbPref.subscribed).toBe(false);
    });

    it('should handle multiple preferences upsert', async () => {
      const res = await request(app)
        .put('/api/v1/notification-preferences')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          category: 'newsletter',
          subscribed: true,
        })
        .expect(200);

      expect(res.body.success).toBe(true);

      // Get all preferences
      const getRes = await request(app)
        .get('/api/v1/notification-preferences')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(getRes.body.data.length).toBeGreaterThan(0);
    });

    it('should return 400 if category is missing', async () => {
      const res = await request(app)
        .put('/api/v1/notification-preferences')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          subscribed: true,
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 400 if subscribed is missing', async () => {
      const res = await request(app)
        .put('/api/v1/notification-preferences')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          category: 'test',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 401 if not authenticated', async () => {
      await request(app)
        .put('/api/v1/notification-preferences')
        .send({
          category: 'test',
          subscribed: true,
        })
        .expect(401);
    });
  });

  describe('PUT /api/v1/notification-preferences/:category - Toggle Category', () => {
    beforeEach(async () => {
      await db('user_notification_preferences')
        .where({ user_id: user1.userId })
        .del();
    });

    it('should create preference when toggling non-existent category', async () => {
      const res = await request(app)
        .put('/api/v1/notification-preferences/notifications')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          subscribed: true,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.category).toBe('notifications');
      expect(res.body.data.subscribed).toBe(true);
    });

    it('should toggle subscription status', async () => {
      // Create preference
      await db('user_notification_preferences').insert({
        user_id: user1.userId,
        category: 'deals',
        subscribed: true,
      });

      // Toggle it off
      let res = await request(app)
        .put('/api/v1/notification-preferences/deals')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          subscribed: false,
        })
        .expect(200);

      expect(res.body.data.subscribed).toBe(false);

      // Toggle it on
      res = await request(app)
        .put('/api/v1/notification-preferences/deals')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          subscribed: true,
        })
        .expect(200);

      expect(res.body.data.subscribed).toBe(true);
    });

    it('should return 400 if subscribed is missing', async () => {
      const res = await request(app)
        .put('/api/v1/notification-preferences/test-category')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 401 if not authenticated', async () => {
      await request(app)
        .put('/api/v1/notification-preferences/test-category')
        .send({
          subscribed: true,
        })
        .expect(401);
    });
  });

  describe('POST /api/v1/notification-preferences/mute-all - Mute All', () => {
    beforeEach(async () => {
      await db('user_notification_preferences')
        .where({ user_id: user1.userId })
        .del();

      // Create some preferences with mixed states
      await db('user_notification_preferences').insert([
        {
          user_id: user1.userId,
          category: 'promotions',
          subscribed: true,
        },
        {
          user_id: user1.userId,
          category: 'updates',
          subscribed: true,
        },
        {
          user_id: user1.userId,
          category: 'security',
          subscribed: false,
        },
      ]);
    });

    it('should mute all categories for user', async () => {
      const res = await request(app)
        .post('/api/v1/notification-preferences/mute-all')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(res.body.success).toBe(true);

      // Verify all are muted
      const getRes = await request(app)
        .get('/api/v1/notification-preferences')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(getRes.body.data.every((p: any) => p.subscribed === false)).toBe(
        true
      );
    });

    it("should only mute that user's preferences", async () => {
      // Add preference for user2
      await db('user_notification_preferences').insert({
        user_id: user2.userId,
        category: 'alerts',
        subscribed: true,
      });

      // Mute user1
      await request(app)
        .post('/api/v1/notification-preferences/mute-all')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      // User2's preference should still be enabled
      const user2Res = await request(app)
        .get('/api/v1/notification-preferences')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(user2Res.body.data[0].subscribed).toBe(true);
    });

    it('should return 401 if not authenticated', async () => {
      await request(app)
        .post('/api/v1/notification-preferences/mute-all')
        .expect(401);
    });
  });

  describe('POST /api/v1/notification-preferences/unmute-all - Unmute All', () => {
    beforeEach(async () => {
      await db('user_notification_preferences')
        .where({ user_id: user1.userId })
        .del();

      // Create preferences with all muted
      await db('user_notification_preferences').insert([
        {
          user_id: user1.userId,
          category: 'promotions',
          subscribed: false,
        },
        {
          user_id: user1.userId,
          category: 'updates',
          subscribed: false,
        },
        {
          user_id: user1.userId,
          category: 'security',
          subscribed: false,
        },
      ]);
    });

    it('should unmute all categories for user', async () => {
      const res = await request(app)
        .post('/api/v1/notification-preferences/unmute-all')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(res.body.success).toBe(true);

      // Verify all are unmuted
      const getRes = await request(app)
        .get('/api/v1/notification-preferences')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(getRes.body.data.every((p: any) => p.subscribed === true)).toBe(
        true
      );
    });

    it("should only unmute that user's preferences", async () => {
      // Clean up user2 preferences first
      await db('user_notification_preferences')
        .where({ user_id: user2.userId })
        .del();

      // Mute user2's preference
      await db('user_notification_preferences').insert({
        user_id: user2.userId,
        category: 'alerts',
        subscribed: false,
      });

      // Unmute user1
      await request(app)
        .post('/api/v1/notification-preferences/unmute-all')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      // User2's preference should still be muted
      const user2Res = await request(app)
        .get('/api/v1/notification-preferences')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(user2Res.body.data[0].subscribed).toBe(false);
    });

    it('should return 401 if not authenticated', async () => {
      await request(app)
        .post('/api/v1/notification-preferences/unmute-all')
        .expect(401);
    });
  });

  describe('Integration: Full Preference Management Workflow', () => {
    beforeEach(async () => {
      await db('user_notification_preferences')
        .where({ user_id: user1.userId })
        .del();
    });

    it('should handle complete preference lifecycle', async () => {
      // 1. Get empty preferences
      let getRes = await request(app)
        .get('/api/v1/notification-preferences')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);
      expect(getRes.body.data.length).toBe(0);

      // 2. Create preferences via upsert
      await request(app)
        .put('/api/v1/notification-preferences')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          category: 'marketing',
          subscribed: true,
        })
        .expect(200);

      // 3. Verify created
      getRes = await request(app)
        .get('/api/v1/notification-preferences')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);
      expect(getRes.body.data.length).toBe(1);

      // 4. Add more via toggle endpoint
      await request(app)
        .put('/api/v1/notification-preferences/security')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          subscribed: false,
        })
        .expect(200);

      // 5. Verify total
      getRes = await request(app)
        .get('/api/v1/notification-preferences')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);
      expect(getRes.body.data.length).toBe(2);

      // 6. Mute all
      await request(app)
        .post('/api/v1/notification-preferences/mute-all')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      getRes = await request(app)
        .get('/api/v1/notification-preferences')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);
      expect(getRes.body.data.every((p: any) => !p.subscribed)).toBe(true);

      // 7. Unmute all
      await request(app)
        .post('/api/v1/notification-preferences/unmute-all')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      getRes = await request(app)
        .get('/api/v1/notification-preferences')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);
      expect(getRes.body.data.every((p: any) => p.subscribed)).toBe(true);
    });

    it('should maintain user isolation across operations', async () => {
      // User1 creates preferences
      await request(app)
        .put('/api/v1/notification-preferences')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          category: 'deals',
          subscribed: true,
        })
        .expect(200);

      // User2 mutes all (should not affect user1)
      await request(app)
        .post('/api/v1/notification-preferences/mute-all')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      // User1's preference should be unaffected
      const user1Res = await request(app)
        .get('/api/v1/notification-preferences')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(user1Res.body.data[0].subscribed).toBe(true);
    });
  });
});
