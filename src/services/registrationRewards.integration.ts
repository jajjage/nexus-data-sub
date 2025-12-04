/**
 * User Registration Rewards Integration Service
 * Handles integration between user signup and rewards/referrals system
 * Automatically creates referral records and awards welcome bonuses
 */

import db from '../database/connection';
import { logger } from '../utils/logger.utils';
import { ReferralsService } from './referrals.service';
import { RewardsService } from './rewards.service';

export interface UserSignupEvent {
  userId: string;
  email: string;
  fullName: string;
  referralCode?: string;
  signupMethod: 'mobile' | 'web' | 'direct';
  metadata?: Record<string, any>;
}

export interface RegistrationRewardConfig {
  welcomePoints: number; // Points awarded on signup
  referralRewardAmount: number; // Amount in ₦ for both referrer and referee
  requireEmailVerification: boolean;
  autoAwardWelcomeBadges: boolean;
}

const DEFAULT_CONFIG: RegistrationRewardConfig = {
  welcomePoints: 500,
  referralRewardAmount: 50.0,
  requireEmailVerification: true,
  autoAwardWelcomeBadges: true,
};

export class RegistrationRewardsIntegration {
  private static config: RegistrationRewardConfig = DEFAULT_CONFIG;

  /**
   * Initialize with custom configuration
   * @param config - Custom configuration
   */
  static initialize(config: Partial<RegistrationRewardConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    logger.info('Registration Rewards Integration initialized', {
      config: this.config,
    });
  }

  /**
   * Process rewards for a new user registration
   * Called after successful user signup
   *
   * @param event - User signup event
   * @returns Success status and registration reward details
   */
  static async processSignupRewards(event: UserSignupEvent): Promise<{
    success: boolean;
    message: string;
    rewards?: {
      welcomePoints?: number;
      referralCreated?: boolean;
      badgesAwarded?: string[];
    };
  }> {
    try {
      return db.transaction(async trx => {
        const rewards: any = {};
        let referralCreated = false;
        let referrerId: string | undefined;

        // Process referral code if provided
        if (event.referralCode) {
          try {
            const referral = await trx('referrals')
              .where({ referral_code: event.referralCode })
              .first();

            if (referral) {
              if (
                referral.status !== 'pending' &&
                referral.status !== 'active'
              ) {
                logger.warn(
                  `Referral code ${event.referralCode} is not in valid state: ${referral.status}`
                );
              } else {
                referrerId = referral.referrer_user_id;

                // Create referral record for new user
                const newReferral = await ReferralsService.createReferral(
                  referrerId as string,
                  event.userId,
                  this.config.referralRewardAmount,
                  undefined
                );

                // Immediately activate the referral (user is already signed up)
                await ReferralsService.activateReferral(newReferral.id);

                referralCreated = true;
                rewards.referralCreated = true;

                logger.info(`Created and activated referral for new user`, {
                  userId: event.userId,
                  referrerId,
                  rewardAmount: this.config.referralRewardAmount,
                });

                // Award welcome bonus to referrer
                await RewardsService.awardPoints(
                  referrerId as string,
                  100,
                  'referral_signup_bonus',
                  undefined,
                  {
                    newUserId: event.userId,
                    referralId: newReferral.id,
                  }
                );
              }
            } else {
              logger.warn(`Referral code not found: ${event.referralCode}`);
            }
          } catch (error) {
            logger.error(
              `Error processing referral code during signup: ${event.referralCode}`,
              error
            );
            // Don't fail signup if referral processing fails
          }
        }

        // Award welcome points to new user
        const welcomeReward = await RewardsService.awardPoints(
          event.userId,
          this.config.welcomePoints,
          'signup_welcome_bonus',
          undefined,
          {
            signupMethod: event.signupMethod,
            email: event.email,
            referralCreated,
            referrerId,
          }
        );

        rewards.welcomePoints = this.config.welcomePoints;

        logger.info(`Awarded signup welcome bonus to new user`, {
          userId: event.userId,
          welcomePoints: this.config.welcomePoints,
          rewardId: welcomeReward.id,
        });

        // Auto-award welcome badges
        const badgesAwarded: string[] = [];
        if (this.config.autoAwardWelcomeBadges) {
          try {
            // Award early adopter badge
            const earlyAdopterBadge = await trx('badges')
              .where({ required_action: 'signup' })
              .first();

            if (earlyAdopterBadge) {
              const { UserBadgeModel } = await import('../models/Badge');
              await UserBadgeModel.award(event.userId, earlyAdopterBadge.id);
              badgesAwarded.push(earlyAdopterBadge.name);

              logger.info(`Awarded signup badge to new user`, {
                userId: event.userId,
                badgeId: earlyAdopterBadge.id,
                badgeName: earlyAdopterBadge.name,
              });
            }
          } catch (error) {
            logger.error('Error auto-awarding signup badges:', error);
            // Don't fail the signup if badge awarding fails
          }
        }

        if (badgesAwarded.length > 0) {
          rewards.badgesAwarded = badgesAwarded;
        }

        return {
          success: true,
          message: 'Signup rewards processed successfully',
          rewards,
        };
      });
    } catch (error) {
      logger.error('Error processing signup rewards:', error);
      return {
        success: false,
        message: `Failed to process signup rewards: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /**
   * Get current registration reward configuration
   * @returns Current configuration
   */
  static getConfig(): RegistrationRewardConfig {
    return { ...this.config };
  }

  /**
   * Verify email and award verification badge
   * Called after user verifies their email
   *
   * @param userId - The user ID
   * @returns Success status
   */
  static async processEmailVerificationReward(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      return db.transaction(async trx => {
        // Award email verified badge
        const emailVerifiedBadge = await trx('badges')
          .where({ required_action: 'email_verified' })
          .first();

        if (emailVerifiedBadge) {
          const { UserBadgeModel } = await import('../models/Badge');

          const hasVerificationBadge = await trx('user_badges')
            .where({
              user_id: userId,
              badge_id: emailVerifiedBadge.id,
            })
            .first();

          if (!hasVerificationBadge) {
            await UserBadgeModel.award(userId, emailVerifiedBadge.id);
            logger.info(`Awarded email verification badge to user`, {
              userId,
              badgeId: emailVerifiedBadge.id,
            });
          }
        }

        return {
          success: true,
          message: 'Email verification rewards processed',
        };
      });
    } catch (error) {
      logger.error('Error processing email verification reward:', error);
      return {
        success: false,
        message: `Failed to process verification reward: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  /**
   * Process 2FA setup reward
   * Called after user sets up two-factor authentication
   *
   * @param userId - The user ID
   * @returns Success status
   */
  static async process2FAReward(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      return db.transaction(async trx => {
        // Award 2FA badge and points
        const twoFABadge = await trx('badges')
          .where({ required_action: 'two_factor_enabled' })
          .first();

        if (twoFABadge) {
          const { UserBadgeModel } = await import('../models/Badge');

          const hasTwoFABadge = await trx('user_badges')
            .where({
              user_id: userId,
              badge_id: twoFABadge.id,
            })
            .first();

          if (!hasTwoFABadge) {
            await UserBadgeModel.award(userId, twoFABadge.id);

            // Also award bonus points for security
            await RewardsService.awardPoints(
              userId,
              250,
              '2fa_setup_bonus',
              undefined,
              { badgeId: twoFABadge.id }
            );

            logger.info(`Awarded 2FA badge and points to user`, {
              userId,
              badgeId: twoFABadge.id,
            });
          }
        }

        return {
          success: true,
          message: '2FA setup rewards processed',
        };
      });
    } catch (error) {
      logger.error('Error processing 2FA reward:', error);
      return {
        success: false,
        message: `Failed to process 2FA reward: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }
}
