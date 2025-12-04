/**
 * Referral Link Controller
 * Handles user's personal referral links for sharing
 * Separate from the referral relationship controller
 */

import { Request, Response } from 'express';
import { ReferralLinkService } from '../services/referralLink.service';
import { logger } from '../utils/logger.utils';
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

export class ReferralLinkController {
  /**
   * GET /api/v1/dashboard/referrals/link
   * Gets or creates user's personal referral link
   * This is the main endpoint for sharing - each user has one link
   */
  static async getOrCreateLink(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401);
      }

      const link = await ReferralLinkService.getOrCreateReferralLink(
        req.user.userId
      );

      return sendSuccess(
        res,
        'Referral link retrieved successfully',
        {
          referralCode: link.referralCode,
          shortCode: link.shortCode,
          referralLink: link.fullLink,
          sharingMessage: `Join me on Nexus! Use my referral code: ${link.shortCode}`,
          qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
            link.fullLink
          )}`,
        },
        200
      );
    } catch (error) {
      logger.error(
        `Error getting/creating referral link for user ${req.user?.userId}:`,
        error
      );
      return sendError(res, 'Failed to get referral link', 500);
    }
  }

  /**
   * GET /api/v1/dashboard/referrals/link/stats
   * Gets statistics about how many people signed up using this link
   */
  static async getLinkStats(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401);
      }

      const stats = await ReferralLinkService.getReferralLinkStats(
        req.user.userId
      );

      return sendSuccess(
        res,
        'Referral link statistics retrieved successfully',
        {
          totalSignupsWithLink: stats.totalSignups,
          activeReferrals: stats.activeReferrals,
          completedReferrals: stats.completedReferrals,
        },
        200
      );
    } catch (error) {
      logger.error(
        `Error getting referral link stats for user ${req.user?.userId}:`,
        error
      );
      return sendError(res, 'Failed to retrieve statistics', 500);
    }
  }

  /**
   * POST /api/v1/dashboard/referrals/link/regenerate
   * Generates a new referral code for the user
   * Useful if they want a new code
   */
  static async regenerateCode(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401);
      }

      const newLink = await ReferralLinkService.regenerateReferralCode(
        req.user.userId
      );

      return sendSuccess(
        res,
        'Referral code regenerated successfully',
        {
          newReferralCode: newLink.referralCode,
          newShortCode: newLink.shortCode,
          newReferralLink: newLink.fullLink,
        },
        200
      );
    } catch (error) {
      logger.error(
        `Error regenerating referral code for user ${req.user?.userId}:`,
        error
      );
      return sendError(res, 'Failed to regenerate referral code', 500);
    }
  }

  /**
   * POST /api/v1/dashboard/referrals/link/deactivate
   * Deactivates user's referral link
   * No more signups can be made with this code
   */
  static async deactivateLink(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401);
      }

      const deactivated = await ReferralLinkService.deactivateReferralLink(
        req.user.userId
      );

      if (!deactivated) {
        return sendError(res, 'No active referral link found', 404);
      }

      return sendSuccess(
        res,
        'Referral link deactivated successfully',
        {},
        200
      );
    } catch (error) {
      logger.error(
        `Error deactivating referral link for user ${req.user?.userId}:`,
        error
      );
      return sendError(res, 'Failed to deactivate referral link', 500);
    }
  }

  /**
   * POST /api/v1/referrals/validate-code
   * PUBLIC endpoint to validate a referral code during signup
   * Returns the referrer's info if valid
   */
  static async validateCode(req: Request, res: Response): Promise<Response> {
    try {
      const { code } = req.body;

      if (!code || typeof code !== 'string') {
        return sendError(
          res,
          'Referral code is required and must be a string',
          400
        );
      }

      const result = await ReferralLinkService.validateReferralCode(code);

      if (!result.valid) {
        return sendError(res, result.message, 400);
      }

      return sendSuccess(
        res,
        'Referral code is valid',
        {
          referrerId: result.referrerId,
          message: 'Code is valid and can be used for signup',
        },
        200
      );
    } catch (error) {
      logger.error('Error validating referral code:', error);
      return sendError(res, 'Failed to validate referral code', 500);
    }
  }
}
