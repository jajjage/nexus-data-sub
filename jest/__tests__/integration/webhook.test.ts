import crypto from 'crypto';
import request from 'supertest';
import app from '../../../src/app';
import { config } from '../../../src/config/env';
import { WebhookService } from '../../../src/services/webhook.service';

// Mock the database connection
jest.mock('../../../src/database/connection', () => {
  const knexMock = {
    where: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue({
      id: 1,
      name: 'palmpay',
      is_active: true,
      webhook_secret: 'test_webhook_secret',
    }),
    insert: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([
      {
        id: 1,
        provider: 'palmpay',
        event_type: 'payment.received',
        payload: {},
        signature_ok: true,
      },
    ]),
  };
  return {
    __esModule: true,
    default: jest.fn(() => knexMock),
  };
});

// Mock the WebhookService
jest.mock('../../../src/services/webhook.service');

const MockedWebhookService = WebhookService as jest.MockedClass<
  typeof WebhookService
>;

describe('Webhook Integration Tests', () => {
  const testProvider = {
    name: 'palmpay',
    webhook_secret: 'test_webhook_secret',
  };

  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    MockedWebhookService.mockClear();
  });

  describe('POST /api/v1/webhooks/:provider', () => {
    const webhookPayload = {
      event_type: 'payment.received',
      event_id: 'evt_123456',
      tx_ref: 'user_uy123832894',
      transaction_id: 'txn_123456',
      virtual_account_id: 'VA123456',
      amount: '1000.00',
      currency: 'NGN',
      timestamp: new Date().toISOString(),
    };

    it('should successfully process a valid webhook with correct signature', async () => {
      const processPaymentMock = jest.fn().mockResolvedValue({
        success: true,
        statusCode: 200,
        message: 'Payment processed successfully',
        data: {
          webhookEventId: 1,
          incomingPaymentId: 1,
          userId: 'user-123',
        },
      });

      (WebhookService as jest.Mock).mockImplementation(() => {
        return {
          processPayment: processPaymentMock,
        };
      });

      const payload = JSON.stringify(webhookPayload);
      const signature = crypto
        .createHmac('sha256', testProvider.webhook_secret)
        .update(payload)
        .digest('hex');

      const response = await request(app)
        .post('/api/v1/webhooks/palmpay')
        .set(config.webhooks.palmpay.signatureHeader, signature)
        .send(webhookPayload);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Payment processed successfully');
      expect(processPaymentMock).toHaveBeenCalledWith(
        'palmpay',
        expect.objectContaining({
          provider: 'palmpay',
          payload: {}, // The mock for knex returns an empty payload
        }),
        webhookPayload
      );
    });

    it('should reject webhook with invalid signature', async () => {
      const response = await request(app)
        .post('/api/v1/webhooks/palmpay')
        .set(config.webhooks.palmpay.signatureHeader, 'invalid_signature')
        .send(webhookPayload);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid webhook signature');
    });
  });
});
