import request from 'supertest';
import app from '../../../src/app';
import db from '../../../src/database/connection';

describe('Public Products API', () => {
  beforeAll(async () => {
    // Ensure clean state for related tables
    await db('supplier_product_mapping').del();
    await db('operator_products').del();
    await db('suppliers').del();
    await db('operators').del();
  });

  afterAll(async () => {
    // Clean up created data
    await db('supplier_product_mapping').del();
    await db('operator_products').del();
    await db('suppliers').del();
    await db('operators').del();
  });

  it('returns operator products with pagination and slug', async () => {
    // Create operator
    const operatorRows = await db('operators')
      .insert({ code: 'TST', name: 'Test Operator' })
      .returning('id');
    const operatorId = operatorRows[0]?.id || operatorRows[0];

    // Create supplier
    const supplierRows = await db('suppliers')
      .insert({ name: 'Test Supplier', slug: 'test-supplier' })
      .returning('id');
    const supplierId = supplierRows[0]?.id || supplierRows[0];

    // Create operator product with slug
    const productRows = await db('operator_products')
      .insert({
        operator_id: operatorId,
        product_code: 'TST-DATA-1GB',
        name: 'Test 1GB',
        product_type: 'data',
        denom_amount: 100,
        data_mb: 1024,
        validity_days: 30,
        slug: 'test-supplier',
      })
      .returning('id');
    const productId = productRows[0]?.id || productRows[0];

    // Create supplier mapping
    await db('supplier_product_mapping').insert({
      supplier_id: supplierId,
      operator_product_id: productId,
      supplier_product_code: 'SUP-TST-1GB',
      supplier_price: 80,
    });

    const res = await request(app).get('/api/v1/products').expect(200);

    expect(res.body.success).toBe(true);
    const { products, pagination } = res.body.data;
    expect(Array.isArray(products)).toBe(true);
    expect(products.length).toBeGreaterThan(0);

    const p = products.find((x: any) => x.productCode === 'TST-DATA-1GB');
    expect(p).toBeDefined();
    expect(p.slug).toBe('test-supplier');
    expect(p.denomAmount).toBeDefined();
    expect(p.productType).toBe('data');

    expect(pagination).toHaveProperty('page');
    expect(pagination).toHaveProperty('perPage');
    expect(pagination).toHaveProperty('total');
  });
});
