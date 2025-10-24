import request from 'supertest';
import app from '../../../src/app';
import db from '../../../src/database/connection';
import { CreateUserInput, UserModel } from '../../../src/models/User';
import { getCookie } from '../../test-helpers';

describe('Notification Enhancements API', () => {
  let adminToken: string | undefined;
  let userToken: string | undefined;

  beforeEach(async () => {
    const adminData: CreateUserInput = {
      email: 'admin.notifications@example.com',
      fullName: 'Admin Notifications',
      password: 'Password123!',
      role: 'admin',
    };
    const admin = await UserModel.create(adminData);
    const adminRole = await db('roles').where('name', 'admin').first();
    await db('users').where({ id: admin.userId }).update({
      is_verified: true,
      role_id: adminRole.id,
    });
    const adminLoginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: adminData.email, password: adminData.password });
    adminToken = getCookie(adminLoginResponse, 'accessToken');
    expect(adminToken).toBeDefined();

    const userData: CreateUserInput = {
      email: 'user.notifications@example.com',
      fullName: 'User Notifications',
      password: 'Password123!',
      role: 'user',
    };

    const user = await UserModel.create(userData);
    await db('users').where({ id: user.userId }).update({ is_verified: true });
    const userLoginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: userData.email,
        password: userData.password,
      });
    userToken = getCookie(userLoginResponse, 'accessToken');
    expect(userToken).toBeDefined();
  });

  afterEach(async () => {
    await db('users')
      .where('email', 'like', '%.notifications@example.com')
      .del();
    await db('notification_templates').del();
    await db('user_notification_preferences').del();
  });

  describe('Notification Templates', () => {
    it('should create a new notification template', async () => {
      const newTemplate = {
        template_id: 'test-template',
        title: 'Test Template',
        body: 'This is a test template',
        locales: ['en'],
      };

      const response = await request(app)
        .post('/api/v1/notification-templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newTemplate)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.template_id).toBe(newTemplate.template_id);
    });

    it('should get all notification templates', async () => {
      await request(app)
        .post('/api/v1/notification-templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          template_id: 'test-template-2',
          title: 'Test Template 2',
          body: 'This is a test template 2',
          locales: ['en'],
        });

      const response = await request(app)
        .get('/api/v1/notification-templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('User Notification Preferences', () => {
    it('should get user notification preferences', async () => {
      const response = await request(app)
        .get('/api/v1/notification-preferences')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should update user notification preferences', async () => {
      const newPreference = {
        category: 'test-category',
        subscribed: false,
      };

      const response = await request(app)
        .put('/api/v1/notification-preferences')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newPreference)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBe(newPreference.category);
      expect(response.body.data.subscribed).toBe(newPreference.subscribed);
    });
  });
});
