import request from 'supertest';
import app from '../../../src/app';
import db from '../../../src/database/connection';
import { CreateUserInput, UserModel } from '../../../src/models/User';
import { getCookie } from '../../test-helpers';

describe('Admin Miscellaneous API', () => {
  let adminToken: string | undefined;

  beforeEach(async () => {
    // Create an admin user and log in to get a token
    const adminData: CreateUserInput = {
      email: 'admin.misc.test@example.com',
      fullName: 'Admin Misc Test',
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
  });

  afterEach(async () => {
    await db('users').where('email', 'like', '%.misc.test@example.com').del();
  });

  describe('GET /api/v1/admin/dashboard/stats', () => {
    it('should get dashboard stats', async () => {
      const response = await request(app)
        .get('/api/v1/admin/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Object);
    });
  });

  describe('GET /api/v1/admin/dashboard/failed-jobs', () => {
    it('should get failed jobs', async () => {
      const response = await request(app)
        .get('/api/v1/admin/dashboard/failed-jobs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.jobs).toBeInstanceOf(Array);
    });
  });
});
