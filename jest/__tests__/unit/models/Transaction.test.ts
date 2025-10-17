import { Knex } from 'knex';
import db from '../../../../src/database/connection';
import { TransactionModel } from '../../../../src/models/Transaction';

describe('TransactionModel', () => {
  let trx: Knex.Transaction;
  let testUser: any; // Using any type to match raw DB result
  let testWallet: any;

  beforeEach(async () => {
    trx = await db.transaction();

    // Create a test user within the transaction
    const [user] = await trx('users')
      .insert({
        email: `test.transaction.${Date.now()}@example.com`,
        full_name: 'Test Transaction User',
        phone_number: '1234567890',
        password: 'hashed_password',
        role: 'user',
        is_verified: true,
      })
      .returning('*');
    testUser = user;

    // Create a wallet for the test user within the transaction
    const [wallet] = await trx('wallets')
      .insert({
        user_id: testUser.id,
        balance: 100.0,
      })
      .returning('*');
    testWallet = wallet;
  });

  afterEach(async () => {
    await trx.rollback();
  });

  describe('create', () => {
    it('should create a new transaction', async () => {
      const transactionData = {
        walletId: testWallet.user_id,
        userId: testUser.id,
        direction: 'credit' as const,
        amount: 100,
        balanceAfter: 200,
        method: 'deposit',
      };
      const transaction = await TransactionModel.create(transactionData, trx);

      expect(transaction).toBeDefined();
      expect(transaction.userId).toBe(testUser.id);
      expect(transaction.direction).toBe('credit');
      expect(transaction.amount).toBe(100);

      const fromDb = await trx('transactions')
        .where({ id: transaction.id })
        .first();
      expect(fromDb).toBeDefined();
    });
  });

  describe('findById', () => {
    it('should retrieve a transaction by ID', async () => {
      const transaction = await TransactionModel.create(
        {
          walletId: testWallet.user_id,
          userId: testUser.id,
          direction: 'debit' as const,
          amount: 50,
          balanceAfter: 50,
          method: 'purchase',
        },
        trx
      );

      const found = await TransactionModel.findById(transaction.id, trx);
      expect(found).toBeDefined();
      expect(found?.id).toBe(transaction.id);
    });

    it('should return null for non-existent transaction', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const found = await TransactionModel.findById(nonExistentId, trx);
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should retrieve all transactions for a user', async () => {
      await TransactionModel.create(
        {
          walletId: testWallet.user_id,
          userId: testUser.id,
          direction: 'credit',
          amount: 200,
          balanceAfter: 300,
          method: 'bonus',
        },
        trx
      );
      await TransactionModel.create(
        {
          walletId: testWallet.user_id,
          userId: testUser.id,
          direction: 'debit',
          amount: 20,
          balanceAfter: 280,
          method: 'fee',
        },
        trx
      );

      const result = await TransactionModel.findAll(
        { userId: testUser.id },
        trx
      );
      expect(result.transactions.length).toBe(2);
    });

    it('should filter transactions by direction', async () => {
      await TransactionModel.create(
        {
          walletId: testWallet.user_id,
          userId: testUser.id,
          direction: 'credit',
          amount: 200,
          balanceAfter: 300,
          method: 'bonus',
        },
        trx
      );
      await TransactionModel.create(
        {
          walletId: testWallet.user_id,
          userId: testUser.id,
          direction: 'debit',
          amount: 20,
          balanceAfter: 280,
          method: 'fee',
        },
        trx
      );

      const result = await TransactionModel.findAll(
        { userId: testUser.id, direction: 'credit' },
        trx
      );
      expect(result.transactions.length).toBe(1);
      expect(result.transactions[0].direction).toBe('credit');
    });
  });
});
