import { Request, Response } from 'express';
import { NotificationModel } from '../models/Notification';
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

      const { title, body, targetCriteria, publish_at } = req.body;

      // Validate required fields
      if (!title || !body) {
        return sendError(res, 'Title and body are required', 400, []);
      }

      // Validate targeting criteria if provided
      if (targetCriteria) {
        if (targetCriteria.registrationDateRange) {
          const { start, end } = targetCriteria.registrationDateRange;
          if (!start || !end || new Date(start) > new Date(end)) {
            return sendError(res, 'Invalid registration date range', 400, []);
          }
        }

        if (
          targetCriteria.minTransactionCount &&
          targetCriteria.maxTransactionCount &&
          targetCriteria.minTransactionCount >
            targetCriteria.maxTransactionCount
        ) {
          return sendError(res, 'Invalid transaction count range', 400, []);
        }

        if (
          targetCriteria.minTopupCount &&
          targetCriteria.maxTopupCount &&
          targetCriteria.minTopupCount > targetCriteria.maxTopupCount
        ) {
          return sendError(res, 'Invalid topup count range', 400, []);
        }

        if (
          targetCriteria.lastActiveWithinDays &&
          targetCriteria.lastActiveWithinDays <= 0
        ) {
          return sendError(
            res,
            'Last active days must be a positive number',
            400,
            []
          );
        }
      }

      const notification = await NotificationService.createAndSend(
        {
          title,
          body,
          targetCriteria,
          publish_at,
        },
        req.user.userId
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

      const { token, platform } = req.body;
      const userId = req.user.userId;

      // First, invalidate any existing tokens for this user on this platform
      await NotificationModel.updateUserTokensStatus(userId, platform, {
        status: 'unregistered',
        failure_reason: 'Token replaced by new registration',
      });

      // Register the new token
      await NotificationService.registerPushToken({
        userId,
        token,
        platform,
      });

      return sendSuccess(
        res,
        'Push token registered successfully',
        {
          platform,
          status: 'active',
        },
        201
      );
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
