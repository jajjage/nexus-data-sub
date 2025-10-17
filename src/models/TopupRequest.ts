/* eslint-disable @typescript-eslint/no-unused-vars */
import { Knex } from 'knex';
import db from '../database/connection';
import {
  TopupRequest,
  TopupRequestFilters,
  TopupRequestQueryResult,
  TopupRequestWithResponses,
} from '../types/topup.types';

// Type for the raw topup request object fetched from the database, where amount and cost are strings
type RawTopupRequestFromDB = Omit<TopupRequest, 'amount' | 'cost'> & {
  amount: string;
  cost?: string;
};

export class TopupRequestModel {
  /**
   * Retrieves a topup request by its ID with associated responses
   * @param id The topup request ID
   * @param trx Optional Knex transaction
   * @returns The topup request with responses or null if not found
   */
  static async findById(
    id: string,
    trx?: Knex.Transaction
  ): Promise<TopupRequestWithResponses | null> {
    const connection = trx || db;
    const request = await connection('topup_requests')
      .select(
        'id',
        'external_id as externalId',
        'user_id as userId',
        'recipient_phone as recipientPhone',
        'operator_id as operatorId',
        'operator_product_id as operatorProductId',
        'supplier_id as supplierId',
        'supplier_mapping_id as supplierMappingId',
        'amount',
        'cost',
        'status',
        'attempt_count as attemptCount',
        'idempotency_key as idempotencyKey',
        'request_payload as requestPayload',
        'created_at as createdAt',
        'updated_at as updatedAt'
      )
      .where({ id })
      .first();

    if (!request) {
      return null;
    }

    // Fetch associated responses
    const responses = await (
      trx ? trx('topup_responses') : db('topup_responses')
    )
      .select(
        'id',
        'topup_request_id as topupRequestId',
        'supplier_id as supplierId',
        'response_code as responseCode',
        'response_message as responseMessage',
        'response_payload as responsePayload',
        'created_at as createdAt'
      )
      .where('topup_request_id', id);

    return {
      ...request,
      amount: parseFloat(request.amount),
      cost: request.cost ? parseFloat(request.cost) : undefined,
      responses: responses.map(response => ({
        ...response,
        responsePayload: response.responsePayload,
      })),
    };
  }

  /**
   * Retrieves all topup requests with optional filters and pagination
   * @param filters Optional filters for querying topup requests
   * @param trx Optional Knex transaction
   * @returns Paginated list of topup requests with responses
   */
  static async findAll(
    filters: TopupRequestFilters = {},
    trx?: Knex.Transaction
  ): Promise<TopupRequestQueryResult> {
    const { status, userId, dateFrom, dateTo, page = 1, limit = 10 } = filters;
    const connection = trx || db;

    const offset = (page - 1) * limit;

    // Get total count with same filters
    const countQuery = (
      trx ? trx('topup_requests') : db('topup_requests')
    ).count('* as count');
    if (status) countQuery.where('status', status);
    if (userId) countQuery.where('user_id', userId);
    if (dateFrom) countQuery.where('created_at', '>=', dateFrom);
    if (dateTo) countQuery.where('created_at', '<=', dateTo);

    const countResult = await countQuery.first();
    const total = parseInt(String(countResult?.count || '0'), 10);

    // Get topup requests with same filters
    const requests = await (trx ? trx('topup_requests') : db('topup_requests'))
      .select(
        'id',
        'external_id as externalId',
        'user_id as userId',
        'recipient_phone as recipientPhone',
        'operator_id as operatorId',
        'operator_product_id as operatorProductId',
        'supplier_id as supplierId',
        'supplier_mapping_id as supplierMappingId',
        'amount',
        'cost',
        'status',
        'attempt_count as attemptCount',
        'idempotency_key as idempotencyKey',
        'request_payload as requestPayload',
        'created_at as createdAt',
        'updated_at as updatedAt'
      )
      .orderBy('created_at', 'desc') // Most recent first
      .modify(query => {
        if (status) query.where('status', status);
        if (userId) query.where('user_id', userId);
        if (dateFrom) query.where('created_at', '>=', dateFrom);
        if (dateTo) query.where('created_at', '<=', dateTo);
      })
      .limit(limit)
      .offset(offset);

    // For each request, get associated responses
    const requestsWithResponses = await Promise.all(
      requests.map(async (request: RawTopupRequestFromDB) => {
        const responseConnection = trx
          ? trx('topup_responses')
          : db('topup_responses');
        const responses = await responseConnection
          .select(
            'id',
            'topup_request_id as topupRequestId',
            'supplier_id as supplierId',
            'response_code as responseCode',
            'response_message as responseMessage',
            'response_payload as responsePayload',
            'created_at as createdAt'
          )
          .where('topup_request_id', request.id);

        return {
          ...request,
          amount: parseFloat(request.amount),
          cost: request.cost ? parseFloat(request.cost) : undefined,
          responses: responses.map(response => ({
            ...response,
            responsePayload: response.responsePayload,
          })),
        };
      })
    );

    const totalPages = Math.ceil(total / limit);

    return {
      requests: requestsWithResponses,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Creates a new topup request
   * @param requestData The topup request data to create
   * @param trx Optional Knex transaction to use for atomicity
   * @returns The created topup request
   */
  static async create(
    requestData: Omit<
      TopupRequest,
      'id' | 'createdAt' | 'updatedAt' | 'externalId'
    >,
    trx?: Knex.Transaction
  ): Promise<TopupRequest> {
    const connection = trx || db;
    const [result] = await connection('topup_requests')
      .insert({
        user_id: requestData.userId,
        recipient_phone: requestData.recipientPhone,
        operator_id: requestData.operatorId,
        operator_product_id: requestData.operatorProductId,
        supplier_id: requestData.supplierId,
        supplier_mapping_id: requestData.supplierMappingId,
        amount: requestData.amount,
        cost: requestData.cost,
        status: requestData.status,
        attempt_count: requestData.attemptCount,
        idempotency_key: requestData.idempotencyKey,
        request_payload: requestData.requestPayload,
      })
      .returning('*');

    return {
      id: result.id,
      externalId: result.external_id,
      userId: result.user_id,
      recipientPhone: result.recipient_phone,
      operatorId: result.operator_id,
      operatorProductId: result.operator_product_id,
      supplierId: result.supplier_id,
      supplierMappingId: result.supplier_mapping_id,
      amount: parseFloat(result.amount),
      cost: result.cost ? parseFloat(result.cost) : undefined,
      status: result.status,
      attemptCount: result.attempt_count,
      idempotencyKey: result.idempotency_key,
      requestPayload: result.request_payload,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    };
  }
}
