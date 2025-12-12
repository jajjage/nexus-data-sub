import request from 'supertest';
import app from '../../../src/app';
import db from '../../../src/database/connection';
import { CreateUserInput, UserModel } from '../../../src/models/User';
import { jsonb } from '../../../src/utils/db.utils';
import { getCookie } from '../../test-helpers';

describe('Notification Template Controller - Full Integration Tests', () => {
  let adminUser: any;
  let adminToken: string;
  let regularUser: any;
  let regularToken: string;

  beforeAll(async () => {
    // Use existing admin role instead of creating custom one
    const adminRole = await db('roles').where('name', 'admin').first();

    // Create admin user with admin role
    const adminData: CreateUserInput = {
      email: 'admin.templates@test.com',
      fullName: 'Admin Templates',
      phoneNumber: '3333333333',
      password: 'AdminPassword123!',
      role: adminRole.name,
    };
    const createdAdmin = await UserModel.create(adminData);
    adminUser = await UserModel.findForAuth(createdAdmin.email);

    // Create regular user (no template management permissions)
    const userRole = await db('roles').where('name', 'user').first();

    const userData: CreateUserInput = {
      email: 'user.templates@test.com',
      fullName: 'Regular User Templates',
      phoneNumber: '4444444444',
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
    await db('notification_templates').del();
    if (adminUser?.userId) {
      await db('users').where({ id: adminUser.userId }).del();
    }
    if (regularUser?.userId) {
      await db('users').where({ id: regularUser.userId }).del();
    }
  });

  describe('POST /api/v1/admin/notifications/templates - Create Template', () => {
    it('should create a notification template with required fields', async () => {
      const templateData = {
        template_id: 'welcome_user',
        title: 'Welcome {{userName}}! 🎉',
        body: 'Start your journey with a {{amount}} bonus credit',
        locales: ['en', 'es', 'fr'],
      };

      const res = await request(app)
        .post('/api/v1/admin/notifications/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(templateData)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.template_id).toBe(templateData.template_id);
      expect(res.body.data.title).toBe(templateData.title);
      expect(res.body.data.body).toBe(templateData.body);

      // Verify in database
      const dbTemplate = await db('notification_templates')
        .where({ template_id: templateData.template_id })
        .first();
      expect(dbTemplate).toBeDefined();
      expect(dbTemplate.title).toBe(templateData.title);
    });

    it('should create template with single locale', async () => {
      const templateData = {
        template_id: 'single_locale_template',
        title: 'Single Locale',
        body: 'This template has one locale',
        locales: ['en'],
      };

      const res = await request(app)
        .post('/api/v1/admin/notifications/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(templateData)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.template_id).toBe(templateData.template_id);
    });

    it('should create template with empty locales array', async () => {
      const templateData = {
        template_id: 'no_locales_template',
        title: 'No Locales',
        body: 'Template without locales',
        locales: [],
      };

      const res = await request(app)
        .post('/api/v1/admin/notifications/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(templateData)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.template_id).toBe(templateData.template_id);
    });

    it('should return 400 if template_id is missing', async () => {
      const templateData = {
        title: 'Missing template_id',
        body: 'Template without ID',
        locales: ['en'],
      };

      const res = await request(app)
        .post('/api/v1/admin/notifications/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(templateData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 400 if title is missing', async () => {
      const templateData = {
        template_id: 'missing_title',
        body: 'Body without title',
        locales: ['en'],
      };

      const res = await request(app)
        .post('/api/v1/admin/notifications/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(templateData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 400 if body is missing', async () => {
      const templateData = {
        template_id: 'missing_body',
        title: 'Title without body',
        locales: ['en'],
      };

      const res = await request(app)
        .post('/api/v1/admin/notifications/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(templateData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 409 if template_id already exists', async () => {
      const templateData = {
        template_id: 'duplicate_template',
        title: 'First Create',
        body: 'First template',
        locales: ['en'],
      };

      // Create first template
      await request(app)
        .post('/api/v1/admin/notifications/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(templateData)
        .expect(201);

      // Try to create duplicate
      const res = await request(app)
        .post('/api/v1/admin/notifications/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(templateData)
        .expect(409);

      expect(res.body.success).toBe(false);
    });

    it('should return 401 if not authenticated', async () => {
      const templateData = {
        template_id: 'unauth_template',
        title: 'Unauthorized',
        body: 'Should not create',
        locales: ['en'],
      };

      await request(app)
        .post('/api/v1/admin/notifications/templates')
        .send(templateData)
        .expect(401);
    });

    it('should return 403 if user lacks permission', async () => {
      const templateData = {
        template_id: 'forbidden_template',
        title: 'Forbidden Create',
        body: 'Should not create',
        locales: ['en'],
      };

      await request(app)
        .post('/api/v1/admin/notifications/templates')
        .set('Authorization', `Bearer ${regularToken}`)
        .send(templateData)
        .expect(403);
    });
  });

  describe('GET /api/v1/admin/notifications/templates - List Templates', () => {
    beforeAll(async () => {
      // Create multiple test templates
      const templates = [
        {
          template_id: 'list_template_1',
          title: 'List Template 1',
          body: 'First template for listing',
          locales: jsonb(['en']),
        },
        {
          template_id: 'list_template_2',
          title: 'List Template 2',
          body: 'Second template for listing',
          locales: jsonb(['en', 'es']),
        },
        {
          template_id: 'list_template_3',
          title: 'List Template 3',
          body: 'Third template for listing',
          locales: jsonb(['en', 'es', 'fr']),
        },
      ];

      for (const template of templates) {
        await db('notification_templates').insert(template);
      }
    });

    it('should list all notification templates', async () => {
      const res = await request(app)
        .get('/api/v1/admin/notifications/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    });

    it('should list templates with all fields', async () => {
      const res = await request(app)
        .get('/api/v1/admin/notifications/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
      const template = res.body.data[0];
      expect(template).toHaveProperty('id');
      expect(template).toHaveProperty('template_id');
      expect(template).toHaveProperty('title');
      expect(template).toHaveProperty('body');
      expect(template).toHaveProperty('locales');
      expect(template).toHaveProperty('created_at');
      expect(template).toHaveProperty('updated_at');
    });

    it('should return 401 if not authenticated', async () => {
      await request(app).get('/api/v1/admin/notifications/templates').expect(401);
    });

    it('should return 403 if user lacks permission', async () => {
      await request(app)
        .get('/api/v1/admin/notifications/templates')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);
    });
  });

  describe('GET /api/v1/admin/notifications/templates/:templateId - Get Single Template', () => {
    let testTemplateId: string;

    beforeAll(async () => {
      testTemplateId = 'get_single_template';
      await db('notification_templates').insert({
        template_id: testTemplateId,
        title: 'Single Template Retrieve',
        body: 'This template is for retrieval testing',
        locales: jsonb(['en', 'es']),
      });
    });

    it('should retrieve a template by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/notifications/templates/${testTemplateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.template_id).toBe(testTemplateId);
      expect(res.body.data.title).toBe('Single Template Retrieve');
      expect(res.body.data.body).toBe('This template is for retrieval testing');
    });

    it('should return 404 for non-existent template', async () => {
      const res = await request(app)
        .get('/api/v1/admin/notifications/templates/non-existent-template')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('should return 401 if not authenticated', async () => {
      await request(app)
        .get(`/api/v1/admin/notifications/templates/${testTemplateId}`)
        .expect(401);
    });

    it('should return 403 if user lacks permission', async () => {
      await request(app)
        .get(`/api/v1/admin/notifications/templates/${testTemplateId}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);
    });
  });

  describe('PUT /api/v1/admin/notifications/templates/:templateId - Update Template', () => {
    let updateTemplateId: string;

    beforeAll(async () => {
      updateTemplateId = 'update_template';
      await db('notification_templates').insert({
        template_id: updateTemplateId,
        title: 'Original Title',
        body: 'Original body content',
        locales: jsonb(['en']),
      });
    });

    it('should update template title', async () => {
      const updateData = {
        title: 'Updated Title',
      };

      const res = await request(app)
        .put(`/api/v1/admin/notifications/templates/${updateTemplateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Updated Title');

      // Verify in database
      const dbTemplate = await db('notification_templates')
        .where({ template_id: updateTemplateId })
        .first();
      expect(dbTemplate.title).toBe('Updated Title');
    });

    it('should update template body', async () => {
      const updateData = {
        body: 'Updated body content with new information',
      };

      const res = await request(app)
        .put(`/api/v1/admin/notifications/templates/${updateTemplateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.body).toBe(
        'Updated body content with new information'
      );
    });

    it('should update template locales', async () => {
      const updateData = {
        locales: ['en', 'es', 'fr', 'de'],
      };

      const res = await request(app)
        .put(`/api/v1/admin/notifications/templates/${updateTemplateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.locales).toEqual(
        expect.arrayContaining(['en', 'es', 'fr', 'de'])
      );
    });

    it('should update multiple fields at once', async () => {
      const updateData = {
        title: 'Completely Updated Title',
        body: 'Completely new body',
        locales: ['en', 'fr'],
      };

      const res = await request(app)
        .put(`/api/v1/admin/notifications/templates/${updateTemplateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Completely Updated Title');
      expect(res.body.data.body).toBe('Completely new body');
    });

    it('should return 404 for non-existent template', async () => {
      const res = await request(app)
        .put('/api/v1/admin/notifications/templates/non-existent')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Updated' })
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('should return 401 if not authenticated', async () => {
      await request(app)
        .put(`/api/v1/admin/notifications/templates/${updateTemplateId}`)
        .send({ title: 'Hacked' })
        .expect(401);
    });

    it('should return 403 if user lacks permission', async () => {
      await request(app)
        .put(`/api/v1/admin/notifications/templates/${updateTemplateId}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ title: 'Unauthorized Update' })
        .expect(403);
    });
  });

  describe('DELETE /api/v1/admin/notifications/templates/:templateId - Delete Template', () => {
    let deleteTemplateId: string;

    beforeAll(async () => {
      deleteTemplateId = 'delete_template';
      await db('notification_templates').insert({
        template_id: deleteTemplateId,
        title: 'Template to Delete',
        body: 'This template will be deleted',
        locales: jsonb(['en']),
      });
    });

    it('should delete a notification template', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/notifications/templates/${deleteTemplateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);

      // Verify in database
      const dbTemplate = await db('notification_templates')
        .where({ template_id: deleteTemplateId })
        .first();
      expect(dbTemplate).toBeUndefined();
    });

    it('should return 404 for non-existent template', async () => {
      const res = await request(app)
        .delete('/api/v1/admin/notifications/templates/non-existent')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('should return 401 if not authenticated', async () => {
      const newTemplateId = 'auth_delete_test';
      await db('notification_templates').insert({
        template_id: newTemplateId,
        title: 'Auth Delete Test',
        body: 'Testing auth on delete',
        locales: jsonb(['en']),
      });

      await request(app)
        .delete(`/api/v1/admin/notifications/templates/${newTemplateId}`)
        .expect(401);

      // Cleanup
      await db('notification_templates')
        .where({ template_id: newTemplateId })
        .del();
    });

    it('should return 403 if user lacks permission', async () => {
      const newTemplateId = 'perm_delete_test';
      await db('notification_templates').insert({
        template_id: newTemplateId,
        title: 'Permission Delete Test',
        body: 'Testing permissions on delete',
        locales: jsonb(['en']),
      });

      await request(app)
        .delete(`/api/v1/admin/notifications/templates/${newTemplateId}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);

      // Cleanup
      await db('notification_templates')
        .where({ template_id: newTemplateId })
        .del();
    });
  });

  describe('Integration: Full Template Lifecycle', () => {
    it('should handle complete create-read-update-delete cycle', async () => {
      const templateId = 'lifecycle_template';
      const initialData = {
        template_id: templateId,
        title: 'Lifecycle Test',
        body: 'Testing complete lifecycle',
        locales: ['en'],
      };

      // Create
      await request(app)
        .post('/api/v1/admin/notifications/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(initialData)
        .expect(201);

      // Read
      const getRes = await request(app)
        .get(`/api/v1/admin/notifications/templates/${templateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(getRes.body.data.template_id).toBe(templateId);

      // Update
      const updateRes = await request(app)
        .put(`/api/v1/admin/notifications/templates/${templateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Updated Lifecycle Test',
          locales: ['en', 'es'],
        })
        .expect(200);

      expect(updateRes.body.data.title).toBe('Updated Lifecycle Test');

      // Delete
      await request(app)
        .delete(`/api/v1/admin/notifications/templates/${templateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify deleted
      await request(app)
        .get(`/api/v1/admin/notifications/templates/${templateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should maintain template data integrity across operations', async () => {
      const templateId = 'integrity_test';
      const templateData = {
        template_id: templateId,
        title: 'Integrity Test {{variable}}',
        body: 'Body with {{placeholder}} and {{anotherOne}}',
        locales: ['en', 'es', 'fr'],
      };

      // Create
      await request(app)
        .post('/api/v1/admin/notifications/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(templateData)
        .expect(201);

      // Get immediately
      const getRes = await request(app)
        .get(`/api/v1/admin/notifications/templates/${templateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify all data matches
      expect(getRes.body.data.template_id).toBe(templateData.template_id);
      expect(getRes.body.data.title).toBe(templateData.title);
      expect(getRes.body.data.body).toBe(templateData.body);

      // Cleanup
      await request(app)
        .delete(`/api/v1/admin/notifications/templates/${templateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });
});
