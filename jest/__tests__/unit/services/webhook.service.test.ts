import knex from '../../../../src/database/connection';
import { WebhookService } from '../../../../src/services/webhook.service';
import { WebhookEvent } from '../../../../src/types/webhook.types';
import { ApiError } from '../../../../src/utils/ApiError';

// 1. Mock the database connection module
jest.mock('../../../../src/database/connection');

// 2. Create a reusable mock for the Knex transaction object
const createMockTrx = () => {
  const mockTrx: any = jest.fn(() => mockTrx); // Basic mock trx is a function that returns itself

  // Attach chainable methods
  mockTrx.insert = jest.fn(() => mockTrx);
  mockTrx.onConflict = jest.fn(() => mockTrx);
  mockTrx.ignore = jest.fn(() => mockTrx);
  mockTrx.returning = jest.fn().mockResolvedValue([{ id: 1 }]);
  mockTrx.where = jest.fn(() => mockTrx);
  mockTrx.orWhere = jest.fn(() => mockTrx);
  mockTrx.first = jest
    .fn()
    .mockResolvedValue({ id: 1, user_id: 'user123', balance: '0.00' });
  mockTrx.update = jest.fn().mockResolvedValue(1);
  mockTrx.forUpdate = jest.fn(() => mockTrx);
  mockTrx.commit = jest.fn().mockResolvedValue(undefined);
  mockTrx.rollback = jest.fn().mockResolvedValue(undefined);

  return mockTrx;
};

// 3. Typecast the mocked knex to control its methods
const mockedKnex = knex as jest.Mocked<typeof knex>;

describe('WebhookService', () => {
  let webhookService: WebhookService;
  let mockTrx: any;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    webhookService = new WebhookService();
    mockTrx = createMockTrx();

    // Configure the main transaction mock to resolve with our trx object
    (mockedKnex.transaction as jest.Mock).mockResolvedValue(mockTrx);
  });

  const mockWebhookEvent: WebhookEvent = {
    id: 1,
    provider: 'palmpay',
    event_type: 'payment.received',
    event_id: 'evt_123',
    payload: {},
    headers: {},
    signature_ok: true,
    processed: false,
    processed_at: null,
    created_at: new Date(),
  };

  describe('processPayment', () => {
    it('should process a valid payment successfully', async () => {
      const mockPayload = {
        transaction_id: 'txn_123',
        virtual_account_id: 'VA123',
        amount: '1000.00',
        currency: 'NGN',
        timestamp: new Date().toISOString(),
      };

      const result = await webhookService.processPayment(
        'palmpay',
        mockWebhookEvent,
        mockPayload
      );

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.data).toHaveProperty('incomingPaymentId');
      expect(mockTrx.commit).toHaveBeenCalled();
      expect(mockTrx.rollback).not.toHaveBeenCalled();
    });

    it('should handle missing required fields', async () => {
      const mockPayload = { transaction_id: 'txn_123' };

      const result = await webhookService.processPayment(
        'palmpay',
        mockWebhookEvent,
        mockPayload
      );

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.message).toContain('Missing required fields');
      expect(mockTrx.rollback).toHaveBeenCalled();
    });

    it('should handle duplicate payments idempotently', async () => {
      const mockPayload = {
        transaction_id: 'txn_123',
        virtual_account_id: 'VA123',
        amount: '1000.00',
      };
      mockTrx.returning.mockResolvedValue([]); // Simulate no insert

      const result = await webhookService.processPayment(
        'palmpay',
        mockWebhookEvent,
        mockPayload
      );

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Payment already processed');
      expect(mockTrx.commit).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const mockPayload = {
        transaction_id: 'txn_123',
        virtual_account_id: 'VA123',
        amount: '1000.00',
      };
      const dbError = new Error('Database connection failed');
      mockTrx.returning.mockRejectedValue(dbError);

      await expect(
        webhookService.processPayment('palmpay', mockWebhookEvent, mockPayload)
      ).rejects.toThrow(
        new ApiError(
          500,
          `Error processing webhook payment: ${dbError.message}`
        )
      );

      expect(mockTrx.rollback).toHaveBeenCalled();
      expect(mockTrx.commit).not.toHaveBeenCalled();
    });
  });
});
