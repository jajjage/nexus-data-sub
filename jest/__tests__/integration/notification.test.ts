import request from 'supertest';
import app from '../../../src/app';
import db from '../../../src/database/connection';
import { CreateUserInput, UserModel } from '../../../src/models/User';
import { getCookie } from '../../test-helpers';
// RoleModel doesn't provide a create helper; insert directly in tests

describe('Notification Controller', () => {
  let adminUser: any;
  let adminToken: string;

  beforeAll(async () => {
    // Create an admin role with necessary permissions (insert directly)
    const [adminRole] = await db('roles')
      .insert({ name: 'notification-admin', description: 'Notification admin' })
      .returning('*');
    // assign permissions
    const permission = await db('permissions')
      .where({ name: 'create_notification' })
      .first();
    if (permission) {
      await db('role_permissions').insert({
        role_id: adminRole.id,
        permission_id: permission.id,
      });
    }

    // Create an admin user
    const adminData: CreateUserInput = {
      email: 'notification.admin@example.com',
      fullName: 'Notification Admin',
      phoneNumber: '1234567890',
      password: 'Password123!',
      role: adminRole.name,
    };
    const createdAdmin = await UserModel.create(adminData);
    adminUser = await UserModel.findForAuth(createdAdmin.email);

    // Log in as the admin to get a token (access token is set as a cookie)
    const res = await request(app).post('/api/v1/auth/login').send({
      email: adminData.email,
      password: adminData.password,
    });
    adminToken = getCookie(res, 'accessToken') as string;
  });
  afterAll(async () => {
    // Clean up test data
    await db('notifications').del();
    if (adminUser?.userId) {
      await db('users').where({ id: adminUser.userId }).del();
    }
    await db('roles').where({ name: 'notification-admin' }).del();
  });

  describe('POST /api/v1/notifications', () => {
    it('should create a new notification and return it', async () => {
      const notificationData = {
        title: 'Integration Test Notification',
        body: 'This is a test from the integration suite.',
      };

      const res = await request(app)
        .post('/api/v1/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(notificationData)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(notificationData.title);
      expect(res.body.data.created_by).toBe(adminUser.userId);

      // Verify it's in the database
      const dbNotification = await db('notifications')
        .where({ id: res.body.data.id })
        .first();
      expect(dbNotification).toBeDefined();
    });

    it('should return 400 if title is missing', async () => {
      const notificationData = {
        body: 'This is a test from the integration suite.',
      };

      await request(app)
        .post('/api/v1/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(notificationData)
        .expect(400);
    });

    it('should return 400 if body is missing', async () => {
      const notificationData = {
        title: 'Integration Test Notification',
      };

      await request(app)
        .post('/api/v1/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(notificationData)
        .expect(400);
    });
  });
});
