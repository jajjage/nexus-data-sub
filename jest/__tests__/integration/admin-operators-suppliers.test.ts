import request from 'supertest';
import app from '../../../src/app';
import db from '../../../src/database/connection';
import { CreateUserInput, UserModel } from '../../../src/models/User';
import { getCookie } from '../../test-helpers';

describe('Admin Operators and Suppliers API', () => {
  let adminToken: string | undefined;
  let operatorId: string;
  let supplierId: string;

  beforeEach(async () => {
    // Create an admin user and log in to get a token
    const adminData: CreateUserInput = {
      email: 'admin.ops.test@example.com',
      fullName: 'Admin Ops Test',
      phoneNumber: `123456${Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0')}`,
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

    // Create an operator
    const [operator] = await db('operators')
      .insert({
        code: 'TESTOP',
        name: 'Test Operator',
      })
      .returning('id');
    operatorId = operator.id;

    // Create a supplier
    const [supplier] = await db('suppliers')
      .insert({
        name: 'Test Supplier',
        slug: 'test-supplier',
      })
      .returning('id');
    supplierId = supplier.id;
  });

  afterEach(async () => {
    await db('operators').where({ id: operatorId }).del();
    await db('suppliers').where({ id: supplierId }).del();
    await db('users').where('email', 'like', '%.ops.test@example.com').del();
  });

  // Operator tests
  describe('GET /api/v1/admin/operators', () => {
    it('should get all operators', async () => {
      const response = await request(app)
        .get('/api/v1/admin/operators')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.operators).toBeInstanceOf(Array);
      expect(response.body.data.operators.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/admin/operators/:operatorId', () => {
    it('should get an operator by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/operators/${operatorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(operatorId);
    });
  });

  describe('POST /api/v1/admin/operators', () => {
    it('should create a new operator', async () => {
      const newOperator = {
        code: 'NEWOP',
        name: 'New Operator',
      };

      const response = await request(app)
        .post('/api/v1/admin/operators')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newOperator)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.code).toBe('NEWOP');
    });
  });

  describe('PUT /api/v1/admin/operators/:operatorId', () => {
    it('should update an operator', async () => {
      const updateData = {
        name: 'Updated Operator',
      };

      const response = await request(app)
        .put(`/api/v1/admin/operators/${operatorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Operator');
    });
  });

  // Supplier tests
  describe('GET /api/v1/admin/suppliers', () => {
    it('should get all suppliers', async () => {
      const response = await request(app)
        .get('/api/v1/admin/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.suppliers).toBeInstanceOf(Array);
      expect(response.body.data.suppliers.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/admin/suppliers/:supplierId', () => {
    it('should get a supplier by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(supplierId);
    });
  });

  describe('POST /api/v1/admin/suppliers', () => {
    it('should create a new supplier', async () => {
      const newSupplier = {
        name: 'New Supplier',
        slug: 'new-supplier',
      };

      const response = await request(app)
        .post('/api/v1/admin/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newSupplier)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.slug).toBe('new-supplier');
    });
  });

  describe('PUT /api/v1/admin/suppliers/:supplierId', () => {
    it('should update a supplier', async () => {
      const updateData = {
        name: 'Updated Supplier',
      };

      const response = await request(app)
        .put(`/api/v1/admin/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Supplier');
    });
  });
});
