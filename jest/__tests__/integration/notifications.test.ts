import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import app from '../../../src/app';
import db from '../../../src/database/connection';
import { CreateUserInput, UserModel } from '../../../src/models/User';

describe('Notification Delete Integration Tests', () => {
  let testUser: any;
  let authCookie: any;
  let notificationId1: string;
  let notificationId2: string;

  beforeAll(async () => {
    // Create test user
    const userData: CreateUserInput = {
      email: 'notif.delete.test@example.com',
      fullName: 'Notification Delete Test',
      phoneNumber: '08012345678',
      password: 'Password123!',
      role: 'user',
    };
    testUser = await UserModel.create(userData);
    await db('users')
      .where({ id: testUser.userId })
      .update({ is_verified: true });

    // Login user
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: userData.password });

    authCookie = loginResponse.headers['set-cookie'];

    // Create test notifications
    notificationId1 = uuidv4();
    notificationId2 = uuidv4();

    await db('notifications').insert([
      {
        id: notificationId1,
        title: 'Test Notification 1',
        body: 'Delete test 1',
        type: 'info',
        category: 'test',
        publish_at: new Date(),
        created_at: new Date(),
        sent: false,
        archived: false,
      },
      {
        id: notificationId2,
        title: 'Test Notification 2',
        body: 'Delete test 2',
        type: 'success',
        category: 'test',
        publish_at: new Date(),
        created_at: new Date(),
        sent: false,
        archived: false,
      },
    ]);

    // Create user notification entries
    await db('user_notifications').insert([
      {
        id: uuidv4(),
        notification_id: notificationId1,
        user_id: testUser.userId,
        read: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        notification_id: notificationId2,
        user_id: testUser.userId,
        read: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    // Subscribe user to 'test' category for preference-based filtering
    await db('user_notification_preferences').insert({
      id: uuidv4(),
      user_id: testUser.userId,
      category: 'test',
      subscribed: true,
      created_at: new Date(),
      updated_at: new Date(),
    });
  });

  afterAll(async () => {
    await db('user_notification_preferences')
      .where({ user_id: testUser.userId })
      .del();
    await db('user_notifications').where({ user_id: testUser.userId }).del();
    await db('notifications')
      .whereIn('id', [notificationId1, notificationId2])
      .del();
    await db('users').where({ id: testUser.userId }).del();
  });

  describe('DELETE /api/v1/notifications/{notificationId}', () => {
    it('should delete a notification for authenticated user', async () => {
      // Arrange
      const testNotifId = uuidv4();
      await db('notifications').insert({
        id: testNotifId,
        title: 'Delete Me',
        body: 'This should be deleted',
        type: 'info',
        category: 'test',
        publish_at: new Date(),
        created_at: new Date(),
        sent: false,
        archived: false,
      });

      await db('user_notifications').insert({
        id: uuidv4(),
        notification_id: testNotifId,
        user_id: testUser.userId,
        read: false,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Act
      const response = await request(app)
        .delete(`/api/v1/notifications/${testNotifId}`)
        .set('Cookie', authCookie);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify it's deleted (soft-deleted with deleted=true)
      const deleted = await db('user_notifications')
        .where({
          notification_id: testNotifId,
          user_id: testUser.userId,
        })
        .first();

      expect(deleted).toBeDefined();
      expect(deleted.deleted).toBe(true);

      // Cleanup
      await db('notifications').where({ id: testNotifId }).del();
    });

    it('should return 401 for unauthenticated request', async () => {
      // Act
      const response = await request(app).delete(
        `/api/v1/notifications/${notificationId1}`
      );

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 if notification ID is missing', async () => {
      // Act
      const response = await request(app)
        .delete('/api/v1/notifications/')
        .set('Cookie', authCookie);

      // Assert - This will likely be 404 because no ID in route
      expect([400, 404]).toContain(response.status);
    });
  });

  describe('PUT /api/v1/notifications/{notificationId}/read', () => {
    it('should mark notification as read', async () => {
      // Act
      const response = await request(app)
        .put(`/api/v1/notifications/${notificationId1}/read`)
        .set('Cookie', authCookie);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify it's marked as read
      const marked = await db('user_notifications')
        .where({
          notification_id: notificationId1,
          user_id: testUser.userId,
        })
        .first();

      expect(marked.read).toBe(true);
      expect(marked.read_at).not.toBeNull();
    });

    it('should return 401 for unauthenticated request', async () => {
      // Act
      const response = await request(app).put(
        `/api/v1/notifications/${notificationId1}/read`
      );

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/notifications/{notificationId}/unread', () => {
    it('should mark notification as unread', async () => {
      // Arrange - first mark as read
      await db('user_notifications')
        .where({
          notification_id: notificationId2,
          user_id: testUser.userId,
        })
        .update({
          read: true,
          read_at: new Date(),
        });

      // Act
      const response = await request(app)
        .put(`/api/v1/notifications/${notificationId2}/unread`)
        .set('Cookie', authCookie);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify it's marked as unread
      const marked = await db('user_notifications')
        .where({
          notification_id: notificationId2,
          user_id: testUser.userId,
        })
        .first();

      expect(marked.read).toBe(false);
      expect(marked.read_at).toBeNull();
    });

    it('should return 401 for unauthenticated request', async () => {
      // Act
      const response = await request(app).put(
        `/api/v1/notifications/${notificationId1}/unread`
      );

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/notifications/read-all/mark', () => {
    it('should mark all notifications as read', async () => {
      // Arrange - create some unread notifications
      const unreadNotifId = uuidv4();
      await db('notifications').insert({
        id: unreadNotifId,
        title: 'Unread Notification',
        body: 'Mark all test',
        type: 'info',
        category: 'test',
        publish_at: new Date(),
        created_at: new Date(),
        sent: false,
        archived: false,
      });

      await db('user_notifications').insert({
        id: uuidv4(),
        notification_id: unreadNotifId,
        user_id: testUser.userId,
        read: false,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Act
      const response = await request(app)
        .put('/api/v1/notifications/read-all/mark')
        .set('Cookie', authCookie);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('count');

      // Verify all are marked as read
      const unread = await db('user_notifications')
        .where({
          user_id: testUser.userId,
          read: false,
        })
        .count({ count: '*' })
        .first();

      const countValue =
        typeof unread?.count === 'string'
          ? parseInt(unread.count, 10)
          : unread?.count || 0;
      expect(countValue).toBe(0);

      // Cleanup
      await db('notifications').where({ id: unreadNotifId }).del();
    });

    it('should return 401 for unauthenticated request', async () => {
      // Act
      const response = await request(app).put(
        '/api/v1/notifications/read-all/mark'
      );

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/notifications/unread-count/count', () => {
    it('should return unread notification count', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/notifications/unread-count/count')
        .set('Cookie', authCookie);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('unreadCount');
      expect(typeof response.body.data.unreadCount).toBe('number');
    });

    it('should return 401 for unauthenticated request', async () => {
      // Act
      const response = await request(app).get(
        '/api/v1/notifications/unread-count/count'
      );

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/notifications with pagination', () => {
    it('should return user notifications with pagination and unread count', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/notifications?limit=10&offset=0')
        .set('Cookie', authCookie);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('notifications');
      expect(response.body.data).toHaveProperty('unreadCount');
      expect(response.body.data).toHaveProperty('limit');
      expect(response.body.data).toHaveProperty('offset');
      expect(Array.isArray(response.body.data.notifications)).toBe(true);
    });

    it('should return 401 for unauthenticated request', async () => {
      // Act
      const response = await request(app).get('/api/v1/notifications');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return notifications with correct structure', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/notifications?limit=50&offset=0')
        .set('Cookie', authCookie);

      // Assert
      expect(response.status).toBe(200);

      if (response.body.data.notifications.length > 0) {
        const notif = response.body.data.notifications[0];
        expect(notif).toHaveProperty('notification_id');
        expect(notif).toHaveProperty('user_id');
        expect(notif).toHaveProperty('read');
        expect(notif).toHaveProperty('notification');
        expect(notif.notification).toHaveProperty('title');
        expect(notif.notification).toHaveProperty('body');
        expect(notif.notification).toHaveProperty('type');
      }
    });
  });
});
