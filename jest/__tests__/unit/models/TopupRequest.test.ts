import { Knex } from 'knex';
import db from '../../../../src/database/connection';
import { OperatorModel } from '../../../../src/models/Operator';
import { TopupRequestModel } from '../../../../src/models/TopupRequest';

describe('TopupRequestModel', () => {
  let trx: Knex.Transaction;
  let testUser: any;
  let testOperator: any;
  let testTopupRequest: any;

  // Start a transaction before each test
  beforeEach(async () => {
    trx = await db.transaction();

    // Create a test user within this transaction
    const [user] = await trx('users')
      .insert({
        email: 'test.topup@example.com',
        full_name: 'Test Topup User',
        phone_number: '1234567890',
        password: 'hashed_password',
        role: 'user',
        is_verified: true,
      })
      .returning('*');
    testUser = user;

    // Create a test operator within this transaction
    testOperator = await OperatorModel.create(
      {
        code: 'TEST',
        name: 'Test Operator',
      },
      trx
    );
  });

  // Rollback the transaction after each test
  afterEach(async () => {
    await trx.rollback();
  });

  describe('create', () => {
    it('should create a new topup request', async () => {
      testTopupRequest = await TopupRequestModel.create(
        {
          userId: testUser.id,
          recipientPhone: '1234567890',
          operatorId: testOperator.id,
          amount: 1000,
          status: 'pending',
          attemptCount: 0,
          requestPayload: undefined,
        },
        trx
      );

      expect(testTopupRequest).toBeDefined();
      expect(testTopupRequest.id).toBeDefined();
      expect(testTopupRequest.userId).toBe(testUser.id);
      expect(testTopupRequest.operatorId).toBe(testOperator.id);
      expect(testTopupRequest.amount).toBe(1000);
      expect(testTopupRequest.status).toBe('pending');
    });
  });

  describe('findById', () => {
    it('should retrieve a topup request by ID with responses', async () => {
      // Create a topup request for this test within the same transaction
      testTopupRequest = await TopupRequestModel.create(
        {
          userId: testUser.id,
          recipientPhone: '1234567890',
          operatorId: testOperator.id,
          amount: 1000,
          status: 'pending',
          attemptCount: 0,
          requestPayload: undefined,
        },
        trx
      );

      // Add a response to test the responses fetching
      await trx('topup_responses').insert({
        topup_request_id: testTopupRequest.id,
        response_code: '00',
        response_message: 'Success',
        response_payload: { success: true },
      });

      const request = await TopupRequestModel.findById(
        testTopupRequest.id,
        trx
      );
      expect(request).toBeDefined();
      expect(request?.id).toBe(testTopupRequest.id);
      expect(request?.userId).toBe(testUser.id);
      expect(Array.isArray(request?.responses)).toBe(true);
    });

    it('should return null for non-existent topup request', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const request = await TopupRequestModel.findById(nonExistentId, trx);
      expect(request).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should retrieve all topup requests with pagination', async () => {
      // Create additional topup requests for this test within the same transaction
      await TopupRequestModel.create(
        {
          userId: testUser.id,
          recipientPhone: '1234567890',
          operatorId: testOperator.id,
          amount: 1500,
          status: 'pending',
          attemptCount: 0,
          requestPayload: undefined,
        },
        trx
      );
      await TopupRequestModel.create(
        {
          userId: testUser.id,
          recipientPhone: '1234567890',
          operatorId: testOperator.id,
          amount: 2000,
          status: 'completed',
          attemptCount: 1,
          requestPayload: undefined,
        },
        trx
      );

      const result = await TopupRequestModel.findAll(
        { page: 1, limit: 10 },
        trx
      );
      expect(result).toBeDefined();
      expect(result.requests).toBeDefined();
      expect(result.pagination).toBeDefined();
      expect(Array.isArray(result.requests)).toBe(true);
      expect(result.pagination.total).toBeGreaterThanOrEqual(2);
    });

    it('should filter topup requests by user ID', async () => {
      // Create additional records for this test within the same transaction
      await TopupRequestModel.create(
        {
          userId: testUser.id,
          recipientPhone: '1234567890',
          operatorId: testOperator.id,
          amount: 3000,
          status: 'pending',
          attemptCount: 0,
          requestPayload: undefined,
        },
        trx
      );
      await TopupRequestModel.create(
        {
          userId: testUser.id,
          recipientPhone: '1234567890',
          operatorId: testOperator.id,
          amount: 4000,
          status: 'failed',
          attemptCount: 1,
          requestPayload: undefined,
        },
        trx
      );

      const result = await TopupRequestModel.findAll(
        { userId: testUser.id },
        trx
      );
      expect(result).toBeDefined();
      expect(result.requests).toBeDefined();
      expect(result.requests.length).toBeGreaterThanOrEqual(2);
      result.requests.forEach(request => {
        expect(request.userId).toBe(testUser.id);
      });
    });

    it('should filter topup requests by status', async () => {
      const result = await TopupRequestModel.findAll(
        { status: 'pending' },
        trx
      );
      expect(result).toBeDefined();
      expect(result.requests).toBeDefined();
      result.requests.forEach(request => {
        expect(request.status).toBe('pending');
      });
    });
  });
});
