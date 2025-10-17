import { Request, Response } from 'express';
import { SessionService } from '../services/session.service';
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

export class SessionController {
  static async getActiveSessions(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401, []);
      }

      const sessions = await SessionService.getUserSessions(req.user.userId);

      const formattedSessions = sessions.map(session => ({
        id: session.id,
        userAgent: session.userAgent,
        ipAddress: session.ip,
        createdAt: new Date(session.createdAt).toISOString(),
        expiresAt: new Date(session.expiresAt).toISOString(),
        isCurrent: req.rawHeaders.includes(session.refreshToken),
      }));

      return sendSuccess(
        res,
        'Active sessions retrieved successfully',
        { sessions: formattedSessions },
        200
      );
    } catch (error) {
      console.error('Get active sessions error:', error);
      return sendError(res, 'Internal server error', 401, []);
    }
  }

  static async logoutAllDevices(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401, []);
      }

      const deletedCount = await SessionService.deleteAllUserSessions(
        req.user.userId
      );

      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');

      return sendSuccess(
        res,
        `Logged out from ${deletedCount} device(s) successfully`,
        {},
        200
      );
    } catch (error) {
      console.error('Logout all devices error:', error);
      return sendError(res, 'Internal server error', 500, []);
    }
  }
}
