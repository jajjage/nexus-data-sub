/**
 * Transaction Rewards Integration Service
 * Handles integration between transaction processing and rewards system
 * Automatically awards points when transactions are successful
 */

import db from '../database/connection';
import { logger } from '../utils/logger.utils';
import { RewardsService } from './rewards.service';

export interface TransactionRewardEvent {
  userId: string;
  transactionId: string;
  amount: number;
  direction: 'credit' | 'debit';
  method: string;
  relatedType?: string;
  relatedId?: string;
  metadata?: Record<string, any>;
}

export interface RewardConfiguration {
  creditPointsPerNaira: number; // e.g., 10 points per ₦1
  minTransactionAmount: number;
  enableReferralBonus: boolean;
  referralBonusMultiplier: number; // e.g., 1.5x for referred users
  autoAwardBadges: boolean;
}

const DEFAULT_CONFIG: RewardConfiguration = {
  creditPointsPerNaira: 10,
  minTransactionAmount: 100,
  enableReferralBonus: true,
  referralBonusMultiplier: 1.5,
  autoAwardBadges: true,
};

export class TransactionRewardsIntegration {
  private static config: RewardConfiguration = DEFAULT_CONFIG;

  /**
   * Initialize the integration with custom configuration
   * @param config - Custom reward configuration
   */
  static initialize(config: Partial<RewardConfiguration>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    logger.info('Transaction Rewards Integration initialized', {
      config: this.config,
    });
  }

  /**
   * Process rewards for a successful transaction
   * Called after a transaction is confirmed/successful
   *
   * @param event - Transaction event data
   * @returns Success status and reward details
   */
  static async processTransactionRewards(
    event: TransactionRewardEvent
  ): Promise<{ success: boolean; message: string; reward?: any }> {
    try {
      // Only award points for credit transactions
      if (event.direction !== 'credit') {
        return {
          success: true,
          message: 'Debit transactions do not earn rewards',
        };
      }

      // Skip rewards for reversals and other non-earning methods
      if (['reversal', 'refund', 'chargeback'].includes(event.method)) {
        return {
          success: true,
          message: `${event.method} does not earn rewards`,
        };
      }

      // Check minimum transaction amount
      if (event.amount < this.config.minTransactionAmount) {
        return {
          success: true,
          message: `Amount below minimum threshold for rewards`,
        };
      }

      return db.transaction(async trx => {
        // Calculate points
        const basePoints = Math.floor(
          event.amount * this.config.creditPointsPerNaira
        );

        // Check if user is a referred user and apply bonus
        let finalPoints = basePoints;
        if (this.config.enableReferralBonus) {
          const referralInfo = await trx('referrals')
            .where({ referred_user_id: event.userId, status: 'active' })
            .first();

          if (referralInfo) {
            // Apply bonus to referred user
            finalPoints = Math.floor(
              basePoints * this.config.referralBonusMultiplier
            );

            // Also award bonus points to referrer
            const referrerBonusPoints = Math.floor(basePoints * 0.5);
            await RewardsService.awardPoints(
              referralInfo.referrer_user_id,
              referrerBonusPoints,
              'referral_bonus_transaction',
              undefined,
              { transactionId: event.transactionId }
            );

            logger.info(
              `Awarded referral bonus: ${referrerBonusPoints} points to referrer`,
              {
                referrerId: referralInfo.referrer_user_id,
                transactionId: event.transactionId,
              }
            );
          }
        }

        // Award points to user
        const reward = await RewardsService.awardPoints(
          event.userId,
          finalPoints,
          `transaction_reward_${event.method}`,
          undefined,
          {
            transactionId: event.transactionId,
            amount: event.amount,
            relatedType: event.relatedType,
            relatedId: event.relatedId,
            ...event.metadata,
          }
        );

        logger.info(
          `Awarded transaction rewards: ${finalPoints} points to user`,
          {
            userId: event.userId,
            transactionId: event.transactionId,
            basePoints,
            finalPoints,
          }
        );

        // Auto-award badges if enabled
        if (this.config.autoAwardBadges) {
          try {
            await RewardsService.checkAndAwardBadges(event.userId);
          } catch (error) {
            logger.error('Error auto-awarding badges:', error);
            // Don't throw - badge awarding should not block transaction rewards
          }
        }

        return {
          success: true,
          message: `Awarded ${finalPoints} points for transaction`,
          reward: {
            points: finalPoints,
            reason: reward.reason,
            rewardId: reward.id,
          },
        };
      });
    } catch (error) {
      logger.error('Error processing transaction rewards:', error);
      return {
        success: false,
        message: `Failed to process rewards: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get current reward configuration
   * @returns Current configuration
   */
  static getConfig(): RewardConfiguration {
    return { ...this.config };
  }

  /**
   * Batch process transactions for rewards (for backfilling rewards for past transactions)
   * @param transactionIds - Array of transaction IDs to process
   * @returns Number of rewards processed
   */
  static async batchProcessTransactions(
    transactionIds: string[]
  ): Promise<number> {
    try {
      let processed = 0;

      for (const transactionId of transactionIds) {
        try {
          const transaction = await db('transactions')
            .where({ id: transactionId })
            .first();

          if (!transaction) {
            logger.warn(`Transaction not found: ${transactionId}`);
            continue;
          }

          const result = await this.processTransactionRewards({
            userId: transaction.user_id,
            transactionId: transaction.id,
            amount: transaction.amount,
            direction: transaction.direction,
            method: transaction.method,
            relatedType: transaction.related_type,
            relatedId: transaction.related_id,
            metadata: transaction.metadata
              ? JSON.parse(transaction.metadata)
              : undefined,
          });

          if (result.success) {
            processed++;
          }
        } catch (error) {
          logger.error(`Error processing transaction ${transactionId}:`, error);
          // Continue with next transaction
        }
      }

      logger.info(
        `Batch processed ${processed}/${transactionIds.length} transactions`
      );
      return processed;
    } catch (error) {
      logger.error('Error in batch process transactions:', error);
      throw error;
    }
  }
}
