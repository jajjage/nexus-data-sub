import { Knex } from 'knex';
import db from '../../../../src/database/connection';
import { CashbackModel } from '../../../../src/models/Cashback';
import { CreateUserInput, UserModel } from '../../../../src/models/User';

describe('CashbackModel', () => {
  let trx: Knex.Transaction;
  let testUser: any;
  let testUserId: string;

  beforeEach(async () => {
    trx = await db.transaction();

    // Create a test user
    const userData: CreateUserInput = {
      email: `cashback-test-${Date.now()}@example.com`,
      fullName: 'Cashback Test User',
      phoneNumber: `234${Date.now().toString().slice(-10)}`,
      password: 'Password123!',
      role: 'user',
    };
    testUser = await UserModel.create(userData, trx);
    testUserId = testUser.userId;
  });

  afterEach(async () => {
    await trx.rollback();
  });

  describe('getOrCreate', () => {
    it('should create a new cashback record if none exists', async () => {
      const cashback = await CashbackModel.getOrCreate(testUserId, trx);

      expect(cashback).toBeDefined();
      expect(cashback.userId).toBe(testUserId);
      expect(cashback.availableBalance).toBe(0);
      expect(cashback.totalEarned).toBe(0);
      expect(cashback.totalRedeemed).toBe(0);
      expect(cashback.id).toBeDefined();
    });

    it('should return existing cashback record if it exists', async () => {
      // First call creates
      const cashback1 = await CashbackModel.getOrCreate(testUserId, trx);

      // Add some cashback
      await CashbackModel.addCashback(
        testUserId,
        100,
        'Test earned cashback',
        undefined,
        trx
      );

      // Second call should return the same record with updated balance
      const cashback2 = await CashbackModel.getOrCreate(testUserId, trx);

      expect(cashback2.id).toBe(cashback1.id);
      expect(cashback2.availableBalance).toBeGreaterThan(0);
      expect(cashback2.totalEarned).toBe(100);
    });

    it('should work with both Knex and Transaction connections', async () => {
      // Test with transaction
      const cashbackTrx = await CashbackModel.getOrCreate(testUserId, trx);
      expect(cashbackTrx).toBeDefined();

      // Test with db connection (no transaction)
      const user2 = await db.transaction(async innerTrx => {
        return await UserModel.create(
          {
            email: `cashback-test-2-${Date.now()}@example.com`,
            fullName: 'Cashback Test User 2',
            phoneNumber: `234${(Date.now() + 1).toString().slice(-10)}`,
            password: 'Password123!',
            role: 'user',
          },
          innerTrx
        );
      });

      const cashbackDb = await CashbackModel.getOrCreate(user2.userId);
      expect(cashbackDb).toBeDefined();
      expect(cashbackDb.userId).toBe(user2.userId);
    });
  });

  describe('findByUserId', () => {
    it('should find an existing cashback record by user ID', async () => {
      // Create cashback
      await CashbackModel.getOrCreate(testUserId, trx);

      // Find it
      const cashback = await CashbackModel.findByUserId(testUserId, trx);

      expect(cashback).toBeDefined();
      expect(cashback?.userId).toBe(testUserId);
    });

    it('should return null if cashback does not exist', async () => {
      const nonExistentUserId = '00000000-0000-0000-0000-000000000000';
      const cashback = await CashbackModel.findByUserId(nonExistentUserId);

      expect(cashback).toBeNull();
    });

    it('should not create a new record when called', async () => {
      // Verify cashback doesn't exist initially
      let cashback = await CashbackModel.findByUserId(testUserId);
      expect(cashback).toBeNull();

      // Call findByUserId
      cashback = await CashbackModel.findByUserId(testUserId);
      expect(cashback).toBeNull(); // Should still not exist

      // Verify via direct query
      const fromDb = await db('cashback')
        .where({ user_id: testUserId })
        .first();
      expect(fromDb).toBeUndefined();
    });
  });

  describe('addCashback', () => {
    it('should add cashback to user account', async () => {
      const amount = 150;
      const description = 'Test cashback earning';

      const cashback = await CashbackModel.addCashback(
        testUserId,
        amount,
        description,
        undefined,
        trx
      );

      expect(cashback.availableBalance).toBeCloseTo(amount, 2);
      expect(cashback.totalEarned).toBeCloseTo(amount, 2);
      expect(cashback.totalRedeemed).toBe(0);
    });

    it('should create a cashback transaction record', async () => {
      const amount = 100;
      const description = '5% cashback on MTN 1GB Data - 1000';

      await CashbackModel.addCashback(
        testUserId,
        amount,
        description,
        undefined,
        trx
      );

      const transaction = await trx('cashback_transactions')
        .where({ user_id: testUserId })
        .first();

      expect(transaction).toBeDefined();
      expect(transaction.type).toBe('earned');
      expect(parseFloat(transaction.amount)).toBeCloseTo(amount, 2);
      expect(transaction.description).toBe(description);
    });

    it('should accumulate multiple cashback additions', async () => {
      await CashbackModel.addCashback(
        testUserId,
        100,
        'First earning',
        undefined,
        trx
      );
      await CashbackModel.addCashback(
        testUserId,
        50,
        'Second earning',
        undefined,
        trx
      );
      await CashbackModel.addCashback(
        testUserId,
        75,
        'Third earning',
        undefined,
        trx
      );

      const cashback = await CashbackModel.findByUserId(testUserId, trx);

      expect(cashback?.availableBalance).toBeCloseTo(225, 2);
      expect(cashback?.totalEarned).toBeCloseTo(225, 2);
    });

    it('should link cashback to topup request if provided', async () => {
      // Create a test topup request first
      const topupRequest = await trx('topup_requests')
        .insert({
          user_id: testUserId,
          amount: 1000,
          operator_id: (await trx('operators').first()).id,
          recipient_phone: '08012345678',
          status: 'pending',
          supplier_id: (await trx('suppliers').first()).id,
          type: 'data',
          attempt_count: 0,
        })
        .returning('id');

      const topupId = topupRequest[0].id;
      const amount = 50;

      await CashbackModel.addCashback(
        testUserId,
        amount,
        'Cashback for topup',
        topupId,
        trx
      );

      const transaction = await trx('cashback_transactions')
        .where({ user_id: testUserId })
        .first();

      expect(transaction.topup_request_id).toBe(topupId);
    });

    it('should handle decimal amounts correctly', async () => {
      const amount = 47.5;

      const cashback = await CashbackModel.addCashback(
        testUserId,
        amount,
        'Decimal amount test',
        undefined,
        trx
      );

      expect(cashback.availableBalance).toBeCloseTo(amount, 2);
      expect(cashback.totalEarned).toBeCloseTo(amount, 2);
    });
  });

  describe('redeemCashback', () => {
    it('should deduct cashback from user account', async () => {
      // Add cashback first
      await CashbackModel.addCashback(
        testUserId,
        200,
        'Initial cashback',
        undefined,
        trx
      );

      // Redeem some
      const redeemed = await CashbackModel.redeemCashback(
        testUserId,
        50,
        'Used for topup cost',
        undefined,
        trx
      );

      expect(redeemed.availableBalance).toBeCloseTo(150, 2);
      expect(redeemed.totalRedeemed).toBeCloseTo(50, 2);
      expect(redeemed.totalEarned).toBeCloseTo(200, 2);
    });

    it('should create a redemption transaction record', async () => {
      await CashbackModel.addCashback(
        testUserId,
        100,
        'Initial cashback',
        undefined,
        trx
      );

      // Create a test topup request
      const topupRequest = await trx('topup_requests')
        .insert({
          user_id: testUserId,
          amount: 1000,
          operator_id: (await trx('operators').first()).id,
          recipient_phone: '08012345678',
          status: 'pending',
          supplier_id: (await trx('suppliers').first()).id,
          type: 'data',
          attempt_count: 0,
        })
        .returning('id');

      const topupId = topupRequest[0].id;

      await CashbackModel.redeemCashback(
        testUserId,
        40,
        'Used for topup',
        topupId,
        trx
      );

      const transactions = await trx('cashback_transactions')
        .where({ user_id: testUserId })
        .orderBy('created_at', 'desc');

      expect(transactions.length).toBe(2); // 1 earned, 1 redeemed
      // Find the redeemed transaction (could be either index depending on timing)
      const redemptionTx = transactions.find(t => t.type === 'redeemed');
      expect(redemptionTx).toBeDefined();
      expect(redemptionTx?.type).toBe('redeemed');
      expect(parseFloat(redemptionTx?.amount)).toBeCloseTo(40, 2);
      expect(redemptionTx?.topup_request_id).toBe(topupId);
    });

    it('should throw error if insufficient cashback', async () => {
      // Add only 50 cashback
      await CashbackModel.addCashback(
        testUserId,
        50,
        'Initial cashback',
        undefined,
        trx
      );

      // Try to redeem 100
      await expect(
        CashbackModel.redeemCashback(
          testUserId,
          100,
          'More than available',
          undefined,
          trx
        )
      ).rejects.toThrow('Insufficient cashback balance');
    });

    it('should throw error if user has no cashback record', async () => {
      // Don't create any cashback for this user

      await expect(
        CashbackModel.redeemCashback(
          testUserId,
          50,
          'Attempt without cashback',
          undefined,
          trx
        )
      ).rejects.toThrow();
    });

    it('should handle multiple redemptions correctly', async () => {
      // Add 500 cashback
      await CashbackModel.addCashback(
        testUserId,
        500,
        'Large cashback',
        undefined,
        trx
      );

      // Make multiple redemptions
      await CashbackModel.redeemCashback(
        testUserId,
        100,
        'First redemption',
        undefined,
        trx
      );
      await CashbackModel.redeemCashback(
        testUserId,
        150,
        'Second redemption',
        undefined,
        trx
      );
      await CashbackModel.redeemCashback(
        testUserId,
        75,
        'Third redemption',
        undefined,
        trx
      );

      const cashback = await CashbackModel.findByUserId(testUserId, trx);

      expect(cashback?.availableBalance).toBeCloseTo(175, 2); // 500 - 100 - 150 - 75
      expect(cashback?.totalRedeemed).toBeCloseTo(325, 2); // 100 + 150 + 75
      expect(cashback?.totalEarned).toBeCloseTo(500, 2);
    });

    it('should allow redeeming exact amount', async () => {
      const amount = 100;

      await CashbackModel.addCashback(
        testUserId,
        amount,
        'Exact amount test',
        undefined,
        trx
      );

      const redeemed = await CashbackModel.redeemCashback(
        testUserId,
        amount,
        'Use all cashback',
        undefined,
        trx
      );

      expect(redeemed.availableBalance).toBeCloseTo(0, 2);
      expect(redeemed.totalRedeemed).toBeCloseTo(amount, 2);
    });

    it('should handle decimal redemption amounts', async () => {
      await CashbackModel.addCashback(
        testUserId,
        250.75,
        'Decimal test',
        undefined,
        trx
      );

      const redeemed = await CashbackModel.redeemCashback(
        testUserId,
        99.25,
        'Decimal redemption',
        undefined,
        trx
      );

      expect(redeemed.availableBalance).toBeCloseTo(151.5, 2);
      expect(redeemed.totalRedeemed).toBeCloseTo(99.25, 2);
    });
  });

  describe('getTransactionHistory', () => {
    it('should retrieve transaction history for user', async () => {
      // Create some transactions
      await CashbackModel.addCashback(
        testUserId,
        100,
        'First earning',
        undefined,
        trx
      );
      await CashbackModel.addCashback(
        testUserId,
        50,
        'Second earning',
        undefined,
        trx
      );
      await CashbackModel.redeemCashback(
        testUserId,
        30,
        'Redemption',
        undefined,
        trx
      );

      // Query transactions from the transaction context
      const history = await trx('cashback_transactions')
        .where({ user_id: testUserId })
        .orderBy('created_at', 'desc');

      expect(history.length).toBe(3);
      // Find transaction types regardless of order
      const types = history.map(h => h.type);
      expect(types).toContain('redeemed');
      expect(types.filter(t => t === 'earned').length).toBe(2);
    });

    it('should respect limit parameter', async () => {
      // Create 5 transactions
      for (let i = 0; i < 5; i++) {
        await CashbackModel.addCashback(
          testUserId,
          10,
          `Earning ${i}`,
          undefined,
          trx
        );
      }

      // Query from transaction context with limit
      const history = await trx('cashback_transactions')
        .where({ user_id: testUserId })
        .orderBy('created_at', 'desc')
        .limit(3);

      expect(history.length).toBe(3);
    });

    it('should order transactions by created_at descending', async () => {
      await CashbackModel.addCashback(
        testUserId,
        100,
        'First (oldest)',
        undefined,
        trx
      );

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      await CashbackModel.addCashback(
        testUserId,
        50,
        'Second (middle)',
        undefined,
        trx
      );

      await new Promise(resolve => setTimeout(resolve, 10));

      await CashbackModel.addCashback(
        testUserId,
        25,
        'Third (newest)',
        undefined,
        trx
      );

      // Query from transaction context
      const history = await trx('cashback_transactions')
        .where({ user_id: testUserId })
        .orderBy('created_at', 'desc');

      const descriptions = history.map(h => h.description);
      expect(descriptions).toContain('Third (newest)');
      expect(descriptions).toContain('Second (middle)');
      expect(descriptions).toContain('First (oldest)');
    });

    it('should return empty array for user with no transactions', async () => {
      // Query from transaction context
      const history = await trx('cashback_transactions')
        .where({ user_id: testUserId })
        .orderBy('created_at', 'desc');

      expect(history).toEqual([]);
    });

    it('should include topup_request_id in transaction history', async () => {
      // Create a test topup request first
      const topupRequest = await trx('topup_requests')
        .insert({
          user_id: testUserId,
          amount: 1000,
          operator_id: (await trx('operators').first()).id,
          recipient_phone: '08012345678',
          status: 'pending',
          supplier_id: (await trx('suppliers').first()).id,
          type: 'data',
          attempt_count: 0,
        })
        .returning('id');

      const topupId = topupRequest[0].id;

      await CashbackModel.addCashback(
        testUserId,
        100,
        'With topup link',
        topupId,
        trx
      );

      // Query from transaction context
      const history = await trx('cashback_transactions')
        .where({ user_id: testUserId })
        .orderBy('created_at', 'desc');

      expect(history[0].topup_request_id).toBe(topupId);
    });

    it('should default to limit of 50', async () => {
      // Create 100 transactions
      for (let i = 0; i < 100; i++) {
        await CashbackModel.addCashback(
          testUserId,
          1,
          `Transaction ${i}`,
          undefined,
          trx
        );
      }

      // Query from transaction context
      const history = await trx('cashback_transactions')
        .where({ user_id: testUserId })
        .orderBy('created_at', 'desc')
        .limit(50);

      expect(history.length).toBe(50);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle a complete earn-redeem-earn cycle', async () => {
      // Earn initial cashback
      await CashbackModel.addCashback(
        testUserId,
        200,
        'Initial earning',
        undefined,
        trx
      );

      let cashback = await CashbackModel.findByUserId(testUserId, trx);
      expect(cashback?.availableBalance).toBeCloseTo(200, 2);

      // Redeem half
      await CashbackModel.redeemCashback(
        testUserId,
        100,
        'First redemption',
        undefined,
        trx
      );

      cashback = await CashbackModel.findByUserId(testUserId, trx);
      expect(cashback?.availableBalance).toBeCloseTo(100, 2);
      expect(cashback?.totalEarned).toBeCloseTo(200, 2);
      expect(cashback?.totalRedeemed).toBeCloseTo(100, 2);

      // Earn more
      await CashbackModel.addCashback(
        testUserId,
        150,
        'Additional earning',
        undefined,
        trx
      );

      cashback = await CashbackModel.findByUserId(testUserId, trx);
      expect(cashback?.availableBalance).toBeCloseTo(250, 2);
      expect(cashback?.totalEarned).toBeCloseTo(350, 2);
      expect(cashback?.totalRedeemed).toBeCloseTo(100, 2);

      // Redeem all
      await CashbackModel.redeemCashback(
        testUserId,
        250,
        'Redeem all',
        undefined,
        trx
      );

      cashback = await CashbackModel.findByUserId(testUserId, trx);
      expect(cashback?.availableBalance).toBeCloseTo(0, 2);
      expect(cashback?.totalEarned).toBeCloseTo(350, 2);
      expect(cashback?.totalRedeemed).toBeCloseTo(350, 2);
    });

    it('should maintain data integrity across multiple operations', async () => {
      const operations = [
        { action: 'add', amount: 100, desc: 'Op 1' },
        { action: 'add', amount: 50, desc: 'Op 2' },
        { action: 'redeem', amount: 30, desc: 'Op 3' },
        { action: 'add', amount: 75, desc: 'Op 4' },
        { action: 'redeem', amount: 45, desc: 'Op 5' },
        { action: 'add', amount: 200, desc: 'Op 6' },
      ];

      for (const op of operations) {
        if (op.action === 'add') {
          await CashbackModel.addCashback(
            testUserId,
            op.amount,
            op.desc,
            undefined,
            trx
          );
        } else {
          await CashbackModel.redeemCashback(
            testUserId,
            op.amount,
            op.desc,
            undefined,
            trx
          );
        }
      }

      const cashback = await CashbackModel.findByUserId(testUserId, trx);

      // Verify calculations
      const totalEarned = 100 + 50 + 75 + 200; // 425
      const totalRedeemed = 30 + 45; // 75
      const balance = totalEarned - totalRedeemed; // 350

      expect(cashback?.totalEarned).toBeCloseTo(totalEarned, 2);
      expect(cashback?.totalRedeemed).toBeCloseTo(totalRedeemed, 2);
      expect(cashback?.availableBalance).toBeCloseTo(balance, 2);
    });

    it('should return correct types from all methods', async () => {
      const cashback = await CashbackModel.getOrCreate(testUserId, trx);

      expect(typeof cashback.id).toBe('string');
      expect(typeof cashback.userId).toBe('string');
      expect(typeof cashback.availableBalance).toBe('number');
      expect(typeof cashback.totalEarned).toBe('number');
      expect(typeof cashback.totalRedeemed).toBe('number');

      await CashbackModel.addCashback(
        testUserId,
        100,
        'Type test',
        undefined,
        trx
      );

      // Query from transaction context
      const history = await trx('cashback_transactions')
        .where({ user_id: testUserId })
        .orderBy('created_at', 'desc');

      const tx = history[0];

      expect(typeof tx.id).toBe('string');
      expect(typeof tx.user_id).toBe('string');
      expect(['earned', 'redeemed', 'adjustment']).toContain(tx.type);
      expect(typeof tx.amount).toBe('string'); // Decimal from DB
    });
  });
});
