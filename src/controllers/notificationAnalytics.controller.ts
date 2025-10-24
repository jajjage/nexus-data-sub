import { Request, Response } from 'express';
import { NotificationAnalyticsService } from '../services/notificationAnalytics.service';
import { sendError, sendSuccess } from '../utils/response.utils';

export class NotificationAnalyticsController {
  static async getAnalyticsByNotificationId(req: Request, res: Response) {
    try {
      const analytics = await NotificationAnalyticsService.getByNotificationId(
        req.params.notificationId
      );
      return sendSuccess(
        res,
        'Analytics retrieved successfully',
        analytics,
        200
      );
    } catch (error: any) {
      return sendError(res, error.message, error.statusCode || 500, []);
    }
  }

  static async getAnalyticsByUserId(req: Request, res: Response) {
    try {
      const analytics = await NotificationAnalyticsService.getByUserId(
        req.params.userId
      );
      return sendSuccess(
        res,
        'Analytics retrieved successfully',
        analytics,
        200
      );
    } catch (error: any) {
      return sendError(res, error.message, error.statusCode || 500, []);
    }
  }
}
