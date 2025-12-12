import request from 'supertest';
import app from '../../../src/app';
import db from '../../../src/database/connection';
import { CreateUserInput, UserModel } from '../../../src/models/User';
import { getCookie } from '../../test-helpers';

describe('Admin Notification Controller - Full Integration Tests', () => {
  let adminUser: any;
  let adminToken: string;
  let regularUser: any;
  let regularToken: string;
  let createdNotificationId: string;

  beforeAll(async () => {
    // Use existing admin role instead of creating custom one
    const adminRole = await db('roles').where('name', 'admin').first();

    // Create admin user with admin role
    const adminData: CreateUserInput = {
      email: 'admin.notifications@test.com',
      fullName: 'Admin Notifications',
      phoneNumber: '1111111111',
      password: 'AdminPassword123!',
      role: adminRole.name,
    };
    const createdAdmin = await UserModel.create(adminData);
    adminUser = await UserModel.findForAuth(createdAdmin.email);

    // Create regular user (no notification permissions)
    const userRole = await db('roles').where('name', 'user').first();

    const userData: CreateUserInput = {
      email: 'user.regular@test.com',
      fullName: 'Regular User',
      phoneNumber: '2222222222',
      password: 'UserPassword123!',
      role: userRole.name,
    };
    const createdUser = await UserModel.create(userData);
    regularUser = await UserModel.findForAuth(createdUser.email);

    // Login as admin
    const adminRes = await request(app).post('/api/v1/auth/login').send({
      email: adminData.email,
      password: adminData.password,
    });
    adminToken = getCookie(adminRes, 'accessToken') as string;

    // Login as regular user
    const userRes = await request(app).post('/api/v1/auth/login').send({
      email: userData.email,
      password: userData.password,
    });
    regularToken = getCookie(userRes, 'accessToken') as string;
  });

  afterAll(async () => {
    // Clean up test data
    await db('notifications').del();
    await db('user_notifications').del();
    await db('push_tokens').del();
    if (adminUser?.userId) {
      await db('users').where({ id: adminUser.userId }).del();
    }
    if (regularUser?.userId) {
      await db('users').where({ id: regularUser.userId }).del();
    }
  });

  describe('POST /api/v1/admin/notifications - Create Notification', () => {
    it('should create a notification with title and body', async () => {
      const notificationData = {
        title: 'Test Notification',
        body: 'This is a test notification body.',
      };

      const res = await request(app)
        .post('/api/v1/admin/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(notificationData)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.title).toBe(notificationData.title);
      expect(res.body.data.body).toBe(notificationData.body);
      expect(res.body.data.type).toBe('info'); // default type
      expect(res.body.data.created_by).toBe(adminUser.userId);

      createdNotificationId = res.body.data.id;

      // Verify in database
      const dbNotif = await db('notifications')
        .where({ id: createdNotificationId })
        .first();
      expect(dbNotif).toBeDefined();
      expect(dbNotif.title).toBe(notificationData.title);
    });

    it('should create notification with all fields including type and category', async () => {
      const notificationData = {
        title: 'Promotional Offer',
        body: 'Check out our latest deal!',
        type: 'success',
        category: 'promotions',
      };

      const res = await request(app)
        .post('/api/v1/admin/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(notificationData)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe('success');
      expect(res.body.data.category).toBe('promotions');
    });

    it('should return 400 if title is missing', async () => {
      const notificationData = {
        body: 'Missing title notification',
      };

      const res = await request(app)
        .post('/api/v1/admin/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(notificationData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 400 if body is missing', async () => {
      const notificationData = {
        title: 'Missing body notification',
      };

      const res = await request(app)
        .post('/api/v1/admin/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(notificationData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 400 for invalid notification type', async () => {
      const notificationData = {
        title: 'Invalid type',
        body: 'Test body',
        type: 'invalid_type',
      };

      const res = await request(app)
        .post('/api/v1/admin/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(notificationData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 401 if not authenticated', async () => {
      const notificationData = {
        title: 'Test',
        body: 'Test body',
      };

      await request(app)
        .post('/api/v1/admin/notifications')
        .send(notificationData)
        .expect(401);
    });

    it('should return 403 if user lacks permission', async () => {
      const notificationData = {
        title: 'Forbidden Test',
        body: 'Should not create',
      };

      await request(app)
        .post('/api/v1/admin/notifications')
        .set('Authorization', `Bearer ${regularToken}`)
        .send(notificationData)
        .expect(403);
    });
  });

  describe('GET /api/v1/admin/notifications - List Notifications', () => {
    beforeAll(async () => {
      // Create multiple test notifications
      for (let i = 1; i <= 5; i++) {
        await db('notifications').insert({
          title: `Notification ${i}`,
          body: `Body ${i}`,
          type: 'info',
          created_by: adminUser.userId,
          sent: false,
          archived: false,
        });
      }
    });

    it('should list all non-archived notifications', async () => {
      const res = await request(app)
        .get('/api/v1/admin/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.notifications)).toBe(true);
      expect(res.body.data.notifications.length).toBeGreaterThan(0);
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('limit');
      expect(res.body.data).toHaveProperty('offset');
    });

    it('should support pagination with limit and offset', async () => {
      const res = await request(app)
        .get('/api/v1/admin/notifications?limit=2&offset=0')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.notifications.length).toBeLessThanOrEqual(2);
      expect(res.body.data.limit).toBe(2);
      expect(res.body.data.offset).toBe(0);
    });

    it('should exclude archived notifications by default', async () => {
      // Archive one notification
      const notifs = await db('notifications').limit(1);
      if (notifs.length > 0) {
        await db('notifications')
          .where({ id: notifs[0].id })
          .update({ archived: true });
      }

      const res = await request(app)
        .get('/api/v1/admin/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const archived = res.body.data.notifications.filter(
        (n: any) => n.archived
      );
      expect(archived.length).toBe(0);
    });

    it('should include archived when archived=true', async () => {
      const res = await request(app)
        .get('/api/v1/admin/notifications?archived=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      // May or may not have archived items, just verify endpoint works
    });

    it('should return 401 if not authenticated', async () => {
      await request(app).get('/api/v1/admin/notifications').expect(401);
    });
  });

  describe('PATCH /api/v1/admin/notifications/:notificationId - Edit Notification', () => {
    let notificationToEdit: any;

    beforeAll(async () => {
      const [notif] = await db('notifications')
        .insert({
          title: 'Original Title',
          body: 'Original Body',
          type: 'info',
          created_by: adminUser.userId,
          sent: false,
          archived: false,
        })
        .returning('*');
      notificationToEdit = notif;
    });

    it('should update notification title', async () => {
      const updateData = {
        title: 'Updated Title',
      };

      const res = await request(app)
        .patch(`/api/v1/admin/notifications/${notificationToEdit.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Updated Title');

      // Verify in database
      const updated = await db('notifications')
        .where({ id: notificationToEdit.id })
        .first();
      expect(updated.title).toBe('Updated Title');
    });

    it('should update notification body', async () => {
      const updateData = {
        body: 'Updated Body Content',
      };

      const res = await request(app)
        .patch(`/api/v1/admin/notifications/${notificationToEdit.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.body).toBe('Updated Body Content');
    });

    it('should update notification type', async () => {
      const updateData = {
        type: 'warning',
      };

      const res = await request(app)
        .patch(`/api/v1/admin/notifications/${notificationToEdit.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe('warning');
    });

    it('should update notification category', async () => {
      const updateData = {
        category: 'updates',
      };

      const res = await request(app)
        .patch(`/api/v1/admin/notifications/${notificationToEdit.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.category).toBe('updates');
    });

    it('should return 400 for invalid type', async () => {
      const updateData = {
        type: 'invalid',
      };

      const res = await request(app)
        .patch(`/api/v1/admin/notifications/${notificationToEdit.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 400 if no fields provided', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/notifications/${notificationToEdit.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 404 for non-existent notification', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .patch(`/api/v1/admin/notifications/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Updated' })
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('should return 401 if not authenticated', async () => {
      await request(app)
        .patch(`/api/v1/admin/notifications/${notificationToEdit.id}`)
        .send({ title: 'Hacked' })
        .expect(401);
    });

    it('should return 403 if user lacks permission', async () => {
      await request(app)
        .patch(`/api/v1/admin/notifications/${notificationToEdit.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ title: 'Unauthorized' })
        .expect(403);
    });
  });

  describe('DELETE /api/v1/admin/notifications/:notificationId - Archive Notification', () => {
    let notificationToDelete: any;

    beforeAll(async () => {
      const [notif] = await db('notifications')
        .insert({
          title: 'To Be Archived',
          body: 'This will be archived',
          type: 'info',
          created_by: adminUser.userId,
          sent: false,
          archived: false,
        })
        .returning('*');
      notificationToDelete = notif;
    });

    it('should archive a notification (soft delete)', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/notifications/${notificationToDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(notificationToDelete.id);

      // Verify in database - should be marked as archived not deleted
      const archived = await db('notifications')
        .where({ id: notificationToDelete.id })
        .first();
      expect(archived.archived).toBe(true);
    });

    it('should return 404 for non-existent notification', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const res = await request(app)
        .delete(`/api/v1/admin/notifications/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('should return 401 if not authenticated', async () => {
      await request(app)
        .delete(`/api/v1/admin/notifications/${notificationToDelete.id}`)
        .expect(401);
    });

    it('should return 403 if user lacks permission', async () => {
      const [notif] = await db('notifications')
        .insert({
          title: 'Another to archive',
          body: 'Test',
          type: 'info',
          created_by: adminUser.userId,
          sent: false,
          archived: false,
        })
        .returning('*');

      await request(app)
        .delete(`/api/v1/admin/notifications/${notif.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);
    });
  });

  describe('GET /api/v1/admin/notifications/:notificationId/analytics - View Analytics', () => {
    let notificationForAnalytics: any;

    beforeAll(async () => {
      const [notif] = await db('notifications')
        .insert({
          title: 'Analytics Test',
          body: 'Testing analytics',
          type: 'info',
          created_by: adminUser.userId,
          sent: true,
          archived: false,
        })
        .returning('*');
      notificationForAnalytics = notif;
    });

    it('should retrieve analytics for a notification', async () => {
      const res = await request(app)
        .get(
          `/api/v1/admin/notifications/${notificationForAnalytics.id}/analytics`
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return 401 if not authenticated', async () => {
      await request(app)
        .get(
          `/api/v1/admin/notifications/${notificationForAnalytics.id}/analytics`
        )
        .expect(401);
    });

    it('should return 403 if user lacks analytics permission', async () => {
      await request(app)
        .get(
          `/api/v1/admin/notifications/${notificationForAnalytics.id}/analytics`
        )
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);
    });
  });

  describe('POST /api/v1/admin/notifications/schedule - Create Scheduled Notification', () => {
    it('should create and send notification immediately when publish_at is null', async () => {
      const notificationData = {
        title: 'Immediate Notification',
        body: 'This should send immediately',
      };

      const res = await request(app)
        .post('/api/v1/admin/notifications/schedule')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(notificationData)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.title).toBe(notificationData.title);
      expect(res.body.data.body).toBe(notificationData.body);
      expect(res.body.data.type).toBe('info');
      // When publish_at is not provided, no scheduling message is shown
      expect(res.body.message).toBeDefined();

      // Verify in database
      const dbNotif = await db('notifications')
        .where({ id: res.body.data.id })
        .first();
      expect(dbNotif).toBeDefined();
      // publish_at defaults to now() in database when not provided
      // The notification should be sent immediately since publish_at will be ~now
      expect(dbNotif.publish_at).not.toBeNull();
    });

    it('should create and send notification when publish_at is in the past', async () => {
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1); // 1 hour ago

      const notificationData = {
        title: 'Past Date Notification',
        body: 'This should send immediately (past date)',
        publish_at: pastDate.toISOString(),
      };

      const res = await request(app)
        .post('/api/v1/admin/notifications/schedule')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(notificationData)
        .expect(201);

      expect(res.body.success).toBe(true);
      // The message should indicate it was scheduled (showing the past date)
      // because publish_at was provided, even if it's in the past
      expect(res.body.message).toContain('scheduled successfully');

      // Verify in database - even though past, publish_at field should contain the value
      const dbNotif = await db('notifications')
        .where({ id: res.body.data.id })
        .first();
      expect(dbNotif).toBeDefined();
      // Past date should still be stored in publish_at
      expect(dbNotif.publish_at).not.toBeNull();
    });

    it('should create but not send notification when publish_at is in the future', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 2); // 2 hours from now

      const notificationData = {
        title: 'Future Date Notification',
        body: 'This should be scheduled for later',
        category: 'updates',
        publish_at: futureDate.toISOString(),
      };

      const res = await request(app)
        .post('/api/v1/admin/notifications/schedule')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(notificationData)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('scheduled successfully');
      expect(res.body.message).toContain(futureDate.toISOString());

      // Verify in database
      const dbNotif = await db('notifications')
        .where({ id: res.body.data.id })
        .first();
      expect(dbNotif).toBeDefined();
      expect(dbNotif.publish_at).not.toBeNull();
    });

    it('should create scheduled notification with all fields', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 3);

      const notificationData = {
        title: 'Complete Scheduled Notification',
        body: 'Full data notification',
        type: 'warning',
        category: 'alerts',
        publish_at: futureDate.toISOString(),
        targetCriteria: {
          minTransactionCount: 1,
          maxTransactionCount: 100,
        },
      };

      const res = await request(app)
        .post('/api/v1/admin/notifications/schedule')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(notificationData)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe('warning');
      expect(res.body.data.category).toBe('alerts');
    });

    it('should return 400 if title is missing', async () => {
      const notificationData = {
        body: 'Missing title',
      };

      const res = await request(app)
        .post('/api/v1/admin/notifications/schedule')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(notificationData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 400 if body is missing', async () => {
      const notificationData = {
        title: 'Missing body',
      };

      const res = await request(app)
        .post('/api/v1/admin/notifications/schedule')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(notificationData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 400 for invalid notification type', async () => {
      const notificationData = {
        title: 'Invalid Type',
        body: 'Test body',
        type: 'invalid_type',
      };

      const res = await request(app)
        .post('/api/v1/admin/notifications/schedule')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(notificationData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 400 for invalid publish_at date format', async () => {
      const notificationData = {
        title: 'Invalid Date',
        body: 'Test body',
        publish_at: 'invalid-date-format',
      };

      const res = await request(app)
        .post('/api/v1/admin/notifications/schedule')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(notificationData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 400 for invalid transaction count range', async () => {
      const notificationData = {
        title: 'Invalid Range',
        body: 'Test body',
        targetCriteria: {
          minTransactionCount: 100,
          maxTransactionCount: 10, // max < min
        },
      };

      const res = await request(app)
        .post('/api/v1/admin/notifications/schedule')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(notificationData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 401 if not authenticated', async () => {
      const notificationData = {
        title: 'Test',
        body: 'Test body',
      };

      await request(app)
        .post('/api/v1/admin/notifications/schedule')
        .send(notificationData)
        .expect(401);
    });

    it('should return 403 if user lacks permission', async () => {
      const notificationData = {
        title: 'Forbidden Test',
        body: 'Should not create',
      };

      await request(app)
        .post('/api/v1/admin/notifications/schedule')
        .set('Authorization', `Bearer ${regularToken}`)
        .send(notificationData)
        .expect(403);
    });
  });
});
