import { NotificationTemplateModel } from '../models/NotificationTemplate';
import { NotificationTemplate } from '../types/notification.types';
import { ApiError } from '../utils/ApiError';

export class NotificationTemplateService {
  static async create(
    templateData: Omit<NotificationTemplate, 'id' | 'created_at' | 'updated_at'>
  ): Promise<NotificationTemplate> {
    try {
      const existingTemplate = await NotificationTemplateModel.findByTemplateId(
        templateData.template_id
      );
      if (existingTemplate) {
        throw new ApiError(409, 'Template with this ID already exists');
      }

      const result = await NotificationTemplateModel.create(templateData);
      return result;
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  }

  static async get(templateId: string): Promise<NotificationTemplate> {
    const template =
      await NotificationTemplateModel.findByTemplateId(templateId);
    if (!template) {
      throw new ApiError(404, 'Template not found');
    }
    return template;
  }

  static async list(): Promise<NotificationTemplate[]> {
    return NotificationTemplateModel.findAll();
  }

  static async update(
    templateId: string,
    templateData: Partial<
      Omit<NotificationTemplate, 'id' | 'created_at' | 'updated_at'>
    >
  ): Promise<NotificationTemplate> {
    const template = await NotificationTemplateModel.update(
      templateId,
      templateData
    );
    if (!template) {
      throw new ApiError(404, 'Template not found');
    }
    return template;
  }

  static async delete(templateId: string): Promise<void> {
    const success = await NotificationTemplateModel.delete(templateId);
    if (!success) {
      throw new ApiError(404, 'Template not found');
    }
  }
}
