/* eslint-disable @typescript-eslint/no-unused-vars */
import { Knex } from 'knex';
import db from '../../../../src/database/connection';
import { OperatorProductModel } from '../../../../src/models/OperatorProduct';
import { SupplierProductMappingModel } from '../../../../src/models/SupplierProductMapping';
import {
  OperatorProduct,
  SupplierProductMapping,
} from '../../../../src/types/product.types';

describe('SupplierProductMappingModel', () => {
  let trx: Knex.Transaction;
  let testOperatorProduct: OperatorProduct;
  let testMapping: SupplierProductMapping;
  let testSupplierId: string;
  let testOperatorId: string;

  // Start a transaction before each test
  beforeEach(async () => {
    trx = await db.transaction();

    // Create a test operator within this transaction
    const [operator] = await trx('operators')
      .insert({
        code: 'TEST',
        name: 'Test Operator',
        iso_country: 'NG',
      })
      .returning('id');

    testOperatorId = operator.id;

    // Create a test supplier within this transaction
    const [supplier] = await trx('suppliers')
      .insert({
        name: 'Test Supplier',
        slug: 'test-supplier',
        api_base: 'https://api.test.com',
        api_key: 'test-key',
      })
      .returning('id');

    testSupplierId = supplier.id;

    // Create a test operator product within this transaction
    testOperatorProduct = await OperatorProductModel.create(
      {
        operatorId: testOperatorId,
        productCode: 'TEST-1GB',
        name: 'Test 1GB Bundle',
        productType: 'data',
        dataMb: 1024,
        validityDays: 30,
      },
      trx
    );
  });

  // Rollback the transaction after each test
  afterEach(async () => {
    await trx.rollback();
  });

  describe('create', () => {
    it('should create a new supplier product mapping', async () => {
      const mappingData = {
        supplierId: testSupplierId,
        operatorProductId: testOperatorProduct.id,
        supplierProductCode: 'SUP-TEST-1GB',
        supplierPrice: 1000,
        minOrderAmount: 500,
        maxOrderAmount: 2000,
        leadTimeSeconds: 60,
        isActive: true,
      };

      const result = await SupplierProductMappingModel.create(mappingData, trx);

      expect(result).toHaveProperty('id');
      expect(result.supplierId).toBe(testSupplierId);
      expect(result.operatorProductId).toBe(testOperatorProduct.id);
      expect(result.supplierProductCode).toBe('SUP-TEST-1GB');
      expect(parseFloat(result.supplierPrice as any)).toBe(1000);
      expect(parseFloat(result.minOrderAmount as any)).toBe(500);
      expect(parseFloat(result.maxOrderAmount as any)).toBe(2000);
      expect(result.leadTimeSeconds).toBe(60);
      expect(result.isActive).toBe(true);
      expect(result.createdAt).toBeInstanceOf(Date);

      testMapping = result;
    });
  });

  describe('findById', () => {
    it('should find a supplier product mapping by ID', async () => {
      if (!testMapping) {
        throw new Error('Test mapping not created');
      }

      // Create the mapping first within the same transaction
      const mappingData = {
        supplierId: testSupplierId,
        operatorProductId: testOperatorProduct.id,
        supplierProductCode: 'SUP-TEST-FIND-1GB',
        supplierPrice: 1200,
        minOrderAmount: 500,
        maxOrderAmount: 2000,
        leadTimeSeconds: 60,
        isActive: true,
      };

      const createdMapping = await SupplierProductMappingModel.create(
        mappingData,
        trx
      );

      const result = await SupplierProductMappingModel.findById(
        createdMapping.id,
        trx
      );

      expect(result).not.toBeNull();
      expect(result!.id).toBe(createdMapping.id);
      expect(result!.supplierId).toBe(testSupplierId);
      expect(result!.operatorProductId).toBe(testOperatorProduct.id);
    });

    it('should return null if supplier product mapping does not exist', async () => {
      const result = await SupplierProductMappingModel.findById(
        'bd043a18-09d1-4ff5-a699-f593bab7ce1f',
        trx
      );

      expect(result).toBeNull();
    });
  });

  describe('findByOperatorProduct', () => {
    it('should find supplier product mappings by operator product ID', async () => {
      // Create a mapping to ensure data exists
      const mappingData = {
        supplierId: testSupplierId,
        operatorProductId: testOperatorProduct.id,
        supplierProductCode: 'SUP-TEST-OP-1GB',
        supplierPrice: 1300,
        minOrderAmount: 500,
        maxOrderAmount: 2000,
        leadTimeSeconds: 60,
        isActive: true,
      };

      await SupplierProductMappingModel.create(mappingData, trx);

      const results = await SupplierProductMappingModel.findByOperatorProduct(
        testOperatorProduct.id,
        trx
      );

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
      expect(
        results.some(m => m.operatorProductId === testOperatorProduct.id)
      ).toBe(true);
    });
  });

  describe('findAll', () => {
    it('should find all supplier product mappings', async () => {
      // Create a mapping to ensure data exists
      const mappingData = {
        supplierId: testSupplierId,
        operatorProductId: testOperatorProduct.id,
        supplierProductCode: 'SUP-TEST-ALL-1GB',
        supplierPrice: 1400,
        minOrderAmount: 500,
        maxOrderAmount: 2000,
        leadTimeSeconds: 60,
        isActive: true,
      };

      const createdMapping = await SupplierProductMappingModel.create(
        mappingData,
        trx
      );

      const results = await SupplierProductMappingModel.findAll(
        undefined,
        undefined,
        trx
      );

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(m => m.id === createdMapping.id)).toBe(true);
    });

    it('should find supplier product mappings by supplier ID', async () => {
      // Create a mapping to ensure data exists
      const mappingData = {
        supplierId: testSupplierId,
        operatorProductId: testOperatorProduct.id,
        supplierProductCode: 'SUP-TEST-SUP-1GB',
        supplierPrice: 1500,
        minOrderAmount: 500,
        maxOrderAmount: 2000,
        leadTimeSeconds: 60,
        isActive: true,
      };

      const createdMapping = await SupplierProductMappingModel.create(
        mappingData,
        trx
      );

      const results = await SupplierProductMappingModel.findAll(
        testSupplierId,
        undefined,
        trx
      );

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some(m => m.supplierId === testSupplierId)).toBe(true);
    });

    it('should find supplier product mappings by both supplier and operator product ID', async () => {
      // Create a mapping to ensure data exists
      const mappingData = {
        supplierId: testSupplierId,
        operatorProductId: testOperatorProduct.id,
        supplierProductCode: 'SUP-TEST-BOTH-1GB',
        supplierPrice: 1600,
        minOrderAmount: 500,
        maxOrderAmount: 2000,
        leadTimeSeconds: 60,
        isActive: true,
      };

      const createdMapping = await SupplierProductMappingModel.create(
        mappingData,
        trx
      );

      const results = await SupplierProductMappingModel.findAll(
        testSupplierId,
        testOperatorProduct.id,
        trx
      );

      expect(results).toBeInstanceOf(Array);
      expect(
        results.some(
          m =>
            m.supplierId === testSupplierId &&
            m.operatorProductId === testOperatorProduct.id
        )
      ).toBe(true);
    });
  });

  describe('update', () => {
    it('should update a supplier product mapping', async () => {
      // First create a mapping to update
      const mappingData = {
        supplierId: testSupplierId,
        operatorProductId: testOperatorProduct.id,
        supplierProductCode: 'SUP-TEST-UPD-1GB',
        supplierPrice: 1700,
        minOrderAmount: 500,
        maxOrderAmount: 2000,
        leadTimeSeconds: 60,
        isActive: true,
      };

      const createdMapping = await SupplierProductMappingModel.create(
        mappingData,
        trx
      );

      const updatedData = {
        supplierProductCode: 'SUP-TEST-1GB-UPD',
        supplierPrice: 1100,
        minOrderAmount: 600,
        isActive: false,
      };

      const result = await SupplierProductMappingModel.update(
        createdMapping.id,
        updatedData,
        trx
      );

      expect(result.id).toBe(createdMapping.id);
      expect(result.supplierProductCode).toBe('SUP-TEST-1GB-UPD');
      expect(parseFloat(result.supplierPrice as any)).toBe(1100);
      expect(parseFloat(result.minOrderAmount as any)).toBe(600);
      expect(result.isActive).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete a supplier product mapping', async () => {
      // First create a mapping to delete
      const mappingData = {
        supplierId: testSupplierId,
        operatorProductId: testOperatorProduct.id,
        supplierProductCode: 'SUP-TEST-DEL-1GB',
        supplierPrice: 1800,
        minOrderAmount: 500,
        maxOrderAmount: 2000,
        leadTimeSeconds: 60,
        isActive: true,
      };

      const createdMapping = await SupplierProductMappingModel.create(
        mappingData,
        trx
      );

      const result = await SupplierProductMappingModel.delete(
        createdMapping.id,
        trx
      );

      expect(result).toBe(true);

      // Verify it's gone
      const found = await SupplierProductMappingModel.findById(
        createdMapping.id,
        trx
      );
      expect(found).toBeNull();
    });
  });
});
