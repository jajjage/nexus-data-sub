import { Knex } from 'knex';
import db from '../database/connection';

export interface RecentlyUsedNumber {
  id: string;
  userId: string;
  phoneNumber: string;
  operatorCode?: string;
  usageCount: number;
  lastUsedAt: string;
  createdAt: string;
  updatedAt: string;
}

export class RecentlyUsedNumberModel {
  /**
   * Records or updates a recently used number for a user
   * @param userId - The user ID
   * @param phoneNumber - The phone number used
   * @param operatorCode - Optional operator code
   * @returns The created or updated recently used number
   */
  static async recordUsage(
    userId: string,
    phoneNumber: string,
    operatorCode?: string,
    trx?: Knex.Transaction
  ): Promise<RecentlyUsedNumber> {
    const connection = trx || db;

    // Try to find existing entry
    const existing = await connection('recently_used_numbers')
      .where({ user_id: userId, phone_number: phoneNumber })
      .first();

    if (existing) {
      // Update existing entry: increment usage count and update last_used_at
      await connection('recently_used_numbers')
        .where({ id: existing.id })
        .update({
          usage_count: existing.usage_count + 1,
          last_used_at: connection.fn.now(),
          updated_at: connection.fn.now(),
        });

      const updated = await connection('recently_used_numbers')
        .where({ id: existing.id })
        .first();

      return this.formatRecord(updated);
    } else {
      // Create new entry
      const [result] = await connection('recently_used_numbers')
        .insert({
          user_id: userId,
          phone_number: phoneNumber,
          operator_code: operatorCode || null,
          usage_count: 1,
          last_used_at: connection.fn.now(),
          created_at: connection.fn.now(),
          updated_at: connection.fn.now(),
        })
        .returning('*');

      return this.formatRecord(result);
    }
  }

  /**
   * Gets recently used numbers for a user, ordered by last_used_at (most recent first)
   * @param userId - The user ID
   * @param limit - Maximum number of records to return (default 10)
   * @returns Array of recently used numbers
   */
  static async getByUserId(
    userId: string,
    limit: number = 10
  ): Promise<RecentlyUsedNumber[]> {
    const records = await db('recently_used_numbers')
      .where({ user_id: userId })
      .orderBy('last_used_at', 'desc')
      .limit(limit);

    return records.map(r => this.formatRecord(r));
  }

  /**
   * Checks if a phone number has been used by the user before
   * @param userId - The user ID
   * @param phoneNumber - The phone number to check
   * @returns True if the number has been used before, false otherwise
   */
  static async hasBeenUsed(
    userId: string,
    phoneNumber: string
  ): Promise<boolean> {
    const record = await db('recently_used_numbers')
      .where({ user_id: userId, phone_number: phoneNumber })
      .first();

    return !!record;
  }

  /**
   * Deletes a recently used number entry
   * @param id - The recently used number ID
   */
  static async delete(id: string): Promise<void> {
    await db('recently_used_numbers').where({ id }).del();
  }

  /**
   * Deletes all recently used numbers for a user
   * @param userId - The user ID
   */
  static async deleteByUserId(userId: string): Promise<void> {
    await db('recently_used_numbers').where({ user_id: userId }).del();
  }

  /**
   * Helper method to format database records to match the interface
   */
  private static formatRecord(record: any): RecentlyUsedNumber {
    return {
      id: record.id,
      userId: record.user_id,
      phoneNumber: record.phone_number,
      operatorCode: record.operator_code || undefined,
      usageCount: record.usage_count,
      lastUsedAt: record.last_used_at,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }
}
