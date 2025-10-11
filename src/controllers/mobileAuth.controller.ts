/* eslint-disable no-console */
import { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { JwtService } from '../services/jwt.service';
import { SessionService } from '../services/session.service';
import { ROLE_PERMISSIONS } from '../config/rbac';
import { generateSecureToken } from '../utils/crypto';
import { getClientIP, comparePassword } from '../utils/security.utils';
import { sendError, sendSuccess } from '../utils/response.utils';
import { TotpService } from '../services/topt.service';
import db from '../database/connection';
import { EmailService } from '../services/email.service';
import { twoFADisableTracker } from '../utils/twoFADisableTracker';

export class MobileAuthController {
  private static emailService = new EmailService();
  /**
   * Login user on mobile
   */
  static async login(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password, totpCode, backupCode, deviceId, reset } =
        req.body;

      if (!email || !password) {
        return sendError(res, 'Email and password are required', 400);
      }

      const normalizedEmail = email.toLowerCase().trim();
      const user = await UserModel.findByEmail(normalizedEmail);

      if (!user || !(await comparePassword(password, user.password ?? ''))) {
        return sendError(res, 'Invalid email or password', 400);
      }

      if (!user.isVerified) {
        return sendError(
          res,
          'Please verify your email before logging in',
          400
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
            if (reset !== undefined && typeof reset !== 'boolean') {
              return sendError(res, 'Reset parameter must be a boolean', 400);
            }

            if (reset === false) {
              const clientIP = getClientIP(req);
              if (!twoFADisableTracker.canDisable2FA(user.userId, clientIP)) {
                const remaining = twoFADisableTracker.getRemainingAttempts(
                  user.userId,
                  clientIP
                );
                return sendError(
                  res,
                  `Too many 2FA disable attempts. Try again tomorrow. (${remaining} attempts remaining)`,
                  429
                );
              }

              twoFADisableTracker.recordAttempt(user.userId, clientIP);

              console.log(
                `2FA disabled via backup code for user: ${user.userId}, IP: ${getClientIP(req)}`
              );

              await UserModel.disable2FA(user.userId);
              setImmediate(async () => {
                try {
                  await MobileAuthController.emailService.send2FADisableEmail(
                    user.email
                  );
                } catch (error) {
                  console.error('Failed to send verification email:', error);
                }
              });
            } else {
              // Default behavior (reset === true or undefined) - force 2FA reconfiguration
              console.log(
                `2FA reconfiguration triggered for user: ${user.userId}, IP: ${getClientIP(req)}`
              );

              const secret = TotpService.generateSecret();
              const { plain: plainBackupCodes, hashed: hashedBackupCodes } =
                TotpService.generateBackupCodes();

              const dbBackupCodes = JSON.stringify(
                hashedBackupCodes.map(code => ({ code, used: false }))
              );

              await db('users').where({ id: user.userId }).update({
                two_factor_secret: secret.base32,
                updated_at: db.fn.now(),
              });

              await UserModel.updateBackupCodes(user.userId, dbBackupCodes);

              const qrCode = await TotpService.generateQrCode(
                secret.base32,
                user.email
              );

              return sendSuccess(res, 'Please re-configure your 2FA', {
                reconfigure2fa: true,
                qrCode,
                secret: secret.base32,
                backupCodes: plainBackupCodes,
              });
            }
          }
        }

        if (!isValid) {
          return sendError(res, 'Invalid 2FA code', 400);
        }
      }

      const ip = getClientIP(req);
      const sessionId = generateSecureToken();
      const { accessToken, refreshToken } = JwtService.generateTokenPair({
        userId: user.userId,
        email: user.email,
        role: user.role,
        permissions: user.permissions?.map(p => p.name),
        sessionId,
        aud: user.email,
      });

      const userAgent = (req as any).deviceInfo;
      console.log(userAgent);

      setImmediate(async () => {
        try {
          await SessionService.createSession(
            sessionId,
            user.userId,
            refreshToken,
            userAgent,
            ip,
            deviceId
          );
        } catch (error) {
          console.error('Failed to send verification email:', error);
        }
      });

      return sendSuccess(
        res,
        'Login successful',
        {
          id: user.userId,
          email: user.email,
          role: user.role,
          accessToken,
          refreshToken,
        },
        200
      );
    } catch (error) {
      console.error('Login error:', error);
      return sendError(res, 'Internal server error during login', 500);
    }
  }

  /**
   * Refresh access token for mobile
   */
  static async refresh(req: Request, res: Response): Promise<Response> {
    try {
      const { refreshToken: oldRefreshToken } = req.body;

      if (!oldRefreshToken) {
        return sendError(res, 'No refresh token found', 404, []);
      }

      let decoded;
      try {
        decoded = JwtService.verifyRefreshToken(oldRefreshToken);
      } catch (error) {
        return sendError(res, `Invalid refresh token ${error}`, 400, []);
      }

      if (!decoded) {
        return sendError(res, 'Invalid refresh token', 400, []);
      }

      const session =
        await SessionService.getSessionByRefreshToken(oldRefreshToken);
      if (!session) {
        return sendError(res, 'Session not found for refresh token', 404, []);
      }

      const user = await UserModel.findById(session.userId);
      if (!user || !user.isVerified) {
        await SessionService.deleteSession(session.id);
        return sendError(res, 'User not found or not verified', 404, []);
      }

      const tokens = JwtService.generateTokenPair({
        userId: user.userId,
        email: user.email,
        role: user.role,
        permissions:
          ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || [],
        sessionId: session.id,
        aud: user.email,
      });

      await SessionService.updateSessionToken(session.id, tokens.refreshToken);

      return sendSuccess(
        res,
        'Tokens refreshed successfully',
        {
          id: user.userId,
          email: user.email,
          role: user.role,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
        200
      );
    } catch (error) {
      console.error('Refresh error:', error);
      return sendError(
        res,
        'Internal server error during token refresh',
        500,
        []
      );
    }
  }
}
