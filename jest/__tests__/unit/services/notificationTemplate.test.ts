import db from '../../../../src/database/connection';
import { NotificationTemplateService } from '../../../../src/services/notificationTemplate.service';
import { ApiError } from '../../../../src/utils/ApiError';

describe('NotificationTemplateService', () => {
  const templateData1 = {
    template_id: 'service-test-template-1',
    title: 'Service Test Template 1',
    body: 'This is a test template for the service',
    locales: ['en', 'fr'],
  };

  const templateData2 = {
    template_id: 'service-test-template-2',
    title: 'Service Test Template 2',
    body: 'This is another test template',
    locales: ['es'],
  };

  beforeEach(async () => {
    // Clean the table before each test to ensure isolation
    await db('notification_templates').del();
  });

  afterAll(async () => {
    // Clean up all templates created during the tests
    await db('notification_templates').del();
  });

  describe('create', () => {
    it('should create a new notification template successfully', async () => {
      const result = await NotificationTemplateService.create(templateData1);
      expect(result).toBeDefined();
      expect(result.template_id).toBe(templateData1.template_id);

      const dbTemplate = await db('notification_templates')
        .where({ template_id: templateData1.template_id })
        .first();
      expect(dbTemplate).toBeDefined();
    });

    it('should throw an ApiError if a template with the same ID already exists', async () => {
      await NotificationTemplateService.create(templateData1);
      await expect(
        NotificationTemplateService.create(templateData1)
      ).rejects.toThrow(
        new ApiError(409, 'Template with this ID already exists')
      );
    });
  });

  describe('get', () => {
    it('should retrieve a notification template by its ID', async () => {
      await NotificationTemplateService.create(templateData1);
      const result = await NotificationTemplateService.get(
        templateData1.template_id
      );
      expect(result).toBeDefined();
      expect(result?.template_id).toBe(templateData1.template_id);
    });

    it('should throw an ApiError if the template is not found', async () => {
      await expect(
        NotificationTemplateService.get('non-existent-template')
      ).rejects.toThrow(new ApiError(404, 'Template not found'));
    });
  });

  describe('list', () => {
    it('should return a list of all notification templates', async () => {
      await NotificationTemplateService.create(templateData1);
      await NotificationTemplateService.create(templateData2);
      const result = await NotificationTemplateService.list();
      expect(result).toHaveLength(2);
    });

    it('should return an empty list if no templates exist', async () => {
      const result = await NotificationTemplateService.list();
      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update an existing notification template', async () => {
      await NotificationTemplateService.create(templateData1);
      const updates = { title: 'A New Title' };
      const result = await NotificationTemplateService.update(
        templateData1.template_id,
        updates
      );
      expect(result).toBeDefined();
      expect(result?.title).toBe(updates.title);
    });

    it('should throw an ApiError if the template to update is not found', async () => {
      await expect(
        NotificationTemplateService.update('non-existent-template', {
          title: 'New Title',
        })
      ).rejects.toThrow(new ApiError(404, 'Template not found'));
    });
  });

  describe('delete', () => {
    it('should delete a notification template', async () => {
      await NotificationTemplateService.create(templateData1);
      await NotificationTemplateService.delete(templateData1.template_id);
      const dbTemplate = await db('notification_templates')
        .where({ template_id: templateData1.template_id })
        .first();
      expect(dbTemplate).toBeUndefined();
    });

    it('should throw an ApiError if the template to delete is not found', async () => {
      await expect(
        NotificationTemplateService.delete('non-existent-template')
      ).rejects.toThrow(new ApiError(404, 'Template not found'));
    });
  });
});
