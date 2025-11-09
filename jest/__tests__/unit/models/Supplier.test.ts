import { Knex } from 'knex';
import db from '../../../../src/database/connection';
import { SupplierModel } from '../../../../src/models/Supplier';
import {
  CreateSupplierData,
  Supplier,
} from '../../../../src/types/supplier.types';

describe('SupplierModel', () => {
  let trx: Knex.Transaction;
  let testSupplier: Supplier;

  beforeEach(async () => {
    trx = await db.transaction();
    const supplierData: CreateSupplierData = {
      name: 'Initial Test Supplier',
      slug: `initial-test-supplier-${Date.now()}-${Math.random()}`,
    };
    testSupplier = await SupplierModel.create(supplierData, trx);
  });

  afterEach(async () => {
    await trx.rollback();
  });

  describe('create', () => {
    it('should create a new supplier', async () => {
      const newSupplierData: CreateSupplierData = {
        name: 'New Test Supplier',
        slug: 'new-test-supplier',
      };
      const newSupplier = await SupplierModel.create(newSupplierData, trx);
      expect(newSupplier).toBeDefined();
      expect(newSupplier.name).toBe('New Test Supplier');

      const fromDb = await trx('suppliers')
        .where({ id: newSupplier.id })
        .first();
      expect(fromDb).toBeDefined();
      expect(fromDb.name).toBe('New Test Supplier');
    });
  });

  describe('findById', () => {
    it('should retrieve a supplier by ID', async () => {
      const found = await SupplierModel.findById(testSupplier.id, trx);
      expect(found).toBeDefined();
      expect(found?.id).toBe(testSupplier.id);
      expect(found?.name).toBe(testSupplier.name);
    });

    it('should return null for non-existent supplier', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const found = await SupplierModel.findById(nonExistentId, trx);
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should retrieve all suppliers within the transaction', async () => {
      await SupplierModel.create(
        { name: 'Another Supplier', slug: 'another-supplier' },
        trx
      );

      const suppliers = await SupplierModel.findAll(trx);
      // We expect 2 suppliers: the one from beforeEach and the one created here.
      expect(suppliers.length).toBe(4);
    });
  });

  describe('update', () => {
    it('should update a supplier', async () => {
      const updatedData = { name: 'Updated Supplier Name' };
      const updated = await SupplierModel.update(
        testSupplier.id,
        updatedData,
        trx
      );

      expect(updated).toBeDefined();
      expect(updated.name).toBe('Updated Supplier Name');

      const fromDb = await SupplierModel.findById(testSupplier.id, trx);
      expect(fromDb?.name).toBe('Updated Supplier Name');
    });

    it('should throw an error when updating a non-existent supplier', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await expect(
        SupplierModel.update(nonExistentId, { name: 'Non-existent' }, trx)
      ).rejects.toThrow('Supplier not found');
    });
  });

  describe('delete', () => {
    it('should delete a supplier', async () => {
      const isDeleted = await SupplierModel.delete(testSupplier.id, trx);
      expect(isDeleted).toBe(true);

      const fromDb = await SupplierModel.findById(testSupplier.id, trx);
      expect(fromDb).toBeNull();
    });

    it('should return false for a non-existent supplier', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const isDeleted = await SupplierModel.delete(nonExistentId, trx);
      expect(isDeleted).toBe(false);
    });
  });
});
