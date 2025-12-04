/**
 * Badge Trigger System
 * Automatically awards badges based on user actions and milestones
 * Monitors transaction, referral, and point-related events
 */

import db from '../database/connection';
import { UserBadgeModel } from '../models/Badge';
import { logger } from '../utils/logger.utils';

export interface BadgeTriggerContext {
  userId: string;
  action: string;
  value?: number;
  relatedId?: string;
  metadata?: Record<string, any>;
}

export enum BadgeTriggerAction {
  FIRST_TRANSACTION = 'first_transaction',
  TRANSACTION_MILESTONE = 'transaction_milestone', // 5, 10, 50, 100 transactions
  FIRST_REFERRAL = 'first_referral',
  COMPLETED_REFERRAL = 'completed_referral',
  REFERRAL_MILESTONE = 'referral_milestone', // 5, 10, 25, 50 referrals
  HIGH_POINTS = 'high_points', // 1000, 5000, 10000 points
  ACCOUNT_VERIFIED = 'account_verified',
  TWOFA_ENABLED = 'twofa_enabled',
  EMAIL_VERIFIED = 'email_verified',
  TRANSACTION_FREQUENCY = 'transaction_frequency', // 5 in a day
  TOP_REFERRER = 'top_referrer',
  TOP_EARNER = 'top_earner',
}

export class BadgeTriggerSystem {
  /**
   * Check and award badges for a user based on their actions
   * This is called after significant user events
   *
   * @param context - Badge trigger context with action and related data
   * @returns Array of badge IDs that were awarded
   */
  static async checkAndAwardBadges(
    context: BadgeTriggerContext
  ): Promise<string[]> {
    try {
      const awarededBadges: string[] = [];
      const action = context.action as BadgeTriggerAction;

      switch (action) {
        case BadgeTriggerAction.FIRST_TRANSACTION:
          const firstTxBadges = await this.checkFirstTransactionBadges(
            context.userId
          );
          awarededBadges.push(...firstTxBadges);
          break;

        case BadgeTriggerAction.TRANSACTION_MILESTONE:
          const txMilestoneBadges = await this.checkTransactionMilestoneBadges(
            context.userId,
            context.value || 0
          );
          awarededBadges.push(...txMilestoneBadges);
          break;

        case BadgeTriggerAction.FIRST_REFERRAL:
          const firstRefBadges = await this.checkFirstReferralBadges(
            context.userId
          );
          awarededBadges.push(...firstRefBadges);
          break;

        case BadgeTriggerAction.COMPLETED_REFERRAL:
          const completedRefBadges = await this.checkCompletedReferralBadges(
            context.userId
          );
          awarededBadges.push(...completedRefBadges);
          break;

        case BadgeTriggerAction.REFERRAL_MILESTONE:
          const refMilestoneBadges = await this.checkReferralMilestoneBadges(
            context.userId,
            context.value || 0
          );
          awarededBadges.push(...refMilestoneBadges);
          break;

        case BadgeTriggerAction.HIGH_POINTS:
          const pointsBadges = await this.checkHighPointsBadges(
            context.userId,
            context.value || 0
          );
          awarededBadges.push(...pointsBadges);
          break;

        case BadgeTriggerAction.ACCOUNT_VERIFIED:
          const verifiedBadges = await this.checkAccountVerifiedBadges(
            context.userId
          );
          awarededBadges.push(...verifiedBadges);
          break;

        case BadgeTriggerAction.TWOFA_ENABLED:
          const twoFABadges = await this.checkTwoFABadges(context.userId);
          awarededBadges.push(...twoFABadges);
          break;

        case BadgeTriggerAction.EMAIL_VERIFIED:
          const emailBadges = await this.checkEmailVerifiedBadges(
            context.userId
          );
          awarededBadges.push(...emailBadges);
          break;

        case BadgeTriggerAction.TRANSACTION_FREQUENCY:
          const frequencyBadges = await this.checkTransactionFrequencyBadges(
            context.userId
          );
          awarededBadges.push(...frequencyBadges);
          break;

        case BadgeTriggerAction.TOP_REFERRER:
          const topRefBadges = await this.checkTopReferrerBadges(
            context.userId
          );
          awarededBadges.push(...topRefBadges);
          break;

        case BadgeTriggerAction.TOP_EARNER:
          const topEarnerBadges = await this.checkTopEarnerBadges(
            context.userId
          );
          awarededBadges.push(...topEarnerBadges);
          break;

        default:
          logger.warn(`Unknown badge trigger action: ${action}`);
      }

      if (awarededBadges.length > 0) {
        logger.info(
          `Awarded ${awarededBadges.length} badges to user ${context.userId}`,
          {
            badges: awarededBadges,
            action: context.action,
          }
        );
      }

      return awarededBadges;
    } catch (error) {
      logger.error('Error checking and awarding badges:', error);
      return [];
    }
  }

  /**
   * Check and award first transaction badge
   */
  private static async checkFirstTransactionBadges(
    userId: string
  ): Promise<string[]> {
    try {
      const badge = await db('badges')
        .where({ required_action: 'first_transaction', is_active: true })
        .first();

      if (!badge) return [];

      const hasTransaction = await db('transactions')
        .where({ user_id: userId })
        .first();

      if (hasTransaction && !hasTransaction.is_reward_badge_awarded) {
        const hasExistingBadge = await UserBadgeModel.hasBadge(
          userId,
          badge.id
        );

        if (!hasExistingBadge) {
          await UserBadgeModel.award(userId, badge.id);
          return [badge.id];
        }
      }

      return [];
    } catch (error) {
      logger.error('Error checking first transaction badges:', error);
      return [];
    }
  }

  /**
   * Check and award transaction milestone badges (5, 10, 50, 100)
   */
  private static async checkTransactionMilestoneBadges(
    userId: string,
    transactionCount: number
  ): Promise<string[]> {
    try {
      const milestones = [5, 10, 50, 100];
      const awarededBadges: string[] = [];

      for (const milestone of milestones) {
        if (transactionCount >= milestone) {
          const badge = await db('badges')
            .where({
              required_action: `transaction_milestone_${milestone}`,
              is_active: true,
            })
            .first();

          if (badge) {
            const hasExistingBadge = await UserBadgeModel.hasBadge(
              userId,
              badge.id
            );
            if (!hasExistingBadge) {
              await UserBadgeModel.award(userId, badge.id);
              awarededBadges.push(badge.id);
            }
          }
        }
      }

      return awarededBadges;
    } catch (error) {
      logger.error('Error checking transaction milestone badges:', error);
      return [];
    }
  }

  /**
   * Check and award first referral badge
   */
  private static async checkFirstReferralBadges(
    userId: string
  ): Promise<string[]> {
    try {
      const badge = await db('badges')
        .where({ required_action: 'first_referral', is_active: true })
        .first();

      if (!badge) return [];

      const hasReferral = await db('referrals')
        .where({ referrer_user_id: userId })
        .first();

      if (hasReferral) {
        const hasExistingBadge = await UserBadgeModel.hasBadge(
          userId,
          badge.id
        );

        if (!hasExistingBadge) {
          await UserBadgeModel.award(userId, badge.id);
          return [badge.id];
        }
      }

      return [];
    } catch (error) {
      logger.error('Error checking first referral badges:', error);
      return [];
    }
  }

  /**
   * Check and award completed referral badge
   */
  private static async checkCompletedReferralBadges(
    userId: string
  ): Promise<string[]> {
    try {
      const badge = await db('badges')
        .where({ required_action: 'completed_referral', is_active: true })
        .first();

      if (!badge) return [];

      const completedReferrals = await db('referrals')
        .where({ referrer_user_id: userId, status: 'completed' })
        .count('*', { as: 'count' })
        .first();

      if ((completedReferrals?.count as number) > 0) {
        const hasExistingBadge = await UserBadgeModel.hasBadge(
          userId,
          badge.id
        );

        if (!hasExistingBadge) {
          await UserBadgeModel.award(userId, badge.id);
          return [badge.id];
        }
      }

      return [];
    } catch (error) {
      logger.error('Error checking completed referral badges:', error);
      return [];
    }
  }

  /**
   * Check and award referral milestone badges (5, 10, 25, 50)
   */
  private static async checkReferralMilestoneBadges(
    userId: string,
    referralCount: number
  ): Promise<string[]> {
    try {
      const milestones = [5, 10, 25, 50];
      const awarededBadges: string[] = [];

      for (const milestone of milestones) {
        if (referralCount >= milestone) {
          const badge = await db('badges')
            .where({
              required_action: `referral_milestone_${milestone}`,
              is_active: true,
            })
            .first();

          if (badge) {
            const hasExistingBadge = await UserBadgeModel.hasBadge(
              userId,
              badge.id
            );
            if (!hasExistingBadge) {
              await UserBadgeModel.award(userId, badge.id);
              awarededBadges.push(badge.id);
            }
          }
        }
      }

      return awarededBadges;
    } catch (error) {
      logger.error('Error checking referral milestone badges:', error);
      return [];
    }
  }

  /**
   * Check and award high points badges (1000, 5000, 10000)
   */
  private static async checkHighPointsBadges(
    userId: string,
    totalPoints: number
  ): Promise<string[]> {
    try {
      const milestones = [1000, 5000, 10000];
      const awarededBadges: string[] = [];

      for (const milestone of milestones) {
        if (totalPoints >= milestone) {
          const badge = await db('badges')
            .where({
              required_action: `high_points_${milestone}`,
              is_active: true,
            })
            .first();

          if (badge) {
            const hasExistingBadge = await UserBadgeModel.hasBadge(
              userId,
              badge.id
            );
            if (!hasExistingBadge) {
              await UserBadgeModel.award(userId, badge.id);
              awarededBadges.push(badge.id);
            }
          }
        }
      }

      return awarededBadges;
    } catch (error) {
      logger.error('Error checking high points badges:', error);
      return [];
    }
  }

  /**
   * Check and award account verified badge
   */
  private static async checkAccountVerifiedBadges(
    userId: string
  ): Promise<string[]> {
    try {
      const badge = await db('badges')
        .where({ required_action: 'account_verified', is_active: true })
        .first();

      if (!badge) return [];

      const hasExistingBadge = await UserBadgeModel.hasBadge(userId, badge.id);

      if (!hasExistingBadge) {
        await UserBadgeModel.award(userId, badge.id);
        return [badge.id];
      }

      return [];
    } catch (error) {
      logger.error('Error checking account verified badges:', error);
      return [];
    }
  }

  /**
   * Check and award 2FA enabled badge
   */
  private static async checkTwoFABadges(userId: string): Promise<string[]> {
    try {
      const badge = await db('badges')
        .where({ required_action: 'twofa_enabled', is_active: true })
        .first();

      if (!badge) return [];

      const hasExistingBadge = await UserBadgeModel.hasBadge(userId, badge.id);

      if (!hasExistingBadge) {
        await UserBadgeModel.award(userId, badge.id);
        return [badge.id];
      }

      return [];
    } catch (error) {
      logger.error('Error checking 2FA badges:', error);
      return [];
    }
  }

  /**
   * Check and award email verified badge
   */
  private static async checkEmailVerifiedBadges(
    userId: string
  ): Promise<string[]> {
    try {
      const badge = await db('badges')
        .where({ required_action: 'email_verified', is_active: true })
        .first();

      if (!badge) return [];

      const hasExistingBadge = await UserBadgeModel.hasBadge(userId, badge.id);

      if (!hasExistingBadge) {
        await UserBadgeModel.award(userId, badge.id);
        return [badge.id];
      }

      return [];
    } catch (error) {
      logger.error('Error checking email verified badges:', error);
      return [];
    }
  }

  /**
   * Check and award transaction frequency badge (5 in a day)
   */
  private static async checkTransactionFrequencyBadges(
    userId: string
  ): Promise<string[]> {
    try {
      const badge = await db('badges')
        .where({ required_action: 'transaction_frequency', is_active: true })
        .first();

      if (!badge) return [];

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const todayTransactions = await db('transactions')
        .where({ user_id: userId })
        .where('created_at', '>', oneDayAgo)
        .count('*', { as: 'count' })
        .first();

      if ((todayTransactions?.count as number) >= 5) {
        const hasExistingBadge = await UserBadgeModel.hasBadge(
          userId,
          badge.id
        );

        if (!hasExistingBadge) {
          await UserBadgeModel.award(userId, badge.id);
          return [badge.id];
        }
      }

      return [];
    } catch (error) {
      logger.error('Error checking transaction frequency badges:', error);
      return [];
    }
  }

  /**
   * Check and award top referrer badge
   */
  private static async checkTopReferrerBadges(
    userId: string
  ): Promise<string[]> {
    try {
      const badge = await db('badges')
        .where({ required_action: 'top_referrer', is_active: true })
        .first();

      if (!badge) return [];

      // Get top 10 referrers
      const topReferrers = await db('referrals')
        .where({ status: 'completed' })
        .groupBy('referrer_user_id')
        .select('referrer_user_id')
        .count('*', { as: 'count' })
        .orderBy('count', 'desc')
        .limit(10);

      const isTopReferrer = topReferrers.some(
        (r: any) => r.referrer_user_id === userId
      );

      if (isTopReferrer) {
        const hasExistingBadge = await UserBadgeModel.hasBadge(
          userId,
          badge.id
        );

        if (!hasExistingBadge) {
          await UserBadgeModel.award(userId, badge.id);
          return [badge.id];
        }
      }

      return [];
    } catch (error) {
      logger.error('Error checking top referrer badges:', error);
      return [];
    }
  }

  /**
   * Check and award top earner badge
   */
  private static async checkTopEarnerBadges(userId: string): Promise<string[]> {
    try {
      const badge = await db('badges')
        .where({ required_action: 'top_earner', is_active: true })
        .first();

      if (!badge) return [];

      // Get user's total points
      const userPoints = await db('users')
        .where({ id: userId })
        .select('total_points')
        .first();

      if (!userPoints) return [];

      // Get top 10 earners
      const topEarners = await db('users')
        .whereNotNull('total_points')
        .orderBy('total_points', 'desc')
        .select('id', 'total_points')
        .limit(10);

      const isTopEarner = topEarners.some(u => u.id === userId);

      if (isTopEarner) {
        const hasExistingBadge = await UserBadgeModel.hasBadge(
          userId,
          badge.id
        );

        if (!hasExistingBadge) {
          await UserBadgeModel.award(userId, badge.id);
          return [badge.id];
        }
      }

      return [];
    } catch (error) {
      logger.error('Error checking top earner badges:', error);
      return [];
    }
  }

  /**
   * Batch process badges for all users (runs as periodic job)
   * @param action - Which action to process
   * @returns Number of badges awarded
   */
  static async batchProcessBadges(action: BadgeTriggerAction): Promise<number> {
    try {
      let totalAwarded = 0;
      const users = await db('users').select('id').limit(1000);

      for (const user of users) {
        const awarded = await this.checkAndAwardBadges({
          userId: user.id,
          action,
        });
        totalAwarded += awarded.length;
      }

      logger.info(`Batch processed badges for action ${action}`, {
        totalAwarded,
        usersProcessed: users.length,
      });

      return totalAwarded;
    } catch (error) {
      logger.error(
        `Error batch processing badges for action ${action}:`,
        error
      );
      throw error;
    }
  }
}
