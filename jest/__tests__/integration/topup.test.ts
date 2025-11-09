import { Express } from 'express';
import request from 'supertest';
import { generateTestUsers, getCookie } from '../../test-helpers';

describe('Topup Controller Integration Tests', () => {
  let app: Express;
  let testUser: any;
  let authCookie: any;
  let topupRequest: any;
  let debitTransaction: any;

  beforeAll(async () => {
    app = (await import('../../../src/app')).default;
    const testUsers = await generateTestUsers();
    if (!testUsers) {
      throw new Error('Test users could not be generated');
    }
    const { user } = testUsers;
    testUser = user;

    const response = await request(app).post('/api/v1/auth/login').send({
      email: testUser.email,
      password: 'Password123!',
    });
    authCookie = getCookie(response, 'accessToken');
  });

  beforeEach(async () => {
    const topupResponse = await request(app)
      .post('/api/v1/user/topup')
      .set('Cookie', [`accessToken=${authCookie}`])
      .send({
        amount: 100,
        operatorCode: 'MTN',
        recipientPhone: '08012345678',
      });
    topupRequest = topupResponse.body.data;

    const transactionsResponse = await request(app)
      .get(`/api/v1/user/wallet/transactions`)
      .set('Cookie', [`accessToken=${authCookie}`]);

    debitTransaction = transactionsResponse.body.data.transactions.find(
      (tx: any) => tx.relatedId === topupRequest.id
    );
  });

  describe('GET /api/v1/user/wallet/transactions/:id', () => {
    it('should return a transaction by id', async () => {
      const response = await request(app)
        .get(`/api/v1/user/wallet/transactions/${debitTransaction.id}`)
        .set('Cookie', [`accessToken=${authCookie}`]);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(debitTransaction.id);
    });
  });

  describe('POST /api/v1/webhooks/topup-vendor', () => {
    it('should handle a successful topup webhook', async () => {
      const webhookPayload = {
        transaction: {
          status: 'success',
          reference: 'test-reference',
          customer_reference: topupRequest.id,
          type: 'Data purchase',
          beneficiary: '08012345678',
          memo: 'Test memo',
          response: 'Test response',
          price: '100',
        },
      };

      const response = await request(app)
        .post('/api/v1/webhooks/topup-vendor')
        .send(webhookPayload);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Top-up successful');
    });

    it('should handle a failed topup webhook and refund the user', async () => {
      const webhookPayload = {
        transaction: {
          status: 'failed',
          reference: 'test-reference-failed',
          customer_reference: topupRequest.id,
          type: 'Data purchase',
          beneficiary: '08087654321',
          memo: 'Test memo failed',
          response: 'Test response failed',
          price: '50',
        },
      };

      const response = await request(app)
        .post('/api/v1/webhooks/topup-vendor')
        .send(webhookPayload);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Top-up failed, user refunded');
    });
  });
});
