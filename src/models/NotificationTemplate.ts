import db from '../database/connection';
import { NotificationTemplate } from '../types/notification.types';
import { jsonb } from '../utils/db.utils';

export class NotificationTemplateModel {
  static async create(
    templateData: Omit<NotificationTemplate, 'id' | 'created_at' | 'updated_at'>
  ): Promise<NotificationTemplate> {
    const dataToInsert = {
      ...templateData,
      // Convert locales array to JSONB string
      locales: jsonb(templateData.locales),
    };
    const [template] = await db('notification_templates')
      .insert(dataToInsert)
      .returning('*');
    // Return locales as array for API response
    if (template && template.locales && typeof template.locales === 'string') {
      try {
        template.locales = JSON.parse(template.locales);
      } catch (err) {
        void err;
      }
    }
    return template;
  }

  static async findByTemplateId(
    templateId: string
  ): Promise<NotificationTemplate | null> {
    const template = await db('notification_templates')
      .where('template_id', templateId)
      .first();
    if (template && template.locales && typeof template.locales === 'string') {
      try {
        template.locales = JSON.parse(template.locales);
      } catch (err) {
        void err;
      }
    }
    return template || null;
  }

  static async findAll(): Promise<NotificationTemplate[]> {
    const templates = await db('notification_templates').select('*');
    return templates.map((t: any) => {
      if (t && t.locales && typeof t.locales === 'string') {
        try {
          t.locales = JSON.parse(t.locales);
        } catch (err) {
          void err;
        }
      }
      return t;
    });
  }

  static async update(
    templateId: string,
    templateData: Partial<
      Omit<NotificationTemplate, 'id' | 'created_at' | 'updated_at'>
    >
  ): Promise<NotificationTemplate | null> {
    const dataToUpdate: any = { ...templateData };
    // Convert locales array to JSONB string if provided
    if (dataToUpdate.locales) {
      dataToUpdate.locales = jsonb(dataToUpdate.locales);
    }
    const [template] = await db('notification_templates')
      .where('template_id', templateId)
      .update(dataToUpdate)
      .returning('*');
    // Return locales as array for API response
    if (template && template.locales && typeof template.locales === 'string') {
      try {
        template.locales = JSON.parse(template.locales);
      } catch (err) {
        void err;
      }
    }
    return template || null;
  }

  static async delete(templateId: string): Promise<boolean> {
    const result = await db('notification_templates')
      .where('template_id', templateId)
      .delete();
    return result > 0;
  }
}
