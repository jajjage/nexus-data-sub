import { Request, Response } from 'express';
import { RewardsService } from '../services/rewards.service';
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
 * RewardsController handles all reward and badge related endpoints
 */
export class RewardsController {
  /**
   * GET /api/v1/dashboard/rewards
   * Gets complete rewards summary for authenticated user
   */
  static async getRewardsSummary(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401, []);
      }

      const summary = await RewardsService.getRewardsSummary(req.user.userId);

      return sendSuccess(
        res,
        'Rewards summary retrieved successfully',
        summary,
        200
      );
    } catch (error) {
      logger.error(
        `Error getting rewards summary for user ${req.user?.userId}:`,
        error
      );
      return sendError(res, 'Failed to retrieve rewards summary', 500, []);
    }
  }

  /**
   * GET /api/v1/dashboard/rewards/badges
   * Gets all badges earned by authenticated user
   */
  static async getUserBadges(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401, []);
      }

      const badges = await RewardsService.getUserBadges(req.user.userId);

      return sendSuccess(
        res,
        'User badges retrieved successfully',
        { badges, count: badges.length },
        200
      );
    } catch (error) {
      logger.error(`Error getting badges for user ${req.user?.userId}:`, error);
      return sendError(res, 'Failed to retrieve badges', 500, []);
    }
  }

  /**
   * GET /api/v1/dashboard/rewards/leaderboard
   * Gets top point holders (leaderboard)
   */
  static async getLeaderboard(req: AuthenticatedRequest, res: Response) {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);

      const leaderboard = await RewardsService.getTopPointHolders(limit);

      return sendSuccess(res, 'Leaderboard retrieved successfully', {
        leaderboard,
        count: leaderboard.length,
      });
    } catch (error) {
      logger.error('Error getting leaderboard:', error);
      return sendError(res, 'Failed to retrieve leaderboard', 500, []);
    }
  }

  /**
   * GET /api/v1/dashboard/badges/:badgeId/holders
   * Gets users who have earned a specific badge
   */
  static async getBadgeHolders(req: AuthenticatedRequest, res: Response) {
    try {
      const { badgeId } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

      if (!badgeId) {
        return sendError(res, 'Badge ID is required', 400, []);
      }

      const holders = await RewardsService.getUsersWithBadge(badgeId, limit);

      return sendSuccess(res, 'Badge holders retrieved successfully', {
        holders,
        count: holders.length,
      });
    } catch (error) {
      logger.error('Error getting badge holders:', error);
      return sendError(res, 'Failed to retrieve badge holders', 500, []);
    }
  }

  /**
   * POST /api/v1/dashboard/rewards/check-badges
   * Admin endpoint: Check and award eligible badges for a user
   */
  static async checkAndAwardBadges(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401, []);
      }

      // Check if user has admin permission
      if (
        !req.user.permissions ||
        !req.user.permissions.includes('manage_rewards')
      ) {
        return sendError(res, 'Permission denied', 403, []);
      }

      const { userId } = req.body;

      if (!userId) {
        return sendError(res, 'User ID is required', 400, []);
      }

      const awardedBadges = await RewardsService.checkAndAwardBadges(userId);

      return sendSuccess(res, 'Badge check completed', {
        awardedBadges,
        count: awardedBadges.length,
      });
    } catch (error) {
      logger.error('Error checking and awarding badges:', error);
      return sendError(res, 'Failed to check and award badges', 500, []);
    }
  }

  /**
   * POST /api/v1/dashboard/rewards/credit-points
   * Admin endpoint: Credit pending points for a user
   */
  static async creditPendingPoints(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401, []);
      }

      // Check if user has admin permission
      if (
        !req.user.permissions ||
        !req.user.permissions.includes('manage_rewards')
      ) {
        return sendError(res, 'Permission denied', 403, []);
      }

      const { userId } = req.body;

      if (!userId) {
        return sendError(res, 'User ID is required', 400, []);
      }

      const creditedPoints = await RewardsService.creditPendingPoints(userId);

      return sendSuccess(
        res,
        `${creditedPoints} points credited successfully`,
        { creditedPoints }
      );
    } catch (error) {
      logger.error('Error crediting points:', error);
      return sendError(res, 'Failed to credit points', 500, []);
    }
  }
}
