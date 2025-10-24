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
}
