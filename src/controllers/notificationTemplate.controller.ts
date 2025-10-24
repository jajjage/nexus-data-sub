import { Request, Response } from 'express';
import { NotificationTemplateService } from '../services/notificationTemplate.service';
import { sendError, sendSuccess } from '../utils/response.utils';

export class NotificationTemplateController {
  static async createTemplate(req: Request, res: Response) {
    try {
      const template = await NotificationTemplateService.create(req.body);
      return sendSuccess(res, 'Template created successfully', template, 201);
    } catch (error: any) {
      return sendError(res, error.message, error.statusCode || 500, []);
    }
  }

  static async getTemplate(req: Request, res: Response) {
    try {
      const template = await NotificationTemplateService.get(
        req.params.templateId
      );
      return sendSuccess(res, 'Template retrieved successfully', template, 200);
    } catch (error: any) {
      return sendError(res, error.message, error.statusCode || 500, []);
    }
  }

  static async listTemplates(req: Request, res: Response) {
    try {
      const templates = await NotificationTemplateService.list();
      return sendSuccess(
        res,
        'Templates retrieved successfully',
        templates,
        200
      );
    } catch (error: any) {
      return sendError(res, error.message, error.statusCode || 500, []);
    }
  }

  static async updateTemplate(req: Request, res: Response) {
    try {
      const template = await NotificationTemplateService.update(
        req.params.templateId,
        req.body
      );
      return sendSuccess(res, 'Template updated successfully', template, 200);
    } catch (error: any) {
      return sendError(res, error.message, error.statusCode || 500, []);
    }
  }

  static async deleteTemplate(req: Request, res: Response) {
    try {
      await NotificationTemplateService.delete(req.params.templateId);
      return sendSuccess(res, 'Template deleted successfully', {}, 200);
    } catch (error: any) {
      return sendError(res, error.message, error.statusCode || 500, []);
    }
  }
}
