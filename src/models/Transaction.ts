import { Knex } from 'knex';
import db from '../database/connection';
import {
  CreateTransactionData,
  Transaction,
  TransactionFilters,
  TransactionQueryResult,
} from '../types/transaction.types';

export class TransactionModel {
  /**
   * Retrieves a transaction by its ID
   * @param id The transaction ID
   * @param trx Optional Knex transaction
   * @returns The transaction object or null if not found
   */
  static async findById(
    id: string,
    trx?: Knex.Transaction
  ): Promise<Transaction | null> {
    const connection = trx || db;
    const result = await connection('transactions')
      .select(
        'id',
        'wallet_id as walletId',
        'user_id as userId',
        'direction',
        'amount',
        'balance_after as balanceAfter',
        'method',
        'reference',
        'related_type as relatedType',
        'related_id as relatedId',
        'metadata',
        'note',
        'created_at as createdAt'
      )
      .where({ id })
      .first();

    if (!result) {
      return null;
    }

    return {
      ...result,
      amount: parseFloat(result.amount),
      balanceAfter: parseFloat(result.balanceAfter),
    };
  }

  /**
   * Retrieves all transactions with optional filters and pagination
   * @param filters Optional filters for querying transactions
   * @param trx Optional Knex transaction
   * @returns Paginated list of transactions
   */
  static async findAll(
    filters: TransactionFilters = {},
    trx?: Knex.Transaction
  ): Promise<TransactionQueryResult> {
    const {
      userId,
      walletId,
      direction,
      method,
      relatedType,
      relatedId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
    } = filters;
    const connection = trx || db;

    const query = connection('transactions').select('*');
    const countQuery = connection('transactions').count('id as total');

    // Apply filters to both queries
    [query, countQuery].forEach(q => {
      if (userId) q.where('user_id', userId);
      if (walletId) q.where('wallet_id', walletId);
      if (direction) q.where('direction', direction);
      if (method) q.where('method', method);
      if (relatedType) q.where('related_type', relatedType);
      if (relatedId) q.where('related_id', relatedId);
      if (dateFrom) q.where('created_at', '>=', dateFrom);
      if (dateTo) q.where('created_at', '<=', dateTo);
    });

    // Apply pagination to the main query
    query
      .orderBy('created_at', 'desc')
      .offset((page - 1) * limit)
      .limit(limit);

    const [results, countResult] = await Promise.all([
      query,
      countQuery.first(),
    ]);
    const total = parseInt(countResult?.total?.toString() || '0', 10);

    const transactions = results.map(result => ({
      id: result.id,
      walletId: result.wallet_id,
      userId: result.user_id,
      direction: result.direction,
      amount: parseFloat(result.amount),
      balanceAfter: parseFloat(result.balance_after),
      method: result.method,
      reference: result.reference,
      relatedType: result.related_type,
      relatedId: result.related_id,
      metadata: result.metadata,
      note: result.note,
      createdAt: result.created_at,
    }));

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      transactions,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    };
  }

  /**
   * Creates a new transaction
   * @param transactionData The transaction data to create
   * @param trx Optional Knex transaction for atomicity
   * @returns The created transaction
   */
  static async create(
    transactionData: CreateTransactionData,
    trx?: Knex.Transaction
  ): Promise<Transaction> {
    const connection = trx || db;
    const [result] = await connection('transactions')
      .insert({
        wallet_id: transactionData.walletId,
        user_id: transactionData.userId,
        direction: transactionData.direction,
        amount: transactionData.amount,
        balance_after: transactionData.balanceAfter,
        method: transactionData.method,
        reference: transactionData.reference,
        related_type: transactionData.relatedType,
        related_id: transactionData.relatedId,
        metadata: transactionData.metadata,
        note: transactionData.note,
      })
      .returning('*');

    return {
      id: result.id,
      walletId: result.wallet_id,
      userId: result.user_id,
      direction: result.direction,
      amount: parseFloat(result.amount),
      balanceAfter: parseFloat(result.balance_after),
      method: result.method,
      reference: result.reference,
      relatedType: result.related_type,
      relatedId: result.related_id,
      metadata: result.metadata,
      note: result.note,
      createdAt: result.created_at,
    };
  }
}
