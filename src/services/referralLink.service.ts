/**
 * Referral Link Management Service
 * Handles generation, storage, and retrieval of user referral links
 * Separate from the referral relationship tracking
 */

import db from '../database/connection';
import { logger } from '../utils/logger.utils';

export interface ReferralLink {
  id: string;
  userId: string;
  referralCode: string;
  shortCode: string; // Shorter version for sharing (e.g., ABC123)
  fullLink: string; // Complete shareable URL
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ReferralLinkService {
  private static readonly TABLE_NAME = 'referral_links';

  /**
   * Creates or retrieves a user's referral link
   * Each user gets exactly one referral link
   *
   * @param userId - The user ID
   * @returns Referral link with full URL
   */
  static async getOrCreateReferralLink(userId: string): Promise<ReferralLink> {
    try {
      // Check if user already has a referral link
      const existing = await db(this.TABLE_NAME)
        .where({ user_id: userId, is_active: true })
        .first();

      if (existing) {
        return this.formatRecord(existing);
      }

      // Generate unique short code
      const shortCode = this.generateShortCode();
      const referralCode = `${userId.substring(0, 4).toUpperCase()}-${shortCode}`;

      // Create new referral link
      const [link] = await db(this.TABLE_NAME)
        .insert({
          user_id: userId,
          referral_code: referralCode,
          short_code: shortCode,
          is_active: true,
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        })
        .returning('*');

      logger.info(`Created referral link for user ${userId}`, {
        referralCode,
        shortCode,
      });

      return this.formatRecord(link);
    } catch (error) {
      logger.error(
        `Error getting or creating referral link for ${userId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Gets user's referral link if it exists
   *
   * @param userId - The user ID
   * @returns Referral link or null
   */
  static async getReferralLinkByUserId(
    userId: string
  ): Promise<ReferralLink | null> {
    try {
      const link = await db(this.TABLE_NAME)
        .where({ user_id: userId, is_active: true })
        .first();

      return link ? this.formatRecord(link) : null;
    } catch (error) {
      logger.error(`Error getting referral link for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Finds the user who owns a referral code
   * Used during signup to identify the referrer
   *
   * @param referralCode - The referral code from signup
   * @returns User ID of the referrer or null if code is invalid
   */
  static async findReferrerByCode(
    referralCode: string
  ): Promise<string | null> {
    try {
      const link = await db(this.TABLE_NAME)
        .where({ referral_code: referralCode, is_active: true })
        .first();

      return link ? link.user_id : null;
    } catch (error) {
      logger.error(`Error finding referrer for code ${referralCode}:`, error);
      throw error;
    }
  }

  /**
   * Validates a referral code
   * Checks if code exists and is active
   *
   * @param referralCode - The referral code to validate
   * @returns Validation result with referrer info
   */
  static async validateReferralCode(
    referralCode: string
  ): Promise<{ valid: boolean; referrerId?: string; message: string }> {
    try {
      if (!referralCode) {
        return { valid: false, message: 'Referral code is required' };
      }

      const link = await db(this.TABLE_NAME)
        .where({ referral_code: referralCode, is_active: true })
        .first();

      if (!link) {
        return {
          valid: false,
          message: 'Referral code not found or inactive',
        };
      }

      // Check if referrer still exists
      const referrer = await db('users').where({ id: link.user_id }).first();

      if (!referrer) {
        return {
          valid: false,
          message: 'Referrer account no longer exists',
        };
      }

      return {
        valid: true,
        referrerId: link.user_id,
        message: 'Referral code is valid',
      };
    } catch (error) {
      logger.error(`Error validating referral code ${referralCode}:`, error);
      return {
        valid: false,
        message: 'Error validating referral code',
      };
    }
  }

  /**
   * Deactivates a user's referral link
   *
   * @param userId - The user ID
   * @returns Success status
   */
  static async deactivateReferralLink(userId: string): Promise<boolean> {
    try {
      const updated = await db(this.TABLE_NAME)
        .where({ user_id: userId })
        .update({
          is_active: false,
          updated_at: db.fn.now(),
        });

      if (updated > 0) {
        logger.info(`Deactivated referral link for user ${userId}`);
      }

      return updated > 0;
    } catch (error) {
      logger.error(`Error deactivating referral link for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Regenerates a user's referral code
   * Creates a new code while keeping the same link record
   *
   * @param userId - The user ID
   * @returns New referral link
   */
  static async regenerateReferralCode(userId: string): Promise<ReferralLink> {
    try {
      const shortCode = this.generateShortCode();
      const referralCode = `${userId.substring(0, 4).toUpperCase()}-${shortCode}`;

      const [updated] = await db(this.TABLE_NAME)
        .where({ user_id: userId })
        .update({
          referral_code: referralCode,
          short_code: shortCode,
          updated_at: db.fn.now(),
        })
        .returning('*');

      logger.info(`Regenerated referral code for user ${userId}`, {
        newCode: referralCode,
      });

      return this.formatRecord(updated);
    } catch (error) {
      logger.error(`Error regenerating referral code for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Gets referral link statistics (how many signups used this code)
   *
   * @param userId - The user ID
   * @returns Statistics about referral link usage
   */
  static async getReferralLinkStats(userId: string): Promise<{
    totalSignups: number;
    activeReferrals: number;
    completedReferrals: number;
  }> {
    try {
      const stats = await db('referral_links')
        .where({ user_id: userId })
        .join(
          'referrals',
          'referral_links.referral_code',
          'referrals.referral_code'
        )
        .select('referrals.status')
        .count('*', { as: 'count' });

      let totalSignups = 0;
      let activeReferrals = 0;
      let completedReferrals = 0;

      if (stats && stats.length > 0) {
        totalSignups = stats.reduce(
          (sum: number, s: any) => sum + (s.count as number),
          0
        );

        const active = await db('referral_links')
          .where({ user_id: userId })
          .join(
            'referrals',
            'referral_links.referral_code',
            'referrals.referral_code'
          )
          .where('referrals.status', 'active')
          .count('*', { as: 'count' })
          .first();

        if (active) {
          activeReferrals = (active.count as number) || 0;
        }

        const completed = await db('referral_links')
          .where({ user_id: userId })
          .join(
            'referrals',
            'referral_links.referral_code',
            'referrals.referral_code'
          )
          .where('referrals.status', 'completed')
          .count('*', { as: 'count' })
          .first();

        if (completed) {
          completedReferrals = (completed.count as number) || 0;
        }
      }

      return { totalSignups, activeReferrals, completedReferrals };
    } catch (error) {
      logger.error(`Error getting referral link stats for ${userId}:`, error);
      return { totalSignups: 0, activeReferrals: 0, completedReferrals: 0 };
    }
  }

  /**
   * Generate a random short code (e.g., ABC123)
   */
  private static generateShortCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Format database record to interface
   */
  private static formatRecord(record: any): ReferralLink {
    return {
      id: record.id,
      userId: record.user_id,
      referralCode: record.referral_code,
      shortCode: record.short_code,
      fullLink:
        record.full_link ||
        `https://app.nexus.local/referral/${record.referral_code}`,
      isActive: record.is_active,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }
}
