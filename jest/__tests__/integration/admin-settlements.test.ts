import request from 'supertest';
import app from '../../../src/app';
import db from '../../../src/database/connection';
import { CreateUserInput, UserModel } from '../../../src/models/User';
import { getCookie } from '../../test-helpers';

describe('Admin Settlements API', () => {
  let adminToken: string | undefined;
  let providerId: string;
  let settlementId: string;

  beforeEach(async () => {
    // Create an admin user and log in to get a token
    const adminData: CreateUserInput = {
      email: 'admin.settlements.test@example.com',
      fullName: 'Admin Settlements Test',
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

    // Create a provider
    const providerResult = await db('providers')
      .insert({
        name: 'Test Provider',
      })
      .returning('id');
    providerId = providerResult[0].id;

    // Create a settlement
    const settlementResult = await db('settlements')
      .insert({
        provider_id: providerId,
        settlement_date: new Date(),
        amount: 1000,
        fees: 10,
        reference: 'test-settlement',
      })
      .returning('id');
    settlementId = settlementResult[0].id;
  });

  afterEach(async () => {
    await db('settlements').del();
    await db('providers').del();
    await db('users')
      .where('email', 'like', '%.settlements.test@example.com')
      .del();
  });

  describe('GET /api/v1/admin/settlements', () => {
    it('should get all settlements', async () => {
      const response = await request(app)
        .get('/api/v1/admin/settlements')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.settlements).toBeInstanceOf(Array);
      expect(response.body.data.settlements.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/admin/settlements/:settlementId', () => {
    it('should get a settlement by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/settlements/${settlementId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(settlementId);
    });
  });

  describe('POST /api/v1/admin/settlements', () => {
    it('should create a new settlement', async () => {
      const newSettlement = {
        providerId,
        settlementDate: new Date(),
        amount: 2000,
        fees: 20,
        reference: 'new-settlement',
      };

      const response = await request(app)
        .post('/api/v1/admin/settlements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newSettlement)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.amount).toBe(2000);
    });
  });
});
