import { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { EmailService } from '../services/email.service';
import { JwtService } from '../services/jwt.service';
import { NotificationService } from '../services/notification.service';
import { SessionService } from '../services/session.service';
import { TotpService } from '../services/topt.service';
import { generateSecureToken } from '../utils/crypto';
import { handleBackupCodeReset } from '../utils/handle2fa';
import { sendError, sendSuccess } from '../utils/response.utils';
import {
  clearAuthCookies,
  comparePassword,
  getClientIP,
  setAuthCookies,
} from '../utils/security.utils';
import { validatePassword } from '../utils/validation.utils';

export class AuthController {
  /**
   * Register a new user.
   */
  public static async register(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password, phoneNumber, fullName, fcmToken, platform } =
        req.body;

      if (!email || !password || !phoneNumber || !fullName) {
        return sendError(
          res,
          'Email, password, phone number, and full name are required',
          400
        );
      }

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        return sendError(
          res,
          passwordValidation.message || 'Invalid password format',
          400
        );
      }

      // Check for existing user
      const existingUser = await UserModel.findForAuth(email);
      if (existingUser) {
        return sendError(res, 'User with this email already exists', 409);
      }

      // Create the user inside a transaction so related VA persistence can
      // reuse the same transaction when needed.
      const { default: db } = await import('../database/connection');
      const createdUser = await db.transaction(async trx => {
        const user = await UserModel.create(
          {
            email,
            phoneNumber,
            fullName,
            password,
            role: 'user', // Public registration defaults to 'user'
          },
          trx
        );

        // Fire-and-forget welcome email (outside trx)
        setImmediate(async () => {
          try {
            const emailService = new EmailService();
            await emailService.sendWelcomeEmail(
              user.email,
              user.fullName || ''
            );
          } catch (error) {
            console.error('Failed to send welcome email:', error);
          }
        });

        // Attempt to create virtual account within the same transaction
        try {
          const { VirtualAccountService } = await import(
            '../services/virtualAccount.service'
          );
          const vaService = new VirtualAccountService();
          await vaService.createAndPersistVirtualAccount(
            {
              id: user.userId,
              name: user.fullName || '',
              email: user.email,
            },
            trx
          );
        } catch (error) {
          console.error(
            `Failed to create virtual account for user ${user.userId}:`,
            error
          );
          // Don't rethrow; we don't want VA failure to block registration
        }

        return user;
      });

      // Register FCM token if provided
      if (fcmToken && platform) {
        try {
          await NotificationService.registerPushToken({
            userId: createdUser.userId,
            token: fcmToken,
            platform: platform as 'ios' | 'android' | 'web',
          });
        } catch (error) {
          console.error('Failed to register FCM token:', error);
          // Don't fail registration if FCM token registration fails
        }
      }

      return sendSuccess(
        res,
        'User registered successfully.',
        { id: createdUser.userId, email: createdUser.email },
        201
      );
    } catch (error: any) {
      // Handle potential unique constraint violation from the model
      if (error.code === '23505') {
        return sendError(
          res,
          'A user with the provided details already exists.',
          409
        );
      }
      console.error('Registration error:', error);
      return sendError(res, 'Internal server error during registration', 500);
    }
  }

  /**
   * Login user.
   */
  static async login(req: Request, res: Response): Promise<Response> {
    try {
      const {
        email,
        password,
        phoneNumber,
        totpCode,
        backupCode,
        fcmToken,
        platform,
      } = req.body;
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
          ip
        ).catch(err => console.error('Failed to create session:', err));
      });

      setAuthCookies(res, accessToken, refreshToken);

      // Fetch the public profile for the response
      const userProfile = await UserModel.findProfileById(user.userId);

      const twofaResult = (req as any).__twofaResult as
        | {
            reconfigure2fa?: true;
            qrCode?: string;
            backupCodes?: string[];
            twoFactorDisabled?: true;
          }
        | undefined;

      // Register or update FCM token if provided
      if (fcmToken && platform) {
        try {
          await NotificationService.registerPushToken({
            userId: user.userId,
            token: fcmToken,
            platform: platform as 'ios' | 'android' | 'web',
          });
        } catch (error) {
          console.error('Failed to register FCM token:', error);
          // Don't fail login if FCM token registration fails
        }
      }

      const payload: any = { user: userProfile };
      if (twofaResult) Object.assign(payload, twofaResult);

      return sendSuccess(res, 'Login successful', payload);
    } catch (error) {
      console.error('Login error:', error);
      return sendError(res, 'Internal server error during login', 500);
    }
  }

  /**
   * Logout user.
   */
  static async logout(req: Request, res: Response): Promise<Response> {
    try {
      const { refreshToken } = req.cookies;

      if (refreshToken) {
        const session =
          await SessionService.getSessionByRefreshToken(refreshToken);
        if (session) {
          await SessionService.deleteSession(session.id);
        }
      }

      clearAuthCookies(res);
      return sendSuccess(res, 'Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
      clearAuthCookies(res);
      return sendError(res, 'Internal server error during logout', 500);
    }
  }

  /**
   * Refresh access token.
   */
  static async refresh(req: Request, res: Response): Promise<Response> {
    try {
      const { refreshToken } = req.cookies;
      if (!refreshToken) {
        return sendError(res, 'No refresh token found', 401);
      }

      const decoded = JwtService.verifyRefreshToken(refreshToken);
      const session =
        await SessionService.getSessionByRefreshToken(refreshToken);

      if (!session || !decoded) {
        clearAuthCookies(res);
        return sendError(res, 'Invalid or expired refresh token', 401);
      }

      const user = await UserModel.findForAuth(decoded.email);
      if (!user || !user.isVerified || user.isSuspended) {
        clearAuthCookies(res);
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
      setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

      return sendSuccess(res, 'Tokens refreshed successfully');
    } catch (error) {
      console.error('Refresh error:', error);
      clearAuthCookies(res);
      return sendError(res, 'Internal server error during token refresh', 500);
    }
  }

  // Note: Email verification flow is deprecated in the new model,
  // so verifyEmail and resendVerification are left as is but will likely fail
  // or do nothing if UserModel.verifyEmail/generateVerificationToken are removed.
}
