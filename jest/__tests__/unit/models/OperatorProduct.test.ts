import db from '../../../../src/database/connection';
import { OperatorProductModel } from '../../../../src/models/OperatorProduct';
import { OperatorProduct } from '../../../../src/types/product.types';

describe('OperatorProductModel', () => {
  let testOperatorId: string;
  let testOperatorProduct: OperatorProduct;

  beforeAll(async () => {
    // Create a test operator first
    const [operator] = await db('operators')
      .insert({
        code: 'TEST',
        name: 'Test Operator',
        iso_country: 'NG',
      })
      .returning('id');

    testOperatorId = operator.id;
  });

  afterAll(async () => {
    // Clean up: delete test data
    await db('operator_products').where('operator_id', testOperatorId).del();
    await db('operators').where('id', testOperatorId).del();
  });

  describe('create', () => {
    it('should create a new operator product', async () => {
      const productData = {
        operatorId: testOperatorId,
        productCode: 'TEST-1GB',
        name: 'Test 1GB Bundle',
        productType: 'data',
        denomAmount: 1000,
        dataMb: 1024,
        validityDays: 30,
        isActive: true,
        metadata: { test: 'value' },
      };

      const result = await OperatorProductModel.create(productData);

      expect(result).toHaveProperty('id');
      expect(result.operatorId).toBe(testOperatorId);
      expect(result.productCode).toBe('TEST-1GB');
      expect(result.name).toBe('Test 1GB Bundle');
      expect(result.productType).toBe('data');
      expect(parseFloat(result.denomAmount as any)).toBe(1000);
      expect(result.dataMb).toBe(1024);
      expect(result.validityDays).toBe(30);
      expect(result.isActive).toBe(true);
      expect(result.metadata).toEqual({ test: 'value' });
      expect(result.createdAt).toBeInstanceOf(Date);

      testOperatorProduct = result;
    });
  });

  describe('findById', () => {
    it('should find an operator product by ID', async () => {
      if (!testOperatorProduct) {
        throw new Error('Test product not created');
      }

      const result = await OperatorProductModel.findById(
        testOperatorProduct.id
      );

      expect(result).not.toBeNull();
      expect(result!.id).toBe(testOperatorProduct.id);
      expect(result!.name).toBe(testOperatorProduct.name);
    });

    it('should return null if operator product does not exist', async () => {
      const result = await OperatorProductModel.findById(
        'bd043a18-09d1-4ff5-a699-f593bab7ce1f'
      );

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should find all operator products', async () => {
      const results = await OperatorProductModel.findAll();

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(p => p.id === testOperatorProduct.id)).toBe(true);
    });

    it('should find operator products by operator ID', async () => {
      if (!testOperatorProduct) {
        throw new Error('Test product not created');
      }

      const results = await OperatorProductModel.findAll(testOperatorId);

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(p => p.operatorId === testOperatorId)).toBe(true);
    });
  });

  describe('update', () => {
    it('should update an operator product', async () => {
      if (!testOperatorProduct) {
        throw new Error('Test product not created');
      }

      const updatedData = {
        name: 'Updated Test 1GB Bundle',
        productCode: 'TEST-1GB-UPD',
        denomAmount: 1200,
      };

      const result = await OperatorProductModel.update(
        testOperatorProduct.id,
        updatedData
      );

      expect(result.id).toBe(testOperatorProduct.id);
      expect(result.name).toBe('Updated Test 1GB Bundle');
      expect(result.productCode).toBe('TEST-1GB-UPD');
      expect(parseFloat(result.denomAmount as any)).toBe(1200);
    });
  });

  describe('delete', () => {
    it('should delete an operator product', async () => {
      if (!testOperatorProduct) {
        throw new Error('Test product not created');
      }

      const result = await OperatorProductModel.delete(testOperatorProduct.id);

      expect(result).toBe(true);

      // Verify it's gone
      const found = await OperatorProductModel.findById(testOperatorProduct.id);
      expect(found).toBeNull();
    });
  });
});
