import { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { JwtService } from '../services/jwt.service';
import { SessionService } from '../services/session.service';
import { TotpService } from '../services/topt.service';
import { generateSecureToken } from '../utils/crypto';
import { handleBackupCodeReset } from '../utils/handle2fa';
import { sendError, sendSuccess } from '../utils/response.utils';
import { comparePassword, getClientIP } from '../utils/security.utils';

export class MobileAuthController {
  /**
   * Login user on a mobile device.
   */
  static async login(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password, phoneNumber, totpCode, backupCode, deviceId } =
        req.body;
      const identifier = email || phoneNumber;

      if (!identifier || !password) {
        return sendError(
          res,
          'Email or phone number, and password are required',
          400
        );
      }

      const user = await UserModel.findForAuth(identifier);

      if (!user || !(await comparePassword(password, user.password ?? ''))) {
        return sendError(res, 'Invalid credentials', 401);
      }

      if (user.isSuspended) {
        return sendError(res, 'Your account has been suspended.', 403);
      }

      if (!user.isVerified) {
        return sendError(
          res,
          'Please verify your account before logging in',
          403
        );
      }

      if (user.twoFactorEnabled) {
        if (!totpCode && !backupCode) {
          return sendSuccess(res, '2FA code is required', { twoFactor: true });
        }

        let isValid = false;
        if (totpCode) {
          isValid = TotpService.verifyToken(user.twoFactorSecret!, totpCode);
        } else if (backupCode) {
          isValid = await TotpService.verifyBackupCode(user.userId, backupCode);
          if (isValid) {
            try {
              const result = await handleBackupCodeReset(req, {
                userId: user.userId,
                email: user.email,
              });
              (req as any).__twofaResult = result;
            } catch (err: any) {
              if (err.message === 'RESET_PARAM_INVALID') {
                return sendError(res, 'Reset parameter must be a boolean', 400);
              }
              if (err.message === 'TOO_MANY_ATTEMPTS') {
                const remaining = err.remaining ?? 0;
                return sendError(
                  res,
                  `Too many 2FA disable attempts. Try again tomorrow. (${remaining} attempts remaining)`,
                  429
                );
              }
              console.error('Error handling backup-code reset:', err);
              return sendError(res, 'Failed processing 2FA reset', 500);
            }
          }
        }

        if (!isValid) {
          return sendError(res, 'Invalid 2FA code', 401);
        }
      }

      const ip = getClientIP(req);
      const sessionId = generateSecureToken();
      const { accessToken, refreshToken } = JwtService.generateTokenPair({
        userId: user.userId,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        sessionId,
        aud: user.email,
      });

      const userAgent = (req as any).deviceInfo;

      setImmediate(() => {
        SessionService.createSession(
          sessionId,
          user.userId,
          refreshToken,
          userAgent,
          ip,
          deviceId
        ).catch(err => console.error('Failed to create session:', err));
      });

      const userProfile = await UserModel.findProfileById(user.userId);

      const twofaResult = (req as any).__twofaResult as
        | {
            reconfigure2fa?: true;
            qrCode?: string;
            backupCodes?: string[];
            twoFactorDisabled?: true;
          }
        | undefined;

      const responsePayload: any = {
        user: userProfile,
        accessToken,
        refreshToken,
      };

      if (twofaResult) Object.assign(responsePayload, twofaResult);

      return sendSuccess(res, 'Login successful', responsePayload);
    } catch (error) {
      console.error('Mobile login error:', error);
      return sendError(res, 'Internal server error during login', 500);
    }
  }

  /**
   * Refresh access token for mobile.
   */
  static async refresh(req: Request, res: Response): Promise<Response> {
    try {
      const { refreshToken: oldRefreshToken } = req.body;
      if (!oldRefreshToken) {
        return sendError(res, 'No refresh token found', 401);
      }

      const decoded = JwtService.verifyRefreshToken(oldRefreshToken);
      const session =
        await SessionService.getSessionByRefreshToken(oldRefreshToken);

      if (!session || !decoded) {
        return sendError(res, 'Invalid or expired refresh token', 401);
      }

      const user = await UserModel.findForAuth(decoded.email);
      if (!user || !user.isVerified || user.isSuspended) {
        await SessionService.deleteSession(session.id);
        return sendError(
          res,
          'User not found, suspended, or not verified',
          404
        );
      }

      const tokens = JwtService.generateTokenPair({
        userId: user.userId,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        sessionId: session.id,
        aud: user.email,
      });

      await SessionService.updateSessionToken(session.id, tokens.refreshToken);

      return sendSuccess(res, 'Tokens refreshed successfully', {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    } catch (error) {
      console.error('Mobile refresh error:', error);
      return sendError(res, 'Internal server error during token refresh', 500);
    }
  }
}
