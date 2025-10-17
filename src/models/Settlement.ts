import { Knex } from 'knex';
import db from '../database/connection';
import {
  CreateSettlementData,
  Settlement,
  SettlementFilters,
  UpdateSettlementData,
} from '../types/settlement.types';

export class SettlementModel {
  /**
   * Retrieves a settlement by its ID
   * @param id The settlement ID
   * @param trx Optional Knex transaction
   * @returns The settlement object or null if not found
   */
  static async findById(
    id: string,
    trx?: Knex.Transaction
  ): Promise<Settlement | null> {
    const connection = trx || db;
    const result = await connection('settlements')
      .select(
        'id',
        'provider_id as providerId',
        'settlement_date as settlementDate',
        'amount',
        'fees',
        'reference',
        'raw_report as rawReport',
        'created_at as createdAt'
      )
      .where({ id })
      .first();

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      providerId: result.providerId,
      settlementDate: result.settlementDate,
      amount: parseFloat(result.amount),
      fees: parseFloat(result.fees),
      reference: result.reference,
      status: result.status,
      rawReport: result.rawReport,
      createdAt: result.createdAt,
    };
  }

  /**
   * Retrieves all settlements with optional filters
   * @param filters Optional filters for querying settlements
   * @param trx Optional Knex transaction
   * @returns List of settlements
   */
  static async findAll(
    filters: SettlementFilters = {},
    trx?: Knex.Transaction
  ): Promise<Settlement[]> {
    const { providerId, dateFrom, dateTo } = filters;
    const connection = trx || db;

    const query = connection('settlements')
      .select(
        'id',
        'provider_id as providerId',
        'settlement_date as settlementDate',
        'amount',
        'fees',
        'reference',
        'raw_report as rawReport',
        'created_at as createdAt'
      )
      .orderBy('created_at', 'desc');

    if (providerId) query.where('provider_id', providerId);
    if (dateFrom) query.where('settlement_date', '>=', dateFrom);
    if (dateTo) query.where('settlement_date', '<=', dateTo);

    const results = await query;

    return results.map(result => ({
      id: result.id,
      providerId: result.providerId,
      settlementDate: result.settlementDate,
      amount: parseFloat(result.amount),
      fees: parseFloat(result.fees),
      reference: result.reference,
      status: result.status,
      rawReport: result.rawReport,
      createdAt: result.createdAt,
    }));
  }

  /**
   * Creates a new settlement
   * @param settlementData The settlement data to create
   * @param trx Optional Knex transaction to use for atomicity
   * @returns The created settlement
   */
  static async create(
    settlementData: CreateSettlementData,
    trx?: Knex.Transaction
  ): Promise<Settlement> {
    const connection = trx || db;
    const [result] = await connection('settlements')
      .insert({
        provider_id: settlementData.providerId,
        settlement_date: settlementData.settlementDate,
        amount: settlementData.amount,
        fees: settlementData.fees || 0,
        reference: settlementData.reference,
        raw_report: settlementData.rawReport,
      })
      .returning('*');

    return {
      id: result.id,
      providerId: result.provider_id,
      settlementDate: result.settlement_date,
      amount: parseFloat(result.amount),
      status: result.status,
      fees: parseFloat(result.fees),
      reference: result.reference,
      rawReport: result.raw_report,
      createdAt: result.created_at,
    };
  }

  /**
   * Updates a settlement
   * @param id The settlement ID to update
   * @param settlementData The data to update
   * @param trx Optional Knex transaction
   * @returns The updated settlement
   */
  static async update(
    id: string,
    settlementData: UpdateSettlementData,
    trx?: Knex.Transaction
  ): Promise<Settlement> {
    const connection = trx || db;
    const [result] = await connection('settlements')
      .where({ id })
      .update({
        amount: settlementData.amount,
        fees: settlementData.fees,
        reference: settlementData.reference,
        raw_report: settlementData.rawReport,
        updated_at: db.fn.now(),
      })
      .returning('*');

    if (!result) {
      throw new Error('Settlement not found or failed to update');
    }

    return {
      id: result.id,
      providerId: result.provider_id,
      settlementDate: result.settlement_date,
      amount: parseFloat(result.amount),
      status: result.status,
      fees: parseFloat(result.fees),
      reference: result.reference,
      rawReport: result.raw_report,
      createdAt: result.created_at,
    };
  }

  /**
   * Deletes a settlement
   * @param id The settlement ID to delete
   * @param trx Optional Knex transaction
   * @returns True if deleted, false if not found
   */
  static async delete(id: string, trx?: Knex.Transaction): Promise<boolean> {
    const connection = trx || db;
    const deletedCount = await connection('settlements').where({ id }).del();

    return deletedCount > 0;
  }
}
