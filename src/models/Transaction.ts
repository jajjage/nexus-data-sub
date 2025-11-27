import { Knex } from 'knex';
import db from '../database/connection';
import {
  CreateTransactionData,
  Transaction,
  TransactionFilters,
  TransactionQueryResult,
  TransactionWithRelated,
} from '../types/transaction.types';

// Map of related types to their table names
const RELATED_TYPE_TABLE_MAP: Record<string, string> = {
  incoming_payment: 'incoming_payments',
  topup_request: 'topup_requests',
  settlement: 'settlements',
  bill_payment: 'bill_payments',
} as const;

// Valid related types
export type RelatedType = keyof typeof RELATED_TYPE_TABLE_MAP;

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
   * Retrieves a transaction by its ID with related entity data
   * @param id The transaction ID
   * @param trx Optional Knex transaction
   * @returns The transaction with populated related data or null
   */
  static async findByIdWithRelated(
    id: string,
    trx?: Knex.Transaction
  ): Promise<TransactionWithRelated | null> {
    const transaction = await this.findById(id, trx);

    if (!transaction) {
      return null;
    }

    return this.populateRelatedData([transaction], trx).then(
      results => results[0] || null
    );
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
      includeRelated = true,
    } = filters;
    const connection = trx || db;

    const query = connection('transactions').select(
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
    );

    const countQuery = connection('transactions').count('id as total');

    // Apply filters to both queries
    const applyFilters = (q: Knex.QueryBuilder) => {
      if (userId) {
        q.where('user_id', userId);
      }
      if (walletId) {
        q.where('wallet_id', walletId);
      }
      if (direction) {
        q.where('direction', direction);
      }
      if (method) {
        q.where('method', method);
      }
      if (relatedType) {
        // Validate relatedType
        if (RELATED_TYPE_TABLE_MAP[relatedType]) {
          q.where('related_type', relatedType);
        }
      }
      if (relatedId) {
        q.where('related_id', relatedId);
      }
      if (dateFrom) {
        q.where('created_at', '>=', dateFrom);
      }
      if (dateTo) {
        q.where('created_at', '<=', dateTo);
      }
    };

    applyFilters(query);
    applyFilters(countQuery);

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
      walletId: result.walletId,
      userId: result.userId,
      direction: result.direction,
      amount: parseFloat(result.amount),
      balanceAfter: parseFloat(result.balanceAfter),
      method: result.method,
      reference: result.reference,
      relatedType: result.relatedType,
      relatedId: result.relatedId,
      metadata: result.metadata,
      note: result.note,
      createdAt: result.createdAt,
    }));

    // Optionally populate related data
    const finalTransactions = includeRelated
      ? await this.populateRelatedData(transactions, trx)
      : transactions;

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      transactions: finalTransactions,
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
   * Efficiently populates related data for multiple transactions
   * Groups by related_type to minimize database queries
   * @param transactions Array of transactions
   * @param trx Optional Knex transaction
   * @returns Transactions with populated related data
   */
  private static async populateRelatedData(
    transactions: Transaction[],
    trx?: Knex.Transaction
  ): Promise<TransactionWithRelated[]> {
    const connection = trx || db;

    // Group transactions by related_type
    const groupedByType = transactions.reduce(
      (acc, transaction) => {
        if (transaction.relatedType && transaction.relatedId) {
          if (!acc[transaction.relatedType]) {
            acc[transaction.relatedType] = [];
          }
          acc[transaction.relatedType].push(transaction);
        }
        return acc;
      },
      {} as Record<string, Transaction[]>
    );

    // Fetch related data for each type in parallel
    const relatedDataPromises = Object.entries(groupedByType).map(
      async ([relatedType, transactionsOfType]) => {
        const tableName = RELATED_TYPE_TABLE_MAP[relatedType];

        if (!tableName) {
          return { relatedType, data: [] };
        }

        const relatedIds = transactionsOfType
          .map(t => t.relatedId)
          .filter((id): id is string => id !== null && id !== undefined);

        if (relatedIds.length === 0) {
          return { relatedType, data: [] };
        }

        let relatedRecords: any[];

        // Special handling for topup_request to join with operator_products
        if (relatedType === 'topup_request') {
          relatedRecords = await connection(tableName)
            .select(`${tableName}.*`, 'operators.code as operatorCode')
            .leftJoin('operators', `${tableName}.operator_id`, 'operators.id')
            .whereIn(`${tableName}.id`, relatedIds);
        } else {
          // Default behavior for other types
          relatedRecords = await connection(tableName)
            .select('*')
            .whereIn('id', relatedIds);
        }

        return { relatedType, data: relatedRecords };
      }
    );

    const allRelatedData = await Promise.all(relatedDataPromises);

    // Create a map for quick lookup
    const relatedDataMap = new Map<string, any>();
    allRelatedData.forEach(({ relatedType, data }) => {
      data.forEach((record: any) => {
        relatedDataMap.set(`${relatedType}:${record.id}`, record);
      });
    });

    // Attach related data to transactions
    return transactions.map(transaction => {
      const transactionWithRelated: TransactionWithRelated = {
        ...transaction,
        related: undefined,
      };

      if (transaction.relatedType && transaction.relatedId) {
        const key = `${transaction.relatedType}:${transaction.relatedId}`;
        transactionWithRelated.related = relatedDataMap.get(key);
      }

      return transactionWithRelated;
    });
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

    // Validate relatedType if provided
    if (transactionData.relatedType) {
      if (!RELATED_TYPE_TABLE_MAP[transactionData.relatedType]) {
        throw new Error(
          `Invalid related_type: ${transactionData.relatedType}. ` +
            `Valid types are: ${Object.keys(RELATED_TYPE_TABLE_MAP).join(', ')}`
        );
      }

      // Ensure relatedId is provided with relatedType
      if (!transactionData.relatedId) {
        throw new Error(
          'related_id is required when related_type is specified'
        );
      }
    }

    const [result] = await connection('transactions')
      .insert({
        wallet_id: transactionData.walletId,
        user_id: transactionData.userId,
        direction: transactionData.direction,
        amount: transactionData.amount,
        balance_after: transactionData.balanceAfter,
        method: transactionData.method,
        reference: transactionData.reference,
        related_type: transactionData.relatedType || null,
        related_id: transactionData.relatedId || null,
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

  /**
   * Find transactions by related entity
   * @param relatedType The type of related entity
   * @param relatedId The ID of the related entity
   * @param trx Optional Knex transaction
   * @returns Array of transactions
   */
  static async findByRelated(
    relatedType: string,
    relatedId: string,
    trx?: Knex.Transaction
  ): Promise<Transaction[]> {
    const connection = trx || db;

    // Validate relatedType
    if (!RELATED_TYPE_TABLE_MAP[relatedType]) {
      throw new Error(
        `Invalid related_type: ${relatedType}. ` +
          `Valid types are: ${Object.keys(RELATED_TYPE_TABLE_MAP).join(', ')}`
      );
    }

    const results = await connection('transactions')
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
      .where({
        related_type: relatedType,
        related_id: relatedId,
      })
      .orderBy('created_at', 'desc');

    return results.map(result => ({
      ...result,
      amount: parseFloat(result.amount),
      balanceAfter: parseFloat(result.balanceAfter),
    }));
  }

  /**
   * Update a transaction
   * @param id Transaction ID
   * @param updates Partial transaction data to update
   * @param trx Optional Knex transaction
   * @returns Updated transaction or null
   */
  static async update(
    id: string,
    updates: Partial<CreateTransactionData>,
    trx?: Knex.Transaction
  ): Promise<Transaction | null> {
    const connection = trx || db;

    // Validate relatedType if being updated
    if (updates.relatedType && !RELATED_TYPE_TABLE_MAP[updates.relatedType]) {
      throw new Error(
        `Invalid related_type: ${updates.relatedType}. ` +
          `Valid types are: ${Object.keys(RELATED_TYPE_TABLE_MAP).join(', ')}`
      );
    }

    const updateData: any = {};

    if (updates.balanceAfter !== undefined) {
      updateData.balance_after = updates.balanceAfter;
    }
    if (updates.metadata !== undefined) {
      updateData.metadata = updates.metadata;
    }
    if (updates.note !== undefined) {
      updateData.note = updates.note;
    }
    if (updates.relatedType !== undefined) {
      updateData.related_type = updates.relatedType;
    }
    if (updates.relatedId !== undefined) {
      updateData.related_id = updates.relatedId;
    }

    if (Object.keys(updateData).length === 0) {
      return this.findById(id, trx);
    }

    const [result] = await connection('transactions')
      .where({ id })
      .update(updateData)
      .returning('*');

    if (!result) {
      return null;
    }

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
