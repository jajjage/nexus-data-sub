import request from 'supertest';
import app from '../../../src/app';
import db from '../../../src/database/connection';
import { CreateUserInput, UserModel } from '../../../src/models/User';
import { getCookie } from '../../test-helpers';

describe('Admin User Management API', () => {
  let adminToken: string | undefined;
  let userToken: string | undefined;
  let userUserId: string;

  beforeEach(async () => {
    // Create an admin user and log in to get a token
    const adminData: CreateUserInput = {
      email: 'admin.user.test@example.com',
      fullName: 'Admin User Test',
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

    // Create a user user and log in to get a token
    const userData: CreateUserInput = {
      email: 'user.user.test@example.com',
      fullName: 'User User Test',
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
      balance: 0,
    });

    const userLoginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: userData.email, password: userData.password });
    userToken = getCookie(userLoginResponse, 'accessToken');
    expect(userToken).toBeDefined();
  });

  afterEach(async () => {
    await db('wallets').del();
    await db('users').where('email', 'like', '%.user.test@example.com').del();
  });

  describe('GET /api/v1/admin/users/:userId', () => {
    it('should get a user by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/users/${userUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe(userUserId);
      expect(response.body.data.email).toBe('user.user.test@example.com');
    });

    it('should return 404 if user does not exist', async () => {
      await request(app)
        .get('/api/v1/admin/users/bd043a18-09d1-4ff5-a699-f593bab7ce1f')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 403 when not authenticated as admin', async () => {
      await request(app)
        .get(`/api/v1/admin/users/${userUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('PUT /api/v1/admin/users/:userId', () => {
    it('should update a user', async () => {
      const updateData = {
        fullName: 'Updated User Name',
        phoneNumber: '1112223333',
      };

      const response = await request(app)
        .put(`/api/v1/admin/users/${userUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe(userUserId);
      expect(response.body.data.fullName).toBe('Updated User Name');
      expect(response.body.data.phoneNumber).toBe('1112223333');
    });

    it('should return 403 when not authenticated as admin', async () => {
      const updateData = {
        fullName: 'Unauthorized Update',
      };

      await request(app)
        .put(`/api/v1/admin/users/${userUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(403);
    });
  });

  describe('POST /api/v1/admin/users/:userId/suspend', () => {
    it('should suspend a user', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/users/${userUserId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User suspended successfully');

      const user = await UserModel.findById(userUserId);
      expect(user?.isSuspended).toBe(true);
    });
  });

  describe('POST /api/v1/admin/users/:userId/unsuspend', () => {
    it('should unsuspend a user', async () => {
      await db('users')
        .where({ id: userUserId })
        .update({ is_suspended: true });

      const response = await request(app)
        .post(`/api/v1/admin/users/${userUserId}/unsuspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User unsuspended successfully');

      const user = await UserModel.findById(userUserId);
      expect(user?.isSuspended).toBe(false);
    });
  });

  describe('POST /api/v1/admin/users/:userId/credit', () => {
    it('should credit a user wallet', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/users/${userUserId}/credit`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount: 1000 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Wallet credited successfully');
    });
  });

  describe('POST /api/v1/admin/users/:userId/debit', () => {
    it('should debit a user wallet', async () => {
      await request(app)
        .post(`/api/v1/admin/users/${userUserId}/credit`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount: 1000 });

      const response = await request(app)
        .post(`/api/v1/admin/users/${userUserId}/debit`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount: 500 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Wallet debited successfully');
    });
  });
});
