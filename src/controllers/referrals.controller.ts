import { Request, Response } from 'express';
import { ReferralsService } from '../services/referrals.service';
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

/**
 * ReferralsController handles all referral related endpoints
 */
export class ReferralsController {
  /**
   * GET /api/v1/dashboard/referrals
   * Gets referral statistics and list for authenticated user
   */
  static async getReferralStats(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401, []);
      }

      const stats = await ReferralsService.getReferralStats(req.user.userId);

      return sendSuccess(
        res,
        'Referral statistics retrieved successfully',
        stats,
        200
      );
    } catch (error) {
      logger.error(
        `Error getting referral stats for user ${req.user?.userId}:`,
        error
      );
      return sendError(res, 'Failed to retrieve referral statistics', 500, []);
    }
  }

  /**
   * GET /api/v1/dashboard/referrals/list
   * Gets paginated referral list for authenticated user
   */
  static async getReferralList(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401, []);
      }

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const status = req.query.status as string | undefined;

      const referrals = await ReferralsService.getReferralList(
        req.user.userId,
        status
      );

      // Simple pagination
      const start = (page - 1) * limit;
      const paginatedReferrals = referrals.slice(start, start + limit);

      return sendSuccess(
        res,
        'Referral list retrieved successfully',
        {
          referrals: paginatedReferrals,
          pagination: {
            page,
            limit,
            total: referrals.length,
            totalPages: Math.ceil(referrals.length / limit),
          },
        },
        200
      );
    } catch (error) {
      logger.error(
        `Error getting referral list for user ${req.user?.userId}:`,
        error
      );
      return sendError(res, 'Failed to retrieve referral list', 500, []);
    }
  }

  /**
   * POST /api/v1/dashboard/referrals (INTERNAL ADMIN ONLY)
   * Creates a referral relationship manually (admin/testing only)
   * NOT exposed in public API - for internal use and testing
   *
   * @internal - Should only be used for testing or admin manual intervention
   */
  static async createReferral(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401, []);
      }

      // Check if user has admin permission
      if (
        !req.user.permissions ||
        !req.user.permissions.includes('manage_referrals')
      ) {
        return sendError(res, 'Permission denied', 403, []);
      }

      const { referrerUserId, referredUserId, rewardAmount } = req.body;

      // Validation
      if (!referrerUserId || !referredUserId) {
        return sendError(
          res,
          'Referrer ID and referred user ID are required',
          400,
          []
        );
      }

      if (referrerUserId === referredUserId) {
        return sendError(res, 'Cannot refer yourself', 400, []);
      }

      const referral = await ReferralsService.createReferral(
        referrerUserId,
        referredUserId,
        rewardAmount || 0
      );

      return sendSuccess(res, 'Referral created successfully', referral, 201);
    } catch (error: any) {
      logger.error(
        `Error creating referral for user ${req.user?.userId}:`,
        error
      );

      // Handle specific errors
      if (error.message?.includes('not found')) {
        return sendError(res, error.message, 404, []);
      }
      if (error.message?.includes('already')) {
        return sendError(res, error.message, 409, []);
      }

      return sendError(res, 'Failed to create referral', 500, []);
    }
  }

  /**
   * GET /api/v1/dashboard/referrals/leaderboard
   * Gets top referrers (leaderboard)
   */
  static async getTopReferrers(req: AuthenticatedRequest, res: Response) {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);

      const topReferrers = await ReferralsService.getTopReferrers(limit);

      return sendSuccess(
        res,
        'Top referrers retrieved successfully',
        { leaderboard: topReferrers, count: topReferrers.length },
        200
      );
    } catch (error) {
      logger.error('Error getting top referrers:', error);
      return sendError(res, 'Failed to retrieve leaderboard', 500, []);
    }
  }

  /**
   * POST /api/v1/dashboard/referrals/:referralId/complete
   * Marks a referral as completed (admin endpoint)
   */
  static async completeReferral(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401, []);
      }

      // Check if user has admin permission
      if (
        !req.user.permissions ||
        !req.user.permissions.includes('manage_referrals')
      ) {
        return sendError(res, 'Permission denied', 403, []);
      }

      const { referralId } = req.params;

      if (!referralId) {
        return sendError(res, 'Referral ID is required', 400, []);
      }

      const referral = await ReferralsService.completeReferral(referralId);

      return sendSuccess(res, 'Referral completed successfully', referral, 200);
    } catch (error: any) {
      logger.error(
        `Error completing referral ${req.params.referralId}:`,
        error
      );

      if (error.message?.includes('not found')) {
        return sendError(res, error.message, 404, []);
      }

      return sendError(res, 'Failed to complete referral', 500, []);
    }
  }

  /**
   * POST /api/v1/dashboard/referrals/:referralId/process-reward
   * Processes reward for a completed referral (admin endpoint)
   */
  static async processReferralReward(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401, []);
      }

      // Check if user has admin permission
      if (
        !req.user.permissions ||
        !req.user.permissions.includes('manage_referrals')
      ) {
        return sendError(res, 'Permission denied', 403, []);
      }

      const { referralId } = req.params;

      if (!referralId) {
        return sendError(res, 'Referral ID is required', 400, []);
      }

      const reward = await ReferralsService.processReferralReward(referralId);

      return sendSuccess(
        res,
        'Referral reward processed successfully',
        reward,
        200
      );
    } catch (error: any) {
      logger.error(
        `Error processing reward for referral ${req.params.referralId}:`,
        error
      );

      if (error.message?.includes('not found')) {
        return sendError(res, error.message, 404, []);
      }
      if (error.message?.includes('not completed')) {
        return sendError(res, error.message, 400, []);
      }

      return sendError(res, 'Failed to process referral reward', 500, []);
    }
  }

  /**
   * POST /api/v1/dashboard/referrals/batch-process
   * Batch processes pending referral rewards (admin endpoint)
   */
  static async batchProcessPendingReferrals(
    req: AuthenticatedRequest,
    res: Response
  ) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401, []);
      }

      // Check if user has admin permission
      if (
        !req.user.permissions ||
        !req.user.permissions.includes('manage_referrals')
      ) {
        return sendError(res, 'Permission denied', 403, []);
      }

      const limit = Math.min(parseInt(req.body.limit as string) || 100, 500);

      const processed =
        await ReferralsService.batchProcessPendingReferrals(limit);

      return sendSuccess(
        res,
        `Batch processing completed: ${processed} referral rewards processed`,
        { processed },
        200
      );
    } catch (error) {
      logger.error('Error batch processing referral rewards:', error);
      return sendError(
        res,
        'Failed to batch process referral rewards',
        500,
        []
      );
    }
  }
}
