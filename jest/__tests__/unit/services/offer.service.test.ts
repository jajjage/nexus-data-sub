import db from '../../../../src/database/connection';
import { CreateUserInput, UserModel } from '../../../../src/models/User';
import { OfferService } from '../../../../src/services/offer.service';
import { Offer } from '../../../../src/types/offer.type';
import { ApiError } from '../../../../src/utils/ApiError';

describe('OfferService', () => {
  let testUser: { userId: string };
  let testOffer: Offer;
  let testOperatorProduct: { id: string };

  beforeAll(async () => {
    await db.raw('BEGIN');

    // Create a user for testing
    const userData: CreateUserInput = {
      email: 'offer.service.test@example.com',
      fullName: 'Offer Service Test User',
      phoneNumber: '2223334445',
      password: 'Password123!',
      role: 'user',
    };
    testUser = await UserModel.create(userData);

    // Create test operator
    const [testOperator] = await db('operators')
      .insert({
        code: 'TEST',
        name: 'Test Operator',
      })
      .returning('id');

    // Create test operator product
    [testOperatorProduct] = await db('operator_products')
      .insert({
        operator_id: testOperator.id,
        product_code: 'TEST-001',
        name: 'Test Product',
        product_type: 'data',
        denom_amount: 100,
        data_mb: 1024,
        validity_days: 30,
      })
      .returning('id');
  });

  beforeEach(async () => {
    // Create a fresh offer for each test
    const offerData: Omit<
      Offer,
      'id' | 'usage_count' | 'created_at' | 'updated_at' | 'deleted_at'
    > = {
      title: 'Service Test Offer',
      status: 'active',
      discount_type: 'fixed_amount',
      discount_value: 50,
      per_user_limit: 1,
      total_usage_limit: 10,
      apply_to: 'all',
      allow_all: true,
      eligibility_logic: 'all',
      starts_at: new Date(Date.now() - 1000 * 60), // Started 1 minute ago
      ends_at: new Date(Date.now() + 1000 * 60 * 60), // Ends in 1 hour
      created_by: null,
      code: null,
      description: null,
    };

    // Insert offer and ensure usage_count is 0
    await db.transaction(async trx => {
      [testOffer] = await trx('offers').insert(offerData).returning('*');
      await trx('offers')
        .where({ id: testOffer.id })
        .update({ usage_count: 0 });
      // Reload the offer to get the updated usage_count
      testOffer = await trx('offers').where({ id: testOffer.id }).first();
    });
  });

  afterEach(async () => {
    // Clean up offers and redemptions after each test
    await db.transaction(async trx => {
      await trx('offer_redemptions').del();
      await trx('offer_eligibility_rules').del();
      await trx('offers').del();
    });
  });

  afterAll(async () => {
    await db.raw('ROLLBACK');
  });

  describe('updateOffer', () => {
    it('should update the offer title', async () => {
      const updatedOffer = await OfferService.updateOffer(testOffer.id, {
        title: 'Updated Service Test Offer',
      });
      expect(updatedOffer.title).toBe('Updated Service Test Offer');
    });

    it('should throw an ApiError if the offer does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await expect(
        OfferService.updateOffer(nonExistentId, { title: 'does not matter' })
      ).rejects.toThrow(new ApiError(404, 'Offer not found'));
    });
  });

  describe('redeemOffer', () => {
    it('should successfully redeem an offer for an eligible user with operator product', async () => {
      await db.transaction(async trx => {
        // First verify initial usage count is 0
        const initialOffer = await trx('offers')
          .where({ id: testOffer.id })
          .first();
        expect(initialOffer.usage_count).toBe(0);

        await expect(
          OfferService.redeemOffer(
            testOffer.id,
            testUser.userId,
            500,
            50,
            testOperatorProduct.id
          )
        ).resolves.toBeUndefined();

        const redemption = await trx('offer_redemptions')
          .where({
            offer_id: testOffer.id,
            user_id: testUser.userId,
            operator_product_id: testOperatorProduct.id,
          })
          .first();
        expect(redemption).toBeDefined();
        expect(redemption.operator_product_id).toBe(testOperatorProduct.id);
        expect(redemption.supplier_product_mapping_id).toBeNull();

        const offer = await trx('offers').where({ id: testOffer.id }).first();
        expect(offer.usage_count).toBe(1);
      });
    });

    it('should throw an error if the per-user limit is exceeded', async () => {
      await db.transaction(async trx => {
        // First verify initial usage count is 0
        const initialOffer = await trx('offers')
          .where({ id: testOffer.id })
          .first();
        expect(initialOffer.usage_count).toBe(0);

        // First redemption
        await OfferService.redeemOffer(
          testOffer.id,
          testUser.userId,
          500,
          50,
          testOperatorProduct.id
        );

        // Second redemption attempt
        await expect(
          OfferService.redeemOffer(
            testOffer.id,
            testUser.userId,
            500,
            50,
            testOperatorProduct.id
          )
        ).rejects.toThrow('Per-user limit reached for this offer');
      });
    });

    it('should throw an error when neither product ID is provided', async () => {
      await expect(
        OfferService.redeemOffer(testOffer.id, testUser.userId, 500, 50)
      ).rejects.toThrow(
        'Either operator_product_id or supplier_product_mapping_id is required'
      );
    });

    it('should throw an error when both product IDs are provided', async () => {
      await expect(
        OfferService.redeemOffer(
          testOffer.id,
          testUser.userId,
          500,
          50,
          testOperatorProduct.id,
          'some-supplier-mapping-id'
        )
      ).rejects.toThrow(
        'Cannot provide both operator_product_id and supplier_product_mapping_id'
      );
    });

    it('should throw an error if the offer is not active', async () => {
      await db('offers')
        .where({ id: testOffer.id })
        .update({ status: 'draft' });
      await expect(
        OfferService.redeemOffer(
          testOffer.id,
          testUser.userId,
          500,
          50,
          testOperatorProduct.id
        )
      ).rejects.toThrow('Offer inactive or not found');
    });

    it('should throw an error if the user is not eligible based on a rule', async () => {
      // Add a rule that the user must be created in the last 0 days (impossible)
      await db('offer_eligibility_rules').insert({
        offer_id: testOffer.id,
        rule_key: 'new_user_impossible',
        rule_type: 'new_user',
        params: { account_age_days: 0 },
      });

      await expect(
        OfferService.redeemOffer(
          testOffer.id,
          testUser.userId,
          500,
          50,
          testOperatorProduct.id
        )
      ).rejects.toThrow('User not eligible for this offer');
    });
  });
});
