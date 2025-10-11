import { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { TotpService } from '../services/topt.service';
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

export class TwoFactorController {
  static async setup2FA(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 400, []);
      }

      const privilegedRoles = ['admin', 'staff'];
      if (!privilegedRoles.includes(req.user.role)) {
        return sendError(
          res,
          '2FA setup is only available for admin and staff roles',
          403,
          []
        );
      }

      const user = await UserModel.findById(req.user.userId);
      if (!user) {
        return sendError(res, 'User not found', 400, []);
      }

      if (user.twoFactorEnabled) {
        return sendError(
          res,
          '2FA is already enabled for this account',
          400,
          []
        );
      }

      const totpSetup = await TotpService.setup2FA(req.user.userId);

      return sendSuccess(
        res,
        '2FA setup initiated successfully',
        { qrCode: totpSetup.qrCode, secret: totpSetup.secret },
        200
      );
    } catch (error) {
      console.error('2FA setup error:', error);
      return sendError(res, 'Internal server error', 500, []);
    }
  }

  static async enable2FA(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401, []);
      }

      const { totpCode } = req.body;

      const privilegedRoles = ['admin', 'staff'];
      if (!privilegedRoles.includes(req.user.role)) {
        return sendError(
          res,
          '2FA is only available for admin and staff roles',
          403,
          []
        );
      }

      const user = await UserModel.findById(req.user.userId);
      if (!user) {
        return sendError(res, 'User not found', 404, []);
      }

      if (user.twoFactorEnabled) {
        return sendError(
          res,
          '2FA is already enabled for this account',
          400,
          []
        );
      }

      if (!user.twoFactorSecret) {
        return sendError(res, 'Please initiate 2FA setup first', 400, []);
      }

      if (!totpCode) {
        return sendError(res, 'TOTP code is required', 400, []);
      }

      const isValidTotp = TotpService.verifyToken(
        user.twoFactorSecret,
        totpCode
      );
      if (!isValidTotp) {
        return sendError(res, 'Invalid TOTP code', 400, []);
      }

      const { plain: plainBackupCodes, hashed: hashedBackupCodes } =
        TotpService.generateBackupCodes();
      await UserModel.enable2FA(
        req.user.userId,
        user.twoFactorSecret,
        JSON.stringify(hashedBackupCodes.map(code => ({ code, used: false })))
      );

      return sendSuccess(
        res,
        '2FA enabled successfully',
        { backupCodes: plainBackupCodes },
        200
      );
    } catch (error) {
      console.error('Enable 2FA error:', error);
      return sendError(res, 'Internal server error', 500, []);
    }
  }

  static async verify2FA(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 400, []);
      }

      const { totpCode, backupCode } = req.body;

      const user = await UserModel.findById(req.user.userId);
      if (!user) {
        return sendError(res, 'User not found', 400, []);
      }

      if (!user.twoFactorEnabled) {
        return sendError(res, '2FA is not enabled for this account', 400, []);
      }

      let isValid = false;

      if (backupCode) {
        isValid = await TotpService.verifyBackupCode(
          req.user.userId,
          backupCode
        );
        if (!isValid) {
          return sendError(res, 'Invalid backup code', 400, []);
        }
      } else if (totpCode) {
        isValid = TotpService.verifyToken(user.twoFactorSecret!, totpCode);
        if (!isValid) {
          return sendError(res, 'Invalid TOTP code', 400, []);
        }
      } else {
        return sendError(
          res,
          'Either TOTP code or backup code is required',
          400,
          []
        );
      }

      return sendSuccess(res, '2FA verification successful', {}, 200);
    } catch (error) {
      console.error('2FA verification error:', error);
      return sendError(res, 'Internal server error', 500, []);
    }
  }

  static async get2FAStatus(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 400, []);
      }

      const user = await UserModel.findById(req.user.userId);
      if (!user) {
        return sendError(res, 'User not found', 400, []);
      }

      return sendSuccess(
        res,
        '2FA status retrieved successfully',
        {
          enabled: user.twoFactorEnabled,
          roleRequires2FA: ['admin', 'staff'].includes(user.role),
        },
        200
      );
    } catch (error) {
      console.error('Get 2FA status error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  static async disable2FA(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, 'Authentication required', 401);
      }

      const user = await UserModel.findById(userId);
      if (!user) {
        return sendError(res, 'User not found', 404);
      }

      if (!user.twoFactorEnabled) {
        return sendError(res, '2FA is not enabled for this account', 400);
      }

      await UserModel.disable2FA(userId);

      return sendSuccess(res, '2FA disabled successfully');
    } catch (error) {
      console.error('Disable 2FA error:', error);
      return sendError(res, 'Internal server error', 500);
    }
  }
}
