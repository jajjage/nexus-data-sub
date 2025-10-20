import { Express } from 'express';
import request from 'supertest';
import db from '../../../src/database/connection';
import { generateTestUsers, getCookie } from '../../test-helpers';

describe('User Controller Integration Tests', () => {
  let app: Express;
  let testUser: any;
  let authCookie: any;

  beforeAll(async () => {
    app = (await import('../../../src/app')).default;
    const { user } = await generateTestUsers();
    testUser = user;

    const response = await request(app).post('/api/v1/auth/login').send({
      email: testUser.email,
      password: 'Password123!',
    });
    authCookie = getCookie(response, 'accessToken');
  });

  describe('GET /api/v1/user/profile/me', () => {
    it('should return the authenticated user profile', async () => {
      const response = await request(app)
        .get('/api/v1/user/profile/me')
        .set('Cookie', [`accessToken=${authCookie}`]);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        email: testUser.email,
      });
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/v1/user/profile/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/user/profile/me', () => {
    it('should update the user profile successfully', async () => {
      const updatedName = 'Updated User Name';
      const response = await request(app)
        .put('/api/v1/user/profile/me')
        .set('Cookie', [`accessToken=${authCookie}`])
        .send({
          fullName: updatedName,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.fullName).toBe(updatedName);

      // Verify the change in the database
      const updatedUser = await db('users')
        .where({ id: testUser.userId })
        .first();
      expect(updatedUser.full_name).toBe(updatedName);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).put('/api/v1/user/profile/me').send({
        fullName: 'New Name',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/user/profile/pin', () => {
    it('should set transaction PIN successfully', async () => {
      const response = await request(app)
        .put('/api/v1/user/profile/pin')
        .set('Cookie', [`accessToken=${authCookie}`])
        .send({
          pin: '1234',
          currentPassword: 'Password123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).put('/api/v1/user/profile/pin').send({
        pin: '1234',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/user/wallet/transactions', () => {
    it('should return user transactions with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/user/wallet/transactions')
        .set('Cookie', [`accessToken=${authCookie}`])
        .query({
          page: 1,
          limit: 10,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination).toHaveProperty('total');
    });

    it('should filter transactions by direction', async () => {
      const response = await request(app)
        .get('/api/v1/user/wallet/transactions')
        .set('Cookie', [`accessToken=${authCookie}`])
        .query({
          direction: 'credit',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.transactions)).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get(
        '/api/v1/user/wallet/transactions'
      );

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/user/purchases', () => {
    it('should return user purchases with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/user/purchases')
        .set('Cookie', [`accessToken=${authCookie}`])
        .query({
          page: 1,
          limit: 10,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.requests)).toBe(true);
      expect(response.body.data.pagination).toHaveProperty('total');
    });

    it('should filter purchases by status', async () => {
      const response = await request(app)
        .get('/api/v1/user/purchases')
        .set('Cookie', [`accessToken=${authCookie}`])
        .query({
          status: 'success',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.requests)).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/v1/user/purchases');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
