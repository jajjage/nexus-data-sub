import request from 'supertest';
import app from '../../../src/app';
import db from '../../../src/database/connection';
import { CreateUserInput, UserModel } from '../../../src/models/User';
import { getCookie } from '../../test-helpers';

describe('Admin API', () => {
  let adminToken: string | undefined;
  let userToken: string | undefined;
  let userUserId: string;
  let staffRoleId: string;

  beforeEach(async () => {
    // Create an admin user and log in to get a token
    const adminData: CreateUserInput = {
      email: 'admin.test@example.com',
      fullName: 'Admin Test',
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
    // Fail fast if login didn't return a cookie token — prevents sending 'Bearer undefined'
    if (!adminToken) {
      // Diagnostic info to help debug why cookie wasn't set
      console.error('ADMIN LOGIN RESPONSE STATUS:', adminLoginResponse.status);
      console.error('ADMIN LOGIN RESPONSE BODY:', adminLoginResponse.body);
      console.error(
        'ADMIN LOGIN SET-COOKIE:',
        adminLoginResponse.headers && adminLoginResponse.headers['set-cookie']
      );
    }

    expect(adminToken).toBeDefined();

    // Create a user user and log in to get a token
    const userData: CreateUserInput = {
      email: 'user.test@example.com',
      fullName: 'User Test',
      phoneNumber: '0987654321',
      password: 'Password123!',
      role: 'user',
    };
    const user = await UserModel.create(userData);
    await db('users').where({ id: user.userId }).update({ is_verified: true });
    userUserId = user.userId;
    const userLoginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: userData.email, password: userData.password });
    userToken = getCookie(userLoginResponse, 'accessToken');
    if (!userToken) {
      // console.error(
      //   'user LOGIN RESPONSE STATUS:',
      //   userLoginResponse.status
      // );
      // console.error(
      //   'user LOGIN RESPONSE BODY:',
      //   userLoginResponse.body
      // );
      // console.error(
      //   'user LOGIN SET-COOKIE:',
      //   userLoginResponse.headers &&
      //     userLoginResponse.headers['set-cookie']
      // );
    }
    expect(userToken).toBeDefined();

    // Get the staff role ID for assignment tests
    const staffRole = await db('roles').where({ name: 'staff' }).first();
    staffRoleId = staffRole.id;
  });

  afterEach(async () => {
    await db('users').where('email', 'like', '%.test@example.com').del();
  });

  describe('POST /api/v1/admin/users', () => {
    it('should create a new user with the specified role', async () => {
      const newUser = {
        email: 'new.user@example.com',
        password: 'Password123!',
        fullName: 'New User',
        phoneNumber: '1112223333',
        role: 'staff',
      };

      const response = await request(app)
        .post('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(newUser.email);
    });
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
        .set('Authorization', `Bearer ${userToken}`)
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
        .send({ userId: userUserId, roleId: staffRoleId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Role assigned successfully');
    });
  });

  describe('GET /api/v1/admin/users/:userId/get-sessions', () => {
    it('should get user sessions', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/users/${userUserId}/get-sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sessions).toBeInstanceOf(Array);
    });
  });

  describe('DELETE /api/v1/admin/users/:userId/delete-sessions', () => {
    it('should revoke user sessions', async () => {
      const response = await request(app)
        .delete(`/api/v1/admin/users/${userUserId}/delete-sessions`)
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
        .where({ id: userUserId })
        .update({ two_factor_enabled: true, two_factor_secret: 'testsecret' });

      const response = await request(app)
        .post(`/api/v1/admin/users/${userUserId}/disable-2fa`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('2FA disabled successfully for user');

      const user = await UserModel.findById(userUserId);
      expect(user?.twoFactorEnabled).toBe(false);
    });
  });
});
