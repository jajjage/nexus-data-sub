import db from '../database/connection';
import { BadgeModel, UserBadgeModel } from '../models/Badge';
import { Reward, RewardModel } from '../models/Reward';
import { UserModel } from '../models/User';
import { logger } from '../utils/logger.utils';

// =================================================================
// Interfaces
// =================================================================

export interface RewardsSummary {
  userId: string;
  totalPoints: number;
  pendingPoints: number;
  creditedPoints: number;
  expiredPoints: number;
  revokedPoints: number;
}

export interface UserBadgeSummary {
  badgeId: string;
  name: string;
  description: string | null;
  icon: string | null;
  earnedAt: Date;
}

// =================================================================
// Rewards Service
// =================================================================

export class RewardsService {
  /**
   * Gets a complete rewards summary for a user
   * @param userId - The user ID
   * @returns Rewards summary with point breakdowns
   */
  static async getRewardsSummary(userId: string): Promise<RewardsSummary> {
    const summary = await RewardModel.getSummaryByUserId(userId);

    return {
      userId,
      totalPoints: summary.total,
      pendingPoints: summary.pending,
      creditedPoints: summary.credited,
      expiredPoints: summary.expired,
      revokedPoints: summary.revoked,
    };
  }

  /**
   * Gets all badges earned by a user
   * @param userId - The user ID
   * @returns Array of earned badges
   */
  static async getUserBadges(userId: string): Promise<UserBadgeSummary[]> {
    try {
      const badges = await UserBadgeModel.findByUserId(userId);

      return badges.map(badge => ({
        badgeId: badge.id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        earnedAt: badge.earnedAt,
      }));
    } catch (error) {
      logger.error(`Error getting user badges for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Gets referral statistics for a user (redirects to ReferralsService)
   * This is a convenience method to keep rewards and referrals together
   * @param userId - The user ID
   * @returns Referral statistics
   */
  static async getReferralStats(userId: string) {
    const { ReferralsService } = await import('./referrals.service');
    return ReferralsService.getReferralStats(userId);
  }

  /**
   * Gets referral list for a user (redirects to ReferralsService)
   * This is a convenience method to keep rewards and referrals together
   * @param userId - The user ID
   * @returns Array of referrals
   */
  static async getReferralList(userId: string) {
    const { ReferralsService } = await import('./referrals.service');
    return ReferralsService.getReferralList(userId);
  }

  /**
   * Awards points to a user
   * @param userId - The user ID
   * @param amount - Number of points to award
   * @param reason - Reason for awarding points
   * @param expiresAt - Optional expiration date
   * @param metadata - Optional metadata
   * @returns The created reward
   */
  static async awardPoints(
    userId: string,
    amount: number,
    reason: string,
    expiresAt?: Date,
    metadata?: Record<string, any>
  ): Promise<Reward> {
    try {
      return await db.transaction(async trx => {
        // Create the reward
        const reward = await RewardModel.create(
          {
            userId,
            points: amount,
            reason,
            expiresAt,
            metadata,
          },
          trx
        );

        logger.info(
          `Awarded ${amount} points to user ${userId} for reason: ${reason}`
        );
        return reward;
      });
    } catch (error) {
      logger.error(`Error awarding points to user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Credits pending points for a user
   * Moves points from 'pending' to 'credited' status and updates user's total_points
   * @param userId - The user ID
   * @returns The number of points credited
   */
  static async creditPendingPoints(userId: string): Promise<number> {
    try {
      return await db.transaction(async trx => {
        // Get all pending rewards
        const pendingRewards = await RewardModel.findByUserId(
          userId,
          'pending',
          1000
        );

        let totalCredited = 0;

        // Credit each reward
        for (const reward of pendingRewards) {
          await RewardModel.updateStatus(reward.id, 'credited', trx);
          totalCredited += reward.points;
        }

        // Update user's total_points
        if (totalCredited > 0) {
          await trx('users')
            .where({ id: userId })
            .increment('total_points', totalCredited);
        }

        logger.info(`Credited ${totalCredited} points to user ${userId}`);
        return totalCredited;
      });
    } catch (error) {
      logger.error(`Error crediting points for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Revokes all pending points for a user
   * @param userId - The user ID
   * @returns The number of points revoked
   */
  static async revokePendingPoints(userId: string): Promise<number> {
    try {
      return await db.transaction(async trx => {
        const pendingRewards = await RewardModel.findByUserId(
          userId,
          'pending',
          1000
        );

        let totalRevoked = 0;

        for (const reward of pendingRewards) {
          await RewardModel.updateStatus(reward.id, 'revoked', trx);
          totalRevoked += reward.points;
        }

        logger.info(
          `Revoked ${totalRevoked} pending points from user ${userId}`
        );
        return totalRevoked;
      });
    } catch (error) {
      logger.error(`Error revoking pending points for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Awards a badge to a user
   * @param userId - The user ID
   * @param badgeId - The badge ID
   * @param metadata - Optional metadata
   * @returns Success status
   */
  static async awardBadge(
    userId: string,
    badgeId: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      return await db.transaction(async trx => {
        // Check if badge exists
        const badge = await BadgeModel.findById(badgeId);
        if (!badge) {
          throw new Error(`Badge with ID ${badgeId} not found`);
        }

        if (!badge.isActive) {
          throw new Error(`Badge ${badgeId} is not active`);
        }

        // Award the badge
        await UserBadgeModel.award(userId, badgeId, metadata, trx);

        logger.info(`Awarded badge ${badgeId} to user ${userId}`);
        return true;
      });
    } catch (error) {
      logger.error(`Error awarding badge ${badgeId} to user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Revokes a badge from a user
   * @param userId - The user ID
   * @param badgeId - The badge ID
   * @returns Success status
   */
  static async revokeBadge(userId: string, badgeId: string): Promise<boolean> {
    try {
      const result = await UserBadgeModel.revoke(userId, badgeId);
      if (result) {
        logger.info(`Revoked badge ${badgeId} from user ${userId}`);
      }
      return result;
    } catch (error) {
      logger.error(
        `Error revoking badge ${badgeId} from user ${userId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Checks if a user has earned a specific badge
   * @param userId - The user ID
   * @param badgeId - The badge ID
   * @returns True if user has the badge
   */
  static async userHasBadge(userId: string, badgeId: string): Promise<boolean> {
    return UserBadgeModel.hasBadge(userId, badgeId);
  }

  /**
   * Marks expired rewards in the system
   * @returns Number of rewards expired
   */
  static async expireOldRewards(): Promise<number> {
    try {
      const count = await RewardModel.markExpiredRewards();
      logger.info(`Marked ${count} rewards as expired`);
      return count;
    } catch (error) {
      logger.error('Error marking expired rewards:', error);
      throw error;
    }
  }

  /**
   * Gets users with the highest total points (leaderboard)
   * @param limit - Max results
   * @returns Array of users with their point counts
   */
  static async getTopPointHolders(
    limit: number = 10
  ): Promise<Array<{ userId: string; totalPoints: number }>> {
    try {
      const results = await db('users')
        .where('total_points', '>', 0)
        .orderBy('total_points', 'desc')
        .limit(limit)
        .select('id as userId', 'total_points');

      return results.map(r => ({
        userId: r.userId,
        totalPoints: r.total_points,
      }));
    } catch (error) {
      logger.error('Error getting top point holders:', error);
      throw error;
    }
  }

  /**
   * Gets users with a specific badge (achievement leaderboard)
   * @param badgeId - The badge ID
   * @param limit - Max results
   * @returns Array of user IDs
   */
  static async getUsersWithBadge(
    badgeId: string,
    limit: number = 100
  ): Promise<string[]> {
    try {
      return await UserBadgeModel.getUsersWithBadge(badgeId, limit);
    } catch (error) {
      logger.error(`Error getting users with badge ${badgeId}:`, error);
      throw error;
    }
  }

  /**
   * Automatically awards badges based on conditions
   * @param userId - The user ID
   * @returns Array of badge IDs awarded
   */
  static async checkAndAwardBadges(userId: string): Promise<string[]> {
    try {
      const awardedbadgeIds: string[] = [];

      // Get all active badges with required_action set
      const badgesToCheck = await db('badges')
        .where({ is_active: true })
        .whereNotNull('required_action')
        .select('id', 'required_action', 'required_value');

      for (const badge of badgesToCheck) {
        const shouldAward = await this.shouldAwardBadge(
          userId,
          badge.required_action,
          badge.required_value
        );

        if (shouldAward) {
          const hasAlready = await UserBadgeModel.hasBadge(userId, badge.id);
          if (!hasAlready) {
            await UserBadgeModel.award(userId, badge.id);
            awardedbadgeIds.push(badge.id);
            logger.info(
              `Auto-awarded badge ${badge.id} to user ${userId} for action ${badge.required_action}`
            );
          }
        }
      }

      return awardedbadgeIds;
    } catch (error) {
      logger.error(`Error checking badges for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Helper method to determine if badge should be awarded
   * @param userId - The user ID
   * @param action - The action to check
   * @param requiredValue - The required value to meet
   * @returns True if badge should be awarded
   */
  private static async shouldAwardBadge(
    userId: string,
    action: string,
    requiredValue?: number | null
  ): Promise<boolean> {
    try {
      switch (action) {
        case 'first_referral':
          // Award if user has at least one completed referral
          const referralCount = await db('referrals')
            .where({
              referrer_user_id: userId,
              status: 'completed',
            })
            .count('* as count')
            .first();
          return (referralCount?.count as number) > 0;

        case 'top_referee':
          // Award if user has completed referrals >= requiredValue
          const topReferralCount = await db('referrals')
            .where({
              referrer_user_id: userId,
              status: 'completed',
            })
            .count('* as count')
            .first();
          return (topReferralCount?.count as number) >= (requiredValue || 5);

        case 'high_points':
          // Award if user's total points >= requiredValue
          const user = await UserModel.findById(userId);
          if (!user) return false;
          // We need to fetch the total_points from database
          const userData = await db('users').where({ id: userId }).first();
          return userData.total_points >= (requiredValue || 100);

        default:
          return false;
      }
    } catch (error) {
      logger.error(`Error checking badge condition for user ${userId}:`, error);
      return false;
    }
  }
}
