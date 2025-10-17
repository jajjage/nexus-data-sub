import { Knex } from 'knex';
import db from '../../../../src/database/connection';
import { SettlementModel } from '../../../../src/models/Settlement';
import { Provider } from '../../../../src/types/webhook.types';

interface CreateProviderData {
  name: string;
  api_base?: string | null;
  webhook_secret?: string | null;
  is_active?: boolean;
  config?: any;
}

describe('SettlementModel', () => {
  let trx: Knex.Transaction;
  let testProvider: Provider;

  // Start a transaction before each test
  beforeEach(async () => {
    trx = await db.transaction();
    // Create a provider within this transaction
    const providerData: CreateProviderData = {
      name: 'Test Provider for Settlement',
    };
    // Use raw trx query to ensure it's in the transaction
    const [provider] = await trx('providers')
      .insert(providerData)
      .returning('*');
    testProvider = provider;
  });

  // Rollback the transaction after each test
  afterEach(async () => {
    await trx.rollback();
  });

  describe('create', () => {
    it('should create a new settlement', async () => {
      const settlementData = {
        providerId: testProvider.id,
        settlementDate: new Date(),
        amount: 5000,
        fees: 50,
        reference: 'test_ref_create',
        rawReport: { data: 'test' },
      };
      const settlement = await SettlementModel.create(settlementData, trx);

      expect(settlement).toBeDefined();
      expect(settlement.providerId).toBe(testProvider.id);
      expect(settlement.amount).toBe(5000);

      const fromDb = await trx('settlements')
        .where({ id: settlement.id })
        .first();
      expect(fromDb).toBeDefined();
    });
  });

  describe('findById', () => {
    it('should retrieve a settlement by ID', async () => {
      const settlement = await SettlementModel.create(
        {
          providerId: testProvider.id,
          settlementDate: new Date(),
          amount: 3000,
          reference: 'test_ref_find',
        },
        trx
      );

      const found = await SettlementModel.findById(settlement.id, trx);
      expect(found).toBeDefined();
      expect(found?.id).toBe(settlement.id);
    });

    it('should return null for non-existent settlement', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const found = await SettlementModel.findById(nonExistentId, trx);
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should retrieve all settlements', async () => {
      await SettlementModel.create(
        {
          providerId: testProvider.id,
          settlementDate: new Date(),
          amount: 100,
          reference: 'ref1',
        },
        trx
      );
      await SettlementModel.create(
        {
          providerId: testProvider.id,
          settlementDate: new Date(),
          amount: 200,
          reference: 'ref2',
        },
        trx
      );

      const settlements = await SettlementModel.findAll({}, trx);
      expect(settlements.length).toBe(2);
    });
  });

  describe('update', () => {
    it('should update a settlement', async () => {
      const settlement = await SettlementModel.create(
        {
          providerId: testProvider.id,
          settlementDate: new Date(),
          amount: 1000,
          reference: 'ref_update',
        },
        trx
      );

      const updated = await SettlementModel.update(
        settlement.id,
        { amount: 1500 },
        trx
      );
      expect(updated.amount).toBe(1500);

      const fromDb = await SettlementModel.findById(settlement.id, trx);
      expect(fromDb?.amount).toBe(1500);
    });
  });

  describe('delete', () => {
    it('should delete a settlement', async () => {
      const settlement = await SettlementModel.create(
        {
          providerId: testProvider.id,
          settlementDate: new Date(),
          amount: 500,
          reference: 'ref_delete',
        },
        trx
      );

      const isDeleted = await SettlementModel.delete(settlement.id, trx);
      expect(isDeleted).toBe(true);

      const fromDb = await SettlementModel.findById(settlement.id, trx);
      expect(fromDb).toBeNull();
    });

    it('should return false for a non-existent settlement', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const isDeleted = await SettlementModel.delete(nonExistentId, trx);
      expect(isDeleted).toBe(false);
    });
  });
});
