import { Knex } from 'knex';
import db from '../database/connection';

// =================================================================
// Interfaces
// =================================================================

export interface Referral {
  id: string;
  referrerUserId: string;
  referredUserId: string;
  rewardAmount: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  rewardId: string | null;
  referralCode: string | null;
  referralCodeGeneratedAt: Date | null;
  referralCompletedAt: Date | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReferralInput {
  referrerUserId: string;
  referredUserId: string;
  rewardAmount?: number;
  referralCode?: string;
  metadata?: Record<string, any>;
}

export interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  completedReferrals: number;
  totalRewardEarned: number;
  pendingRewardAmount: number;
}

// =================================================================
// Referral Model Class
// =================================================================

export class ReferralModel {
  private static readonly TABLE_NAME = 'referrals';

  /**
   * Creates a new referral record
   * @param data - Referral data
   * @param trx - Optional transaction
   * @returns The created referral
   */
  static async create(
    data: CreateReferralInput,
    trx?: Knex.Transaction
  ): Promise<Referral> {
    const connection = trx || db;
    const [referral] = await connection(this.TABLE_NAME)
      .insert({
        referrer_user_id: data.referrerUserId,
        referred_user_id: data.referredUserId,
        reward_amount: data.rewardAmount || 0,
        status: 'pending',
        referral_code: data.referralCode || null,
        referral_code_generated_at: data.referralCode
          ? connection.fn.now()
          : null,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      })
      .returning('*');

    return this.formatRecord(referral);
  }

  /**
   * Finds a referral by ID
   * @param id - The referral ID
   * @returns The referral or null
   */
  static async findById(id: string): Promise<Referral | null> {
    const referral = await db(this.TABLE_NAME).where({ id }).first();
    return referral ? this.formatRecord(referral) : null;
  }

  /**
   * Finds a referral by referral code
   * @param code - The referral code
   * @returns The referral or null
   */
  static async findByCode(code: string): Promise<Referral | null> {
    const referral = await db(this.TABLE_NAME)
      .where({ referral_code: code })
      .first();
    return referral ? this.formatRecord(referral) : null;
  }

  /**
   * Finds referrals created by a user (referrer perspective)
   * @param referrerUserId - The referrer user ID
   * @param status - Optional status filter
   * @param limit - Max records to return
   * @returns Array of referrals
   */
  static async findByReferrerId(
    referrerUserId: string,
    status?: string,
    limit: number = 100
  ): Promise<Referral[]> {
    let query = db(this.TABLE_NAME).where({ referrer_user_id: referrerUserId });

    if (status) {
      query = query.where({ status });
    }

    const referrals = await query.orderBy('created_at', 'desc').limit(limit);
    return referrals.map(r => this.formatRecord(r));
  }

  /**
   * Finds referrals where a user was referred (referred perspective)
   * @param referredUserId - The referred user ID
   * @returns The referral or null (only one per referred user)
   */
  static async findByReferredId(
    referredUserId: string
  ): Promise<Referral | null> {
    const referral = await db(this.TABLE_NAME)
      .where({ referred_user_id: referredUserId })
      .first();

    return referral ? this.formatRecord(referral) : null;
  }

  /**
   * Gets referral statistics for a user
   * @param referrerUserId - The referrer user ID
   * @returns Referral statistics
   */
  static async getStatsByReferrerId(
    referrerUserId: string
  ): Promise<ReferralStats> {
    const referrals = await db(this.TABLE_NAME).where({
      referrer_user_id: referrerUserId,
    });

    const stats: ReferralStats = {
      totalReferrals: referrals.length,
      activeReferrals: 0,
      completedReferrals: 0,
      totalRewardEarned: 0,
      pendingRewardAmount: 0,
    };

    referrals.forEach(ref => {
      if (ref.status === 'active') {
        stats.activeReferrals += 1;
      } else if (ref.status === 'completed') {
        stats.completedReferrals += 1;
        stats.totalRewardEarned += parseFloat(String(ref.reward_amount));
      } else if (ref.status === 'pending') {
        stats.pendingRewardAmount += parseFloat(String(ref.reward_amount));
      }
    });

    return stats;
  }

  /**
   * Updates a referral's status
   * @param id - The referral ID
   * @param status - New status
   * @param trx - Optional transaction
   * @returns The updated referral or null
   */
  static async updateStatus(
    id: string,
    status: 'pending' | 'active' | 'completed' | 'cancelled',
    trx?: Knex.Transaction
  ): Promise<Referral | null> {
    const connection = trx || db;
    const updateData: Record<string, any> = { status };

    // If completing, set completion date
    if (status === 'completed') {
      updateData.referral_completed_at = connection.fn.now();
    }

    const [referral] = await connection(this.TABLE_NAME)
      .where({ id })
      .update({
        ...updateData,
        updated_at: connection.fn.now(),
      })
      .returning('*');

    return referral ? this.formatRecord(referral) : null;
  }

  /**
   * Activates a referral
   * @param id - The referral ID
   * @param trx - Optional transaction
   * @returns The updated referral
   */
  static async activate(
    id: string,
    trx?: Knex.Transaction
  ): Promise<Referral | null> {
    return this.updateStatus(id, 'active', trx);
  }

  /**
   * Completes a referral
   * @param id - The referral ID
   * @param trx - Optional transaction
   * @returns The updated referral
   */
  static async complete(
    id: string,
    trx?: Knex.Transaction
  ): Promise<Referral | null> {
    return this.updateStatus(id, 'completed', trx);
  }

  /**
   * Cancels a referral
   * @param id - The referral ID
   * @param trx - Optional transaction
   * @returns The updated referral
   */
  static async cancel(
    id: string,
    trx?: Knex.Transaction
  ): Promise<Referral | null> {
    return this.updateStatus(id, 'cancelled', trx);
  }

  /**
   * Links a reward to a referral
   * @param id - The referral ID
   * @param rewardId - The reward ID
   * @param trx - Optional transaction
   * @returns The updated referral or null
   */
  static async linkReward(
    id: string,
    rewardId: string,
    trx?: Knex.Transaction
  ): Promise<Referral | null> {
    const connection = trx || db;
    const [referral] = await connection(this.TABLE_NAME)
      .where({ id })
      .update({
        reward_id: rewardId,
        updated_at: connection.fn.now(),
      })
      .returning('*');

    return referral ? this.formatRecord(referral) : null;
  }

  /**
   * Gets completed referrals pending reward processing
   * @param limit - Max records to return
   * @returns Array of pending referrals
   */
  static async findPendingCompletion(limit: number = 100): Promise<Referral[]> {
    const referrals = await db(this.TABLE_NAME)
      .where({ status: 'completed' })
      .whereNull('reward_id')
      .orderBy('referral_completed_at', 'asc')
      .limit(limit);

    return referrals.map(r => this.formatRecord(r));
  }

  /**
   * Gets top referrers by number of successful referrals
   * @param limit - Max results
   * @returns Array with referrer user ID and count
   */
  static async getTopReferrers(
    limit: number = 10
  ): Promise<Array<{ userId: string; referralCount: number }>> {
    const results = await db(this.TABLE_NAME)
      .where({ status: 'completed' })
      .groupBy('referrer_user_id')
      .count('* as count')
      .orderBy('count', 'desc')
      .limit(limit)
      .select('referrer_user_id');

    return results.map(r => ({
      userId: String(r.referrer_user_id),
      referralCount: Number(r.count) || 0,
    }));
  }

  /**
   * Helper method to format database records
   */
  private static formatRecord(record: any): Referral {
    return {
      id: record.id,
      referrerUserId: record.referrer_user_id,
      referredUserId: record.referred_user_id,
      rewardAmount: parseFloat(String(record.reward_amount)),
      status: record.status,
      rewardId: record.reward_id,
      referralCode: record.referral_code,
      referralCodeGeneratedAt: record.referral_code_generated_at,
      referralCompletedAt: record.referral_completed_at,
      metadata: record.metadata ? JSON.parse(record.metadata) : null,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }
}
