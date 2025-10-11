import { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { RoleModel } from '../models/Role';
import { SessionService } from '../services/session.service';
import { sendError, sendSuccess } from '../utils/response.utils';

export class AdminController {
  static async getAllUsers(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const { users, total } = await UserModel.getAllUsers(page, limit);

      if (!users || users.length === 0) {
        return sendSuccess(res, 'No users found', {
          users: [],
          pagination: { page, limit, total, totalPages: 0 },
        });
      }

      const totalPages = Math.ceil(total / limit);

      return sendSuccess(res, 'Users retrieved successfully', {
        users: users,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      });
    } catch (error) {
      console.error('Get all users error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async assignRole(req: Request, res: Response) {
    try {
      const { userId, roleId } = req.body;

      if (!userId || !roleId) {
        return sendError(res, 'User ID and Role ID are required', 400);
      }

      const user = await UserModel.findById(userId);
      if (!user) {
        return sendError(res, 'User not found', 404);
      }

      const role = await RoleModel.findById(roleId);
      if (!role) {
        return sendError(res, 'Role not found', 404);
      }

      if (user.role === role.name) {
        return sendError(res, 'User already has this role', 409);
      }

      await UserModel.updateRole(userId, role.name);

      return sendSuccess(res, 'Role assigned successfully', {
        userId,
        roleId,
        roleName: role.name,
      });
    } catch (error) {
      console.error('Assign role error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async getRoles(req: Request, res: Response) {
    try {
      const roles = await RoleModel.getAll();

      return sendSuccess(res, 'Roles retrieved successfully', {
        roles,
      });
    } catch (error) {
      console.error('Get roles error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async revokeUserSessions(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return sendError(res, 'User ID is required', 400);
      }

      const user = await UserModel.findById(userId);
      if (!user) {
        return sendError(res, 'User not found', 404);
      }

      const deletedCount = await SessionService.deleteAllUserSessions(userId);

      return sendSuccess(
        res,
        `Revoked ${deletedCount} active session(s) for user`,
        {
          userId,
          sessionsRevoked: deletedCount,
        }
      );
    } catch (error) {
      console.error('Revoke user sessions error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async getUserSessions(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return sendError(res, 'User ID is required', 400);
      }

      const user = await UserModel.findById(userId);
      if (!user) {
        return sendError(res, 'User not found', 404);
      }

      const sessions = await SessionService.getUserSessions(userId);

      const formattedSessions = sessions.map(session => ({
        id: session.id,
        userAgent: session.userAgent,
        ip: session.ip,
        createdAt: new Date(session.createdAt).toISOString(),
        expiresAt: new Date(session.expiresAt).toISOString(),
      }));

      return sendSuccess(res, 'User sessions retrieved successfully', {
        userId,
        sessions: formattedSessions,
      });
    } catch (error) {
      console.error('Get user sessions error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async disable2FAByAdmin(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { userId } = req.params;

      if (!userId) {
        return sendError(res, 'User ID is required', 400);
      }

      const user = await UserModel.findById(userId);
      if (!user) {
        return sendError(res, 'User not found', 404);
      }

      if (!user.twoFactorEnabled) {
        return sendError(res, '2FA is not enabled for this user', 400);
      }

      await UserModel.disable2FA(userId);

      return sendSuccess(res, '2FA disabled successfully for user');
    } catch (error) {
      console.error('Disable 2FA by admin error:', error);
      return sendError(res, 'Internal server error');
    }
  }
}
