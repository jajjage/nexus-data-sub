import { Knex } from 'knex';
import db from '../database/connection';

export interface Cashback {
  id: string;
  userId: string;
  availableBalance: number;
  totalEarned: number;
  totalRedeemed: number;
  createdAt: string;
  updatedAt: string;
}

export interface CashbackTransaction {
  id: string;
  userId: string;
  type: 'earned' | 'redeemed' | 'adjustment';
  amount: number;
  description?: string;
  topupRequestId?: string;
  createdAt: string;
}

export class CashbackModel {
  /**
   * Gets or creates a cashback record for a user
   * @param userId - The user ID
   * @param trx - Optional transaction
   * @returns The cashback record
   */
  static async getOrCreate(
    userId: string,
    trx?: Knex.Transaction | Knex
  ): Promise<Cashback> {
    const connection = trx || db;

    // Try to find existing cashback
    let cashback = await connection('cashback')
      .where({ user_id: userId })
      .first();

    if (!cashback) {
      // Create new cashback record
      await connection('cashback').insert({
        user_id: userId,
        available_balance: 0,
        total_earned: 0,
        total_redeemed: 0,
        created_at: connection.fn.now(),
        updated_at: connection.fn.now(),
      });

      cashback = await connection('cashback')
        .where({ user_id: userId })
        .first();
    }

    return this.formatRecord(cashback);
  }

  /**
   * Gets cashback by user ID
   * @param userId - The user ID
   * @param trx - Optional transaction
   * @returns The cashback record or null
   */
  static async findByUserId(
    userId: string,
    trx?: Knex.Transaction | Knex
  ): Promise<Cashback | null> {
    const connection = trx || db;
    const cashback = await connection('cashback')
      .where({ user_id: userId })
      .first();

    return cashback ? this.formatRecord(cashback) : null;
  }

  /**
   * Adds available cashback to user account
   * @param userId - The user ID
   * @param amount - Amount to add
   * @param description - Transaction description
   * @param topupRequestId - Optional related topup request ID
   * @param trx - Optional transaction
   * @returns Updated cashback record
   */
  static async addCashback(
    userId: string,
    amount: number,
    description: string,
    topupRequestId?: string,
    trx?: Knex.Transaction | Knex
  ): Promise<Cashback> {
    const connection = trx || db;

    // Get or create cashback record
    const cashback = await this.getOrCreate(
      userId,
      connection as Knex.Transaction
    );

    // Update cashback available balance and total earned
    const newAvailableBalance =
      parseFloat(String(cashback.availableBalance)) + amount;
    const newTotalEarned = parseFloat(String(cashback.totalEarned)) + amount;

    await connection('cashback').where({ user_id: userId }).update({
      available_balance: newAvailableBalance,
      total_earned: newTotalEarned,
      updated_at: connection.fn.now(),
    });

    // Record the transaction
    await connection('cashback_transactions').insert({
      user_id: userId,
      type: 'earned',
      amount,
      description,
      topup_request_id: topupRequestId || null,
      created_at: connection.fn.now(),
    });

    // Return updated cashback
    return this.getOrCreate(userId, connection as Knex.Transaction);
  }

  /**
   * Redeems cashback from user account
   * @param userId - The user ID
   * @param amount - Amount to redeem
   * @param description - Transaction description
   * @param topupRequestId - Optional related topup request ID
   * @param trx - Optional transaction
   * @returns Updated cashback record
   */
  static async redeemCashback(
    userId: string,
    amount: number,
    description: string,
    topupRequestId?: string,
    trx?: Knex.Transaction | Knex
  ): Promise<Cashback> {
    const connection = trx || db;

    const cashback = await this.getOrCreate(
      userId,
      connection as Knex.Transaction
    );

    // Check if sufficient cashback available
    if (parseFloat(String(cashback.availableBalance)) < amount) {
      throw new Error(
        `Insufficient cashback balance. Available: ${cashback.availableBalance}, Required: ${amount}`
      );
    }

    // Update cashback available balance and total redeemed
    const newAvailableBalance =
      parseFloat(String(cashback.availableBalance)) - amount;
    const newTotalRedeemed =
      parseFloat(String(cashback.totalRedeemed)) + amount;

    await connection('cashback').where({ user_id: userId }).update({
      available_balance: newAvailableBalance,
      total_redeemed: newTotalRedeemed,
      updated_at: connection.fn.now(),
    });

    // Record the transaction
    await connection('cashback_transactions').insert({
      user_id: userId,
      type: 'redeemed',
      amount,
      description,
      topup_request_id: topupRequestId || null,
      created_at: connection.fn.now(),
    });

    // Return updated cashback
    return this.getOrCreate(userId, connection as Knex.Transaction);
  }

  /**
   * Gets cashback transaction history for a user
   * @param userId - The user ID
   * @param limit - Max records to return
   * @returns Array of transactions
   */
  static async getTransactionHistory(
    userId: string,
    limit: number = 50
  ): Promise<CashbackTransaction[]> {
    const transactions = await db('cashback_transactions')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit);

    return transactions.map(t => this.formatTransaction(t));
  }

  /**
   * Helper method to format database records to match the interface
   */
  private static formatRecord(record: any): Cashback {
    return {
      id: record.id,
      userId: record.user_id,
      availableBalance: parseFloat(String(record.available_balance)),
      totalEarned: parseFloat(String(record.total_earned)),
      totalRedeemed: parseFloat(String(record.total_redeemed)),
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  private static formatTransaction(record: any): CashbackTransaction {
    return {
      id: record.id,
      userId: record.user_id,
      type: record.type,
      amount: parseFloat(String(record.amount)),
      description: record.description,
      topupRequestId: record.topup_request_id,
      createdAt: record.created_at,
    };
  }
}
