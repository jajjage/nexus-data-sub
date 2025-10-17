import request from 'supertest';
import app from '../../../src/app';
import db from '../../../src/database/connection';
import { CreateUserInput, UserModel } from '../../../src/models/User';
import { getCookie } from '../../test-helpers';

describe('Auth Password API', () => {
  let authToken: string;
  let userId: string;
  const userData: CreateUserInput = {
    email: 'test-password@example.com',
    fullName: 'Test Password',
    phoneNumber: '1234567890',
    password: 'Password123!',
    role: 'user',
  };

  beforeEach(async () => {
    // Create a verified user
    const user = await UserModel.create(userData);
    await db('users').where({ id: user.userId }).update({ is_verified: true });
    userId = user.userId;

    // Login to get a valid token
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: userData.email, password: userData.password });

    const accessToken = getCookie(response, 'accessToken');
    if (accessToken) {
      authToken = accessToken;
    }
  });

  afterEach(async () => {
    await db('users').where({ email: userData.email }).del();
  });

  describe('POST /api/v1/password/forgot-password', () => {
    it('should return a success message for a valid email', async () => {
      const response = await request(app)
        .post('/api/v1/password/forgot-password')
        .send({ email: userData.email })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        'If a user with that email exists, a password reset link has been sent.'
      );
    });
  });

  describe('POST /api/v1/password/reset-password', () => {
    it('should reset the password with a valid token', async () => {
      const token = await UserModel.generatePasswordResetToken(userId);
      const response = await request(app)
        .post('/api/v1/password/reset-password')
        .send({ token, password: 'NewPassword123!' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        'Password has been reset successfully.'
      );
    });

    it('should fail with an invalid token', async () => {
      const response = await request(app)
        .post('/api/v1/password/reset-password')
        .send({ token: 'invalid-token', password: 'NewPassword123!' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        'Invalid or expired password reset token'
      );
    });
  });

  describe('POST /api/v1/password/update-password', () => {
    it('should update the password with a valid old password', async () => {
      const response = await request(app)
        .post('/api/v1/password/update-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ oldPassword: 'Password123!', newPassword: 'NewPassword123!' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password updated successfully.');
    });

    it('should fail with an incorrect old password', async () => {
      const response = await request(app)
        .post('/api/v1/password/update-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ oldPassword: 'WrongPassword!', newPassword: 'NewPassword123!' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Incorrect old password');
    });
  });
});
