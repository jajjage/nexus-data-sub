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

      const { title, body, targetCriteria, publish_at, type, category } =
        req.body;

      // Validate required fields
      if (!title || !body) {
        return sendError(res, 'Title and body are required', 400, []);
      }

      // Validate type if provided
      const validTypes = ['info', 'success', 'warning', 'error', 'alert'];
      if (type && !validTypes.includes(type)) {
        return sendError(
          res,
          `Invalid notification type. Must be one of: ${validTypes.join(', ')}`,
          400,
          []
        );
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
          type: type || 'info',
          category,
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

  /**
   * Create a notification with optional scheduling for future delivery
   * POST /admin/notifications/schedule
   */
  static async createScheduledNotification(
    req: AuthenticatedRequest,
    res: Response
  ) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401, []);
      }

      const { title, body, targetCriteria, publish_at, type, category } =
        req.body;

      // Validate required fields
      if (!title || !body) {
        return sendError(res, 'Title and body are required', 400, []);
      }

      // Validate type if provided
      const validTypes = ['info', 'success', 'warning', 'error', 'alert'];
      if (type && !validTypes.includes(type)) {
        return sendError(
          res,
          `Invalid notification type. Must be one of: ${validTypes.join(', ')}`,
          400,
          []
        );
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
      }

      // Validate publish_at if provided
      if (publish_at) {
        const publishDate = new Date(publish_at);
        if (isNaN(publishDate.getTime())) {
          return sendError(res, 'Invalid publish_at date format', 400, []);
        }
      }

      const notification = await NotificationService.createScheduled(
        {
          title,
          body,
          type: type || 'info',
          category,
          targetCriteria,
          publish_at,
        },
        req.user.userId
      );

      const message = publish_at
        ? `Notification scheduled successfully for ${new Date(publish_at).toISOString()}`
        : 'Notification created and sent successfully';

      return sendSuccess(res, message, notification, 201);
    } catch (error) {
      console.error('Create scheduled notification error:', error);
      return sendError(res, 'Internal server error', 500, []);
    }
  }

  /**
   * Create a notification from a template with variable substitution
   * POST /admin/notifications/from-template
   */
  static async createFromTemplate(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401, []);
      }

      const {
        template_id,
        variables,
        category,
        type,
        targetCriteria,
        publish_at,
      } = req.body;

      // Validate required fields
      if (!template_id) {
        return sendError(res, 'template_id is required', 400, []);
      }

      // Validate type if provided
      const validTypes = ['info', 'success', 'warning', 'error', 'alert'];
      if (type && !validTypes.includes(type)) {
        return sendError(
          res,
          `Invalid notification type. Must be one of: ${validTypes.join(', ')}`,
          400,
          []
        );
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
      }

      // Validate publish_at if provided
      if (publish_at) {
        const publishDate = new Date(publish_at);
        if (isNaN(publishDate.getTime())) {
          return sendError(res, 'Invalid publish_at date format', 400, []);
        }
      }

      const notification = await NotificationService.createFromTemplate(
        {
          template_id,
          variables,
          category,
          type: type || 'info',
          targetCriteria,
          publish_at,
        },
        req.user.userId
      );

      const message = publish_at
        ? `Notification scheduled successfully for ${new Date(publish_at).toISOString()}`
        : 'Notification created and sent successfully from template';

      return sendSuccess(res, message, notification, 201);
    } catch (error: any) {
      if (error.statusCode === 404) {
        return sendError(res, error.message, 404, []);
      }
      console.error('Create from template error:', error);
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
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const notifications = await NotificationService.getUserNotifications(
        userId,
        limit,
        offset
      );
      const unreadCount = await NotificationService.getUnreadCount(userId);

      return sendSuccess(
        res,
        'User notifications retrieved successfully',
        {
          notifications,
          unreadCount,
          limit,
          offset,
        },
        200
      );
    } catch (error) {
      console.error('Get user notifications error:', error);
      return sendError(res, 'Internal server error', 500, []);
    }
  }

  /**
   * Get a single notification by ID for the authenticated user
   * GET /notifications/:notificationId
   */
  static async getNotificationById(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401, []);
      }

      const { notificationId } = req.params;
      if (!notificationId) {
        return sendError(res, 'Notification ID is required', 400, []);
      }

      const notification = await NotificationService.getNotificationById(
        notificationId,
        req.user.userId
      );

      if (!notification) {
        return sendError(res, 'Notification not found', 404, []);
      }

      return sendSuccess(
        res,
        'Notification retrieved successfully',
        notification,
        200
      );
    } catch (error) {
      console.error('Get notification by ID error:', error);
      return sendError(res, 'Internal server error', 500, []);
    }
  }

  /**
   * Marks a notification as read for the authenticated user
   */
  static async markAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401, []);
      }

      const { notificationId } = req.params;
      if (!notificationId) {
        return sendError(res, 'Notification ID is required', 400, []);
      }

      await NotificationService.markNotificationAsRead(
        notificationId,
        req.user.userId
      );

      return sendSuccess(res, 'Notification marked as read', {}, 200);
    } catch (error) {
      console.error('Mark as read error:', error);
      return sendError(res, 'Internal server error', 500, []);
    }
  }

  /**
   * Marks a notification as unread for the authenticated user
   */
  static async markAsUnread(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401, []);
      }

      const { notificationId } = req.params;
      if (!notificationId) {
        return sendError(res, 'Notification ID is required', 400, []);
      }

      await NotificationService.markNotificationAsUnread(
        notificationId,
        req.user.userId
      );

      return sendSuccess(res, 'Notification marked as unread', {}, 200);
    } catch (error) {
      console.error('Mark as unread error:', error);
      return sendError(res, 'Internal server error', 500, []);
    }
  }

  /**
   * Marks all notifications as read for the authenticated user
   */
  static async markAllAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401, []);
      }

      const count = await NotificationService.markAllAsRead(req.user.userId);

      return sendSuccess(
        res,
        'All notifications marked as read',
        { count },
        200
      );
    } catch (error) {
      console.error('Mark all as read error:', error);
      return sendError(res, 'Internal server error', 500, []);
    }
  }

  /**
   * Gets unread count for the authenticated user
   */
  static async getUnreadCount(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401, []);
      }

      const unreadCount = await NotificationService.getUnreadCount(
        req.user.userId
      );

      return sendSuccess(res, 'Unread count retrieved', { unreadCount }, 200);
    } catch (error) {
      console.error('Get unread count error:', error);
      return sendError(res, 'Internal server error', 500, []);
    }
  }

  /**
   * Deletes a notification for the authenticated user
   * Removes the user's notification entry (soft delete)
   */
  static async deleteNotification(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401, []);
      }

      const { notificationId } = req.params;
      if (!notificationId) {
        return sendError(res, 'Notification ID is required', 400, []);
      }

      await NotificationService.deleteUserNotification(
        notificationId,
        req.user.userId
      );

      return sendSuccess(res, 'Notification deleted', {}, 200);
    } catch (error) {
      console.error('Delete notification error:', error);
      return sendError(res, 'Internal server error', 500, []);
    }
  }

  /**
   * Unlinks/removes a push token for the authenticated user
   * @param req - Express request with user context
   * @param res - Express response
   */
  static async unlinkToken(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401, []);
      }

      const { token } = req.body;
      // const userId = req.user.userId;

      // Validate required fields
      if (!token) {
        return sendError(res, 'Token is required', 400, []);
      }

      // Mark the token as unregistered
      await NotificationModel.updateTokenStatus(token, {
        status: 'unregistered',
        failure_reason: 'User unlinked token',
      });

      return sendSuccess(
        res,
        'Push token unlinked successfully',
        { token },
        200
      );
    } catch (error) {
      console.error('Unlink push token error:', error);
      return sendError(res, 'Internal server error', 500, []);
    }
  }

  /**
   * Edit/update a notification (admin only)
   * PATCH /notifications/:id
   */
  static async editNotification(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401, []);
      }

      const { notificationId } = req.params;
      const { title, body, type, category, targetCriteria, publish_at } =
        req.body;

      if (!notificationId) {
        return sendError(res, 'Notification ID is required', 400, []);
      }

      // At least one field should be provided to update
      if (
        !title &&
        !body &&
        !type &&
        !category &&
        !targetCriteria &&
        !publish_at
      ) {
        return sendError(
          res,
          'At least one field must be provided for update',
          400,
          []
        );
      }

      // Validate type if provided
      const validTypes = ['info', 'success', 'warning', 'error', 'alert'];
      if (type && !validTypes.includes(type)) {
        return sendError(
          res,
          `Invalid notification type. Must be one of: ${validTypes.join(', ')}`,
          400,
          []
        );
      }

      const notification = await NotificationService.editNotification(
        notificationId,
        {
          title,
          body,
          type,
          category,
          targetCriteria,
          publish_at,
        }
      );

      if (!notification) {
        return sendError(res, 'Notification not found', 404, []);
      }

      return sendSuccess(
        res,
        'Notification updated successfully',
        notification,
        200
      );
    } catch (error: any) {
      console.error('Edit notification error:', error);
      return sendError(res, error.message || 'Internal server error', 500, []);
    }
  }

  /**
   * Archive/delete a notification (admin only)
   * DELETE /notifications/:id
   */
  static async archiveNotification(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401, []);
      }

      const { notificationId } = req.params;

      if (!notificationId) {
        return sendError(res, 'Notification ID is required', 400, []);
      }

      const archived =
        await NotificationService.archiveNotification(notificationId);

      if (!archived) {
        return sendError(res, 'Notification not found', 404, []);
      }

      return sendSuccess(
        res,
        'Notification archived successfully',
        { id: notificationId },
        200
      );
    } catch (error: any) {
      console.error('Archive notification error:', error);
      return sendError(res, error.message || 'Internal server error', 500, []);
    }
  }

  /**
   * Get all notifications with optional filters (admin)
   * GET /notifications (admin version)
   */
  static async listAllNotifications(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401, []);
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const archived = req.query.archived === 'true';

      const result = await NotificationService.listNotifications(
        limit,
        offset,
        archived
      );

      return sendSuccess(
        res,
        'Notifications retrieved successfully',
        result,
        200
      );
    } catch (error: any) {
      console.error('List notifications error:', error);
      return sendError(res, error.message || 'Internal server error', 500, []);
    }
  }
}
