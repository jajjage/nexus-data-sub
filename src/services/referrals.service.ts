import db from '../database/connection';
import { Referral, ReferralModel, ReferralStats } from '../models/Referral';
import { RewardModel } from '../models/Reward';
import { UserModel } from '../models/User';
import { generateUUID } from '../utils/crypto';
import { logger } from '../utils/logger.utils';

// =================================================================
// Interfaces
// =================================================================

export interface ReferralResponse {
  referralId: string;
  referrerUserId: string;
  referredUserId: string;
  rewardAmount: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  referralCode: string | null;
  referralCompletedAt: Date | null;
  createdAt: Date;
}

// =================================================================
// Referrals Service
// =================================================================

export class ReferralsService {
  /**
   * Creates a new referral relationship
   * @internal - For testing and admin manual intervention only
   * @param referrerUserId - The referrer user ID
   * @param referredUserId - The referred user ID
   * @param rewardAmount - Optional reward amount for completion
   * @param referralCode - Optional custom referral code (generated if not provided)
   * @returns The created referral
   * @deprecated - Referrals are now created automatically during signup via createReferralFromSignup()
   */
  static async createReferral(
    referrerUserId: string,
    referredUserId: string,
    rewardAmount: number = 0,
    referralCode?: string
  ): Promise<Referral> {
    try {
      return await db.transaction(async trx => {
        // Check if users exist
        const [referrer, referred] = await Promise.all([
          UserModel.findById(referrerUserId),
          UserModel.findById(referredUserId),
        ]);

        if (!referrer) {
          throw new Error(`Referrer user ${referrerUserId} not found`);
        }
        if (!referred) {
          throw new Error(`Referred user ${referredUserId} not found`);
        }

        // Prevent self-referrals
        if (referrerUserId === referredUserId) {
          throw new Error('Cannot refer yourself');
        }

        // Check if referred user already has a referral
        const existingReferral =
          await ReferralModel.findByReferredId(referredUserId);
        if (existingReferral) {
          throw new Error(
            `User ${referredUserId} is already referred by another user`
          );
        }

        // Generate referral code if not provided
        const code = referralCode || this.generateReferralCode();

        // Create referral
        const referral = await ReferralModel.create(
          {
            referrerUserId,
            referredUserId,
            rewardAmount,
            referralCode: code,
          },
          trx
        );

        logger.info(
          `Created referral from ${referrerUserId} to ${referredUserId}`
        );
        return referral;
      });
    } catch (error) {
      logger.error(
        `Error creating referral from ${referrerUserId} to ${referredUserId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Creates a referral from a signup referral code
   * FIRE AND FORGET method called during user registration
   * Automatically creates referral if valid code is provided
   *
   * @param referredUserId - The new user's ID
   * @param referralCode - The referral code from signup query param
   * @returns Success status and referral info (if created)
   */
  static async createReferralFromSignup(
    referredUserId: string,
    referralCode?: string
  ): Promise<{ success: boolean; referralId?: string; message: string }> {
    try {
      if (!referralCode) {
        return { success: true, message: 'No referral code provided' };
      }

      return await db.transaction(async trx => {
        // Import ReferralLinkService to validate code
        const { ReferralLinkService } = await import('./referralLink.service');

        // Validate the referral code and get referrer ID
        const validation =
          await ReferralLinkService.validateReferralCode(referralCode);

        if (!validation.valid || !validation.referrerId) {
          logger.warn(
            `Invalid referral code used during signup: ${referralCode}`
          );
          return {
            success: true,
            message: 'Referral code invalid, proceeding without referral',
          };
        }

        const referrerId = validation.referrerId;

        // Check if referred user already has a referral
        const existingReferral =
          await ReferralModel.findByReferredId(referredUserId);
        if (existingReferral) {
          logger.warn(
            `User ${referredUserId} already has a referral, skipping creation`
          );
          return {
            success: true,
            message: 'User already has referral, skipping',
          };
        }

        // Create referral automatically
        const referral = await ReferralModel.create(
          {
            referrerUserId: referrerId,
            referredUserId,
            rewardAmount: 50, // Default reward amount
            referralCode,
          },
          trx
        );

        logger.info(
          `Auto-created referral during signup: ${referrerId} -> ${referredUserId}`,
          {
            referralCode,
            referralId: referral.id,
          }
        );

        return {
          success: true,
          referralId: referral.id,
          message: 'Referral created successfully',
        };
      });
    } catch (error) {
      logger.error(
        `Error creating referral from signup for user ${referredUserId}:`,
        error
      );
      // Don't throw - referral creation should not block signup
      return {
        success: false,
        message: 'Failed to create referral (non-blocking)',
      };
    }
  }

  /**
   * Gets referrals created by a user
   * @param referrerUserId - The referrer user ID
   * @param status - Optional status filter
   * @returns Array of referrals
   */
  static async getReferralList(
    referrerUserId: string,
    status?: string
  ): Promise<ReferralResponse[]> {
    try {
      const referrals = await ReferralModel.findByReferrerId(
        referrerUserId,
        status
      );

      return referrals.map(ref => ({
        referralId: ref.id,
        referrerUserId: ref.referrerUserId,
        referredUserId: ref.referredUserId,
        rewardAmount: ref.rewardAmount,
        status: ref.status,
        referralCode: ref.referralCode,
        referralCompletedAt: ref.referralCompletedAt,
        createdAt: ref.createdAt,
      }));
    } catch (error) {
      logger.error(`Error getting referral list for ${referrerUserId}:`, error);
      throw error;
    }
  }

  /**
   * Gets comprehensive referral statistics for a user
   * @param referrerUserId - The referrer user ID
   * @returns Referral statistics
   */
  static async getReferralStats(
    referrerUserId: string
  ): Promise<ReferralStats> {
    try {
      return await ReferralModel.getStatsByReferrerId(referrerUserId);
    } catch (error) {
      logger.error(`Error getting stats for user ${referrerUserId}:`, error);
      throw error;
    }
  }

  /**
   * Activates a referral (usually after referred user validates/confirms)
   * @param referralId - The referral ID
   * @returns The updated referral
   */
  static async activateReferral(referralId: string): Promise<Referral> {
    try {
      const updated = await ReferralModel.activate(referralId);
      if (!updated) {
        throw new Error(`Referral ${referralId} not found`);
      }
      logger.info(`Activated referral ${referralId}`);
      return updated;
    } catch (error) {
      logger.error(`Error activating referral ${referralId}:`, error);
      throw error;
    }
  }

  /**
   * Marks a referral as completed and processes reward
   * @param referralId - The referral ID
   * @returns The updated referral
   */
  static async completeReferral(referralId: string): Promise<Referral> {
    try {
      return await db.transaction(async trx => {
        const referral = await ReferralModel.findById(referralId);
        if (!referral) {
          throw new Error(`Referral ${referralId} not found`);
        }

        // Mark referral as completed
        const updated = await ReferralModel.updateStatus(
          referralId,
          'completed',
          trx
        );
        if (!updated) {
          throw new Error(`Failed to complete referral ${referralId}`);
        }

        // Increment referral_count for referrer
        await trx('users')
          .where({ id: referral.referrerUserId })
          .increment('referral_count', 1);

        logger.info(`Completed referral ${referralId}`);
        return updated;
      });
    } catch (error) {
      logger.error(`Error completing referral ${referralId}:`, error);
      throw error;
    }
  }

  /**
   * Processes reward for a completed referral
   * @param referralId - The referral ID
   * @returns The reward created
   */
  static async processReferralReward(referralId: string) {
    try {
      return await db.transaction(async trx => {
        const referral = await ReferralModel.findById(referralId);
        if (!referral) {
          throw new Error(`Referral ${referralId} not found`);
        }

        if (referral.status !== 'completed') {
          throw new Error(
            `Referral ${referralId} is not completed (status: ${referral.status})`
          );
        }

        if (referral.rewardId) {
          logger.info(
            `Referral ${referralId} reward already processed (rewardId: ${referral.rewardId})`
          );
          return await RewardModel.findById(referral.rewardId);
        }

        // Create reward for referrer
        const reward = await RewardModel.create(
          {
            userId: referral.referrerUserId,
            points: Math.round(referral.rewardAmount * 100), // Convert to points (e.g., $10 = 1000 points)
            reason: `Referral reward for referring user ${referral.referredUserId}`,
            metadata: {
              referralId,
              referredUserId: referral.referredUserId,
            },
          },
          trx
        );

        // Link reward to referral
        await ReferralModel.linkReward(referralId, reward.id, trx);

        logger.info(`Processed reward ${reward.id} for referral ${referralId}`);
        return reward;
      });
    } catch (error) {
      logger.error(
        `Error processing reward for referral ${referralId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Cancels a referral
   * @param referralId - The referral ID
   * @returns The updated referral
   */
  static async cancelReferral(referralId: string): Promise<Referral> {
    try {
      return await db.transaction(async trx => {
        const referral = await ReferralModel.findById(referralId);
        if (!referral) {
          throw new Error(`Referral ${referralId} not found`);
        }

        // If referral was completed, decrement referral_count
        if (referral.status === 'completed') {
          await trx('users')
            .where({ id: referral.referrerUserId })
            .decrement('referral_count', 1);

          // If reward was processed, revoke it
          if (referral.rewardId) {
            await RewardModel.revoke(referral.rewardId, trx);
          }
        }

        const updated = await ReferralModel.cancel(referralId, trx);
        logger.info(`Cancelled referral ${referralId}`);
        return updated!;
      });
    } catch (error) {
      logger.error(`Error cancelling referral ${referralId}:`, error);
      throw error;
    }
  }

  /**
   * Gets the referrer for a specific user (who referred them)
   * @param referredUserId - The referred user ID
   * @returns The referral record or null
   */
  static async getReferrer(referredUserId: string): Promise<Referral | null> {
    try {
      return await ReferralModel.findByReferredId(referredUserId);
    } catch (error) {
      logger.error(`Error getting referrer for user ${referredUserId}:`, error);
      throw error;
    }
  }

  /**
   * Gets top referrers (leaderboard)
   * @param limit - Max results
   * @returns Array of top referrers with referral counts
   */
  static async getTopReferrers(limit: number = 10) {
    try {
      return await ReferralModel.getTopReferrers(limit);
    } catch (error) {
      logger.error('Error getting top referrers:', error);
      throw error;
    }
  }

  /**
   * Batch processes all pending completed referrals
   * @param limit - Max referrals to process
   * @returns Number of referrals processed
   */
  static async batchProcessPendingReferrals(
    limit: number = 100
  ): Promise<number> {
    try {
      const pendingReferrals = await ReferralModel.findPendingCompletion(limit);

      let processed = 0;
      for (const referral of pendingReferrals) {
        try {
          await this.processReferralReward(referral.id);
          processed++;
        } catch (error) {
          logger.error(
            `Error processing reward for referral ${referral.id}:`,
            error
          );
        }
      }

      logger.info(`Batch processed ${processed} referral rewards`);
      return processed;
    } catch (error) {
      logger.error('Error batch processing referral rewards:', error);
      throw error;
    }
  }

  /**
   * Finds a referral by code
   * @param code - The referral code
   * @returns The referral or null
   */
  static async findByCode(code: string): Promise<Referral | null> {
    try {
      return await ReferralModel.findByCode(code);
    } catch (error) {
      logger.error(`Error finding referral by code ${code}:`, error);
      throw error;
    }
  }

  /**
   * Helper method to generate a unique referral code
   * Format: USER-RANDOM (e.g., USER-A1B2C3)
   * @returns A unique referral code
   */
  private static generateReferralCode(): string {
    const random = generateUUID().substring(0, 6).toUpperCase();
    return `USER-${random}`;
  }

  /**
   * Validates a referral code
   * @internal - Use ReferralLinkService.validateReferralCode() instead for new code
   * @param code - The referral code to validate
   * @returns The referral if valid, null otherwise
   * @deprecated - Use ReferralLinkService.validateReferralCode() instead
   */
  static async validateReferralCode(code: string): Promise<Referral | null> {
    try {
      const referral = await ReferralModel.findByCode(code);

      if (!referral) {
        return null;
      }

      // Code is only valid for pending or active referrals
      if (referral.status !== 'pending' && referral.status !== 'active') {
        return null;
      }

      return referral;
    } catch (error) {
      logger.error(`Error validating referral code ${code}:`, error);
      throw error;
    }
  }
}
