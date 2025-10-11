import request from 'supertest';
import app from '../../../src/app';
import db from '../../../src/database/connection';
import { CreateUserInput, UserModel } from '../../../src/models/User';
import { getCookie } from '../../test-helpers';

describe('Admin API', () => {
  let adminToken: string | undefined;
  let reporterToken: string | undefined;
  let reporterUserId: string;
  let staffRoleId: string;

  beforeEach(async () => {
    // Create an admin user and log in to get a token
    const adminData: CreateUserInput = {
      email: 'admin.test@example.com',
      password: 'Password123!',
      role: 'admin',
    };
    const admin = await UserModel.create(adminData);
    await db('users').where({ id: admin.userId }).update({ is_verified: true });
    const adminLoginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send(adminData);
    adminToken = getCookie(adminLoginResponse, 'accessToken');
    // Fail fast if login didn't return a cookie token — prevents sending 'Bearer undefined'
    if (!adminToken) {
      // Diagnostic info to help debug why cookie wasn't set
      // console.error('ADMIN LOGIN RESPONSE STATUS:', adminLoginResponse.status);
      // console.error('ADMIN LOGIN RESPONSE BODY:', adminLoginResponse.body);
      // console.error(
      //   'ADMIN LOGIN SET-COOKIE:',
      //   adminLoginResponse.headers && adminLoginResponse.headers['set-cookie']
      // );
    }
    expect(adminToken).toBeDefined();

    // Create a reporter user and log in to get a token
    const reporterData: CreateUserInput = {
      email: 'reporter.test@example.com',
      password: 'Password123!',
      role: 'reporter',
    };
    const reporter = await UserModel.create(reporterData);
    await db('users')
      .where({ id: reporter.userId })
      .update({ is_verified: true });
    reporterUserId = reporter.userId;
    const reporterLoginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send(reporterData);
    reporterToken = getCookie(reporterLoginResponse, 'accessToken');
    if (!reporterToken) {
      // console.error(
      //   'REPORTER LOGIN RESPONSE STATUS:',
      //   reporterLoginResponse.status
      // );
      // console.error(
      //   'REPORTER LOGIN RESPONSE BODY:',
      //   reporterLoginResponse.body
      // );
      // console.error(
      //   'REPORTER LOGIN SET-COOKIE:',
      //   reporterLoginResponse.headers &&
      //     reporterLoginResponse.headers['set-cookie']
      // );
    }
    expect(reporterToken).toBeDefined();

    // Get the staff role ID for assignment tests
    const staffRole = await db('roles').where({ name: 'staff' }).first();
    staffRoleId = staffRole.id;
  });

  afterEach(async () => {
    await db('users').where('email', 'like', '%.test@example.com').del();
  });

  describe('GET /api/v1/admin/roles', () => {
    it('should get all roles when authenticated as admin', async () => {
      const response = await request(app)
        .get('/api/v1/admin/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.roles).toBeInstanceOf(Array);
      expect(response.body.data.roles.length).toBeGreaterThan(0);
    });

    it('should return 403 when not authenticated as admin', async () => {
      await request(app)
        .get('/api/v1/admin/roles')
        .set('Authorization', `Bearer ${reporterToken}`)
        .expect(403);
    });
  });

  describe('GET /api/v1/admin/users', () => {
    it('should get all users when authenticated as admin', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeInstanceOf(Array);
      expect(response.body.data.users.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/v1/admin/assign-role', () => {
    it('should assign a role to a user', async () => {
      const response = await request(app)
        .post('/api/v1/admin/assign-role')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: reporterUserId, roleId: staffRoleId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Role assigned successfully');
    });
  });

  describe('GET /api/v1/admin/users/:userId/get-sessions', () => {
    it('should get user sessions', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/users/${reporterUserId}/get-sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sessions).toBeInstanceOf(Array);
    });
  });

  describe('DELETE /api/v1/admin/users/:userId/delete-sessions', () => {
    it('should revoke user sessions', async () => {
      const response = await request(app)
        .delete(`/api/v1/admin/users/${reporterUserId}/delete-sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toMatch(
        /Revoked \d+ active session\(s\) for user/
      );
    });
  });

  describe('POST /api/v1/admin/users/:userId/disable-2fa', () => {
    it('should disable 2fa for a user', async () => {
      await db('users')
        .where({ id: reporterUserId })
        .update({ two_factor_enabled: true, two_factor_secret: 'testsecret' });

      const response = await request(app)
        .post(`/api/v1/admin/users/${reporterUserId}/disable-2fa`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('2FA disabled successfully for user');

      const user = await UserModel.findById(reporterUserId);
      expect(user?.twoFactorEnabled).toBe(false);
    });
  });
});
