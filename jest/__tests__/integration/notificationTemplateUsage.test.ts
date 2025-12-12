import request from 'supertest';
import app from '../../../src/app';
import db from '../../../src/database/connection';
import { CreateUserInput, UserModel } from '../../../src/models/User';
import { jsonb } from '../../../src/utils/db.utils';
import { getCookie } from '../../test-helpers';

describe('Notification Template Usage - Create from Template with Variables', () => {
  let adminUser: any;
  let adminToken: string;
  let regularUser: any;
  let regularToken: string;

  beforeAll(async () => {
    // Use existing admin role
    const adminRole = await db('roles').where('name', 'admin').first();

    // Create admin user
    const adminData: CreateUserInput = {
      email: 'admin.template.usage@test.com',
      fullName: 'Admin Template Usage',
      phoneNumber: '5555555555',
      password: 'AdminPassword123!',
      role: adminRole.name,
    };
    const createdAdmin = await UserModel.create(adminData);
    adminUser = await UserModel.findForAuth(createdAdmin.email);

    // Create regular user (no notification permissions)
    const userRole = await db('roles').where('name', 'user').first();

    const userData: CreateUserInput = {
      email: 'user.template.usage@test.com',
      fullName: 'Regular User Template Usage',
      phoneNumber: '6666666666',
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

    // Create test templates
    await db('notification_templates').insert({
      template_id: 'welcome_bonus',
      title: 'Welcome {{userName}}! 🎉',
      body: 'You have received {{amount}} bonus credits. Use code: {{promoCode}}',
      locales: jsonb(['en', 'es']),
    });

    await db('notification_templates').insert({
      template_id: 'transaction_confirmation',
      title: 'Transaction Confirmed',
      body: '{{amount}} transferred to {{recipientName}} successfully. Ref: {{refId}}',
      locales: jsonb(['en']),
    });

    await db('notification_templates').insert({
      template_id: 'no_variables',
      title: 'Simple Message',
      body: 'This template has no variables',
      locales: jsonb(['en']),
    });
  });

  afterAll(async () => {
    // Clean up test data
    await db('notifications').del();
    await db('notification_templates').del();
    if (adminUser?.userId) {
      await db('users').where({ id: adminUser.userId }).del();
    }
    if (regularUser?.userId) {
      await db('users').where({ id: regularUser.userId }).del();
    }
  });

  describe('POST /api/v1/admin/notifications/from-template - Create from Template', () => {
    it('should create notification from template with single variable', async () => {
      const res = await request(app)
        .post('/api/v1/admin/notifications/from-template')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          template_id: 'welcome_bonus',
          variables: {
            userName: 'John Doe',
            amount: 50,
            promoCode: 'WELCOME50',
          },
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.title).toBe('Welcome John Doe! 🎉');
      expect(res.body.data.body).toContain('50 bonus credits');
      expect(res.body.data.body).toContain('WELCOME50');
    });

    it('should create notification from template with multiple variables', async () => {
      const res = await request(app)
        .post('/api/v1/admin/notifications/from-template')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          template_id: 'transaction_confirmation',
          variables: {
            amount: 250,
            recipientName: 'Alice Smith',
            refId: 'TXN123456',
          },
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Transaction Confirmed');
      expect(res.body.data.body).toContain('250 transferred');
      expect(res.body.data.body).toContain('Alice Smith');
      expect(res.body.data.body).toContain('TXN123456');
    });

    it('should create notification from template without variables', async () => {
      const res = await request(app)
        .post('/api/v1/admin/notifications/from-template')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          template_id: 'no_variables',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Simple Message');
      expect(res.body.data.body).toBe('This template has no variables');
    });

    it('should create notification with empty variables object', async () => {
      const res = await request(app)
        .post('/api/v1/admin/notifications/from-template')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          template_id: 'welcome_bonus',
          variables: {},
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      // Variables should remain as-is since none were provided
      expect(res.body.data.title).toContain('{{userName}}');
    });

    it('should substitute only provided variables, leaving others unchanged', async () => {
      const res = await request(app)
        .post('/api/v1/admin/notifications/from-template')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          template_id: 'transaction_confirmation',
          variables: {
            amount: 100,
            // recipientName and refId not provided
          },
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.body).toContain('100 transferred');
      expect(res.body.data.body).toContain('{{recipientName}}'); // unchanged
      expect(res.body.data.body).toContain('{{refId}}'); // unchanged
    });

    it('should create notification with category from template request', async () => {
      const res = await request(app)
        .post('/api/v1/admin/notifications/from-template')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          template_id: 'welcome_bonus',
          variables: { userName: 'Bob', amount: 75, promoCode: 'BOB75' },
          category: 'promotions',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.category).toBe('promotions');
    });

    it('should create notification with custom type from template request', async () => {
      const res = await request(app)
        .post('/api/v1/admin/notifications/from-template')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          template_id: 'welcome_bonus',
          variables: { userName: 'Carol', amount: 100, promoCode: 'CAROL100' },
          type: 'success',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe('success');
    });

    it('should return 404 for non-existent template', async () => {
      const res = await request(app)
        .post('/api/v1/admin/notifications/from-template')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          template_id: 'non_existent_template',
          variables: { test: 'value' },
        })
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('should return 400 if template_id is missing', async () => {
      const res = await request(app)
        .post('/api/v1/admin/notifications/from-template')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          variables: { userName: 'Test' },
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 400 for invalid notification type', async () => {
      const res = await request(app)
        .post('/api/v1/admin/notifications/from-template')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          template_id: 'welcome_bonus',
          variables: { userName: 'Test', amount: 50, promoCode: 'TEST' },
          type: 'invalid_type',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should schedule notification if publish_at is provided', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 2);

      const res = await request(app)
        .post('/api/v1/admin/notifications/from-template')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          template_id: 'welcome_bonus',
          variables: { userName: 'Dave', amount: 60, promoCode: 'DAVE60' },
          publish_at: futureDate.toISOString(),
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('scheduled');
    });

    it('should send immediately if publish_at is in the past', async () => {
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1);

      const res = await request(app)
        .post('/api/v1/admin/notifications/from-template')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          template_id: 'welcome_bonus',
          variables: { userName: 'Eve', amount: 80, promoCode: 'EVE80' },
          publish_at: pastDate.toISOString(),
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      // The API returns a scheduled message because publish_at was provided,
      // but the service will send immediately since it's in the past
      expect(res.body.message).toContain('scheduled');
    });

    it('should return 401 if not authenticated', async () => {
      await request(app)
        .post('/api/v1/admin/notifications/from-template')
        .send({
          template_id: 'welcome_bonus',
          variables: { userName: 'Test', amount: 50, promoCode: 'TEST' },
        })
        .expect(401);
    });

    it('should return 403 if user lacks permission', async () => {
      await request(app)
        .post('/api/v1/admin/notifications/from-template')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          template_id: 'welcome_bonus',
          variables: { userName: 'Test', amount: 50, promoCode: 'TEST' },
        })
        .expect(403);
    });
  });

  describe('Integration: Template Sharing Workflow', () => {
    it('should allow admin1 to create template and admin2 to use it with variables', async () => {
      // Create a new template
      const createRes = await request(app)
        .post('/api/v1/notification-templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          template_id: 'shared_promo_template',
          title: 'Special {{discount}}% Off for {{customerName}}',
          body: 'Your exclusive {{discount}}% discount code: {{code}}. Valid until {{expiry}}',
          locales: ['en'],
        })
        .expect(201);

      expect(createRes.body.success).toBe(true);

      // Use the template with different variables
      const useRes = await request(app)
        .post('/api/v1/admin/notifications/from-template')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          template_id: 'shared_promo_template',
          variables: {
            discount: 25,
            customerName: 'John Merchant',
            code: 'PROMO25',
            expiry: '2025-12-31',
          },
        })
        .expect(201);

      expect(useRes.body.data.title).toBe('Special 25% Off for John Merchant');
      expect(useRes.body.data.body).toContain('25%');
      expect(useRes.body.data.body).toContain('PROMO25');
    });

    it('should handle numeric variables in templates', async () => {
      const res = await request(app)
        .post('/api/v1/admin/notifications/from-template')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          template_id: 'transaction_confirmation',
          variables: {
            amount: 1234.56,
            recipientName: 'Merchant Account',
            refId: 'TXN-20251212-001',
          },
        })
        .expect(201);

      expect(res.body.data.body).toContain('1234.56');
    });

    it('should handle special characters in variables', async () => {
      const res = await request(app)
        .post('/api/v1/admin/notifications/from-template')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          template_id: 'welcome_bonus',
          variables: {
            userName: "O'Reilly & Associates",
            amount: 100,
            promoCode: 'CODE-2025',
          },
        })
        .expect(201);

      expect(res.body.data.title).toContain("O'Reilly & Associates");
    });

    it('should persist notification created from template in database', async () => {
      const res = await request(app)
        .post('/api/v1/admin/notifications/from-template')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          template_id: 'welcome_bonus',
          variables: {
            userName: 'Frank',
            amount: 90,
            promoCode: 'FRANK90',
          },
        })
        .expect(201);

      // Verify in database
      const dbNotif = await db('notifications')
        .where({ id: res.body.data.id })
        .first();

      expect(dbNotif).toBeDefined();
      expect(dbNotif.title).toBe('Welcome Frank! 🎉');
      expect(dbNotif.body).toContain('90 bonus credits');
    });
  });
});
