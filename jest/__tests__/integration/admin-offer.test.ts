// jest/__tests__/integration/admin-offer.test.ts
import request from 'supertest';
import app from '../../../src/app';
import db from '../../../src/database/connection';
import { CreateUserInput, UserModel } from '../../../src/models/User';
import { getCookie } from '../../test-helpers';

describe('Admin Offer Management API', () => {
  let adminToken: string | undefined;
  let userToken: string | undefined;
  let testUserId: string;
  let testOfferId: string;

  beforeAll(async () => {
    // Create an admin user and log in to get a token
    const adminData: CreateUserInput = {
      email: 'admin.offer.test@example.com',
      fullName: 'Offer Admin Test',
      phoneNumber: '1234567891',
      password: 'Password123!',
      role: 'admin',
    };
    const admin = await UserModel.create(adminData);
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

    // Create a regular user and log in to get a token
    const userData: CreateUserInput = {
      email: 'user.offer.test@example.com',
      fullName: 'Offer User Test',
      phoneNumber: '0987654321',
      password: 'Password123!',
      role: 'user',
    };
    const user = await UserModel.create(userData);
    await db('users').where({ id: user.userId }).update({ is_verified: true });
    const userLoginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: userData.email, password: userData.password });
    userToken = getCookie(userLoginResponse, 'accessToken');
    testUserId = user.userId;
    expect(userToken).toBeDefined();
  });

  afterAll(async () => {
    // Clean up test data
    await db('offer_redemptions').del();
    await db('offers').del();
    await db('operator_products').del();
    await db('operators').where('code', 'TEST').del();
    await db('users').where('email', 'like', '%.offer.test@example.com').del();
  });

  describe('POST /api/v1/offers', () => {
    it('should create a new offer', async () => {
      const newOffer = {
        title: 'Test Offer',
        description: 'A test offer for integration testing',
        status: 'draft',
        discount_type: 'percentage',
        discount_value: 10,
        apply_to: 'all',
      };

      const response = await request(app)
        .post('/api/v1/offers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newOffer)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.offer).toHaveProperty('id');
      expect(response.body.data.offer.title).toBe('Test Offer');
      testOfferId = response.body.data.offer.id;
    });

    it('should return 403 if a non-admin tries to create an offer', async () => {
      const newOffer = {
        title: 'Unauthorized Offer',
        status: 'draft',
        discount_type: 'percentage',
        discount_value: 10,
        apply_to: 'all',
      };

      await request(app)
        .post('/api/v1/offers')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newOffer)
        .expect(403);
    });
  });

  describe('GET /api/v1/offers/:offerId', () => {
    it('should retrieve an offer by its ID', async () => {
      const response = await request(app)
        .get(`/api/v1/offers/${testOfferId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.offer.id).toBe(testOfferId);
    });
  });

  describe('PUT /api/v1/offers/:offerId', () => {
    it('should update an offer', async () => {
      const updates = {
        title: 'Updated Test Offer',
        status: 'active',
      };

      const response = await request(app)
        .put(`/api/v1/offers/${testOfferId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.offer.title).toBe('Updated Test Offer');
      expect(response.body.data.offer.status).toBe('active');
    });
  });

  describe('POST /api/v1/offers/:offerId/redeem', () => {
    it('should allow an eligible user to redeem an offer', async () => {
      // For this test, we assume the user is eligible.
      // A more complex test would set up eligibility rules.

      // First create a test operator
      const testOperator = await db('operators')
        .insert({
          code: 'TEST',
          name: 'Test Operator',
        })
        .returning('id');

      // Create a test operator product for the redemption
      const testOperatorProduct = await db('operator_products')
        .insert({
          operator_id: testOperator[0].id,
          product_code: 'TEST-001',
          name: 'Test Product',
          product_type: 'data',
          denom_amount: 100,
          data_mb: 1024,
          validity_days: 30,
        })
        .returning('id');

      const redemptionDetails = {
        userId: testUserId,
        price: 100,
        discount: 10,
        operatorProductId: testOperatorProduct[0].id, // Use the newly created product
      };

      const response = await request(app)
        .post(`/api/v1/offers/${testOfferId}/redeem`)
        .set('Authorization', `Bearer ${adminToken}`) // Redemption might be an admin action
        .send(redemptionDetails)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Offer redeemed successfully');
    });
  });

  describe('DELETE /api/v1/offers/:offerId', () => {
    it('should soft delete an offer', async () => {
      const response = await request(app)
        .delete(`/api/v1/offers/${testOfferId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify the offer is soft-deleted
      const offer = await db('offers').where({ id: testOfferId }).first();
      expect(offer.deleted_at).not.toBeNull();
    });
  });
});
