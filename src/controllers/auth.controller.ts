import { Request, Response } from 'express';
import { ROLE_PERMISSIONS } from '../config/rbac';
import db from '../database/connection';
import { UserModel } from '../models/User';
import { EmailService } from '../services/email.service';
import { JwtService } from '../services/jwt.service';
import { SessionService } from '../services/session.service';
import { TotpService } from '../services/topt.service';
import { generateSecureToken } from '../utils/crypto';
import { extractRefreshToken } from '../utils/extractJHeaders';
import { sendError, sendSuccess } from '../utils/response.utils';
import {
  clearAuthCookies,
  comparePassword,
  getClientIP,
  setAuthCookies,
} from '../utils/security.utils';
import { twoFADisableTracker } from '../utils/twoFADisableTracker';
import { validateEmail, validatePassword } from '../utils/validation.utils';

interface ResendVerificationRequest {
  email: string;
}

interface RegisterRequest {
  email: string;
  phoneNumber: string;
  fullName: string;
  password: string;
}

export class AuthController {
  private emailService: EmailService;
  private virtualAccountService: any;

  constructor(emailService: EmailService, virtualAccountService: any) {
    this.emailService = emailService;
    this.virtualAccountService = virtualAccountService;
  }
  /**
   * Register a new user
   */
  public static async register(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password, phoneNumber, fullName }: RegisterRequest =
        req.body;

      if (!email || !password || !phoneNumber || !fullName) {
        return sendError(
          res,
          'Email, password, and phone number are required',
          400,
          []
        );
      }

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        return sendError(
          res,
          passwordValidation.message || 'Invalid password format',
          400,
          []
        );
      }

      const normalizedEmail = email.toLowerCase().trim();

      // For public registration, ignore any supplied role and assign the safe default.
      // If admin users should create other roles, that should be a separate endpoint
      // protected by RBAC.
      const normalizedRole = 'user';

      // Normalize phone number: strip non-digit characters
      const normalizedPhone = String(phoneNumber || '').replace(/\D/g, '');
      if (!normalizedPhone) {
        return sendError(res, 'Invalid phone number', 400, []);
      }

      // Basic length check (Nigeria numbers typically 7-15 digits including country code)
      if (normalizedPhone.length < 7 || normalizedPhone.length > 15) {
        return sendError(res, 'Invalid phone number length', 400, []);
      }

      const existingUserByEmail = await UserModel.findByEmail(normalizedEmail);
      if (existingUserByEmail) {
        return sendError(res, 'User with this email already exists', 409, []);
      }

      const existingUserByPhone =
        await UserModel.findByPhoneNumber(normalizedPhone);
      if (existingUserByPhone) {
        return sendError(
          res,
          'User with this phone number already exists',
          409,
          []
        );
      }

      let user;
      try {
        user = await UserModel.create({
          email: normalizedEmail,
          phoneNumber: normalizedPhone,
          fullName: fullName.trim(),
          password,
          role: normalizedRole,
        });
      } catch (err: any) {
        // Map DB unique constraint errors to 409 with helpful message
        if (err && err.code === '23505') {
          const detail: string = err.detail || '';
          const m = detail.match(/Key \(([^)]+)\)=\(([^)]+)\) already exists/);
          if (m) {
            const column = m[1];
            const value = m[2];
            const human = column.includes('email')
              ? `User with this email (${value}) already exists`
              : column.includes('phone') || column.includes('phone_number')
                ? `User with this phone number (${value}) already exists`
                : `Duplicate value for ${column}: ${value}`;
            return sendError(res, human, 409, []);
          }
          return sendError(res, 'Duplicate value error', 409, []);
        }
        throw err;
      }

      // Fire-and-forget welcome email; keep compatibility with existing method name
      setImmediate(async () => {
        try {
          const emailService = new EmailService();
          await emailService.sendWelcomeEmail(user.email, user.fullName);
        } catch (error) {
          console.error('Failed to send welcome email:', error);
        }
      });

      // Create a virtual account for the new user.
      // This is done after user creation is successful to ensure data integrity.
      try {
        const { VirtualAccountService } = await import(
          '../services/virtualAccount.service'
        );
        const vaService = new VirtualAccountService();
        await vaService.createAndPersistVirtualAccount({
          id: user.userId,
          name: user.fullName,
          email: user.email,
        });
      } catch (error) {
        // If VA creation fails, log it but don't fail the registration.
        // This could be enhanced with a retry mechanism or a cleanup job.
        console.error(
          `Failed to create virtual account for user ${user.userId}:`,
          error
        );
      }

      // Public registration creates an active (verified) low-privilege user.
      return sendSuccess(
        res,
        'User registered successfully.',
        {
          id: user.userId,
          email: user.email,
        },
        201
      );
    } catch (error) {
      console.error('Registration error:', error);
      return sendError(
        res,
        'Internal server error during registration',
        500,
        []
      );
    }
  }

  /**
   * Login user
   */
  static async login(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password, phoneNumber, totpCode, backupCode, reset } =
        req.body;

      if ((!email && !phoneNumber) || !password) {
        return sendError(
          res,
          'Email or phone number, and password are required',
          400
        );
      }

      const normalizedEmail = email ? email.toLowerCase().trim() : null;

      let user;
      if (normalizedEmail) {
        user = await UserModel.findByEmail(normalizedEmail);
      } else if (phoneNumber) {
        const normalizedPhone = String(phoneNumber).replace(/\D/g, '');
        user = await UserModel.findByPhoneNumber(normalizedPhone);
      }

      if (!user || !(await comparePassword(password, user.password ?? ''))) {
        return sendError(res, 'Invalid email/phone or password', 401);
      }

      if (!user.isVerified) {
        return sendError(
          res,
          'Please verify your email before logging in',
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
              // Fire-and-forget is acceptable for non-critical emails, but handle the promise
              setImmediate(async () => {
                try {
                  const emailService = new EmailService();
                  await emailService.send2FADisableEmail(user.email);
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
        permissions: user.permissions?.map(p => p.name) || [],
        sessionId,
        aud: user.email,
      });

      const userAgent = (req as any).deviceInfo;

      setImmediate(async () => {
        try {
          await SessionService.createSession(
            sessionId,
            user.userId,
            refreshToken,
            userAgent,
            ip
          );
        } catch (error) {
          console.error('Failed to create session:', error);
        }
      });

      setAuthCookies(res, accessToken, refreshToken);

      return sendSuccess(res, 'Login successful', {
        id: user.userId,
        email: user.email,
        role: user.role,
      });
    } catch (error) {
      console.error('Login error:', error);
      return sendError(res, 'Internal server error during login', 500);
    }
  }

  /**
   * Logout user
   */
  static async logout(req: Request, res: Response): Promise<Response> {
    try {
      const rawHeaders = req.rawHeaders;
      const refreshtoken = extractRefreshToken(rawHeaders);
      const refreshToken = req.cookies.refreshToken || refreshtoken;

      if (refreshToken) {
        try {
          const session =
            await SessionService.getSessionByRefreshToken(refreshToken);
          if (session) {
            await SessionService.deleteSession(session.id);
          }
        } catch (error) {
          // Log the error, but don't prevent the user from logging out.
          console.error('Error deleting session during logout:', error);
        }
      }

      clearAuthCookies(res);

      return sendSuccess(res, 'Logout successful', {}, 200);
    } catch (error) {
      console.error('Logout error:', error);
      clearAuthCookies(res);
      return sendError(res, 'Internal server error during logout', 500, []);
    }
  }

  /**
   * Refresh access token
   */
  static async refresh(req: Request, res: Response): Promise<Response> {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        return sendError(res, 'No refresh token found', 401, []);
      }

      let decoded;
      try {
        decoded = JwtService.verifyRefreshToken(refreshToken);
      } catch (error) {
        clearAuthCookies(res);
        return sendError(res, `Invalid refresh token ${error}`, 401, []);
      }

      if (!decoded) {
        clearAuthCookies(res);
        return sendError(res, 'Invalid refresh token', 401, []);
      }

      const session =
        await SessionService.getSessionByRefreshToken(refreshToken);
      if (!session) {
        clearAuthCookies(res);
        return sendError(res, 'Session not found for refresh token', 401, []);
      }

      const user = await UserModel.findById(session.userId);
      if (!user || !user.isVerified) {
        clearAuthCookies(res);
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

      setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

      return sendSuccess(
        res,
        'Tokens refreshed successfully',
        {
          id: user.userId,
          email: user.email,
          role: user.role,
        },
        200
      );
    } catch (error) {
      console.error('Refresh error:', error);
      clearAuthCookies(res);
      return sendError(
        res,
        'Internal server error during token refresh',
        500,
        []
      );
    }
  }

  /**
   * Verify user email
   */
  static async verifyEmail(req: Request, res: Response): Promise<Response> {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return sendError(res, 'Verification token is required', 400, []);
      }

      const isVerified = await UserModel.verifyEmail(token);

      if (!isVerified) {
        return sendError(res, 'Invalid or expired verification token', 400, []);
      }

      return sendSuccess(
        res,
        'Email verified successfully. You can now log in.',
        {},
        200
      );
    } catch (error) {
      console.error('Email verification error:', error);
      return sendError(
        res,
        'Internal server error during email verification',
        500,
        []
      );
    }
  }

  /**
   * Resend verification email
   */
  static async resendVerification(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { email }: ResendVerificationRequest = req.body;

      if (!email) {
        return sendError(res, 'Email is required', 400, []);
      }

      if (!validateEmail(email)) {
        return sendError(res, 'Please provide a valid email address', 400, []);
      }

      const normalizedEmail = email.toLowerCase().trim();
      const user = await UserModel.findByEmail(normalizedEmail);

      if (!user) {
        return sendError(res, 'User not found', 401, []);
      }

      if (user.isVerified) {
        return sendError(res, 'User is already verified', 400, []);
      }

      const verificationToken = await UserModel.generateVerificationToken(
        user.userId
      );

      setImmediate(async () => {
        try {
          const emailService = new EmailService();
          await emailService.sendWelcomeEmail(user.email, verificationToken);
        } catch (error) {
          console.error('Failed to send verification email:', error);
        }
      });
      return sendSuccess(
        res,
        'Verification email resent successfully',
        {},
        200
      );
    } catch (error) {
      console.error('Resend verification error:', error);
      return sendError(
        res,
        'Internal server error while resending verification',
        500,
        []
      );
    }
  }
}
