import db from '../../../../src/database/connection';
import { NotificationTemplateModel } from '../../../../src/models/NotificationTemplate';

describe('NotificationTemplateModel', () => {
  afterEach(async () => {
    await db('notification_templates').del();
  });

  describe('create', () => {
    it('should create a new notification template', async () => {
      const templateData = {
        template_id: 'test-template',
        title: 'Test Template',
        body: 'This is a test template with {{variable}}',
        locales: ['en', 'es'],
      };
      const template = await NotificationTemplateModel.create(templateData);
      expect(template).toBeDefined();
      expect(template.template_id).toBe('test-template');
      // Knex returns locales as a string, so we parse it for the test
      expect(JSON.parse(template.locales as any)).toEqual(['en', 'es']);
    });
  });

  describe('findByTemplateId', () => {
    it('should find a notification template by ID', async () => {
      const templateData = {
        template_id: 'find-template',
        title: 'Find Template',
        body: 'Body',
        locales: ['en'],
      };
      await NotificationTemplateModel.create(templateData);
      const template =
        await NotificationTemplateModel.findByTemplateId('find-template');
      expect(template).toBeDefined();
      expect(template?.template_id).toBe('find-template');
    });
  });

  describe('findAll', () => {
    it('should return all notification templates', async () => {
      await NotificationTemplateModel.create({
        template_id: 'template1',
        title: 'Template 1',
        body: 'Body 1',
        locales: ['en'],
      });
      await NotificationTemplateModel.create({
        template_id: 'template2',
        title: 'Template 2',
        body: 'Body 2',
        locales: ['es'],
      });
      const templates = await NotificationTemplateModel.findAll();
      expect(templates).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('should update a notification template', async () => {
      const templateData = {
        template_id: 'update-template',
        title: 'Update Template',
        body: 'Body',
        locales: ['en'],
      };
      await NotificationTemplateModel.create(templateData);
      const updatedTemplate = await NotificationTemplateModel.update(
        'update-template',
        {
          title: 'Updated Title',
        }
      );
      expect(updatedTemplate).toBeDefined();
      expect(updatedTemplate?.title).toBe('Updated Title');
    });
  });

  describe('delete', () => {
    it('should delete a notification template', async () => {
      const templateData = {
        template_id: 'delete-template',
        title: 'Delete Template',
        body: 'Body',
        locales: ['en'],
      };
      await NotificationTemplateModel.create(templateData);
      const deleted = await NotificationTemplateModel.delete('delete-template');
      expect(deleted).toBe(true);
      const template =
        await NotificationTemplateModel.findByTemplateId('delete-template');
      expect(template).toBeNull();
    });
  });
});
