import { Knex } from 'knex';
import db from '../database/connection';

// =================================================================
// Interfaces
// =================================================================

export interface Reward {
  id: string;
  userId: string;
  points: number;
  reason: string;
  earnedAt: Date;
  status: 'pending' | 'credited' | 'expired' | 'revoked';
  expiresAt: Date | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRewardInput {
  userId: string;
  points: number;
  reason: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

// =================================================================
// Rewards Model Class
// =================================================================

export class RewardModel {
  private static readonly TABLE_NAME = 'rewards';

  /**
   * Creates a new reward record
   * @param data - Reward data
   * @param trx - Optional transaction
   * @returns The created reward
   */
  static async create(
    data: CreateRewardInput,
    trx?: Knex.Transaction
  ): Promise<Reward> {
    const connection = trx || db;
    const [reward] = await connection(this.TABLE_NAME)
      .insert({
        user_id: data.userId,
        points: data.points,
        reason: data.reason,
        earned_at: connection.fn.now(),
        expires_at: data.expiresAt || null,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        status: 'pending',
      })
      .returning('*');

    return this.formatRecord(reward);
  }

  /**
   * Finds a reward by ID
   * @param id - The reward ID
   * @returns The reward or null
   */
  static async findById(id: string): Promise<Reward | null> {
    const reward = await db(this.TABLE_NAME).where({ id }).first();
    return reward ? this.formatRecord(reward) : null;
  }

  /**
   * Gets all rewards for a user
   * @param userId - The user ID
   * @param status - Optional status filter
   * @param limit - Max records to return
   * @returns Array of rewards
   */
  static async findByUserId(
    userId: string,
    status?: string,
    limit: number = 100
  ): Promise<Reward[]> {
    let query = db(this.TABLE_NAME).where({ user_id: userId });

    if (status) {
      query = query.where({ status });
    }

    const rewards = await query.orderBy('earned_at', 'desc').limit(limit);
    return rewards.map(r => this.formatRecord(r));
  }

  /**
   * Gets pending rewards for a user
   * @param userId - The user ID
   * @returns Array of pending rewards
   */
  static async findPendingByUserId(userId: string): Promise<Reward[]> {
    return this.findByUserId(userId, 'pending');
  }

  /**
   * Gets credited rewards for a user
   * @param userId - The user ID
   * @returns Array of credited rewards
   */
  static async findCreditedByUserId(userId: string): Promise<Reward[]> {
    return this.findByUserId(userId, 'credited');
  }

  /**
   * Gets the sum of points for rewards with a given status
   * @param userId - The user ID
   * @param status - The status to filter by
   * @returns Total points
   */
  static async getTotalPointsByStatus(
    userId: string,
    status: string
  ): Promise<number> {
    const result = await db(this.TABLE_NAME)
      .where({ user_id: userId, status })
      .sum('points as total')
      .first();

    return result?.total || 0;
  }

  /**
   * Gets total credited points for a user
   * @param userId - The user ID
   * @returns Total credited points
   */
  static async getTotalCreditedPoints(userId: string): Promise<number> {
    return this.getTotalPointsByStatus(userId, 'credited');
  }

  /**
   * Gets total pending points for a user
   * @param userId - The user ID
   * @returns Total pending points
   */
  static async getTotalPendingPoints(userId: string): Promise<number> {
    return this.getTotalPointsByStatus(userId, 'pending');
  }

  /**
   * Updates a reward's status
   * @param id - The reward ID
   * @param status - New status
   * @param trx - Optional transaction
   * @returns The updated reward or null
   */
  static async updateStatus(
    id: string,
    status: 'pending' | 'credited' | 'expired' | 'revoked',
    trx?: Knex.Transaction
  ): Promise<Reward | null> {
    const connection = trx || db;
    const [reward] = await connection(this.TABLE_NAME)
      .where({ id })
      .update({
        status,
        updated_at: connection.fn.now(),
      })
      .returning('*');

    return reward ? this.formatRecord(reward) : null;
  }

  /**
   * Credits a reward (marks it as credited)
   * @param id - The reward ID
   * @param trx - Optional transaction
   * @returns The updated reward
   */
  static async credit(
    id: string,
    trx?: Knex.Transaction
  ): Promise<Reward | null> {
    return this.updateStatus(id, 'credited', trx);
  }

  /**
   * Revokes a reward
   * @param id - The reward ID
   * @param trx - Optional transaction
   * @returns The updated reward
   */
  static async revoke(
    id: string,
    trx?: Knex.Transaction
  ): Promise<Reward | null> {
    return this.updateStatus(id, 'revoked', trx);
  }

  /**
   * Expires a reward
   * @param id - The reward ID
   * @param trx - Optional transaction
   * @returns The updated reward
   */
  static async expire(
    id: string,
    trx?: Knex.Transaction
  ): Promise<Reward | null> {
    return this.updateStatus(id, 'expired', trx);
  }

  /**
   * Marks expired rewards as 'expired' status (batch operation)
   * @returns Number of rewards updated
   */
  static async markExpiredRewards(): Promise<number> {
    return db(this.TABLE_NAME)
      .where('expires_at', '<', db.fn.now())
      .where({ status: 'pending' })
      .update({
        status: 'expired',
        updated_at: db.fn.now(),
      });
  }

  /**
   * Gets rewards summary for a user
   * @param userId - The user ID
   * @returns Summary object with point counts by status
   */
  static async getSummaryByUserId(userId: string): Promise<{
    total: number;
    pending: number;
    credited: number;
    expired: number;
    revoked: number;
  }> {
    const rewards = await db(this.TABLE_NAME).where({ user_id: userId });

    const summary = {
      total: 0,
      pending: 0,
      credited: 0,
      expired: 0,
      revoked: 0,
    };

    rewards.forEach(reward => {
      summary.total += reward.points;
      summary[reward.status as keyof typeof summary] += reward.points;
    });

    return summary;
  }

  /**
   * Helper method to format database records
   */
  private static formatRecord(record: any): Reward {
    return {
      id: record.id,
      userId: record.user_id,
      points: record.points,
      reason: record.reason,
      earnedAt: record.earned_at,
      status: record.status,
      expiresAt: record.expires_at,
      metadata: record.metadata ? JSON.parse(record.metadata) : null,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }
}
