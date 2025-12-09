import { Express } from 'express';
import request from 'supertest';
import { generateTestUsers, getCookie } from '../../test-helpers';

describe('Topup Controller Integration Tests', () => {
  let app: Express;
  let testUser: any;
  let authCookie: any;
  let topupRequest: any;
  let debitTransaction: any;
  let testOperatorId: string;
  let testSupplierId: string;
  let testProductCode: string;

  beforeAll(async () => {
    app = (await import('../../../src/app')).default;
    const db = (await import('../../../src/database/connection')).default;

    const testUsers = await generateTestUsers();
    if (!testUsers) {
      throw new Error('Test users could not be generated');
    }

    const { user } = testUsers;
    testUser = user;

    await db('users')
      .where({ id: testUser.userId })
      .update({
        pin: await (
          await import('../../../src/utils/security.utils')
        ).hashPassword('1234'),
      });
    // Login the test user to get auth cookie

    const response = await request(app).post('/api/v1/auth/login').send({
      email: testUser.email,
      password: 'Password123!',
    });
    authCookie = getCookie(response, 'accessToken');

    // Seed operator, supplier, product and mapping for topup tests
    const operatorRows = await db('operators')
      .insert({ code: 'TSTTOPUP', name: 'Topup Test Operator' })
      .returning('id');
    testOperatorId = operatorRows[0]?.id || operatorRows[0];

    const supplierRows = await db('suppliers')
      .insert({ name: 'Topup Supplier', slug: 'topup-supplier' })
      .returning('id');
    testSupplierId = supplierRows[0]?.id || supplierRows[0];

    const productRows = await db('operator_products')
      .insert({
        operator_id: testOperatorId,
        product_code: 'TSTTOPUP-001',
        name: 'Topup Test Product',
        product_type: 'airtime',
        denom_amount: 100,
        data_mb: null,
        validity_days: null,
        slug: 'topup-supplier',
      })
      .returning('id');
    const productId = productRows[0]?.id || productRows[0];
    testProductCode = 'TSTTOPUP-001';

    await db('supplier_product_mapping').insert({
      supplier_id: testSupplierId,
      operator_product_id: productId,
      supplier_product_code: 'SUP-TOPUP-001',
      supplier_price: 80,
      is_active: true,
    });
  });

  afterAll(async () => {
    // Clean up test data in reverse dependency order (respecting foreign keys)
    const db = (await import('../../../src/database/connection')).default;
    // Delete topup requests first (they reference supplier_product_mapping)
    await db('topup_requests').where({ user_id: testUser.userId }).del();
    // Then delete supplier_product_mapping (references operator_products and suppliers)
    await db('supplier_product_mapping')
      .where({ supplier_id: testSupplierId })
      .del();
    // Then delete operator_products
    await db('operator_products').where({ operator_id: testOperatorId }).del();
    // Then delete suppliers and operators
    await db('suppliers').where({ id: testSupplierId }).del();
    await db('operators').where({ id: testOperatorId }).del();
    // Finally delete users
    await db('users').where({ id: testUser.userId }).del();
  });

  beforeEach(async () => {
    const topupResponse = await request(app)
      .post('/api/v1/user/topup')
      .set('Cookie', [`accessToken=${authCookie}`])
      .send({
        amount: 100,
        productCode: testProductCode,
        recipientPhone: '08012345678',
        pin: 1234,
      });

    if (topupResponse.status !== 201 && topupResponse.status !== 200) {
      console.error('Topup request failed:', topupResponse.body);
      throw new Error(
        `Topup request failed with status ${topupResponse.status}: ${topupResponse.body.message}`
      );
    }

    topupRequest = topupResponse.body.data;
    if (!topupRequest) {
      throw new Error('Topup request data is undefined');
    }

    const transactionsResponse = await request(app)
      .get(`/api/v1/user/wallet/transactions`)
      .set('Cookie', [`accessToken=${authCookie}`]);

    if (transactionsResponse.status !== 200) {
      console.error('Transactions request failed:', transactionsResponse.body);
      throw new Error(
        `Transactions request failed with status ${transactionsResponse.status}`
      );
    }

    debitTransaction = transactionsResponse.body.data.transactions?.find(
      (tx: any) => tx.relatedId === topupRequest.id
    );

    if (!debitTransaction) {
      console.error(
        'No debit transaction found for topupRequest',
        topupRequest,
        'Available transactions:',
        transactionsResponse.body.data.transactions
      );
      throw new Error('No debit transaction found for topup request');
    }
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
