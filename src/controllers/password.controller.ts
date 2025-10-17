import { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { EmailService } from '../services/email.service';
import { comparePassword } from '../utils/security.utils';
import { validatePassword } from '../utils/validation.utils';
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

export class PasswordController {
  private static emailService = new EmailService();

  static async forgotPassword(req: Request, res: Response): Promise<Response> {
    try {
      const { email } = req.body;
      if (!email) {
        return sendError(res, 'Email is required', 400);
      }

      const user = await UserModel.findByEmail(email);
      if (user) {
        const token = await UserModel.generatePasswordResetToken(user.userId);
        setImmediate(async () => {
          try {
            await PasswordController.emailService.sendPasswordResetEmail(
              user.email,
              token
            );
          } catch (error) {
            console.error('Failed to send verification email:', error);
          }
        });
      }

      return sendSuccess(
        res,
        'If a user with that email exists, a password reset link has been sent.'
      );
    } catch (error) {
      console.error('Forgot password error:', error);
      return sendError(res, 'Internal server error', 500);
    }
  }

  static async resetPassword(req: Request, res: Response): Promise<Response> {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return sendError(res, 'Token and new password are required', 400);
      }

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        return sendError(
          res,
          passwordValidation.message || 'Invalid password format',
          400
        );
      }

      const user = await UserModel.findByPasswordResetToken(token);
      if (!user) {
        return sendError(res, 'Invalid or expired password reset token', 400);
      }

      await UserModel.updatePassword(user.userId, password);
      return sendSuccess(res, 'Password has been reset successfully.');
    } catch (error) {
      console.error('Reset password error:', error);
      return sendError(res, 'Internal server error', 500);
    }
  }

  static async updatePassword(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, 'Authentication required', 401);
      }

      const { oldPassword, newPassword } = req.body;
      if (!oldPassword || !newPassword) {
        return sendError(res, 'Old and new passwords are required', 400);
      }

      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return sendError(
          res,
          passwordValidation.message || 'Invalid password format',
          400
        );
      }

      const user = await UserModel.findById(userId);
      if (!user || !user.password) {
        return sendError(res, 'User not found', 404);
      }

      const isMatch = await comparePassword(oldPassword, user.password);
      if (!isMatch) {
        return sendError(res, 'Incorrect old password', 400);
      }

      await UserModel.updatePassword(userId, newPassword);
      return sendSuccess(res, 'Password updated successfully.');
    } catch (error) {
      console.error('Update password error:', error);
      return sendError(res, 'Internal server error', 500);
    }
  }
}
