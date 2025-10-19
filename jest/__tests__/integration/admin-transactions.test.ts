import request from 'supertest';
import app from '../../../src/app';
import db from '../../../src/database/connection';
import { CreateUserInput, UserModel } from '../../../src/models/User';
import { getCookie } from '../../test-helpers';

describe('Admin Transactions and Topup API', () => {
  let adminToken: string | undefined;
  let userUserId: string;
  let transactionId: string;
  let topupRequestId: string;
  let operatorId: string;

  beforeEach(async () => {
    // Create an admin user and log in to get a token
    const adminData: CreateUserInput = {
      email: 'admin.transactions.test@example.com',
      fullName: 'Admin Transactions Test',
      phoneNumber: '1234567890',
      password: 'Password123!',
      role: 'admin',
    };
    // Create admin user
    const admin = await UserModel.create(adminData);

    // Get the admin role and ensure user has the role_id set
    const adminRole = await db('roles').where('name', 'admin').first();
    await db('users').where({ id: admin.userId }).update({
      is_verified: true,
      role_id: adminRole.id,
    });
    const adminLoginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: adminData.email, password: adminData.password });
    adminToken = getCookie(adminLoginResponse, 'accessToken');
    expect(adminToken).toBeDefined();

    // Create a user user
    const userData: CreateUserInput = {
      email: 'user.transactions.test@example.com',
      fullName: 'User Transactions Test',
      phoneNumber: '0987654321',
      password: 'Password123!',
      role: 'user',
    };
    const user = await UserModel.create(userData);
    await db('users').where({ id: user.userId }).update({ is_verified: true });
    userUserId = user.userId;

    // Create a wallet for the user
    await db('wallets').insert({
      user_id: userUserId,
      balance: 100,
    });

    // Create a transaction
    const transactionResult = await db('transactions')
      .insert({
        user_id: userUserId,
        wallet_id: userUserId,
        amount: 100,
        direction: 'credit',
        note: 'Test transaction',
        balance_after: 100,
        method: 'test',
      })
      .returning('id');
    transactionId = transactionResult[0].id;

    // Create an operator
    const operatorResult = await db('operators')
      .insert({
        code: 'TESTOP',
        name: 'Test Operator',
      })
      .returning('id');
    operatorId = operatorResult[0].id;

    // Create a topup request
    const topupRequestResult = await db('topup_requests')
      .insert({
        user_id: userUserId,
        operator_id: operatorId,
        amount: 100,
        recipient_phone: '0987654321',
        status: 'pending',
      })
      .returning('id');
    topupRequestId = topupRequestResult[0].id;
  });

  afterEach(async () => {
    await db('topup_requests').del();
    await db('transactions').del();
    await db('wallets').del();
    await db('operators').del();
    await db('users')
      .where('email', 'like', '%.transactions.test@example.com')
      .del();
  });

  describe('GET /api/v1/admin/transactions', () => {
    it('should get all transactions', async () => {
      const response = await request(app)
        .get('/api/v1/admin/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toBeInstanceOf(Array);
      expect(response.body.data.transactions.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/admin/transactions/:transactionId', () => {
    it('should get a transaction by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(transactionId);
    });
  });

  describe('GET /api/v1/admin/topup-requests', () => {
    it('should get all topup requests', async () => {
      const response = await request(app)
        .get('/api/v1/admin/topup-requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.requests).toBeInstanceOf(Array);
      expect(response.body.data.requests.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/admin/topup-requests/:requestId', () => {
    it('should get a topup request by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/topup-requests/${topupRequestId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(topupRequestId);
    });
  });

  describe('POST /api/v1/admin/topup-requests/:requestId/retry', () => {
    it('should retry a topup request', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/topup-requests/${topupRequestId}/retry`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        'Topup request retry initiated successfully'
      );
    });
  });
});
