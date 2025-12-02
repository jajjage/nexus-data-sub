import request from 'supertest';
import app from '../../../src/app';
import db from '../../../src/database/connection';
import { CreateUserInput, UserModel } from '../../../src/models/User';
import { getCookie } from '../../test-helpers';

describe('Admin Product And Bundle Management API', () => {
  let adminToken: string | undefined;
  let userToken: string | undefined;
  let testOperatorId: string;
  let testSupplierId: string;
  let testProductId: string;
  const timestamp = Date.now();
  const adminEmail = `admin.product.test+${timestamp}@example.com`;
  const userEmail = `user.product.test+${timestamp}@example.com`;

  beforeAll(async () => {
    try {
      // Create a test operator
      const operatorRows = await db('operators')
        .insert({
          code: 'TEST',
          name: 'Test Operator',
          iso_country: 'NG',
        })
        .returning('id');
      // Normalize returning shape: could be [{id: '...'}] or ['...'] depending on PG/Knex
      testOperatorId = operatorRows[0]?.id || operatorRows[0];

      // Create a test supplier
      const supplierRows = await db('suppliers')
        .insert({
          name: 'Test Supplier',
          slug: 'test-supplier',
          api_base: 'https://api.test.com',
          api_key: 'test-key',
        })
        .returning('id');
      testSupplierId = supplierRows[0]?.id || supplierRows[0];

      // Create an admin user and log in to get a token
      const adminData: CreateUserInput = {
        email: adminEmail,
        fullName: 'Product Admin Test',
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
        email: userEmail,
        fullName: 'Product User Test',
        phoneNumber: '0987654321',
        password: 'Password123!',
        role: 'user',
      };
      const user = await UserModel.create(userData);
      await db('users')
        .where({ id: user.userId })
        .update({ is_verified: true });
      const userLoginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: userData.email, password: userData.password });
      userToken = getCookie(userLoginResponse, 'accessToken');

      expect(userToken).toBeDefined();
    } catch (error) {
      console.error('Failed to set up test data:', error);
      throw error;
    }
  });
  afterAll(async () => {
    // Clean up: delete test data in reverse dependency order
    await db('supplier_product_mapping').del();
    await db('operator_products').del();
    await db('suppliers').del();
    await db('operators').del();
    await db('users')
      .where('email', 'like', '%.product.test@example.com')
      .del();
  });

  describe('POST /api/v1/admin/products', () => {
    it('should create a new operator product', async () => {
      const newProduct = {
        operatorId: testOperatorId,
        productCode: 'TEST-1GB',
        name: 'Test 1GB Bundle',
        productType: 'data',
        denomAmount: 1000,
        dataMb: 1024,
        validityDays: 30,
        isActive: true,
        metadata: { test: 'value' },
        slug: 'test-supplier',
      };

      const response = await request(app)
        .post('/api/v1/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newProduct)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.operatorId).toBe(testOperatorId);
      expect(response.body.data.productCode).toBe('TEST-1GB');
      expect(response.body.data.name).toBe('Test 1GB Bundle');
      expect(response.body.data.productType).toBe('data');
      expect(parseFloat(response.body.data.denomAmount as any)).toBe(1000);
      expect(response.body.data.dataMb).toBe(1024);
      expect(response.body.data.validityDays).toBe(30);
      expect(response.body.data.isActive).toBe(true);
      expect(response.body.data.metadata).toEqual({ test: 'value' });

      testProductId = response.body.data.id;

      // Verify product was actually created in DB
      const dbProduct = await db('operator_products')
        .where({ id: testProductId })
        .first();
      console.log('Created product verified in DB:', dbProduct?.product_code);
      expect(dbProduct).toBeDefined();
    });

    it('should create a new operator product with supplier mapping in a single request', async () => {
      const newProductWithMapping = {
        operatorId: testOperatorId,
        productCode: 'TEST-2GB',
        name: 'Test 2GB Bundle',
        productType: 'data',
        denomAmount: 1500,
        dataMb: 2048,
        validityDays: 30,
        slug: 'test-supplier',
        supplierId: testSupplierId,
        supplierProductCode: 'SUP-TEST-2GB',
        supplierPrice: 1400,
        minOrderAmount: 1000,
        maxOrderAmount: 2000,
        leadTimeSeconds: 60,
        mappingIsActive: true,
      };

      const response = await request(app)
        .post('/api/v1/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newProductWithMapping)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('product');
      expect(response.body.data).toHaveProperty('mapping');
      expect(response.body.data.product).toHaveProperty('id');
      expect(response.body.data.product.operatorId).toBe(testOperatorId);
      expect(response.body.data.product.productCode).toBe('TEST-2GB');
      expect(response.body.data.product.name).toBe('Test 2GB Bundle');
      expect(response.body.data.mapping).toHaveProperty('id');
      expect(response.body.data.mapping.supplierId).toBe(testSupplierId);
      expect(response.body.data.mapping.operatorProductId).toBe(
        response.body.data.product.id
      );
      expect(parseFloat(response.body.data.mapping.supplierPrice)).toBe(1400);
    });

    it('should return 400 if required fields are missing', async () => {
      const incompleteProduct = {
        name: 'Incomplete Product',
      };

      await request(app)
        .post('/api/v1/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(incompleteProduct)
        .expect(400);
    });

    it('should return 403 when not authenticated as admin', async () => {
      const newProduct = {
        operatorId: testOperatorId,
        productCode: 'TEST-3GB',
        name: 'Unauthorized Product',
        productType: 'data',
      };

      await request(app)
        .post('/api/v1/admin/products')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newProduct)
        .expect(403);
    });
  });

  describe('GET /api/v1/admin/products', () => {
    it('should get all operator products', async () => {
      // Debug: Check what products exist in the database
      const dbProducts = await db('operator_products').select('*');
      console.log(
        'Products in DB:',
        dbProducts.length,
        dbProducts.map(p => p.product_code)
      );

      const response = await request(app)
        .get('/api/v1/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toBeInstanceOf(Array);
      console.log(
        'Response products:',
        response.body.data.products.length,
        response.body.data.products.map((p: any) => p.productCode)
      );
      expect(response.body.data.products.length).toBeGreaterThanOrEqual(2); // We created at least 2 above
    });

    it('should return 403 when not authenticated as admin', async () => {
      await request(app)
        .get('/api/v1/admin/products')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('GET /api/v1/admin/products/:productId', () => {
    it('should get an operator product by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/products/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testProductId);
      expect(response.body.data.name).toBe('Test 1GB Bundle');
    });

    it('should return 404 if product does not exist', async () => {
      await request(app)
        .get('/api/v1/admin/products/bd043a18-09d1-4ff5-a699-f593bab7ce1f')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 403 when not authenticated as admin', async () => {
      await request(app)
        .get(`/api/v1/admin/products/${testProductId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('PUT /api/v1/admin/products/:productId', () => {
    it('should update an operator product', async () => {
      const updateData = {
        name: 'Updated Test 1GB Bundle',
        denomAmount: 1100,
        isActive: false,
      };

      const response = await request(app)
        .put(`/api/v1/admin/products/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testProductId);
      expect(response.body.data.name).toBe('Updated Test 1GB Bundle');
      expect(parseFloat(response.body.data.denomAmount as any)).toBe(1100);
      expect(response.body.data.isActive).toBe(false);
    });

    it('should return 403 when not authenticated as admin', async () => {
      const updateData = {
        name: 'Unauthorized Update',
      };

      await request(app)
        .put(`/api/v1/admin/products/${testProductId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(403);
    });
  });

  describe('POST /api/v1/admin/products/:productId/map-to-supplier', () => {
    it('should map an operator product to a supplier', async () => {
      const mappingData = {
        supplierId: testSupplierId,
        supplierProductCode: 'SUP-TEST-1GB',
        supplierPrice: 950,
        minOrderAmount: 500,
        maxOrderAmount: 1500,
        leadTimeSeconds: 45,
        isActive: true,
      };

      const response = await request(app)
        .post(`/api/v1/admin/products/${testProductId}/map-to-supplier`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(mappingData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.supplierId).toBe(testSupplierId);
      expect(response.body.data.operatorProductId).toBe(testProductId);
      expect(parseFloat(response.body.data.supplierPrice as any)).toBe(950);
      expect(parseFloat(response.body.data.minOrderAmount as any)).toBe(500);
      expect(parseFloat(response.body.data.maxOrderAmount as any)).toBe(1500);
      expect(response.body.data.leadTimeSeconds).toBe(45);
      expect(response.body.data.isActive).toBe(true);
    });

    it('should return 400 if required fields are missing', async () => {
      const incompleteMapping = {
        supplierProductCode: 'SUP-TEST-1GB',
        // Missing supplierId and supplierPrice
      };

      await request(app)
        .post(`/api/v1/admin/products/${testProductId}/map-to-supplier`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(incompleteMapping)
        .expect(400);
    });

    it('should return 403 when not authenticated as admin', async () => {
      const mappingData = {
        supplierId: testSupplierId,
        supplierPrice: 950,
      };

      await request(app)
        .post(`/api/v1/admin/products/${testProductId}/map-to-supplier`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(mappingData)
        .expect(403);
    });
  });
});
