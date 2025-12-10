import { Request, Response } from 'express';
import { UserNotificationPreferenceService } from '../services/userNotificationPreference.service';
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

export class UserNotificationPreferenceController {
  static async getPreferences(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401, []);
      }
      const preferences =
        await UserNotificationPreferenceService.getPreferences(req.user.userId);
      return sendSuccess(
        res,
        'Preferences retrieved successfully',
        preferences,
        200
      );
    } catch (error: any) {
      return sendError(res, error.message, error.statusCode || 500, []);
    }
  }

  static async upsertPreference(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401, []);
      }
      const preference =
        await UserNotificationPreferenceService.upsertPreference({
          ...req.body,
          userId: req.user.userId,
        });
      return sendSuccess(
        res,
        'Preference updated successfully',
        preference,
        200
      );
    } catch (error: any) {
      return sendError(res, error.message, error.statusCode || 500, []);
    }
  }

  /**
   * Toggle subscription for a specific notification category
   * PUT /notification-preferences/:category
   */
  static async toggleCategorySubscription(
    req: AuthenticatedRequest,
    res: Response
  ) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401, []);
      }

      const { category } = req.params;
      const { subscribed } = req.body;

      if (typeof subscribed !== 'boolean') {
        return sendError(res, 'subscribed must be a boolean', 400, []);
      }

      const preference =
        await UserNotificationPreferenceService.updatePreference(
          req.user.userId,
          category,
          subscribed
        );

      return sendSuccess(res, 'Category subscription toggled', preference, 200);
    } catch (error: any) {
      return sendError(res, error.message, error.statusCode || 500, []);
    }
  }

  /**
   * Mute all notification categories for user
   * POST /notification-preferences/mute-all
   */
  static async muteAll(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401, []);
      }

      const preferences =
        await UserNotificationPreferenceService.muteAllCategories(
          req.user.userId
        );

      return sendSuccess(res, 'All notifications muted', preferences, 200);
    } catch (error: any) {
      return sendError(res, error.message, error.statusCode || 500, []);
    }
  }

  /**
   * Unmute all notification categories for user
   * POST /notification-preferences/unmute-all
   */
  static async unmuteAll(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401, []);
      }

      const preferences =
        await UserNotificationPreferenceService.unmuteAllCategories(
          req.user.userId
        );

      return sendSuccess(res, 'All notifications unmuted', preferences, 200);
    } catch (error: any) {
      return sendError(res, error.message, error.statusCode || 500, []);
    }
  }
}
