import request from 'supertest';
import app from '../../../src/app';
import knex from '../../../src/database/connection';

describe('Virtual Account Integration Tests', () => {
  const testUser = {
    email: 'vatest@example.com',
    password: 'TestPass123!',
    phoneNumber: '+2347012345678',
    fullName: 'VA Test User',
  };

  afterAll(async () => {
    // Clean up test data
    await knex('virtual_accounts').where({ provider: 'palmpay' }).delete();
    await knex('users').where({ email: testUser.email }).delete();
  });

  describe('POST /api/v1/auth/register with VA creation', () => {
    it('should create user and virtual account successfully', async () => {
      // Register user
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');

      // Give background VA creation time to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify virtual account was created
      const virtualAccount = await knex('virtual_accounts')
        .where({
          user_id: response.body.data.id,
          provider: 'palmpay',
        })
        .first();

      expect(virtualAccount).toBeTruthy();
      expect(virtualAccount.account_number).toMatch(/^\d{10}$/); // Check for 10-digit account number
      expect(virtualAccount.provider_va_id).toBeDefined();
    });
  });
});
