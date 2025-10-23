import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { sendError, sendSuccess } from '../utils/response.utils';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    permissions: string[];
    sessionId: string;
  };
}

export class NotificationController {
  static async createNotification(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401, []);
      }
      const adminId = req.user.userId;
      const notification = await NotificationService.createAndSend(
        req.body,
        adminId
      );
      return sendSuccess(
        res,
        'Notification created successfully',
        notification,
        201
      );
    } catch (error) {
      console.error('Create notification error:', error);
      return sendError(res, 'Internal server error', 500, []);
    }
  }

  static async registerPushToken(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401, []);
      }
      const userId = req.user.userId;
      await NotificationService.registerPushToken({ ...req.body, userId });
      return sendSuccess(res, 'Push token registered successfully', {}, 204);
    } catch (error) {
      console.error('Register push token error:', error);
      return sendError(res, 'Internal server error', 500, []);
    }
  }

  static async getUserNotifications(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401, []);
      }
      const userId = req.user.userId;
      const notifications =
        await NotificationService.getUserNotifications(userId);
      return sendSuccess(
        res,
        'User notifications retrieved successfully',
        notifications,
        200
      );
    } catch (error) {
      console.error('Get user notifications error:', error);
      return sendError(res, 'Internal server error', 500, []);
    }
  }
}
